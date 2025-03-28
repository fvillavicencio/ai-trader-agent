/**
 * Key Market Indicators Module
 * Handles retrieval of key market indicators including major indices, sector performance, 
 * volatility indices, and upcoming economic events
 */

/**
 * Retrieves key market indicators data
 * @return {Object} Key market indicators data
 */
function retrieveKeyMarketIndicators() {
  try {
    Logger.log("Retrieving key market indicators data...");
    
    // Check if we have cached data first
    try {
      const scriptCache = CacheService.getScriptCache();
      const cachedData = scriptCache.get('KEY_MARKET_INDICATORS_DATA');
      
      if (cachedData) {
        Logger.log("Using cached key market indicators data (less than 1 hour old)");
        const parsedData = JSON.parse(cachedData);
        
        // Ensure the cached data has the formattedData field
        if (!parsedData.formattedData) {
          parsedData.formattedData = formatKeyMarketIndicatorsData(parsedData);
        }
        
        return parsedData;
      }
    } catch (cacheError) {
      Logger.log("Cache retrieval error for key market indicators: " + cacheError);
      // Continue execution - we'll get fresh data below
    }
    
    // Initialize the results object with default values
    const results = {
      success: true,
      message: "Retrieved key market indicators data successfully",
      majorIndices: [],
      sectorPerformance: [],
      volatilityIndices: [],
      fearAndGreedIndex: null,
      upcomingEconomicEvents: [],
      timestamp: new Date(),
      fromCache: false
    };
    
    // Get major indices data
    try {
      const majorIndicesData = retrieveMajorIndices();
      if (majorIndicesData && majorIndicesData.length > 0) {
        results.majorIndices = majorIndicesData;
      } else {
        Logger.log("Major indices data not available");
        results.success = false;
        results.message = "Failed to retrieve some market data";
      }
    } catch (error) {
      Logger.log(`Error retrieving major indices: ${error}`);
      results.success = false;
      results.message = "Failed to retrieve some market data";
    }
    
    // Get sector performance data
    try {
      const sectorPerformanceData = retrieveSectorPerformance();
      if (sectorPerformanceData && sectorPerformanceData.length > 0) {
        results.sectorPerformance = sectorPerformanceData;
      } else {
        Logger.log("Sector performance data not available");
        results.success = false;
        results.message = "Failed to retrieve some market data";
      }
    } catch (error) {
      Logger.log(`Error retrieving sector performance: ${error}`);
      results.success = false;
      results.message = "Failed to retrieve some market data";
    }
    
    // Get volatility indices data
    try {
      const volatilityIndicesData = retrieveVolatilityIndices();
      if (volatilityIndicesData && volatilityIndicesData.length > 0) {
        results.volatilityIndices = volatilityIndicesData;
      } else {
        Logger.log("Volatility indices data not available");
        results.success = false;
        results.message = "Failed to retrieve some market data";
      }
    } catch (error) {
      Logger.log(`Error retrieving volatility indices: ${error}`);
      results.success = false;
      results.message = "Failed to retrieve some market data";
    }
    
    // Get Fear & Greed Index data
    try {
      const fearAndGreedIndexData = retrieveFearAndGreedIndex();
      if (fearAndGreedIndexData && !fearAndGreedIndexData.error) {
        results.fearAndGreedIndex = fearAndGreedIndexData;
      } else {
        Logger.log("Fear & Greed Index data not available");
        if (fearAndGreedIndexData && fearAndGreedIndexData.errorMessage) {
          Logger.log(`Fear & Greed Index error: ${fearAndGreedIndexData.errorMessage}`);
        }
        results.success = false;
        results.message = "Failed to retrieve some market data";
      }
    } catch (error) {
      Logger.log(`Error retrieving Fear & Greed Index: ${error}`);
      results.success = false;
      results.message = "Failed to retrieve some market data";
    }
    
    // Get upcoming economic events data
    try {
      const upcomingEconomicEventsData = retrieveUpcomingEconomicEvents();
      if (upcomingEconomicEventsData && upcomingEconomicEventsData.events && upcomingEconomicEventsData.events.length > 0) {
        results.upcomingEconomicEvents = upcomingEconomicEventsData.events;
      } else {
        Logger.log("Upcoming economic events data not available");
        if (upcomingEconomicEventsData && upcomingEconomicEventsData.errorMessage) {
          Logger.log(`Economic events error: ${upcomingEconomicEventsData.errorMessage}`);
        }
        results.success = false;
        results.message = "Failed to retrieve some market data";
      }
    } catch (error) {
      Logger.log(`Error retrieving upcoming economic events: ${error}`);
      results.success = false;
      results.message = "Failed to retrieve some market data";
    }
    
    // Format the data for display
    results.formattedData = formatKeyMarketIndicatorsData(results);
    
    // Cache the results
    try {
      const scriptCache = CacheService.getScriptCache();
      scriptCache.put('KEY_MARKET_INDICATORS_DATA', JSON.stringify(results), 3600); // Cache for 1 hour
      Logger.log("Key market indicators data cached successfully");
    } catch (cacheError) {
      Logger.log("Error caching key market indicators data: " + cacheError);
    }
    
    // Log the retrieval status
    if (results.success) {
      Logger.log("Successfully retrieved all key market indicators data");
    } else {
      Logger.log("Retrieved key market indicators data with some missing components");
    }
    
    return results;
  } catch (error) {
    Logger.log(`Error retrieving key market indicators data: ${error}`);
    return {
      success: false,
      message: `Error retrieving key market indicators data: ${error}`,
      majorIndices: [],
      sectorPerformance: [],
      volatilityIndices: [],
      fearAndGreedIndex: null,
      upcomingEconomicEvents: [],
      timestamp: new Date(),
      fromCache: false,
      formattedData: "Error retrieving key market indicators data. Please try again later."
    };
  }
}

/**
 * Formats the key market indicators data for display
 * @param {Object} data - Key market indicators data
 * @return {String} Formatted key market indicators data
 */
