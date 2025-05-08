/**
 * Fetches upcoming economic events from RapidAPI Economic Calendar
 * @return {Object} Economic events data or null if unavailable
 */
function fetchEconomicEvents() {
  try {
    // Get today's date and 5 days later
    const today = new Date();
    const fiveDaysLater = new Date();
    fiveDaysLater.setDate(today.getDate() + 5);

    // Format dates for API
    const from = today.toISOString().split('T')[0];
    const to = fiveDaysLater.toISOString().split('T')[0];

    // Fetch events from API
    let response;
    try {
      response = UrlFetchApp.fetch(
        'https://ultimate-economic-calendar.p.rapidapi.com/economic-events/tradingview',
        {
          method: 'GET',
          headers: {
            'x-rapidapi-host': 'ultimate-economic-calendar.p.rapidapi.com',
            'x-rapidapi-key': PropertiesService.getScriptProperties().getProperty('RAPID_API_KEY')
          },
          params: {
            from,
            to,
            countries: 'US' // Only getting US events for now
          }
        }
      );
    } catch (error) {
      Logger.log('Error fetching economic events: ' + error);
      return null;
    }

    // Parse response
    const data = JSON.parse(response.getContentText());
    
    // Log raw response for debugging
    Logger.log('Raw API Response: ' + JSON.stringify(data, null, 2));

    // The API returns an object with a result array
    const events = data.result || [];

    // Filter and format events
    const filteredEvents = events
      .filter(event => {
        const eventDate = new Date(event.date);
        return (
          eventDate >= today && 
          eventDate <= fiveDaysLater &&
          isSignificantEvent(event) &&
          event.source && event.source.trim()
        );
      })
      .map(event => ({
        ...event,
        date: new Date(event.date),
        actual: event.actual !== null ? formatNumber(event.actual, event.unit) : 'N/A',
        forecast: event.forecast !== null ? formatNumber(event.forecast, event.unit) : 'N/A',
        previous: event.previous !== null ? formatNumber(event.previous, event.unit) : 'N/A'
      }));

<<<<<<< HEAD
    // Sort by date (chronologically), then by importance (descending)
    filteredEvents.sort((a, b) => {
      // First sort by date (chronologically)
      if (a.date.getTime() !== b.date.getTime()) {
        return a.date - b.date;
      }
      // Then sort by importance (higher is more important) if dates are the same
      return b.importance - a.importance;
    });

    // Get the configurable number of top events (default to 10)
    const scriptProperties = PropertiesService.getScriptProperties();
    const maxEvents = parseInt(scriptProperties.getProperty('MAX_ECONOMIC_EVENTS')) || 10;
    const topEvents = filteredEvents.slice(0, maxEvents);
=======
    // Sort by importance (descending), then by date and time
    filteredEvents.sort((a, b) => {
      // First sort by importance (higher is more important)
      if (b.importance !== a.importance) {
        return b.importance - a.importance;
      }
      // Then sort by date and time
      return a.date - b.date;
    });

    // Get the top 7 most important events
    const topEvents = filteredEvents.slice(0, 7);
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa

    // Format the events for output
    const formattedEvents = topEvents.map(event => {
      const decryptedEventInfo = decryptEventInfo(event.title, event.source);
      return {
        date: formatDate(event.date),
        time: formatTime(event.date),
        country: event.country,
        event: decryptedEventInfo.name,
        source: decryptedEventInfo.source,
        actual: event.actual,
        forecast: event.forecast,
        previous: event.previous
      };
    });

    // Return just the events array
    return formattedEvents;

  } catch (error) {
    Logger.log('Error fetching economic events: ' + error);
    return null;
  }
}

/**
 * Helper function to trim trailing asterisk from a string if present
 * @param {String} str - The string to trim
 * @return {String} The trimmed string
 */
function trimTrailingAsterisk(str) {
  if (!str) return '';
  return str.endsWith('*') ? str.slice(0, -1) : str;
}

/**
 * Helper function to format date
 * @param {Date} date - The date to format
 * @return {String} Formatted date string
 */
function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
}

/**
 * Helper function to format time
 * @param {Date} date - The date to format
 * @return {String} Formatted time string
 */
function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Helper function to format numbers with appropriate suffixes
 * @param {Number} num - The number to format
 * @param {String} unit - The unit of the number
 * @return {String} Formatted number string
 */
