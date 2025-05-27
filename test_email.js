// Test script for email functionality with multiple recipients
require('dotenv').config();
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
      }
    ],
    "marketIndicators": {
      "fearGreedIndex": {"value": 65, "interpretation": "Greed, indicating positive market sentiment"},
      "vix": {"value": 18.5, "trend": "Decreasing, suggesting reduced market uncertainty"}
    },
    "fundamentalMetrics": [
      {
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "pegRatio": 1.8,
        "forwardPE": 22.5,
        "comment": "Valuation has improved after recent pullback"
      }
    ],
    "macroeconomicFactors": {
      "treasuryYields": {"tenYear": 3.8, "twoYear": 3.6, "trend": "Yield curve normalizing"},
      "fedPolicy": "Federal Reserve signaling potential rate cuts",
      "inflation": "Core PCE trending down toward Fed's 2% target",
      "geopoliticalRisks": ["Easing tensions in Eastern Europe"]
    }
  },
  "justification": "The recommendation to 'Buy Now' is supported by several positive indicators."
};

// Function to format JSON to HTML (simulating the Email.gs function)
function formatJsonToHtml(decision, justification) {
  // Parse the JSON data
  let jsonData;
  try {
    jsonData = JSON.parse(justification);
  } catch (e) {
    console.error("Error parsing JSON:", e);
    jsonData = {
      decision: decision,
      summary: "Unable to parse analysis data",
      analysis: {},
      justification: "The analysis data could not be properly parsed."
    };
  }
  
  // Create a simplified HTML template for testing
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Trading Decision: ${decision}</title>
</head>
<body>
  <h1>Trading Decision: ${decision}</h1>
  <p><strong>Summary:</strong> ${jsonData.summary || 'No summary available'}</p>
  <p><strong>Justification:</strong> ${jsonData.justification || 'No justification available'}</p>
</body>
</html>
  `;
  
  return html;
}

// Function to format plain text email (simulating the Email.gs function)
function formatPlainTextEmail(decision, justification) {
  let jsonData;
  try {
    jsonData = JSON.parse(justification);
  } catch (e) {
    console.error("Error parsing JSON:", e);
    jsonData = {
      decision: decision,
      summary: "Unable to parse analysis data",
      justification: "The analysis data could not be properly parsed."
    };
  }
  
  return `
Trading Decision: ${decision}

Summary: ${jsonData.summary || 'No summary available'}

Justification: ${jsonData.justification || 'No justification available'}
  `;
}

// Function to simulate sending an email to multiple recipients
function sendTradingDecisionEmail(decision, justification) {
  const subject = `[AI Trading Decision] ${decision} - ${new Date().toISOString().split('T')[0]}`;
  
  // Create both HTML and plain text versions of the email
  const htmlBody = formatJsonToHtml(decision, justification);
  const plainTextBody = formatPlainTextEmail(decision, justification);
  
  // Simulate multiple recipients
  const recipients = ["recipient1@example.com", "recipient2@example.com", "recipient3@example.com"];
  
  // Join multiple recipients with commas for a single email
  const recipientString = recipients.join(',');
  
  console.log(`\n=== SIMULATED EMAIL ===`);
  console.log(`To: ${recipientString}`);
  console.log(`Subject: ${subject}`);
  console.log(`\nPlain Text Body:\n${plainTextBody}`);
  console.log(`\nHTML Body Length: ${htmlBody.length} characters`);
  
  // Save the HTML to a file for inspection
  const outputDir = path.join(__dirname, 'test_output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  
  fs.writeFileSync(path.join(outputDir, 'test_email.html'), htmlBody);
  
  console.log(`\nEmail would be sent to multiple recipients: ${recipientString}`);
  console.log(`HTML output saved to: ${path.join(outputDir, 'test_email.html')}`);
}

// Main test function
function runTest() {
  console.log("Starting email test with multiple recipients...");
  
  const decision = sampleJsonResponse.decision;
  const justification = JSON.stringify(sampleJsonResponse, null, 2);
  
  // Test sending email to multiple recipients
  sendTradingDecisionEmail(decision, justification);
  
  console.log("\nTest completed successfully!");
}

// Run the test
runTest();