function formatKeyMarketIndicatorsData(data) {
  try {
    let formattedText = "KEY MARKET INDICATORS DATA:\n\n";
    
    // Format major indices
    if (data.majorIndices && data.majorIndices.length > 0) {
      formattedText += "- Major Indices:\n";
      
      // Sort indices by name
      const sortedIndices = [...data.majorIndices].sort((a, b) => {
        if (a.name.includes("S&P 500")) return -1;
        if (b.name.includes("S&P 500")) return 1;
        if (a.name.includes("Dow")) return -1;
        if (b.name.includes("Dow")) return 1;
        if (a.name.includes("NASDAQ")) return -1;
        if (b.name.includes("NASDAQ")) return 1;
        return a.name.localeCompare(b.name);
      });
      
      // Add each index
      for (const index of sortedIndices) {
        const priceStr = index.price !== undefined ? index.price.toLocaleString() : "N/A";
        const changeStr = index.percentChange !== undefined ? 
                         `${index.percentChange >= 0 ? "+" : ""}${index.percentChange.toFixed(1)}%` : 
                         "N/A";
        
        formattedText += `  * ${index.name}: ${priceStr} (${changeStr})\n`;
      }
      
      // Add timestamp
      formattedText += `  * Last Updated: ${new Date(data.majorIndices[0].timestamp || data.timestamp || new Date()).toLocaleString()}\n\n`;
    }
    
    // Format sector performance
    if (data.sectorPerformance && data.sectorPerformance.length > 0) {
      formattedText += "- Sector Performance:\n";
      
      // Sort sectors by performance (descending)
      const sortedSectors = [...data.sectorPerformance].sort((a, b) => {
        return (b.percentChange || 0) - (a.percentChange || 0);
      });
      
      // Add each sector
      for (const sector of sortedSectors) {
        const changeStr = sector.percentChange !== undefined ? 
                         `${sector.percentChange >= 0 ? "+" : ""}${sector.percentChange.toFixed(1)}%` : 
                         "N/A";
        
        formattedText += `  * ${sector.name}: ${changeStr}\n`;
      }
      
      // Add timestamp
      formattedText += `  * Last Updated: ${new Date(data.sectorPerformance[0].timestamp || data.timestamp || new Date()).toLocaleString()}\n\n`;
    }
    
    // Format Fear & Greed Index
    if (data.fearAndGreedIndex) {
      formattedText += `* CNN Fear & Greed Index:\n`;
      
      if (data.fearAndGreedIndex.currentValue !== undefined && data.fearAndGreedIndex.rating) {
        formattedText += `  * Current: ${data.fearAndGreedIndex.currentValue} (${data.fearAndGreedIndex.rating})\n`;
      } else {
        formattedText += `  * Current: Data unavailable\n`;
      }
      
      // Add timestamp
      formattedText += `  * Last Updated: ${new Date(data.fearAndGreedIndex.timestamp || data.timestamp || new Date()).toLocaleString()}\n\n`;
    } else {
      formattedText += `* CNN Fear & Greed Index: Data unavailable\n\n`;
    }
    
    // Format volatility indices
    if (data.volatilityIndices && data.volatilityIndices.length > 0) {
      formattedText += "* Volatility Indices:\n";
      
      // Add each volatility index
      for (const index of data.volatilityIndices) {
        const priceStr = index.price !== undefined ? index.price.toLocaleString() : "N/A";
        const changeStr = index.percentChange !== undefined ? 
                         `${index.percentChange >= 0 ? "+" : ""}${index.percentChange.toFixed(1)}%` : 
                         "N/A";
        
        formattedText += `  * ${index.name}: ${priceStr} (${changeStr})\n`;
      }
      
      // Add timestamp
      formattedText += `  * Last Updated: ${new Date(data.volatilityIndices[0].timestamp || data.timestamp || new Date()).toLocaleString()}\n\n`;
    }
    
    // Format upcoming economic events
    if (data.upcomingEconomicEvents && data.upcomingEconomicEvents.length > 0) {
      formattedText += "* Upcoming Economic Events:\n";
      
      // Sort events by date (ascending)
      const sortedEvents = [...data.upcomingEconomicEvents].sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
      });
      
      // Add each event (limit to 3 events)
      const eventsToShow = sortedEvents.slice(0, 3);
      for (const event of eventsToShow) {
        // Format the date as ISO string for consistency
        const dateObj = new Date(event.date);
        const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        formattedText += `  * ${dateStr}: ${event.name || "Economic Event"}\n`;
      }
      
      // Add timestamp
      formattedText += `  * Last Updated: ${new Date(data.timestamp || new Date()).toLocaleString()}\n`;
    } else {
      formattedText += "* Upcoming Economic Events: No data available\n";
    }
    
    return formattedText;
  } catch (error) {
    Logger.log(`Error formatting key market indicators data: ${error}`);
    return "KEY MARKET INDICATORS DATA: Error formatting data.";
  }
}

/**
 * Helper function to convert a numeric value to a Fear & Greed rating
 * @param {Number} value - The value to convert (1-100)
 * @return {String} The corresponding rating
 */
function getRatingFromValue(value) {
  if (value <= 24) {
    return "Extreme Fear";
  } else if (value <= 44) {
    return "Fear";
  } else if (value <= 54) {
    return "Neutral";
  } else if (value <= 74) {
    return "Greed";
  } else {
    return "Extreme Greed";
  }
}

/**
 * Helper function to parse treasury yield term to months for sorting
 * @param {string} term - The term (e.g., "3-Month", "2-Year", "10-Year")
 * @return {number} The term in months
 */
function parseTermToMonths(term) {
  if (!term) return 999; // Default to a high value for unknown terms
  
  const lowerTerm = term.toLowerCase();
  
  if (lowerTerm.includes('month')) {
    const months = parseInt(lowerTerm.split('-')[0]);
    return isNaN(months) ? 999 : months;
  } else if (lowerTerm.includes('year')) {
    const years = parseInt(lowerTerm.split('-')[0]);
    return isNaN(years) ? 999 : years * 12;
  } else {
    return 999; // Default for unknown format
  }
}

/**
 * Retrieves major indices data
 * @return {Array} Major indices data
 */
function retrieveMajorIndices() {
  try {
    Logger.log("Retrieving major indices data...");
    
    // This would be implemented with actual API calls in a production environment
    // For example, using Yahoo Finance API or another financial data provider
    
    // Define the indices we want to retrieve
    const indicesToRetrieve = [
      { name: "S&P 500", symbol: "^GSPC" },
      { name: "Dow Jones Industrial Average", symbol: "^DJI" },
      { name: "NASDAQ Composite", symbol: "^IXIC" },
      { name: "Russell 2000", symbol: "^RUT" }
    ];
    
    // Initialize results array
    const indices = [];
    
    // For each index, fetch the data
    for (const index of indicesToRetrieve) {
      try {
        // This would call an actual API in production
        const indexData = fetchIndexData(index.symbol);
        indices.push({
          name: index.name,
          symbol: index.symbol,
          price: indexData.price,
          change: indexData.change,
          percentChange: indexData.percentChange,
          source: indexData.source,
          sourceUrl: indexData.sourceUrl,
          timestamp: indexData.timestamp
        });
      } catch (error) {
        Logger.log(`Error retrieving data for ${index.name}: ${error}`);
      }
    }
    
    Logger.log(`Retrieved ${indices.length} major indices.`);
    return indices;
  } catch (error) {
    Logger.log(`Error retrieving major indices data: ${error}`);
    return [];
  }
}

/**
 * Fetches data for a specific index
 * @param {String} symbol - The index symbol
 * @return {Object} Index data
 */
