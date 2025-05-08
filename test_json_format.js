// Test script for JSON format changes
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Sample JSON response for testing
const sampleJsonResponse = {
  "decision": "Buy Now",
  "summary": "Market conditions are favorable for buying, with positive analyst sentiment and attractive valuations.",
  "analysis": {
    "marketSentiment": [
      {
        "analyst": "Dan Nathan",
        "comment": "I'm seeing strong buying opportunities in tech after the recent pullback.",
        "source": "https://www.cnbc.com/video/2025/03/10/dan-nathan-tech-buying-opportunity.html",
        "timestamp": "2025-03-10 15:30 ET"
      },
      {
        "analyst": "Josh Brown",
        "comment": "The market is showing resilience despite headwinds, a bullish indicator.",
        "source": "https://www.cnbc.com/video/2025/03/10/josh-brown-market-resilience.html",
        "timestamp": "2025-03-10 14:15 ET"
      }
    ],
    "marketIndicators": {
      "fearGreedIndex": {
        "value": 65,
        "interpretation": "Greed, indicating positive market sentiment"
      },
      "vix": {
        "value": 18.5,
        "trend": "Decreasing, suggesting reduced market uncertainty"
      },
      "upcomingEvents": [
        {
          "event": "Fed Interest Rate Decision",
          "date": "2025-03-15"
        }
      ]
    },
    "fundamentalMetrics": [
      {
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "pegRatio": 1.8,
        "forwardPE": 22.5,
        "comment": "Valuation has improved after recent pullback"
      },
      {
        "symbol": "MSFT",
        "name": "Microsoft Corporation",
        "pegRatio": 1.9,
        "forwardPE": 25.2,
        "comment": "Strong growth prospects justify current valuation"
      }
    ],
    "macroeconomicFactors": {
      "treasuryYields": {
        "tenYear": 3.8,
        "twoYear": 3.6,
        "trend": "Yield curve normalizing, a positive economic signal"
      },
      "fedPolicy": "Federal Reserve signaling potential rate cuts in the next quarter",
      "inflation": "Core PCE trending down toward Fed's 2% target",
      "geopoliticalRisks": [
        "Easing tensions in Eastern Europe",
        "Progress in US-China trade negotiations"
      ]
    }
  },
  "justification": "The recommendation to 'Buy Now' is supported by several positive indicators. The CNN Fear & Greed Index at 65 shows market sentiment has shifted to greed, indicating positive momentum. The VIX has decreased to 18.5, suggesting reduced market volatility and uncertainty. Key analysts like Dan Nathan and Josh Brown have expressed optimistic views about market resilience and buying opportunities, particularly in the tech sector. Fundamental metrics for major tech stocks show improved valuations after recent pullbacks, with PEG ratios below 2.0 indicating reasonable prices relative to growth. Macroeconomic factors are also supportive, with treasury yields normalizing, inflation trending downward, and the Federal Reserve signaling potential rate cuts. Geopolitical risks have diminished with easing tensions in Eastern Europe and progress in US-China trade negotiations. These factors collectively create a favorable environment for entering the market, particularly in quality tech stocks that have recently pulled back."
};

