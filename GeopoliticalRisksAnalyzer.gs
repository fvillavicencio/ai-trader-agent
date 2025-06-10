/**
 * Geopolitical Risks Analyzer Module
 * 
 * This module provides an enhanced implementation for retrieving and analyzing geopolitical risks
 * using the Google Cloud Function as primary source and Perplexity API as fallback with improved prompts and data processing.
 */

/**
 * Retrieve geopolitical risks data from the Google Cloud Function
 * @return {Object} Geopolitical risks data in the format expected by JsonExport.gs
 */
function retrieveGeopoliticalRisksFromGCF() {
  Logger.log('Starting geopolitical risks retrieval from Google Cloud Function...');
  
  try {
    // Get the API key from script properties
    const scriptProperties = PropertiesService.getScriptProperties();
    const gcfApiKey = scriptProperties.getProperty('GEOPOLITICAL_RISKS_API_KEY');
    
    if (!gcfApiKey) {
      Logger.log("GEOPOLITICAL_RISKS_API_KEY not found in script properties");
      throw new Error("GEOPOLITICAL_RISKS_API_KEY not found in script properties");
    }
    
    // Google Cloud Function endpoint
    const gcfEndpoint = "https://us-central1-geopolitical-risk-analysis.cloudfunctions.net/geopoliticalRiskAPI";
    
    // Set up the options for the HTTP request
    const options = {
      method: 'get',
      muteHttpExceptions: true,
      timeout: 300000, // 300 seconds (5 minutes) timeout
      headers: {
        'x-api-key': gcfApiKey
      }
    };
    
    Logger.log("Calling Google Cloud Function endpoint...");
    const startTime = new Date().getTime();
    
    // Make the API request
    const response = UrlFetchApp.fetch(gcfEndpoint, options);
    
    const endTime = new Date().getTime();
    const executionTime = (endTime - startTime) / 1000;
    
    Logger.log(`GCF call completed in ${executionTime.toFixed(2)} seconds`);
    Logger.log(`Response code: ${response.getResponseCode()}`);
    
    // Check if the request was successful
    if (response.getResponseCode() === 200) {
      // Parse the response content
      const responseContent = response.getContentText();
      
      // Save the raw response for debugging
      const fileName = `gcf-raw-response-${new Date().toISOString().replace(/:/g, '-')}.json`;
      saveToGoogleDrive(fileName, responseContent);
      Logger.log(`Raw response saved to Google Drive as ${fileName} for inspection`);
      
      let responseData;
      
      try {
        responseData = JSON.parse(responseContent);
        Logger.log(`Response structure keys: ${JSON.stringify(Object.keys(responseData))}`);
        
        // Check for nested response structures that might contain the risks array or macroeconomicFactors
        if (responseData.body && typeof responseData.body === 'string') {
          try {
            responseData.body = JSON.parse(responseData.body);
            Logger.log('Successfully parsed nested body JSON');
          } catch (nestedParseError) {
            Logger.log('Failed to parse body as JSON, keeping as string');
          }
        }
        
        // Look for the expected structure in different possible locations
        let risks = null;
        let globalOverview = null;
        
        // First, check for the macroeconomicFactors.geopoliticalRisks structure
        if (responseData.macroeconomicFactors && responseData.macroeconomicFactors.geopoliticalRisks) {
          const geoRisks = responseData.macroeconomicFactors.geopoliticalRisks;
          if (geoRisks.risks && Array.isArray(geoRisks.risks)) {
            risks = geoRisks.risks;
            globalOverview = geoRisks.global;
            Logger.log(`Found risks array in macroeconomicFactors.geopoliticalRisks with ${risks.length} items`);
          }
        }
        
        // Check in body if it exists
        if (!risks && responseData.body && responseData.body.macroeconomicFactors && 
            responseData.body.macroeconomicFactors.geopoliticalRisks) {
          const geoRisks = responseData.body.macroeconomicFactors.geopoliticalRisks;
          if (geoRisks.risks && Array.isArray(geoRisks.risks)) {
            risks = geoRisks.risks;
            globalOverview = geoRisks.global;
            Logger.log(`Found risks array in body.macroeconomicFactors.geopoliticalRisks with ${risks.length} items`);
          }
        }
        
        // Check direct risks array
        if (!risks) {
          if (responseData.risks && Array.isArray(responseData.risks)) {
            risks = responseData.risks;
            Logger.log(`Found risks array at top level with ${risks.length} items`);
          } else if (responseData.body && responseData.body.risks && Array.isArray(responseData.body.risks)) {
            risks = responseData.body.risks;
            Logger.log(`Found risks array in body with ${risks.length} items`);
          } else if (responseData.data && responseData.data.risks && Array.isArray(responseData.data.risks)) {
            risks = responseData.data.risks;
            Logger.log(`Found risks array in data with ${risks.length} items`);
          } else if (responseData.result && responseData.result.risks && Array.isArray(responseData.result.risks)) {
            risks = responseData.result.risks;
            Logger.log(`Found risks array in result with ${risks.length} items`);
          }
        }
        
        // Check if the response is a raw array of risk items
        if (!risks && Array.isArray(responseData) && responseData.length > 0) {
          risks = responseData;
          Logger.log(`Found response is a direct array of ${risks.length} risk items`);
        }
        
        if (!risks) {
          // Log the structure for debugging
          Logger.log(`Response structure does not contain risks array. Full response: ${JSON.stringify(responseData).substring(0, 500)}...`);
          throw new Error("Invalid response format: missing risks array");
        }
        
        // Log the structure of the first risk item to understand its fields
        if (risks.length > 0) {
          Logger.log(`First risk item structure: ${JSON.stringify(risks[0])}`);
          Logger.log(`First risk item keys: ${Object.keys(risks[0])}`);
        }
        
        // Transform the risks if needed to match expected format
        const transformedRisks = risks.map(risk => {
          // Get the impact level value from various possible fields
          const rawImpactLevel = risk.impactLevel || risk.severity || risk.impact_level || risk.level || 'Medium';
          
          // Convert numeric impact level to string format
          let stringImpactLevel;
          if (typeof rawImpactLevel === 'number' || !isNaN(parseFloat(rawImpactLevel))) {
            // It's a numeric value, convert it to string format
            stringImpactLevel = convertImpactLevelToString(parseFloat(rawImpactLevel));
          } else {
            // It's already a string, keep as is
            stringImpactLevel = rawImpactLevel;
          }
          
          // Ensure each risk has the expected properties
          return {
            name: risk.name || risk.title || risk.category || risk.event || risk.riskName || risk.risk || 'Unnamed Risk',
            description: risk.description || risk.summary || risk.details || risk.analysis || risk.impact || '',
            region: risk.region || risk.regions?.[0] || risk.location || risk.area || 'Global',
            impactLevel: stringImpactLevel,
            source: risk.source || risk.sourceName || '',
            sourceUrl: risk.sourceUrl || risk.url || risk.source_url || ''
          };
        });
        
        // Sort risks by impact level from highest to lowest
        transformedRisks.sort((a, b) => {
          const impactOrder = { 'Severe': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
          return (impactOrder[b.impactLevel] || 0) - (impactOrder[a.impactLevel] || 0);
        });
        
        // Construct a properly formatted response
        const formattedResponse = {
          timestamp: new Date().toISOString(),
          risks: transformedRisks,
          summary: globalOverview || responseData.summary || responseData.body?.summary || 
                  "Geopolitical risks retrieved from Google Cloud Function"
        };
        
        // Cache the results for future use
        cacheGeopoliticalRisks(formattedResponse.risks);
        
        Logger.log(`Successfully retrieved ${formattedResponse.risks.length} geopolitical risks from Google Cloud Function`);
        return formattedResponse;
      } catch (parseError) {
        Logger.log(`Error parsing GCF response: ${parseError}`);
        Logger.log(`Raw response content (first 500 chars): ${responseContent.substring(0, 500)}...`);
        throw new Error(`Failed to parse GCF response: ${parseError.message}`);
      }
    } else {
      // Handle error response
      Logger.log(`GCF request failed with status code: ${response.getResponseCode()}`);
      Logger.log(`Error response: ${response.getContentText()}`);
      throw new Error(`GCF request failed with status code: ${response.getResponseCode()}`);
    }
  } catch (error) {
    Logger.log(`Error in retrieveGeopoliticalRisksFromGCF: ${error}`);
    throw error;
  }
}

/**
 * Main function to retrieve geopolitical risks data using the enhanced multi-step approach
 * @return {Object} Geopolitical risks data in the format expected by JsonExport.gs
 */
function retrieveGeopoliticalRisksEnhanced() {
  Logger.log('Starting enhanced geopolitical risks retrieval...');
  
  try {
    // First try to get data from Google Cloud Function
    try {
      Logger.log("Attempting to retrieve geopolitical risks from Google Cloud Function...");
      
      // Try using the direct GCF retrieval function first
      try {
        Logger.log("Calling retrieveGeopoliticalRisksFromGCF() function directly...");
        const gcfResult = retrieveGeopoliticalRisksFromGCF();
        
        if (gcfResult && gcfResult.risks && Array.isArray(gcfResult.risks) && gcfResult.risks.length > 0) {
          Logger.log(`Successfully retrieved ${gcfResult.risks.length} geopolitical risks from GCF`);
          return gcfResult;
        } else {
          Logger.log("GCF direct call returned invalid or empty data structure");
          // Continue with manual GCF call
        }
      } catch (directGcfError) {
        Logger.log(`Direct GCF call failed: ${directGcfError}. Trying manual implementation...`);
        // Continue with manual GCF call
      }
      
      // Get the API key from script properties
      const scriptProperties = PropertiesService.getScriptProperties();
      const gcfApiKey = scriptProperties.getProperty('GEOPOLITICAL_RISKS_API_KEY');
      
      if (!gcfApiKey) {
        Logger.log("GEOPOLITICAL_RISKS_API_KEY not found in script properties");
        throw new Error("GEOPOLITICAL_RISKS_API_KEY not found in script properties");
      }
      
      // Google Cloud Function endpoint
      const gcfEndpoint = "https://us-central1-geopolitical-risk-analysis.cloudfunctions.net/geopoliticalRiskAPI";
      
      // Set up the options for the HTTP request
      const options = {
        method: 'get',
        muteHttpExceptions: true,
        timeout: 60000, // 60 seconds timeout
        headers: {
          'x-api-key': gcfApiKey
        }
      };
      
      Logger.log("Calling Google Cloud Function endpoint manually...");
      const startTime = new Date().getTime();
      
      // Make the API request
      const response = UrlFetchApp.fetch(gcfEndpoint, options);
      
      const endTime = new Date().getTime();
      const executionTime = (endTime - startTime) / 1000;
      
      Logger.log(`GCF call completed in ${executionTime.toFixed(2)} seconds`);
      Logger.log(`Response code: ${response.getResponseCode()}`);
      
      // Save the raw response for debugging
      const fileName = `GCF_Response_${new Date().toISOString().replace(/[:.]/g, '_')}.json`;
      saveToGoogleDrive(fileName, response.getContentText());
      Logger.log(`Saved raw GCF response to Google Drive as ${fileName}`);
      
      // Check if the request was successful
      if (response.getResponseCode() === 200) {
        // Parse the response content
        const responseContent = response.getContentText();
        let responseData;
        
        try {
          responseData = JSON.parse(responseContent);
          Logger.log(`Response structure keys: ${JSON.stringify(Object.keys(responseData))}`);
          
          // Look for risks in multiple possible locations
          let risks = null;
          
          // Check for nested response structures that might contain the risks array or macroeconomicFactors
          if (responseData.body && typeof responseData.body === 'string') {
            try {
              responseData.body = JSON.parse(responseData.body);
              Logger.log('Successfully parsed nested body JSON');
            } catch (nestedParseError) {
              Logger.log('Failed to parse body as JSON, keeping as string');
            }
          }
          
          // First, check for the macroeconomicFactors.geopoliticalRisks structure
          if (responseData.macroeconomicFactors && responseData.macroeconomicFactors.geopoliticalRisks) {
            const geoRisks = responseData.macroeconomicFactors.geopoliticalRisks;
            if (geoRisks.risks && Array.isArray(geoRisks.risks)) {
              risks = geoRisks.risks;
              Logger.log(`Found risks array in macroeconomicFactors.geopoliticalRisks with ${risks.length} items`);
            }
          }
          
          // Check in body if it exists
          if (!risks && responseData.body && responseData.body.macroeconomicFactors && 
              responseData.body.macroeconomicFactors.geopoliticalRisks) {
            const geoRisks = responseData.body.macroeconomicFactors.geopoliticalRisks;
            if (geoRisks.risks && Array.isArray(geoRisks.risks)) {
              risks = geoRisks.risks;
              Logger.log(`Found risks array in body.macroeconomicFactors.geopoliticalRisks with ${risks.length} items`);
            }
          }
          
          // Check direct risks array
          if (!risks) {
            if (responseData.risks && Array.isArray(responseData.risks)) {
              risks = responseData.risks;
              Logger.log(`Found risks array at top level with ${risks.length} items`);
            } else if (responseData.body && responseData.body.risks && Array.isArray(responseData.body.risks)) {
              risks = responseData.body.risks;
              Logger.log(`Found risks array in body with ${risks.length} items`);
            } else if (responseData.data && responseData.data.risks && Array.isArray(responseData.data.risks)) {
              risks = responseData.data.risks;
              Logger.log(`Found risks array in data with ${risks.length} items`);
            } else if (responseData.result && responseData.result.risks && Array.isArray(responseData.result.risks)) {
              risks = responseData.result.risks;
              Logger.log(`Found risks array in result with ${risks.length} items`);
            }
          }
          
          // Check if the response is a raw array of risk items
          if (!risks && Array.isArray(responseData) && responseData.length > 0) {
            risks = responseData;
            Logger.log(`Found response is a direct array of ${risks.length} risk items`);
          }
          
          if (!risks || risks.length === 0) {
            // Log the structure for debugging
            Logger.log(`Response structure does not contain valid risks array. Full response: ${JSON.stringify(responseData).substring(0, 500)}...`);
            throw new Error("Invalid response format: missing or empty risks array");
          }
          
          // Transform the risks if needed to match expected format
          const transformedRisks = risks.map(risk => {
            // Ensure each risk has the expected properties
            return {
              name: risk.name || risk.title || risk.category || 'Unnamed Risk',
              description: risk.description || risk.summary || risk.details || '',
              region: risk.region || risk.regions?.[0] || 'Global',
              impactLevel: risk.impactLevel || 'Medium',
              source: risk.source || '',
              sourceUrl: risk.sourceUrl || risk.url || ''
            };
          });
          
          // Construct a properly formatted response
          const formattedResponse = {
            timestamp: new Date().toISOString(),
            risks: transformedRisks,
            summary: responseData.summary || responseData.body?.summary || 
                    "Geopolitical risks retrieved from Google Cloud Function"
          };
          
          // Cache the results for future use
          cacheGeopoliticalRisks(formattedResponse.risks);
          
          Logger.log(`Successfully retrieved ${formattedResponse.risks.length} geopolitical risks from Google Cloud Function`);
          return formattedResponse;
        } catch (parseError) {
          Logger.log(`Error parsing GCF response: ${parseError}`);
          Logger.log(`Raw response content (first 500 chars): ${responseContent.substring(0, 500)}...`);
          throw new Error(`Failed to parse GCF response: ${parseError.message}`);
        }
      } else {
        // Handle error response
        Logger.log(`GCF request failed with status code: ${response.getResponseCode()}`);
        Logger.log(`Error response: ${response.getContentText()}`);
        throw new Error(`GCF request failed with status code: ${response.getResponseCode()}`);
      }
    } catch (gcfError) {
      // If Google Cloud Function fails, fall back to Perplexity implementation
      Logger.log(`Google Cloud Function error: ${gcfError}. Falling back to Perplexity implementation.`);
      
      // Get the Perplexity API key
      const apiKey = getPerplexityApiKey();
      if (!apiKey) {
        Logger.log("Perplexity API key not found in script properties");
        throw new Error("Perplexity API key not found in script properties");
      }
      
      // Step 1: Get recent specific geopolitical events
      Logger.log("Retrieving recent geopolitical events...");
      const recentEvents = getRecentGeopoliticalEventsEnhanced(apiKey);
      
      if (!recentEvents || recentEvents.length === 0) {
        Logger.log("No valid geopolitical events found");
        throw new Error("No valid geopolitical events found");
      }
      
      Logger.log(`Retrieved ${recentEvents.length} events, processing for diversity...`);
      
      // Step 2: Analyze each event in depth with balanced prompt
      Logger.log("Analyzing events for market impact and expert opinions...");
      const analyzedEvents = analyzeGeopoliticalEventsEnhanced(recentEvents, apiKey);
      
      // Only proceed if we have at least one successfully analyzed event
      if (!analyzedEvents || analyzedEvents.length === 0) {
        Logger.log("No events were successfully analyzed");
        throw new Error("Failed to analyze any geopolitical events");
      }
      
      Logger.log(`Successfully analyzed ${analyzedEvents.length} events`);
      
      // Step 3: Create a consolidated analysis with proper formatting
      Logger.log("Creating consolidated analysis...");
      const consolidatedAnalysis = createConsolidatedGeopoliticalAnalysisEnhanced(analyzedEvents);
      
      if (!consolidatedAnalysis || !consolidatedAnalysis.risks || consolidatedAnalysis.risks.length === 0) {
        Logger.log("Failed to create valid consolidated analysis");
        throw new Error("Failed to create valid consolidated analysis");
      }
      
      Logger.log(`Created consolidated analysis with ${consolidatedAnalysis.risks.length} risks`);
      
      // Cache the results
      cacheGeopoliticalRisks(consolidatedAnalysis.risks);
      
      // Return the formatted data
      return {
        timestamp: new Date().toISOString(),
        risks: consolidatedAnalysis.risks,
        summary: consolidatedAnalysis.summary
      };
    }
  } catch (error) {
    Logger.log(`Error retrieving enhanced geopolitical risks: ${error}`);
    
    // Fall back to original implementation if enhanced version fails
    try {
      Logger.log("Falling back to original Perplexity implementation for geopolitical risks data");
      return retrieveGeopoliticalRisksFromPerplexity();
    } catch (fallbackError) {
      Logger.log(`Fallback to original Perplexity implementation also failed: ${fallbackError}`);
      
      // Check if we have cached data from a previous successful run
      Logger.log("Checking for cached geopolitical risks data...");
      const cachedRisks = getCachedGeopoliticalRisks();
      
      if (cachedRisks && cachedRisks.length > 0) {
        Logger.log(`Using ${cachedRisks.length} cached geopolitical risks as fallback`);
        const currentDate = new Date();
        const formattedDate = Utilities.formatDate(currentDate, "America/New_York", "MMMM d, yyyy 'at' h:mm a z");
        
        return {
          timestamp: new Date().toISOString(),
          risks: cachedRisks,
          summary: "Based on cached data due to API connection issues.",
          source: "Cached Data",
          sourceUrl: "https://perplexity.ai/",
          lastUpdated: formattedDate,
          note: "Using cached data due to API connection issues. Data may not reflect the most recent events."
        };
      }
      
      // If no cached data is available, create a minimal but valid structure
      Logger.log("No cached data available. Creating minimal valid structure.");
      const currentDate = new Date();
      const formattedDate = Utilities.formatDate(currentDate, "America/New_York", "MMMM d, yyyy 'at' h:mm a z");
      
      return {
        timestamp: new Date().toISOString(),
        risks: [
          {
            name: "World Events Taking a Breather",
            description: "Looks like global politics decided to take a day off too! Our geopolitical insights are currently on a brief vacation. Don't worry, the world will resume its usual chaos shortly.",
            region: "Global",
            impactLevel: "",
            source: "",
            sourceUrl: "",
            lastUpdated: formattedDate
          }
        ],
        source: "",
        sourceUrl: "",
        lastUpdated: formattedDate,
        error: "Geopolitical risk analysis temporarily unavailable."
      };
    }
  }
}

/**
 * Helper function to ensure we have diverse geopolitical events
 * @param {Array} events - Array of event objects
 * @returns {Array} Filtered array with diverse events
 */
function ensureDiverseEvents(events) {
  if (!events || events.length === 0) return [];
  
  // Track regions and event types for diversity
  const regions = new Set();
  const eventTypes = new Set();
  const diverseEvents = [];
  
  // First pass: Categorize events
  events.forEach(event => {
    // Extract region
    if (event.region) {
      regions.add(event.region);
    }
    
    // Infer event type from headline and description
    const content = (event.headline + ' ' + event.description).toLowerCase();
    
    if (content.includes('military') || content.includes('war') || content.includes('conflict') || 
        content.includes('attack') || content.includes('invasion')) {
      eventTypes.add('military');
    } else if (content.includes('central bank') || content.includes('interest rate') || 
               content.includes('monetary') || content.includes('fed') || 
               content.includes('federal reserve')) {
      eventTypes.add('monetary');
    } else if (content.includes('tariff') || content.includes('trade') || 
               content.includes('export') || content.includes('import')) {
      eventTypes.add('trade');
    } else if (content.includes('election') || content.includes('president') || 
               content.includes('prime minister') || content.includes('government')) {
      eventTypes.add('political');
    } else if (content.includes('regulation') || content.includes('law') || 
               content.includes('policy') || content.includes('compliance')) {
      eventTypes.add('regulatory');
    } else if (content.includes('oil') || content.includes('gas') || 
               content.includes('energy') || content.includes('commodity')) {
      eventTypes.add('energy');
    } else {
      eventTypes.add('other');
    }
  });
  
  Logger.log(`Found ${events.length} events with ${regions.size} regions and ${eventTypes.size} event types`);
  
  // If we already have good diversity, return all events
  if (regions.size >= 3 && eventTypes.size >= 3 && events.length <= 5) {
    return events;
  }
  
  // Otherwise, we need to ensure diversity by selecting events strategically
  // Sort events by date (newest first) to prioritize the most recent
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.date || '2000-01-01');
    const dateB = new Date(b.date || '2000-01-01');
    return dateB - dateA;
  });
  
  // First, include the most recent event
  if (sortedEvents.length > 0) {
    diverseEvents.push(sortedEvents[0]);
  }
  
  // Then try to include at least one event from each type if available
  const typeMap = {};
  sortedEvents.forEach(event => {
    const content = (event.headline + ' ' + event.description).toLowerCase();
    let type = 'other';
    
    if (content.includes('military') || content.includes('war') || content.includes('conflict')) {
      type = 'military';
    } else if (content.includes('central bank') || content.includes('interest rate')) {
      type = 'monetary';
    } else if (content.includes('tariff') || content.includes('trade')) {
      type = 'trade';
    } else if (content.includes('election') || content.includes('president')) {
      type = 'political';
    } else if (content.includes('regulation') || content.includes('law')) {
      type = 'regulatory';
    } else if (content.includes('oil') || content.includes('gas') || content.includes('energy')) {
      type = 'energy';
    }
    
    if (!typeMap[type] && !diverseEvents.includes(event)) {
      typeMap[type] = event;
    }
  });
  
  // Add one event from each type if not already included
  Object.values(typeMap).forEach(event => {
    if (!diverseEvents.includes(event)) {
      diverseEvents.push(event);
    }
  });
  
  // If we still need more events to reach 5, add the most recent remaining events
  const remainingEvents = sortedEvents.filter(event => !diverseEvents.includes(event));
  while (diverseEvents.length < 5 && remainingEvents.length > 0) {
    diverseEvents.push(remainingEvents.shift());
  }
  
  Logger.log(`Selected ${diverseEvents.length} diverse events from ${events.length} total events`);
  return diverseEvents;
}

