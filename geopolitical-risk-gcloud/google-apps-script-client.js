/**
 * Market Pulse Daily - Geopolitical Risk Analysis Client
 * Google Apps Script integration for Geopolitical Risk Analysis API
 * Works with both AWS Lambda and Google Cloud Function endpoints
 */

// Configuration for the geopolitical risk analysis client
const CONFIG = {
  // Primary endpoint (AWS Lambda)
  PRIMARY_ENDPOINT: "https://jkoaa9d2yi.execute-api.us-east-2.amazonaws.com/prod/geopolitical-risks",
  
  // Backup endpoint (Google Cloud Function)
  BACKUP_ENDPOINT: "https://us-central1-geopolitical-risk-analysis.cloudfunctions.net/geopoliticalRiskAPI",
  
  // Set to false to use AWS Lambda as primary, true to use Google Cloud as primary
  USE_BACKUP_FIRST: false,
  
  // API Key for Google Cloud Function endpoint
  API_KEY: "your_api_key_here",
  
  // Enable logging for debugging
  ENABLE_LOGGING: true
};

/**
 * Fetches geopolitical risk data from the configured API endpoints
 * @return {Object} Geopolitical risk analysis with global overview and risks
 */
function getGeopoliticalRisks() {
  // Determine which endpoint to try first based on configuration
  const endpoints = CONFIG.USE_BACKUP_FIRST ? 
    [CONFIG.BACKUP_ENDPOINT, CONFIG.PRIMARY_ENDPOINT] : 
    [CONFIG.PRIMARY_ENDPOINT, CONFIG.BACKUP_ENDPOINT];
  
  // Try endpoints in sequence
  for (let i = 0; i < endpoints.length; i++) {
    try {
      const endpoint = endpoints[i];
      if (CONFIG.ENABLE_LOGGING) {
        console.log(`Attempting to fetch geopolitical risks from: ${endpoint}`);
      }
      
      // Prepare request options
      const options = {
        muteHttpExceptions: true,
        timeout: 30 // 30 seconds timeout
      };
      
      // Add API key for Google Cloud Function endpoint
      if (endpoint === CONFIG.BACKUP_ENDPOINT && CONFIG.API_KEY) {
        options.headers = {
          'X-API-Key': CONFIG.API_KEY
        };
      }
      
      const response = UrlFetchApp.fetch(endpoint, options);
      
      // Check if the response was successful
      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        
        if (CONFIG.ENABLE_LOGGING) {
          console.log("Successfully retrieved geopolitical risks data");
        }
        
        // Handle different response formats between AWS Lambda and Google Cloud
        if (data.macroeconomicFactors && data.macroeconomicFactors.geopoliticalRisks) {
          // Google Cloud format
          return data.macroeconomicFactors.geopoliticalRisks;
        } else {
          // AWS Lambda format or direct format
          return data;
        }
      } else if (CONFIG.ENABLE_LOGGING) {
        console.log(`Endpoint ${endpoint} returned status code: ${response.getResponseCode()}`);
      }
    } catch (error) {
      if (CONFIG.ENABLE_LOGGING) {
        console.error(`Error fetching from ${endpoints[i]}: ${error}`);
      }
      // Continue to next endpoint
    }
  }
  
  // If all endpoints fail, return fallback data
  console.error("All endpoints failed. Using fallback data.");
  return getFallbackGeopoliticalRisks();
}

/**
 * Manually triggers a refresh of the geopolitical risk data
 * @return {Object} Status of the refresh operation
 */
