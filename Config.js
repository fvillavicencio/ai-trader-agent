/**
 * Configuration settings for the AI Trading Agent
 */

// Perplexity API configuration
const PERPLEXITY_API_KEY = ""; // Don't hardcode the key here, use Script Properties instead
const PERPLEXITY_MODEL = "sonar-pro"; // Using Perplexity's latest model for web browsing
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

// AI Provider configuration
const MACROECONOMIC_AI_PROVIDER = "openai"; // Options: "openai" or "perplexity"

// Alpha Vantage API configuration
// Note: Free tier is limited to 25 API calls per day
// For production use, consider upgrading to a paid plan: https://www.alphavantage.co/premium/
const ALPHA_VANTAGE_API_KEY = ""; // Don't hardcode the key here, use Script Properties instead

//newsletter name
const NEWSLETTER_NAME = "Market Pulse Daily";


// Email configuration
const EMAIL_SUBJECT_PREFIX = NEWSLETTER_NAME || "[Market Pulse Daily] "; // Prefix for email subject
const RECIPIENT_EMAILS = ["fvillavicencio@gmail.com", "zitro123@yahoo.com"]; // Array of recipient email addresses
//const RECIPIENT_EMAILS = ["fvillavicencio@gmail.com"]; // Array of recipient email addresses

// Dedicated email address for prompt and error emails
const PROMPT_ERROR_EMAIL = "fvillavicencio+AI_trading_agent@gmail.com";
const TEST_EMAIL = "fvillavicencio@gmail.com";


// Schedule configuration
const MORNING_SCHEDULE_HOUR = 8;
const MORNING_SCHEDULE_MINUTE = 50;
const EVENING_SCHEDULE_HOUR = 18;
const EVENING_SCHEDULE_MINUTE = 0;

// Time zone for scheduling
const TIME_ZONE = "America/New_York";

/**
 * Gets the Perplexity API key from script properties if not hardcoded
 * For better security, use PropertiesService instead of hardcoding the API key
 */
function getPerplexityApiKey() {
  try {
    // Try to get the API key from script properties first
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('PERPLEXITY_API_KEY');
    
    // If found in script properties, return it
    if (apiKey) {
      return apiKey;
    }
    
    // Otherwise, return the hardcoded key (not recommended for production)
    return PERPLEXITY_API_KEY;
  } catch (error) {
    Logger.log("Error getting API key: " + error.message);
    return PERPLEXITY_API_KEY;
  }
}

/**
 * Gets the Alpha Vantage API key from script properties if not hardcoded
 * For better security, use PropertiesService instead of hardcoding the API key
 * 
 * @return {String} - Alpha Vantage API key
 */
function getAlphaVantageApiKey() {
  try {
    // Try to get the API key from script properties first
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('ALPHA_VANTAGE_API_KEY');
    
    // If found in script properties, return it
    if (apiKey) {
      return apiKey;
    }
    
    // Otherwise, return the hardcoded key (not recommended for production)
    return ALPHA_VANTAGE_API_KEY;
  } catch (error) {
    Logger.log("Error getting Alpha Vantage API key: " + error.message);
    return ALPHA_VANTAGE_API_KEY;
  }
}

/**
 * Gets the OpenAI API key from script properties
 * 
 * @return {String} - OpenAI API key
 */
function getOpenAIApiKey() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    return scriptProperties.getProperty('OPENAI_API_KEY');
  } catch (error) {
    Logger.log("Error getting OpenAI API key: " + error.message);
    return null;
  }
}

/**
 * Gets the Yahoo Finance API key from script properties
 * 
 * @return {String} - Yahoo Finance API key
 */
function getYahooFinanceApiKey() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    return scriptProperties.getProperty('YAHOO_FINANCE_API_KEY');
  } catch (error) {
    Logger.log("Error getting Yahoo Finance API key: " + error.message);
    return null;
  }
}

/**
 * Gets the BLS API key from script properties
 * 
 * @return {String} - BLS API key
 */
