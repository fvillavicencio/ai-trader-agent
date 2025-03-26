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
Using ONLY the provided retrieved data below, generate a concise trading recommendation in JSON format as outlined:

- Decision options: "Buy Now", "Sell Now", "Watch for Better Price Action"
- Summarize market sentiment, key indicators, fundamental metrics, and macroeconomic factors clearly.
- Provide detailed reasoning for your recommendation.
- CRITICAL: Include ALL available stock data in the fundamentalMetrics section - do not omit ANY stocks or metrics.
- EXTREMELY IMPORTANT: You MUST include ALL stocks mentioned in the fundamental metrics data, especially the Magnificent Seven stocks (AAPL, MSFT, GOOGL, AMZN, META, TSLA, NVDA) and major indices (SPY, QQQ, IWM, DIA).
- For each stock in the fundamentalMetrics section, include ALL available metrics (price, priceChange, volume, marketCap, dividendYield, pegRatio, forwardPE, priceToBook, priceToSales, debtToEquity, returnOnEquity, beta, etc.)
- Provide regional geopolitical analysis for each major region plus, ideally 3 to 4, a global summary.
- Include an overall market sentiment analysis summary.
- For Treasury Yields, ensure that the metrics include two decimal points
- Format inflation metrics to include CPI Headline, CPI Core, PCE Headline, and PCE Core with clear values.
- Ensure all analyst comments are included in the marketSentiment section without timestamps in the display.

**CRITICAL:**
- Do NOT retrieve or reference additional external information.
- Use ONLY the data provided below.
- Ensure your recommendation is directly supported by the given data.
- IMPORTANT: Do not omit ANY stocks from the data - include every stock mentioned in the fundamental metrics data.
- For each stock, include ALL available metrics from the data (price, priceChange, volume, marketCap, dividendYield, pegRatio, forwardPE, priceToBook, priceToSales, debtToEquity, returnOnEquity, beta, etc.)
- ALWAYS include source URLs and timestamps for ALL data points when available.
- Ensure each section has information about the source and when the data was last updated.
- Do NOT include timestamps next to analyst comments in the final output.


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

**Retrieved Data:**`;
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
    
    // Create a data object for enhancing the prompt
    const enhancementData = {};
    
    // Add market sentiment data if available
    if (allData.marketSentiment && allData.marketSentiment.success) {
      const marketSentimentData = formatMarketSentimentData(allData.marketSentiment.data);
      enhancementData.marketSentiment = marketSentimentData;
      Logger.log("Added market sentiment data to prompt enhancement");
    }
    
    // Add key market indicators data if available
    if (allData.keyMarketIndicators && allData.keyMarketIndicators.success) {
      const keyMarketIndicatorsData = formatKeyMarketIndicatorsData(allData.keyMarketIndicators.data);
      enhancementData.keyMarketIndicators = keyMarketIndicatorsData;
      Logger.log("Added key market indicators data to prompt enhancement");
    }
    
    // Add fundamental metrics data if available
    if (allData.fundamentalMetrics && allData.fundamentalMetrics.success) {
      const fundamentalMetricsData = formatFundamentalMetricsData(allData.fundamentalMetrics.data);
      enhancementData.fundamentalMetrics = fundamentalMetricsData;
      Logger.log("Added fundamental metrics data to prompt enhancement");
    }
    
    // Add macroeconomic factors data if available
    if (allData.macroeconomicFactors && allData.macroeconomicFactors.success) {
      // Ensure data property exists before passing to formatter
      if (allData.macroeconomicFactors.data) {
        const macroeconomicFactorsData = formatMacroeconomicFactorsData(allData.macroeconomicFactors.data);
        enhancementData.macroeconomicFactors = macroeconomicFactorsData;
        Logger.log("Added macroeconomic factors data to prompt enhancement");
      } else {
        Logger.log("Warning: macroeconomicFactors.data is undefined");
        enhancementData.macroeconomicFactors = "Macroeconomic data unavailable";
      }
    }
    
    // Enhance the prompt with all the retrieved data
    const enhancedPrompt = enhancePromptWithData(basePrompt, enhancementData);
    
    // Log what data was included in the prompt
    Logger.log("Data included in prompt:");
    Logger.log("- Market Sentiment: " + (enhancementData.marketSentiment ? "Yes" : "No"));
    Logger.log("- Key Market Indicators: " + (enhancementData.keyMarketIndicators ? "Yes" : "No"));
    Logger.log("- Fundamental Metrics: " + (enhancementData.fundamentalMetrics ? "Yes" : "No"));
    Logger.log("- Macroeconomic Factors: " + (enhancementData.macroeconomicFactors ? "Yes" : "No"));
    
    return enhancedPrompt;
  } catch (error) {
    Logger.log("Error in generateOpenAIPrompt: " + error);
    throw error;
  }
}
