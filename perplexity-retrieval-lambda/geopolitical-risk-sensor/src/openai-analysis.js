/**
 * OpenAI Geopolitical Risk Analysis
 * 
 * This script takes the curated list of geopolitical risk items from the balanced retrieval process,
 * sends them to OpenAI for analysis, fact-checking, and categorization, and then saves the
 * enhanced output to a JSON file.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createLogger } = require('./utils/logger');

// Initialize logger
const logger = createLogger('openai-analysis');

// Configure console logging for better visibility
console.log('Starting OpenAI Geopolitical Risk Analysis...');
const DATA_DIR = path.join(__dirname, '..', 'data');
const INPUT_FILE = path.join(DATA_DIR, 'geopolitical_risks.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'geopolitical_risks_analyzed.json');

/**
 * Create a prompt for OpenAI to analyze the geopolitical risks
 * @param {Array} inputData - Array of geopolitical risk items
 * @returns {string} - Prompt for OpenAI
 */
function createOpenAIPrompt(inputData) {
  return `
  You are a professional geopolitical analyst specializing in market impact analysis for investors.
  
  I will provide you with a list of current geopolitical risks. Your task is to:
  
  1. Analyze the list of geopolitical risks and identify the 5-7 most significant thematic groupings or categories (e.g., US-China tensions, Middle East conflicts, trade wars)
  2. For each thematic grouping, synthesize insights from all relevant items in the original list
  3. Provide a concise analysis of each thematic grouping's potential market impact
  4. Calculate a geopolitical risk index (0-100) based on the severity of these themes
  5. Create a highly concise global overview (EXACTLY 2 SHORT SENTENCES, maximum 25 words each) that is SPECIFIC about the current geopolitical landscape, mentioning the most significant issues identified in the data without unnecessary words or details
  6. Create a detailed executive summary (200-300 words) of the current geopolitical landscape focusing on these key themes and their market implications
  
  IMPORTANT: Your output should have exactly 5-7 thematic groupings, not individual risk items. Each grouping should synthesize multiple related risks from the input list.
  
  CRITICAL: For each thematic grouping, preserve the original source names, timestamps, and URLs from the relevant input items. Do not fabricate any sources.
  
  Here is the list of geopolitical risks to analyze:
  ${JSON.stringify(inputData, null, 2)}
  
  YOUR RESPONSE MUST BE VALID JSON ONLY. DO NOT include any explanatory text, markdown formatting, or code blocks.
  
  Respond with a JSON object with exactly this structure:
  {
    "lastUpdated": "<current date in ISO format>",
    "geopoliticalRiskIndex": <number 0-100>,
    "global": "<highly concise global overview (EXACTLY 2 SHORT SENTENCES, maximum 25 words each) that is SPECIFIC about the current geopolitical landscape, mentioning the most significant issues identified in the data>",
    "summary": "<detailed executive summary (200-300 words) of the current geopolitical landscape focusing on key themes and their market implications>",
    "risks": [
      {
        "name": "<thematic grouping name>",
        "description": "<synthesized description of this thematic grouping>",
        "region": "<affected regions, e.g., 'Global', 'Asia', 'Middle East'>",
        "impactLevel": "<High, Medium, or Low>",
        "source": "<primary source for this grouping>",
        "sourceUrl": "<source URL>",
        "relatedSources": [
          {
            "name": "<source name>",
            "url": "<source URL>",
            "timestamp": "<publication timestamp>"
          }
        ]
      }
      // Include exactly 5-7 thematic groupings
    ]
  }
  
  GROUPING CRITERIA:
  - Focus on themes with the highest potential impact on global markets
  - Ensure diversity across different types of geopolitical concerns (e.g., military conflicts, trade tensions, political instability)
  - Prioritize recent developments over older news
  - Create meaningful thematic groupings that investors would find actionable
  - For each grouping, include at least 2-3 related risk items from the original list
  
  CRITICAL: For each thematic grouping, you MUST preserve the original source names, timestamps, and URLs from the relevant input items. Do not fabricate any sources.
  `;
}

/**
 * Send data to OpenAI for analysis
 * @param {string} prompt - The prompt to send to OpenAI
 * @returns {Promise<Object>} - The analyzed data from OpenAI
 */