function getBLSApiKey() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    return scriptProperties.getProperty('BLS_API_KEY');
  } catch (error) {
    Logger.log("Error getting BLS API key: " + error.message);
    return null;
  }
}

/**
 * Gets the BEA API key from script properties
 * 
 * @return {String} - BEA API key
 */
function getBEAApiKey() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    return scriptProperties.getProperty('BEA_API_KEY');
  } catch (error) {
    Logger.log("Error getting BEA API key: " + error.message);
    return null;
  }
}

/**
 * Gets the FRED API key from script properties
 * 
 * @return {String} - FRED API key
 */
function getFREDApiKey() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    return scriptProperties.getProperty('FRED_API_KEY');
  } catch (error) {
    Logger.log("Error getting FRED API key: " + error.message);
    return null;
  }
}

/**
 * Gets the configured AI provider for macroeconomic factors data retrieval
 * Checks script properties first, then falls back to the constant
 * 
 * @return {String} - AI provider ("openai" or "perplexity")
 */
function getMacroeconomicAIProvider() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const provider = scriptProperties.getProperty('MACROECONOMIC_AI_PROVIDER');
    
    // If found in script properties, return it
    if (provider && (provider === "openai" || provider === "perplexity")) {
      return provider;
    }
    
    // Otherwise, return the hardcoded value
    return MACROECONOMIC_AI_PROVIDER;
  } catch (error) {
    Logger.log("Error getting macroeconomic AI provider: " + error.message);
    return MACROECONOMIC_AI_PROVIDER;
  }
}

/**
 * Gets the email recipients from script properties if not hardcoded
 * 
 * @return {Array} - Array of email addresses
 */
function getEmailRecipients() {
  try {
    // Try to get the recipients from script properties first
    const scriptProperties = PropertiesService.getScriptProperties();
    const recipientsProperty = scriptProperties.getProperty('EMAIL_RECIPIENTS');
    
    // If found in script properties, parse the comma-separated string into an array
    if (recipientsProperty) {
      return recipientsProperty.split(',').map(email => email.trim());
    }
    
    // Otherwise, return the hardcoded array (not recommended for production)
    return RECIPIENT_EMAILS;
  } catch (error) {
    Logger.log("Error getting email recipients: " + error.message);
    return RECIPIENT_EMAILS;
  }
}

/**
 * Tests all API keys and their functionality
 * Run this function to verify that all API keys are properly set up and working
 */
