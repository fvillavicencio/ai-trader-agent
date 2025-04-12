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
    
    // Fetch Fed Funds futures data
    const futuresData = fetchFedFundsFuturesProbabilities(fedFundsRate.currentRate);
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Fed Funds Futures Data:", futuresData);
      Logger.log("----------------------------------------");
    }
    
    // Create the data structure
    const fedPolicy = {
      currentRate: fedFundsRate,
      lastMeeting: computed.lastMeeting,
      nextMeeting: computed.nextMeeting,
      forwardGuidance: guidance.forwardGuidance,
      commentary: guidance.commentary,
      futures: futuresData,
      source: {
        url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary.htm",
        timestamp: new Date().toISOString(),
        components: {
          fedFundsRate: fedFundsRate.source,
          meetings: meetings.source,
          forwardGuidance: guidance.source,
          futures: futuresData?.source || null
        }
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
      futures: {
        currentPrice: null,
        impliedRate: null,
        probabilities: {
          cut: 0,
          hold: 0,
          hike: 0
        },
        source: {
          url: "https://finance.yahoo.com/quote/ZQ%3DF/",
          timestamp: new Date().toISOString(),
          note: "Error fetching futures data"
        }
      },
      forwardGuidance: "Error retrieving forward guidance",
      commentary: "Error occurred while retrieving Fed policy data",
      source: {
        url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary.htm",
        timestamp: new Date().toISOString(),
        components: {
          fedFundsRate: null,
          meetings: null,
          forwardGuidance: null,
          futures: null
        },
        error: {
          type: error.constructor.name,
          message: error.message,
          stack: error.stack
        }
      }
    };
  }
}

/**
 * Fetches current Fed Funds Rate from FRED API
 * @return {Object} Current Fed Funds Rate with range
 */