function formatNumber(num, unit) {
  if (num === null) return 'N/A';
  
  // Handle percentage values
  if (unit === '%') {
    return `${num.toFixed(2)}%`;
  }
  
  // Handle very large numbers
  if (num >= 1e12) {
    return `${(num / 1e12).toFixed(1)}T`;
  } else if (num >= 1e9) {
    return `${(num / 1e9).toFixed(1)}B`;
  } else if (num >= 1e6) {
    return `${(num / 1e6).toFixed(1)}M`;
  } else if (num >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K`;
  }
  
  return num.toString();
}

/**
 * Helper function to determine if an event is significant
 * @param {Object} event - The event to check
 * @return {Boolean} True if event is significant
 */
function isSignificantEvent(event) {
  
  // Check for important indicators
  const importantIndicators = [
    'commerce',
    'gdp',
    'cpi',
    'ppi',
    'ism',
    'pmi',
    'fed',
    'bls',
    'mba',
<<<<<<< HEAD
    'frb',
    'uscb',
    'umich',
    'umisr',
    'fomc',
    'ust',
    'treasury',
    'sp global',
    'spglobal',
    'spglobal',
    'energy information administration',
    'us energy information administration',
    'us energy',
    'useia'
=======
    'frb'
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
  ];
  
  return importantIndicators.some(indicator => 
    event.source.toLowerCase().includes(indicator.toLowerCase())
  );
}

/**
 * Helper function to decrypt economic event names and sources
 * @param {string} eventName - The original event name
 * @param {string} source - The original source
 * @return {Object} Object containing decrypted event name and source
 */
function decryptEventInfo(eventName, source) {
  // Remove asterisks and trim whitespace
  const cleanName = eventName.replace(/\*$/, '').trim();
  
  // Get base event name by removing date prefix
  const baseName = cleanName.replace(/^[A-Za-z]+\s+\d+\s+/, '').trim();
  
  // Map of event names to their decrypted versions
  const eventDecryption = {
    'Philly Fed 6M Index': {
      name: 'Philadelphia Fed Business Outlook Survey 6-Month Index',
      source: 'Federal Reserve Bank of Philadelphia'
    },
    'NY Fed Manufacturing': {
      name: 'New York Fed Manufacturing Report',
      source: 'Federal Reserve Bank of New York'
    },
    'Philly Fed Employment': {
      name: 'Philadelphia Fed Business Outlook Survey Employment Index',
      source: 'Federal Reserve Bank of Philadelphia'
    },
    'Real Weekly Earnings MM': {
      name: 'Average weekly earnings adjusted for inflation MoM',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'MBA 30-Yr Mortgage Rate': {
      name: '30-Year Fixed Rate Mortgage Rate',
      source: 'Mortgage Bankers Association'
    },
    'MBA Mortgage Applications': {
      name: 'Mortgage Applications Index',
      source: 'Mortgage Bankers Association'
    },
    'MBA Purchase Index': {
      name: 'Purchase Mortgage Applications Index',
      source: 'Mortgage Bankers Association'
    },
    'Mortgage Market Index': {
      name: 'Refinance Mortgage Applications Index',
      source: 'Mortgage Bankers Association'
    },
    'CPI MM, SA': {
      name: 'Consumer Price Index MoM (Seasonally Adjusted)',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'CPI YY, NSA': {
      name: 'Consumer Price Index YoY (Not Seasonally Adjusted)',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'Core CPI MM, SA': {
      name: 'Core Consumer Price Index MoM (Seasonally Adjusted)',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'Core CPI YY, NSA': {
      name: 'Core Consumer Price Index YoY (Not Seasonally Adjusted)',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'Initial Jobless Clm': {
      name: 'Initial Jobless Claims',
      source: 'U.S. Department of Labor'
    },
    'EIA Wkly Crude Stk': {
      name: 'Weekly Crude Oil Stocks',
      source: 'U.S. Energy Information Administration'
    },
    'PPI exFood/Energy MM': {
      name: 'Producer Price Index excluding Food & Energy MoM',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'PPI Final Demand MM': {
      name: 'Producer Price Index for Final Demand MoM',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'PPI Final Demand YY': {
      name: 'Producer Price Index for Final Demand YoY',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'PPI ex Food/Energy/Tr MM': {
      name: 'Producer Price Index excluding Food, Energy & Transportation MoM',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'PPI ex Food/Energy/Tr YY': {
      name: 'Producer Price Index excluding Food, Energy & Transportation YoY',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'Export Prices MM': {
      name: 'Export Prices Index MoM',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'Import Prices MM': {
      name: 'Import Prices Index MoM',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'Import Prices YY': {
      name: 'Import Prices Index YoY',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'House Starts MM: Change': {
      name: 'Housing Starts MoM Change',
      source: 'U.S. Department of Commerce'
    },
    'Housing Starts Number': {
      name: 'Housing Starts (Total Number)',
      source: 'U.S. Department of Commerce'
    },
    'Build Permits: Change MM': {
      name: 'Building Permits MoM Change',
      source: 'U.S. Department of Commerce'
    },
    'Build Permits: Number': {
      name: 'Building Permits (Total Number)',
      source: 'U.S. Department of Commerce'
    },
    'Philly Fed 6M Index*': {
      name: 'Philadelphia Fed 6-Month Outlook Index',
      source: 'Federal Reserve Bank of Philadelphia'
    },
    'Philly Fed Business Indx*': {
      name: 'Philadelphia Fed Business Conditions Index',
      source: 'Federal Reserve Bank of Philadelphia'
    },
    'Rich Fed Comp. Index': {
      name: 'Richmond Fed Composite Index',
      source: 'Federal Reserve Bank of Richmond'
    },
    'Rich Fed Mfg Shipments': {
      name: 'Richmond Fed Manufacturing Shipments Index',
      source: 'Federal Reserve Bank of Richmond'
    },
    'Rich Fed, Services Index': {
      name: 'Richmond Fed Services Index',
      source: 'Federal Reserve Bank of Richmond'
    },
    'Build Permits R Chg MM': {
      name: 'Building Permits MoM Change (Residential)',
      source: 'U.S. Department of Commerce'
    },
    'Build Permits R Numb': {
      name: 'Building Permits (Total Number, Residential)',
      source: 'U.S. Department of Commerce'
    },
    'New Home Sales Chg MM': {
      name: 'New Home Sales MoM Change',
      source: 'U.S. Department of Commerce'
    },
    'New Home Sales-Units': {
      name: 'New Home Sales (Number of Units, in Millions)',
      source: 'U.S. Department of Commerce'
<<<<<<< HEAD
    },
    'Non-Farm Payrolls': {
      name: 'U.S. Non-Farm Payroll Employment Change',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'ISM Manufacturing PMI': {
      name: 'Manufacturing Purchasing Managers Index',
      source: 'Institute for Supply Management'
    },
    'Unemployment Rate': {
      name: 'U.S. Unemployment Rate',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'GDP Advance': {
      name: 'Gross Domestic Product - Advance Estimate (Quarterly)',
      source: 'U.S. Department of Commerce'
    },
    'GDP Cons Spending Advance': {
      name: 'Consumer Spending Component of GDP - Advance Estimate',
      source: 'U.S. Department of Commerce'
    },
    'Employment Cost Index': {
      name: 'Employment Cost Index (Quarterly)',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'Core PCE Price Index MM': {
      name: 'Core Personal Consumption Expenditures Price Index (Month-over-Month)',
      source: 'U.S. Department of Commerce'
    },
    'Manufacturing PMI': {
      name: 'Manufacturing Purchasing Managers Index',
      source: 'Institute for Supply Management'
    },
    'Non-Farm Payroll Employment Change': {
      name: 'Non-Farm Payroll Employment Change',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'Unemployment Rate': {
      name: 'Unemployment Rate',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'Average Earnings MM': {
      name: 'Average Hourly Earnings Month-over-Month',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'Average Workweek Hrs': {
      name: 'Average Weekly Hours',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'Labor Force Partic': {
      name: 'Labor Force Participation Rate',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'ISM N-Mfg PMI': {
      name: 'ISM Non-Manufacturing PMI',
      source: 'Institute for Supply Management'
    },
    'Fed Funds Tgt Rate': {
      name: 'Federal Funds Target Rate',
      source: 'Federal Open Market Committee'
    },
    'Unit Labor Costs Prelim': {
      name: 'Unit Labor Costs - Preliminary',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'Refinance Mortgage Applications Index': {
      name: 'Refinance Mortgage Applications Index',
      source: 'Mortgage Bankers Association'
    },
    'Mortgage Refinance Index': {
      name: 'Mortgage Refinance Index',
      source: 'Mortgage Bankers Association'
    },
    'Consumer Credit': {
      name: 'Consumer Credit',
      source: 'Federal Reserve'
    },
    'Productivity Prelim': {
      name: 'Productivity - Preliminary',
      source: 'U.S. Bureau of Labor Statistics'
    },
    'Wholesale Invt(y), R MM': {
      name: 'Wholesale Inventory Month-over-Month - Revised',
      source: 'U.S. Department of Commerce'
    },
    'Wholesale Sales MM': {
      name: 'Wholesale Sales Month-over-Month',
      source: 'U.S. Department of Commerce'
=======
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
    }
  };

  // Get decrypted info or use original if not found
  const decrypted = eventDecryption[baseName] || {
    name: baseName,
    source: source
  };

  return {
    name: decrypted.name,
    source: decrypted.source
  };
}

/**
 * Test function to run fetchEconomicEvents
 * @return {Object} Test results
 */
function testFetchEconomicEvents() {
  try {
    const result = fetchEconomicEvents();
    
    if (result === null) {
      throw new Error('Failed to fetch economic events');
    }

    Logger.log('Test Results:');
    Logger.log('Total events: ' + result.length);
    Logger.log('');
    
    // Log each event with a nice format
    result.forEach((event, index) => {
      Logger.log(`Event ${index + 1}:`);
      Logger.log(`Date: ${event.date} ${event.time}`);
      Logger.log(`Country: ${event.country}`);
      Logger.log(`Event: ${event.event}`);
      Logger.log(`Source: ${event.source}`);
      Logger.log(`Actual: ${event.actual}`);
      Logger.log(`Forecast: ${event.forecast}`);
      Logger.log(`Previous: ${event.previous}`);
      Logger.log('');
    });
    
    return {
      success: true,
      message: 'Test completed successfully',
      result: result
    };
  } catch (error) {
    Logger.log('Test failed: ' + error);
    return {
      success: false,
      message: 'Test failed: ' + error,
      error: error
    };
  }
}

/**
 * Main function to run when the script is executed
 */
function main() {
  const testResult = testFetchEconomicEvents();
  
  if (testResult.success) {
    Logger.log('Economic events fetch test passed!');
  } else {
    Logger.log('Economic events fetch test failed: ' + testResult.message);
  }
}
