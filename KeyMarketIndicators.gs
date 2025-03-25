/**
 * Key Market Indicators Module
 * Handles retrieval of key market indicators including major indices, sector performance, 
 * volatility indices, treasury yields, and upcoming economic events
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
        const data = JSON.parse(cachedData);
        data.fromCache = true;
        return data;
      }
    } catch (cacheError) {
      Logger.log("Cache retrieval error for key market indicators: " + cacheError);
      // Continue execution - we'll get fresh data below
    }
    
    // Initialize results object
    const results = {
      majorIndices: [],
      sectorPerformance: [],
      volatilityIndices: [],
      treasuryYields: { yields: [] },
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
      }
    } catch (error) {
      Logger.log(`Error retrieving major indices: ${error}`);
    }
    
    // Get sector performance data
    try {
      const sectorPerformanceData = retrieveSectorPerformance();
      if (sectorPerformanceData && sectorPerformanceData.length > 0) {
        results.sectorPerformance = sectorPerformanceData;
      }
    } catch (error) {
      Logger.log(`Error retrieving sector performance: ${error}`);
    }
    
    // Get volatility indices data
    try {
      const volatilityIndicesData = retrieveVolatilityIndices();
      if (volatilityIndicesData && volatilityIndicesData.length > 0) {
        results.volatilityIndices = volatilityIndicesData;
      }
    } catch (error) {
      Logger.log(`Error retrieving volatility indices: ${error}`);
    }
    
    // Get treasury yields data
    try {
      const treasuryYieldsData = retrieveTreasuryYields();
      if (treasuryYieldsData && treasuryYieldsData.yields && treasuryYieldsData.yields.length > 0) {
        results.treasuryYields = treasuryYieldsData;
      }
    } catch (error) {
      Logger.log(`Error retrieving treasury yields: ${error}`);
    }
    
    // Get Fear & Greed Index data
    try {
      const fearAndGreedIndexData = retrieveFearAndGreedIndex();
      if (fearAndGreedIndexData) {
        results.fearAndGreedIndex = fearAndGreedIndexData;
      } else {
        Logger.log("Fear & Greed Index data not available");
      }
    } catch (error) {
      Logger.log(`Error retrieving Fear & Greed Index: ${error}`);
    }
    
    // Get upcoming economic events data
    try {
      const upcomingEconomicEventsData = retrieveUpcomingEconomicEvents();
      if (upcomingEconomicEventsData && upcomingEconomicEventsData.length > 0) {
        results.upcomingEconomicEvents = upcomingEconomicEventsData;
      } else {
        Logger.log("Upcoming economic events data not available");
      }
    } catch (error) {
      Logger.log(`Error retrieving upcoming economic events: ${error}`);
    }
    
    // Cache the results
    try {
      const scriptCache = CacheService.getScriptCache();
      scriptCache.put('KEY_MARKET_INDICATORS_DATA', JSON.stringify(results), 3600); // Cache for 1 hour
      Logger.log("Key market indicators data cached successfully");
    } catch (cacheError) {
      Logger.log("Error caching key market indicators data: " + cacheError);
    }
    
    Logger.log("Retrieved key market indicators data successfully");
    return results;
  } catch (error) {
    Logger.log(`Error retrieving key market indicators data: ${error}`);
    throw new Error(`Failed to retrieve key market indicators data: ${error}`);
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
    
    // Format treasury yields
    if (data.treasuryYields && data.treasuryYields.yields && data.treasuryYields.yields.length > 0) {
      formattedText += "* Treasury Yields:\n";
      
      // Sort yields by term (ascending)
      const sortedYields = [...data.treasuryYields.yields].sort((a, b) => {
        return parseTermToMonths(a.term) - parseTermToMonths(b.term);
      });
      
      // Add each yield
      for (const yield of sortedYields) {
        const valueStr = yield.value !== undefined ? `${yield.value.toFixed(2)}%` : "N/A";
        const changeStr = yield.change !== undefined ? 
                         `${yield.change >= 0 ? "+" : ""}${yield.change.toFixed(2)}` : 
                         "N/A";
        
        formattedText += `  * ${yield.term}: ${valueStr} (${changeStr})\n`;
      }
      
      // Add timestamp
      formattedText += `  * Last Updated: ${new Date(data.treasuryYields.timestamp || data.timestamp || new Date()).toLocaleString()}\n\n`;
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
        
        formattedText += `  * ${dateStr}: ${event.name || "Economic Event"} (${event.importance || "Medium"} importance)\n`;
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
 * @return {Array} Array of volatility indices data or null if failed
 */
