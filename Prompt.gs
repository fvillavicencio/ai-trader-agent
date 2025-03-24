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
  
  return `**Optimized Trading Analysis Prompt for GPT-4 API**

Today's Date and Time: ${formattedDate}

**Instructions:**
Using ONLY the provided retrieved data below, generate a concise trading recommendation in JSON format as outlined:

- Decision options: "Buy Now", "Sell Now", "Watch for Better Price Action"
- Summarize market sentiment, key indicators, fundamental metrics, and macroeconomic factors clearly.
- Provide detailed reasoning for your recommendation.

**Output JSON Structure:**
{
  "decision": "Buy Now | Sell Now | Watch for Better Price Action",
  "summary": "Brief, clear summary of your recommendation",
  "analysis": {
    "marketSentiment": [{"analyst": "Analyst Name", "comment": "Brief commentary", "mentionedSymbols": ["TICKER"]}],
    "marketIndicators": {
      "fearGreedIndex": {"value": 0, "interpretation": "Brief interpretation"},
      "vix": {"value": 0, "trend": "Brief trend"},
      "upcomingEvents": [{"event": "Event name", "date": "YYYY-MM-DD"}]
    },
    "fundamentalMetrics": [{"symbol": "TICKER", "pegRatio": 0, "forwardPE": 0, "comment": "Brief analysis"}],
    "macroeconomicFactors": {
      "treasuryYields": {"twoYear": 0.00, "tenYear": 0.00, "yieldCurve": "normal|inverted|flat", "implications": "Brief analysis"},
      "fedPolicy": {"federalFundsRate": 0.00, "forwardGuidance": "Brief statement"},
      "inflation": {"cpi": 0.0, "coreCpi": 0.0, "pce": 0.0, "corePce": 0.0, "trend": "Brief trend"},
      "geopoliticalRisks": [{"description": "Brief description", "regionsAffected": ["Region"], "impactLevel": "High|Moderate|Low"}]
    }
  },
  "justification": "Clear, detailed explanation for your decision"
}

**CRITICAL:**
- Do NOT retrieve or reference additional external information.
- Use ONLY the data provided below.
- Ensure your recommendation is directly supported by the given data.

**Retrieved Data:**`;
}
