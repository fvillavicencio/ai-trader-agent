/**
 * Prompt template for the OpenAI API
 */

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
  
  return `**Optimized Trading Analysis Prompt for GPT-4.5 API**

Today's Date and Time: ${formattedDate}

**Instructions:**
Using only the retrieved data provided below, generate a concise trading recommendation in JSON format with the following requirements:
	1.	Decision Options: "Buy Now", "Sell Now", or "Watch for Better Price Action".
	2.	Summary: Include a brief overview of market sentiment, key indicators, fundamental metrics, and macroeconomic factors that support your decision.
	3.	Fundamental Metrics:
	•	Include all available stocks from the data (especially the Magnificent Seven: AAPL, MSFT, GOOGL, AMZN, META, TSLA, NVDA, plus major indices SPY, QQQ, IWM, DIA).
	•	For each stock, incorporate every provided metric (e.g., price, priceChange, volume, marketCap, dividendYield, pegRatio, forwardPE, priceToBook, priceToSales, debtToEquity, returnOnEquity, beta, etc.).
	•	Do not omit any stocks or metrics mentioned in the provided data.
	4.	Market Sentiment Analysis:
	•	Present an overall sentiment summary.
	•	Include all analyst comments (without timestamps) in the marketSentiment section.
	5.	Macroeconomic & Geopolitical Factors:
	•	Summarize treasury yields to two decimal places.
	•	For inflation, provide CPI Headline, CPI Core, PCE Headline, and PCE Core with clear values.
	•	Include regional geopolitical analysis for each major region plus a brief global summary.
	6.	Sources & Timestamps:
	•	Always cite source URLs and include timestamps for each data point wherever available.
	•	Do not include timestamps next to analyst comments in the final output.
	7.	No External Data:
	•	Use only the data provided below. Do not retrieve or reference any additional information.
	8.	Support Your Recommendation:
	•	Your final recommendation must be directly justified by the provided data.

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
      "fearGreedIndex": {"value": 0, "interpretation": "Brief interpretation", "comment": "One-line explanation of what this means for investors", "source": "Source name", "sourceUrl": "https://source.url", "lastUpdated": "YYYY-MM-DD HH:MM"},
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

**Retrieved Data:**

`;
}

/**
 * Generates the OpenAI prompt with all the data
 * 
 * @param {Object} allData - All the retrieved data
 * @return {string} - The generated prompt
 */
function generateOpenAIPrompt(allData) {
  try {
    // Get the base prompt template
    const basePrompt = getTradingAnalysisPrompt();
    
    // Generate the data retrieval text
    const dataRetrievalText = generateDataRetrievalText();
    
    // Combine the base prompt with the data retrieval text
    const fullPrompt = basePrompt + dataRetrievalText;
    
    Logger.log("Generated full OpenAI prompt");
    
    return fullPrompt;
  } catch (error) {
    Logger.log(`Error generating OpenAI prompt: ${error}`);
    throw new Error(`Failed to generate OpenAI prompt: ${error}`);
  }
}