function fetchVolatilityData() {
  try {
    Logger.log("Fetching volatility data...");
    
    // Define the symbols for volatility indices
    const symbols = ["^VIX", "^VXN"];
    const volatilityIndices = [];
    
    // Fetch data for each symbol
    for (const symbol of symbols) {
      try {
        // First attempt: Use Yahoo Finance API to get real-time data
        Logger.log(`Attempting to fetch volatility data for ${symbol} from Yahoo Finance...`);
        const yahooData = fetchVolatilityDataFromYahoo(symbol);
        
        if (yahooData) {
          volatilityIndices.push(yahooData);
          continue; // Successfully got data from Yahoo, move to next symbol
        }
        
        // Second attempt: Try Google Finance if Yahoo Finance failed
        Logger.log(`Yahoo Finance failed for ${symbol}, trying Google Finance...`);
        const googleData = fetchVolatilityDataFromGoogleFinance(symbol);
        
        if (googleData) {
          volatilityIndices.push(googleData);
          continue; // Successfully got data from Google, move to next symbol
        }
        
        // If both attempts failed, log the error
        Logger.log(`Failed to fetch volatility data for ${symbol} from all sources`);
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
 * Fetches volatility data from Yahoo Finance for a specific symbol
 * @param {String} symbol - The volatility index symbol (e.g., "^VIX")
 * @return {Object} Volatility index data or null if failed
 */
function fetchVolatilityDataFromYahoo(symbol) {
  try {
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
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      },
      contentType: 'application/json'
    };
    
    const response = UrlFetchApp.fetch(url, options);
    
    // Check response code
    if (response.getResponseCode() !== 200) {
      throw new Error(`HTTP error: ${response.getResponseCode()}`);
    }
    
    const data = JSON.parse(response.getContentText());
    
    // Check if the response contains the expected data structure
    if (!data || !data.chart || !data.chart.result || !data.chart.result[0] || !data.chart.result[0].meta) {
      Logger.log(`Yahoo Finance API response for ${symbol} does not contain expected data structure`);
      return null;
    }
    
    // Extract the values
    const meta = data.chart.result[0].meta;
    const value = meta.regularMarketPrice;
    const previousClose = meta.previousClose;
    
    // Validate the values
    if (value === undefined || previousClose === undefined) {
      Logger.log(`Missing price data for ${symbol}`);
      return null;
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
    
    return volatilityIndex;
  } catch (error) {
    Logger.log(`Error in fetchVolatilityDataFromYahoo for ${symbol}: ${error}`);
    return null;
  }
}

/**
 * Fetches volatility data from Google Finance for a specific symbol
 * @param {String} symbol - The volatility index symbol (e.g., "^VIX")
 * @return {Object} Volatility index data or null if failed
 */
function fetchVolatilityDataFromGoogleFinance(symbol) {
  try {
    // Get the shared spreadsheet for Google Finance data
    const spreadsheet = getSharedFinanceSpreadsheet();
    
    // Clear any existing data
    const sheet = spreadsheet.getActiveSheet();
    sheet.clear();
    
    // Set up the GOOGLEFINANCE formula for VIX data
    sheet.getRange("A1").setValue("Symbol");
    sheet.getRange("B1").setValue("Price");
    sheet.getRange("C1").setValue("Previous Close");
    
    // Convert Yahoo Finance symbol to Google Finance format
    // For VIX, Google Finance uses .INX:VIX or INDEXCBOE:VIX
    let googleSymbol = symbol;
    if (symbol === "^VIX") {
      googleSymbol = "INDEXCBOE:VIX";
    } else if (symbol === "^VXN") {
      googleSymbol = "INDEXCBOE:VXN";
    }
    
    // Set the symbol
    sheet.getRange("A2").setValue(googleSymbol);
    
    // Set the formulas for price and previous close
    sheet.getRange("B2").setFormula(`=GOOGLEFINANCE("${googleSymbol}", "price")`);
    sheet.getRange("C2").setFormula(`=GOOGLEFINANCE("${googleSymbol}", "priceopen")`); // Using open price as an approximation
    
    // Wait for formulas to calculate
    Utilities.sleep(1000);
    
    // Extract the data
    const value = sheet.getRange("B2").getValue();
    const previousClose = sheet.getRange("C2").getValue();
    
    // Validate the values
    if (isNaN(value) || isNaN(previousClose) || value === 0) {
      Logger.log(`Invalid or missing data from Google Finance for ${symbol}`);
      return null;
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
    const timestamp = new Date();
    
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
      source: "Google Finance",
      sourceUrl: `https://www.google.com/finance/quote/${googleSymbol}`
    };
    
    return volatilityIndex;
  } catch (error) {
    Logger.log(`Error in fetchVolatilityDataFromGoogleFinance for ${symbol}: ${error}`);
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
    
    // Fetch the Fear & Greed Index data from CNN
    const data = fetchFearAndGreedIndexData();
    
    // If no data is available, return null
    if (!data) {
      Logger.log("No Fear & Greed Index data available");
      return null;
    }
    
    // Extract the current value and calculate the rating
    const currentValue = data.fear_and_greed && data.fear_and_greed.score ? parseInt(data.fear_and_greed.score) : null;
    
    // If we couldn't extract a valid value, return null
    if (currentValue === null || isNaN(currentValue)) {
      Logger.log("Invalid Fear & Greed Index value");
      return null;
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
      source: "CNN Business",
      sourceUrl: "https://www.cnn.com/markets/fear-and-greed",
      timestamp: new Date()
    };
    
    // Cache the result
    try {
      const scriptCache = CacheService.getScriptCache();
      scriptCache.put('FEAR_AND_GREED_INDEX_DATA', JSON.stringify(result), 3600); // Cache for 1 hour
      Logger.log("Fear & Greed Index data cached successfully");
    } catch (cacheError) {
      Logger.log("Error caching Fear & Greed Index data: " + cacheError);
    }
    
    Logger.log(`Retrieved Fear & Greed Index: ${result.currentValue} (${result.rating})`);
    return result;
  } catch (error) {
    Logger.log(`Error retrieving Fear & Greed Index: ${error}`);
    return null;
  }
}

/**
 * Fetches the CNN Fear & Greed Index data
 * @return {Object} Raw Fear & Greed Index data or null if unavailable
 */
function fetchFearAndGreedIndexData() {
  const url = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";
  const options = {
    method: "get",
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      'Referer': 'https://www.cnn.com/markets/fear-and-greed',
      'Origin': 'https://www.cnn.com',
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0'
    },
    contentType: 'application/json'
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      Logger.log(`API error retrieving Fear & Greed Index: Response code ${responseCode}`);
      return null;
    }
    
    const responseText = response.getContentText();
    const data = JSON.parse(responseText);
    
    return data;
  } catch (error) {
    Logger.log(`API error retrieving Fear & Greed Index: ${error}`);
    throw new Error(`Failed to fetch CNN Fear & Greed Index: ${error}`);
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
        Logger.log("Using cached upcoming economic events data (less than 1 hour old)");
        return JSON.parse(cachedData);
      }
    } catch (cacheError) {
      Logger.log("Cache retrieval error for upcoming economic events: " + cacheError);
      // Continue execution - we'll get fresh data below
    }
    
    // Fetch economic events data
    const events = fetchEconomicEventsData();
    
    // If no events data is available, return null
    if (!events || !Array.isArray(events) || events.length === 0) {
      Logger.log("No economic events data available");
      return null;
    }
    
    // Format the events data
    const formattedEvents = events.map(event => {
      // Ensure all required fields are present
      return {
        date: event.date instanceof Date ? event.date : new Date(event.date),
        time: event.time || "TBD",
        name: event.name,
        event: event.name, // For backward compatibility
        country: event.country,
        importance: event.importance,
        source: event.source,
        sourceUrl: event.sourceUrl,
        timestamp: new Date()
      };
    });
    
    // Sort events by date
    formattedEvents.sort((a, b) => a.date - b.date);
    
    // Cache the result
    try {
      const scriptCache = CacheService.getScriptCache();
      scriptCache.put('UPCOMING_ECONOMIC_EVENTS_DATA', JSON.stringify(formattedEvents), 3600); // Cache for 1 hour
      Logger.log("Upcoming economic events data cached successfully");
    } catch (cacheError) {
      Logger.log("Error caching upcoming economic events data: " + cacheError);
    }
    
    Logger.log(`Retrieved ${formattedEvents.length} upcoming economic events`);
    return formattedEvents;
  } catch (error) {
    Logger.log(`Error retrieving upcoming economic events: ${error}`);
    return null;
  }
}