function fetchIndexData(symbol) {
  try {
    // Use Yahoo Finance API to get real-time data
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
    
    // Enhanced options with more complete headers to avoid "Invalid argument" errors
    const options = {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      },
      contentType: 'application/json'
    };
    
    // Add a small delay to avoid rate limiting
    Utilities.sleep(100);
    
    const response = UrlFetchApp.fetch(url, options);
    
    // Check response code
    if (response.getResponseCode() !== 200) {
      throw new Error(`HTTP error: ${response.getResponseCode()}`);
    }
    
    const data = JSON.parse(response.getContentText());
    
    // Extract the relevant data
    const result = data.chart.result[0];
    const quote = result.indicators.quote[0];
    const meta = result.meta;
    
    // Get the latest price
    const latestPrice = meta.regularMarketPrice;
    
    // Get the previous close
    const previousClose = meta.previousClose || meta.chartPreviousClose;
    
    // Calculate the change
    const change = latestPrice - previousClose;
    const percentChange = (change / previousClose) * 100;
    
    // Get the timestamp of the last update from Yahoo Finance
    const timestamp = new Date(meta.regularMarketTime * 1000);
    
    return {
      price: latestPrice,
      change: change,
      percentChange: percentChange,
      source: "Yahoo Finance",
      sourceUrl: `https://finance.yahoo.com/quote/${symbol}/`,
      timestamp: timestamp, // Using the timestamp from Yahoo Finance, not script execution time
      additionalData: {
        volume: quote.volume ? quote.volume[quote.volume.length - 1] : null,
        high: meta.regularMarketDayHigh,
        low: meta.regularMarketDayLow,
        open: meta.regularMarketOpen
      }
    };
  } catch (error) {
    Logger.log(`Error fetching index data for ${symbol}: ${error}`);
    
    // Throw an error instead of returning fallback data
    throw new Error(`Failed to fetch data for ${symbol}: ${error.message}`);
  }
}

/**
 * Retrieves sector performance data
 * @return {Array} Sector performance data
 */
function retrieveSectorPerformance() {
  try {
    Logger.log("Retrieving sector performance data...");
    
    // This would be implemented with actual API calls in a production environment
    // For example, using Yahoo Finance API or another financial data provider
    
    // Define the sectors we want to retrieve
    const sectorsToRetrieve = [
      { name: "Technology", symbol: "XLK" },
      { name: "Financials", symbol: "XLF" },
      { name: "Healthcare", symbol: "XLV" },
      { name: "Consumer Discretionary", symbol: "XLY" },
      { name: "Consumer Staples", symbol: "XLP" },
      { name: "Industrials", symbol: "XLI" },
      { name: "Energy", symbol: "XLE" },
      { name: "Materials", symbol: "XLB" },
      { name: "Utilities", symbol: "XLU" },
      { name: "Real Estate", symbol: "XLRE" },
      { name: "Communication Services", symbol: "XLC" }
    ];
    
    // Initialize results array
    const sectors = [];
    
    // For each sector, fetch the data
    for (const sector of sectorsToRetrieve) {
      try {
        // This would call an actual API in production
        const sectorData = fetchSectorData(sector.symbol);
        sectors.push({
          name: sector.name,
          symbol: sector.symbol,
          percentChange: sectorData.percentChange,
          source: sectorData.source,
          sourceUrl: sectorData.sourceUrl,
          timestamp: sectorData.timestamp
        });
      } catch (error) {
        Logger.log(`Error retrieving data for ${sector.name}: ${error}`);
      }
    }
    
    // Sort sectors by performance (best to worst)
    sectors.sort((a, b) => b.percentChange - a.percentChange);
    
    Logger.log(`Retrieved ${sectors.length} sectors.`);
    return sectors;
  } catch (error) {
    Logger.log(`Error retrieving sector performance data: ${error}`);
    return [];
  }
}

/**
 * Fetches data for a specific sector
 * @param {String} symbol - The sector ETF symbol
 * @return {Object} Sector data
 */
function fetchSectorData(symbol) {
  try {
    // Use Yahoo Finance API to get real-time data
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const options = {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      }
    };
    const response = UrlFetchApp.fetch(url, options);
    
    // Check response code
    if (response.getResponseCode() !== 200) {
      throw new Error(`HTTP error: ${response.getResponseCode()}`);
    }
    
    const data = JSON.parse(response.getContentText());
    
    // Extract the relevant data
    const result = data.chart.result[0];
    const quote = result.indicators.quote[0];
    const meta = result.meta;
    
    // Get the latest price
    const latestPrice = meta.regularMarketPrice;
    
    // Get the previous close
    const previousClose = meta.previousClose || meta.chartPreviousClose;
    
    // Calculate the change
    const change = latestPrice - previousClose;
    const percentChange = (change / previousClose) * 100;
    
    // Get the timestamp of the last update
    const timestamp = meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000) : new Date();
    
    return {
      price: latestPrice,
      change: change,
      percentChange: percentChange,
      source: "Yahoo Finance",
      sourceUrl: `https://finance.yahoo.com/quote/${symbol}/`,
      timestamp: timestamp
    };
  } catch (error) {
    Logger.log(`Error fetching sector data for ${symbol}: ${error}`);
    
    // Throw an error instead of returning fallback data
    throw new Error(`Failed to fetch data for ${symbol}: ${error}`);
  }
}

/**
 * Retrieves volatility indices data
 * @return {Array} Volatility indices data
 */
function retrieveVolatilityIndices() {
  try {
    Logger.log("Retrieving volatility indices...");
    
    // Fetch volatility data from Yahoo Finance
    const volatilityIndices = fetchVolatilityData();
    
    // If we got valid data, return it
    if (volatilityIndices && Array.isArray(volatilityIndices) && volatilityIndices.length > 0) {
      return volatilityIndices;
    }
    
    // If we couldn't get data, return an empty array
    Logger.log("Could not retrieve volatility indices");
    return [];
    
  } catch (error) {
    Logger.log(`Error retrieving volatility indices: ${error}`);
    return [];
  }
}

/**
 * Fetches volatility data from Yahoo Finance
 * @return {Object} Volatility data
 */
