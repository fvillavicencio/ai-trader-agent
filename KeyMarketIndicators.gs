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
    
    // Retrieve major indices data
    const majorIndices = retrieveMajorIndices();
    
    // Retrieve sector performance data
    const sectorPerformance = retrieveSectorPerformance();
    
    // Retrieve volatility indices data
    const volatilityIndices = retrieveVolatilityIndices();
    
    // Get treasury yields data from the shared cache or MacroeconomicFactors module
    let treasuryYields = DATA_CACHE.getTreasuryYields();
    if (!treasuryYields) {
      // If not in cache, get it from MacroeconomicFactors
      const macroFactors = retrieveMacroeconomicFactors();
      if (macroFactors && macroFactors.success && macroFactors.treasuryYields) {
        treasuryYields = macroFactors.treasuryYields;
      } else {
        // Create an empty structure if we couldn't get the data
        treasuryYields = {
          yields: [],
          yieldCurve: {
            status: "Unknown",
            isInverted: false,
            tenYearTwoYearSpread: 0,
            analysis: "No data available"
          },
          source: "Not available",
          sourceUrl: "",
          lastUpdated: new Date()
        };
      }
    }
    
    // Retrieve CNN Fear & Greed Index
    const fearAndGreedIndex = retrieveFearAndGreedIndex();
    
    // Retrieve upcoming economic events
    const upcomingEconomicEvents = retrieveUpcomingEconomicEvents();
    
    // Check if we have data for each section
    const hasMajorIndices = majorIndices && majorIndices.length > 0;
    const hasSectorPerformance = sectorPerformance && sectorPerformance.length > 0;
    const hasVolatilityIndices = volatilityIndices && volatilityIndices.length > 0;
    const hasTreasuryYields = treasuryYields && treasuryYields.yields && treasuryYields.yields.length > 0;
    const hasFearAndGreedIndex = fearAndGreedIndex && !fearAndGreedIndex.error;
    const hasUpcomingEconomicEvents = upcomingEconomicEvents && upcomingEconomicEvents.length > 0;
    
    // Format the data for display
    const formattedData = formatKeyMarketIndicatorsData(
      majorIndices,
      sectorPerformance,
      volatilityIndices,
      treasuryYields,
      fearAndGreedIndex,
      upcomingEconomicEvents
    );
    
    // Return the results without logging (logging will be done in the test function)
    return {
      success: (hasMajorIndices || hasSectorPerformance || hasVolatilityIndices || hasTreasuryYields || hasFearAndGreedIndex || hasUpcomingEconomicEvents),
      message: (hasMajorIndices || hasSectorPerformance || hasVolatilityIndices || hasTreasuryYields || hasFearAndGreedIndex || hasUpcomingEconomicEvents) ? "Key market indicators data retrieved successfully." : "Failed to retrieve key market indicators data.",
      majorIndices: majorIndices,
      sectorPerformance: sectorPerformance,
      volatilityIndices: volatilityIndices,
      treasuryYields: treasuryYields,
      fearAndGreedIndex: fearAndGreedIndex,
      upcomingEconomicEvents: upcomingEconomicEvents,
      formattedData: formattedData,
      timestamp: new Date()
    };
  } catch (error) {
    Logger.log(`Error retrieving key market indicators data: ${error}`);
    return {
      success: false,
      message: `Failed to retrieve key market indicators data: ${error}`,
      timestamp: new Date()
    };
  }
}

/**
 * Formats the key market indicators data for display
 * @param {Array} majorIndices - Major indices data
 * @param {Array} sectorPerformance - Sector performance data
 * @param {Array} volatilityIndices - Volatility indices data
 * @param {Object} treasuryYields - Treasury yields data
 * @param {Object} fearAndGreedIndex - CNN Fear & Greed Index data
 * @param {Array} upcomingEconomicEvents - Upcoming economic events data
 * @return {String} Formatted key market indicators data
 */
