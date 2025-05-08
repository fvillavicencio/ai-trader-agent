/**
 * Sets up the required script properties for the Market Pulse Daily application
 * Run this function once to initialize all necessary script properties
 */
function setupScriptProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();
  
  // Set the admin email for debug and prompt emails
  scriptProperties.setProperty('ADMIN_EMAIL', 'fvillavicencio@gmail.com');
  
  // Set debug mode (true/false)
  scriptProperties.setProperty('DEBUG_MODE', 'true');
  
  // Set whether to send prompt emails
  scriptProperties.setProperty('SEND_PROMPT_EMAILS', 'true');
  
  // Set the newsletter name
  scriptProperties.setProperty('NEWSLETTER_NAME', 'Market Pulse Daily');
  
  // Set the time zone
  scriptProperties.setProperty('TIME_ZONE', 'America/New_York');
  
  // Log the current script properties
  const allProperties = scriptProperties.getProperties();
  Logger.log('Script properties set up successfully:');
  for (const key in allProperties) {
    // Don't log API keys for security
    if (key.includes('API_KEY')) {
      Logger.log(`${key}: [REDACTED]`);
    } else {
      Logger.log(`${key}: ${allProperties[key]}`);
    }
  }
  
  return 'Script properties set up successfully';
}

/**
 * Gets all script properties (for debugging)
 */
function getScriptProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const allProperties = scriptProperties.getProperties();
  
  Logger.log('Current script properties:');
  for (const key in allProperties) {
    // Don't log API keys for security
    if (key.includes('API_KEY')) {
      Logger.log(`${key}: [REDACTED]`);
    } else {
      Logger.log(`${key}: ${allProperties[key]}`);
    }
  }
  
  return allProperties;
}
