const debugMode = PropertiesService.getScriptProperties().getProperty('DEBUG_MODE') === 'true';

/**
 * Retrieves Fed policy data including current rate and upcoming meetings
 * @return {Object} Fed policy data
 */
function retrieveFedPolicyData() {
  
  try {
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Starting retrieveFedPolicyData");
      Logger.log("----------------------------------------");
    }
    
    // Fetch current Fed Funds Rate
    const fedFundsRate = fetchFedFundsRateFromFRED();
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Fed Funds Rate retrieved:", fedFundsRate);
      Logger.log("----------------------------------------");
    }
    
    // Fetch FOMC meeting schedule
    const meetings = fetchFOMCMeetings();
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Meetings retrieved:", meetings.length);
      Logger.log("----------------------------------------");
    }
    
    const today = new Date();
    const pastMeetings = meetings.meetings.filter(m => new Date(m.date) <= today).sort((a, b) => new Date(b.date) - new Date(a.date));
    const futureMeetings = meetings.meetings.filter(m => new Date(m.date) > today).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const lastMeeting = pastMeetings[0] || {
      date: "No meetings found",
      type: "",
      time: "",
      timezone: ""
    };
    const nextMeeting = futureMeetings[0] || {
      date: "No upcoming meetings",
      type: "",
      time: "",
      timezone: ""
    };

    // Fetch forward guidance and commentary
    const guidance = fetchForwardGuidance();
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Forward guidance retrieved:", guidance.forwardGuidance);
      Logger.log("----------------------------------------");
    }
    
    // Create the data structure
    const fedPolicy = {
      currentRate: fedFundsRate,
      lastMeeting: lastMeeting,
      nextMeeting: nextMeeting,
      meetings: meetings.meetings,
      forwardGuidance: guidance.forwardGuidance,
      commentary: guidance.commentary,
      source: {
        url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary.htm",
        timestamp: new Date().toISOString()
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
    
    // Return a fallback structure with error information
    return {
      currentRate: null,
      lastMeeting: {
        date: "Error retrieving meetings",
        type: "",
        time: "",
        timezone: ""
      },
      nextMeeting: {
        date: "Error retrieving meetings",
        type: "",
        time: "",
        timezone: ""
      },
      meetings: [],
      forwardGuidance: "Error retrieving forward guidance",
      commentary: "Error occurred while retrieving Fed policy data",
      source: {
        url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary.htm",
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Fetches current Fed Funds Rate from FRED API
 * @return {Object} Current Fed Funds Rate with range
 */
function fetchFedFundsRateFromFRED() {
  const debugMode = PropertiesService.getScriptProperties().getProperty('DEBUG_MODE') === 'true';
  
  try {
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Starting fetchFedFundsRateFromFRED");
      Logger.log("----------------------------------------");
    }
    
    const apiKey = getFREDApiKey();
    if (!apiKey) {
      throw new Error('FRED_API_KEY not found in script properties');
    }
    
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`;
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true
    });
    
    if (debugMode) {
      Logger.log("FRED API Response Status:", response.getResponseCode());
      Logger.log("FRED API Response Content Length:", response.getContentText().length);
    }

    const json = JSON.parse(response.getContentText());
    const observations = json.observations;
    
    if (observations && observations.length > 0) {
      const latestValue = parseFloat(observations[0].value);
      if (debugMode) {
        Logger.log("----------------------------------------");
        Logger.log("Latest Fed Funds Rate Observation:");
        Logger.log(JSON.stringify(observations[0], null, 2));
        Logger.log("----------------------------------------");
      }
      
      return {
        currentRate: latestValue.toFixed(2),
        rangeLow: (Math.floor(latestValue * 4) / 4).toFixed(2),
        rangeHigh: (Math.ceil(latestValue * 4) / 4).toFixed(2)
      };
    }
    
    throw new Error('No observations found in FRED API response');
    
  } catch (error) {
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Error in fetchFedFundsRateFromFRED:");
      Logger.log("Error Type:", error.constructor.name);
      Logger.log("Error Message:", error.message);
      Logger.log("Stack Trace:", error.stack);
      Logger.log("----------------------------------------");
    }
    return null;
  }
}

/**
 * Gets elements by class name using XmlService.
 * @param {XmlService.Element} element The element to search within.
 * @param {string} className The class name to search for.
 * @param {XmlService.Namespace} ns The XML namespace.
 * @return {Array<XmlService.Element>} Array of matching elements.
 */
function getElementsByClassName(element, className, ns) {
  let elements = [];

  const classAttr = element.getAttribute('class', ns);
  if (classAttr && classAttr.getValue().split(' ').includes(className)) {
    elements.push(element);
  }

  const children = element.getChildren(ns);
  children.forEach(child => {
    elements = elements.concat(getElementsByClassName(child, className, ns));
  });

  return elements;
}

/**
 * Preprocesses HTML to make it well-formed for XML parsing.
 * @param {string} html The HTML content to preprocess.
 * @return {string} The preprocessed HTML content.
 */
function preprocessHTML(html) {
  try {
    // Remove the DOCTYPE declaration and any leading whitespace
    html = html.replace(/^.*\n/, '');
    
    // Remove any BOM characters
    html = html.replace(/\ufeff/g, '');
    
    // Add proper XML declaration with quoted version
    html = '<?xml version="1.0" encoding="UTF-8"?>\n' + html;
    
    // Add proper namespace declaration
    if (!html.includes('xmlns="http://www.w3.org/1999/xhtml"')) {
      html = html.replace(/<html[^>]*>/i, '<html xmlns="http://www.w3.org/1999/xhtml">');
    }
    
    // Clean up any malformed attributes
    html = html.replace(/\s+/g, ' ');
    html = html.replace(/\s*=[\s"]+/g, '=');
    
    // Remove any invalid characters
    html = html.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    
    // Remove any remaining DOCTYPE declarations
    html = html.replace(/<!DOCTYPE[^>]*>/gi, '');
    
    // Remove any script tags that might cause parsing issues
    html = html.replace(/<script[^>]*>.*?<\/script>/gi, '');
    
    return html;
  } catch (error) {
    Logger.log('Error in preprocessHTML: ' + error);
    return html;
  }
}

/**
 * Parses FOMC meeting data from HTML content using regex.
 * @param {string} htmlContent The HTML content to parse.
 * @return {Object} A structured object containing FOMC meeting information.
 */
function parseFedMeetingsFromHTML(htmlContent) {
  const years = [];
  
  // Extract panels for each year
  const panelRegex = /<div class="panel panel-default">([\s\S]*?)<div class="panel-footer">/g;
  let panelMatch;
  
  while ((panelMatch = panelRegex.exec(htmlContent)) !== null) {
    const panelContent = panelMatch[1];
    const yearMatch = panelContent.match(/<h4><a[^>]*>(\d{4}) FOMC Meetings<\/a><\/h4>/);
    if (!yearMatch) continue;
    
    const year = yearMatch[1];
    const meetings = [];
    
    // Extract individual meetings
    const meetingRegex = /<div class="row fomc-meeting[\s\S]*?<\/div>\s*<\/div>/g;
    let meetingMatch;
    
    while ((meetingMatch = meetingRegex.exec(panelContent)) !== null) {
      const meetingHtml = meetingMatch[0];
      
      // Extract month
      const monthMatch = meetingHtml.match(/<div class="fomc-meeting__month[^>]*>.*?<strong>([^<]+)<\/strong>/);
      const month = monthMatch ? monthMatch[1].trim() : '';
      
      // Extract date and check for projection
      const dateMatch = meetingHtml.match(/<div class="fomc-meeting__date[^>]*>([\s\S]*?)<\/div>/);
      let date = dateMatch ? dateMatch[1].replace(/\*/g, '').trim() : '';
      const hasProjection = dateMatch ? dateMatch[1].includes('*') : false;
      
      meetings.push({
        month: month,
        date: date,
        hasProjection: hasProjection
      });
    }
    
    years.push({
      year: year,
      meetings: meetings
    });
  }
  
  // Convert to our desired format
  const meetingsByYear = {};
  years.forEach(yearObj => {
    meetingsByYear[yearObj.year] = yearObj.meetings;
  });
  
  Logger.log("Meetings parsed: " + JSON.stringify(meetingsByYear, null, 2));
  return meetingsByYear;
}

/**
 * Fetches FOMC meeting information from the Federal Reserve website.
 * @return {Object} FOMC meeting data including last and next meetings, and all meetings.
 */
function fetchFOMCMeetings() {
  try {
    const url = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm";
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`Failed to fetch FOMC calendar: ${response.getResponseCode()}`);
    }

    const html = response.getContentText();
    const rawMeetings = parseFedMeetingsFromHTML(html);
    let meetings = [];

    // Convert the parsed data into our desired format
    Object.entries(rawMeetings).forEach(([year, yearMeetings]) => {
      yearMeetings.forEach(meeting => {
        const dateRange = meeting.date;
        const dayMatch = dateRange.match(/^\s*(\d{1,2})/);
        if (!dayMatch) return;
        
        const day = dayMatch[1];
        const meetingDateStr = `${meeting.month} ${day}, ${year} 14:00 EDT`;
        const meetingDate = new Date(meetingDateStr);
        
        if (isNaN(meetingDate.getTime())) return;

        meetings.push({
          date: meetingDate.toISOString(),
          type: "FOMC Meeting",
          time: "14:00",
          timezone: "EDT",
          fullText: `FOMC Meeting - ${meeting.month} ${dateRange} ${year}`
        });
      });
    });

    // Sort meetings by date (newest first)
    meetings.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      meetings: meetings,
      lastMeeting: meetings.length > 0 ? meetings[0] : {
        date: "No meetings found",
        type: "",
        time: "",
        timezone: ""
      },
      nextMeeting: meetings.length > 0 ? meetings[meetings.length - 1] : {
        date: "No upcoming meetings",
        type: "",
        time: "",
        timezone: ""
      }
    };
  } catch (error) {
    Logger.log('Error in fetchFOMCMeetings: ' + error);
    return {
      meetings: [],
      lastMeeting: {
        date: "No meetings found",
        type: "",
        time: "",
        timezone: ""
      },
      nextMeeting: {
        date: "No upcoming meetings",
        type: "",
        time: "",
        timezone: ""
      }
    };
  }
}

/**
 * Fetches forward guidance and commentary from the latest Fed press release
 * @return {Object} Forward guidance and commentary
 */
function fetchForwardGuidance() {
  try {
    const meetings = fetchFOMCMeetings();
    if (meetings.length === 0) {
      throw new Error("No meetings found");
    }

    // Sort meetings by date (newest first)
    meetings.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    });

    const latestMeeting = meetings[0];
    if (!latestMeeting.minutesUrl) {
      throw new Error("Latest meeting has no minutes URL");
    }

    // Fetch the minutes page
    const minutesResponse = UrlFetchApp.fetch(latestMeeting.minutesUrl, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (minutesResponse.getResponseCode() !== 200) {
      throw new Error(`Failed to fetch minutes: ${minutesResponse.getResponseCode()}`);
    }

    const minutesHtml = minutesResponse.getContentText();

    // Look for the forward guidance section
    const guidanceRegex = /<p>.*?The Committee expects.*?to maintain this target range.*?until.*?it is confident.*?that the economy has.*?achieved its maximum employment and price stability goals.*?<\/p>/i;
    const guidanceMatch = minutesHtml.match(guidanceRegex);

    if (guidanceMatch) {
      const guidance = guidanceMatch[0].replace(/<.*?>/g, '').trim();
      return {
        forwardGuidance: guidance,
        commentary: `Forward guidance from FOMC minutes (${latestMeeting.date})`
      };
    }

    // Fallback to default guidance if not found
    return {
      forwardGuidance: "Based on recent Fed communications, the Committee is focused on balancing inflation concerns with economic growth. The Fed remains data-dependent in its approach to future rate decisions.",
      commentary: "Default forward guidance (forward guidance not found in minutes)"
    };

  } catch (error) {
    Logger.log("Error in fetchForwardGuidance:", error);
    return {
      forwardGuidance: "Error retrieving forward guidance",
      commentary: `Error occurred while fetching forward guidance: ${error.message}`
    };
  }
}

/**
 * Cleans up HTML by removing invalid characters and making it well-formed.
 * @param {string} htmlString The HTML string to clean.
 * @return {string} Cleaned HTML string.
 */
function cleanHtml(htmlString) {
  // Remove any BOM characters
  htmlString = htmlString.replace(/\ufeff/g, '');
  
  // Replace invalid characters
  htmlString = htmlString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  
  // Add missing HTML tags if needed
  if (!htmlString.match(/<html/i)) {
    htmlString = '<html>' + htmlString + '</html>';
  }
  if (!htmlString.match(/<body/i)) {
    htmlString = htmlString.replace(/<html>/i, '<html><body>');
    htmlString = htmlString.replace(/<\/html>/i, '</body></html>');
  }
  
  return htmlString;
}

/**
 * Recursively converts an XML element (using XmlService) into a JSON object.
 * @param {XmlService.Element|XmlService.Text} xml The XML object to convert.
 * @return {Object|string} The JSON representation.
 */
function xmlToJson(xml) {
  try {
    if (!xml) return null;
    
    // If the node has no children, return its text content.
    if (!xml.hasChildNodes()) {
      return xml.getText();
    }
    
    var obj = {};
    var children = xml.getChildNodes();
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      var nodeType = child.getType();
      if (nodeType === XmlService.ContentTypes.TEXT) {
        // Ignore whitespace; if needed, you can trim it.
        var text = child.getText().trim();
        if (text) {
          return text;
        }
      } else if (nodeType === XmlService.ContentTypes.ELEMENT) {
        var nodeName = child.getName();
        var childJson = xmlToJson(child);
        if (obj[nodeName] === undefined) {
          obj[nodeName] = childJson;
        } else {
          // If there are multiple children with the same name, accumulate them into an array.
          if (!Array.isArray(obj[nodeName])) {
            obj[nodeName] = [obj[nodeName]];
          }
          obj[nodeName].push(childJson);
        }
      }
    }
    return obj;
  } catch (e) {
    Logger.log("Error in xmlToJson: " + e);
    return null;
  }
}

/**
 * Parses HTML (or well-formed XML) into a JSON object.
 * @param {string} htmlString The HTML string to parse.
 * @return {Object} The JSON object representation.
 */
function convertHtmlToJson(htmlString) {
  try {
    // Clean the HTML first
    htmlString = cleanHtml(htmlString);
    
    // Parse the HTML using XmlService
    var document = XmlService.parse(htmlString);
    var root = document.getRootElement();
    return xmlToJson(root);
  } catch (e) {
    Logger.log("Error parsing HTML: " + e);
    // Try to extract useful information even if parsing fails
    var tempObj = {
      rawHtml: htmlString,
      error: e.toString()
    };
    return tempObj;
  }
}

/**
 * Safely accesses nested properties in an object.
 * @param {Object} obj The object to access.
 * @param {string[]} path Array of property names to access.
 * @param {*} defaultValue Default value to return if property doesn't exist.
 * @return {*} The value at the specified path or the default value.
 */
function safeGet(obj, path, defaultValue = null) {
  try {
    return path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : defaultValue), obj);
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Parses FOMC meeting data from the Federal Reserve calendar page.
 * @param {string} htmlString The HTML string containing the FOMC calendar.
 * @return {Object} A structured object containing FOMC meeting information.
 */
function parseFOMCCalendar(htmlString) {
  var meetings = [];
  
  try {
    // First, find all panels containing FOMC meeting information
    const panelRegex = /<div class="panel panel-default">(.*?)<\/div>\s*<\/div>/gs;
    let panelMatch;
    while ((panelMatch = panelRegex.exec(htmlString)) !== null) {
      const panelBlock = panelMatch[1];

      // Extract the year from the panel heading
      const yearRegex = /<h4>\s*<a [^>]+>(\d{4})\s+FOMC Meetings<\/a>/i;
      const yearMatch = yearRegex.exec(panelBlock);
      if (!yearMatch) continue;
      const panelYear = yearMatch[1];

      // Now extract each meeting row within this panel
      const rowRegex = /<div class="row\s+fomc-meeting(?:--shaded)?"[^>]*>(.*?)<\/div>\s*<\/div>/gs;
      let meetingMatch;
      while ((meetingMatch = rowRegex.exec(panelBlock)) !== null) {
        const rowHtml = meetingMatch[1];

        // Extract the month from the cell with class "fomc-meeting__month"
        const monthRegex = /<div class="fomc-meeting__month[^"]*"><strong>([^<]+)<\/strong><\/div>/i;
        const monthMatch = monthRegex.exec(rowHtml);
        if (!monthMatch) continue;
        const month = monthMatch[1].trim();

        // Extract the date range from the cell with class "fomc-meeting__date"
        const dateRangeRegex = /<div class="fomc-meeting__date[^"]*">([^<]+)<\/div>/i;
        const dateRangeMatch = dateRangeRegex.exec(rowHtml);
        if (!dateRangeMatch) continue;
        const dateRange = dateRangeMatch[1].trim(); // e.g., "6-7" or "28-29"

        // Get the first (starting) day from the date range.
        const dayRegex = /^(\d{1,2})/;
        const dayMatch = dayRegex.exec(dateRange);
        if (!dayMatch) continue;
        const day = dayMatch[1];

        // Build the meeting date string (assume meeting starts at 14:00 EDT).
        const meetingDateStr = `${month} ${day}, ${panelYear} 14:00 EDT`;
        const meetingDate = new Date(meetingDateStr);
        if (isNaN(meetingDate.getTime())) continue;

        meetings.push({
          date: meetingDate.toISOString(),
          type: "FOMC Meeting",
          time: "14:00",
          timezone: "EDT",
          fullText: `FOMC Meeting - ${month} ${dateRange} ${panelYear}`
        });
      }
    }
  
    Logger.log("Meetings parsed: " + JSON.stringify(meetings, null, 2));
    return meetings;
  } catch (error) {
    Logger.log("Error parsing FOMC calendar: " + error);
    return {
      meetings: [],
      lastMeeting: null,
      nextMeeting: null
    };
  }
}

/**
 * Helper function to convert month names to numbers
 * @param {string} monthName Month name (e.g., "January", "Jan/Feb")
 * @return {string} Month number (01-12)
 */
function parseMonth(monthName) {
  const monthMap = {
    'January': '01', 'Jan/Feb': '01',
    'February': '02',
    'March': '03',
    'April': '04',
    'May': '05',
    'June': '06',
    'July': '07',
    'August': '08',
    'September': '09',
    'October': '10',
    'November': '11',
    'December': '12'
  };
  return monthMap[monthName] || '01';
}

/**
 * Parses dates from the Fed's website
 * @param {string} rawDate Raw date string from the website
 * @return {string} ISO-formatted date string or null if invalid
 */
function parseMeetingDate(rawDate) {
  try {
    const dateParts = rawDate.split("-");
    const endDate = dateParts[1] ? dateParts[1] : dateParts[0];
    const fullDate = endDate.trim().match(/\w+ \d{1,2}, \d{4}/)[0];
    const dateObj = new Date(fullDate + " 14:00 EDT");
    return isNaN(dateObj) ? null : dateObj.toISOString();
  } catch (error) {
    Logger.log("Error parsing meeting date:", error);
    return null;
  }
}

/**
 * Formats date to readable format
 * @param {string} dateStr Date string to format
 * @return {string} Formatted date string
 */
function formatMeetingDate(dateStr) {
  if (dateStr === "No meetings found" || dateStr === "No upcoming meetings") {
    return dateStr;
  }
  
  try {
    const date = new Date(dateStr);
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    };
    return date.toLocaleDateString('en-US', options);
  } catch (error) {
    Logger.log("Error formatting meeting date:", error);
    return "Invalid date format";
  }
}

/**
 * Retrieves the FRED API key from script properties
 * @return {string} FRED API key
 */
function getFREDApiKey() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const apiKey = scriptProperties.getProperty('FRED_API_KEY');
  
  if (!apiKey) {
    throw new Error('FRED_API_KEY not found in script properties');
  }
  
  return apiKey;
}

/**
 * One-time setup: Securely store FRED API Key (run manually once)
 */
function setFredApiKey() {
  const apiKey = 'YOUR_API_KEY_HERE'; // Replace with your actual FRED API key
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('FRED_API_KEY', apiKey);
  Logger.log('FRED API key stored securely.');
}

/**
 * Tests the Fed policy data retrieval and formats it for retrieveMacroeconomicFactors
 * @return {Object} Formatted Fed policy data
 */
function testFedPolicyData() {
  
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
  const scriptCache = CacheService.getScriptCache();
  const cachedData = scriptCache.get('fedPolicyData');
  
  if (cachedData) {
    Logger.log("Found cached Fed policy data");
    return JSON.parse(cachedData);
  } else {
    Logger.log("No cached Fed policy data found");
    return null;
  }
}

/**
 * Test function to verify FOMC meetings retrieval
 */
function testFetchFOMCMeetings() {
  try {
    const result = fetchFOMCMeetings();
    const meetings = result.meetings;
    
    Logger.log("----------------------------------------");
    Logger.log("FOMC Meetings Data:");
    Logger.log("----------------------------------------");
    
    // Log parsed meetings
    Logger.log("Parsed Meetings:");
    Logger.log(JSON.stringify(meetings, null, 2));
    
    // Log last and next meetings
    Logger.log("\nLast Meeting:");
    Logger.log(JSON.stringify(result.lastMeeting, null, 2));
    
    Logger.log("\nNext Meeting:");
    Logger.log(JSON.stringify(result.nextMeeting, null, 2));
    
    // Log source information
    Logger.log("\nSource Information:");
    Logger.log("URL:", result.source?.url || "N/A");
    Logger.log("Timestamp:", result.source?.timestamp || "N/A");
    
    Logger.log("----------------------------------------");
    Logger.log("Test completed successfully");
    Logger.log("----------------------------------------");
    
    return result;
    
  } catch (error) {
    Logger.log("----------------------------------------");
    Logger.log("Error in testFetchFOMCMeetings:");
    Logger.log("Error Type:", error.constructor.name);
    Logger.log("Error Message:", error.message);
    Logger.log("Stack Trace:", error.stack);
    Logger.log("----------------------------------------");
    
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Fetches market probabilities for rate changes
 * @return {Object} Market probabilities
 */
function fetchMarketProbabilities() {
  // Static probabilities for demonstration
  return {
    increase: "5%",
    hold: "80%",
    decrease: "15%"
  };
}

/**
 * Gets the next scheduled FOMC meeting from the meetings array
 * @param {Array} meetings Array of meeting objects
 * @return {Object} Next meeting information
 */
function getNextMeeting(meetings) {
  const today = new Date();
  const gracePeriod = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
  
  // Sort meetings by date in ascending order
  const sortedMeetings = meetings.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Find the first meeting that is after today or within grace period
  for (let i = 0; i < sortedMeetings.length; i++) {
    const meetingDate = new Date(sortedMeetings[i].date);
    if (meetingDate - today <= gracePeriod) {
      return sortedMeetings[i];
    }
  }
  
  // If no upcoming meeting found within grace period, return the first future meeting
  if (sortedMeetings.length > 0) {
    return sortedMeetings[0];
  }
  
  return {
    date: "No upcoming meetings",
    type: "",
    time: "",
    timezone: ""
  };
}