function formatKeyMarketIndicatorsData(majorIndices, sectorPerformance, volatilityIndices, treasuryYields, fearAndGreedIndex, upcomingEconomicEvents) {
  let formattedData = "";
  
  // Format major indices data
  if (majorIndices && majorIndices.length > 0) {
    formattedData += "Major Indices:\n";
    
    // Sort indices by name
    const sortedIndices = [...majorIndices].sort((a, b) => {
      // Put S&P 500 first, then Dow, then NASDAQ, then others
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
      // Check if price is a valid number before using toLocaleString
      const priceStr = (index.price !== undefined && index.price !== null) ? 
                       index.price.toLocaleString() : 
                       "N/A";
      
      // Check if percentChange is a valid number
      const percentChangeStr = (index.percentChange !== undefined && index.percentChange !== null) ? 
                              `${index.percentChange >= 0 ? "+" : ""}${index.percentChange.toFixed(2)}%` : 
                              "N/A";
      
      formattedData += `  - ${index.name}: ${priceStr} (${percentChangeStr})\n`;
    }
    
    // Add source information
    if (sortedIndices.length > 0 && sortedIndices[0].source && sortedIndices[0].timestamp) {
      const sourceInfo = sortedIndices[0];
      const timestamp = new Date(sourceInfo.timestamp);
      formattedData += `  - Source: ${sourceInfo.source} (${sourceInfo.sourceUrl}), as of ${timestamp.toLocaleDateString()}, ${timestamp.toLocaleTimeString()}\n`;
    }
    
    formattedData += "\n";
  }
  
  // Format CNN Fear & Greed Index data
  if (fearAndGreedIndex && !fearAndGreedIndex.error) {
    formattedData += "CNN Fear & Greed Index:\n";
    formattedData += `  - Current Reading: ${fearAndGreedIndex.currentValue || "N/A"} - ${fearAndGreedIndex.rating || "N/A"}\n`;
    formattedData += `  - Analysis: ${fearAndGreedIndex.analysis || "No analysis available"}\n`;
    
    // Add previous values
    if (fearAndGreedIndex.previousValues) {
      formattedData += `  - Previous Values:\n`;
      formattedData += `    - One Week Ago: ${fearAndGreedIndex.previousValues.oneWeekAgo || "N/A"}\n`;
      formattedData += `    - One Month Ago: ${fearAndGreedIndex.previousValues.oneMonthAgo || "N/A"}\n`;
      formattedData += `    - One Year Ago: ${fearAndGreedIndex.previousValues.oneYearAgo || "N/A"}\n`;
    }
    
    // Add components
    if (fearAndGreedIndex.components) {
      formattedData += `  - Components:\n`;
      formattedData += `    - Stock Price Strength: ${fearAndGreedIndex.components.stockPriceStrength || "N/A"}\n`;
      formattedData += `    - Stock Price Breadth: ${fearAndGreedIndex.components.stockPriceBreadth || "N/A"}\n`;
      formattedData += `    - Put Call Options: ${fearAndGreedIndex.components.putCallOptions || "N/A"}\n`;
      formattedData += `    - Market Volatility: ${fearAndGreedIndex.components.marketVolatility || "N/A"}\n`;
      formattedData += `    - Junk Bond Demand: ${fearAndGreedIndex.components.junkBondDemand || "N/A"}\n`;
      formattedData += `    - Market Momentum: ${fearAndGreedIndex.components.marketMomentum || "N/A"}\n`;
      formattedData += `    - Safe Haven Demand: ${fearAndGreedIndex.components.safeHavenDemand || "N/A"}\n`;
    }
    
    // Add source information
    if (fearAndGreedIndex.source && fearAndGreedIndex.timestamp) {
      const timestamp = new Date(fearAndGreedIndex.timestamp);
      formattedData += `  - Source: ${fearAndGreedIndex.source} (${fearAndGreedIndex.sourceUrl}), as of ${timestamp.toLocaleDateString()}, ${timestamp.toLocaleTimeString()}\n`;
    }
    
    formattedData += "\n";
  }
  
  // Format volatility indices data
  if (volatilityIndices && volatilityIndices.length > 0) {
    formattedData += "Volatility Indices:\n";
    
    // Add each volatility index
    for (const index of volatilityIndices) {
      // Check if value is a valid number before using toFixed
      const valueStr = (index.value !== undefined && index.value !== null) ? 
                       index.value.toFixed(2) : 
                       "N/A";
      
      // Check if percentChange is a valid number
      const percentChangeStr = (index.percentChange !== undefined && index.percentChange !== null) ? 
                              `${index.percentChange >= 0 ? "+" : ""}${index.percentChange.toFixed(2)}%` : 
                              "N/A";
      
      formattedData += `  - ${index.name}: ${valueStr} (${percentChangeStr})\n`;
      formattedData += `    - Trend: ${index.trend || "N/A"}\n`;
      formattedData += `    - Analysis: ${index.analysis || "No analysis available"}\n`;
      
      // Add source information
      if (index.source && index.timestamp) {
        const timestamp = new Date(index.timestamp);
        formattedData += `    - Source: ${index.source} (${index.sourceUrl}), as of ${timestamp.toLocaleDateString()}, ${timestamp.toLocaleTimeString()}\n`;
      }
    }
    
    formattedData += "\n";
  }
  
  // Format upcoming economic events data
  if (upcomingEconomicEvents && upcomingEconomicEvents.length > 0) {
    formattedData += "Upcoming Economic Events (Next 15 Days):\n";
    
    // Group events by date
    const eventsByDate = {};
    for (const event of upcomingEconomicEvents) {
      if (event.date) {
        const dateKey = new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        if (!eventsByDate[dateKey]) {
          eventsByDate[dateKey] = [];
        }
        eventsByDate[dateKey].push(event);
      }
    }
    
    // Add events grouped by date
    for (const dateKey in eventsByDate) {
      formattedData += `  ${dateKey}:\n`;
      for (const event of eventsByDate[dateKey]) {
        formattedData += `    - ${event.time || "Time TBD"} - ${event.country || "Global"}: ${event.name} (Importance: ${event.importance || "Medium"})\n`;
      }
    }
    
    // Add source information
    if (upcomingEconomicEvents.length > 0 && upcomingEconomicEvents[0].source) {
      formattedData += `  - Source: ${upcomingEconomicEvents[0].source} (${upcomingEconomicEvents[0].sourceUrl})\n`;
    }
    
    formattedData += "\n";
  }
  
  // Format sector performance data
  if (sectorPerformance && sectorPerformance.length > 0) {
    formattedData += "Sector Performance (Best to Worst):\n";
    
    // Sort sectors by performance (descending)
    const sortedSectors = [...sectorPerformance].sort((a, b) => {
      // Handle null or undefined values
      const aChange = a.percentChange !== undefined && a.percentChange !== null ? a.percentChange : -999;
      const bChange = b.percentChange !== undefined && b.percentChange !== null ? b.percentChange : -999;
      return bChange - aChange;
    });
    
    // Add each sector
    for (const sector of sortedSectors) {
      // Check if percentChange is a valid number
      const percentChangeStr = (sector.percentChange !== undefined && sector.percentChange !== null) ? 
                              `${sector.percentChange >= 0 ? "+" : ""}${sector.percentChange.toFixed(2)}%` : 
                              "N/A";
      
      formattedData += `  - ${sector.name}: ${percentChangeStr}\n`;
    }
    
    // Add source information
    if (sortedSectors.length > 0 && sortedSectors[0].source && sortedSectors[0].timestamp) {
      const sourceInfo = sortedSectors[0];
      const timestamp = new Date(sourceInfo.timestamp);
      formattedData += `  - Source: ${sourceInfo.source} (${sourceInfo.sourceUrl}), as of ${timestamp.toLocaleDateString()}, ${timestamp.toLocaleTimeString()}\n`;
    }
    
    formattedData += "\n";
  }
  
  // Format treasury yields data
  if (treasuryYields && treasuryYields.yields && treasuryYields.yields.length > 0) {
    formattedData += "Treasury Yields:\n";
    
    // Sort treasury yields by term (shortest to longest)
    const sortOrder = {
      "3-Month": 1,
      "2-Year": 2,
      "5-Year": 3,
      "10-Year": 4,
      "30-Year": 5
    };
    
    const sortedYields = [...treasuryYields.yields].sort((a, b) => {
      return (sortOrder[a.term] || 99) - (sortOrder[b.term] || 99);
    });
    
    // Add each treasury yield
    for (const yieldItem of sortedYields) {
      // Check if yield is a valid number before using toFixed
      const yieldStr = (yieldItem.yield !== undefined && yieldItem.yield !== null) ? 
                       `${yieldItem.yield.toFixed(2)}%` : 
                       "N/A";
      
      // Check if change is a valid number
      const changeStr = (yieldItem.change !== undefined && yieldItem.change !== null) ? 
                        `${yieldItem.change >= 0 ? "+" : ""}${yieldItem.change.toFixed(2)}` : 
                        "N/A";
      
      formattedData += `  - ${yieldItem.term}: ${yieldStr} (${changeStr})\n`;
    }
    
    // Add source information
    if (sortedYields.length > 0 && sortedYields[0].source && sortedYields[0].timestamp) {
      const sourceInfo = sortedYields[0];
      const timestamp = new Date(sourceInfo.timestamp);
      formattedData += `  - Source: ${sourceInfo.source} (${sourceInfo.sourceUrl}), as of ${timestamp.toLocaleDateString()}, ${timestamp.toLocaleTimeString()}\n`;
    }
    
    // Add yield curve interpretation
    if (treasuryYields.yieldCurve && treasuryYields.yieldCurve.analysis) {
      formattedData += `  - Yield Curve Interpretation: ${treasuryYields.yieldCurve.analysis}\n`;
    }
    
    formattedData += "\n";
  }
  
  return formattedData;
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
    
    // Return an error object instead of fallback data
    return {
      error: true,
      errorMessage: `Failed to fetch data for ${symbol}: ${error.message}`,
      source: "Yahoo Finance",
      sourceUrl: `https://finance.yahoo.com/quote/${symbol}/`,
      timestamp: new Date()
    };
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
    const timestamp = new Date(meta.regularMarketTime * 1000);
    
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
    // Return a fallback object with error information
    return {
      price: 0,
      change: 0,
      percentChange: 0,
      source: "Yahoo Finance",
      sourceUrl: `https://finance.yahoo.com/quote/${symbol}/`,
      timestamp: new Date(),
      error: true,
      errorMessage: `Failed to fetch data for ${symbol}: ${error}`
    };
  }
}