function testAllAPIKeys() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const results = {
    apiKeys: {},
    testResults: {}
  };
  
  // List of all API keys used in the application
  const apiKeys = [
    "PERPLEXITY_API_KEY",
    "OPENAI_API_KEY",
    "ALPHA_VANTAGE_API_KEY",
    "BLS_API_KEY",
    "BEA_API_KEY",
    "FRED_API_KEY",
    "YAHOO_FINANCE_API_KEY"
  ];
  
  // Check if each API key is set
  Logger.log("=== API KEYS STATUS ===");
  apiKeys.forEach(key => {
    const value = scriptProperties.getProperty(key);
    const status = value ? " Found" : " Not found";
    results.apiKeys[key] = !!value;
    Logger.log(`${key}: ${status}`);
  });
  
  // Test Perplexity API
  Logger.log("\n=== TESTING PERPLEXITY API ===");
  try {
    const perplexityKey = scriptProperties.getProperty("PERPLEXITY_API_KEY");
    if (perplexityKey) {
      const testResult = testPerplexityAPI(perplexityKey);
      results.testResults.perplexity = testResult;
      Logger.log(`Perplexity API: ${testResult.success ? " Working" : " Failed"}`);
      if (!testResult.success) {
        Logger.log(`Error: ${testResult.error}`);
      }
    } else {
      Logger.log("Perplexity API:  Key not found");
      results.testResults.perplexity = { success: false, error: "API key not found" };
    }
  } catch (error) {
    Logger.log(`Perplexity API:  Error - ${error}`);
    results.testResults.perplexity = { success: false, error: error.toString() };
  }
  
  // Test OpenAI API
  Logger.log("\n=== TESTING OPENAI API ===");
  try {
    const openaiKey = scriptProperties.getProperty("OPENAI_API_KEY");
    if (openaiKey) {
      const testResult = testOpenAIAPI(openaiKey);
      results.testResults.openai = testResult;
      Logger.log(`OpenAI API: ${testResult.success ? " Working" : " Failed"}`);
      if (!testResult.success) {
        Logger.log(`Error: ${testResult.error}`);
      }
    } else {
      Logger.log("OpenAI API:  Key not found");
      results.testResults.openai = { success: false, error: "API key not found" };
    }
  } catch (error) {
    Logger.log(`OpenAI API:  Error - ${error}`);
    results.testResults.openai = { success: false, error: error.toString() };
  }
  
  // Test Alpha Vantage API
  Logger.log("\n=== TESTING ALPHA VANTAGE API ===");
  try {
    const alphaVantageKey = scriptProperties.getProperty("ALPHA_VANTAGE_API_KEY");
    if (alphaVantageKey) {
      const testResult = testAlphaVantageAPI(alphaVantageKey);
      results.testResults.alphaVantage = testResult;
      Logger.log(`Alpha Vantage API: ${testResult.success ? " Working" : " Failed"}`);
      if (!testResult.success) {
        Logger.log(`Error: ${testResult.error}`);
      }
    } else {
      Logger.log("Alpha Vantage API:  Key not found");
      results.testResults.alphaVantage = { success: false, error: "API key not found" };
    }
  } catch (error) {
    Logger.log(`Alpha Vantage API:  Error - ${error}`);
    results.testResults.alphaVantage = { success: false, error: error.toString() };
  }
  
  // Test Yahoo Finance API
  Logger.log("\n=== TESTING YAHOO FINANCE API ===");
  try {
    const yahooFinanceKey = scriptProperties.getProperty("YAHOO_FINANCE_API_KEY");
    if (yahooFinanceKey) {
      const testResult = testYahooFinanceAPI(yahooFinanceKey);
      results.testResults.yahooFinance = testResult;
      Logger.log(`Yahoo Finance API: ${testResult.success ? " Working" : " Failed"}`);
      if (!testResult.success) {
        Logger.log(`Error: ${testResult.error}`);
      }
    } else {
      Logger.log("Yahoo Finance API:  Key not found");
      results.testResults.yahooFinance = { success: false, error: "API key not found" };
    }
  } catch (error) {
    Logger.log(`Yahoo Finance API:  Error - ${error}`);
    results.testResults.yahooFinance = { success: false, error: error.toString() };
  }
  
  // Test BLS API
  Logger.log("\n=== TESTING BLS API ===");
  try {
    const blsKey = scriptProperties.getProperty("BLS_API_KEY");
    if (blsKey) {
      const testResult = testBLSAPI(blsKey);
      results.testResults.bls = testResult;
      Logger.log(`BLS API: ${testResult.success ? " Working" : " Failed"}`);
      if (!testResult.success) {
        Logger.log(`Error: ${testResult.error}`);
      }
    } else {
      Logger.log("BLS API:  Key not found");
      results.testResults.bls = { success: false, error: "API key not found" };
    }
  } catch (error) {
    Logger.log(`BLS API:  Error - ${error}`);
    results.testResults.bls = { success: false, error: error.toString() };
  }
  
  // Test BEA API
  Logger.log("\n=== TESTING BEA API ===");
  try {
    const beaKey = scriptProperties.getProperty("BEA_API_KEY");
    if (beaKey) {
      const testResult = testBEAAPI(beaKey);
      results.testResults.bea = testResult;
      Logger.log(`BEA API: ${testResult.success ? " Working" : " Failed"}`);
      if (!testResult.success) {
        Logger.log(`Error: ${testResult.error}`);
      }
    } else {
      Logger.log("BEA API:  Key not found");
      results.testResults.bea = { success: false, error: "API key not found" };
    }
  } catch (error) {
    Logger.log(`BEA API:  Error - ${error}`);
    results.testResults.bea = { success: false, error: error.toString() };
  }
  
  // Test FRED API
  Logger.log("\n=== TESTING FRED API ===");
  try {
    const fredKey = scriptProperties.getProperty("FRED_API_KEY");
    if (fredKey) {
      const testResult = testFREDAPI(fredKey);
      results.testResults.fred = testResult;
      Logger.log(`FRED API: ${testResult.success ? " Working" : " Failed"}`);
      if (!testResult.success) {
        Logger.log(`Error: ${testResult.error}`);
      }
    } else {
      Logger.log("FRED API:  Key not found");
      results.testResults.fred = { success: false, error: "API key not found" };
    }
  } catch (error) {
    Logger.log(`FRED API:  Error - ${error}`);
    results.testResults.fred = { success: false, error: error.toString() };
  }
  
  // Summary
  Logger.log("\n=== SUMMARY ===");
  let workingCount = 0;
  let totalTestedCount = 0;
  
  for (const key in results.testResults) {
    if (results.testResults[key].success) {
      workingCount++;
    }
    totalTestedCount++;
  }
  
  Logger.log(`${workingCount} out of ${totalTestedCount} APIs are working properly.`);
  
  return results;
}

