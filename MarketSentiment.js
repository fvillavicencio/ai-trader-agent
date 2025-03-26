/**
 * Market Sentiment Module
 * Handles all market sentiment data retrieval from analysts and sentiment indicators
 * This version uses Perplexity API to retrieve real-time market sentiment data
 */

/**
 * Retrieves market sentiment from prominent analysts and sources via Perplexity
 * @return {Object} Market sentiment data from various analysts and sources
 */
function retrieveMarketSentiment() {
  try {
    Logger.log("Retrieving market sentiment data from Perplexity...");
    
    // Get Perplexity API key from script properties
    const scriptProperties = PropertiesService.getScriptProperties();
    const perplexityApiKey = scriptProperties.getProperty('PERPLEXITY_API_KEY');
    
    if (!perplexityApiKey) {
      Logger.log("No Perplexity API key found. Please set the PERPLEXITY_API_KEY in script properties.");
      return getMockMarketSentimentData();
    }
    
    // Create the prompt for Perplexity
    const prompt = getPerplexityMarketSentimentPrompt();
    
    // Call Perplexity API
    const response = callPerplexityApi(prompt, perplexityApiKey);
    
    // Parse and validate the response
    const sentimentData = parsePerplexityResponse(response);
    
    // Log the results
    Logger.log(`Market sentiment data retrieved with ${sentimentData.analysts.length} analysts and ${sentimentData.sentimentIndicators.length} sentiment indicators.`);
    
    return sentimentData;
  } catch (error) {
    Logger.log(`Error retrieving market sentiment from Perplexity: ${error}`);
    Logger.log("Falling back to mock data...");
    return getMockMarketSentimentData();
  }
}

/**
 * Generates the prompt for Perplexity to retrieve market sentiment data
 * @return {String} The prompt for Perplexity
 */
function getPerplexityMarketSentimentPrompt() {
  const currentDate = new Date().toISOString();
  
  return `# Generate Current Market Sentiment Data

I need you to generate comprehensive market sentiment data from top financial analysts and sentiment indicators. Please follow these specifications:

## Data Requirements

1. Generate structured market sentiment data based on the most recent commentary and indicators.

2. **CRITICAL REQUIREMENT**: Only include data published within the last 24 hours as of ${currentDate} to ensure all information is current and relevant.

3. Return the data in the exact JSON structure specified below.

## Data Sources to Include

### Financial Analysts
Collect recent commentary from these specific analysts:

1. **Dan Nathan** (Risk Reversal)
   - Check: Recent posts on https://riskreversal.com/
   - Recent appearances on CNBC
   - Recent tweets from @RiskReversal

2. **Josh Brown** (Ritholtz Wealth Management)
   - Check: Recent posts on https://www.downtownjoshbrown.com/
   - Recent content from https://ritholtzwealth.com/blog/
   - Recent tweets from @ReformedBroker

3. **Steve Weiss**
   - Check: Recent appearances on CNBC Halftime Report
   - Recent commentary on https://www.cnbc.com/steve-weiss/

4. **Joe Terranova** (Virtus Investment Partners)
   - Check: Recent market commentary
   - Recent appearances on CNBC
   - Recent tweets from @JoeTerranova

5. **Dan Niles** (Satori Fund)
   - Check: Recent appearances on CNBC
   - Recent market commentary

6. **Mohamed El-Erian** (Allianz)
   - Check: Recent articles on Financial Times
   - Recent posts on Project Syndicate
   - Recent commentary on Bloomberg

### Sentiment Indicators
Include the most recent readings from these market sentiment indicators:

1. AAII Investor Sentiment Survey: https://www.aaii.com/sentimentsurvey
2. CBOE Put/Call Ratio: https://www.cboe.com/us/options/market_statistics/daily/
3. Investors Intelligence Bull/Bear Ratio: https://www.investorsintelligence.com/x/default.html
4. Citi Panic/Euphoria Model: https://www.citivelocity.com/t/r/eppublic/1rNx
5. JPMorgan Market Risk Sentiment: https://www.jpmorgan.com/insights/research/market-outlook
6. Morgan Stanley Risk Indicator: https://www.morganstanley.com/ideas/thoughts-on-the-market
7. Credit Suisse Risk Appetite Index: https://www.credit-suisse.com/about-us/en/reports-research/studies-publications.html

## Required Output Format

You MUST return the data in this exact JSON format:

\`\`\`javascript
{
  "timestamp": "${new Date().toISOString()}",  // Current timestamp when data was generated
  "analysts": [
    {
      "name": "Dan Nathan",  // Analyst name
      "role": "CNBC Fast Money Contributor",  // Analyst role/title
      "content": "...",  // The extracted commentary (full text)
      "lastUpdated": "2025-03-22T14:30:00-04:00",  // Publication date (must be within last 24 hours)
      "source": "https://riskreversal.com/recent-post-url/",  // Exact source URL
      "mentionedSymbols": ["AAPL", "NVDA", "SPY"]  // Extracted stock symbols
    },
    // Include all 6 analysts with real, current data
  ],
  "sentimentIndicators": [
    {
      "name": "AAII Investor Sentiment Survey",  // Indicator name
      "url": "https://www.aaii.com/sentimentsurvey",  // Source URL
      "reading": "Bullish: 45.2%, Bearish: 25.6%, Neutral: 29.2%",  // Current numerical reading
      "content": "The latest AAII Sentiment Survey shows retail investors are more bullish than historical average...",  // Contextual information
      "lastUpdated": "2025-03-21T16:00:00-04:00",  // When published (must be within last 24 hours)
      "source": "AAII.com"  // Source name
    },
    // Include all 7 sentiment indicators with real, current data
  ]
}
\`\`\`

## Additional Requirements

1. For each piece of information, include the exact source URL and precise publication timestamp
2. Extract any stock symbols mentioned in analyst commentary (use standard ticker symbols)
3. Ensure all timestamps are in ISO 8601 format with timezone information
4. Only include data published within the last 24 hours
5. For each analyst and indicator, provide substantive content (not placeholder text)
6. If you cannot find current data (within 24 hours) for any specific analyst or indicator, note this in the content field`;
}

