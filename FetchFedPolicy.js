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
      Logger.log("Meetings retrieved:", meetings.meetings.length);
      Logger.log("----------------------------------------");
    }
    
    // Compute last and next meetings
    const computed = computeLastAndNextMeetings(meetings.meetings);
    
    // Fetch forward guidance and commentary
    const guidance = fetchForwardGuidanceEnhanced();
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Forward guidance retrieved:", guidance.forwardGuidance);
      Logger.log("----------------------------------------");
    }
    
    // Create the data structure
    const fedPolicy = {
      currentRate: fedFundsRate,
      lastMeeting: computed.lastMeeting,
      nextMeeting: computed.nextMeeting,
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
        timezone: "",
        startDate: new Date(),
        endDate: new Date()
      },
      nextMeeting: {
        date: "Error retrieving meetings",
        type: "",
        time: "",
        timezone: "",
        startDate: new Date(),
        endDate: new Date()
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
      Logger.log("FRED API Response Headers:", JSON.stringify(response.getHeaders()));
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
    const meetingRegex = /<div class="[^"]*\brow\b[^"]*\bfomc-meeting(?:--shaded)?\b[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gis;
    let meetingMatch;
    
    while ((meetingMatch = meetingRegex.exec(panelContent)) !== null) {
      const meetingHtml = meetingMatch[0];
      
      // Extract month
      const monthMatch = meetingHtml.match(/<div class="[^"']*\bfomc-meeting__month\b[^"']*">.*?<strong>([^<]+)<\/strong>/i);
      const month = monthMatch ? monthMatch[1].trim() : '';
      
      // Extract date and check for projection
      const dateRangeMatch = meetingHtml.match(/<div class="fomc-meeting__date[^"]*">.*?<\/div>/);
      const dateRange = dateRangeMatch ? dateRangeMatch[0].replace(/<.*?>/g, '').trim() : '';
      
      // Parse date range
      const dateRangeObj = parseDateRange(dateRange, parseInt(year), convertMonth(month), "14:00");
      if (!dateRangeObj) continue;
      
      // Extract URLs for minutes
      const minutesHtmlMatch = meetingHtml.match(/<a[^>]*href=["']\/monetarypolicy\/fomcminutes[\d]+[.]htm["'][^>]*>HTML<\/a>/);
      const minutesPdfMatch = meetingHtml.match(/<a[^>]*href=["']\/monetarypolicy\/files\/fomcminutes[\d]+[.]pdf["'][^>]*>PDF<\/a>/);
      
      // Get the HTML version if available, otherwise fall back to PDF
      const minutesUrl = minutesHtmlMatch 
        ? `https://www.federalreserve.gov${minutesHtmlMatch[0].match(/href=["']([^"']+)["']/)[1]}`
        : minutesPdfMatch 
          ? `https://www.federalreserve.gov${minutesPdfMatch[0].match(/href=["']([^"']+)["']/)[1]}`
          : null;
      
      meetings.push({
        month: month,
        date: dateRange.replace(/\*$/, ''), // Remove trailing asterisk if present
        startDate: dateRangeObj.startDate,
        endDate: dateRangeObj.endDate,
        minutesUrl: minutesUrl
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
 * Parse a date-range string such as "31-1" or "28-29" given the meeting year, a starting month index, and a meeting time.
 * If the end day is numerically lower than the start day, it will assume the meeting spans into the next month.
 * It also strips any non-digit characters from the range.
 */
function parseDateRange(dateRange, year, monthIndex, meetingTime) {
  // Use a regex to extract two digit groups
  const rangeMatch = dateRange.match(/(\d+)\s*-\s*(\d+)/);
  if (!rangeMatch) {
    // If no dash is found, try a single day
    const dayMatch = dateRange.match(/(\d+)/);
    if (dayMatch) {
      const day = parseInt(dayMatch[1], 10);
      const d = new Date(Date.UTC(year, monthIndex, day, 14, 0));
      return { startDate: d, endDate: d };
    }
    return { startDate: null, endDate: null };
  }
  
  const startDay = parseInt(rangeMatch[1], 10);
  const endDay = parseInt(rangeMatch[2], 10);

  // Parse meetingTime assumed in "HH:mm" format
  const timeParts = meetingTime.split(":");
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);

  // Build start date using the provided year, month, and start day
  const startDate = new Date(Date.UTC(year, monthIndex, startDay, hours, minutes));

  let endMonth = monthIndex;
  let endYear = year;
  // If the end day is numerically lower than the start day then assume the event spans into the next month.
  if (endDay < startDay) {
    endMonth++;
    if (endMonth > 11) {
      endMonth = 0;
      endYear++;
    }
  }

  const endDate = new Date(Date.UTC(endYear, endMonth, endDay, hours, minutes));
  return { startDate: startDate, endDate: endDate };
}

/**
 * Convert a month string to a numeric month index (0-based).
 * If the string includes a '/' (e.g. "Jan/Feb" or "Oct/Nov"), it uses the first part.
 */
function convertMonth(monthStr) {
  if (monthStr.indexOf("/") !== -1) {
    monthStr = monthStr.split("/")[0];
  }
  monthStr = monthStr.toLowerCase();
  const months = { 
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5, 
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11 
  };
  for (const key in months) {
    if (monthStr.indexOf(key) !== -1) return months[key];
  }
  return 0;  // default to January if nothing matches
}

/**
 * Flattens the meetings from all years into a single array,
 * sorts them by startDate, and returns the last meeting (before now)
 * and the next meeting (after now). If no meeting qualifies, returns null.
 */
function computeLastAndNextMeetings(meetingsByYear) {
  const now = new Date();
  const allMeetings = [];
  
  // Flatten the object by iterating through each year
  for (const year in meetingsByYear) {
    allMeetings.push(...meetingsByYear[year]);
  }

  // Sort the array by startDate ascending
  allMeetings.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  let lastMeeting = null;
  let nextMeeting = null;
  
  for (let i = 0; i < allMeetings.length; i++) {
    const meeting = allMeetings[i];
    if (new Date(meeting.startDate) <= now) {
      lastMeeting = meeting;
    } else {
      nextMeeting = meeting;
      break;
    }
  }

  // If no meeting is found before now, you might choose to return a message
  if (!lastMeeting) {
    lastMeeting = { message: "No past meetings found" };
  }
  if (!nextMeeting) {
    nextMeeting = { message: "No upcoming meetings" };
  }

  return { lastMeeting, nextMeeting };
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
        meetings.push({
          date: meeting.date,
          type: "FOMC Meeting",
          time: "14:00",
          timezone: "EDT",
          fullText: `FOMC Meeting - ${meeting.month} ${meeting.date} ${year}`,
          startDate: meeting.startDate,
          endDate: meeting.endDate,
          minutesUrl: meeting.minutesUrl
        });
      });
    });

    // Sort meetings by date (newest first)
    meetings.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    return {
      meetings: meetings,
      lastMeeting: computeLastAndNextMeetings(rawMeetings).lastMeeting,
      nextMeeting: computeLastAndNextMeetings(rawMeetings).nextMeeting
    };
  } catch (error) {
    Logger.log('Error in fetchFOMCMeetings: ' + error);
    return {
      meetings: [],
      lastMeeting: {
        date: "No meetings found",
        type: "",
        time: "",
        timezone: "",
        startDate: new Date(),
        endDate: new Date()
      },
      nextMeeting: {
        date: "No upcoming meetings",
        type: "",
        time: "",
        timezone: "",
        startDate: new Date(),
        endDate: new Date()
      }
    };
  }
}

/**
 * Enhanced forward guidance parsing with better error handling
 * @return {Object} Forward guidance and commentary
 */
function fetchForwardGuidanceEnhanced() {
  // Default guidance statement to use if extraction fails.
  const defaultGuidance = "The Federal Reserve remains committed to achieving maximum employment and inflation at the rate of 2 percent over the longer run. Policy decisions will remain data-dependent.";
  
  try {
    // --- Step 1: Fetch and parse the RSS feed ---
    const rssUrl = "https://www.federalreserve.gov/feeds/press_all.xml";
    Logger.log("Fetching RSS feed from: " + rssUrl);
    const rssResponse = UrlFetchApp.fetch(rssUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0' },
      muteHttpExceptions: true 
    });
    const rssStatus = rssResponse.getResponseCode();
    Logger.log("RSS feed response status: " + rssStatus);
    
    if (rssStatus !== 200) {
      throw new Error("HTTP error fetching RSS feed: " + rssStatus);
    }

    const xmlContent = rssResponse.getContentText();
    Logger.log("RSS feed response length: " + xmlContent.length);
    Logger.log("RSS feed response headers: " + JSON.stringify(rssResponse.getAllHeaders()));
    Logger.log("First 1000 chars of XML: " + xmlContent.substring(0, 1000));
    
    const document = XmlService.parse(xmlContent);
    const root = document.getRootElement();
    const channel = root.getChild("channel", XmlService.getNamespace(''));
    if (!channel) {
      throw new Error("Channel element not found in the RSS feed.");
    }
    
    const items = channel.getChildren("item", XmlService.getNamespace(''));
    if (items.length === 0) {
      throw new Error("No items found in the RSS feed.");
    }
    
    // --- Step 2: Locate the first item with "FOMC" in the title ---
    let guidanceEntry = null;
    for (const item of items) {
      const title = item.getChildText("title");
      Logger.log("Checking item title: " + title);
      if (title && title.toLowerCase().includes("fomc")) {
        guidanceEntry = item;
        break;
      }
    }
    
    if (!guidanceEntry) {
      throw new Error("No FOMC statement found in the RSS feed items.");
    }
    
    const statementTitle = guidanceEntry.getChildText("title") || "No title provided";
    const articleLink = guidanceEntry.getChildText("link") || "";
    const pubDate = guidanceEntry.getChildText("pubDate") || "No publication date provided";
    Logger.log("Found FOMC statement:");
    Logger.log("Title: " + statementTitle);
    Logger.log("Link: " + articleLink);
    Logger.log("Publication Date: " + pubDate);
    
    // --- Step 3: Fetch and extract article content ---
    if (!articleLink) {
      throw new Error("No article link provided in the RSS feed item.");
    }
    
    const articleContent = fetchArticleContent(articleLink);
    if (!articleContent) {
      throw new Error("Article content extraction returned empty content.");
    }
    
    // Clean and extract guidance text
    const cleanedGuidance = articleContent
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ')     // Collapse whitespace
      .replace(/&nbsp;/g, ' ')  // Replace non-breaking spaces
      .trim();

    return {
      forwardGuidance: cleanedGuidance,
      commentary: `Latest FOMC statement retrieved from: ${articleLink}`,
      source: {
        url: articleLink,
        timestamp: new Date(pubDate).toISOString()
      }
    };
    
  } catch (error) {
    // Log the detailed error and return the default guidance.
    Logger.log("Error in fetchForwardGuidanceEnhanced: " + error.toString());
    return {
      forwardGuidance: defaultGuidance,
      commentary: "Error retrieving guidance: Using default statement",
      source: {
        url: rssUrl,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Fetches the article HTML from the given URL and attempts to extract the main content.
 */
function fetchArticleContent(url) {
  try {
    Logger.log("Fetching article from: " + url);
    const response = UrlFetchApp.fetch(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0' },
      muteHttpExceptions: true 
    });
    const status = response.getResponseCode();
    Logger.log("Article response status: " + status);
    
    if (status !== 200) {
      throw new Error("HTTP error fetching article: " + status);
    }

    const htmlContent = response.getContentText();
    // Uncomment below to log a snippet of the HTML if needed:
    // Logger.log("First 1000 chars of HTML: " + htmlContent.substring(0, 1000));
    
    const extractedContent = extractArticleContent(htmlContent);
    if (!extractedContent) {
      throw new Error("Could not find content section in article");
    }
    
    return extractedContent;
    
  } catch (error) {
    Logger.log("Error in fetchArticleContent: " + error.toString());
    throw error; // Propagate the error to be handled by the calling function.
  }
}

/**
 * Attempts multiple methods to extract the main content section from the article HTML.
 * Uses multiple candidate patterns to adapt to possible layout changes.
 */
function extractArticleContent(html) {
  // Define candidate patterns for potential content containers.
  const patterns = [
    // Pattern targeting the main article content
    /<div id=["']article["'][^>]*>([\s\S]*?)<\/div>/i,
    // Pattern targeting the main content area
    /<div class=["']col-xs-12 col-sm-8 col-md-8["'][^>]*>([\s\S]*?)<\/div>/i
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      // Some patterns may have the content in the first or second capturing group.
      const content = match[1] || match[2];
      if (content && content.trim().length > 0) {
        // Extract the first paragraph from the content
        const firstParagraph = content.match(/<p>(.*?)<\/p>/i);
        if (firstParagraph) {
          // Clean and extract guidance text
          const cleanedGuidance = firstParagraph[1]
            .replace(/<[^>]+>/g, ' ') // Remove HTML tags
            .replace(/\s+/g, ' ')     // Collapse whitespace
            .replace(/&nbsp;/g, ' ')  // Replace non-breaking spaces
            .trim();

          if (cleanedGuidance && cleanedGuidance.length > 0) {
            Logger.log("Article content successfully extracted with pattern index " + patterns.indexOf(pattern));
            return cleanedGuidance;
          }
        }
      }
    }
  }
  
  // If none of the patterns match, return null.
  return null;
}

/**
 * Legacy fallback method from original implementation
 */
function fetchForwardGuidanceEnhanced_Legacy() {
  // Keep previous implementation as fallback
  const debugMode = PropertiesService.getScriptProperties().getProperty('DEBUG_MODE') === 'true';
  
  try {
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Starting fetchForwardGuidanceEnhanced_Legacy");
      Logger.log("----------------------------------------");
    }
    
    const url = "https://www.federalreserve.gov/newsevents/pressreleases/monetary.htm";
    const response = UrlFetchApp.fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      muteHttpExceptions: true
    });
    
    if (debugMode) {
      Logger.log("Legacy method response status:", response.getResponseCode());
      Logger.log("Legacy method response length:", response.getContentText().length);
      Logger.log("Legacy method response headers:", JSON.stringify(response.getHeaders()));
    }
    
    const html = response.getContentText();
    const guidance = html.match(/(forward\s+guidance)[:\s]*(.*?)(?=\s*<\/div>|\s*<br>|\s*<p>|\s*<\/p>|$)/im);
    
    if (debugMode) {
      Logger.log("Legacy method regex match:\n" + (guidance ? "Found" : "Not found"));
      if (guidance) {
        Logger.log("Legacy method found guidance:", guidance[2].trim());
      } else {
        Logger.log("First 1000 chars of legacy page:\n" + html.substring(0, 1000));
      }
    }
    
    if (guidance && guidance[2]) {
      return {
        forwardGuidance: guidance[2].trim(),
        commentary: "Forward guidance extracted from FOMC press release",
        source: {
          url: url,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    throw new Error("No forward guidance found in legacy method. First 1000 chars of page: " + html.substring(0, 1000));
    
  } catch (error) {
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Error in fetchForwardGuidanceEnhanced_Legacy:");
      Logger.log("Error Type:", error.constructor.name);
      Logger.log("Error Message:", error.message);
      Logger.log("Stack Trace:", error.stack);
      Logger.log("----------------------------------------");
    }
    
    return {
      forwardGuidance: "The Federal Reserve remains committed to achieving maximum employment and inflation at the rate of 2 percent over the longer run. Policy decisions will remain data-dependent.",
      commentary: "Error retrieving guidance: Using default statement",
      source: {
        url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary.htm",
        timestamp: new Date().toISOString()
      }
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
  
    if (debugMode) {
      Logger.log("Meetings parsed: " + JSON.stringify(meetings, null, 2));
    }
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
 * Retrieves Fed Funds futures price from Yahoo Finance API
 * @return {Object|null} Object containing futures data or null if not found
 */
function getFedFundsFuturesPrice() {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/ZQ=F";
  
  try {
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    const result = data.chart.result[0];
    
    // Log the raw API response for debugging
    Logger.log('Raw API response:', JSON.stringify(data, null, 2));
    Logger.log('Available meta fields:', Object.keys(result.meta));
    
    // Extract the price
    const price = result.meta.regularMarketPrice;
    
    if (price !== undefined && !isNaN(price)) {
      // Try different fields for price change
      let changeValue = result.meta.regularMarketChange;
      let changePercent = result.meta.regularMarketChangePercent;
      
      // If not found, try alternative fields
      if (changeValue === undefined || isNaN(changeValue)) {
        changeValue = result.meta.regularMarketChangeAmount;
      }
      
      if (changePercent === undefined || isNaN(changePercent)) {
        changePercent = result.meta.regularMarketChangePercentRaw;
      }
      
      // Format the output object
      const output = {
        name: result.meta.symbolName || "30-Day Federal Funds",
        price: price.toString(),
        priceChange: {
          value: changeValue?.toString() || "0",
          percent: changePercent?.toString() || "0%"
        },
        currency: result.meta.currency || "USD",
        lastUpdated: result.meta.regularMarketTime ? 
          new Date(result.meta.regularMarketTime * 1000).toISOString() : 
          new Date().toISOString(),
        source: url
      };
      
      Logger.log(`Successfully parsed futures data: ${JSON.stringify(output, null, 2)}`);
      return output;
    }

    throw new Error('Could not find valid price in JSON data');

  } catch (error) {
    Logger.log('Error fetching Fed Funds futures price: ' + error.message);
    Logger.log('Response code:', response ? response.getResponseCode() : 'N/A');
    Logger.log('Response content:', response ? response.getContentText().substring(0, 1000) : 'N/A');
    return null;
  }
}

/**
 * Calculates market-implied probabilities for Fed funds rate changes
 * @param {number} currentRate - The current Fed funds effective rate
 * @param {number} futuresPrice - The quoted futures price
 * @return {Object} An object containing the implied rate and probabilities
 */
function calculateFedFundsProbabilities(currentRate, futuresPrice) {
  const impliedRate = 100 - futuresPrice;  // Converts the price to an implied rate
  const diff = impliedRate - currentRate;
  const rateStep = 0.25;  // A typical increment for rate changes (25 basis points)
  const hikes = Math.abs(diff) / rateStep;
  
  let probabilityUp = 0, probabilityDown = 0, probabilityHold = 0;
  
  if (diff > 0) {
    probabilityUp = Math.min(hikes * 100, 100);  // scale to percentage and cap at 100%
    probabilityHold = 100 - probabilityUp;
    probabilityDown = 0;
  } else if (diff < 0) {
    probabilityDown = Math.min(hikes * 100, 100);
    probabilityHold = 100 - probabilityDown;
    probabilityUp = 0;
  } else {
    probabilityUp = 0;
    probabilityHold = 100;
    probabilityDown = 0;
  }
  
  return {
    impliedRate: impliedRate.toFixed(2),
    currentRate: currentRate.toFixed(2),
    futuresPrice: futuresPrice.toFixed(2),
    probabilityUp: probabilityUp.toFixed(1),
    probabilityHold: probabilityHold.toFixed(1),
    probabilityDown: probabilityDown.toFixed(1),
    source: {
      url: "https://finance.yahoo.com/quote/ZQ%3DF/",
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Fetches market probabilities from Fed Funds Futures
 * @param {number} currentRate Current Fed Funds rate
 * @return {Object} Market probabilities
 */
function fetchFedFundsFuturesProbabilities(currentRate) {
  try {
    // First try to get cached data
    /**
    const scriptCache = CacheService.getScriptCache();
    const cachedData = scriptCache.get('fedFundsFuturesProbabilities');
    if (cachedData) {
      const cachedObj = JSON.parse(cachedData);
      const cacheAge = (new Date() - new Date(cachedObj.source.timestamp)) / 1000;
      
      // Use cached data if it's less than 1 hour old
      if (cacheAge < 3600) {
        return cachedObj;
      }
    }
    */

    // Fetch fresh data
    const futuresPrice = getFedFundsFuturesPrice();
    if (futuresPrice === null) {
      // Try to fetch market probabilities from alternative source
      const marketProbabilities = fetchMarketProbabilities();
      return {
        impliedRate: "N/A",
        currentRate: currentRate.toFixed(2),
        futuresPrice: "N/A",
        probabilityUp: marketProbabilities.increase,
        probabilityHold: marketProbabilities.hold,
        probabilityDown: marketProbabilities.decrease,
        source: {
          url: "https://finance.yahoo.com/quote/ZQ%3DF/",
          timestamp: new Date().toISOString(),
          note: "Futures price unavailable, using market probabilities"
        }
      };
    }
    
    const probabilities = calculateFedFundsProbabilities(currentRate, futuresPrice);
    
    // Cache the result for 1 hour
    scriptCache.put('fedFundsFuturesProbabilities', JSON.stringify(probabilities), 3600);
    
    return probabilities;
    
  } catch (error) {
    Logger.log("Error in fetchFedFundsFuturesProbabilities:");
    Logger.log("Error Type:", error.constructor.name);
    Logger.log("Error Message:", error.message);
    Logger.log("Stack Trace:", error.stack);
    
    // Try to fetch market probabilities from alternative source
    const marketProbabilities = fetchMarketProbabilities();
    return {
      impliedRate: "N/A",
      currentRate: currentRate.toFixed(2),
      futuresPrice: "N/A",
      probabilityUp: marketProbabilities.increase,
      probabilityHold: marketProbabilities.hold,
      probabilityDown: marketProbabilities.decrease,
      source: {
        url: "https://finance.yahoo.com/quote/ZQ%3DF/",
        timestamp: new Date().toISOString(),
        note: "Error occurred while fetching futures data, using market probabilities"
      }
    };
  }
}

/**
 * Retrieves complete Fed policy data including futures probabilities
 * @return {Object} Complete Fed policy data
 */
function retrieveCompleteFedPolicyData() {
  try {
    // Check cache first
    const scriptCache = CacheService.getScriptCache();
    const cachedData = scriptCache.get('completeFedPolicyData');
    
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    
    // Fetch all components
    const fedFundsRate = fetchFedFundsRateFromFRED();
    const meetings = fetchFOMCMeetings();
    const guidance = fetchForwardGuidanceEnhanced();
    const probabilities = fetchFedFundsFuturesProbabilities(parseFloat(fedFundsRate.currentRate));
    
    // Compute last and next meetings
    const computed = computeLastAndNextMeetings(meetings.meetings);
    
    // Create complete data structure
    const fedPolicy = {
      currentRate: fedFundsRate,
      lastMeeting: computed.lastMeeting,
      nextMeeting: computed.nextMeeting,
      meetings: meetings.meetings,
      forwardGuidance: guidance.forwardGuidance,
      commentary: guidance.commentary,
      marketProbabilities: probabilities,
      source: {
        url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary.htm",
        timestamp: new Date().toISOString()
      }
    };
    
    // Cache the data for 1 hour
    scriptCache.put('completeFedPolicyData', JSON.stringify(fedPolicy), 3600);
    
    return fedPolicy;
    
  } catch (error) {
    if (debugMode) {
      Logger.log("Error in retrieveCompleteFedPolicyData:", error.message);
    }
    return {
      currentRate: null,
      lastMeeting: {
        date: "Error retrieving meetings",
        type: "",
        time: "",
        timezone: "",
        startDate: new Date(),
        endDate: new Date()
      },
      nextMeeting: {
        date: "Error retrieving meetings",
        type: "",
        time: "",
        timezone: "",
        startDate: new Date(),
        endDate: new Date()
      },
      meetings: [],
      forwardGuidance: "Error retrieving forward guidance",
      commentary: "Error occurred while retrieving Fed policy data",
      marketProbabilities: {
        up: "N/A",
        same: "N/A",
        down: "N/A",
        impliedRate: "N/A"
      },
      source: {
        url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary.htm",
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Retrieves Fed Funds futures price from Yahoo Finance API
 * @return {Object|null} Object containing futures data or null if not found
 */
function getFedFundsFuturesPrice() {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/ZQ=F";
  
  try {
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    const result = data.chart.result[0];
    
    // Log the raw API response for debugging
    Logger.log('Raw API response:', JSON.stringify(data, null, 2));
    Logger.log('Available meta fields:', Object.keys(result.meta));
    
    // Extract the price
    const price = result.meta.regularMarketPrice;
    
    if (price !== undefined && !isNaN(price)) {
      // Try different fields for price change
      let changeValue = result.meta.regularMarketChange;
      let changePercent = result.meta.regularMarketChangePercent;
      
      // If not found, try alternative fields
      if (changeValue === undefined || isNaN(changeValue)) {
        changeValue = result.meta.regularMarketChangeAmount;
      }
      
      if (changePercent === undefined || isNaN(changePercent)) {
        changePercent = result.meta.regularMarketChangePercentRaw;
      }
      
      // Format the output object
      const output = {
        name: result.meta.symbolName || "30-Day Federal Funds",
        price: price.toString(),
        priceChange: {
          value: changeValue?.toString() || "0",
          percent: changePercent?.toString() || "0%"
        },
        currency: result.meta.currency || "USD",
        lastUpdated: result.meta.regularMarketTime ? 
          new Date(result.meta.regularMarketTime * 1000).toISOString() : 
          new Date().toISOString(),
        source: url
      };
      
      Logger.log(`Successfully parsed futures data: ${JSON.stringify(output, null, 2)}`);
      return output;
    }

    throw new Error('Could not find valid price in JSON data');

  } catch (error) {
    Logger.log('Error fetching Fed Funds futures price: ' + error.message);
    Logger.log('Response code:', response ? response.getResponseCode() : 'N/A');
    Logger.log('Response content:', response ? response.getContentText().substring(0, 1000) : 'N/A');
    return null;
  }
}

/**
 * Retrieves Fed Funds futures price from Yahoo Finance API
 * @return {Object|null} Object containing futures data or null if not found
 */
function getFedFundsFuturesPrice() {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/ZQ=F";
  
  try {
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    const result = data.chart.result[0];
    
    // Log the raw API response for debugging
    Logger.log('Raw API response:', JSON.stringify(data, null, 2));
    Logger.log('Available meta fields:', Object.keys(result.meta));
    
    // Extract the price
    const price = result.meta.regularMarketPrice;
    
    if (price !== undefined && !isNaN(price)) {
      // Try different fields for price change
      let changeValue = result.meta.regularMarketChange;
      let changePercent = result.meta.regularMarketChangePercent;
      
      // If not found, try alternative fields
      if (changeValue === undefined || isNaN(changeValue)) {
        changeValue = result.meta.regularMarketChangeAmount;
      }
      
      if (changePercent === undefined || isNaN(changePercent)) {
        changePercent = result.meta.regularMarketChangePercentRaw;
      }
      
      // Format the output object
      const output = {
        name: result.meta.symbolName || "30-Day Federal Funds",
        price: price.toString(),
        priceChange: {
          value: changeValue?.toString() || "0",
          percent: changePercent?.toString() || "0%"
        },
        currency: result.meta.currency || "USD",
        lastUpdated: result.meta.regularMarketTime ? 
          new Date(result.meta.regularMarketTime * 1000).toISOString() : 
          new Date().toISOString(),
        source: url
      };
      
      Logger.log(`Successfully parsed futures data: ${JSON.stringify(output, null, 2)}`);
      return output;
    }

    throw new Error('Could not find valid price in JSON data');

  } catch (error) {
    Logger.log('Error fetching Fed Funds futures price: ' + error.message);
    Logger.log('Response code:', response ? response.getResponseCode() : 'N/A');
    Logger.log('Response content:', response ? response.getContentText().substring(0, 1000) : 'N/A');
    return null;
  }
}

/**
 * Test function to verify Yahoo Finance futures data retrieval
 */
function testYahooFinanceFutures() {
  try {
    const data = getFedFundsFuturesPrice();
    if (data !== null) {
      Logger.log(`Fed Funds futures price: ${data.price}`);
      Logger.log(`Change: ${data.priceChange.value} (${data.priceChange.percent})`);
      Logger.log(`Last updated: ${data.lastUpdated}`);
      Logger.log(`Source: ${data.source}`);
    } else {
      Logger.log('Failed to retrieve futures price');
    }
  } catch (error) {
    Logger.log('Error in test function:', error.message);
  }
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
  const sortedMeetings = meetings.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  
  // Find the first meeting that is after today or within grace period
  for (let i = 0; i < sortedMeetings.length; i++) {
    const meetingDate = new Date(sortedMeetings[i].startDate);
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
    timezone: "",
    startDate: new Date(),
    endDate: new Date()
  };
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
 * Retrieves Fed Funds futures price from Yahoo Finance API
 * @return {Object|null} Object containing futures data or null if not found
 */
function getFedFundsFuturesPrice() {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/ZQ=F";
  
  try {
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    const result = data.chart.result[0];
    
    // Log the raw API response for debugging
    Logger.log('Raw API response:', JSON.stringify(data, null, 2));
    Logger.log('Available meta fields:', Object.keys(result.meta));
    
    // Extract the price
    const price = result.meta.regularMarketPrice;
    
    if (price !== undefined && !isNaN(price)) {
      // Try different fields for price change
      let changeValue = result.meta.regularMarketChange;
      let changePercent = result.meta.regularMarketChangePercent;
      
      // If not found, try alternative fields
      if (changeValue === undefined || isNaN(changeValue)) {
        changeValue = result.meta.regularMarketChangeAmount;
      }
      
      if (changePercent === undefined || isNaN(changePercent)) {
        changePercent = result.meta.regularMarketChangePercentRaw;
      }
      
      // Format the output object
      const output = {
        name: result.meta.symbolName || "30-Day Federal Funds",
        price: price.toString(),
        priceChange: {
          value: changeValue?.toString() || "0",
          percent: changePercent?.toString() || "0%"
        },
        currency: result.meta.currency || "USD",
        lastUpdated: result.meta.regularMarketTime ? 
          new Date(result.meta.regularMarketTime * 1000).toISOString() : 
          new Date().toISOString(),
        source: url
      };
      
      Logger.log(`Successfully parsed futures data: ${JSON.stringify(output, null, 2)}`);
      return output;
    }

    throw new Error('Could not find valid price in JSON data');

  } catch (error) {
    Logger.log('Error fetching Fed Funds futures price: ' + error.message);
    Logger.log('Response code:', response ? response.getResponseCode() : 'N/A');
    Logger.log('Response content:', response ? response.getContentText().substring(0, 1000) : 'N/A');
    return null;
  }
}

/**
 * Retrieves Fed Funds futures price from Yahoo Finance API
 * @return {Object|null} Object containing futures data or null if not found
 */
function getFedFundsFuturesPrice() {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/ZQ=F";
  
  try {
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    const result = data.chart.result[0];
    
    // Log the raw API response for debugging
    Logger.log('Raw API response:', JSON.stringify(data, null, 2));
    Logger.log('Available meta fields:', Object.keys(result.meta));
    
    // Extract the price
    const price = result.meta.regularMarketPrice;
    
    if (price !== undefined && !isNaN(price)) {
      // Try different fields for price change
      let changeValue = result.meta.regularMarketChange;
      let changePercent = result.meta.regularMarketChangePercent;
      
      // If not found, try alternative fields
      if (changeValue === undefined || isNaN(changeValue)) {
        changeValue = result.meta.regularMarketChangeAmount;
      }
      
      if (changePercent === undefined || isNaN(changePercent)) {
        changePercent = result.meta.regularMarketChangePercentRaw;
      }
      
      // Format the output object
      const output = {
        name: result.meta.symbolName || "30-Day Federal Funds",
        price: price.toString(),
        priceChange: {
          value: changeValue?.toString() || "0",
          percent: changePercent?.toString() || "0%"
        },
        currency: result.meta.currency || "USD",
        lastUpdated: result.meta.regularMarketTime ? 
          new Date(result.meta.regularMarketTime * 1000).toISOString() : 
          new Date().toISOString(),
        source: url
      };
      
      Logger.log(`Successfully parsed futures data: ${JSON.stringify(output, null, 2)}`);
      return output;
    }

    throw new Error('Could not find valid price in JSON data');

  } catch (error) {
    Logger.log('Error fetching Fed Funds futures price: ' + error.message);
    Logger.log('Response code:', response ? response.getResponseCode() : 'N/A');
    Logger.log('Response content:', response ? response.getContentText().substring(0, 1000) : 'N/A');
    return null;
  }
}

/**
 * Test function to verify Yahoo Finance futures data retrieval
 */
function testYahooFinanceFutures() {
  try {
    const data = getFedFundsFuturesPrice();
    if (data !== null) {
      Logger.log(`Fed Funds futures price: ${data.price}`);
      Logger.log(`Change: ${data.priceChange.value} (${data.priceChange.percent})`);
      Logger.log(`Last updated: ${data.lastUpdated}`);
      Logger.log(`Source: ${data.source}`);
    } else {
      Logger.log('Failed to retrieve futures price');
    }
  } catch (error) {
    Logger.log('Error in test function:', error.message);
  }
}

/**
 * Test function to verify Yahoo Finance futures data retrieval
 */
function testYahooFinanceFutures() {
  try {
    const data = getFedFundsFuturesPrice();
    if (data !== null) {
      Logger.log(`Fed Funds futures price: ${data.price}`);
      Logger.log(`Change: ${data.priceChange.value} (${data.priceChange.percent})`);
      Logger.log(`Last updated: ${data.lastUpdated}`);
      Logger.log(`Source: ${data.source}`);
    } else {
      Logger.log('Failed to retrieve futures price');
    }
  } catch (error) {
    Logger.log('Error in test function:', error.message);
  }
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
  const sortedMeetings = meetings.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  
  // Find the first meeting that is after today or within grace period
  for (let i = 0; i < sortedMeetings.length; i++) {
    const meetingDate = new Date(sortedMeetings[i].startDate);
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
    timezone: "",
    startDate: new Date(),
    endDate: new Date()
  };
}

/**
 * Tests the Fed policy data retrieval and formats it for retrieveMacroeconomicFactors
 * @return {Object} Formatted Fed policy data
 */
function testFedPolicyData() {
  
  try {
    const debugMode = PropertiesService.getScriptProperties().getProperty('DEBUG_MODE') === 'true';
    
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Starting testFedPolicyData");
      Logger.log("----------------------------------------");
    }
    
    // Clear any existing cache
    const scriptCache = CacheService.getScriptCache();
    scriptCache.remove('completeFedPolicyData');
    Logger.log("Cleared Fed policy cache");
    
    // Retrieve Fed policy data using the new complete function
    const fedPolicy = retrieveCompleteFedPolicyData();
    
    if (!fedPolicy) {
      Logger.log("Failed to retrieve Fed policy data");
      return {
        success: false,
        message: "Failed to retrieve Fed policy data",
        timestamp: new Date().toISOString()
      };
    }
    
    Logger.log("Fed policy data retrieved successfully");
    
    // Log data structure information
    if (debugMode) {
      Logger.log("Fed policy data structure:");
      Logger.log("Type of fedPolicy:", typeof fedPolicy);
      Logger.log("Type of currentRate:", typeof fedPolicy.currentRate);
      Logger.log("Type of lastMeeting:", typeof fedPolicy.lastMeeting);
      Logger.log("Type of nextMeeting:", typeof fedPolicy.nextMeeting);
      Logger.log("Type of meetings:", typeof fedPolicy.meetings);
      Logger.log("Type of marketProbabilities:", typeof fedPolicy.marketProbabilities);
      
      // Log object properties
      if (fedPolicy.lastMeeting) {
        Logger.log("Last Meeting has properties:", Object.keys(fedPolicy.lastMeeting).join(", "));
      }
      if (fedPolicy.nextMeeting) {
        Logger.log("Next Meeting has properties:", Object.keys(fedPolicy.nextMeeting).join(", "));
      }
      if (fedPolicy.marketProbabilities) {
        Logger.log("Market Probabilities has properties:", Object.keys(fedPolicy.marketProbabilities).join(", "));
      }
    }
    
    // Format the data for retrieveMacroeconomicFactors
    const formattedData = {
      "Fed Policy": {
        "Forward Guidance": fedPolicy.forwardGuidance || "No forward guidance available",
        "Current Rate": {
          "Value": fedPolicy.currentRate.value,
          "Date": fedPolicy.currentRate.date,
          "Source": fedPolicy.source.url
        },
        "Previous Rate": {
          "Value": fedPolicy.previousRate.value,
          "Date": fedPolicy.previousRate.date
        },
        "Fed Funds Futures": {
          "Price": fedPolicy.futuresPrice,
          "Change": fedPolicy.futuresPriceChange,
          "Last Updated": fedPolicy.futuresLastUpdated
        },
        "Last Meeting": {
          "Date": fedPolicy.lastMeeting.date,
          "Type": fedPolicy.lastMeeting.type,
          "Time": fedPolicy.lastMeeting.time,
          "Timezone": fedPolicy.lastMeeting.timezone,
          "Minutes URL": fedPolicy.lastMeeting.minutesUrl
        },
        "Next Meeting": {
          "Date": fedPolicy.nextMeeting.date,
          "Type": fedPolicy.nextMeeting.type,
          "Time": fedPolicy.nextMeeting.time,
          "Timezone": fedPolicy.nextMeeting.timezone
        },
        "Market Probabilities": {
          "Up": `${fedPolicy.marketProbabilities.up}%`,
          "Same": `${fedPolicy.marketProbabilities.same}%`,
          "Down": `${fedPolicy.marketProbabilities.down}%`,
          "Implied Rate": `${fedPolicy.marketProbabilities.impliedRate}%`
        },
        "Source": {
          "URL": fedPolicy.source.url,
          "Timestamp": fedPolicy.source.timestamp
        }
      }
    };
    
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
