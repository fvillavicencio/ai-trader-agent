/**
 * Google Apps Script for Market Pulse Daily
 * Retrieves geopolitical risk data from Google Cloud Function
 */

/**
 * Gets the latest geopolitical risk analysis
 * @returns {Object} The geopolitical risk data
 */
function getGeopoliticalRisks() {
  // Replace with your actual deployed function URL
  const apiUrl = "https://us-central1-ai-trader-agent.cloudfunctions.net/geopoliticalRiskAPI";
  
  try {
    // Fetch the data from the API
    const response = UrlFetchApp.fetch(apiUrl, {
      muteHttpExceptions: true,
      validateHttpsCertificates: true,
      followRedirects: true
    });
    
    // Check if the request was successful
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      
      // Log the timestamp for debugging
      if (data._metadata && data._metadata.lastUpdated) {
        console.log(`Retrieved geopolitical risk data last updated at: ${data._metadata.lastUpdated}`);
      }
      
      // Remove metadata before returning
      delete data._metadata;
      return data;
    } else {
      // Handle error response
      console.error(`API returned error code: ${response.getResponseCode()}`);
      return getFallbackGeopoliticalRisks();
    }
  } catch (error) {
    // Handle exceptions
    console.error(`Error retrieving geopolitical risks: ${error.toString()}`);
    return getFallbackGeopoliticalRisks();
  }
}

/**
 * Provides fallback geopolitical risk data in case the API is unavailable
 * @returns {Object} Hardcoded geopolitical risk data
 */
function getFallbackGeopoliticalRisks() {
  return {
    "globalOverview": "The global geopolitical landscape continues to be dominated by major power competition, regional conflicts, and economic tensions. The United States and China remain locked in strategic competition across multiple domains including technology, trade, and military influence. Russia's ongoing conflict with Ukraine continues to impact European security and global energy markets. In the Middle East, tensions persist with multiple flashpoints involving Iran, Israel, and various regional powers.",
    "risks": [
      {
        "name": "US-China Tensions",
        "description": "The strategic competition between the United States and China continues to intensify across multiple domains including technology, trade, and security.",
        "regions": ["North America", "Asia Pacific", "Global"],
        "impact": "High",
        "source": {
          "name": "Reuters",
          "url": "https://www.reuters.com/world/china/china-says-it-will-take-necessary-measures-if-us-insists-confrontation-2023-11-10/"
        }
      },
      {
        "name": "Russia-Ukraine Conflict",
        "description": "The ongoing military conflict between Russia and Ukraine continues to have significant implications for global security and economic stability.",
        "regions": ["Europe", "Eurasia", "Global"],
        "impact": "High",
        "source": {
          "name": "Bloomberg",
          "url": "https://www.bloomberg.com/news/articles/2023-10-04/russia-s-war-in-ukraine-latest-news-and-updates-for-oct-4"
        }
      },
      {
        "name": "Middle East Tensions",
        "description": "The Middle East remains a critical geopolitical flashpoint with multiple overlapping conflicts and tensions.",
        "regions": ["Middle East", "North Africa", "Global"],
        "impact": "Medium",
        "source": {
          "name": "Financial Times",
          "url": "https://www.ft.com/content/6e9a9b47-6bde-4f3e-98f4-0ad6f2f9a74b"
        }
      }
    ]
  };
}

/**
 * Manually triggers a refresh of the geopolitical risk data
 * @returns {Object} Status of the refresh operation
 */
function refreshGeopoliticalRisks() {
  // Replace with your actual deployed function URL
  const generatorUrl = "https://us-central1-ai-trader-agent.cloudfunctions.net/geopoliticalRiskGenerator";
  
  try {
    // Trigger the generator function
    const response = UrlFetchApp.fetch(generatorUrl, {
      muteHttpExceptions: true,
      validateHttpsCertificates: true,
      followRedirects: true
    });
    
    // Return the response
    return JSON.parse(response.getContentText());
  } catch (error) {
    console.error(`Error refreshing geopolitical risks: ${error.toString()}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}