/**
 * Validates if a date string is within the last 7 days
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {boolean} True if the date is valid and within the last 7 days
 */
function isValidRecentDate(dateString) {
  try {
    // Check if the string matches YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      Logger.log(`Invalid date format: ${dateString}`);
      return false;
    }
    
    // Parse the date string
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    const date = new Date(year, month - 1, day); // month is 0-indexed in JS Date
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      Logger.log(`Invalid date value: ${dateString}`);
      return false;
    }
    
    // Get current date and date 7 days ago
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    // Check if the date is within the last 7 days
    const isRecent = date >= sevenDaysAgo && date <= now;
    
    if (!isRecent) {
      Logger.log(`Date not within last 7 days: ${dateString}`);
    }
    
    return isRecent;
  } catch (error) {
    Logger.log(`Error validating date: ${error}`);
    return false;
  }
}

/**
 * Step 1: Get recent specific geopolitical events with balanced prompt
 * @param {string} apiKey - The Perplexity API key
 * @returns {Array} Array of event objects with headline, date, and description
 */
function getRecentGeopoliticalEventsEnhanced(apiKey) {
  const now = new Date();
  const formattedDate = formatDate(now);
  
  // Calculate dates for the past 7 days for better context
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  const yesterdayFormatted = formatDate(yesterday);
  const twoDaysAgoFormatted = formatDate(twoDaysAgo);
  
  Logger.log(`Current date: ${formattedDate}`);
  
  // Balanced prompt with diverse sources and coverage requirements - EXACTLY matching TestPerplexityGeopoliticalRisksBalanced.js
  const prompt = `
Today's Date: ${formattedDate}
Yesterday: ${yesterdayFormatted}
Two Days Ago: ${twoDaysAgoFormatted}

Identify the 5 MOST SIGNIFICANT geopolitical events from the PAST WEEK that are CURRENTLY impacting financial markets.

CRITICAL REQUIREMENTS:
1. Focus on REAL, VERIFIABLE events that have occurred recently
2. Each event MUST have a documented market impact (specific sectors, indices, or assets affected)
3. Each event MUST be from a reputable news source published in the last 7 days
4. Each event MUST include specific details (names, figures, dates)
5. Events should represent a DIVERSE range of regions and event types

ENSURE DIVERSE COVERAGE across these categories:
- Major conflicts or military actions in any region
- Significant diplomatic developments (state visits, treaties, negotiations)
- Central bank decisions and monetary policy changes
- Trade agreements or disputes
- Political transitions or elections with market impact
- Regulatory changes affecting global industries
- Energy market developments
- Natural disasters with economic consequences

SEARCH ACROSS THESE DIVERSE SOURCES:
1. Financial News: Bloomberg, Financial Times, Reuters, Wall Street Journal, CNBC
2. General News: CNN, BBC, New York Times, The Guardian, Al Jazeera, NPR
3. Social Media: Trending topics on X (Twitter) related to markets
4. Research: Major bank research (Goldman Sachs, JPMorgan, Morgan Stanley)
5. Regional Sources: Include sources specific to the regions involved in events

DO NOT OVERREPRESENT any single region, conflict, or type of event. Aim for global coverage.

Format your response as a valid JSON array with the following structure:
[
  {
    "headline": "Brief headline of the event",
    "date": "YYYY-MM-DD", // Must be a real date from the past 7 days
    "description": "Brief 1-2 sentence description of the event with SPECIFIC details",
    "region": "Affected region",
    "source": "Exact source name",
    "url": "Direct URL to specific article"
  }
]
`;

  try {
    Logger.log('Requesting recent geopolitical events with strict factual requirements...');
    // Use temperature 0.0 for maximum factuality
    const response = callPerplexityAPI(prompt, apiKey, 0.0);
    
    // Extract and parse the JSON
    let events;
    try {
      // Try to parse the JSON response
      events = JSON.parse(response);
      
      if (!events || !Array.isArray(events) || events.length === 0) {
        Logger.log("No events found in Perplexity response or invalid format");
        // Instead of throwing an error, use our humorous error handling
        Logger.log("Handling API failure with humorous message");
        return handleGeopoliticalApiFailure();
      }
    } catch (parseError) {
      Logger.log(`Error parsing Perplexity response: ${parseError}`);
      Logger.log(`First 300 chars of response: ${response.substring(0, 300)}`);
      
      // Check if the response contains text explanation instead of JSON
      if (response.includes("cannot provide") || response.includes("unable to") || response.includes("I don't have")) {
        Logger.log("Perplexity returned an explanation instead of JSON. Handling API failure.");
        return handleGeopoliticalApiFailure();
      }
      
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          events = JSON.parse(jsonMatch[1]);
          if (Array.isArray(events)) {
            Logger.log("Successfully extracted JSON from code block");
            if (events.length === 0) {
              Logger.log("Empty array in code block. Handling API failure.");
              return handleGeopoliticalApiFailure();
            }
          } else {
            Logger.log("Extracted content is not an array. Handling API failure.");
            return handleGeopoliticalApiFailure();
          }
        } catch (innerError) {
          Logger.log(`Failed to parse JSON from code block: ${innerError}`);
          return handleGeopoliticalApiFailure();
        }
      } else {
        Logger.log("No JSON code block found. Handling API failure.");
        return handleGeopoliticalApiFailure();
      }
    }
    
    // Validate each event
    const validatedEvents = events.filter(event => {
      // Check for required fields
      if (!event.headline || !event.date || !event.description || !event.region || !event.source) {
        Logger.log(`Skipping event missing required fields: ${event.headline || 'Unknown'}`);
        return false;
      }
      
      // Validate date is within the last 7 days
      if (!isValidRecentDate(event.date)) {
        Logger.log(`Skipping event with invalid or old date: ${event.headline}`);
        return false;
      }
      
      // Check for verification source
      if (!event.verification) {
        Logger.log(`Warning: Event lacks secondary verification source: ${event.headline}`);
        // We don't reject it but log a warning
      }
      
      // Check for suspicious content that might indicate hallucination
      const content = (event.headline + ' ' + event.description).toLowerCase();
      
      // Check for speculative language
      const speculativeTerms = ['could', 'might', 'may', 'possible', 'potentially', 'rumored', 
                               'expected to', 'likely to', 'anticipated', 'projected', 'forecasted'];
      
      const hasSpeculativeLanguage = speculativeTerms.some(term => content.includes(term));
      if (hasSpeculativeLanguage) {
        Logger.log(`Skipping event with speculative language: ${event.headline}`);
        return false;
      }
      
      // Check for vague market impact
      if (!content.includes('market') || 
          (!content.includes('index') && !content.includes('stock') && 
           !content.includes('bond') && !content.includes('currency') && 
           !content.includes('oil') && !content.includes('gold') && 
           !content.includes('commodity') && !content.includes('sector'))) {
        Logger.log(`Warning: Event may have vague market impact: ${event.headline}`);
        // We don't reject it but log a warning
      }
      
      return true;
    });
    
    // Limit to top 7 events
    if (validatedEvents.length > 7) {
      validatedEvents = validatedEvents.slice(0, 7);
    }
    
    // If we have events, return them
    if (validatedEvents.length > 0) {
      Logger.log(`Validated ${validatedEvents.length} events`);
      return validatedEvents;
    }
    
    // If we get here, either no events were found or none passed validation
    Logger.log('No valid events found or extracted');
    throw new Error("No valid events found or extracted from Perplexity API response");
  } catch (error) {
    Logger.log('Error retrieving geopolitical events: ' + error);
    throw new Error(`Failed to retrieve geopolitical events: ${error.message}`);
  }
}

