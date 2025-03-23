/**
 * Configuration settings for the AI Trading Agent
 */

// Perplexity API configuration
const PERPLEXITY_API_KEY = "YOUR_PERPLEXITY_API_KEY"; // Replace with your actual API key or use PropertiesService
const PERPLEXITY_MODEL = "sonar-pro"; // Using Perplexity's latest model for web browsing
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

// Alpha Vantage API configuration
// Note: Free tier is limited to 25 API calls per day
// For production use, consider upgrading to a paid plan: https://www.alphavantage.co/premium/
const ALPHA_VANTAGE_API_KEY = ""; // Don't hardcode the key here, use Script Properties instead

// Email configuration
const EMAIL_SUBJECT_PREFIX = "[AI Trading Decision] "; // Prefix for email subject
//const RECIPIENT_EMAILS = ["fvillavicencio@gmail.com", "zitro123@yahoo.com"]; // Array of recipient email addresses
const RECIPIENT_EMAILS = ["fvillavicencio@gmail.com"]; // Array of recipient email addresses

// Schedule configuration
const MORNING_SCHEDULE_HOUR = 8;
const MORNING_SCHEDULE_MINUTE = 50;
const EVENING_SCHEDULE_HOUR = 18;
const EVENING_SCHEDULE_MINUTE = 0;

// Time zone for scheduling
const TIME_ZONE = "America/New_York";

/**
 * Shared data cache for the application
 * Used to store data that is shared between modules to avoid duplicate API calls
 */
const DATA_CACHE = {
  treasuryYields: null,
  lastTreasuryYieldsFetch: null,
  treasuryYieldsCacheExpiry: 60 * 60 * 1000, // 1 hour in milliseconds
  
  // Method to store treasury yields in the cache
  storeTreasuryYields: function(yields) {
    this.treasuryYields = yields;
    this.lastTreasuryYieldsFetch = new Date().getTime();
  },
  
  // Method to get treasury yields from the cache
  getTreasuryYields: function() {
    const currentTime = new Date().getTime();
    if (this.treasuryYields && this.lastTreasuryYieldsFetch && 
        (currentTime - this.lastTreasuryYieldsFetch < this.treasuryYieldsCacheExpiry)) {
      return this.treasuryYields;
    }
    return null;
  },
  
  // Method to check if treasury yields cache is valid
  isTreasuryYieldsCacheValid: function() {
    const currentTime = new Date().getTime();
    return this.treasuryYields && this.lastTreasuryYieldsFetch && 
           (currentTime - this.lastTreasuryYieldsFetch < this.treasuryYieldsCacheExpiry);
  },
  
  // Method to clear the cache
  clearCache: function() {
    this.treasuryYields = null;
    this.lastTreasuryYieldsFetch = null;
  }
};

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