/**
 * Calls the Perplexity API with the given prompt
 * @param {String} prompt - The prompt to send to Perplexity
 * @param {String} apiKey - The Perplexity API key
 * @return {Object} The response from Perplexity
 */
function callPerplexityApi(prompt, apiKey) {
  try {
    const apiUrl = "https://api.perplexity.ai/chat/completions";
    
    // System prompt contains permanent instructions
    const systemPrompt = "Generate market sentiment analysis in exact JSON format. Include null values where data unavailable. Validate JSON syntax before returning. Only include data from the last 24 hours. You are a financial analyst assistant that provides structured market sentiment data.";
    
    // User prompt contains the specific data requirements
    const userPrompt = prompt;
    
    // Define models to try in order of preference
    // Updated models based on current Perplexity API documentation
    const models = ["sonar-pro", "sonar", "sonar-reasoning", "sonar-reasoning-pro", "r1-1776"];
    
    let response = null;
    let error = null;
    
    // Try each model until one works
    for (const model of models) {
      try {
        Logger.log(`Trying Perplexity API with model: ${model}`);
        
        const payload = {
          model: model,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.2,
          top_p: 0.9
        };
        
        const options = {
          method: "post",
          contentType: "application/json",
          headers: {
            "Authorization": `Bearer ${apiKey}`
          },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        };
        
        // Add retry logic for rate limiting
        let retries = 0;
        const maxRetries = 3;
        
        while (retries < maxRetries) {
          try {
            response = UrlFetchApp.fetch(apiUrl, options);
            const responseCode = response.getResponseCode();
            
            if (responseCode === 200) {
              Logger.log(`Perplexity API call successful with model: ${model}`);
              return response; // Return successful response
            } else if (responseCode === 429) {
              // Rate limited, wait and retry
              Logger.log(`Rate limited by Perplexity API. Retrying in ${(retries + 1) * 2} seconds...`);
              Utilities.sleep((retries + 1) * 2000);
              retries++;
            } else if (responseCode === 400) {
              // Bad request (likely invalid model), try the next model
              Logger.log(`Model ${model} is invalid or unavailable. Error: ${response.getContentText()}`);
              break;
            } else {
              // Other error, try the next model
              Logger.log(`Error calling Perplexity API with model ${model}. Status code: ${responseCode}, Error: ${response.getContentText()}`);
              break;
            }
          } catch (retryError) {
            Logger.log(`Error during retry with model ${model}: ${retryError}`);
            retries++;
            if (retries >= maxRetries) {
              break;
            }
            Utilities.sleep(retries * 2000);
          }
        }
      } catch (modelError) {
        error = modelError;
        Logger.log(`Error with model ${model}: ${modelError}`);
        // Continue to next model
      }
    }
    
    // If we've tried all models and none worked, throw an error
    if (!response) {
      throw new Error(`All Perplexity API models failed. Last error: ${error}`);
    }
    
    return response;
  } catch (error) {
    Logger.log(`Error calling Perplexity API: ${error}`);
    throw error;
  }
}