/**
 * Cross-verify an event to ensure it's factually accurate
 * @param {Object} event The event to verify
 * @param {string} apiKey The Perplexity API key
 * @returns {boolean} True if the event is verified, false otherwise
 */
function crossVerifyEvent(event, apiKey) {
  Logger.log(`Cross-verifying event: ${event.headline}`);
  
  // Create a verification prompt that focuses solely on fact-checking
  const verificationPrompt = `
I need to verify if the following geopolitical event actually occurred as described.

Event: "${event.headline}"
Date: ${event.date}
Description: ${event.description}
Region: ${event.region}
Source: ${event.source}

Please fact-check this event by answering these questions:

1. Did this specific event actually occur within the past 7 days?
2. Is the description accurate based on reputable sources?
3. Is there documented evidence of market impact from this event?
4. Are there any factual errors or speculative claims presented as facts?

Provide your verification as a JSON object with this structure:
{
  "verified": true/false,
  "confidence": 1-10 (where 10 is highest confidence),
  "factualErrors": "Description of any factual errors found or null if none",
  "marketImpactConfirmed": true/false,
  "recommendedAction": "include" or "exclude"
}
`;

  try {
    // Call Perplexity with a very low temperature for factual responses
    const response = callPerplexityAPI(verificationPrompt, apiKey, 0.0);
    
    // Parse the verification result
    let verification;
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        verification = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      Logger.log(`Error parsing verification response: ${parseError}`);
      // Default to conservative approach if parsing fails
      return false;
    }
    
    // If we couldn't parse the verification or it's not verified
    if (!verification || verification.verified !== true) {
      Logger.log(`Event verification failed: ${event.headline}`);
      if (verification && verification.factualErrors) {
        Logger.log(`Factual errors: ${verification.factualErrors}`);
      }
      return false;
    }
    
    // Check confidence level - require high confidence
    if (verification.confidence < 8) {
      Logger.log(`Event verification confidence too low (${verification.confidence}/10): ${event.headline}`);
      return false;
    }
    
    // Check if market impact is confirmed
    if (verification.marketImpactConfirmed !== true) {
      Logger.log(`Event market impact not confirmed: ${event.headline}`);
      return false;
    }
    
    // Check recommended action
    if (verification.recommendedAction !== 'include') {
      Logger.log(`Verification recommends excluding event: ${event.headline}`);
      return false;
    }
    
    Logger.log(`Event successfully verified: ${event.headline} (Confidence: ${verification.confidence}/10)`);
    return true;
  } catch (error) {
    Logger.log(`Error during event verification: ${error}`);
    // Default to conservative approach if verification fails
    return false;
  }
}