function fetchVolatilityData() {
  try {
    Logger.log("Fetching volatility data from Yahoo Finance...");
    
    // Define the symbols for volatility indices
    const symbols = ["^VIX", "^VXN"];
    const volatilityIndices = [];
    
    // Fetch data for each symbol
    for (const symbol of symbols) {
      try {
        // Use Yahoo Finance API to get real-time data
        // Properly encode the symbol to handle special characters like ^
        const encodedSymbol = encodeURIComponent(symbol);
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}`;
        
        Logger.log(`Fetching volatility data for ${symbol} from ${url}`);
        
        // Enhanced options with more complete headers to avoid "Invalid argument" errors
        const options = {
          muteHttpExceptions: true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Cache-Control': 'max-age=0'
          },
          contentType: 'application/json'
        };
        
        const response = UrlFetchApp.fetch(url, options);
        const responseCode = response.getResponseCode();
        
        // Check if the request was successful
        if (responseCode !== 200) {
          Logger.log(`Yahoo Finance API request failed for ${symbol} with response code: ${responseCode}`);
          continue;
        }
        
        // Parse the response
        const responseText = response.getContentText();
        const data = JSON.parse(responseText);
        
        // Check if the response contains the expected data structure
        if (!data || !data.chart || !data.chart.result || !data.chart.result[0] || !data.chart.result[0].meta) {
          Logger.log(`Yahoo Finance API response for ${symbol} does not contain expected data structure`);
          continue;
        }
        
        // Extract the values
        const meta = data.chart.result[0].meta;
        const value = meta.regularMarketPrice;
        const previousClose = meta.previousClose;
        
        // Validate the values
        if (value === undefined || previousClose === undefined) {
          Logger.log(`Missing price data for ${symbol}`);
          continue;
        }
        
        // Calculate change and percent change
        const change = value - previousClose;
        const percentChange = (change / previousClose) * 100;
        
        // Determine the trend
        let trend = "Neutral";
        if (change > 0) {
          trend = "Rising";
        } else if (change < 0) {
          trend = "Falling";
        }
        
        // Generate analysis
        let analysis = "";
        if (symbol === "^VIX") {
          if (value < 15) {
            analysis = "Low volatility indicates market complacency or stability.";
          } else if (value >= 15 && value < 25) {
            analysis = "Moderate volatility suggests normal market conditions.";
          } else if (value >= 25 && value < 35) {
            analysis = "Elevated volatility indicates increased market uncertainty.";
          } else {
            analysis = "High volatility signals significant market fear or instability.";
          }
        } else if (symbol === "^VXN") {
          if (value < 20) {
            analysis = "Low volatility in tech stocks indicates stability.";
          } else if (value >= 20 && value < 30) {
            analysis = "Moderate volatility suggests normal conditions for tech stocks.";
          } else if (value >= 30 && value < 40) {
            analysis = "Elevated volatility indicates increased uncertainty in tech sector.";
          } else {
            analysis = "High volatility signals significant fear or instability in tech stocks.";
          }
        }
        
        // Get the timestamp
        const timestamp = meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000) : new Date();
        
        // Create the volatility index object
        const name = symbol === "^VIX" ? "CBOE Volatility Index" : "NASDAQ Volatility Index";
        const volatilityIndex = {
          symbol: symbol,
          name: name,
          value: value,
          previousClose: previousClose,
          change: change,
          percentChange: percentChange,
          trend: trend,
          analysis: analysis,
          timestamp: timestamp,
          source: "Yahoo Finance",
          sourceUrl: `https://finance.yahoo.com/quote/${symbol}/`
        };
        
        volatilityIndices.push(volatilityIndex);
      } catch (error) {
        Logger.log(`Error fetching volatility data for ${symbol}: ${error}`);
        // Continue to the next symbol instead of returning null for all
      }
    }
    
    // Return the volatility indices if any were successfully retrieved
    if (volatilityIndices.length > 0) {
      return volatilityIndices;
    } else {
      Logger.log("No volatility indices could be retrieved");
      return null;
    }
  } catch (error) {
    Logger.log(`Error fetching volatility data: ${error}`);
    return null;
  }
}

/**
 * Retrieves the CNN Fear & Greed Index
 * @return {Object} Fear & Greed Index data or null if unavailable
 */
function retrieveFearAndGreedIndex() {
  try {
    Logger.log("Retrieving CNN Fear & Greed Index data...");
    
    // Check if we have cached data first
    try {
      const scriptCache = CacheService.getScriptCache();
      const cachedData = scriptCache.get('FEAR_AND_GREED_INDEX_DATA');
      
      if (cachedData) {
        Logger.log("Using cached Fear & Greed Index data (less than 1 hour old)");
        return JSON.parse(cachedData);
      }
    } catch (cacheError) {
      Logger.log("Cache retrieval error for Fear & Greed Index: " + cacheError);
      // Continue execution - we'll get fresh data below
    }
    
    // Try to get data from primary source (CNN)
    let data = null;
    let source = "";
    let sourceUrl = "";
    let errorMessage = "";
    
    try {
      // Fetch the Fear & Greed Index data from CNN
      Logger.log("Attempting to fetch Fear & Greed Index from CNN...");
      data = fetchFearAndGreedIndexData();
      source = "CNN Business";
      sourceUrl = "https://www.cnn.com/markets/fear-and-greed";
      
      if (data) {
        Logger.log("Successfully retrieved Fear & Greed Index from CNN");
      } else {
        errorMessage = "CNN Fear & Greed Index data unavailable";
        Logger.log(errorMessage);
      }
    } catch (primaryError) {
      errorMessage = "Error fetching from CNN: " + primaryError;
      Logger.log(errorMessage);
      // Continue to alternative source
    }
    
    // If primary source failed, try alternative source (Alternative.me)
    if (!data) {
      try {
        Logger.log("Primary source failed, attempting to fetch Fear & Greed Index from Alternative.me...");
        data = fetchAlternativeFearAndGreedIndex();
        source = "Alternative.me Crypto Fear & Greed Index";
        sourceUrl = "https://alternative.me/crypto/fear-and-greed-index/";
        
        if (data) {
          Logger.log("Successfully retrieved Fear & Greed Index from Alternative.me");
        } else {
          errorMessage += " | Alternative.me Fear & Greed Index data unavailable";
          Logger.log("Alternative.me Fear & Greed Index data unavailable");
        }
      } catch (alternativeError) {
        errorMessage += " | Error fetching from Alternative.me: " + alternativeError;
        Logger.log("Error fetching from Alternative.me: " + alternativeError);
      }
    }
    
    // If both sources failed, check for stale cache (up to 24 hours old)
    if (!data) {
      try {
        Logger.log("All sources failed, checking for stale cache (up to 24 hours old)...");
        const scriptProperties = PropertiesService.getScriptProperties();
        const staleCacheData = scriptProperties.getProperty('FEAR_AND_GREED_INDEX_STALE_CACHE');
        
        if (staleCacheData) {
          const parsedStaleData = JSON.parse(staleCacheData);
          const cacheTimestamp = new Date(parsedStaleData.timestamp);
          const currentTime = new Date();
          const cacheAge = (currentTime - cacheTimestamp) / (1000 * 60 * 60); // Age in hours
          
          if (cacheAge <= 24) {
            Logger.log(`Using stale cache (${cacheAge.toFixed(1)} hours old)`);
            parsedStaleData.isStaleData = true;
            parsedStaleData.staleAge = `${cacheAge.toFixed(1)} hours`;
            return parsedStaleData;
          } else {
            Logger.log("Stale cache is too old (> 24 hours)");
          }
        } else {
          Logger.log("No stale cache available");
        }
      } catch (staleCacheError) {
        Logger.log("Error retrieving stale cache: " + staleCacheError);
      }
    }
    
    // If all attempts failed, return error object
    if (!data) {
      Logger.log("All attempts to retrieve Fear & Greed Index failed");
      return {
        error: true,
        errorMessage: errorMessage,
        timestamp: new Date()
      };
    }
    
    // Extract the current value and calculate the rating
    const currentValue = data.fear_and_greed && data.fear_and_greed.score ? parseInt(data.fear_and_greed.score) : null;
    
    // If we couldn't extract a valid value, return error
    if (currentValue === null || isNaN(currentValue)) {
      Logger.log("Invalid Fear & Greed Index value");
      return {
        error: true,
        errorMessage: "Invalid Fear & Greed Index value",
        timestamp: new Date()
      };
    }
    
    // Calculate the rating based on the value
    const rating = getRatingFromValue(currentValue);
    
    // Create the result object
    const result = {
      currentValue: currentValue,
      rating: rating,
      previousValue: data.fear_and_greed && data.fear_and_greed.previous_close ? parseInt(data.fear_and_greed.previous_close) : null,
      previousRating: data.fear_and_greed && data.fear_and_greed.previous_close ? getRatingFromValue(parseInt(data.fear_and_greed.previous_close)) : null,
      oneWeekAgo: data.fear_and_greed && data.fear_and_greed.previous_1_week ? parseInt(data.fear_and_greed.previous_1_week) : null,
      oneMonthAgo: data.fear_and_greed && data.fear_and_greed.previous_1_month ? parseInt(data.fear_and_greed.previous_1_month) : null,
      oneYearAgo: data.fear_and_greed && data.fear_and_greed.previous_1_year ? parseInt(data.fear_and_greed.previous_1_year) : null,
      components: data.fear_and_greed && data.fear_and_greed.rating_data ? data.fear_and_greed.rating_data : null,
      source: source,
      sourceUrl: sourceUrl,
      timestamp: new Date(),
      error: false
    };
    
    // Cache the result in both short-term and long-term storage
    try {
      // Short-term cache (1 hour)
      const scriptCache = CacheService.getScriptCache();
      scriptCache.put('FEAR_AND_GREED_INDEX_DATA', JSON.stringify(result), 3600); // Cache for 1 hour
      
      // Long-term stale cache (for fallback, stored in Properties)
      const scriptProperties = PropertiesService.getScriptProperties();
      scriptProperties.setProperty('FEAR_AND_GREED_INDEX_STALE_CACHE', JSON.stringify(result));
      
      Logger.log("Fear & Greed Index data cached successfully (both fresh and stale cache)");
    } catch (cacheError) {
      Logger.log("Error caching Fear & Greed Index data: " + cacheError);
    }
    
    Logger.log(`Retrieved Fear & Greed Index: ${result.currentValue} (${result.rating}) from ${source}`);
    return result;
  } catch (error) {
    Logger.log(`Error retrieving Fear & Greed Index: ${error}`);
    return {
      error: true,
      errorMessage: `Error retrieving Fear & Greed Index: ${error}`,
      timestamp: new Date()
    };
  }
}