/**
 * Parses and validates the response from Perplexity
 * @param {Object} response - The response from Perplexity
 * @return {Object} The parsed market sentiment data
 */
function parsePerplexityResponse(response) {
  try {
    // Parse the response
    const responseData = JSON.parse(response.getContentText());
    
    // Extract the content from the response
    let content = "";
    if (responseData.choices && responseData.choices.length > 0 && responseData.choices[0].message) {
      content = responseData.choices[0].message.content;
    } else {
      throw new Error("Invalid response format from Perplexity API");
    }
    
    // Extract the JSON data from the content
    // The content might contain markdown and explanatory text, so we need to extract just the JSON
    const jsonRegex = /```(?:javascript|json)?\s*(\{[\s\S]*?\})\s*```/;
    const jsonMatch = content.match(jsonRegex);
    
    if (!jsonMatch || !jsonMatch[1]) {
      // Try a more lenient approach - look for any JSON object
      const lenientJsonRegex = /(\{[\s\S]*\})/;
      const lenientMatch = content.match(lenientJsonRegex);
      
      if (!lenientMatch || !lenientMatch[1]) {
        throw new Error("Could not extract JSON data from Perplexity response");
      }
      
      // Parse the extracted JSON
      const sentimentData = JSON.parse(lenientMatch[1]);
      return validateSentimentData(sentimentData);
    }
    
    // Parse the extracted JSON
    const sentimentData = JSON.parse(jsonMatch[1]);
    return validateSentimentData(sentimentData);
  } catch (error) {
    Logger.log(`Error parsing Perplexity response: ${error}`);
    Logger.log("Falling back to mock data...");
    return getMockMarketSentimentData();
  }
}

/**
 * Validates the sentiment data structure and ensures it has the required fields
 * @param {Object} data - The sentiment data to validate
 * @return {Object} The validated sentiment data
 */
function validateSentimentData(data) {
  // Check if the data has the required structure
  if (!data || !data.analysts || !data.sentimentIndicators) {
    Logger.log("Invalid sentiment data structure, missing required fields");
    return getMockMarketSentimentData();
  }
  
  // Ensure analysts is an array
  if (!Array.isArray(data.analysts)) {
    data.analysts = [];
  }
  
  // Ensure sentimentIndicators is an array
  if (!Array.isArray(data.sentimentIndicators)) {
    data.sentimentIndicators = [];
  }
  
  // Add timestamp if missing
  if (!data.timestamp) {
    data.timestamp = new Date().toISOString();
  }
  
  return data;
}

/**
 * Provides mock market sentiment data as a fallback
 * @return {Object} Mock market sentiment data
 */