/**
 * Step 2: Analyze each event for market impact, expert opinions, and sector effects
 * @param {Array} events Array of event objects
 * @param {string} apiKey The Perplexity API key
 * @returns {Array} Array of analyzed events
 */
function analyzeGeopoliticalEventsEnhanced(events, apiKey) {
  Logger.log(`Analyzing ${events.length} events...`);
  
  // Track successful and failed analyses
  const analyzedEvents = [];
  let failedCount = 0;
  
  // Process each event
  for (const event of events) {
    try {
      Logger.log(`Analyzing event: ${event.headline}`);
      
      // First, cross-verify the event to ensure it's factually accurate
      const isVerified = crossVerifyEvent(event, apiKey);
      if (!isVerified) {
        Logger.log(`Event failed cross-verification: ${event.headline}`);
        failedCount++;
        continue;
      }
      
      // Analyze this specific event
      const analysis = analyzeGeopoliticalEvent(event, apiKey);
      
      // Validate and clean up the analysis
      const validatedAnalysis = validateAnalysisEnhanced(analysis, event);
      
      // Skip events that failed validation
      if (!validatedAnalysis) {
        Logger.log(`Event failed validation: ${event.headline}`);
        failedCount++;
        continue;
      }
      
      // Add the validated analysis to our results
      analyzedEvents.push(validatedAnalysis);
      
    } catch (error) {
      Logger.log(`Error analyzing event ${event.headline}: ${error}`);
      failedCount++;
    }
  }
  
  // Log analysis results
  Logger.log(`Analysis complete: ${analyzedEvents.length} succeeded, ${failedCount} failed`);
  
  // Ensure we have at least some analyzed events
  if (analyzedEvents.length === 0) {
    Logger.log("No events could be successfully analyzed");
    return [];
  }
  
  // Limit to top 5 most impactful events if we have more than 5
  if (analyzedEvents.length > 5) {
    // Sort by impact level (highest first)
    analyzedEvents.sort((a, b) => parseFloat(b.impactLevel) - parseFloat(a.impactLevel));
    
    // Take only the top 5
    const topEvents = analyzedEvents.slice(0, 5);
    Logger.log(`Limited to top 5 most impactful events out of ${analyzedEvents.length} total`);
    return topEvents;
  }
  
  // Return all analyzed events if we have 5 or fewer
  return analyzedEvents;
}