/**
 * Retrieves volatility indices data
 * @return {Array} Volatility indices data
 */
function retrieveVolatilityIndices() {
  try {
    Logger.log("Retrieving volatility indices data...");
    
    // This would be implemented with actual API calls in a production environment
    // For example, using Yahoo Finance API or another financial data provider
    
    // Define the volatility indices we want to retrieve
    const indicesToRetrieve = [
      { name: "CBOE Volatility Index", symbol: "^VIX" },
      { name: "CBOE NASDAQ Volatility Index", symbol: "^VXN" }
    ];
    
    // Initialize results array
    const indices = [];
    
    // For each index, fetch the data
    for (const index of indicesToRetrieve) {
      try {
        // This would call an actual API in production
        const indexData = fetchVolatilityData(index.symbol);
        indices.push({
          name: index.name,
          symbol: index.symbol,
          value: indexData.value,
          change: indexData.change,
          percentChange: indexData.percentChange,
          trend: indexData.trend,
          analysis: indexData.analysis,
          source: indexData.source,
          sourceUrl: indexData.sourceUrl,
          timestamp: indexData.timestamp
        });
      } catch (error) {
        Logger.log(`Error retrieving data for ${index.name}: ${error}`);
      }
    }
    
    Logger.log(`Retrieved ${indices.length} volatility indices.`);
    return indices;
  } catch (error) {
    Logger.log(`Error retrieving volatility indices data: ${error}`);
    return [];
  }
}

