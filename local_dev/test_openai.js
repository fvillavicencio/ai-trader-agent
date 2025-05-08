const fs = require('fs');
const axios = require('axios');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Get the OpenAI API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("Error: OpenAI API key not found in environment variables");
  process.exit(1);
}

// You'll need to set your OpenAI API key here or as an environment variable

async function testOpenAI() {
  try {
    console.log("Reading sample data...");
    
    // Read the sample data file
    const sampleData = fs.readFileSync('../sampleDataRetrieval.txt', 'utf8');
    
    // Create a simple prompt
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: 'numeric', 
      timeZoneName: 'short' 
    });
    
    const basePrompt = `**Optimized Trading Analysis Prompt for GPT-4.5 API**

Today's Date and Time: ${formattedDate}

**Instructions:**
Using ONLY the provided retrieved data below, generate a concise trading recommendation in JSON format as outlined:

- Decision options: "Buy Now", "Sell Now", "Watch for Better Price Action"
- Summarize market sentiment, key indicators, fundamental metrics, and macroeconomic factors clearly.
- Provide detailed reasoning for your recommendation.
- CRITICAL: Include ALL available stock data in the fundamentalMetrics section - do not omit ANY stocks or metrics.
- For each stock in the fundamentalMetrics section, include ALL available metrics (price, priceChange, volume, marketCap, dividendYield, pegRatio, forwardPE, priceToBook, priceToSales, debtToEquity, returnOnEquity, beta, etc.)
- Provide regional geopolitical analysis for each major region plus a global summary.
- Include an overall market sentiment analysis summary.
- Format inflation metrics to include CPI Headline, CPI Core, PCE Headline, and PCE Core with clear values.
- Ensure all analyst comments are included in the marketSentiment section without timestamps in the display.

**Output JSON Structure:**
{
  "decision": "Buy Now | Sell Now | Watch for Better Price Action",
  "summary": "Brief, clear summary of your recommendation",
  "analysis": {
    "marketSentiment": {
      "overall": "Brief overall market sentiment analysis",
      "analysts": [{"analyst": "Analyst Name", "comment": "Brief commentary", "mentionedSymbols": ["TICKER"], "source": "Source name", "sourceUrl": "https://source.url"}],
      "source": "Overall sentiment source", 
      "sourceUrl": "https://overall.source.url",
      "lastUpdated": "YYYY-MM-DD HH:MM"
    },
    "marketIndicators": {
      "fearGreedIndex": {"value": 0, "interpretation": "Brief interpretation", "source": "Source name", "sourceUrl": "https://source.url", "lastUpdated": "YYYY-MM-DD HH:MM"},
      "vix": {"value": 0, "trend": "Brief trend", "analysis": "Brief analysis", "source": "Source name", "sourceUrl": "https://source.url", "lastUpdated": "YYYY-MM-DD HH:MM"},
      "upcomingEvents": [{"event": "Event name", "date": "YYYY-MM-DD"}],
      "source": "Events source", 
      "sourceUrl": "https://events.source.url",
      "lastUpdated": "YYYY-MM-DD HH:MM"
    },
    "fundamentalMetrics": [{"symbol": "TICKER", "name": "Company Name", "price": 0.00, "priceChange": "+/-0.00 (0.00%)", "volume": "0M", "marketCap": "$0B", "dividendYield": "0.00%", "pegRatio": 0, "forwardPE": 0, "priceToBook": 0, "priceToSales": 0, "debtToEquity": 0, "returnOnEquity": "0.0%", "beta": 0, "comment": "Brief analysis", "source": "Source name", "sourceUrl": "https://source.url", "lastUpdated": "YYYY-MM-DD HH:MM"}],
    "macroeconomicFactors": {
      "treasuryYields": {"threeMonth": 0.00, "oneYear": 0.00, "twoYear": 0.00, "tenYear": 0.00, "thirtyYear": 0.00, "yieldCurve": "normal|inverted|flat", "implications": "Brief analysis", "source": "Source name", "sourceUrl": "https://source.url", "lastUpdated": "YYYY-MM-DD HH:MM"},
      "fedPolicy": {"federalFundsRate": 0.00, "forwardGuidance": "Brief statement", "source": "Source name", "sourceUrl": "https://source.url", "lastUpdated": "YYYY-MM-DD HH:MM"},
      "inflation": {"currentRate": 0.0, "cpi": {"headline": 0.0, "core": 0.0}, "pce": {"headline": 0.0, "core": 0.0}, "trend": "Brief trend", "outlook": "Brief outlook", "marketImpact": "Brief market impact analysis", "source": "Source name", "sourceUrl": "https://source.url", "lastUpdated": "YYYY-MM-DD HH:MM"},
      "geopoliticalRisks": {
        "global": "Brief global geopolitical risk summary",
        "regions": [
          {
            "region": "Region Name (e.g., North America, Europe, Asia, Middle East)",
            "risks": [{"description": "Brief description", "impactLevel": "High|Moderate|Low", "source": "Source name", "sourceUrl": "https://source.url", "lastUpdated": "YYYY-MM-DD HH:MM"}]
          }
        ],
        "source": "Overall geopolitical source", 
        "sourceUrl": "https://geopolitical.source.url",
        "lastUpdated": "YYYY-MM-DD HH:MM"
      }
    }
  },
  "justification": "Clear, detailed explanation for your decision",
  "source": "Overall analysis source",
  "sourceUrl": "https://analysis.source.url",
  "timestamp": "YYYY-MM-DD HH:MM"
}

**CRITICAL:**
- Do NOT retrieve or reference additional external information.
- Use ONLY the data provided below.
- Ensure your recommendation is directly supported by the given data.
- Include ALL available stock data in the fundamentalMetrics section.
- IMPORTANT: Do not omit ANY stocks from the data - include every stock mentioned in the fundamental metrics data.
- For each stock, include ALL available metrics from the data (price, priceChange, volume, marketCap, dividendYield, pegRatio, forwardPE, priceToBook, priceToSales, debtToEquity, returnOnEquity, beta, etc.)
- Provide regional geopolitical analysis for each major region plus a global summary.
- Include an overall market sentiment analysis summary.
- ALWAYS include source URLs and timestamps for ALL data points when available.
- Ensure each section has information about the source and when the data was last updated.
- Format inflation metrics as a card-based layout with CPI Headline, CPI Core, PCE Headline, and PCE Core clearly displayed.
- Do NOT include timestamps next to analyst comments in the final output.
- Ensure ALL stocks from the fundamental metrics data are included in the response.`;
    
    // Combine the base prompt with the sample data
    const fullPrompt = basePrompt + "\n\n**Retrieved Data:**\n" + sampleData;
    
    console.log("Sending prompt to OpenAI API...");
    
    // Make the API request
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an AI agent tasked with providing actionable trading recommendations in JSON format. Your analysis should be accurate and based ONLY on the data provided in the prompt - do not attempt to browse the web or retrieve additional information.\n\nCRITICAL: You MUST include ALL stocks mentioned in the fundamental metrics data. Do not omit any stocks. Include GOOGL, AMZN, META, TSLA, NVDA and any other stocks mentioned in the data.\n\nIMPORTANT: Return ONLY raw JSON without any markdown formatting, code blocks, or explanatory text. Do not wrap your response in ```json``` or any other formatting. Your entire response must be a valid, parseable JSON object with the structure specified in the prompt."
        },
        {
          role: "user",
          content: fullPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 4000
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Extract the content from the response
    const content = response.data.choices[0].message.content;
    
    // Clean and parse the JSON
    let analysisResult;
    try {
      analysisResult = JSON.parse(content);
    } catch (jsonError) {
      console.error("Error parsing JSON response:", jsonError);
      // If parsing fails, try to extract JSON from the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not extract JSON from response");
      }
    }
    
    // Save the JSON output to a file
    const jsonOutput = JSON.stringify(analysisResult, null, 2);
    fs.writeFileSync('chatGPTOutput.json', jsonOutput);
    console.log("JSON output saved to file: local_dev/chatGPTOutput.json");
    
    console.log("Test completed successfully!");
  } catch (error) {
    console.error(`Error in test: ${error}`);
  }
}

// Run the test
testOpenAI();