/**
 * Step 2: Analyze a specific geopolitical event in depth with balanced prompt
 * @param {Object} event - The event object to analyze
 * @param {string} apiKey - The Perplexity API key
 * @returns {Object} Detailed analysis of the event
 */
function analyzeGeopoliticalEvent(event, apiKey) {
  // Balanced prompt with diverse sources and comprehensive analysis requirements - EXACTLY matching TestPerplexityGeopoliticalRisksBalanced.js
  const prompt = `
Analyze this specific geopolitical event in depth:

Headline: "${event.headline}"
Date: ${event.date}
Description: ${event.description}
Region: ${event.region}
Source: ${event.source}

Your task is to provide a FACTUAL, DATA-DRIVEN analysis of this event's impact on financial markets. 
Focus ONLY on VERIFIABLE information from reputable sources. DO NOT invent or fabricate data.

Provide a comprehensive analysis that includes:

1. What specific market sectors and assets are most affected by this event? (Be precise with names of indices, stocks, commodities)
2. What is the quantifiable impact observed so far? (Include REAL percentage changes or price movements)
3. What are expert opinions on this event? Include REAL names and affiliations of analysts who have commented on this event.
4. What are the potential short-term implications for markets based on HISTORICAL PRECEDENT for similar events?

IMPORTANT: The 'marketImpact' field in your response MUST be NO LONGER THAN 4 SENTENCES. Focus on the most significant and quantifiable impacts only.

IMPORTANT: Consult a DIVERSE range of sources beyond the original source, including:
- Financial media (Bloomberg, Reuters, Financial Times, Wall Street Journal)
- General news outlets (CNN, BBC, New York Times, The Guardian, Al Jazeera)
- Social media discussions on X (Twitter) from verified financial analysts
- Regional news sources specific to the affected regions

If you cannot find specific information on any of these points, state "Insufficient data available" rather than inventing information.

Format your response as a valid JSON object with the following structure:
{
  "type": "Event/Conflict/Policy",
  "name": "${event.headline}",
  "description": "Factual 3-5 sentence description with specific details from verified sources",
  "region": "${event.region}",
  "impactLevel": 7,  // MUST be a number from 1 to 10, with 1 being least impactful and 10 being most catastrophic
  "marketImpact": "Detailed description of OBSERVED market impact with specific sectors and assets (STRICT 4 SENTENCES MAX)",
  "expertOpinions": [
    {
      "name": "Expert's full name",
      "affiliation": "Expert's organization",
      "opinion": "Direct quote or accurately paraphrased opinion"
    }
  ],
  "sectorImpacts": [
    {
      "sector": "Affected sector name",
      "impact": "Positive/Negative/Mixed",
      "details": "Specific impact details with REAL figures where available"
    }
  ],
  "source": "${event.source}",
  "url": "${event.url}",
  "lastUpdated": "${event.date}"
}
`;

  try {
    Logger.log(`Analyzing event: ${event.headline}`);
    const response = callPerplexityAPI(prompt, apiKey, 0.2);
    
    // Extract and parse the JSON
    let analysis;
    try {
      // First try direct parsing
      analysis = JSON.parse(response);
      Logger.log('Successfully parsed analysis JSON directly');
    } catch (error) {
      Logger.log('Direct JSON parsing failed, trying to extract from response...');
      
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          Logger.log('Found JSON in code block, attempting to parse...');
          analysis = JSON.parse(jsonMatch[1]);
          Logger.log('Successfully parsed JSON from code block');
        } catch (codeBlockError) {
          Logger.log('Failed to parse JSON from code block: ' + codeBlockError);
        }
      }
      
      // If code block extraction failed, try to find any JSON-like structure
      if (!analysis) {
        const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          try {
            Logger.log('Found JSON-like structure, attempting to parse...');
            analysis = JSON.parse(jsonObjectMatch[0]);
            Logger.log('Successfully parsed JSON from structure match');
          } catch (objectMatchError) {
            Logger.log('Failed to parse JSON from structure match: ' + objectMatchError);
          }
        }
      }
      
      // If all parsing attempts failed
      if (!analysis) {
        Logger.log('All JSON parsing attempts failed for analysis');
        Logger.log('Raw response (first 500 chars): ' + response.substring(0, 500));
        
        // If we couldn't parse the response or it's invalid, throw an error
        throw new Error(`Failed to parse analysis response for event: ${event.headline}`);
      }
    }
    
    // Validate the analysis
    return validateAnalysisEnhanced(analysis, event);
  } catch (error) {
    Logger.log(`Error analyzing geopolitical event: ${error}`);
    throw new Error(`Failed to analyze geopolitical event: ${error.message}`);
  }
}

/**
 * Step 3: Create a consolidated analysis with proper formatting
 * @param {Array} analyzedEvents Array of analyzed events
 * @returns {Object} Consolidated analysis in the required format
 */
