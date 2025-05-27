/**
 * Test script to verify Perplexity API connection
 * Based on the working TestPerplexityGeopoliticalRisksBalanced.js file
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API Key
const apiKey = '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';

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Main test function
async function testPerplexityAPI() {
  try {
    console.log('Testing Perplexity API connection...');
    
    // Simple test prompt
    const testPrompt = `
What are the 3 most significant geopolitical events from the past week that are impacting financial markets?
Please format your response as a valid JSON array with the following structure:
[
  {
    "headline": "Brief headline of the event",
    "date": "YYYY-MM-DD",
    "description": "Brief description of the event",
    "region": "Affected region",
    "source": "Source name",
    "url": "URL to article"
  }
]
`;
    
    // Call the Perplexity API
    const content = await callPerplexityAPI(testPrompt, apiKey);
    
    // Try to parse the response as JSON
    let jsonData;
    try {
      // First try direct parsing
      jsonData = JSON.parse(content);
      console.log('Successfully parsed response as JSON directly');
    } catch (error) {
      console.log('Direct JSON parsing failed, trying to extract from response...');
      
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          console.log('Found JSON in code block, attempting to parse...');
          jsonData = JSON.parse(jsonMatch[1]);
          console.log('Successfully parsed JSON from code block');
        } catch (codeBlockError) {
          console.error('Failed to parse JSON from code block:', codeBlockError);
        }
      }
      
      // If code block extraction failed, try to find any JSON-like structure
      if (!jsonData) {
        const jsonArrayMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonArrayMatch) {
          try {
            console.log('Found JSON array structure, attempting to parse...');
            jsonData = JSON.parse(jsonArrayMatch[0]);
            console.log('Successfully parsed JSON from array match');
          } catch (arrayMatchError) {
            console.error('Failed to parse JSON from array match:', arrayMatchError);
          }
        }
      }
    }
    
    // Save the raw response
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const rawOutputFile = path.join(outputDir, `perplexity-raw-${timestamp}.txt`);
    fs.writeFileSync(rawOutputFile, content);
    console.log(`Saved raw response to: ${rawOutputFile}`);
    
    // If we have JSON data, save it as well
    if (jsonData) {
      const formattedJson = JSON.stringify(jsonData, null, 2);
      const jsonOutputFile = path.join(outputDir, `perplexity-json-${timestamp}.json`);
      fs.writeFileSync(jsonOutputFile, formattedJson);
      console.log(`Saved parsed JSON to: ${jsonOutputFile}`);
      console.log('JSON data sample:', JSON.stringify(jsonData).substring(0, 200) + '...');
    } else {
      console.log('Could not parse response as JSON. Check the raw response file.');
    }
    
    console.log('Test completed successfully.');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Helper function to call the Perplexity API - copied from the working test file
async function callPerplexityAPI(prompt, apiKey, temperature = 0.0) {
  const url = "https://api.perplexity.ai/chat/completions";
  const payload = {
    model: "sonar-pro",  // Using the model from the working test file
    messages: [
      {
        role: "system",
        content: "You are a geopolitical risk analyst for a major investment bank with expertise in how geopolitical events impact financial markets. Your analysis must be factual, data-driven, and based on verifiable information from reputable sources. Focus on quality over quantity. Provide specific details, including real names, figures, and dates. Format your response as valid JSON with no explanations or markdown formatting."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: temperature,
    max_tokens: 4000,
    top_p: 0.7  // Lower top_p for more focused and factual responses
  };
  
  try {
    console.log(`Calling Perplexity API with temperature ${temperature}...`);
    console.log('Using model:', payload.model);
    
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    const content = response.data.choices[0].message.content;
    console.log('Perplexity API response (first 300 chars):');
    console.log(content.substring(0, 300) + '...');
    return content;
  } catch (error) {
    console.error('Perplexity API error:', error.response ? error.response.status : error.message);
    if (error.response && error.response.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`Perplexity API error: ${error.message}`);
  }
}

// Run the test
testPerplexityAPI();