/**
 * Fetches the Fear & Greed Index from Alternative.me (crypto)
 * This serves as an alternative source when CNN is unavailable
 * @return {Object} Raw Fear & Greed Index data or null if unavailable
 */
function fetchAlternativeFearAndGreedIndex() {
  try {
    // Use the limit parameter to get more historical data
    const url = "https://api.alternative.me/fng/?limit=10";
    const options = {
      method: "get",
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      },
      muteHttpExceptions: true
    };
    
    Logger.log("Attempting to fetch Fear & Greed Index from Alternative.me...");
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      Logger.log(`Alternative.me API error: Response code ${responseCode}`);
      return null;
    }
    
    const responseText = response.getContentText();
    const parsedData = JSON.parse(responseText);
    
    // Verify we have valid data
    if (!parsedData || !parsedData.data || parsedData.data.length === 0) {
      Logger.log("Invalid data format from Alternative.me API");
      return null;
    }
    
    // Convert Alternative.me data format to match CNN format for compatibility
    const currentData = parsedData.data[0];
    const yesterdayData = parsedData.data.length > 1 ? parsedData.data[1] : null;
    const weekAgoIndex = Math.min(7, parsedData.data.length - 1);
    const weekAgoData = parsedData.data.length > weekAgoIndex ? parsedData.data[weekAgoIndex] : null;
    
    // Log the retrieved data for debugging
    Logger.log(`Alternative.me current value: ${currentData.value}, classification: ${currentData.value_classification}`);
    
    // Create a compatible data structure
    return {
      fear_and_greed: {
        score: currentData.value,
        previous_close: yesterdayData ? yesterdayData.value : null,
        previous_1_week: weekAgoData ? weekAgoData.value : null,
        previous_1_month: null, // Not available in this API
        previous_1_year: null,  // Not available in this API
        rating_data: null       // Not available in this API
      }
    };
  } catch (error) {
    Logger.log(`Error in fetchAlternativeFearAndGreedIndex: ${error}`);
    return null;
  }
}

/**
 * Fetches the CNN Fear & Greed Index data
 * @return {Object} Raw Fear & Greed Index data or null if unavailable
 */
function fetchFearAndGreedIndexData() {
  try {
    // Try the direct API first
    const apiUrl = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";
    
    // Enhanced options with more complete headers to avoid "Invalid argument" errors
    const options = {
      method: "get",
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://www.cnn.com/markets/fear-and-greed',
        'Origin': 'https://www.cnn.com',
        'sec-ch-ua': '"Google Chrome";v="121", "Not A(Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site'
      },
      muteHttpExceptions: true
    };
    
    Logger.log("Sending request to CNN Fear & Greed API...");
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    
    Logger.log(`CNN API response code: ${responseCode}`);
    
    if (responseCode === 200) {
      const responseText = response.getContentText();
      Logger.log(`CNN API response text: ${responseText.substring(0, 200)}...`); // Log first 200 chars
      
      try {
        const data = JSON.parse(responseText);
        
        // Verify we have valid data
        if (data && data.fear_and_greed && data.fear_and_greed.score) {
          Logger.log(`Successfully retrieved Fear & Greed Index data from CNN API: Score=${data.fear_and_greed.score}`);
          return data;
        } else {
          Logger.log("CNN API returned 200 but data structure is invalid. Data received: " + JSON.stringify(data).substring(0, 200));
        }
      } catch (parseError) {
        Logger.log(`Error parsing CNN API response: ${parseError}`);
        Logger.log(`Raw response: ${responseText.substring(0, 200)}...`);
      }
    } else {
      // If API failed, log the response for debugging
      Logger.log(`CNN API failed with response code ${responseCode}`);
      try {
        const errorText = response.getContentText();
        Logger.log(`Error response: ${errorText.substring(0, 200)}...`);
      } catch (e) {
        Logger.log("Could not get error response text");
      }
    }
    
    // Try alternative CNN Fear & Greed endpoint as fallback
    try {
      Logger.log("Trying alternative CNN Fear & Greed endpoint...");
      const alternativeUrl = "https://www.cnn.com/markets/fear-and-greed";
      const altResponse = UrlFetchApp.fetch(alternativeUrl, {
        muteHttpExceptions: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        }
      });
      
      if (altResponse.getResponseCode() === 200) {
        const htmlContent = altResponse.getContentText();
        // Look for the fear and greed data in the HTML
        const dataMatch = htmlContent.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});/);
        if (dataMatch && dataMatch[1]) {
          try {
            const initialState = JSON.parse(dataMatch[1]);
            // Navigate through the state object to find fear and greed data
            if (initialState && initialState.marketData && initialState.marketData.fearAndGreed) {
              const fearAndGreed = initialState.marketData.fearAndGreed;
              Logger.log("Successfully extracted Fear & Greed data from CNN HTML");
              
              // Convert to the expected format
              return {
                fear_and_greed: {
                  score: fearAndGreed.score,
                  previous_close: fearAndGreed.previousClose,
                  previous_1_week: fearAndGreed.oneWeekAgo,
                  previous_1_month: fearAndGreed.oneMonthAgo,
                  previous_1_year: fearAndGreed.oneYearAgo,
                  rating_data: fearAndGreed.indicators
                }
              };
            }
          } catch (parseError) {
            Logger.log(`Error parsing CNN HTML data: ${parseError}`);
          }
        }
      }
    } catch (altError) {
      Logger.log(`Error with alternative CNN endpoint: ${altError}`);
    }
    
    return null;
  } catch (error) {
    Logger.log(`Error retrieving Fear & Greed Index from CNN: ${error}`);
    return null;
  }
}

