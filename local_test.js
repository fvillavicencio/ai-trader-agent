/**
 * Local test script for the AI Trading Agent
 * 
 * This script demonstrates the functionality of the AI Trading Agent
 * by connecting to the Perplexity API and displaying the result locally.
 * 
 * To run this script:
 * 1. Install Node.js if not already installed
 * 2. Run: npm install axios dotenv
 * 3. Create a .env file with your Perplexity API key (PERPLEXITY_API_KEY=your_key_here)
 * 4. Run: node local_test.js
 */

// Load environment variables from .env file
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

// Configuration
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || "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";
// Trim any quotes or whitespace that might be in the API key
const cleanApiKey = PERPLEXITY_API_KEY ? PERPLEXITY_API_KEY.replace(/["'\s]/g, '') : '';
console.log("API Key first 5 chars:", cleanApiKey.substring(0, 5) + "...");
const PERPLEXITY_MODEL = "sonar-pro"; // Updated to the correct model name
const PERPLEXITY_API_URL = "https://api.perplexity.ai";

// Email configuration
const RECIPIENT_EMAILS = ["fvillavicencio@gmail.com", "fjv@cubicc.com"]; // Array of recipient email addresses
const EMAIL_SUBJECT_PREFIX = "[AI Trading Decision] ";

/**
 * Returns the trading analysis prompt template
 */
function getTradingAnalysisPrompt() {
  const currentDate = new Date();
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: 'numeric', 
    timeZoneName: 'short' 
  };
  const formattedDate = currentDate.toLocaleString('en-US', options);
  
  return `Provide a trading recommendation based on the following criteria, formatting your entire response as a valid JSON object:

1. Market Sentiment:
   - Analyze recent commentary from CNBC analysts (Dan Nathan, Josh Brown, Steve Weiss, Joe Terranova)
   - Consider insights from Dan Niles if available

2. Key Market Indicators:
   - Current CNN Fear & Greed Index value and what it suggests
   - CBOE Volatility Index (VIX) level and trend
   - Upcoming economic events that could impact markets

3. Fundamental Metrics for Stocks/ETFs:
   - Analyze PEG ratios, Forward P/E Ratios, and other relevant metrics for stocks/ETFs recently mentioned on CNBC
   - Compare current valuations to historical averages

4. Macroeconomic Factors:
   - Treasury yields and Fed policy implications
   - Inflation data and expectations
   - Geopolitical risks

Based on this analysis, provide ONE of these three possible recommendations:
- Buy Now
- Sell Now
- Watch for Better Price Action

Format your response as a valid JSON object following this structure:
{
  "decision": "Buy Now | Sell Now | Watch for Better Price Action",
  "summary": "Brief summary of the recommendation",
  "analysis": {
    "marketSentiment": [
      {"analyst": "Analyst Name", "comment": "Quote or summary", "source": "Source URL", "timestamp": "Date and time ET"}
    ],
    "marketIndicators": {
      "fearGreedIndex": {"value": 0, "interpretation": "Description"},
      "vix": {"value": 0, "trend": "Description"},
      "upcomingEvents": [
        {"event": "Event name", "date": "Date"}
      ]
    },
    "fundamentalMetrics": [
      {"symbol": "Ticker", "name": "Company Name", "pegRatio": 0, "forwardPE": 0, "comment": "Analysis"}
    ],
    "macroeconomicFactors": {
      "treasuryYields": {"tenYear": 0, "twoYear": 0, "trend": "Description"},
      "fedPolicy": "Description",
      "inflation": "Description",
      "geopoliticalRisks": ["Risk 1", "Risk 2"]
    }
  },
  "justification": "Detailed explanation for the decision"
}`;
}

/**
 * Calls the Perplexity API to get the trading analysis
 */
async function getPerplexityAnalysis() {
  try {
    console.log("Starting trading analysis with Perplexity...");
    
    const prompt = getTradingAnalysisPrompt();
    
    const payload = {
      model: PERPLEXITY_MODEL,
      messages: [
        {
          role: "system",
          content: "You are an AI agent tasked with providing actionable trading recommendations in JSON format. Your analysis should be accurate, clearly sourced, and include timestamps (Eastern Time) and URLs for cited data points when available. Use the most current data you can find through web browsing.\n\nIMPORTANT: Return ONLY raw JSON without any markdown formatting, code blocks, or explanatory text. Do not wrap your response in ```json``` or any other formatting. Your entire response must be a valid, parseable JSON object with the following structure:\n\n{\n  \"decision\": \"Buy Now | Sell Now | Watch for Better Price Action\",\n  \"summary\": \"Brief summary of the recommendation\",\n  \"analysis\": {\n    \"marketSentiment\": [\n      {\"analyst\": \"Analyst Name\", \"comment\": \"Quote or summary\", \"source\": \"Source URL\", \"timestamp\": \"Date and time ET\"}\n    ],\n    \"marketIndicators\": {\n      \"fearGreedIndex\": {\"value\": 0, \"interpretation\": \"Description\"},\n      \"vix\": {\"value\": 0, \"trend\": \"Description\"},\n      \"upcomingEvents\": [\n        {\"event\": \"Event name\", \"date\": \"Date\"}\n      ]\n    },\n    \"fundamentalMetrics\": [\n      {\"symbol\": \"Ticker\", \"name\": \"Company Name\", \"pegRatio\": 0, \"forwardPE\": 0, \"comment\": \"Analysis\"}\n    ],\n    \"macroeconomicFactors\": {\n      \"treasuryYields\": {\"twoYear\": 0, \"tenYear\": 0, \"date\": \"YYYY-MM-DD\", \"source\": \"URL\", \"yieldCurve\": \"normal|inverted|flat\", \"implications\": \"Description\"},\n      \"fedPolicy\": {\"federalFundsRate\": 0.00, \"fomcMeetingDate\": \"YYYY-MM-DD\", \"forwardGuidance\": \"Description\", \"source\": \"URL\"},\n      \"inflation\": {\"cpi\": {\"core\": 0.0, \"headline\": 0.0, \"releaseDate\": \"YYYY-MM-DD\", \"source\": \"URL\"}, \"pce\": {\"core\": 0.0, \"headline\": 0.0, \"releaseDate\": \"YYYY-MM-DD\", \"source\": \"URL\"}, \"trend\": \"Description\", \"impactOnFedPolicy\": \"Description\"},\n      \"geopoliticalRisks\": [{\"description\": \"Description\", \"regionsAffected\": [\"Region\"], \"potentialMarketImpact\": \"Description\", \"newsSource\": \"URL\"}]\n    }\n  },\n  \"justification\": \"Detailed explanation for the decision\"\n}"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      search_mode: "websearch",
      max_tokens: 4000,
      temperature: 0.7,
      frequency_penalty: 0.5
    };
    
    console.log("Sending request to Perplexity API...");
    
    try {
      const response = await axios.post(`${PERPLEXITY_API_URL}/chat/completions`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanApiKey}`
        }
      });
      
      console.log("Received response from Perplexity API");
      
      if (response.status !== 200) {
        console.error("API Error:", response.status);
        console.error("API Error Details:", response.data);
        throw new Error(`API Error: ${response.status}`);
      }
      
      if (!response.data.choices || !response.data.choices[0] || !response.data.choices[0].message || !response.data.choices[0].message.content) {
        console.error("Unexpected API response structure:", response.data);
        throw new Error("Unexpected API response structure");
      }
      
      const result = response.data.choices[0].message.content;
      console.log("Analysis received from Perplexity.");
      
      return result;
    } catch (error) {
      console.error("Error calling Perplexity API:", error.message);
      if (error.response) {
        console.error("API Error:", error.response.status);
        console.error("API Error Details:", JSON.stringify(error.response.data));
      }
      throw error;
    }
  } catch (error) {
    console.error("Error in getPerplexityAnalysis:", error);
    throw error;
  }
}

/**
 * Extracts the trading decision and justification from the analysis result
 * 
 * @param {string} analysisResult - The analysis result from Perplexity
 * @return {Object} - Object containing the decision and justification
 */
function parseAnalysisResult(analysisResult) {
  try {
    console.log("Parsing analysis result...");
    
    // First, check if the response is wrapped in markdown code blocks and extract the JSON
    let cleanedResult = analysisResult;
    
    // Remove markdown code blocks if present (```json ... ```)
    const codeBlockMatch = analysisResult.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      cleanedResult = codeBlockMatch[1].trim();
      console.log("Extracted JSON from markdown code block");
    }
    
    // Clean up any potential issues in the JSON
    // Replace any non-standard quotes with standard ones
    cleanedResult = cleanedResult.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
    
    // Remove any trailing commas in arrays or objects (common JSON error)
    cleanedResult = cleanedResult.replace(/,\s*([}\]])/g, '$1');
    
    // Fix any unescaped quotes in strings
    cleanedResult = cleanedResult.replace(/"([^"]*)":/g, function(match, p1) {
      return '"' + p1.replace(/"/g, '\\"') + '":';
    });
    
    // Clean and parse the JSON from the API response
    let analysisJson;
    try {
      // Try to parse the JSON directly
      analysisJson = JSON.parse(cleanedResult);
    } catch (e) {
      // If direct parsing fails, log the error with more details
      console.error("Error parsing JSON:", e);
      console.error("Error position:", e.message);
      
      // Log a portion of the JSON around the error position if possible
      const errorMatch = e.message.match(/position (\d+)/);
      if (errorMatch && errorMatch[1]) {
        const position = parseInt(errorMatch[1]);
        const start = Math.max(0, position - 50);
        const end = Math.min(cleanedResult.length, position + 50);
        console.error("JSON snippet around error:", cleanedResult.substring(start, end));
      }
      
      // Try to extract JSON from the response
      console.log("Direct JSON parsing failed, attempting to extract JSON...");
      const jsonMatch = cleanedResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysisJson = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error("Failed to extract JSON:", e2);
          // Fallback to a basic structure
          analysisJson = {
            decision: "Watch for Better Price Action",
            summary: "Unable to parse response",
            analysis: {},
            justification: cleanedResult
          };
        }
      } else {
        console.error("No JSON found in response");
        // Fallback to a basic structure
        analysisJson = {
          decision: "Watch for Better Price Action",
          summary: "Unable to parse response",
          analysis: {},
          justification: cleanedResult
        };
      }
    }
    
    // Extract the decision from the JSON
    let decision = "Watch for Better Price Action"; // Default decision
    if (analysisJson.decision) {
      decision = analysisJson.decision;
    }
    
    // The justification is the stringified JSON
    const justification = JSON.stringify(analysisJson, null, 2);
    
    return { decision, justification, analysisJson };
  } catch (error) {
    console.error("Error in preprocessing JSON:", error);
    
    // Fall back to a very basic extraction
    let decision = "Watch for Better Price Action"; // Default
    
    // Try to extract decision using a simple pattern
    if (analysisResult.includes("Buy Now")) {
      decision = "Buy Now";
    } else if (analysisResult.includes("Sell Now")) {
      decision = "Sell Now";
    }
    
    return {
      decision: decision,
      justification: "Error parsing analysis result: " + error.message,
      analysisJson: null
    };
  }
}

/**
 * Formats the email body for a trading decision and justification
 * 
 * @param {string} decision - The trading decision
 * @param {string} justification - The justification for the decision
 * @return {string} - The HTML email body
 */
function formatJsonToHtml(jsonData) {
  // Create a complete HTML document from the JSON data
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trading Recommendation - ${new Date().toLocaleDateString()}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .container {
            background-color: #fff;
            border-radius: 8px;
            padding: 25px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
        }
        .decision {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin: 20px 0;
            padding: 15px;
            border-radius: 8px;
        }
        .buy {
            background-color: #e8f5e9;
            color: #2e7d32;
            border: 1px solid #a5d6a7;
        }
        .sell {
            background-color: #ffebee;
            color: #c62828;
            border: 1px solid #ef9a9a;
        }
        .watch {
            background-color: #fff8e1;
            color: #f57f17;
            border: 1px solid #ffe082;
        }
        .summary {
            font-size: 18px;
            margin-bottom: 30px;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 8px;
        }
        h2 {
            color: #2c3e50;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-top: 30px;
        }
        h3 {
            color: #3498db;
            margin-top: 20px;
        }
        .analyst {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        .analyst-name {
            font-weight: bold;
            color: #2c3e50;
        }
        .timestamp {
            font-style: italic;
            color: #7f8c8d;
            font-size: 0.9em;
        }
        .source {
            font-size: 0.9em;
            color: #3498db;
        }
        .indicator {
            margin-bottom: 15px;
        }
        .indicator-name {
            font-weight: bold;
        }
        .event {
            margin-bottom: 10px;
        }
        .stock {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 8px;
        }
        .stock-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .stock-name {
            font-weight: bold;
            color: #2c3e50;
        }
        .stock-metrics {
            display: flex;
            gap: 15px;
            margin-bottom: 10px;
        }
        .metric {
            background-color: #e8f4f8;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 0.9em;
        }
        .justification {
            margin-top: 30px;
            padding: 20px;
            background-color: #f5f5f5;
            border-radius: 8px;
            line-height: 1.8;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 0.9em;
            color: #7f8c8d;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AI Trading Analysis</h1>
            <p>Generated on ${new Date().toLocaleString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short'
            })}</p>
        </div>
        
        <div class="decision ${jsonData.decision.toLowerCase().includes('buy') ? 'buy' : jsonData.decision.toLowerCase().includes('sell') ? 'sell' : 'watch'}">
            ${jsonData.decision}
        </div>
        
        <div class="summary">
            ${jsonData.summary}
        </div>
        
        <h2>Market Sentiment</h2>
        ${jsonData.analysis && jsonData.analysis.marketSentiment ? 
          jsonData.analysis.marketSentiment.map(analyst => `
            <div class="analyst">
                <div class="analyst-name">${analyst.analyst}</div>
                <div class="comment">${analyst.comment}</div>
                ${analyst.timestamp ? `<div class="timestamp">Time: ${analyst.timestamp}</div>` : ''}
                ${analyst.source ? `<div class="source">Source: <a href="${analyst.source}" target="_blank">${analyst.source}</a></div>` : ''}
            </div>
          `).join('') : '<p>No market sentiment data available</p>'}
        
        <h2>Key Market Indicators</h2>
        ${jsonData.analysis && jsonData.analysis.marketIndicators ? `
            <div class="indicators">
                ${jsonData.analysis.marketIndicators.fearGreedIndex ? `
                    <div class="indicator">
                        <div class="indicator-name">CNN Fear & Greed Index</div>
                        <div>Value: ${jsonData.analysis.marketIndicators.fearGreedIndex.value}</div>
                        <div>Interpretation: ${jsonData.analysis.marketIndicators.fearGreedIndex.interpretation}</div>
                    </div>
                ` : ''}
                
                ${jsonData.analysis.marketIndicators.vix ? `
                    <div class="indicator">
                        <div class="indicator-name">CBOE Volatility Index (VIX)</div>
                        <div>Value: ${jsonData.analysis.marketIndicators.vix.value}</div>
                        <div>Trend: ${jsonData.analysis.marketIndicators.vix.trend}</div>
                    </div>
                ` : ''}
                
                ${jsonData.analysis.marketIndicators.upcomingEvents && jsonData.analysis.marketIndicators.upcomingEvents.length > 0 ? `
                    <div class="indicator">
                        <div class="indicator-name">Upcoming Economic Events</div>
                        ${jsonData.analysis.marketIndicators.upcomingEvents.map(event => `
                            <div class="event">
                                <div>${event.event} - ${event.date}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        ` : '<p>No market indicator data available</p>'}
        
        <h2>Fundamental Metrics</h2>
        ${jsonData.analysis && jsonData.analysis.fundamentalMetrics && jsonData.analysis.fundamentalMetrics.length > 0 ? 
          jsonData.analysis.fundamentalMetrics.map(stock => `
            <div class="stock">
                <div class="stock-header">
                    <div class="stock-name">${stock.symbol} - ${stock.name}</div>
                </div>
                <div class="stock-metrics">
                    <div class="metric">PEG Ratio: ${stock.pegRatio}</div>
                    <div class="metric">Forward P/E: ${stock.forwardPE}</div>
                </div>
                <div>${stock.comment}</div>
            </div>
          `).join('') : '<p>No fundamental metrics data available</p>'}
        
        <h2>Macroeconomic Factors</h2>
        ${jsonData.analysis && jsonData.analysis.macroeconomicFactors ? `
            <div class="macro">
                ${jsonData.analysis.macroeconomicFactors.treasuryYields ? `
                    <h3>Treasury Yields</h3>
                    <p>10-Year: ${jsonData.analysis.macroeconomicFactors.treasuryYields.tenYear}%</p>
                    <p>2-Year: ${jsonData.analysis.macroeconomicFactors.treasuryYields.twoYear}%</p>
                    <p>Trend: ${jsonData.analysis.macroeconomicFactors.treasuryYields.trend}</p>
                ` : ''}
                
                ${jsonData.analysis.macroeconomicFactors.fedPolicy ? `
                    <h3>Federal Reserve Policy</h3>
                    <p>${jsonData.analysis.macroeconomicFactors.fedPolicy}</p>
                ` : ''}
                
                ${jsonData.analysis.macroeconomicFactors.inflation ? `
                    <h3>Inflation</h3>
                    <p>${jsonData.analysis.macroeconomicFactors.inflation}</p>
                ` : ''}
                
                ${jsonData.analysis.macroeconomicFactors.geopoliticalRisks && jsonData.analysis.macroeconomicFactors.geopoliticalRisks.length > 0 ? `
                    <h3>Geopolitical Risks</h3>
                    <ul>
                        ${jsonData.analysis.macroeconomicFactors.geopoliticalRisks.map(risk => `<li>${risk}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
        ` : '<p>No macroeconomic factors data available</p>'}
        
        <h2>Detailed Justification</h2>
        <div class="justification">
            ${jsonData.justification}
        </div>
        
        <div class="footer">
            <p>AI Trading Agent - Automated Analysis</p>
            <p>Next analysis scheduled for ${new Date(new Date().getTime() + 12 * 60 * 60 * 1000).toLocaleString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short'
            })}</p>
        </div>
    </div>
</body>
</html>`;

  return html;
}

/**
 * Main function to run the trading analysis
 */
async function runTradingAnalysis() {
  try {
    console.log("Starting trading analysis...");
    
    // Get the trading analysis from Perplexity
    const analysisResult = await getPerplexityAnalysis();
    
    // Parse the analysis result to extract the decision and justification
    const { decision, justification, analysisJson } = parseAnalysisResult(analysisResult);
    
    // Format the email body from the JSON data
    const emailBody = formatJsonToHtml(analysisJson);
    
    // Display the results
    console.log("\n\n=== TRADING ANALYSIS RESULTS ===");
    console.log("Decision: " + decision);
    console.log("\nJSON Data:");
    console.log(JSON.stringify(analysisJson, null, 2));
    console.log("\nConverted HTML:");
    console.log("```html");
    console.log(emailBody);
    console.log("```");
    
    // Save the HTML to a file for viewing
    fs.writeFileSync('trading_analysis.html', emailBody);
    console.log("\nHTML output saved to trading_analysis.html");
    
    // Also save the raw JSON for reference
    fs.writeFileSync('trading_analysis.json', JSON.stringify(analysisJson, null, 2));
    console.log("JSON output saved to trading_analysis.json");
    
    console.log("\nTrading analysis completed successfully.");
  } catch (error) {
    console.error("Error in runTradingAnalysis:", error);
  }
}

// Run the trading analysis
runTradingAnalysis();