/**
 * Fetches upcoming economic events data
 * @return {Array} Economic events data or null if unavailable
 */
function fetchEconomicEventsData() {
  try {
    // This would be implemented with actual API calls in a production environment
    // For now, return null to indicate that real data is not available
    Logger.log("Economic events data API not implemented yet");
    return null;
  } catch (error) {
    Logger.log(`Error fetching economic events data: ${error}`);
    return null;
  }
}

/**
 * Tests the key market indicators data retrieval
 */
function testKeyMarketIndicators() {
  try {
    Logger.log("Testing key market indicators data retrieval...");
    
    // Retrieve key market indicators data
    const keyMarketIndicators = retrieveKeyMarketIndicators();
    
    // Log the results
    Logger.log("KEY MARKET INDICATORS DATA RESULTS:");
    Logger.log(`Status: ${keyMarketIndicators.success ? "Success" : "Failure"}`);
    Logger.log(`Message: ${keyMarketIndicators.message}`);
    Logger.log(`Major Indices: ${keyMarketIndicators.majorIndices && keyMarketIndicators.majorIndices.length > 0 ? `Found ${keyMarketIndicators.majorIndices.length} indices` : "Not found"}`);
    Logger.log(`Sector Performance: ${keyMarketIndicators.sectorPerformance && keyMarketIndicators.sectorPerformance.length > 0 ? `Found ${keyMarketIndicators.sectorPerformance.length} sectors` : "Not found"}`);
    Logger.log(`Volatility Indices: ${keyMarketIndicators.volatilityIndices && keyMarketIndicators.volatilityIndices.length > 0 ? `Found ${keyMarketIndicators.volatilityIndices.length} indices` : "Not found"}`);
    Logger.log(`Treasury Yields: ${keyMarketIndicators.treasuryYields && keyMarketIndicators.treasuryYields.yields && keyMarketIndicators.treasuryYields.yields.length > 0 ? `Found ${keyMarketIndicators.treasuryYields.yields.length} yields` : "Not found"}`);
    Logger.log(`Fear & Greed Index: ${keyMarketIndicators.fearAndGreedIndex && !keyMarketIndicators.fearAndGreedIndex.error ? "Retrieved" : "Not found"}`);
    Logger.log(`Upcoming Economic Events: ${keyMarketIndicators.upcomingEconomicEvents && keyMarketIndicators.upcomingEconomicEvents.length > 0 ? `Found ${keyMarketIndicators.upcomingEconomicEvents.length} events` : "Not found"}`);
    
    // Log the formatted data
    Logger.log("Formatted Key Market Indicators Data:");
    Logger.log(keyMarketIndicators.formattedData);
    
    Logger.log("Key market indicators data retrieval test completed successfully.");
  } catch (error) {
    Logger.log(`Error testing key market indicators data retrieval: ${error}`);
  }
}