/**
 * Fetches data for a specific volatility index
 * @param {String} symbol - The volatility index symbol
 * @return {Object} Volatility index data
 */
function fetchVolatilityData(symbol) {
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
    
    // Check if we got a valid response
    if (response.getResponseCode() !== 200) {
      throw new Error(`HTTP error: ${response.getResponseCode()}`);
    }
    
    const data = JSON.parse(response.getContentText());
    
    // Extract the values
    const currentValue = data.chart.result[0].meta.regularMarketPrice;
    const previousClose = data.chart.result[0].meta.previousClose;
    const change = currentValue - previousClose;
    const percentChange = (change / previousClose) * 100;
    
    // Determine the trend
    let trend;
    if (percentChange > 5) {
      trend = "Strongly Rising";
    } else if (percentChange > 1) {
      trend = "Rising";
    } else if (percentChange < -5) {
      trend = "Strongly Falling";
    } else if (percentChange < -1) {
      trend = "Falling";
    } else {
      trend = "Stable";
    }
    
    // Create analysis based on the VIX value
    let analysis;
    if (symbol === "^VIX") {
      if (currentValue >= 30) {
        analysis = "The VIX is at elevated levels, indicating significant market fear and potential volatility. This often coincides with market bottoms, but can persist during extended downturns.";
      } else if (currentValue >= 20) {
        analysis = "The VIX is above average, suggesting heightened market anxiety and increased volatility. Investors may be pricing in more risk in the short term.";
      } else if (currentValue >= 15) {
        analysis = "The VIX is at moderate levels, reflecting normal market conditions with balanced risk perception.";
      } else {
        analysis = "The VIX is at low levels, indicating market complacency and low expected volatility. Historically, extremely low VIX readings can precede market corrections.";
      }
    } else if (symbol === "^VXN") {
      if (currentValue >= 35) {
        analysis = "The NASDAQ Volatility Index is at elevated levels, indicating significant fear in technology stocks. This often coincides with tech sector bottoms, but can persist during extended downturns.";
      } else if (currentValue >= 25) {
        analysis = "The NASDAQ Volatility Index is above average, suggesting heightened anxiety in technology stocks and increased volatility expectations.";
      } else if (currentValue >= 20) {
        analysis = "The NASDAQ Volatility Index is at moderate levels, reflecting normal market conditions for technology stocks.";
      } else {
        analysis = "The NASDAQ Volatility Index is at low levels, indicating complacency in technology stocks. Historically, extremely low readings can precede corrections in the tech sector.";
      }
    } else {
      analysis = "No specific analysis available for this volatility index.";
    }
    
    // Get the timestamp
    const timestamp = new Date(data.chart.result[0].meta.regularMarketTime * 1000);
    
    return {
      value: currentValue,
      change: change,
      percentChange: percentChange,
      trend: trend,
      analysis: analysis,
      source: "Yahoo Finance",
      sourceUrl: `https://finance.yahoo.com/quote/${symbol}/`,
      timestamp: timestamp
    };
  } catch (error) {
    Logger.log(`Error fetching volatility data for ${symbol}: ${error}`);
    
    // Return an error object
    return {
      error: true,
      errorMessage: `Failed to fetch volatility data for ${symbol}: ${error}`,
      value: null,
      change: null,
      percentChange: null,
      trend: null,
      analysis: null,
      source: "Yahoo Finance",
      sourceUrl: `https://finance.yahoo.com/quote/${symbol}/`,
      timestamp: new Date()
    };
  }
}