function createConsolidatedGeopoliticalAnalysisEnhanced(analyzedEvents) {
  Logger.log('Creating consolidated analysis from analyzed events...');
  
  // Calculate overall risk index based on individual impact levels
  const avgImpactLevel = analyzedEvents.reduce((sum, event) => {
    return sum + (parseFloat(event.impactLevel) || 5);
  }, 0) / analyzedEvents.length;
  
  // Scale to 0-100
  const geopoliticalRiskIndex = Math.round(avgImpactLevel * 10);
  Logger.log(`Calculated geopolitical risk index: ${geopoliticalRiskIndex}`);
  
  // Format the risks array to match the required structure
  const risks = analyzedEvents.map(event => {
    // Create expert opinions text - limit to 1 expert with a concise quote
    let expertOpinionsText = '';
    if (event.expertOpinions && Array.isArray(event.expertOpinions) && event.expertOpinions.length > 0) {
      // Filter out any system-generated fallback opinions
      const realOpinions = event.expertOpinions.filter(expert => 
        !expert.name.includes('Unavailable') && 
        !expert.name.includes('Pending') && 
        !expert.affiliation.includes('System')
      );
      
      // Use just 1 real opinion, or fallback if none
      const opinionToUse = realOpinions.length > 0 ? realOpinions[0] : event.expertOpinions[0];
      
      if (opinionToUse) {
        // Get just the first sentence of the opinion for brevity
        let opinion = opinionToUse.opinion || '';
        const firstSentenceMatch = opinion.match(/^[^.!?]*[.!?]/); // Match up to the first sentence-ending punctuation
        if (firstSentenceMatch) {
          opinion = firstSentenceMatch[0];
        } else if (opinion.length > 100) {
          // If no sentence ending found but opinion is long, truncate
          opinion = opinion.substring(0, 100) + '...';
        }
        
        expertOpinionsText = `${opinionToUse.name}: "${opinion}"`;
      }
    }
    
    // Create a concise description (limit to 2-3 sentences)
    let enhancedDescription = event.description || '';
    
    // Limit description to 2-3 sentences
    const descriptionSentenceRegex = /[.!?]+\s|[.!?]+$/g;
    const descriptionSentences = enhancedDescription.match(descriptionSentenceRegex) || [];
    
    if (descriptionSentences.length > 2) {
      // If more than 2 sentences, truncate to first 2 sentences
      let sentenceEndCount = 0;
      let lastIndex = 0;
      
      for (let i = 0; i < enhancedDescription.length; i++) {
        if (/[.!?]/.test(enhancedDescription[i]) && 
            (i + 1 === enhancedDescription.length || /\s/.test(enhancedDescription[i + 1]))) {
          sentenceEndCount++;
          if (sentenceEndCount === 2) {
            lastIndex = i + 1;
            break;
          }
        }
      }
      
      if (lastIndex > 0) {
        enhancedDescription = enhancedDescription.substring(0, lastIndex);
        Logger.log(`Truncated description to 2 sentences: ${enhancedDescription}`);
      }
    }
    
    // Only add expert opinion if description is still relatively short
    if (expertOpinionsText && enhancedDescription.length < 200 && !enhancedDescription.includes(expertOpinionsText)) {
      enhancedDescription += ' ' + expertOpinionsText;
    }
    
    // Ensure market impact is very concise (max 1-2 sentences)
    let enhancedMarketImpact = event.marketImpact || '';
    
    // Count sentences in the market impact
    const marketImpactSentenceRegex = /[.!?]+\s|[.!?]+$/g;
    const marketImpactSentences = enhancedMarketImpact.match(marketImpactSentenceRegex) || [];
    
    // If more than 1 sentence, truncate to just the first sentence
    if (marketImpactSentences.length > 1) {
      let lastIndex = 0;
      
      // Find the end of the first sentence
      for (let i = 0; i < enhancedMarketImpact.length; i++) {
        if (/[.!?]/.test(enhancedMarketImpact[i]) && 
            (i + 1 === enhancedMarketImpact.length || /\s/.test(enhancedMarketImpact[i + 1]))) {
          lastIndex = i + 1;
          break;
        }
      }
      
      if (lastIndex > 0) {
        enhancedMarketImpact = enhancedMarketImpact.substring(0, lastIndex);
        Logger.log(`Truncated market impact to 1 sentence: ${enhancedMarketImpact}`);
      }
    }
    
    // If market impact is still too long, truncate it
    if (enhancedMarketImpact.length > 150) {
      // Find a good breaking point near 150 characters
      let breakPoint = 150;
      while (breakPoint > 100 && !/\s/.test(enhancedMarketImpact[breakPoint])) {
        breakPoint--;
      }
      enhancedMarketImpact = enhancedMarketImpact.substring(0, breakPoint) + '...';
      Logger.log(`Further truncated market impact to ${breakPoint} chars`);
    }
    
    // Only add sector impact if we have no market impact or it's very short
    if ((enhancedMarketImpact.length < 50 || !enhancedMarketImpact) && 
        event.sectorImpacts && Array.isArray(event.sectorImpacts) && event.sectorImpacts.length > 0) {
      // Take just the most significant sector impact
      const topSectorImpact = event.sectorImpacts[0];
      
      // Create a very concise sector impact statement
      let sectorDetails = topSectorImpact.details.split('.')[0];
      if (sectorDetails.length > 50) {
        sectorDetails = sectorDetails.substring(0, 50) + '...';
      }
      
      const sectorImpactText = `${topSectorImpact.sector} sector: ${topSectorImpact.impact}.`;
      
      // Only add if not already included
      if (!enhancedMarketImpact.includes(topSectorImpact.sector)) {
        enhancedMarketImpact += (enhancedMarketImpact ? ' ' : '') + sectorImpactText;
      }
    }
    
    // Use the specific URL provided by Perplexity API when available
    let sourceUrl = event.url || event.sourceUrl;
    
    // If we have a URL from the original event data, prioritize that
    if (event.url && event.url !== "https://perplexity.ai/" && !event.url.includes("perplexity.ai")) {
      sourceUrl = event.url;
    }
    
    // Clean up the URL by removing any ?ref= parameters and tracking codes
    if (sourceUrl) {
      // Remove query parameters that are typically used for tracking
      if (sourceUrl.includes('?')) {
        sourceUrl = sourceUrl.split('?')[0];
      }
      
      // Remove utm tracking parameters
      if (sourceUrl.includes('utm_')) {
        sourceUrl = sourceUrl.split('utm_')[0];
      }
    } else {
      // If no URL is available, use the source name to determine a specific URL
      const sourceName = event.source ? event.source.toLowerCase() : "";
      
      if (sourceName.includes("reuters")) {
        sourceUrl = "https://www.reuters.com/markets/";
      } else if (sourceName.includes("bloomberg")) {
        sourceUrl = "https://www.bloomberg.com/markets/";
      } else if (sourceName.includes("financial times") || sourceName.includes("ft")) {
        sourceUrl = "https://www.ft.com/markets";
      } else if (sourceName.includes("wall street journal") || sourceName.includes("wsj")) {
        sourceUrl = "https://www.wsj.com/news/markets/";
      } else if (sourceName.includes("cnbc")) {
        sourceUrl = "https://www.cnbc.com/markets/";
      } else {
        // Default to Perplexity if we can't determine a specific source
        sourceUrl = "https://perplexity.ai/";
      }
    }
    
    // Convert the numeric impact level to string format
    const stringImpactLevel = convertImpactLevelToString(parseFloat(event.impactLevel) || 5);
    
    return {
      name: event.name,
      description: enhancedDescription,
      region: event.region,
      impactLevel: stringImpactLevel,
      marketImpact: enhancedMarketImpact,
      source: event.source || "Perplexity API",
      sourceUrl: sourceUrl
    };
  });
  
  // Convert impact levels to strings for display and sort by impact (highest to lowest)
  const processedRisks = risks.map(risk => {
    // Parse the numeric impact level or use a default
    const numericLevel = parseFloat(risk.impactLevel) || 5;
    const stringImpactLevel = convertImpactLevelToString(numericLevel);
    return {
      ...risk,
      _numericImpactLevel: numericLevel,
      impactLevel: stringImpactLevel
    };
  }).sort((a, b) => b._numericImpactLevel - a._numericImpactLevel);
  
  // Calculate overall risk level based on individual risks
  const riskLevels = processedRisks.map(r => r.impactLevel);
  const highCount = riskLevels.filter(l => l === "High" || l === "Severe").length;
  const severeCount = riskLevels.filter(l => l === "Severe").length;
  
  let riskLevel = "Moderate";
  if (severeCount > 0) {
    riskLevel = "Severe";
  } else if (highCount > 0) {
    riskLevel = "High";
  } else if (processedRisks.length === 0) {
    riskLevel = "Low";
  }
  
  // Limit to top 5 most impactful risks only
  const topRisks = processedRisks.slice(0, 5);
  
  // Create a comprehensive global assessment that mentions all major risks
  // Extract the main themes from all risks for a more coherent summary
  const riskThemes = new Set();
  const regions = new Set();
  
  // Extract key themes and regions from all risks
  topRisks.forEach(risk => {
    // Extract themes from risk names and descriptions
    const content = (risk.name + " " + risk.description).toLowerCase();
    if (content.includes("russia") || content.includes("ukraine")) riskThemes.add("Russia-Ukraine war");
    if (content.includes("israel") || content.includes("gaza") || content.includes("hamas") || content.includes("palestine")) riskThemes.add("Israel-Hamas conflict");
    if (content.includes("china") && (content.includes("us") || content.includes("united states") || content.includes("trade"))) riskThemes.add("US-China trade tensions");
    if (content.includes("cyber") || content.includes("hack")) riskThemes.add("cybersecurity threats");
    if (content.includes("tariff") || content.includes("protectionism") || content.includes("trade war")) riskThemes.add("global trade protectionism");
    if (content.includes("inflation") || content.includes("interest rate") || content.includes("federal reserve") || content.includes("central bank")) riskThemes.add("monetary policy uncertainty");
    if (content.includes("oil") || content.includes("energy") || content.includes("gas")) riskThemes.add("energy market volatility");
    if (content.includes("election") || content.includes("political")) riskThemes.add("political instability");
    
    // Add the region if it's specific
    if (risk.region && risk.region !== "Global") {
      regions.add(risk.region);
    }
  });
  
  // If no specific themes were identified, add generic ones based on risk names
  if (riskThemes.size === 0 && topRisks.length > 0) {
    topRisks.slice(0, 3).forEach(risk => {
      const simplifiedName = risk.name.split(' ').slice(0, 3).join(' ');
      riskThemes.add(simplifiedName);
    });
  }
  
  // Convert sets to arrays for easier manipulation
  const themesList = Array.from(riskThemes);
  const regionsList = Array.from(regions);
  
  // Create a concise global assessment
  let globalAssessment = "";
  
  if (riskLevel === "Severe" || riskLevel === "High") {
    globalAssessment = `${riskLevel} levels of geopolitical risk from ${themesList.slice(0, 5).join(", ")}`;
  } else if (riskLevel === "Moderate") {
    globalAssessment = `Moderate levels of geopolitical risk from ${themesList.slice(0, 5).join(", ")}`;
  } else {
    globalAssessment = `Low levels of geopolitical risk at present`;
  }
  
  // If there are no risks, provide a clear error message
  if (processedRisks.length === 0) {
    Logger.log("No risks found from primary source, adding error message...");
    
    // Set a clear error message
    globalAssessment = "Our crystal ball is temporarily foggy. Geopolitical insights will return after this brief intermission.";
    
    // Add a single risk item explaining the situation
    processedRisks.push({
      name: "Geopolitical Analyst on Coffee Break",
      description: "Sorry to disappoint, but our geopolitical analyst seems to have stepped out for coffee... or possibly joined a spontaneous diplomatic mission to Antarctica. We'll resume world-watching shortly!",
      region: "Global",
      impactLevel: "Unknown",
      source: "System Status",
      sourceUrl: ""
    });
  }
  
  Logger.log(`Final analysis contains ${processedRisks.length} geopolitical risks`);
  
  // Cache the processed risks for future use if we have valid data
  if (processedRisks.length > 0 && processedRisks[0].name !== "Data Retrieval Error") {
    cacheGeopoliticalRisks(processedRisks);
  }
  
  // Use the specific source URL from each risk instead of generic URLs
  // Ensure each risk has a specific source URL based on its actual source
  processedRisks.forEach(risk => {
    // Only modify URLs that are generic or missing
    if (!risk.sourceUrl || 
        risk.sourceUrl === "https://www.reuters.com/world/" ||
        risk.sourceUrl === "https://www.bloomberg.com/" ||
        risk.sourceUrl === "https://www.ft.com/" ||
        risk.sourceUrl === "https://www.wsj.com/" ||
        risk.sourceUrl === "https://www.cnbc.com/world/" ||
        risk.sourceUrl === "https://www.bbc.com/news/world" ||
        risk.sourceUrl === "https://perplexity.ai/") {
      
      // If we have a specific URL from the original event, use that
      if (risk.url && risk.url !== "https://perplexity.ai/") {
        risk.sourceUrl = risk.url;
      } else {
        // Otherwise, construct a more specific URL based on the source name
        const sourceName = risk.source ? risk.source.toLowerCase() : "";
        
        if (sourceName.includes("reuters")) {
          // Make Reuters URLs more specific based on region
          if (risk.region === "Middle East") {
            risk.sourceUrl = "https://www.reuters.com/world/middle-east/";
          } else if (risk.region === "Eastern Europe") {
            risk.sourceUrl = "https://www.reuters.com/world/europe/";
          } else if (risk.region === "Asia") {
            risk.sourceUrl = "https://www.reuters.com/world/asia-pacific/";
          } else {
            risk.sourceUrl = "https://www.reuters.com/world/";
          }
        } else if (sourceName.includes("bloomberg")) {
          // Make Bloomberg URLs more specific
          if (risk.name.toLowerCase().includes("oil") || 
              risk.name.toLowerCase().includes("energy") || 
              risk.name.toLowerCase().includes("gas")) {
            risk.sourceUrl = "https://www.bloomberg.com/energy";
          } else if (risk.name.toLowerCase().includes("trade")) {
            risk.sourceUrl = "https://www.bloomberg.com/markets/economics";
          } else {
            risk.sourceUrl = "https://www.bloomberg.com/markets/";
          }
        }
        // Keep other URLs as they are if they're already specific
      }
    }
  });
  
  // Determine the most appropriate main source URL based on the top risks
  let mainSourceUrl = "https://perplexity.ai/";
  
  // If we have risks, use the source URL from the highest impact risk
  if (processedRisks.length > 0) {
    mainSourceUrl = processedRisks[0].sourceUrl;
  }
  
  // Return the consolidated analysis with the structure expected by JsonExport
  // Important: We're explicitly NOT populating the 'global' field to let OpenAI handle that
  // Only include the top 5 most impactful risks
  return {
    // Remove the global field completely
    risks: topRisks,
    source: "Perplexity API Enhanced Retrieval",
    sourceUrl: mainSourceUrl,
    lastUpdated: new Date(),
    global: globalAssessment
  };
}

