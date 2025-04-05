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

    // Sort by importance (descending), then by date and time
    filteredEvents.sort((a, b) => {
      // First sort by importance (higher is more important)
      if (b.importance !== a.importance) {
        return b.importance - a.importance;
      }
      // Then sort by date and time
      return a.date - b.date;
    });

    // Get the top 5 most important events
    const topEvents = filteredEvents.slice(0, 5);

    // Format the events for output
    const formattedEvents = topEvents.map(event => ({
      date: formatDate(event.date),
      time: formatTime(event.date),
      country: event.country,
      event: `${trimTrailingAsterisk(event.title)} - ${event.source}`,
      actual: event.actual,
      forecast: event.forecast,
      previous: event.previous
    }));

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
  // Higher importance values indicate more significant events
  if (event.importance >= 0) return true;
  
  // Check for important indicators
  const importantIndicators = [
    'Retail Sales',
    'Industrial Production',
    'Capacity Utilization',
    'Business Inventories',
    'Consumer Confidence',
    'Employment',
    'Inflation',
    'GDP',
    'CPI',
    'PPI',
    'ISM',
    'PMI',
    'Jobless Claims',
    'Housing Starts',
    'Building Permits',
    'New Home Sales',
    'Existing Home Sales',
    'Consumer Spending',
    'Personal Income',
    'Trade Balance',
    'Fed Interest Rate'
  ];
  
  return importantIndicators.some(indicator => 
    event.title.toLowerCase().includes(indicator.toLowerCase())
  );
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