function getMockMarketSentimentData() {
  const currentDate = new Date();
  const yesterday = new Date(currentDate);
  yesterday.setDate(yesterday.getDate() - 1);
  
  return {
    timestamp: currentDate,
    analysts: [
      {
        name: "Dan Nathan",
        role: "CNBC Fast Money Contributor",
        content: "Markets are showing signs of exhaustion after the recent rally. Watching tech closely as earnings approach. $NVDA still the market darling but valuation concerns growing.",
        lastUpdated: yesterday,
        source: "Mock Data (Perplexity API unavailable)",
        mentionedSymbols: ["NVDA", "AAPL", "MSFT"]
      },
      {
        name: "Josh Brown",
        role: "CEO of Ritholtz Wealth Management, CNBC Contributor",
        content: "The rotation from growth to value continues. Small caps showing strength this week. Keep an eye on regional banks as interest rates stabilize.",
        lastUpdated: yesterday,
        source: "Mock Data (Perplexity API unavailable)",
        mentionedSymbols: ["IWM", "KRE", "XLF"]
      },
      {
        name: "Steve Weiss",
        role: "CNBC Halftime Report Contributor",
        content: "Still cautious on the overall market. Inflation remains sticky and the Fed might keep rates higher for longer. Defensive positioning recommended.",
        lastUpdated: yesterday,
        source: "Mock Data (Perplexity API unavailable)",
        mentionedSymbols: ["XLU", "XLP", "GLD"]
      },
      {
        name: "Joe Terranova",
        role: "Chief Market Strategist at Virtus Investment Partners, CNBC Contributor",
        content: "Energy sector looks attractive with current geopolitical tensions. Oil prices likely to remain elevated through summer driving season.",
        lastUpdated: yesterday,
        source: "Mock Data (Perplexity API unavailable)",
        mentionedSymbols: ["XLE", "CVX", "XOM"]
      },
      {
        name: "Dan Niles",
        role: "Founder and Portfolio Manager of the Satori Fund",
        content: "Tech valuations remain stretched. Concerned about consumer spending slowing down. Cautious on retail and consumer discretionary.",
        lastUpdated: yesterday,
        source: "Mock Data (Perplexity API unavailable)",
        mentionedSymbols: ["XLY", "AMZN", "WMT"]
      },
      {
        name: "Mohamed El-Erian",
        role: "President of Queens' College, Cambridge and Chief Economic Advisor at Allianz",
        content: "Central banks face a difficult balancing act. Inflation remains above target while growth is slowing. Markets not fully pricing in this uncertainty.",
        lastUpdated: yesterday,
        source: "Mock Data (Perplexity API unavailable)",
        mentionedSymbols: ["TLT", "SPY", "VIX"]
      }
    ],
    sentimentIndicators: [
      {
        name: "AAII Investor Sentiment Survey",
        url: "https://www.aaii.com/sentimentsurvey",
        reading: "Bullish: 42.5%, Bearish: 27.8%, Neutral: 29.7%",
        content: "Retail investor sentiment remains more bullish than the historical average, suggesting potential complacency.",
        lastUpdated: yesterday,
        source: "Mock Data (Perplexity API unavailable)"
      },
      {
        name: "CBOE Put/Call Ratio",
        url: "https://www.cboe.com/us/options/market_statistics/daily/",
        reading: "0.85",
        content: "Put/call ratio below 1.0 indicates more call options being purchased than puts, suggesting bullish sentiment.",
        lastUpdated: yesterday,
        source: "Mock Data (Perplexity API unavailable)"
      },
      {
        name: "Investors Intelligence Bull/Bear Ratio",
        url: "https://www.investorsintelligence.com/x/default.html",
        reading: "2.8",
        content: "Bull/bear ratio above 2.5 indicates excessive bullishness among newsletter writers, a potential contrarian indicator.",
        lastUpdated: yesterday,
        source: "Mock Data (Perplexity API unavailable)"
      },
      {
        name: "Citi Panic/Euphoria Model",
        url: "https://www.citivelocity.com/t/r/eppublic/1rNx",
        reading: "Euphoria Zone",
        content: "Model reading in the euphoria zone, historically associated with lower future returns.",
        lastUpdated: yesterday,
        source: "Mock Data (Perplexity API unavailable)"
      },
      {
        name: "JPMorgan Market Risk Sentiment",
        url: "https://www.jpmorgan.com/insights/research/market-outlook",
        reading: "Cautiously Optimistic",
        content: "JPMorgan sees balanced risks to the market with potential for volatility around upcoming economic data.",
        lastUpdated: yesterday,
        source: "Mock Data (Perplexity API unavailable)"
      },
      {
        name: "Morgan Stanley Risk Indicator",
        url: "https://www.morganstanley.com/ideas/thoughts-on-the-market",
        reading: "Elevated Risk",
        content: "Morgan Stanley's risk indicator suggests elevated market risk with valuations stretched in key sectors.",
        lastUpdated: yesterday,
        source: "Mock Data (Perplexity API unavailable)"
      },
      {
        name: "Credit Suisse Risk Appetite Index",
        url: "https://www.credit-suisse.com/about-us/en/reports-research/studies-publications.html",
        reading: "Neutral",
        content: "Credit Suisse risk appetite index in neutral territory, suggesting balanced positioning among institutional investors.",
        lastUpdated: yesterday,
        source: "Mock Data (Perplexity API unavailable)"
      }
    ]
  };
}

/**
 * Tests the market sentiment data retrieval
 */
function testMarketSentiment() {
  try {
    Logger.log("Testing market sentiment data retrieval...");
    const sentimentData = retrieveMarketSentiment();
    
    Logger.log("Market Sentiment Data:");
    Logger.log(JSON.stringify(sentimentData, null, 2));
    
    Logger.log(`Retrieved data for ${sentimentData.analysts.length} analysts and ${sentimentData.sentimentIndicators.length} sentiment indicators.`);
    
    // Check data freshness
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
    
    Logger.log("Data Freshness Check:");
    
    sentimentData.analysts.forEach(analyst => {
      const age = now - analyst.lastUpdated;
      const daysOld = Math.round(age / oneDay);
      Logger.log(`${analyst.name}: ${daysOld} days old (${analyst.source})`);
    });
    
    sentimentData.sentimentIndicators.forEach(indicator => {
      const age = now - indicator.lastUpdated;
      const daysOld = Math.round(age / oneDay);
      Logger.log(`${indicator.name}: ${daysOld} days old (${indicator.source})`);
    });
    
    return sentimentData;
  } catch (error) {
    Logger.log(`Error in testMarketSentiment: ${error}`);
    return null;
  }
}
