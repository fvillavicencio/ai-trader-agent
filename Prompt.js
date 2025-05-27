/**
 * Prompt template for the OpenAI API
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

**Date & Time:** ${formattedDate}

You are an elite investment strategist. Using only the data provided below, produce a **JSON** recommendation with these enhancements:

---

### 1. Expanded Decision Options
Allowed values for "decision":
- **Buy Now**
- **Sell Now**
- **Hold – Awaiting Stronger Price Momentum**
- **Buy and Hedge**
- **Sell Calls**
- **Deploy Hedges**
- **Position for Long-Term**
- **Remain Diligent**

---

### Decision Trigger Guidelines (Key Metrics Table)
Use the following heuristics to determine the appropriate decision:

| Decision Option | Trigger Conditions |
|-----------------|-------------------|
| **Buy Now** | Forward P/E < 15 and/or Fear & Greed Index ≤ 50 (Extreme Fear), VIX < 18 |
| **Sell Now** | Forward P/E > 21 and/or Fear & Greed Index > 70 (Extreme Greed), VIX > 22 |
| **Hold – Awaiting Stronger Price Momentum** | Forward P/E 15–18, Fear & Greed 21–50, VIX 18–22, unclear trend |
| **Buy and Hedge** | Bullish indicators but with elevated volatility or macro risk |
| **Sell Calls** | VIX > 20 and/or options expensive, but not at extreme boundaries |
| **Deploy Hedges** | VIX < 20 and/or options cheap, market appears complacent |
| **Position for Long-Term** | Macro/fundamental signals favor long-term investing, low short-term risk |
| **Remain Diligent** | Use when boundaries are reached on all key metrics (VIX < 18 or > 22, forward P/E < 18 or > 21, etc.), especially for overall S&P 500 market sentiment. This signals a need for extra caution and flexible hedging to manage both upside and downside risk. |

- These decisions are for overall S&P 500 market sentiment only, using key metrics as shown above.
- "Remain Diligent" is an additional option and does not replace "Sell Calls"; both can be valid under different conditions.
- Always justify your recommendation using the provided data and reference the table above for decision triggers.
- **If the decision is "Remain Diligent", the summary should be:**
  "Consider short term equity and bond value displacements and hedging for potential up/down market risk"

---

### 2. Forward P/E Trend Analysis
- Compute 3–6 month forward P/E using provided EPS estimates for 2025 and 2026.
- Compare current and trend of forward P/E vs. thresholds:
  - **< 15** → strong buy opportunity
  - **15–18** → neutral/caution
  - **> 18** → overvalued/caution
- If heading into summer (June–Aug), give extra weight to 2026 estimates.

---

### 3. Market Sentiment Heuristics
- **Fear & Greed Index**:
  - ≤ 20 → “Extreme Fear”
  - 21–50 → “Fear/Neutral”
  - > 50 → “Greed”
- **VIX**:
  - > 20 and rising → “High Volatility”
  - < 20 and falling → “Stable/Complacent”
- **Recommendations**:
  - If Fear & Greed low (≤ 50) & forward P/E < 18 → **Buy Now** (long term) & **Consider short-term trades**
  - If VIX < 20 → **Deploy Hedges**
  - If VIX > 20 → **Sell Calls**
- **Market Sentiment**:
  - Include one single-line summary for each analyst in the data provided in the marketSentiment section.
  - Include any ticker for any stock mentioned by each analyst (if any) in the marketSentiment section.
  - Analyze if analyst views converge or diverge from each other.
  - Identify if analyst views align with what the metrics and data suggest.
  - Highlight specific companies or sectors that look more interesting at the time of report generation.

---

### 4. Volatility & Hedging
- When VIX < 20: options cheap ⇒ recommend **long‑term hedges** (buy protective puts).
- When VIX > 20: options expensive ⇒ recommend **selling calls** to generate income.

---

### 5. Macro & Commodity Signals
- Incorporate:
  - **USD Trend** (up/down)
  - **Gold Price** (up/down)
  - **10‑Year Treasury Yield** (reference 4.3% level)
- If USD weakening AND gold rising AND 10‑Year > 4.3% and rising → treat environment as high risk; tighten forward P/E threshold to **15–16**.

---

### 6. Composite Sentiment Score
- For each data pillar—forward P/E, Fear/Greed, VIX, and your top 3 economic indicators (Core PCE, CPI, Jobs, Treasury)—assign **Low/Mid/High** (0/50/100).
- Average to a 0–100 score, then map to:
  - ≥ 70 → “Bullish”
  - 40–69 → “Neutral”
  - < 40 → “Bearish”
- Include this as "compositeSentiment".

---

### 7. Significant Market Moves
- Identify any stock or ETF with a daily change greater than 2% (up or down).
- Analyze potential causes for these significant moves.
- Provide specific commentary on these moves in the analysis section.
- Consider if these moves represent potential opportunities or warnings for investors.

---

### 8. Constraints:
- Use only the data below—no external references.
- Cite sources in the justification where appropriate.
- Be concise, original, and professional.

---

### 9. Output Format
Return exactly:
{
  "decision": "<one of the 7 options>",
  "compositeSentiment": "Bullish|Neutral|Bearish",
  "summary": "<one‑line wittily professional headline>",
  "analysis": {
    "forwardPE": {
      "current": <number>,
      "trend": "Rising|Falling|Flat",
      "thresholdComparison": "<Low/Mid/High>"
    },
    "hedgingRecommendation": "<Deploy Hedges|Sell Calls|None>",
    "marketSentiment": {
      "overall": "Brief overall market sentiment analysis",
      "analystConsensus": {
        "convergence": "Strong|Moderate|Weak",
        "alignmentWithData": "Strong|Moderate|Weak",
        "interestingSectors": ["Sector1", "Sector2"],
        "interestingCompanies": ["TICKER1", "TICKER2"]
      },
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
        "value": <number>,
        "trend": "Rising|Falling|Flat",
        "analysis": "Brief analysis"
      },
      "significantMoves": [
        {
          "symbol": "TICKER",
          "percentChange": <number>,
          "direction": "Up|Down",
          "potentialCause": "Brief explanation of potential cause",
          "opportunity": "Brief assessment of whether this represents an opportunity or warning"
        }
      ],
      "macroSignals": {
        "dollar": "Up|Down|Flat",
        "gold": "Up|Down|Flat",
        "treasury10Y": <number>
      }
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
  "justification": "<one‑paragraph explaining all factors>",
  "timestamp": "{{current_date_time}}"
}
`;
}

/**
 * Generates the OpenAI prompt with all the data in JSON format
 * 
 * @param {Object} allData - All the retrieved data
 * @return {string} - The generated prompt
 */
function generateOpenAIPrompt(allData) {
  try {
    // Get the base prompt template
    const basePrompt = getTradingAnalysisPrompt();
    
    // Generate the data in JSON format using JsonExport with null analysis
    // This will create a complete dataset with all available market data
    const jsonData = JsonExport.generateFullJsonDataset(null, false);
    
    // Convert the JSON data to a formatted string
    const jsonString = JSON.stringify(jsonData, null, 2);
    
    // Combine the base prompt with the JSON data
    const fullPrompt = basePrompt + "\n\n**Retrieved Data (JSON Format):**\n```json\n" + jsonString + "\n```\n";
    
    Logger.log("Generated full OpenAI prompt with JSON data");
    
    return fullPrompt;
  } catch (error) {
    Logger.log(`Error generating OpenAI prompt: ${error}`);
    throw new Error(`Failed to generate OpenAI prompt: ${error}`);
  }
}

/**
 * OLDER VERSION: Returns the trading analysis prompt template
 */
function getTradingAnalysisPrompt_Old() {
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
	1.	Decision Options: "Buy Now", "Sell Now", or "Hold – Awaiting Stronger Price Momentum".
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
  "decision": "Buy Now | Sell Now | Hold – Awaiting Stronger Price Momentum",
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