function fetchFedFundsRateFromFRED() {
  
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
        rangeHigh: (Math.ceil(latestValue * 4) / 4).toFixed(2),
        source: {
          url: "https://fred.stlouisfed.org/series/FEDFUNDS",
          timestamp: new Date().toISOString()
        }
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
function computeLastAndNextMeetings(meetings) {
  const now = new Date();
  
  // Sort the array by startDate ascending
  if (Array.isArray(meetings) && meetings.length > 0) {
    meetings.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    let lastMeeting = null;
    let nextMeeting = null;
    
    for (let i = 0; i < meetings.length; i++) {
      const meeting = meetings[i];
      if (new Date(meeting.startDate) <= now) {
        lastMeeting = meeting;
      } else {
        nextMeeting = meeting;
        break; // No need to continue once we find the next meeting
      }
    }

    return {
      lastMeeting,
      nextMeeting,
      allMeetings: meetings
    };
  }

  // Return empty objects if no meetings were found
  return {
    lastMeeting: null,
    nextMeeting: null,
    allMeetings: []
  };
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
      lastMeeting: computeLastAndNextMeetings(meetings).lastMeeting,
      nextMeeting: computeLastAndNextMeetings(meetings).nextMeeting,
      source: {
        url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
        timestamp: new Date().toISOString()
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
  const apiKey = PropertiesService.getScriptProperties().getProperty('FRED_API_KEY');
  
  if (apiKey) {
    Logger.log('FRED API key already set.');
    return;
  }
  
  const userInput = ScriptApp.getUi().prompt(
    'Enter FRED API Key',
    'Please enter your FRED API key:',
    ScriptApp.getUi().ButtonSet.OK_CANCEL
  );
  
  if (userInput.getResponseText() && userInput.getSelectedButton() === ScriptApp.getUi().Button.OK) {
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty('FRED_API_KEY', userInput.getResponseText());
    Logger.log('FRED API key stored securely.');
  } else {
    Logger.log('FRED API key setup cancelled.');
  }
}

/**
 * Retrieves Fed Funds futures price from Yahoo Finance API
 * @return {Object|null} Object containing futures data or null if not found
 */
function getFedFundsFuturesPrice() {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/ZQ=F";
  
  try {
    const response = UrlFetchApp.fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`HTTP error: ${response.getResponseCode()}`);
    }
    
    if (debugMode) {
      Logger.log('Raw API response:', JSON.stringify(response, null, 2));
    }
    
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
 * Fetches market probabilities from Fed Funds Futures
 * @return {Object} Market probabilities
 */
function fetchFedFundsFuturesProbabilities(currentRate) {
  try {
    // Fetch fresh data
    const futuresPrice = getFedFundsFuturesPrice();
    
    if (futuresPrice === null) {
      if (debugMode) {
        Logger.log("----------------------------------------");
        Logger.log("Error fetching futures price");
        Logger.log("----------------------------------------");
      }
      // Try to fetch market probabilities from alternative source
      const marketProbabilities = fetchMarketProbabilities();
      return {
        price: null,
        impliedRate: null,
        probabilities: {
          cut: parseFloat(marketProbabilities.decrease) || 0,
          hold: parseFloat(marketProbabilities.hold) || 0,
          hike: parseFloat(marketProbabilities.increase) || 0
        },
        source: {
          url: "https://finance.yahoo.com/quote/ZQ%3DF/",
          timestamp: new Date().toISOString(),
          note: "Futures price unavailable, using market probabilities"
        }
      };
    }

    // Calculate probabilities using the actual futures price
    const { impliedRate, probabilities } = calculateFedFundsProbabilities(currentRate, parseFloat(futuresPrice.price));

    return {
      currentPrice: parseFloat(futuresPrice.price),
      impliedRate: parseFloat(impliedRate),
      probabilities: {
        cut: probabilities.cut,
        hold: probabilities.hold,
        hike: probabilities.hike
      },
      source: {
        url: futuresPrice.source,
        timestamp: futuresPrice.lastUpdated
      }
    };

  } catch (error) {
    Logger.log('Error in fetchFedFundsFuturesProbabilities:', error.message);
    return {
      currentPrice: null,
      impliedRate: null,
      probabilities: {
        cut: 0,
        hold: 0,
        hike: 0
      },
      source: {
        url: "https://finance.yahoo.com/quote/ZQ%3DF/",
        timestamp: new Date().toISOString(),
        note: "Error fetching futures data"
      }
    };
  }
}

/**
 * Calculates market-implied probabilities for Fed funds rate changes
 * @param {number} currentRate - The current Fed funds effective rate
 * @param {number} futuresPrice - The quoted futures price
 * @return {Object} An object containing the implied rate and probabilities
 */
function calculateFedFundsProbabilities(currentRate, futuresPrice) {
  const impliedRate = 100 - futuresPrice;  // Convert futures price to implied rate
  const diff = impliedRate - currentRate;
  
  // Parameters for the logistic model:
  const threshold = 0.25;  // When |diff| equals 0.25, assign ~50% probability for a move.
  const k = 5;           // Sensitivity parameter; adjust k to calibrate the steepness.

  // Logistic function to calculate weight based on the magnitude of diff relative to the threshold.
  const weight = 1 / (1 + Math.exp(-k * (Math.abs(diff) - threshold)));

  let probabilityHike = 0, probabilityCut = 0, probabilityHold = 0;

  if (diff > 0) {
    probabilityHike = weight * 100;
    probabilityHold = (1 - weight) * 100;
    probabilityCut = 0;
  } else if (diff < 0) {
    probabilityCut = weight * 100;
    probabilityHold = (1 - weight) * 100;
    probabilityHike = 0;
  } else {  // diff === 0
    probabilityHold = 100;
  }
  
  return {
    impliedRate: impliedRate.toFixed(2),
    probabilities: {
      hike: probabilityHike.toFixed(1),
      hold: probabilityHold.toFixed(1),
      cut: probabilityCut.toFixed(1)
    }
  };
}
/**
 * Retrieves complete Fed policy data including futures probabilities
 * @return {Object} Complete Fed policy data
 */
function retrieveCompleteFedPolicyData() {
  try {
    
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Starting retrieveCompleteFedPolicyData");
      Logger.log("----------------------------------------");
    }
    
    // Check cache first
    const scriptCache = CacheService.getScriptCache();
    const cachedData = scriptCache.get('completeFedPolicyData');
    
    if (cachedData) {
      if (debugMode) {
        Logger.log("----------------------------------------");
        Logger.log("Using cached Fed policy data");
        Logger.log("Cache hit - returning cached data");
        Logger.log("----------------------------------------");
      }
      return JSON.parse(cachedData);
    }
    
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("No cache hit - fetching fresh data");
      Logger.log("----------------------------------------");
    }
    
    let fedFundsRate, meetings, guidance, probabilities;
    
    try {
      fedFundsRate = fetchFedFundsRateFromFRED();
      if (debugMode) {
        Logger.log("----------------------------------------");
        Logger.log("Fed Funds Rate retrieved successfully");
        Logger.log("Fed Funds Rate data:\n" + JSON.stringify(fedFundsRate, null, 2));
        Logger.log("----------------------------------------");
      }
    } catch (rateError) {
      const errorMessage = `Error fetching Fed Funds rate: ${rateError.message}`;
      if (debugMode) {
        Logger.log("----------------------------------------");
        Logger.log("Error fetching Fed Funds rate:");
        Logger.log("Error Type:", rateError.constructor.name);
        Logger.log("Error Message:", errorMessage);
        Logger.log("Stack Trace:", rateError.stack);
        Logger.log("----------------------------------------");
      }
      throw new Error(errorMessage);
    }
    
    try {
      meetings = fetchFOMCMeetings();
      if (debugMode) {
        Logger.log("----------------------------------------");
        Logger.log("Meetings retrieved successfully");
        Logger.log("Meetings array length:\n" + meetings.meetings.length);
        Logger.log("First meeting data:\n" + JSON.stringify(meetings.meetings[0], null, 2));
        Logger.log("Last meeting data:\n" + JSON.stringify(meetings.meetings[meetings.meetings.length - 1], null, 2));
        Logger.log("----------------------------------------");
      }
    } catch (meetingsError) {
      const errorMessage = `Error fetching FOMC meetings: ${meetingsError.message}`;
      if (debugMode) {
        Logger.log("----------------------------------------");
        Logger.log("Error fetching FOMC meetings:");
        Logger.log("Error Type:", meetingsError.constructor.name);
        Logger.log("Error Message:", errorMessage);
        Logger.log("Stack Trace:", meetingsError.stack);
        Logger.log("----------------------------------------");
      }
      throw new Error(errorMessage);
    }
    
    try {
      guidance = fetchForwardGuidanceEnhanced();
      if (debugMode) {
        Logger.log("----------------------------------------");
        Logger.log("Forward guidance retrieved successfully");
        Logger.log("Forward guidance:\n" + JSON.stringify(guidance.forwardGuidance, null, 2));
        Logger.log("Commentary:\n" + JSON.stringify(guidance.commentary, null, 2));
        Logger.log("----------------------------------------");
      }
    } catch (guidanceError) {
      const errorMessage = `Error fetching forward guidance: ${guidanceError.message}`;
      if (debugMode) {
        Logger.log("----------------------------------------");
        Logger.log("Error fetching forward guidance:");
        Logger.log("Error Type:", guidanceError.constructor.name);
        Logger.log("Error Message:", errorMessage);
        Logger.log("Stack Trace:", guidanceError.stack);
        Logger.log("----------------------------------------");
      }
      throw new Error(errorMessage);
    }
    
    try {
      probabilities = fetchFedFundsFuturesProbabilities(parseFloat(fedFundsRate.currentRate));
      if (debugMode) {
        Logger.log("----------------------------------------");
        Logger.log("Market probabilities retrieved successfully");
        Logger.log("Probabilities data:", JSON.stringify(probabilities, null, 2));
        Logger.log("----------------------------------------");
      }
    } catch (probabilitiesError) {
      const errorMessage = `Error fetching market probabilities: ${probabilitiesError.message}`;
      if (debugMode) {
        Logger.log("----------------------------------------");
        Logger.log("Error fetching market probabilities:");
        Logger.log("Error Type:", probabilitiesError.constructor.name);
        Logger.log("Error Message:", errorMessage);
        Logger.log("Stack Trace:", probabilitiesError.stack);
        Logger.log("----------------------------------------");
      }
      throw new Error(errorMessage);
    }
    
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Computing last and next meetings");
      Logger.log("Input meetings array length:\n" + meetings.meetings.length);
      Logger.log("First meeting date:\n" + meetings.meetings[0].startDate);
      Logger.log("Last meeting date:\n" + meetings.meetings[meetings.meetings.length - 1].startDate);
      Logger.log("----------------------------------------");
    }
    
    // Compute last and next meetings
    const computed = computeLastAndNextMeetings(meetings.meetings);
    
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Meetings computation complete");
      Logger.log("Last meeting date:\n" + (computed.lastMeeting ? computed.lastMeeting.startDate : "none"));
      Logger.log("Next meeting date:\n" + (computed.nextMeeting ? computed.nextMeeting.startDate : "none"));
      Logger.log("All meetings count:\n" + computed.allMeetings.length);
      Logger.log("----------------------------------------");
    }
    
    // Create complete data structure
    const fedPolicy = {
      currentRate: fedFundsRate,
      lastMeeting: computed.lastMeeting,
      nextMeeting: computed.nextMeeting,
      forwardGuidance: guidance.forwardGuidance,
      commentary: guidance.commentary,
      marketProbabilities: probabilities,
      futuresData: {
        currentRate: fedFundsRate.currentRate,
        impliedRate: probabilities.impliedRate,
        futuresPrice: probabilities.price,
        probabilityUp: probabilities.probabilities.hike,
        probabilityHold: probabilities.probabilities.hold,
        probabilityDown: probabilities.probabilities.cut,
        source: probabilities.source
      },
      source: {
        url: "https://www.federalreserve.gov/",
        timestamp: new Date().toISOString(),
        components: {
          fedFundsRate: fedFundsRate.source,
          meetings: meetings.source,
          forwardGuidance: guidance.source,
          marketProbabilities: probabilities.source
        }
      }
    };
    
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Final Fed policy data structure created");
      Logger.log("JSON fedPolicy structure:\n" + JSON.stringify(fedPolicy, null, 2));
      Logger.log("Fed Funds Rate:\n " + JSON.stringify(fedPolicy.currentRate, null, 2));
      Logger.log("Last Meeting Date:\n" + (fedPolicy.lastMeeting ? fedPolicy.lastMeeting.startDate : "none"));
      Logger.log("Next Meeting Date:\n" + (fedPolicy.nextMeeting ? fedPolicy.nextMeeting.startDate : "none"));
      Logger.log("Forward Guidance:\n" + fedPolicy.forwardGuidance);
      Logger.log("Market Probabilities:\n" + JSON.stringify(fedPolicy.marketProbabilities, null, 2));
      Logger.log("----------------------------------------");
    }
    
    // Cache the data for 1 hour
    scriptCache.put('completeFedPolicyData', JSON.stringify(fedPolicy), 3600);
    
    return fedPolicy;
    
  } catch (error) {
    const errorMessage = `Error in retrieveCompleteFedPolicyData: ${error.message}`;
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Error in retrieveCompleteFedPolicyData:");
      Logger.log("Error Type:\n" + error.constructor.name);
      Logger.log("Error Message:\n" + errorMessage);
      Logger.log("Stack Trace:\n" + error.stack);
      Logger.log("----------------------------------------");
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
        url: "https://www.federalreserve.gov/",
        timestamp: new Date().toISOString()
      },
      error: {
        message: errorMessage,
        type: error.constructor.name,
        stack: error.stack
      }
    };
  }
}