/**
 * Tests the volatility indices data retrieval
 */
function testVolatilityIndices() {
  try {
    Logger.log("Testing volatility indices data retrieval...");
    
    // Retrieve volatility indices data
    const volatilityIndices = retrieveVolatilityIndices();
    
    // Log the results
    Logger.log("VOLATILITY INDICES TEST RESULTS:");
    Logger.log(`Retrieved ${volatilityIndices.length} volatility indices.`);
    
    // Log each volatility index
    for (const index of volatilityIndices) {
      Logger.log(`${index.name} (${index.symbol}):`);
      Logger.log(`  Value: ${index.value}`);
      Logger.log(`  Change: ${index.change}`);
      Logger.log(`  Percent Change: ${index.percentChange}%`);
      Logger.log(`  Trend: ${index.trend}`);
      Logger.log(`  Analysis: ${index.analysis}`);
      Logger.log(`  Source: ${index.source}`);
      Logger.log(`  Last Updated: ${new Date(index.timestamp).toLocaleString()}`);
    }
    
    return volatilityIndices;
  } catch (error) {
    Logger.log(`Error testing volatility indices data retrieval: ${error}`);
    return [];
  }
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
    const twoYearData = fetchTreasuryYieldData("2y");
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
      const yieldData = fetchTreasuryYieldData(term);
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
 * Fetches treasury yield data for a specific term
 * @param {String} term - The term to fetch data for (e.g., "3m", "2y", "5y", "10y", "30y")
 * @return {Object} Treasury yield data
 */
function fetchTreasuryYieldData(term) {
  try {
    Logger.log(`Fetching treasury yield data for ${term} from Yahoo Finance...`);
    
    // Get the Yahoo Finance symbol for the treasury yield
    const symbol = getTreasurySymbol(term);
    
    // Fetch the data from Yahoo Finance
    const url = `https://finance.yahoo.com/quote/${symbol}`;
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    
    if (response.getResponseCode() !== 200) {
      Logger.log(`Error fetching treasury yield data for ${term}: ${response.getResponseCode()}`);
      return {
        success: false,
        error: `HTTP error ${response.getResponseCode()}`
      };
    }
    
    const content = response.getContentText();
    
    // Extract the current yield
    const yieldRegex = /"regularMarketPrice":{"raw":([\d.]+)/;
    const yieldMatch = content.match(yieldRegex);
    
    // Extract the change
    const changeRegex = /"regularMarketChange":{"raw":([-\d.]+)/;
    const changeMatch = content.match(changeRegex);
    
    if (!yieldMatch) {
      Logger.log(`Could not extract yield for ${term}`);
      return {
        success: false,
        error: "Could not extract yield"
      };
    }
    
    // Convert term to a more readable format
    let readableTerm = "";
    switch (term) {
      case "3m":
        readableTerm = "3-Month";
        break;
      case "2y":
        readableTerm = "2-Year";
        break;
      case "5y":
        readableTerm = "5-Year";
        break;
      case "10y":
        readableTerm = "10-Year";
        break;
      case "30y":
        readableTerm = "30-Year";
        break;
      default:
        readableTerm = term;
    }
    
    return {
      success: true,
      term: readableTerm,
      yield: parseFloat(yieldMatch[1]),
      change: changeMatch ? parseFloat(changeMatch[1]) : 0,
      timestamp: new Date(),
      source: "Yahoo Finance",
      sourceUrl: url
    };
  } catch (error) {
    Logger.log(`Error fetching treasury yield data for ${term}: ${error}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Gets the Yahoo Finance symbol for a treasury yield
 * @param {String} term - The term to get the symbol for
 * @return {String} The Yahoo Finance symbol
 */
function getTreasurySymbol(term) {
  const symbols = {
    "3m": "%5EIRX",
    "2y": "%5EUSTY2",
    "5y": "%5EFVX",
    "10y": "%5ETNX",
    "30y": "%5ETYX"
  };
  
  return symbols[term] || "";
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
 * Retrieves volatility indices
 * @return {Array} Array of volatility indices
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
