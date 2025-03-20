/**
 * Configuration settings for the AI Trading Agent
 */

// Perplexity API configuration
const PERPLEXITY_API_KEY = "YOUR_PERPLEXITY_API_KEY"; // Replace with your actual API key or use PropertiesService
const PERPLEXITY_MODEL = "sonar-pro"; // Using Perplexity's latest model for web browsing
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

// Email configuration
const EMAIL_SUBJECT_PREFIX = "[AI Trading Decision] "; // Prefix for email subject
const RECIPIENT_EMAILS = ["fvillavicencio@gmail.com", "fjv@cubicc.com"]; // Array of recipient email addresses

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