async function sendToOpenAI(prompt) {
  // Get the API key from environment variables
  const apiKey = process.env.OPENAI_API_KEY;
  
  // Check if the API key is missing or has placeholder text
  if (!apiKey || apiKey === 'your_openai_api_key_here' || apiKey === 'sk-your-openai-api-key-here') {
    logger.error('Valid OpenAI API key not found in environment variables');
    throw new Error('OpenAI API key is missing or invalid. Please set a valid API key in the .env file.');
  }
  
  logger.info('Sending data to OpenAI for analysis...');
  
  // Maximum number of retry attempts
  const MAX_RETRIES = 3;
  
  // Retry with exponential backoff
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info(`API call attempt ${attempt} of ${MAX_RETRIES}`);
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a professional geopolitical analyst specializing in market impact analysis for investors. You excel at synthesizing complex geopolitical events into clear, actionable insights. For the global overview, create a HIGHLY CONCISE 2-sentence summary (maximum 25 words per sentence) of the current geopolitical landscape, focusing on the most significant issues identified in the data without unnecessary words or details. For the executive summary, provide a detailed 200-300 word analysis of the current geopolitical landscape focusing on key themes and their market implications. Your response MUST be in valid JSON format only, with no markdown formatting, no explanations, and no additional text. Do not wrap the JSON in code blocks or any other formatting.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
          max_tokens: 4000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`OpenAI API returned error ${response.status}: ${response.statusText}`);
      }
      
      // If we get here, the request was successful
      logger.info(`API call successful on attempt ${attempt}`);
      
      // Process the successful response
      const content = response.data.choices[0].message.content;
      logger.info(`Received response from OpenAI with length: ${content.length} characters`);
      
      // Try to extract and parse the JSON response
      // First, log the first 100 characters to see what we're dealing with
      logger.info(`Response starts with: ${content.substring(0, 100).replace(/\n/g, '\\n')}...`);
      
      // Try multiple extraction methods
      let jsonData = null;
      
      // Method 1: Direct parsing
      try {
        jsonData = JSON.parse(content);
        logger.info('Successfully parsed JSON directly');
        return jsonData;
      } catch (directParseError) {
        logger.warn(`Direct JSON parsing failed: ${directParseError.message}`);
      }
      
      // Method 2: Extract from markdown code blocks with json tag
      if (!jsonData) {
        const jsonCodeBlockMatch = content.match(/```(?:json)\s*\n([\s\S]*?)\n```/);
        if (jsonCodeBlockMatch && jsonCodeBlockMatch[1]) {
          try {
            jsonData = JSON.parse(jsonCodeBlockMatch[1]);
            logger.info('Successfully parsed JSON from code block with json tag');
            return jsonData;
          } catch (jsonBlockParseError) {
            logger.warn(`JSON code block parsing failed: ${jsonBlockParseError.message}`);
          }
        }
      }
      
      // Method 3: Extract from any markdown code blocks
      if (!jsonData) {
        const anyCodeBlockMatch = content.match(/```([\s\S]*?)```/);
        if (anyCodeBlockMatch && anyCodeBlockMatch[1]) {
          // Remove the language identifier if present
          const potentialJson = anyCodeBlockMatch[1].replace(/^\s*\w+\s*\n/, '');
          try {
            jsonData = JSON.parse(potentialJson);
            logger.info('Successfully parsed JSON from generic code block');
            return jsonData;
          } catch (anyBlockParseError) {
            logger.warn(`Generic code block parsing failed: ${anyBlockParseError.message}`);
          }
        }
      }
      
      // Method 4: Look for JSON-like structures with curly braces
      if (!jsonData) {
        const curlyBraceMatch = content.match(/{[\s\S]*}/);
        if (curlyBraceMatch) {
          try {
            jsonData = JSON.parse(curlyBraceMatch[0]);
            logger.info('Successfully parsed JSON from curly brace extraction');
            return jsonData;
          } catch (curlyParseError) {
            logger.warn(`Curly brace JSON extraction failed: ${curlyParseError.message}`);
          }
        }
      }
      
      // If we get here, all extraction methods failed
      logger.error('All JSON extraction methods failed');
      throw new Error('Could not extract valid JSON from the OpenAI response');
    } catch (error) {
      // If this is the last attempt, throw the error
      if (attempt === MAX_RETRIES) {
        logger.error(`All ${MAX_RETRIES} API call attempts failed`);
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 10000);
      logger.warn(`API call attempt ${attempt} failed: ${error.message}. Retrying in ${Math.round(delayMs/1000)} seconds...`);
      
      // Wait before the next retry
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  // If we reach here, all retries failed
  throw new Error('Failed to get a valid response from OpenAI after maximum retries');
}