/**
 * Tests the Perplexity API with a simple query
 * @param {string} apiKey - The Perplexity API key
 * @return {Object} Test result with success status and error message if applicable
 */
function testPerplexityAPI(apiKey) {
  try {
    const apiUrl = "https://api.perplexity.ai/chat/completions";
    
    const requestData = {
      model: "sonar-small-chat",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: "Hello, this is a test query. Please respond with 'API test successful'."
        }
      ],
      temperature: 0.1,
      max_tokens: 20
    };
    
    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      },
      payload: JSON.stringify(requestData),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      return { success: true };
    } else {
      const responseText = response.getContentText();
      return { success: false, error: `API returned status code ${responseCode}: ${responseText}` };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Tests the OpenAI API with a simple query
 * @param {string} apiKey - The OpenAI API key
 * @return {Object} Test result with success status and error message if applicable
 */
function testOpenAIAPI(apiKey) {
  try {
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    
    const requestData = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: "Hello, this is a test query. Please respond with 'API test successful'."
        }
      ],
      temperature: 0.1,
      max_tokens: 20
    };
    
    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      },
      payload: JSON.stringify(requestData),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      return { success: true };
    } else {
      const responseText = response.getContentText();
      return { success: false, error: `API returned status code ${responseCode}: ${responseText}` };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Tests the Alpha Vantage API with a simple query
 * @param {string} apiKey - The Alpha Vantage API key
 * @return {Object} Test result with success status and error message if applicable
 */
function testAlphaVantageAPI(apiKey) {
  try {
    // Alpha Vantage API endpoint for a simple query (company overview for AAPL)
    const apiUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=AAPL&apikey=${apiKey}`;
    
    const options = {
      method: "get",
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      const responseData = JSON.parse(response.getContentText());
      
      // Check if the response contains an error message about API key
      if (responseData.hasOwnProperty("Error Message") && responseData["Error Message"].includes("apikey")) {
        return { success: false, error: responseData["Error Message"] };
      }
      
      // Check if the response contains the expected data
      if (responseData.hasOwnProperty("Symbol") && responseData["Symbol"] === "AAPL") {
        return { success: true };
      } else {
        return { success: false, error: "API response did not contain expected data" };
      }
    } else {
      const responseText = response.getContentText();
      return { success: false, error: `API returned status code ${responseCode}: ${responseText}` };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Tests the Yahoo Finance API with a simple query
 * @param {string} apiKey - Optional Yahoo Finance API key (if not provided, will use the stored key)
 * @return {Object} Test result with success status and error message if applicable
 */
function testYahooFinanceAPI(apiKey) {
  try {
    // Use the provided API key or get it from script properties
    const apiKeyToUse = apiKey || getYahooFinanceApiKey();
    
    if (!apiKeyToUse) {
      return { success: false, error: "No API key provided or found in script properties" };
    }
    
    // Yahoo Finance API endpoint for a simple query (quote for AAPL)
    const apiUrl = "https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes?region=US&symbols=AAPL";
    
    const options = {
      method: "get",
      headers: {
        "X-RapidAPI-Key": apiKeyToUse,
        "X-RapidAPI-Host": "apidojo-yahoo-finance-v1.p.rapidapi.com"
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      const responseData = JSON.parse(response.getContentText());
      
      // Check if the response contains the expected data
      if (responseData.quoteResponse && 
          responseData.quoteResponse.result && 
          responseData.quoteResponse.result.length > 0 &&
          responseData.quoteResponse.result[0].symbol === "AAPL") {
        return { success: true };
      } else {
        return { success: false, error: "API response did not contain expected data" };
      }
    } else {
      const responseText = response.getContentText();
      return { success: false, error: `API returned status code ${responseCode}: ${responseText}` };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Tests the BLS API with a simple query
 * @param {string} apiKey - The BLS API key
 * @return {Object} Test result with success status and error message if applicable
 */
function testBLSAPI(apiKey) {
  try {
    // BLS API endpoint
    const apiUrl = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
    
    // Request parameters for CPI data
    const requestData = {
      "seriesid": ["CUUR0000SA0"],
      "startyear": new Date().getFullYear() - 1,
      "endyear": new Date().getFullYear(),
      "registrationkey": apiKey
    };
    
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(requestData),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      const responseData = JSON.parse(response.getContentText());
      
      // Check if the response contains a success status
      if (responseData.status === "REQUEST_SUCCEEDED") {
        return { success: true };
      } else {
        return { success: false, error: responseData.message || "Unknown error" };
      }
    } else {
      const responseText = response.getContentText();
      return { success: false, error: `API returned status code ${responseCode}: ${responseText}` };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Tests the BEA API with a simple query
 * @param {string} apiKey - The BEA API key
 * @return {Object} Test result with success status and error message if applicable
 */
function testBEAAPI(apiKey) {
  try {
    // BEA API endpoint
    const apiUrl = "https://apps.bea.gov/api/data";
    
    // Request parameters for GDP data
    const params = {
      "UserID": apiKey,
      "method": "GetData",
      "datasetname": "NIPA",
      "TableName": "T20804",
      "Frequency": "Q",
      "Year": new Date().getFullYear() - 1,
      "Quarter": "Q1,Q2,Q3,Q4",
      "ResultFormat": "JSON"
    };
    
    // Construct the URL with query parameters
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join("&");
    
    const fullUrl = `${apiUrl}?${queryString}`;
    
    const options = {
      method: "get",
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(fullUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      const responseData = JSON.parse(response.getContentText());
      
      // Check if the response contains a success status
      if (responseData.BEAAPI.Results) {
        return { success: true };
      } else if (responseData.BEAAPI.Error) {
        return { success: false, error: responseData.BEAAPI.Error.ErrorDetail.Description };
      } else {
        return { success: false, error: "Unknown error in BEA API response" };
      }
    } else {
      const responseText = response.getContentText();
      return { success: false, error: `API returned status code ${responseCode}: ${responseText}` };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Tests the FRED API with a simple query
 * @param {string} apiKey - The FRED API key
 * @return {Object} Test result with success status and error message if applicable
 */
function testFREDAPI(apiKey) {
  try {
    // FRED API endpoint for GDP data
    const apiUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=${apiKey}&file_type=json&limit=1`;
    
    const options = {
      method: "get",
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      const responseData = JSON.parse(response.getContentText());
      
      // Check if the response contains the expected data
      if (responseData.observations && responseData.observations.length > 0) {
        return { success: true };
      } else {
        return { success: false, error: "API response did not contain expected data" };
      }
    } else {
      const responseText = response.getContentText();
      return { success: false, error: `API returned status code ${responseCode}: ${responseText}` };
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