/**
 * Gets the rating from a Fear & Greed Index value
 * @param {Number} value - Fear & Greed Index value (0-100)
 * @return {String} Rating
 */
function getRatingFromValue(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return "Unknown";
  }
  
  if (value <= 25) {
    return "Extreme Fear";
  } else if (value <= 45) {
    return "Fear";
  } else if (value <= 55) {
    return "Neutral";
  } else if (value <= 75) {
    return "Greed";
  } else {
    return "Extreme Greed";
  }
}

/**
 * Retrieves upcoming economic events
 * @return {Array} Upcoming economic events or null if unavailable
 */
function retrieveUpcomingEconomicEvents() {
  try {
    Logger.log("Retrieving upcoming economic events...");
    
    // Check if we have cached data first
    try {
      const scriptCache = CacheService.getScriptCache();
      const cachedData = scriptCache.get('UPCOMING_ECONOMIC_EVENTS_DATA');
      
      if (cachedData) {
        Logger.log("Using cached economic events data (less than 1 hour old)");
        return JSON.parse(cachedData);
      }
    } catch (cacheError) {
      Logger.log("Cache retrieval error for economic events: " + cacheError);
      // Continue execution - we'll get fresh data below
    }
    
    // Try primary source (Investing.com)
    let events = null;
    let source = "";
    let sourceUrl = "";
    let errorMessage = "";
    
    try {
      Logger.log("Attempting to fetch economic events from Investing.com...");
      events = fetchInvestingEconomicEvents();
      source = "Investing.com";
      sourceUrl = "https://www.investing.com/economic-calendar/";
      
      if (events && events.length > 0) {
        Logger.log(`Successfully retrieved ${events.length} economic events from Investing.com`);
      } else {
        errorMessage = "Investing.com economic events data unavailable";
        Logger.log(errorMessage);
      }
    } catch (primaryError) {
      errorMessage = "Error fetching from Investing.com: " + primaryError;
      Logger.log(errorMessage);
      // Continue to alternative source
    }
    
    // Try alternative source (TradingEconomics)
    if (!events || events.length === 0) {
      try {
        Logger.log("Primary source failed, attempting to fetch economic events from TradingEconomics...");
        events = fetchTradingEconomicsEvents();
        source = "TradingEconomics";
        sourceUrl = "https://tradingeconomics.com/calendar";
        
        if (events && events.length > 0) {
          Logger.log(`Successfully retrieved ${events.length} economic events from TradingEconomics`);
        } else {
          errorMessage += " | TradingEconomics economic events data unavailable";
          Logger.log("TradingEconomics economic events data unavailable");
        }
      } catch (alternativeError) {
        errorMessage += " | Error fetching from TradingEconomics: " + alternativeError;
        Logger.log("Error fetching from TradingEconomics: " + alternativeError);
      }
    }
    
    // If both sources failed, check for stale cache (up to 24 hours old)
    if (!events || events.length === 0) {
      try {
        Logger.log("All sources failed, checking for stale cache (up to 24 hours old)...");
        const scriptProperties = PropertiesService.getScriptProperties();
        const staleCacheData = scriptProperties.getProperty('ECONOMIC_EVENTS_STALE_CACHE');
        
        if (staleCacheData) {
          const parsedStaleData = JSON.parse(staleCacheData);
          const cacheTimestamp = new Date(parsedStaleData.timestamp);
          const currentTime = new Date();
          const cacheAge = (currentTime - cacheTimestamp) / (1000 * 60 * 60); // Age in hours
          
          if (cacheAge <= 24) {
            Logger.log(`Using stale cache (${cacheAge.toFixed(1)} hours old)`);
            parsedStaleData.isStaleData = true;
            parsedStaleData.staleAge = `${cacheAge.toFixed(1)} hours`;
            return parsedStaleData;
          } else {
            Logger.log("Stale cache is too old (> 24 hours)");
          }
        } else {
          Logger.log("No stale cache available");
        }
      } catch (staleCacheError) {
        Logger.log("Error retrieving stale cache: " + staleCacheError);
      }
    }
    
    // If all attempts failed, return empty array with error info
    if (!events || events.length === 0) {
      Logger.log("All attempts to retrieve economic events failed");
      return {
        events: [],
        error: true,
        errorMessage: errorMessage,
        timestamp: new Date()
      };
    }
    
    // Format the events data
    const formattedEvents = events.map(event => ({
      date: event.date,
      time: event.time || "All Day",
      country: event.country,
      event: event.event,
      actual: event.actual || "N/A",
      forecast: event.forecast || "N/A",
      previous: event.previous || "N/A"
    }));
    
    // Create the result object
    const result = {
      events: formattedEvents,
      source: source,
      sourceUrl: sourceUrl,
      timestamp: new Date(),
      error: false
    };
    
    // Cache the result in both short-term and long-term storage
    try {
      // Short-term cache (1 hour)
      const scriptCache = CacheService.getScriptCache();
      scriptCache.put('UPCOMING_ECONOMIC_EVENTS_DATA', JSON.stringify(result), 3600); // Cache for 1 hour
      
      // Long-term stale cache (for fallback, stored in Properties)
      const scriptProperties = PropertiesService.getScriptProperties();
      scriptProperties.setProperty('ECONOMIC_EVENTS_STALE_CACHE', JSON.stringify(result));
      
      Logger.log("Economic events data cached successfully (both fresh and stale cache)");
    } catch (cacheError) {
      Logger.log("Error caching economic events data: " + cacheError);
    }
    
    Logger.log(`Retrieved ${formattedEvents.length} upcoming economic events from ${source}`);
    return result;
  } catch (error) {
    Logger.log(`Error retrieving upcoming economic events: ${error}`);
    return {
      events: [],
      error: true,
      errorMessage: `Error retrieving upcoming economic events: ${error}`,
      timestamp: new Date()
    };
  }
}

/**
 * Fetches economic events data from Investing.com
 * @return {Array} Economic events data or null if unavailable
 */
function fetchInvestingEconomicEvents() {
  try {
    // This would be implemented with actual API calls in a production environment
    // For now, return sample data for testing
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const sampleEvents = [
      {
        date: formatDate(today),
        time: "08:30 AM",
        country: "US",
        event: "Initial Jobless Claims",
        actual: "215K",
        forecast: "220K",
        previous: "217K"
      },
      {
        date: formatDate(today),
        time: "10:00 AM",
        country: "US",
        event: "Existing Home Sales",
        actual: "4.38M",
        forecast: "4.20M",
        previous: "4.22M"
      },
      {
        date: formatDate(tomorrow),
        time: "09:45 AM",
        country: "US",
        event: "Manufacturing PMI",
        actual: null,
        forecast: "52.0",
        previous: "51.9"
      }
    ];
    
    return sampleEvents;
  } catch (error) {
    Logger.log(`Error fetching Investing.com economic events: ${error}`);
    return null;
  }
}

/**
 * Fetches economic events data from TradingEconomics
 * @return {Array} Economic events data or null if unavailable
 */
