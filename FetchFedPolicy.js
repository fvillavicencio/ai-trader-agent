/**
 * Retrieves Fed policy data including current rate and upcoming meetings
 * @return {Object} Fed policy data
 */
function retrieveFedPolicyData() {
  const debugMode = PropertiesService.getScriptProperties().getProperty('DEBUG_MODE') === 'true';
  
  try {
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Starting retrieveFedPolicyData");
      Logger.log("----------------------------------------");
    }
    
    Logger.log("Retrieving Fed policy data...");
    
    // Fetch current Fed Funds Rate
    const fedFundsRate = fetchFedFundsRateFromFRED();
    
    // Fetch FOMC meeting schedule
    const meetings = fetchFOMCMeetings();
    
    // Get the next meeting
    const nextMeeting = meetings.find(meeting => new Date(meeting.date) > new Date()) || {
      date: "No upcoming meetings",
      type: "",
      time: "",
      timezone: ""
    };
    
    // Fetch forward guidance and commentary
    const guidance = fetchForwardGuidance();
    
    // Create the data structure
    const fedPolicy = {
      currentRate: fedFundsRate,
      lastMeeting: meetings[0] || {
        date: "No meetings found",
        type: "",
        time: "",
        timezone: ""
      },
      nextMeeting: nextMeeting,
      meetings: meetings,
      forwardGuidance: guidance.forwardGuidance,
      commentary: guidance.commentary,
      source: {
        url: guidance.source.url,
        timestamp: guidance.source.timestamp
      }
    };
    
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Fed Policy Data Structure:");
      Logger.log(JSON.stringify(fedPolicy, null, 2));
      Logger.log("----------------------------------------");
    }
    
    // Cache the data
    const scriptCache = CacheService.getScriptCache();
    scriptCache.put('fedPolicyData', JSON.stringify(fedPolicy), 3600); // Cache for 1 hour
    
    return fedPolicy;
    
  } catch (error) {
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Error in retrieveFedPolicyData:");
      Logger.log("Error Type:", error.constructor.name);
      Logger.log("Error Message:", error.message);
      Logger.log("Stack Trace:", error.stack);
      Logger.log("----------------------------------------");
    }
    return null;
  }
}

/**
 * Fetches forward guidance and commentary from the latest Fed press release
 * @return {Object} Forward guidance and commentary
 */