/**
 * Main function to analyze geopolitical risks
 */
async function analyzeGeopoliticalRisks() {
  try {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Read the input file
    logger.info(`Reading geopolitical risks from ${INPUT_FILE}`);
    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error(`Input file not found: ${INPUT_FILE}`);
    }
    
    const inputData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    logger.info(`Read ${inputData.length} geopolitical risk items`);
    
    // Create the prompt
    const prompt = createOpenAIPrompt(inputData);
    
    // Send to OpenAI with retry mechanism
    let analyzedData = await sendToOpenAI(prompt);
    
    // Process the OpenAI output to ensure it's compatible with JsonExport.gs expectations
    const compatibleOutput = {
      // Create the proper structure with macroeconomicFactors.geopoliticalRisks
      macroeconomicFactors: {
        geopoliticalRisks: {
          global: analyzedData.global || "Global geopolitical risk level is currently elevated due to multiple factors.",
          risks: [],
          // Preserve source information from the original data if available
          source: analyzedData.source || "Aggregated from multiple geopolitical risk assessments",
          sourceUrl: analyzedData.sourceUrl || analyzedData.url || "https://www.cfr.org/global-conflict-tracker",
          lastUpdated: analyzedData.lastUpdated || new Date().toISOString()
        }
      },
      // Keep other top-level properties
      geopoliticalRiskIndex: analyzedData.geopoliticalRiskIndex || 0,
      summary: analyzedData.summary || "No summary available"
    };

    // Add the risks if available and sort them by impact level
    if (Array.isArray(analyzedData.risks)) {
      // First map the risks to the correct format
      const formattedRisks = analyzedData.risks.map(risk => {
        // Check if this risk has related sources
        let sourceUrl = risk.sourceUrl || risk.url || '#';
        
        // If there are related sources, use the first one's URL if the main sourceUrl is missing
        if (risk.relatedSources && risk.relatedSources.length > 0 && !risk.sourceUrl) {
          sourceUrl = risk.relatedSources[0].url || '#';
        }
        
        return {
          name: risk.name || 'Unknown Risk',
          description: risk.description || 'No description available',
          region: risk.region || 'Global',
          impactLevel: risk.impactLevel || 'Medium',
          // Preserve the exact source information
          source: risk.source || 'Unknown Source',
          // Ensure we use the exact URL from the original data
          sourceUrl: sourceUrl
        };
      });
      
      // Sort risks by impact level (descending)
      const sortedRisks = formattedRisks.sort((a, b) => {
        // Convert string impact levels to numeric for sorting
        const impactOrder = {
          'Severe': 4,
          'High': 3,
          'Medium': 2,
          'Low': 1,
          'Unknown': 0
        };
        
        const aImpact = impactOrder[a.impactLevel] || 0;
        const bImpact = impactOrder[b.impactLevel] || 0;
        
        return bImpact - aImpact;
      });
      
      // Assign the sorted risks to the output
      compatibleOutput.macroeconomicFactors.geopoliticalRisks.risks = sortedRisks;
    }
    
    // Replace the analyzed data with the compatible format
    analyzedData = compatibleOutput;
    
    // Write the output file
    logger.info(`Writing analyzed data to ${OUTPUT_FILE}`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(analyzedData, null, 2));
    
    logger.info(`Analysis complete. Output saved to ${OUTPUT_FILE}`);
    
    // Print a summary
    console.log('\n=== ANALYSIS SUMMARY ===\n');
    console.log(`Total input items analyzed: ${inputData.length}`);
    // Check if analyzedData.risks exists before accessing its length
    if (analyzedData.risks) {
      console.log(`Selected top risks: ${analyzedData.risks.length}`);
    } else if (analyzedData.macroeconomicFactors && analyzedData.macroeconomicFactors.geopoliticalRisks && analyzedData.macroeconomicFactors.geopoliticalRisks.risks) {
      console.log(`Selected top risks: ${analyzedData.macroeconomicFactors.geopoliticalRisks.risks.length}`);
    } else {
      console.log('No risks selected');
    }
    console.log(`Geopolitical Risk Index: ${analyzedData.geopoliticalRiskIndex}/100`);
    
    // Print global overview and summary
    console.log('\nGlobal Geopolitical Overview:');
    console.log(analyzedData.global);
    
    console.log('\nExecutive Summary:');
    console.log(analyzedData.summary || 'No summary available');
    
    // Count risks by category
    const categories = {};
    
    // Check if analyzedData.risks exists before iterating
    if (analyzedData.risks && Array.isArray(analyzedData.risks)) {
      analyzedData.risks.forEach(risk => {
        const category = risk.category || 'Uncategorized';
        categories[category] = (categories[category] || 0) + 1;
      });
      
      console.log('\nRisk Categories:');
      Object.entries(categories).forEach(([category, count]) => {
        console.log(`${category}: ${count} items`);
      });
    } else {
      console.log('\nNo risk categories available');
    }
    
    // Count risks by impact level
    const riskLevels = {};
    
    // Check if analyzedData.risks exists before iterating
    if (analyzedData.risks && Array.isArray(analyzedData.risks)) {
      analyzedData.risks.forEach(risk => {
        const level = risk.impactLevel || 'Unknown';
        riskLevels[level] = (riskLevels[level] || 0) + 1;
      });
      
      console.log('\nRisk Level Distribution:');
      Object.entries(riskLevels).sort((a, b) => {
        const order = { 'High': 0, 'Medium': 1, 'Low': 2, 'Unknown': 3 };
        return (order[a[0]] || 99) - (order[b[0]] || 99);
      }).forEach(([level, count]) => {
        console.log(`${level}: ${count} items`);
      });
    } else {
      console.log('\nNo risk level distribution available');
    }
    
    // Display the selected top risks
    console.log('\nSelected Top Risks:');
    // Check if analyzedData.risks exists before iterating
    if (analyzedData.risks && Array.isArray(analyzedData.risks)) {
      analyzedData.risks.forEach((risk, index) => {
        console.log(`${index + 1}. ${risk.name} (${risk.impactLevel || 'Unknown'}) - ${risk.region || 'Global'}`);
        console.log(`   Description: ${risk.description.substring(0, 100)}${risk.description.length > 100 ? '...' : ''}`);
        console.log(`   Primary Source: ${risk.source || 'Unknown'}`);
        if (risk.relatedSources && risk.relatedSources.length > 0) {
          console.log(`   Related Sources: ${risk.relatedSources.length}`);
        }
        console.log('');
      });
    } else {
      console.log('No risks available to display');
    }
    
    console.log('\nGlobal Geopolitical Overview:');
    // Check different possible locations of the global overview
    let globalOverview = 'No global overview available';
    if (analyzedData.global) {
      globalOverview = analyzedData.global;
    } else if (analyzedData.macroeconomicFactors && analyzedData.macroeconomicFactors.geopoliticalRisks && analyzedData.macroeconomicFactors.geopoliticalRisks.global) {
      globalOverview = analyzedData.macroeconomicFactors.geopoliticalRisks.global;
    }
    console.log(globalOverview);
    
    console.log('\nExecutive Summary:');
    console.log(analyzedData.summary || 'No summary available');
    
    return analyzedData;
  } catch (error) {
    logger.error(`Error in analysis process: ${error.message}`);
    console.error(error);
    throw error;
  }
}

// Run the analysis if this script is executed directly
if (require.main === module) {
  analyzeGeopoliticalRisks().catch(error => {
    console.error('Analysis failed:', error);
    process.exit(1);
  });
}

// No helper functions needed - OpenAI now returns data in the exact format we need

module.exports = { analyzeGeopoliticalRisks };