function refreshGeopoliticalRisks() {
  try {
    // Use the API endpoint with refresh operation
    const endpoint = CONFIG.USE_BACKUP_FIRST ? CONFIG.BACKUP_ENDPOINT : CONFIG.PRIMARY_ENDPOINT;
    
    const response = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ operation: 'refresh' }),
      muteHttpExceptions: true
    });
    const result = JSON.parse(response.getContentText());
    
    // Log the refresh operation
    console.log("Geopolitical risks data refresh triggered");
    
    return {
      success: true,
      message: "Geopolitical risk analysis refresh triggered successfully",
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error refreshing geopolitical risks: " + error);
    return { 
      success: false, 
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Provides fallback geopolitical risk data in case the API is unavailable
 * This ensures URLs always display correctly in the output
 * @return {Object} Hardcoded geopolitical risk data
 */
function getFallbackGeopoliticalRisks() {
  return {
    "globalOverview": "The global geopolitical landscape continues to be dominated by major power competition, regional conflicts, and economic tensions. The United States and China remain locked in strategic competition across multiple domains including technology, trade, and military influence. Russia's ongoing conflict with Ukraine continues to impact European security and global energy markets. In the Middle East, tensions persist with multiple flashpoints involving Iran, Israel, and various regional powers. These conflicts are occurring against a backdrop of economic uncertainty, with inflation concerns, supply chain disruptions, and monetary policy divergence creating additional market volatility. Climate change is increasingly recognized as a geopolitical risk multiplier, exacerbating resource competition and migration pressures.",
    "risks": [
      {
        "name": "US-China Tensions",
        "description": "The strategic competition between the United States and China continues to intensify across multiple domains including technology, trade, and security. Recent developments have seen increased restrictions on semiconductor technology transfers, expanded tariffs, and growing military posturing in the South China Sea and around Taiwan. The technological decoupling is accelerating, with both nations implementing policies to reduce dependencies on each other in critical supply chains. This 'great power competition' is forcing many countries to carefully balance their relationships with both superpowers, creating new alliance dynamics and economic blocs. The competition extends to global infrastructure development, with China's Belt and Road Initiative being countered by Western alternatives like the Partnership for Global Infrastructure and Investment. These tensions create significant uncertainty for multinational corporations operating in both markets and complicate global trade and investment flows.",
        "regions": ["North America", "Asia Pacific", "Global"],
        "impact": "High",
        "source": {
          "name": "Reuters",
          "url": "https://www.reuters.com/world/china/china-says-it-will-take-necessary-measures-if-us-insists-confrontation-2023-11-10/"
        }
      },
      {
        "name": "Russia-Ukraine Conflict",
        "description": "The ongoing military conflict between Russia and Ukraine continues to have significant implications for global security and economic stability. The conflict has evolved into a protracted war of attrition with shifting frontlines and periodic escalations. Western nations maintain substantial military and financial support for Ukraine, while Russia has deepened its economic and military ties with countries like China, Iran, and North Korea to circumvent sanctions. Energy markets have adapted somewhat to the disruption of Russian supplies to Europe, but vulnerabilities remain, particularly during peak demand periods. The conflict has accelerated Europe's energy transition away from Russian fossil fuels and toward renewable alternatives and diversified suppliers. Agricultural exports from the region have been partially restored but remain vulnerable to disruption, affecting global food security, particularly in developing nations dependent on grain imports. The conflict continues to strain NATO cohesion and has prompted significant increases in defense spending across Europe.",
        "regions": ["Europe", "Eurasia", "Global"],
        "impact": "High",
        "source": {
          "name": "Bloomberg",
          "url": "https://www.bloomberg.com/news/articles/2023-10-04/russia-s-war-in-ukraine-latest-news-and-updates-for-oct-4"
        }
      },
      {
        "name": "Middle East Tensions",
        "description": "The Middle East remains a critical geopolitical flashpoint with multiple overlapping conflicts and tensions. The situation involves complex dynamics between Iran, Israel, Saudi Arabia, and various non-state actors across the region. Recent escalations have raised concerns about a wider regional conflict that could significantly disrupt oil supplies and global shipping routes. Iran's nuclear program continues to be a source of international concern, with negotiations stalled and enrichment activities advancing. The Abraham Accords have created new regional alignments, with potential for both increased stability and new tensions as traditional adversaries form pragmatic partnerships. Maritime security in the Persian Gulf and Red Sea has been threatened by attacks on commercial shipping, affecting global supply chains. Oil production decisions by major regional producers continue to influence global energy markets and inflation outlooks. The region's persistent instability affects global energy security, refugee flows, and counterterrorism efforts.",
        "regions": ["Middle East", "North Africa", "Global"],
        "impact": "Medium",
        "source": {
          "name": "Financial Times",
          "url": "https://www.ft.com/content/6e9a9b47-6bde-4f3e-98f4-0ad6f2f9a74b"
        }
      },
      {
        "name": "Global Inflation and Monetary Policy Divergence",
        "description": "Central banks worldwide are navigating complex monetary policy decisions as inflation pressures persist in some regions while receding in others. This divergence in monetary policy approaches between major economies is creating significant currency volatility and capital flow disruptions. The Federal Reserve's policy decisions continue to have outsized effects on global markets, with emerging economies particularly vulnerable to sudden capital outflows when U.S. rates rise. Meanwhile, structural factors including aging demographics, technological disruption, and climate transition costs are creating new inflation dynamics that challenge traditional monetary policy frameworks. Supply chain reconfigurations toward resilience rather than efficiency are creating persistent upward price pressures in certain sectors. These monetary policy challenges are occurring against a backdrop of elevated government debt levels, raising concerns about fiscal sustainability in some economies and limiting policy flexibility during future crises.",
        "regions": ["Global", "Emerging Markets", "Advanced Economies"],
        "impact": "Medium",
        "source": {
          "name": "The Economist",
          "url": "https://www.economist.com/finance-and-economics/2023/09/21/the-fed-signals-higher-rates-for-longer"
        }
      },
      {
        "name": "Climate Change and Resource Security",
        "description": "Climate change is increasingly recognized as a major geopolitical risk factor, affecting resource availability, migration patterns, and economic stability. Extreme weather events are becoming more frequent and severe, disrupting agricultural production, energy systems, and supply chains. Competition for critical resources, particularly water, is intensifying in regions already experiencing political tensions. The global energy transition is creating new dependencies on critical minerals essential for renewable technologies and battery production, shifting geopolitical leverage toward resource-rich nations. Climate policies themselves are becoming sources of international friction, with carbon border adjustment mechanisms raising concerns about trade protectionism. Climate-induced migration is expected to accelerate, potentially destabilizing receiving regions and creating new humanitarian challenges. Meanwhile, the Arctic is emerging as a new frontier for resource competition and strategic positioning as ice melt opens new shipping routes and access to previously inaccessible resources.",
        "regions": ["Global", "Developing Economies", "Arctic"],
        "impact": "High",
        "source": {
          "name": "Nature Climate Change",
          "url": "https://www.nature.com/articles/s41558-022-01426-1"
        }
      }
    ]
  };
}

/**
 * Formats geopolitical risks for inclusion in the Market Pulse Daily report
 * This function ensures URLs are properly displayed in the output
 * @param {Object} geopoliticalRisks - The geopolitical risks data
 * @return {String} Formatted markdown text for the report
 */
function formatGeopoliticalRisksForReport(geopoliticalRisks) {
  // Start with the global overview
  let formattedText = `## Geopolitical Risks\n\n${geopoliticalRisks.globalOverview}\n\n`;
  
  // Add each risk with proper formatting
  geopoliticalRisks.risks.forEach(risk => {
    formattedText += `### ${risk.name} (${risk.impact} Impact)\n\n`;
    formattedText += `${risk.description}\n\n`;
    formattedText += `**Affected Regions:** ${risk.regions.join(', ')}\n\n`;
    formattedText += `**Source:** [${risk.source.name}](${risk.source.url})\n\n`;
  });
  
  return formattedText;
}

/**
 * Test function that creates a Google Doc with the geopolitical risk data
 * This is useful for testing the integration without running the full Market Pulse Daily report
 */
function testGeopoliticalRisks() {
  const doc = DocumentApp.create('Geopolitical Risk Test');
  const body = doc.getBody();
  
  // Get the data
  const data = getGeopoliticalRisks();
  
  // Log the raw data for debugging
  if (CONFIG.ENABLE_LOGGING) {
    console.log('Raw geopolitical risk data:', JSON.stringify(data, null, 2));
  }
  
  // Add the overview
  body.appendParagraph('Global Overview').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(data.overview || 'No overview available');
  
  // Add the risks
  body.appendParagraph('Specific Risks').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  
  if (data.risks && data.risks.length > 0) {
    data.risks.forEach(risk => {
      body.appendParagraph(risk.name).setHeading(DocumentApp.ParagraphHeading.HEADING2);
      body.appendParagraph(`Region: ${risk.region || 'Global'}`);
      body.appendParagraph(`Impact: ${risk.impactLevel || 'Unknown'}`);
      body.appendParagraph(risk.description || 'No description available');
      
      // Add sources with URL verification
      if (risk.sources && risk.sources.length > 0) {
        body.appendParagraph('Sources:').setHeading(DocumentApp.ParagraphHeading.HEADING3);
        risk.sources.forEach(source => {
          const sourceName = source.name || 'Unknown Source';
          const sourceUrl = source.url || 'https://www.example.com';
          
          // Verify URL format
          const validUrl = sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://') ? 
            sourceUrl : 'https://' + sourceUrl;
          
          // Create a rich text string with hyperlink
          const paragraph = body.appendParagraph('');
          const text = paragraph.appendText(`${sourceName}: `);
          paragraph.appendText(validUrl).setLinkUrl(validUrl);
        });
      } else {
        body.appendParagraph('Sources: None provided');
      }
      
      body.appendParagraph(''); // Add spacing
    });
  } else {
    body.appendParagraph('No specific risks found.');
  }
  
  // Add metadata section
  body.appendParagraph('Metadata').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(`Last Updated: ${data.lastUpdated || new Date().toISOString()}`);
  body.appendParagraph(`Source: ${data.source || 'API'}`);
  body.appendParagraph(`Endpoint Used: ${CONFIG.USE_BACKUP_FIRST ? CONFIG.BACKUP_ENDPOINT : CONFIG.PRIMARY_ENDPOINT}`);
  
  // Log the URL of the document
  console.log(`Test document created: ${doc.getUrl()}`);
  
  return doc.getUrl();
}

/**
 * Advanced test function that verifies URL formatting in the geopolitical risk data
 * This function will highlight any issues with URL formatting in the output
 */
function testUrlFormatting() {
  const doc = DocumentApp.create('Geopolitical Risk URL Format Test');
  const body = doc.getBody();
  
  // Get the data
  const data = getGeopoliticalRisks();
  
  // Add header
  body.appendParagraph('URL Format Verification Test').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('This document tests the proper formatting of URLs in the geopolitical risk data.');
  
  // Test results summary
  let urlsChecked = 0;
  let urlsValid = 0;
  let urlsMissing = 0;
  
  // Check risks and their sources
  if (data.risks && data.risks.length > 0) {
    body.appendParagraph('Risk Source URL Check').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    
    data.risks.forEach((risk, index) => {
      const riskSection = body.appendParagraph(`Risk ${index + 1}: ${risk.name}`).setHeading(DocumentApp.ParagraphHeading.HEADING3);
      
      if (risk.sources && risk.sources.length > 0) {
        risk.sources.forEach((source, sourceIndex) => {
          urlsChecked++;
          
          const sourcePara = body.appendParagraph(`Source ${sourceIndex + 1}: ${source.name || 'Unnamed'}`);
          
          if (source.url) {
            const isValidUrl = source.url.startsWith('http://') || source.url.startsWith('https://');
            urlsValid += isValidUrl ? 1 : 0;
            
            const urlStatus = isValidUrl ? '✅ VALID' : '❌ INVALID FORMAT';
            sourcePara.appendText(` - ${urlStatus}`);
            sourcePara.appendText(`\nURL: ${source.url}`);
            
            if (!isValidUrl) {
              sourcePara.setBackgroundColor('#FFDDDD');
            }
          } else {
            urlsMissing++;
            sourcePara.appendText(' - ❌ MISSING URL');
            sourcePara.setBackgroundColor('#FFDDDD');
          }
        });
      } else {
        const noPara = body.appendParagraph('No sources found for this risk');
        noPara.setBackgroundColor('#FFFFDD');
      }
      
      body.appendParagraph(''); // Add spacing
    });
  }
  
  // Add summary
  body.appendParagraph('URL Test Summary').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(`Total URLs checked: ${urlsChecked}`);
  body.appendParagraph(`Valid URLs: ${urlsValid}`);
  body.appendParagraph(`Missing URLs: ${urlsMissing}`);
  body.appendParagraph(`Invalid format URLs: ${urlsChecked - urlsValid - urlsMissing}`);
  
  const overallResult = (urlsChecked > 0 && urlsValid === urlsChecked) ? 
    '✅ ALL URLS ARE PROPERLY FORMATTED' : 
    '❌ SOME URLS HAVE FORMATTING ISSUES';
  
  const resultPara = body.appendParagraph(`Overall result: ${overallResult}`);
  resultPara.setBackgroundColor(urlsValid === urlsChecked ? '#DDFFDD' : '#FFDDDD');
  
  // Log the URL of the document
  console.log(`URL format test document created: ${doc.getUrl()}`);
  
  return doc.getUrl();
}