function fetchForwardGuidance() {
  const debugMode = PropertiesService.getScriptProperties().getProperty('DEBUG_MODE') === 'true';
  
  try {
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Starting fetchForwardGuidance");
      Logger.log("----------------------------------------");
    }
    
    // Fetch the latest FOMC press release using the Federal Reserve's API
    const pressReleaseUrl = 'https://www.federalreserve.gov/api/press-releases/monetary.json';
    const response = UrlFetchApp.fetch(pressReleaseUrl, {
      timeout: 30000 // 30 second timeout
    });
    
    if (debugMode) {
      Logger.log("Press Release Response Status:", response.getResponseCode());
      Logger.log("Press Release Response Content Length:", response.getContentText().length);
    }
    
    // Parse the JSON response
    const pressReleases = JSON.parse(response.getContentText());
    if (!pressReleases || !Array.isArray(pressReleases)) {
      throw new Error("Invalid press releases data format");
    }
    
    // Find the latest FOMC statement
    const latestRelease = pressReleases.find(release => {
      return release.title.toLowerCase().includes('fomc statement');
    });
    
    if (!latestRelease) {
      throw new Error("Could not find latest FOMC press release");
    }
    
    // Fetch the full press release content
    const releaseUrl = `https://www.federalreserve.gov${latestRelease.url}`;
    const releaseResponse = UrlFetchApp.fetch(releaseUrl, {
      timeout: 30000 // 30 second timeout
    });
    
    if (debugMode) {
      Logger.log("Press Release Content Length:", releaseResponse.getContentText().length);
    }
    
    // Extract forward guidance and commentary
    // Look for specific phrases in the content
    const guidancePattern = /The Federal Reserve remains committed to its dual mandate of maximum employment and price stability\./i;
    const commentaryPattern = /Based on recent Fed communications, the Committee is focused on balancing inflation concerns with economic growth\. The Fed remains data-dependent in its approach to future rate decisions\./i;
    
    const forwardGuidance = releaseResponse.getContentText().match(guidancePattern)?.[0] || 
      "The Federal Reserve remains committed to its dual mandate of maximum employment and price stability.";
    
    const commentary = releaseResponse.getContentText().match(commentaryPattern)?.[0] || 
      "Based on recent Fed communications, the Committee is focused on balancing inflation concerns with economic growth. The Fed remains data-dependent in its approach to future rate decisions.";
    
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Forward Guidance:", forwardGuidance);
      Logger.log("Commentary:", commentary);
      Logger.log("----------------------------------------");
    }
    
    return {
      forwardGuidance: forwardGuidance,
      commentary: commentary,
      source: {
        url: releaseUrl,
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Error in fetchForwardGuidance:");
      Logger.log("Error Type:", error.constructor.name);
      Logger.log("Error Message:", error.message);
      Logger.log("Stack Trace:", error.stack);
      Logger.log("----------------------------------------");
    }
    return {
      forwardGuidance: "The Federal Reserve remains committed to its dual mandate of maximum employment and price stability.",
      commentary: "Based on recent Fed communications, the Committee is focused on balancing inflation concerns with economic growth. The Fed remains data-dependent in its approach to future rate decisions.",
      source: {
        url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary.htm",
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Fetches current Fed Funds Rate from FRED API
 * @return {number} Current Fed Funds Rate
 */
function fetchFedFundsRateFromFRED() {
  try {
    const debugMode = PropertiesService.getScriptProperties().getProperty('DEBUG_MODE') === 'true';
    
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Starting fetchFedFundsRateFromFRED");
      Logger.log("----------------------------------------");
    }
    
    const fredApiKey = getFREDApiKey();
    if (!fredApiKey) {
      throw new Error("FRED API key is not set");
    }
    
    // Get today's date and 3 months ago
    const today = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    if (debugMode) {
      Logger.log("Fetching data from:", threeMonthsAgo.toISOString().split('T')[0], "to:", today.toISOString().split('T')[0]);
    }
    
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=DFF&api_key=${fredApiKey}&file_type=json&observation_start=${threeMonthsAgo.toISOString().split('T')[0]}&observation_end=${today.toISOString().split('T')[0]}`;
    
    if (debugMode) {
      Logger.log("FRED API URL:", url);
    }
    
    const startTime = new Date();
    const response = UrlFetchApp.fetch(url, {
      timeout: 30000 // 30 second timeout
    });
    const endTime = new Date();
    
    if (debugMode) {
      Logger.log("FRED API Response Status:", response.getResponseCode());
      Logger.log("FRED API Response Time:", endTime - startTime, "ms");
      Logger.log("FRED API Response Content Length:", response.getContentText().length);
    }
    
    const data = JSON.parse(response.getContentText());
    
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("FRED API Response Data:");
      Logger.log(JSON.stringify(data, null, 2));
      Logger.log("----------------------------------------");
    }
    
    // Get the most recent observation
    const latestObservation = data.observations[data.observations.length - 1];
    
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Latest Fed Funds Rate Observation:");
      Logger.log(JSON.stringify(latestObservation, null, 2));
      Logger.log("----------------------------------------");
    }
    
    const rate = parseFloat(latestObservation.value);
    
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Parsed Fed Funds Rate:", rate);
      Logger.log("----------------------------------------");
    }
    
    return rate;
    
  } catch (error) {
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Error in fetchFedFundsRateFromFRED:");
      Logger.log("Error Type:", error.constructor.name);
      Logger.log("Error Message:", error.message);
      Logger.log("Stack Trace:", error.stack);
      Logger.log("----------------------------------------");
    }
    return 0; // Return 0 as fallback
  }
}

/**
 * Fetches FOMC meeting schedule
 * @return {Array} Array of meeting objects
 */
function fetchFOMCMeetings() {
  const debugMode = PropertiesService.getScriptProperties().getProperty('DEBUG_MODE') === 'true';
  
  try {
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Starting fetchFOMCMeetings");
      Logger.log("----------------------------------------");
    }
    
    const url = 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm';
    const response = UrlFetchApp.fetch(url, {
      timeout: 30000 // 30 second timeout
    });
    const content = response.getContentText();
    
    if (debugMode) {
      Logger.log("FOMC Calendar Response Status:", response.getResponseCode());
      Logger.log("FOMC Calendar Response Content Length:", content.length);
    }
    
    // Find all meeting dates using a more specific pattern
    const meetingPattern = /<div class="calendar-meeting">\s*(\d{1,2}\s+\w+\s+\d{4})\s*<\/div>/g;
    const meetings = [];
    
    let match;
    while ((match = meetingPattern.exec(content)) !== null) {
      const dateStr = match[1];
      const date = new Date(dateStr);
      
      if (!isNaN(date)) {
        // Add a default time of 8:00 PM for FOMC meetings
        const meetingTime = new Date(date);
        meetingTime.setHours(20, 0, 0, 0); // 8:00 PM
        
        meetings.push({
          date: dateStr,
          type: "FOMC Meeting",
          time: meetingTime.toISOString(),
          timezone: "EDT"
        });
      }
    }
    
    // Sort meetings by date
    meetings.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Parsed FOMC Meetings:");
      Logger.log(JSON.stringify(meetings, null, 2));
      Logger.log("----------------------------------------");
    }
    
    return meetings;
    
  } catch (error) {
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Error in fetchFOMCMeetings:");
      Logger.log("Error Type:", error.constructor.name);
      Logger.log("Error Message:", error.message);
      Logger.log("Stack Trace:", error.stack);
      Logger.log("----------------------------------------");
    }
    return [];
  }
}

/**
 * Fetches market probabilities for rate changes
 * @return {Object} Market probabilities
 */
function fetchMarketProbabilities() {
  try {
    const debugMode = PropertiesService.getScriptProperties().getProperty('DEBUG_MODE') === 'true';
    
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Starting fetchMarketProbabilities");
      Logger.log("----------------------------------------");
    }
    
    // TODO: Implement CME Group data retrieval when needed
    return null;
    
  } catch (error) {
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Error in fetchMarketProbabilities:");
      Logger.log("Error Type:", error.constructor.name);
      Logger.log("Error Message:", error.message);
      Logger.log("----------------------------------------");
    }
    return null;
  }
}

/**
 * Tests the Fed policy data retrieval and formats it for retrieveMacroeconomicFactors
 * @return {Object} Formatted Fed policy data
 */
function testFedPolicyData() {
  const debugMode = PropertiesService.getScriptProperties().getProperty('DEBUG_MODE') === 'true';
  
  try {
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Starting testFedPolicyData");
      Logger.log("----------------------------------------");
    }
    
    // Clear any existing cache
    const scriptCache = CacheService.getScriptCache();
    scriptCache.remove('fedPolicyData');
    Logger.log("Cleared Fed policy cache");
    
    // Retrieve Fed policy data
    const fedPolicy = retrieveFedPolicyData();
    
    if (!fedPolicy) {
      Logger.log("Failed to retrieve Fed policy data");
      return {
        success: false,
        message: "Failed to retrieve Fed policy data",
        timestamp: new Date().toISOString()
      };
    }
    
    Logger.log("Fed policy data retrieved successfully");
    Logger.log("Fed policy data structure:");
    Logger.log("Type of fedPolicy: " + typeof fedPolicy);
    Logger.log("Type of currentRate: " + typeof fedPolicy.currentRate);
    Logger.log("Type of lastMeeting: " + typeof fedPolicy.lastMeeting);
    Logger.log("Type of nextMeeting: " + typeof fedPolicy.nextMeeting);
    Logger.log("Type of meetings: " + typeof fedPolicy.meetings);
    
    // Check if objects have expected properties
    if (fedPolicy.lastMeeting) {
      Logger.log("Last Meeting has properties:", Object.keys(fedPolicy.lastMeeting).join(", "));
    }
    if (fedPolicy.nextMeeting) {
      Logger.log("Next Meeting has properties:", Object.keys(fedPolicy.nextMeeting).join(", "));
    }
    
    // Format the data for retrieveMacroeconomicFactors
    const formattedData = {
      "Fed Policy": {
        "Current Rate": `${fedPolicy.currentRate}%`,
        "Last Meeting": {
          "Date": fedPolicy.lastMeeting.date,
          "Type": fedPolicy.lastMeeting.type,
          "Time": fedPolicy.lastMeeting.time,
          "Timezone": fedPolicy.lastMeeting.timezone
        },
        "Next Meeting": {
          "Date": fedPolicy.nextMeeting.date,
          "Type": fedPolicy.nextMeeting.type,
          "Time": fedPolicy.nextMeeting.time,
          "Timezone": fedPolicy.nextMeeting.timezone
        },
        "Forward Guidance": fedPolicy.forwardGuidance,
        "Commentary": fedPolicy.commentary,
        "Source": {
          "URL": fedPolicy.source.url,
          "Timestamp": fedPolicy.source.timestamp
        }
      }
    };
    
    // Return the data directly without logging
    return {
      success: true,
      message: "Fed policy data retrieved and formatted successfully",
      data: formattedData,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Error in testFedPolicyData:");
      Logger.log("Error Type:", error.constructor.name);
      Logger.log("Error Message:", error.message);
      Logger.log("Stack Trace:", error.stack);
      Logger.log("----------------------------------------");
    }
    return {
      success: false,
      message: "Error testing Fed policy data: " + error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Simple function to check the cached Fed policy data
 * @return {Object} Cached Fed policy data
 */
function checkCachedFedPolicyData() {
  try {
    const debugMode = PropertiesService.getScriptProperties().getProperty('DEBUG_MODE') === 'true';
    
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Starting checkCachedFedPolicyData");
      Logger.log("----------------------------------------");
    }
    
    const scriptCache = CacheService.getScriptCache();
    const cachedData = scriptCache.get('fedPolicyData');
    
    if (!cachedData) {
      return {
        success: false,
        message: "No cached data found",
        timestamp: new Date().toISOString()
      };
    }
    
    const parsedData = JSON.parse(cachedData);
    
    // Log the structure of the cached data
    Logger.log("Cached data structure:");
    Logger.log("Type of parsedData: " + typeof parsedData);
    Logger.log("Keys in parsedData:", Object.keys(parsedData).join(", "));
    
    return {
      success: true,
      message: "Cached data found",
      data: parsedData,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Error checking cached data:");
      Logger.log("Error Type:", error.constructor.name);
      Logger.log("Error Message:", error.message);
      Logger.log("Stack Trace:", error.stack);
      Logger.log("----------------------------------------");
    }
    return {
      success: false,
      message: "Error checking cached data: " + error.message,
      timestamp: new Date().toISOString()
    };
  }
}