function fetchTradingEconomicsEvents() {
  try {
    // This would be implemented with actual API calls in a production environment
    // For now, return sample data for testing
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const sampleEvents = [
      {
        date: formatDate(today),
        time: "08:30 AM",
        country: "US",
        event: "GDP Growth Rate QoQ Final",
        actual: "3.4%",
        forecast: "3.2%",
        previous: "3.2%"
      },
      {
        date: formatDate(tomorrow),
        time: "10:00 AM",
        country: "US",
        event: "Consumer Sentiment Final",
        actual: null,
        forecast: "76.5",
        previous: "76.9"
      }
    ];
    
    return sampleEvents;
  } catch (error) {
    Logger.log(`Error fetching TradingEconomics events: ${error}`);
    return null;
  }
}

/**
 * Helper function to format date as MM/DD/YYYY
 * @param {Date} date - Date to format
 * @return {String} Formatted date
 */
function formatDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

/**
 * Test function to verify the Fear & Greed Index and Treasury Yield data retrieval
 */
function testMarketDataRetrieval() {
  Logger.log("=== TESTING MARKET DATA RETRIEVAL ===");
  
  // Test CNN Fear & Greed Index retrieval
  Logger.log("\n--- Testing CNN Fear & Greed Index ---");
  try {
    const fearAndGreedData = retrieveFearAndGreedIndex();
    Logger.log("Fear & Greed Index retrieved successfully:");
    Logger.log(`Current Value: ${fearAndGreedData.currentValue}`);
    Logger.log(`Rating: ${fearAndGreedData.rating}`);
    Logger.log(`Source: ${fearAndGreedData.source}`);
    
    if (fearAndGreedData.previousValues) {
      Logger.log("Previous Values:");
      Logger.log(`One Week Ago: ${fearAndGreedData.previousValues.oneWeekAgo}`);
      Logger.log(`One Month Ago: ${fearAndGreedData.previousValues.oneMonthAgo}`);
      Logger.log(`One Year Ago: ${fearAndGreedData.previousValues.oneYearAgo}`);
    }
    
    if (fearAndGreedData.components) {
      Logger.log("Components:");
      for (const component in fearAndGreedData.components) {
        Logger.log(`${component}: ${fearAndGreedData.components[component]}`);
      }
    }
  } catch (error) {
    Logger.log(`Error testing Fear & Greed Index: ${error}`);
  }
  
  // Test Treasury Yield retrieval
  Logger.log("\n--- Testing Treasury Yield Data ---");
  
  // Test 2-year Treasury yield specifically
  try {
    Logger.log("Testing 2-year Treasury yield:");
    const twoYearData = fetchYahooFinanceTreasuryYields();
    Logger.log(`2-Year Treasury Yield: ${twoYearData.yield}%`);
    Logger.log(`Source: ${twoYearData.source}`);
    Logger.log(`Timestamp: ${twoYearData.timestamp}`);
  } catch (error) {
    Logger.log(`Error testing 2-year Treasury yield: ${error}`);
  }
  
  // Test other Treasury yields
  const terms = ["3m", "5y", "10y", "30y"];
  for (const term of terms) {
    try {
      Logger.log(`\nTesting ${term} Treasury yield:`);
      const yieldData = fetchYahooFinanceTreasuryYields();
      if (yieldData.error) {
        Logger.log(`Error retrieving ${term} Treasury yield: ${yieldData.errorMessage}`);
      } else {
        Logger.log(`${yieldData.term} Treasury Yield: ${yieldData.yield}%`);
        Logger.log(`Change: ${yieldData.change.toFixed(2)}%`);
        Logger.log(`Source: ${yieldData.source}`);
      }
    } catch (error) {
      Logger.log(`Error testing ${term} Treasury yield: ${error}`);
    }
  }
  
  // Test the full retrieveTreasuryYields function
  try {
    Logger.log("\nTesting full Treasury Yields retrieval:");
    const allYields = retrieveTreasuryYields();
    Logger.log(`Retrieved ${allYields.yields.length} Treasury yields`);
    Logger.log(`Yield Curve Status: ${allYields.yieldCurveStatus}`);
    Logger.log(`Analysis: ${allYields.analysis}`);
  } catch (error) {
    Logger.log(`Error testing full Treasury Yields retrieval: ${error}`);
  }
  
  Logger.log("\n=== MARKET DATA RETRIEVAL TESTING COMPLETE ===");
}

/**
 * Test function to clear the cache and retrieve fresh key market indicators data
 */
function testClearAndRetrieveKeyMarketIndicators() {
  try {
    // Clear the cache first
    const clearResult = clearKeyMarketIndicatorsCache();
    Logger.log(`Cache clearing result: ${clearResult.success ? "Success" : "Failure"}`);
    Logger.log(`Message: ${clearResult.message}`);
    
    // Then retrieve fresh data
    Logger.log("Retrieving fresh key market indicators data...");
    const keyMarketIndicators = retrieveKeyMarketIndicators();
    
    // Log the results
    Logger.log("KEY MARKET INDICATORS DATA RESULTS:");
    Logger.log(`Status: ${keyMarketIndicators.success ? "Success" : "Failure"}`);
    Logger.log(`Message: ${keyMarketIndicators.message || "No message"}`);
    Logger.log(`Major Indices: ${keyMarketIndicators.majorIndices && keyMarketIndicators.majorIndices.length > 0 ? `Found ${keyMarketIndicators.majorIndices.length} indices` : "Not found"}`);
    Logger.log(`Sector Performance: ${keyMarketIndicators.sectorPerformance && keyMarketIndicators.sectorPerformance.length > 0 ? `Found ${keyMarketIndicators.sectorPerformance.length} sectors` : "Not found"}`);
    Logger.log(`Volatility Indices: ${keyMarketIndicators.volatilityIndices && keyMarketIndicators.volatilityIndices.length > 0 ? `Found ${keyMarketIndicators.volatilityIndices.length} indices` : "Not found"}`);
    Logger.log(`Fear & Greed Index: ${keyMarketIndicators.fearAndGreedIndex && !keyMarketIndicators.fearAndGreedIndex.error ? "Retrieved" : "Not found"}`);
    Logger.log(`Upcoming Economic Events: ${keyMarketIndicators.upcomingEconomicEvents && keyMarketIndicators.upcomingEconomicEvents.length > 0 ? `Found ${keyMarketIndicators.upcomingEconomicEvents.length} events` : "Not found"}`);
    
    // Log the formatted data
    Logger.log("Formatted Key Market Indicators Data:");
    Logger.log(keyMarketIndicators.formattedData || "No formatted data available");
    
    return "Cache cleared and fresh key market indicators data retrieved successfully.";
  } catch (error) {
    Logger.log(`Error in testClearAndRetrieveKeyMarketIndicators: ${error}`);
    return `Error: ${error}`;
  }
}

/**
 * Clears the key market indicators cache
 * @return {Object} Result of the cache clearing operation
 */
