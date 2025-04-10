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
    
    // Fetch the FOMC press releases page
    const pressReleasesUrl = 'https://www.federalreserve.gov/newsevents/pressreleases/monetary.htm';
    const response = UrlFetchApp.fetch(pressReleasesUrl, {
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (debugMode) {
      Logger.log("Press Release Response Status:", response.getResponseCode());
      Logger.log("Press Release Response Content Length:", response.getContentText().length);
    }
    
    const content = response.getContentText();
    
    // Extract the latest FOMC statement link
    const latestStatementPattern = /<a href="(\/newsevents\/pressreleases\/monetary\d{8}a\.htm)"[^>]*>FOMC statement/i;
    const latestMatch = latestStatementPattern.exec(content);
    
    if (!latestMatch) {
      throw new Error("Could not find latest FOMC statement");
    }
    
    // Fetch the latest statement content
    const statementUrl = `https://www.federalreserve.gov${latestMatch[1]}`;
    const statementResponse = UrlFetchApp.fetch(statementUrl, {
      timeout: 30000 // 30 second timeout
    });
    
    if (debugMode) {
      Logger.log("Statement Content Length:", statementResponse.getContentText().length);
    }
    
    const statementContent = statementResponse.getContentText();
    
    // Extract forward guidance and commentary
    // Look for specific sections in the statement
    const guidancePattern = /Committee's policy of maintaining the target range for the federal funds rate at ([\d.]+) to ([\d.]+) percent/i;
    const guidanceMatch = guidancePattern.exec(statementContent);
    
    const forwardGuidance = guidanceMatch ? 
      `The Federal Reserve is maintaining the target range for the federal funds rate at ${guidanceMatch[1]} to ${guidanceMatch[2]} percent.` :
      "The Federal Reserve remains committed to its dual mandate of maximum employment and price stability.";
    
    // Extract key economic indicators mentioned
    const economicIndicators = [];
    const indicatorPatterns = [
      /employment has continued to strengthen/i,
      /inflation has been elevated/i,
      /economic activity has been increasing at a moderate pace/i
    ];
    
    indicatorPatterns.forEach(pattern => {
      if (pattern.test(statementContent)) {
        economicIndicators.push(pattern.toString().match(/\/(.+)\/i/)[1]);
      }
    });
    
    const commentary = economicIndicators.length > 0 ?
      `The Committee notes that ${economicIndicators.join(', ')}. The Fed remains data-dependent in its approach to future rate decisions.` :
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
        url: statementUrl,
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
  const url = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm";
  const debugMode = PropertiesService.getScriptProperties().getProperty('DEBUG_MODE') === 'true';
  
  try {
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Starting fetchFOMCMeetings");
      Logger.log("URL:", url);
      Logger.log("----------------------------------------");
    }
    
    // Fetch the page content
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("HTTP Response Status:", response.getResponseCode());
      Logger.log("HTTP Response Content Length:", response.getContentText().length);
      Logger.log("----------------------------------------");
    }

    const content = response.getContentText();

    // Extract meeting data using regex
    const regex = /<a\s+href="(\/newsevents\/pressreleases\/monetary\d{8}a\.htm)"[^>]*>(?:PDF|HTML)<\/a>/g;
    const meetings = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      const link = "https://www.federalreserve.gov" + match[1];
      
      // Extract the date from the URL
      const dateMatch = /monetary(\d{8})a/.exec(link);
      if (dateMatch) {
        const dateStr = dateMatch[1];
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const date = new Date(year, month - 1, day);
        
        if (!isNaN(date.getTime())) {
          meetings.push({
            date: date.toISOString().split('T')[0],
            title: "FOMC Meeting - " + date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            link: link
          });
        }
      }
    }

    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Retrieved " + meetings.length + " meeting(s)");
      if (meetings.length > 0) {
        meetings.forEach((meeting, index) => {
          Logger.log((index + 1) + ". " + meeting.title + " -> " + meeting.link);
        });
      }
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
 * Test function to verify FOMC meetings retrieval
 */
function testFetchFOMCMeetings() {
  const meetings = fetchFOMCMeetings();
  if (meetings.length > 0) {
    Logger.log("----------------------------------------");
    Logger.log("Found " + meetings.length + " FOMC meetings:");
    meetings.forEach((meeting, index) => {
      Logger.log((index + 1) + ". " + meeting.title + " -> " + meeting.link);
    });
    Logger.log("----------------------------------------");
  } else {
    Logger.log("No FOMC meetings were retrieved.");
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
