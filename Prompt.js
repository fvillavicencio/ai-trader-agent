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
  
  return `**Optimized Trading Analysis Prompt for GPT-4.1 API**

Today's Date and Time: ${formattedDate}

**Instructions:**
You are an investment guru and your job is to provide informed opinions about market trends and insights.Using only the retrieved data provided below, generate a concise trading recommendation in JSON format with the following requirements:
	1.	Decision Options: "Buy Now", "Sell Now", or "Watch for Better Price Action".
	2.	Summary: Include a one-liner headline of market sentiment, key indicators, fundamental metrics, and macroeconomic factors that support your decision. Be witty, professional yet original
	3.  Justification: Provide a clear, one-paragraph long, detailed explanation for your decision and what factors contributed to it.
  4.	Fundamental Metrics:
	•	Include ALL available stocks from the data, do not omit any symbol.
	•	For each stock, incorporate every provided metric (e.g., price, priceChange, volume, marketCap, dividendYield, pegRatio, forwardPE, priceToBook, priceToSales, debtToEquity, returnOnEquity, beta, etc.).
	•	If a stock is marked as deprecated (isDeprecated: true), note this in your analysis and consider its data with caution.
	•	If any metrics are missing or null, note this in your analysis and explain how you're handling the lack of data.
	•	Do not omit any stocks or metrics mentioned in the provided data, but give appropriate weight to deprecated symbols and missing data.
	•	When metrics are missing, use reasonable defaults or explain why the missing data doesn't significantly impact the analysis.
	5.	Market Sentiment Analysis:
	•	Present an overall sentiment summary.
	•	Include all analyst comments (without timestamps) in the marketSentiment section.
	6.	Macroeconomic & Geopolitical Factors:
	•	Summarize treasury yields to two decimal places.
	•	For inflation, provide CPI Headline, CPI Core, PCE Headline, and PCE Core with clear values.
	•	Include an insightful regional geopolitical analysis for each major region/area included in the retrieved data plus a brief global summary.
	7.	Sources & Timestamps:
	•	Always cite source URLs and include timestamps for each data point wherever available.
	•	Do not include timestamps next to analyst comments in the final output.
	8.	No External Data:
	•	Use only the data provided below. Do not retrieve or reference any additional information.
	9.	Support Your Recommendation:
	•	Your final recommendation must be directly justified by the provided data.

**Output JSON Structure:**
{
  "decision": "Buy Now | Sell Now | Watch for Better Price Action",
  "summary": "Brief, clear summary of your recommendation",
  "analysis": {
    "marketSentiment": {
      "overall": "Brief overall market sentiment analysis",
      "analysts": [
        {
          "analyst": "Analyst Name",
          "comment": "Brief commentary",
          "mentionedSymbols": [
            "TICKER"
          ],
          "source": "Source name",
          "sourceUrl": "https://source.url"
        }
      ],
      "lastUpdated": "YYYY-MM-DD HH:MM"
    },
    "marketIndicators": {
      "fearGreedIndex": {
        "value": 0,
        "interpretation": "Brief interpretation",
        "comment": "One-line explanation of what this means for investors",
        "source": "Source name",
        "sourceUrl": "https://source.url",
        "lastUpdated": "YYYY-MM-DD HH:MM"
      },
      "vix": {
        "value": 0,
        "trend": "Brief trend",
        "analysis": "Brief analysis",
        "source": "Source name",
        "sourceUrl": "https://source.url",
        "lastUpdated": "YYYY-MM-DD HH:MM"
      },
      "upcomingEvents": [
        {
          "event": "Event name",
          "date": "Date"
        }
      ]
    },
    
    "macroeconomicFactors": {
      "treasuryYields": {
        "threeMonth": 0.00,
        "oneYear": 0.00,
        "twoYear": 0.00,
        "fiveYear": 0.00,
        "tenYear": 0.00,
        "thirtyYear": 0.00,
        "yieldCurve": "normal|inverted|flat",
        "implications": "Brief analysis",
        "source": "Source name",
        "sourceUrl": "https://source.url",
        "lastUpdated": "YYYY-MM-DD HH:MM"
      },
      "fedPolicy": {
        "federalFundsRate": 0.00,
        "forwardGuidance": "Brief statement",
        "source": "Source name",
        "sourceUrl": "https://source.url",
        "lastUpdated": "YYYY-MM-DD HH:MM"
      },
      "inflation": {
        "currentRate": 0.00,
        "cpi": {
          "headline": 0.00,
          "core": 0.00
        },
        "pce": {
          "headline": 0.00,
          "core": 0.00
        },
        "trend": "Brief trend",
        "outlook": "Brief outlook",
        "marketImpact": "Brief market impact analysis",
        "source": "Source name",
        "sourceUrl": "https://source.url",
        "lastUpdated": "YYYY-MM-DD HH:MM"
      },
      "geopoliticalRisks": {
        "global": "Brief global geopolitical risk summary",
        "lastUpdated": "YYYY-MM-DD HH:MM"
      }
    }
  },
  "justification": "Provide a clear, detailed explanation for your decision",
  "timestamp": "YYYY-MM-DD HH:MM"
}
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