/**
 * Converts a numeric impact level (1-10) to the string format expected by JsonExport
 * @param {number} numericImpact - The numeric impact level (1-10)
 * @return {string} The string impact level (Low, Medium, High, Severe)
 */
function convertImpactLevelToString(numericImpact) {
  // Ensure we have a valid number
  const impact = parseFloat(numericImpact) || 5;
  
  // Convert to string format
  if (impact >= 8) {
    return 'Severe';
  } else if (impact >= 6) {
    return 'High';
  } else if (impact >= 4) {
    return 'Medium';
  } else {
    return 'Low';
  }
}

/**
 * Helper function to validate event dates to ensure they are recent
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {boolean} True if the date is valid and recent, false otherwise
 */
function isValidRecentDate(dateStr) {
  if (!dateStr) {
    Logger.log('Date validation failed: Empty date string');
    return false;
  }
  
  // Check if the date string is in the expected format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    Logger.log(`Date validation failed: Invalid format: ${dateStr}`);
    return false;
  }
  
  try {
    // Parse the date
    const eventDate = new Date(dateStr);
    
    // Check if the date is valid
    if (isNaN(eventDate.getTime())) {
      Logger.log(`Date validation failed: Invalid date: ${dateStr}`);
      return false;
    }
    
    // Get today's date with time set to beginning of day for fair comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get the minimum valid date (from global variable set in getRecentGeopoliticalEventsEnhanced)
    const minDateStr = this.MINIMUM_EVENT_DATE || '2000-01-01'; // Fallback if not set
    const minDate = new Date(minDateStr);
    minDate.setHours(0, 0, 0, 0);
    
    // Check if the date is in the future
    if (eventDate > today) {
      Logger.log(`Date validation failed: Future date rejected: ${dateStr}`);
      return false;
    }
    
    // Check if the date is too old (older than 7 days)
    if (eventDate < minDate) {
      Logger.log(`Date validation failed: Date too old: ${dateStr} (minimum: ${minDateStr})`);
      return false;
    }
    
    // Calculate the age of the event in days
    const ageInDays = Math.floor((today - eventDate) / (1000 * 60 * 60 * 24));
    Logger.log(`Event date ${dateStr} is ${ageInDays} days old`);
    
    // Extra check: Strongly prefer very recent events (0-5 days old)
    if (ageInDays > 5) {
      Logger.log(`Date validation warning: Event is ${ageInDays} days old, which is not ideal but still acceptable`);
      // We don't reject it, but we log a warning
    }
    
    // Date is valid and recent
    return true;
  } catch (e) {
    Logger.log(`Date validation error for ${dateStr}: ${e}`);
    return false;
  }
}

/**
 * Helper function to validate and clean up the analysis
 * @param {Object} analysis The analysis to validate
 * @param {Object} event The original event
 * @returns {Object} Validated analysis
 */
function validateAnalysisEnhanced(analysis, event) {
  // Ensure we have a valid analysis object
  if (!analysis) {
    Logger.log(`Analysis for event ${event ? event.headline : 'unknown'} is null or undefined`);
    return {
      name: event ? event.headline : "Unknown Event",
      description: event ? event.description : "No details available",
      region: event ? event.region : "Global",
      impactLevel: 5,
      marketImpact: null,
      expertOpinions: [],
      sectorImpacts: [],
      source: event ? event.source : "Unknown",
      url: event ? event.url : null,
      date: event ? event.date : new Date().toISOString().split('T')[0]
    };
  }
  
  // Check if the event date is valid and recent
  if (event && event.date) {
    if (!isValidRecentDate(event.date)) {
      Logger.log(`Event date ${event.date} for "${event.headline}" is not valid or recent. Rejecting event.`);
      return null; // Return null to indicate this event should be skipped
    }
  }
  
  // Ensure required fields exist
  analysis.type = analysis.type || 'Event';
  analysis.name = analysis.name || event.headline;
  analysis.region = analysis.region || event.region;
  analysis.source = analysis.source || event.source;
  analysis.url = analysis.url || event.url;
  analysis.lastUpdated = analysis.lastUpdated || event.date;
  
  // Validate description
  if (!analysis.description || analysis.description.includes('Insufficient data') || analysis.description.length < 50) {
    analysis.description = `${event.description} [Note: Enhanced description unavailable.]`;
  }
  
  // Validate impact level - ENSURE IT'S NUMERIC
  let impactNum = parseFloat(analysis.impactLevel);
  if (isNaN(impactNum) || impactNum < 1 || impactNum > 10) {
    impactNum = 5; // Default to medium impact if invalid
  }
  analysis.impactLevel = impactNum; // Store as number
  
  // Validate market impact
  if (!analysis.marketImpact || analysis.marketImpact.includes('Insufficient data')) {
    analysis.marketImpact = null;
  } else if (analysis.marketImpact.length > 500) {
    // If market impact is too long, truncate to approximately 3 sentences
    let sentenceEndCount = 0;
    let lastIndex = 0;
    
    // Find the end of the third sentence
    for (let i = 0; i < analysis.marketImpact.length; i++) {
      if (/[.!?]/.test(analysis.marketImpact[i]) && 
          (i + 1 === analysis.marketImpact.length || /\s/.test(analysis.marketImpact[i + 1]))) {
        sentenceEndCount++;
        if (sentenceEndCount === 3) {
          lastIndex = i + 1;
          break;
        }
      }
    }
    
    if (lastIndex > 0) {
      analysis.marketImpact = analysis.marketImpact.substring(0, lastIndex);
      Logger.log(`Truncated market impact to 3 sentences: ${analysis.marketImpact}`);
    }
  }
  
  // Validate expert opinions
  if (!Array.isArray(analysis.expertOpinions) || analysis.expertOpinions.length === 0) {
    analysis.expertOpinions = [];
  }
  
  // Validate sector impacts
  if (!Array.isArray(analysis.sectorImpacts) || analysis.sectorImpacts.length === 0) {
    // Create default sector impacts based on the event type/region
    analysis.sectorImpacts = createDefaultSectorImpactsEnhanced(event);
  }
  
  return analysis;
}

/**
 * Helper function to create empty sector impacts array
 * @param {Object} event The event to create sector impacts for
 * @returns {Array} Empty array of sector impact objects
 */
function createDefaultSectorImpactsEnhanced(event) {
  // Return an empty array instead of hardcoded values
  return [];
}

/**
 * Helper function to call the Perplexity API with the exact same parameters as TestPerplexityGeopoliticalRisksBalanced.js
 * @param {string} prompt The prompt to send to the API
 * @param {string} apiKey The Perplexity API key
 * @param {number} temperature The temperature parameter (0-1)
 * @returns {string} The API response
 */