// Function to parse the analysis result (simulating the GAS function)
function parseAnalysisResult(analysisResult) {
  let analysisJson;
  try {
    analysisJson = JSON.parse(analysisResult);
    
    // Extract the decision from the JSON
    let decision = analysisJson.decision || "Watch for Better Price Action";
    
    // Use the full JSON as justification
    const justification = JSON.stringify(analysisJson, null, 2);
    
    return { 
      decision: decision, 
      justification: justification,
      analysisJson: analysisJson
    };
  } catch (e) {
    console.error("Error parsing JSON response:", e);
    // If JSON parsing fails, try to extract decision using regex
    const decisionMatch = analysisResult.match(/decision["\s:]+([^"]+)/i);
    let decision = "Watch for Better Price Action"; // Default
    
    if (decisionMatch && decisionMatch[1]) {
      decision = decisionMatch[1].trim();
      // Clean up any trailing commas or quotes
      decision = decision.replace(/[",}]/g, '').trim();
    }
    
    return { 
      decision: decision, 
      justification: analysisResult,
      analysisJson: null
    };
  }
}

// Function to format JSON to HTML (simulating the Email.gs function)
function formatJsonToHtml(decision, justification) {
  // Parse the JSON data
  let jsonData;
  try {
    jsonData = JSON.parse(justification);
  } catch (e) {
    console.error("Error parsing JSON:", e);
    // If parsing fails, create a basic structure
    jsonData = {
      decision: decision,
      summary: "Unable to parse analysis data",
      analysis: {},
      justification: "The analysis data could not be properly parsed."
    };
  }
  
  // Determine color based on decision
  let decisionColor = "#FFA500"; // Default orange for "Watch for Better Price Action"
  let decisionIcon = "⚠️"; // Default icon for Watch
  let decisionBg = "#FFF8E1"; // Light yellow background
  
  if (decision.includes("Buy")) {
    decisionColor = "#4CAF50"; // Green for Buy
    decisionIcon = "🔼"; // Up arrow for Buy
    decisionBg = "#E8F5E9"; // Light green background
  } else if (decision.includes("Sell")) {
    decisionColor = "#F44336"; // Red for Sell
    decisionIcon = "🔽"; // Down arrow for Sell
    decisionBg = "#FFEBEE"; // Light red background
  }
  
  // Create HTML email template with improved design
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trading Recommendation - ${new Date().toLocaleDateString()}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            background-color: #f9f9f9;
        }
        .container {
            padding: 25px;
            border-radius: 8px;
            background-color: #ffffff;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
        }
        .header h1 {
            color: #444;
            margin-bottom: 10px;
            font-size: 28px;
        }
        .header p {
            color: #666;
            font-size: 16px;
            margin-top: 5px;
        }
        .decision-container {
            text-align: center;
            margin: 30px 0;
        }
        .decision {
            font-size: 24px;
            font-weight: bold;
            color: white;
            background-color: ${decisionColor};
            padding: 12px 25px;
            border-radius: 50px;
            display: inline-block;
            margin-bottom: 20px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .decision-icon {
            font-size: 32px;
            margin-right: 10px;
        }
        .summary {
            background-color: ${decisionBg};
            border-left: 5px solid ${decisionColor};
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            font-size: 18px;
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
            font-size: 14px;
            color: #777;
            border-top: 1px solid #eee;
            padding-top: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AI Trading Analysis</h1>
            <p>Generated on ${new Date().toLocaleString('en-US', { 
              timeZone: 'America/New_York',
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })} ET</p>
        </div>
        
        <div class="decision-container">
            <div class="decision">
                <span class="decision-icon">${decisionIcon}</span> ${decision}
            </div>
        </div>
        
        ${jsonData.summary ? `<div class="summary">${jsonData.summary}</div>` : ''}
        
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
        
        ${jsonData.justification ? `
          <h2>Detailed Justification</h2>
          <div class="justification">
              ${jsonData.justification}
          </div>
        ` : ''}
        
        <div class="footer">
          <p>Next analysis scheduled for ${new Date(new Date().getTime() + 12 * 60 * 60 * 1000).toLocaleString('en-US', { 
            timeZone: 'America/New_York',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })} ET</p>
          <p>AI Trading Agent - Automated Analysis</p>
        </div>
    </div>
</body>
</html>
  `;
  
  return html;
}

// Main test function
async function runTest() {
  console.log("Starting JSON format test...");
  
  // Test 1: Test with sample JSON response
  console.log("\n=== Test 1: Sample JSON Response ===");
  const jsonString = JSON.stringify(sampleJsonResponse);
  const { decision, justification, analysisJson } = parseAnalysisResult(jsonString);
  
  console.log("Decision:", decision);
  console.log("Analysis JSON available:", analysisJson !== null);
  
  // Test 2: Format JSON to HTML
  console.log("\n=== Test 2: Format JSON to HTML ===");
  const html = formatJsonToHtml(decision, justification);
  console.log("HTML generated successfully:", html.length > 0);
  
  // Save HTML to file for inspection
  const outputDir = path.join(__dirname, 'test_output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  
  fs.writeFileSync(path.join(outputDir, 'test_output.html'), html);
  fs.writeFileSync(path.join(outputDir, 'test_json.json'), justification);
  
  console.log("Test files saved to:", outputDir);
  console.log("Test completed successfully!");
}

// Run the test
runTest().catch(err => {
  console.error("Test failed:", err);
});