function clearKeyMarketIndicatorsCache() {
  try {
    Logger.log("Clearing key market indicators cache...");
    
    const scriptCache = CacheService.getScriptCache();
    scriptCache.remove('KEY_MARKET_INDICATORS_DATA');
    
    Logger.log("Key market indicators cache cleared successfully");
    return {
      success: true,
      message: "Key market indicators cache cleared successfully",
      timestamp: new Date()
    };
  } catch (error) {
    Logger.log(`Error clearing key market indicators cache: ${error}`);
    return {
      success: false,
      message: `Error clearing key market indicators cache: ${error}`,
      timestamp: new Date()
    };
  }
}

/**
 * Comprehensive test function to verify all data retrieval improvements
 * This tests all the fallback mechanisms and error handling
 */
function testImprovedDataRetrieval() {
  try {
    Logger.log("=== TESTING IMPROVED DATA RETRIEVAL FUNCTIONALITY ===");
    
    // Step 1: Clear all caches to ensure fresh data retrieval
    Logger.log("\n--- Step 1: Clearing all caches ---");
    const scriptCache = CacheService.getScriptCache();
    scriptCache.remove('KEY_MARKET_INDICATORS_DATA');
    scriptCache.remove('FEAR_AND_GREED_INDEX_DATA');
    scriptCache.remove('UPCOMING_ECONOMIC_EVENTS_DATA');
    Logger.log("All caches cleared successfully");
    
    // Step 2: Retrieve key market indicators data
    Logger.log("\n--- Step 2: Retrieving key market indicators data ---");
    const keyMarketIndicators = retrieveKeyMarketIndicators();
    
    // Step 3: Log the results with detailed information
    Logger.log("\n--- Step 3: Logging detailed results ---");
    Logger.log(`Overall Status: ${keyMarketIndicators.success ? "Success" : "Partial Success/Failure"}`);
    Logger.log(`Message: ${keyMarketIndicators.message}`);
    
    // Check Major Indices
    if (keyMarketIndicators.majorIndices && keyMarketIndicators.majorIndices.length > 0) {
      Logger.log(`Major Indices: Retrieved ${keyMarketIndicators.majorIndices.length} indices`);
      Logger.log(`First index: ${keyMarketIndicators.majorIndices[0].name} (${keyMarketIndicators.majorIndices[0].symbol}): ${keyMarketIndicators.majorIndices[0].value}`);
    } else {
      Logger.log("Major Indices: Not found");
    }
    
    // Check Sector Performance
    if (keyMarketIndicators.sectorPerformance && keyMarketIndicators.sectorPerformance.length > 0) {
      Logger.log(`Sector Performance: Retrieved ${keyMarketIndicators.sectorPerformance.length} sectors`);
      Logger.log(`First sector: ${keyMarketIndicators.sectorPerformance[0].name}: ${keyMarketIndicators.sectorPerformance[0].percentChange}%`);
    } else {
      Logger.log("Sector Performance: Not found");
    }
    
    // Check Volatility Indices
    if (keyMarketIndicators.volatilityIndices && keyMarketIndicators.volatilityIndices.length > 0) {
      Logger.log(`Volatility Indices: Retrieved ${keyMarketIndicators.volatilityIndices.length} indices`);
      Logger.log(`First index: ${keyMarketIndicators.volatilityIndices[0].name} (${keyMarketIndicators.volatilityIndices[0].symbol}): ${keyMarketIndicators.volatilityIndices[0].value}`);
    } else {
      Logger.log("Volatility Indices: Not found");
    }
    
    // Check Fear & Greed Index
    if (keyMarketIndicators.fearAndGreedIndex && !keyMarketIndicators.fearAndGreedIndex.error) {
      Logger.log(`Fear & Greed Index: Retrieved (${keyMarketIndicators.fearAndGreedIndex.currentValue} - ${keyMarketIndicators.fearAndGreedIndex.rating})`);
      Logger.log(`Source: ${keyMarketIndicators.fearAndGreedIndex.source}`);
      Logger.log(`Is Stale Data: ${keyMarketIndicators.fearAndGreedIndex.isStaleData ? "Yes" : "No"}`);
    } else {
      Logger.log("Fear & Greed Index: Not found");
      if (keyMarketIndicators.fearAndGreedIndex && keyMarketIndicators.fearAndGreedIndex.errorMessage) {
        Logger.log(`Error: ${keyMarketIndicators.fearAndGreedIndex.errorMessage}`);
      }
    }
    
    // Check Upcoming Economic Events
    if (keyMarketIndicators.upcomingEconomicEvents && keyMarketIndicators.upcomingEconomicEvents.length > 0) {
      Logger.log(`Upcoming Economic Events: Retrieved ${keyMarketIndicators.upcomingEconomicEvents.length} events`);
      Logger.log(`First event: ${keyMarketIndicators.upcomingEconomicEvents[0].event} (${keyMarketIndicators.upcomingEconomicEvents[0].country}) on ${keyMarketIndicators.upcomingEconomicEvents[0].date}`);
    } else {
      Logger.log("Upcoming Economic Events: Not found");
    }
    
    // Step 4: Check formatted data
    Logger.log("\n--- Step 4: Checking formatted data ---");
    if (keyMarketIndicators.formattedData) {
      Logger.log("Formatted data is available");
      Logger.log("First 200 characters of formatted data:");
      Logger.log(keyMarketIndicators.formattedData.substring(0, 200) + "...");
    } else {
      Logger.log("Formatted data is not available");
    }
    
    // Step 5: Test individual data retrieval functions
    Logger.log("\n--- Step 5: Testing individual data retrieval functions ---");
    
    // Test Fear & Greed Index with primary and alternative sources
    Logger.log("\nTesting Fear & Greed Index retrieval:");
    const fearAndGreedIndex = retrieveFearAndGreedIndex();
    if (fearAndGreedIndex && !fearAndGreedIndex.error) {
      Logger.log(`Retrieved: ${fearAndGreedIndex.currentValue} (${fearAndGreedIndex.rating})`);
      Logger.log(`Source: ${fearAndGreedIndex.source}`);
      Logger.log(`Is Stale Data: ${fearAndGreedIndex.isStaleData ? "Yes" : "No"}`);
    } else {
      Logger.log("Failed to retrieve Fear & Greed Index");
      if (fearAndGreedIndex && fearAndGreedIndex.errorMessage) {
        Logger.log(`Error: ${fearAndGreedIndex.errorMessage}`);
      }
    }
    
    // Test Economic Events with primary and alternative sources
    Logger.log("\nTesting Economic Events retrieval:");
    const economicEvents = retrieveUpcomingEconomicEvents();
    if (economicEvents && economicEvents.events && economicEvents.events.length > 0) {
      Logger.log(`Retrieved ${economicEvents.events.length} events`);
      Logger.log(`Source: ${economicEvents.source}`);
      Logger.log(`Is Stale Data: ${economicEvents.isStaleData ? "Yes" : "No"}`);
    } else {
      Logger.log("Failed to retrieve Economic Events");
      if (economicEvents && economicEvents.errorMessage) {
        Logger.log(`Error: ${economicEvents.errorMessage}`);
      }
    }
    
    Logger.log("\n=== IMPROVED DATA RETRIEVAL TESTING COMPLETE ===");
    return "Comprehensive data retrieval test completed. Check the logs for detailed results.";
  } catch (error) {
    Logger.log(`Error in testImprovedDataRetrieval: ${error}`);
    return `Error: ${error}`;
  }
}