function callPerplexityAPI(prompt, apiKey, temperature = 0.0) {
  const url = "https://api.perplexity.ai/chat/completions";
  const payload = {
    model: "sonar-pro",  // Using the standard model for compatibility
    messages: [
      {
        role: "system",
        content: "You are a geopolitical risk analyst for a major investment bank with expertise in how geopolitical events impact financial markets. Your analysis must be factual, data-driven, and based on verifiable information from reputable sources. Focus on quality over quantity. Provide specific details, including real names, figures, and dates. Format your response as valid JSON with no explanations or markdown formatting."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: temperature,
    max_tokens: 4000,
    top_p: 0.7  // Lower top_p for more focused and factual responses
  };
  
  try {
    // Enhanced logging for API call
    Logger.log(`=== PERPLEXITY API REQUEST ===`);
    Logger.log(`Timestamp: ${new Date().toISOString()}`);
    Logger.log(`API Key: ${apiKey ? apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 4) : 'MISSING'}`); // Log partial key for debugging
    Logger.log(`Temperature: ${temperature}`);
    Logger.log(`Model: sonar-pro`);
    Logger.log(`Prompt length: ${prompt.length} characters`);
    
    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    // Log start time for performance tracking
    const startTime = new Date().getTime();
    const response = UrlFetchApp.fetch(url, options);
    const endTime = new Date().getTime();
    const responseCode = response.getResponseCode();
    
    // Enhanced logging for API response
    Logger.log(`=== PERPLEXITY API RESPONSE ===`);
    Logger.log(`Response time: ${endTime - startTime}ms`);
    Logger.log(`Status code: ${responseCode}`);
    Logger.log(`Headers: ${JSON.stringify(response.getAllHeaders())}`);
    
    if (responseCode !== 200) {
      const errorText = response.getContentText();
      Logger.log(`ERROR RESPONSE BODY: ${errorText.substring(0, 1000)}`);
      
      // Try to parse error response for more details
      try {
        const errorJson = JSON.parse(errorText);
        Logger.log(`Error type: ${errorJson.error?.type || 'Unknown'}`);
        Logger.log(`Error message: ${errorJson.error?.message || 'No message provided'}`);
      } catch (parseError) {
        Logger.log(`Could not parse error response as JSON: ${parseError.message}`);
      }
      
      throw new Error(`Perplexity API returned status code ${responseCode}`);
    }
    
    const responseText = response.getContentText();
    
    // Log response size
    Logger.log(`Response size: ${responseText.length} characters`);
    
    try {
      const responseJson = JSON.parse(responseText);
      
      if (responseJson && responseJson.choices && responseJson.choices.length > 0) {
        const content = responseJson.choices[0].message.content;
        Logger.log(`Content length: ${content.length} characters`);
        Logger.log(`Content preview: ${content.substring(0, 300)}...`);
        
        // Log usage information if available
        if (responseJson.usage) {
          Logger.log(`Usage - Prompt tokens: ${responseJson.usage.prompt_tokens}, Completion tokens: ${responseJson.usage.completion_tokens}, Total: ${responseJson.usage.total_tokens}`);
        }
        
        return content;
      } else {
        Logger.log(`Invalid response structure: ${JSON.stringify(responseJson).substring(0, 500)}`);
        throw new Error("Invalid response format from Perplexity API");
      }
    } catch (jsonError) {
      Logger.log(`Failed to parse response as JSON: ${jsonError.message}`);
      Logger.log(`Raw response preview: ${responseText.substring(0, 500)}`);
      throw new Error(`Failed to parse Perplexity API response: ${jsonError.message}`);
    }
  } catch (error) {
    Logger.log(`=== PERPLEXITY API ERROR ===`);
    Logger.log(`Error: ${error.message}`);
    Logger.log(`Stack: ${error.stack || 'No stack trace available'}`);
    throw new Error(`Perplexity API error: ${error.message}`);
  }
}

/**
 * Handles API failures with a humorous error message instead of using hardcoded data
 * @returns {Error} Throws an error with a humorous message
 */
function handleGeopoliticalApiFailure() {
  Logger.log('API failure detected, throwing error with humorous message');
  throw new Error("Our geopolitical analysts are currently on an unexpected coffee break. They'll be back to monitoring world events shortly!");
}


/**
 * Retrieves cached geopolitical risks data if available
 * @returns {Array|null} Cached risks data or null if not available
 */
function getCachedGeopoliticalRisks() {
  try {
    Logger.log('Checking for cached geopolitical risks data...');
    const scriptCache = CacheService.getScriptCache();
    const cachedData = scriptCache.get('GEOPOLITICAL_RISKS_CACHED_DATA');
    
    if (!cachedData) {
      Logger.log('No cached geopolitical risks data found');
      return null;
    }
    
    try {
      const parsedData = JSON.parse(cachedData);
      
      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        Logger.log('Cached data is not a valid array or is empty');
        return null;
      }
      
      Logger.log(`Retrieved ${parsedData.length} cached geopolitical risks`);
      return parsedData;
    } catch (parseError) {
      Logger.log(`Error parsing cached data: ${parseError}`);
      return null;
    }
  } catch (error) {
    Logger.log(`Error retrieving cached geopolitical risks: ${error}`);
    return null;
  }
}

/**
 * Cache geopolitical risks data for future use
 * @param {Array} risks - The processed geopolitical risks to cache
 */
function cacheGeopoliticalRisks(risks) {
  try {
    if (!risks || !Array.isArray(risks) || risks.length === 0) {
      Logger.log("No valid risks to cache");
      return;
    }
    
    // Cache the risks data for 2 hours
    const scriptCache = CacheService.getScriptCache();
    scriptCache.put('GEOPOLITICAL_RISKS_CACHED_DATA', JSON.stringify(risks), 7200); // 2 hours
    Logger.log(`Successfully cached ${risks.length} geopolitical risks for future use`);
  } catch (error) {
    Logger.log(`Error caching geopolitical risks: ${error}`);
    // Fail silently - caching is a non-critical operation
  }
}

/**
 * Clear the cached geopolitical risks data
 * @return {boolean} True if cache was cleared successfully, false otherwise
 */
function clearGeopoliticalRisksCache() {
  try {
    const scriptCache = CacheService.getScriptCache();
    scriptCache.remove('GEOPOLITICAL_RISKS_CACHED_DATA');
    Logger.log('Geopolitical risks cache cleared successfully');
    return true;
  } catch (error) {
    Logger.log(`Error clearing geopolitical risks cache: ${error}`);
    return false;
  }
}

function saveToGoogleDrive(fileName, content) {
  try {
    // Check if the output folder exists, create it if not
    const folderName = 'Lambda API Responses';
    let folder;
    
    // Try to find the folder
    const folderIterator = DriveApp.getFoldersByName(folderName);
    if (folderIterator.hasNext()) {
      folder = folderIterator.next();
      Logger.log(`Found existing folder: ${folderName}`);
    } else {
      // Create the folder if it doesn't exist
      folder = DriveApp.createFolder(folderName);
      Logger.log(`Created new folder: ${folderName}`);
    }
    
    // Create the file in the folder
    // Use plain text MIME type since MimeType.JSON might not be available
    const file = folder.createFile(fileName, content, 'application/json');
    Logger.log(`File created: ${fileName}`);
    
    return file;
  } catch (error) {
    Logger.log(`Error saving to Google Drive: ${error}`);
    // Continue execution even if saving fails
    return null;
  }
}

/**
 * Helper function to format dates consistently
 * @param {Date} date - The date to format
 * @return {string} Formatted date string
 */
function formatDate(date) {
  return Utilities.formatDate(date, "GMT", "MMMM dd, yyyy");
}

/**
 * Test function for Google Cloud Function geopolitical risks retrieval
 * @return {Object} The retrieved geopolitical risks data
 */
function testGeopoliticalRisksGCF() {
  Logger.log('Starting Google Cloud Function Geopolitical Risks Test');
  Logger.log('This test will call the GCF endpoint to retrieve geopolitical risks');
  
  try {
    // Clear cache to ensure fresh data retrieval
    clearGeopoliticalRisksCache();
    Logger.log('Geopolitical risks cache cleared to ensure fresh data retrieval');
    
    // Call the GCF retrieval function
    const startTime = new Date().getTime();
    const result = retrieveGeopoliticalRisksFromGCF();
    const endTime = new Date().getTime();
    const executionTime = (endTime - startTime) / 1000;
    
    Logger.log(`Test completed in ${executionTime.toFixed(2)} seconds`);
    
    if (result && result.risks && Array.isArray(result.risks)) {
      Logger.log(`Retrieved ${result.risks.length} geopolitical risks`);
      
      // Save the results to Google Drive for inspection
      const fileName = `gcf-test-results-${new Date().toISOString().replace(/:/g, '-')}.json`;
      saveToGoogleDrive(fileName, JSON.stringify(result, null, 2));
      Logger.log(`Test results saved to Google Drive as ${fileName}`);
      
      if (result.risks.length > 0) {
        Logger.log('Top geopolitical risks:');
        result.risks.slice(0, 3).forEach((risk, index) => {
          Logger.log(`${index + 1}. ${risk.name || risk.title || risk.category || 'Unnamed Risk'}`);
        });
      }
    } else {
      Logger.log('No geopolitical risks were retrieved or invalid format');
      Logger.log(`Result structure: ${JSON.stringify(Object.keys(result || {}))}`);
    }
    
    return result;
  } catch (error) {
    Logger.log(`Error in testGeopoliticalRisksGCF: ${error}`);
    return null;
  }
}