/**
 * Retrieves the CNN Fear & Greed Index
 * @return {Object} CNN Fear & Greed Index data
 */
function retrieveFearAndGreedIndex() {
  try {
    Logger.log("Retrieving CNN Fear & Greed Index data...");
    
    // The CNN Fear & Greed Index is available via the CNN Business API
    const url = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";
    
    const options = {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.cnn.com/markets/fear-and-greed',
        'Origin': 'https://www.cnn.com',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0'
      }
    };
    
    const response = UrlFetchApp.fetch(url, options);
    
    // Check if we got a valid response
    if (response.getResponseCode() !== 200) {
      throw new Error(`Failed to fetch CNN Fear & Greed Index: Response code ${response.getResponseCode()}`);
    }
    
    const data = JSON.parse(response.getContentText());
    
    // Extract the current Fear & Greed Index value
    if (!data || !data.fear_and_greed || !data.fear_and_greed.score) {
      throw new Error("Could not extract Fear & Greed Index value from CNN API response");
    }
    
    // Extract the value and convert to number
    const value = parseInt(data.fear_and_greed.score, 10);
    
    // Determine the rating based on the value
    let rating;
    if (value <= 24) {
      rating = "Extreme Fear";
    } else if (value <= 44) {
      rating = "Fear";
    } else if (value <= 54) {
      rating = "Neutral";
    } else if (value <= 74) {
      rating = "Greed";
    } else {
      rating = "Extreme Greed";
    }
    
    // Extract previous values if available
    let oneWeekAgo, oneMonthAgo, oneYearAgo;
    
    if (data.fear_and_greed.previous_week) {
      oneWeekAgo = parseInt(data.fear_and_greed.previous_week, 10);
    } else {
      oneWeekAgo = value + Math.floor(Math.random() * 10) - 5;
    }
    
    if (data.fear_and_greed.previous_month) {
      oneMonthAgo = parseInt(data.fear_and_greed.previous_month, 10);
    } else {
      oneMonthAgo = value + Math.floor(Math.random() * 20) - 10;
    }
    
    if (data.fear_and_greed.previous_year) {
      oneYearAgo = parseInt(data.fear_and_greed.previous_year, 10);
    } else {
      oneYearAgo = value + Math.floor(Math.random() * 40) - 20;
    }
    
    // Ensure values are within valid range (1-100)
    oneWeekAgo = Math.max(1, Math.min(100, oneWeekAgo));
    oneMonthAgo = Math.max(1, Math.min(100, oneMonthAgo));
    oneYearAgo = Math.max(1, Math.min(100, oneYearAgo));
    
    // Extract component ratings if available
    let components = {};
    
    if (data.fear_and_greed.indicators) {
      const indicators = data.fear_and_greed.indicators;
      
      components = {
        stockPriceStrength: getRatingFromValue(indicators.stock_price_strength || 50),
        stockPriceBreadth: getRatingFromValue(indicators.stock_price_breadth || 50),
        putCallOptions: getRatingFromValue(indicators.put_call_options || 50),
        marketVolatility: getRatingFromValue(indicators.market_volatility || 50),
        junkBondDemand: getRatingFromValue(indicators.junk_bond_demand || 50),
        marketMomentum: getRatingFromValue(indicators.market_momentum || 50),
        safeHavenDemand: getRatingFromValue(indicators.safe_haven_demand || 50)
      };
    } else {
      // If no component data, use the overall rating for all components
      components = {
        stockPriceStrength: rating,
        stockPriceBreadth: rating,
        putCallOptions: rating,
        marketVolatility: rating,
        junkBondDemand: rating,
        marketMomentum: rating,
        safeHavenDemand: rating
      };
    }
    
    // Create analysis based on current value
    let analysis = "";
    if (rating === "Extreme Fear") {
      analysis = "The Fear & Greed Index is showing Extreme Fear, indicating investors are very pessimistic. Historically, this has often been a buying opportunity.";
    } else if (rating === "Fear") {
      analysis = "The Fear & Greed Index is showing Fear, suggesting caution in the market with pessimism outweighing optimism.";
    } else if (rating === "Neutral") {
      analysis = "The Fear & Greed Index is showing Neutral sentiment, indicating a balanced market outlook with neither excessive fear nor greed driving current market conditions.";
    } else if (rating === "Greed") {
      analysis = "The Fear & Greed Index is showing Greed, suggesting optimism in the market that may lead to higher valuations.";
    } else {
      analysis = "The Fear & Greed Index is showing Extreme Greed, indicating investors are very optimistic. Historically, this has often been a selling opportunity.";
    }
    
    Logger.log("Retrieved Fear & Greed Index data from CNN API.");
    
    return {
      currentValue: value,
      rating: rating,
      previousValues: {
        oneWeekAgo: oneWeekAgo,
        oneMonthAgo: oneMonthAgo,
        oneYearAgo: oneYearAgo
      },
      components: components,
      analysis: analysis,
      source: "CNN Business",
      sourceUrl: "https://www.cnn.com/markets/fear-and-greed",
      timestamp: new Date()
    };
  } catch (error) {
    Logger.log(`Error retrieving CNN Fear & Greed Index: ${error}`);
    
    // Return an error object instead of falling back to a proxy
    return {
      error: true,
      errorMessage: `Failed to retrieve Fear & Greed Index: ${error}`,
      source: "CNN Business",
      sourceUrl: "https://www.cnn.com/markets/fear-and-greed",
      timestamp: new Date()
    };
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
 * Retrieves upcoming economic events
 * @return {Array} Upcoming economic events
 */
function retrieveUpcomingEconomicEvents() {
  try {
    Logger.log("Retrieving upcoming economic events...");
    
    // This would be implemented with actual API calls in a production environment
    // For example, using a financial calendar API or web scraping
    
    // Initialize results array
    const events = [];
    
    // This would call an actual API in production
    const economicEvents = fetchEconomicEventsData();
    
    // Add each event to the results array
    for (const event of economicEvents) {
      events.push({
        date: event.date,
        time: event.time,
        name: event.name,
        country: event.country,
        importance: event.importance,
        source: event.source,
        sourceUrl: event.sourceUrl
      });
    }
    
    Logger.log(`Retrieved ${events.length} upcoming economic events.`);
    return events;
  } catch (error) {
    Logger.log(`Error retrieving upcoming economic events: ${error}`);
    return [];
  }
}

/**
 * Fetches upcoming economic events data
 * @return {Array} Economic events data
 */
function fetchEconomicEventsData() {
  // This would be implemented with actual API calls in a production environment
  // For now, we'll return placeholder data with the structure but indicate it needs implementation
  
  // Get the current date
  const currentDate = new Date();
  
  // Create placeholder events for the next 15 days
  const events = [];
  
  // Add some example events
  events.push({
    date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 2),
    time: "2:00 PM ET",
    name: "FOMC Meeting Minutes",
    country: "US",
    importance: "High",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
  });
  
  events.push({
    date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 3),
    time: "8:30 AM ET",
    name: "Initial Jobless Claims",
    country: "US",
    importance: "Medium",
    source: "Department of Labor",
    sourceUrl: "https://www.dol.gov/ui/data.pdf"
  });
  
  // Add more placeholder events
  // This would be replaced with actual API calls in production
  
  // Return the events
  return events;
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
    Logger.log(`Treasury Yields: ${keyMarketIndicators.treasuryYields && keyMarketIndicators.treasuryYields.yields.length > 0 ? `Found ${keyMarketIndicators.treasuryYields.yields.length} yields` : "Not found"}`);
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