/**
 * Tests the Fed policy data retrieval and formats it for retrieveMacroeconomicFactors
 * @return {Object} Formatted Fed policy data
 */
function testFedPolicyData() {
  try {
    Logger.log("Testing Fed policy data retrieval...");
    
    // Clear Fed policy cache
    const cache = CacheService.getScriptCache();
    cache.remove('completeFedPolicyData');
    
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Cleared Fed policy cache");
      Logger.log("Cache cleared successfully");
      Logger.log("----------------------------------------");
    }
    
    // Retrieve Fed policy data
    let fedPolicyData;
    try {
      fedPolicyData = retrieveCompleteFedPolicyData();
      if (debugMode) {
        Logger.log("----------------------------------------");
        Logger.log("Fed policy data retrieved successfully");
        Logger.log("Fed policy data structure:");
        Logger.log(JSON.stringify(fedPolicyData, null, 2));
        
        // Log types of all properties
        Logger.log("Type of fedPolicyData:", typeof fedPolicyData);
        if (fedPolicyData) {
          Logger.log("Type of currentRate:", typeof fedPolicyData.currentRate);
          Logger.log("Type of lastMeeting:", typeof fedPolicyData.lastMeeting);
          Logger.log("Type of nextMeeting:", typeof fedPolicyData.nextMeeting);
          Logger.log("Type of meetings:", typeof fedPolicyData.meetings);
          Logger.log("Type of marketProbabilities:", typeof fedPolicyData.marketProbabilities);
          
          // Log object properties
          if (fedPolicyData.lastMeeting) {
            Logger.log("Last Meeting has properties:", Object.keys(fedPolicyData.lastMeeting).join(", "));
          }
          if (fedPolicyData.nextMeeting) {
            Logger.log("Next Meeting has properties:", Object.keys(fedPolicyData.nextMeeting).join(", "));
          }
          if (fedPolicyData.marketProbabilities) {
            Logger.log("Market Probabilities has properties:", Object.keys(fedPolicyData.marketProbabilities).join(", "));
          }
        }
        Logger.log("----------------------------------------");
      }
    } catch (error) {
      const errorMessage = `Error retrieving Fed policy data: ${error.message}`;
      if (debugMode) {
        Logger.log("----------------------------------------");
        Logger.log("Error retrieving Fed policy data:");
        Logger.log("Error Type:", error.constructor.name);
        Logger.log("Error Message:", errorMessage);
        Logger.log("Stack Trace:", error.stack);
        Logger.log("----------------------------------------");
      }
      throw new Error(errorMessage);
    }
    
    // Format the data for retrieveMacroeconomicFactors
    const formattedData = {
      "Fed Policy": {
        "Forward Guidance": fedPolicyData.forwardGuidance || "No forward guidance available",
        "Current Rate": {
          "Value": fedPolicyData.currentRate?.currentRate || "N/A",
          "Range": `${fedPolicyData.currentRate?.rangeLow || "N/A"}% - ${fedPolicyData.currentRate?.rangeHigh || "N/A"}%`,
          "Date": fedPolicyData.currentRate?.date || "N/A",
          "Source": fedPolicyData.source?.components?.fedFundsRate?.url || "N/A"
        },
        "Futures Data": {
          "Implied Rate": fedPolicyData.futuresData?.impliedRate || "N/A",
          "Price": fedPolicyData.futuresData?.futuresPrice || "N/A",
          "Probability Up": fedPolicyData.futuresData?.probabilityUp || "N/A",
          "Probability Hold": fedPolicyData.futuresData?.probabilityHold || "N/A",
          "Probability Down": fedPolicyData.futuresData?.probabilityDown || "N/A",
          "Source": fedPolicyData.futuresData?.source?.url || "N/A"
        },
        "Last Meeting": {
          "Date": fedPolicyData.lastMeeting?.startDate || "N/A",
          "Time": fedPolicyData.lastMeeting?.time || "N/A",
          "Minutes URL": fedPolicyData.lastMeeting?.minutesUrl || "N/A"
        },
        "Next Meeting": {
          "Date": fedPolicyData.nextMeeting?.startDate || "N/A",
          "Time": fedPolicyData.nextMeeting?.time || "N/A"
        },
        "Source": {
          "URL": fedPolicyData.source?.url || "N/A",
          "Timestamp": fedPolicyData.source?.timestamp || "N/A",
          "Components": fedPolicyData.source?.components || "N/A"
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
    const errorMessage = `Error in testFedPolicyData: ${error.message}`;
    Logger.log("----------------------------------------");
    Logger.log("Error in testFedPolicyData:");
    Logger.log("Error Type:", error.constructor.name);
    Logger.log("Error Message:", errorMessage);
    Logger.log("Stack Trace:", error.stack);
    Logger.log("----------------------------------------");
    return {
      success: false,
      message: errorMessage,
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
 * Helper function to parse yield term to months
 * @param {string} term - The yield term (e.g., "3-month", "1-year")
 * @return {number} Number of months
 */
function parseTermToMonths(term) {
  if (!term) return 0;
  
  term = term.toLowerCase();
  
  // Handle common terms
  if (term.includes('month')) {
    const months = parseInt(term.replace(/[^\d]/g, ''));
    return months || 0;
  }
  
  if (term.includes('year')) {
    const years = parseInt(term.replace(/[\d]/g, ''));
    return (years || 0) * 12;
  }
  
  // Handle specific terms
  if (term.includes('30-day')) return 1;
  if (term.includes('90-day')) return 3;
  if (term.includes('180-day')) return 6;
  
  return 0;
}

/**
 * Helper function to format a value with optional fixed decimals
 * @param {number|string} value - The value to format
 * @param {boolean} fixedDecimals - Whether to use fixed decimals
 * @param {number} decimals - Number of decimal places
 * @return {string} Formatted value
 */
function formatValue(value, fixedDecimals = false, decimals = 2) {
  if (value === undefined || value === null) {
    return "N/A";
  }
  
  // Handle string values that might contain numbers
  if (typeof value === 'string') {
    // Try to parse as number if it looks like one
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      value = numValue;
    }
  }
  
  // Handle numeric values
  if (typeof value === 'number' || !isNaN(value)) {
    const numValue = parseFloat(value);
    if (fixedDecimals) {
      return numValue.toFixed(decimals);
    }
    return numValue.toString();
  }
  
  // Return string values as is
  return value.toString();
}

/**
 * Formats Fed policy data
 * @param {Object} fedPolicyData - Fed policy data
 * @return {string} Formatted Fed policy data
 */
function formatFedPolicyData(fedPolicyData) {
  try {
    Logger.log("Formatting Fed policy data...");
    
    let formattedText = "**Federal Reserve Policy:**\n";
    
    if (fedPolicyData) {
      // Handle null currentRate gracefully
      const currentRate = fedPolicyData.currentRate || {
        currentRate: "N/A",
        rangeLow: "N/A",
        rangeHigh: "N/A"
      };
      
      // Format current rate and range
      formattedText += `- Current Federal Funds Rate: ${formatValue(currentRate.currentRate)}%\n`;
      formattedText += `- Rate Range: ${formatValue(currentRate.rangeLow)}% - ${formatValue(currentRate.rangeHigh)}%\n`;
      
      // Format futures data if available
      if (fedPolicyData.futuresData) {
        formattedText += `\n**Fed Funds Futures Data:**\n`;
        formattedText += `- Futures Price: ${formatValue(fedPolicyData.futuresData.futuresPrice)}\n`;
        formattedText += `- Implied Rate: ${formatValue(fedPolicyData.futuresData.impliedRate)}%\n`;
        formattedText += `- Probability of Rate Increase: ${formatValue(fedPolicyData.futuresData.probabilityUp)}%\n`;
        formattedText += `- Probability of Rate Hold: ${formatValue(fedPolicyData.futuresData.probabilityHold)}%\n`;
        formattedText += `- Probability of Rate Decrease: ${formatValue(fedPolicyData.futuresData.probabilityDown)}%\n`;
      }
      
      // Format meeting information
      formattedText += `\n**FOMC Meetings:**\n`;
      formattedText += `- Last Meeting: ${formatDate(fedPolicyData.lastMeeting?.startDate)}\n`;
      formattedText += `- Next Meeting: ${formatDate(fedPolicyData.nextMeeting?.startDate)}\n`;
      
      // Format forward guidance
      formattedText += `\n**Forward Guidance:**\n`;
      formattedText += `- Statement: ${formatValue(fedPolicyData.forwardGuidance)}\n`;
      
      // Format source information
      formattedText += `\n**Source:**\n`;
      formattedText += `- URL: ${formatValue(fedPolicyData.source?.url)}\n`;
      formattedText += `- Timestamp: ${formatValue(fedPolicyData.source?.timestamp)}\n`;
      formattedText += `- Components: ${formatValue(fedPolicyData.source?.components?.fedFundsRate?.url)}\n`;
    } else {
      formattedText += "- Error retrieving Fed policy data\n";
    }
    
    return formattedText;
  } catch (error) {
    Logger.log(`Error formatting Fed policy data: ${error}`);
    throw error;
  }
}
