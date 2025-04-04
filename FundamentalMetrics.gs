/**
 * Fundamental Metrics Module
 * Handles retrieval of fundamental metrics for stocks/ETFs including PEG ratios, 
 * Forward P/E Ratios, and other relevant metrics
 */

/**
 * Retrieves fundamental metrics for a list of stocks/ETFs
 * 
 * @param {Array} symbols - List of stock/ETF symbols to retrieve metrics for
 * @param {Array} mentionedStocks - List of stocks mentioned in market sentiment analysis
 * @return {Object} - Object containing fundamental metrics data
 */
function retrieveFundamentalMetrics(symbols = [], mentionedStocks = []) {
  try {
    Logger.log(`Retrieving fundamental metrics for ${symbols.length} stocks...`);
    
    // Track execution time
    const startTime = new Date().getTime();
    
    // Combine user-provided symbols with default symbols
    const defaultSymbols = [ "SPY", "QQQ", "IWM", "DIA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA" ];
    
    // Add mentioned stocks to the symbols list if they're not already included
    const allMentionedStocks = mentionedStocks || [];
    Logger.log(`Mentioned stocks from market sentiment: ${allMentionedStocks.length > 0 ? allMentionedStocks.join(', ') : 'None'}`);
    
    // Create a set of all symbols to avoid duplicates
    const symbolsSet = new Set([...symbols, ...defaultSymbols, ...allMentionedStocks]);
    const allSymbols = Array.from(symbolsSet);
    
    Logger.log(`Retrieving fundamental metrics for ${allSymbols.length} symbols: ${allSymbols.join(', ')}`);
    
    // Initialize results array
    const results = [];
    const failedSymbols = [];
    
    // Track cache hits and misses
    let cacheHits = 0;
    let cacheMisses = 0;
    
    // Process each symbol
    for (const symbol of allSymbols) {
      Logger.log(`Retrieving fundamental metrics for ${symbol}...`);
      
      try {
        // Fetch fundamental metrics data for the symbol
        const metrics = fetchFundamentalMetricsData(symbol);
        
        // Check if data was from cache
        if (metrics && metrics.fromCache) {
          cacheHits++;
          Logger.log(`Retrieved ${symbol} metrics from cache`);
        } else {
          cacheMisses++;
        }
        
        // Verify we got valid data
        if (metrics && metrics.symbol) {
          results.push(metrics);
          Logger.log(`Successfully retrieved metrics for ${symbol}`);
        } else {
          Logger.log(`No valid metrics data returned for ${symbol}`);
          failedSymbols.push(symbol);
          
          // Create a minimal entry for the symbol to ensure it's included in the results
          results.push({
            symbol: symbol,
            name: getCompanyName(symbol),
            pegRatio: null,
            forwardPE: null,
            priceToBook: null,
            priceToSales: null,
            debtToEquity: null,
            returnOnEquity: null,
            returnOnAssets: null,
            profitMargin: null,
            dividendYield: null,
            beta: null,
            expenseRatio: null,
            dataSource: "Not available"
          });
        }
      } catch (error) {
        Logger.log(`Error retrieving metrics for ${symbol}: ${error}`);
        failedSymbols.push(symbol);
        
        // Create a minimal entry for the symbol to ensure it's included in the results
        results.push({
          symbol: symbol,
          name: getCompanyName(symbol),
          pegRatio: null,
          forwardPE: null,
          priceToBook: null,
          priceToSales: null,
          debtToEquity: null,
          returnOnEquity: null,
          returnOnAssets: null,
          profitMargin: null,
          dividendYield: null,
          beta: null,
          expenseRatio: null,
          dataSource: "Error"
        });
      }
    }
    
    // Calculate execution time
    const executionTime = (new Date().getTime() - startTime) / 1000;
    
    // Log performance metrics
    Logger.log(`Fundamental metrics retrieval completed in ${executionTime} seconds`);
    Logger.log(`Cache performance: ${cacheHits} hits, ${cacheMisses} misses (${Math.round(cacheHits / allSymbols.length * 100)}% hit rate)`);
    
    // Sort results by symbol
    results.sort((a, b) => {
      // Put major indices first (SPY, QQQ, IWM, DIA)
      const majorIndices = ["SPY", "QQQ", "IWM", "DIA"];
      const aIsMajor = majorIndices.includes(a.symbol);
      const bIsMajor = majorIndices.includes(b.symbol);
      
      if (aIsMajor && !bIsMajor) return -1;
      if (!aIsMajor && bIsMajor) return 1;
      if (aIsMajor && bIsMajor) {
        return majorIndices.indexOf(a.symbol) - majorIndices.indexOf(b.symbol);
      }
      
      // Then sort alphabetically
      return a.symbol.localeCompare(b.symbol);
    });
    
    return {
      status: "success",
      message: "Fundamental metrics data retrieved successfully.",
      executionTime: executionTime,
      cachePerformance: {
        hits: cacheHits,
        misses: cacheMisses,
        hitRate: `${Math.round(cacheHits / allSymbols.length * 100)}%`
      },
      data: results,
      failedSymbols: failedSymbols.length > 0 ? failedSymbols : []
    };
  } catch (error) {
    Logger.log(`Error in retrieveFundamentalMetrics: ${error}`);
    return {
      status: "error",
      message: `Failed to retrieve fundamental metrics data: ${error}`,
      data: []
    };
  }
}

/**
 * Fetches fundamental metrics data for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Fundamental metrics data
 */
function fetchFundamentalMetricsData(symbol) {
  try {
    Logger.log(`Fetching fundamental metrics for ${symbol} using cascading approach...`);
    
    // Check cache first (30-minute cache for fundamental metrics)
    const scriptCache = CacheService.getScriptCache();
    const cacheKey = `FUNDAMENTAL_METRICS_${symbol}`;
    
    // Get cached data
    const cachedData = scriptCache.get(cacheKey);
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData);
        const cacheTime = new Date(parsedData.lastUpdated);
        const currentTime = new Date();
        const cacheAgeMinutes = (currentTime - cacheTime) / (1000 * 60);
        
        if (cacheAgeMinutes < 30) {
          Logger.log(`Using cached fundamental metrics for ${symbol} (less than 30 minutes old)`);
          return { ...parsedData, fromCache: true };
        } else {
          Logger.log(`Cached fundamental metrics for ${symbol} is more than 30 minutes old`);
        }
      } catch (parseError) {
        Logger.log(`Error parsing cached data for ${symbol}: ${parseError}`);
        scriptCache.remove(cacheKey);
      }
    }
    
    // Track execution time
    const startTime = new Date().getTime();
    
    // Get basic stock data from StockDataRetriever
    Logger.log(`Retrieving basic stock data for ${symbol} from StockDataRetriever...`);
    // Use global reference to access the StockDataRetriever script
    const stockData = retrieveStockMetrics(symbol);
    
    // Initialize metrics object with stock data
    let metrics = {
      symbol: symbol,
      price: stockData.price,
      priceChange: stockData.priceChange,
      changesPercentage: stockData.changesPercentage,
      volume: stockData.volume,
      marketCap: stockData.marketCap,
      industry: stockData.industry,
      sector: stockData.sector,
      name: stockData.company,
      pegRatio: stockData.pegRatio,
      forwardPE: stockData.forwardPE,
      priceToBook: stockData.priceToBook,
      priceToSales: stockData.priceToSales,
      debtToEquity: stockData.debtToEquity,
      returnOnEquity: stockData.returnOnEquity,
      returnOnAssets: stockData.returnOnAssets,
      profitMargin: stockData.profitMargin,
      dividendYield: stockData.dividendYield,
      beta: stockData.beta,
      expenseRatio: null,
      dataSource: stockData.dataSource ? [...stockData.dataSource] : [],
      fromCache: stockData.fromCache || false
    };
    
    // For ETFs, try to get expense ratio
    if (isETF(symbol)) {
      metrics.expenseRatio = fetchExpenseRatio(symbol);
    }
    
    // Get historical and sector averages for analysis
    const historicalAverages = fetchHistoricalAverages(symbol);
    const sectorAverages = fetchSectorAverages(symbol);
    
    // Add analysis to metrics
    metrics.analysis = generateAnalysis(symbol, metrics, historicalAverages, sectorAverages);
    
    // Cache the data for 30 minutes
    const cacheData = {
      ...metrics,
      lastUpdated: new Date().toISOString()
    };
    scriptCache.put(cacheKey, JSON.stringify(cacheData), 1800); // 30 minutes in seconds
    
    const executionTime = (new Date().getTime() - startTime) / 1000;
    Logger.log(`Retrieved fundamental metrics for ${symbol} in ${executionTime} seconds`);
    Logger.log(`Sources used: ${metrics.dataSource}`);

    return metrics;
  } catch (error) {
    Logger.log(`Error in fetchFundamentalMetricsData: ${error}`);
    return {
      symbol: symbol,
      price: null,
      priceChange: null,
      changesPercentage: null,
      volume: null,
      marketCap: null,
      industry: null,
      sector: null,
      name: null,
      pegRatio: null,
      forwardPE: null,
      priceToBook: null,
      priceToSales: null,
      debtToEquity: null,
      returnOnEquity: null,
      returnOnAssets: null,
      profitMargin: null,
      dividendYield: null,
      beta: null,
      expenseRatio: null,
      dataSource: [],
      fromCache: false
    };
  }
}

/**
 * Formats the fundamental metrics data for display
 * @param {Array} fundamentalMetrics - Array of fundamental metrics data objects
 * @return {String} Formatted fundamental metrics data
 */
function formatFundamentalMetricsData(fundamentalMetrics) {
  try {
    let formattedData = "FUNDAMENTAL METRICS DATA:\n";
    
    // Check if we have data
    if (!fundamentalMetrics || fundamentalMetrics.length === 0) {
      return "No fundamental metrics data available.";
    }
    
    // Add count of stocks/ETFs
    formattedData += `- Metrics for ${fundamentalMetrics.length} stocks/ETFs:\n`;
    
    // Group stocks by category
    const indices = fundamentalMetrics.filter(stock => ["SPY", "QQQ", "IWM", "DIA"].includes(stock.symbol));
    const magSeven = fundamentalMetrics.filter(stock => ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"].includes(stock.symbol));
    const otherStocks = fundamentalMetrics.filter(stock => 
      !["SPY", "QQQ", "IWM", "DIA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"].includes(stock.symbol)
    );
    
    // Format all stocks using the formatStockGroup function
    formattedData += formatStockGroup(fundamentalMetrics);
    
    // Add source and timestamp
    formattedData += `\nSource: Multiple financial data providers, as of ${new Date().toLocaleString()}\n`;
    
    return formattedData;
  } catch (error) {
    Logger.log(`Error formatting fundamental metrics data: ${error}`);
    return "Error formatting fundamental metrics data.";
  }
}

/**
 * Formats a group of stocks for display
 * @param {Array} stocks - Array of stock data objects
 * @return {String} Formatted stock data
 */
function formatStockGroup(stocks) {
  try {
    let formattedData = "";
    
    // Process each stock
    for (const stock of stocks) {
      // Get the symbol and name
      const symbol = stock.symbol || "Unknown";
      const name = stock.name || "Unknown";
      
      formattedData += `* ${symbol} (${name}):\n`;
      
      // Add price information if available
      if (stock.price !== null) {
        const priceFormatted = typeof stock.price === 'number' ? `$${stock.price.toFixed(2)}` : '$N/A';
        let priceChangeFormatted = "";
        
        if (stock.priceChange !== null && stock.changesPercentage !== null) {
          const changePrefix = stock.priceChange >= 0 ? '+' : '';
          const percentPrefix = stock.changesPercentage >= 0 ? '+' : '';
          const changeValue = typeof stock.priceChange === 'number' ? stock.priceChange.toFixed(2) : 'N/A';
          const percentValue = typeof stock.changesPercentage === 'number' ? stock.changesPercentage.toFixed(1) : 'N/A';
          priceChangeFormatted = ` (${changePrefix}${changeValue}, ${percentPrefix}${percentValue}%)`;
        }
        
        formattedData += `  - Price: ${priceFormatted}${priceChangeFormatted}\n`;
      }
      
      // Add volume and market cap if available
      if (stock.volume !== null) {
        formattedData += `  - Volume: ${typeof stock.volume === 'number' ? stock.volume.toLocaleString() : 'N/A'}\n`;
      }
      if (stock.marketCap !== null) {
        formattedData += `  - Market Cap: $${typeof stock.marketCap === 'number' ? (stock.marketCap / 1e9).toFixed(1) : 'N/A'}B\n`;
      }
      
      // Add fundamental metrics
      formattedData += `  - PEG Ratio: ${formatValue(stock.pegRatio)}\n`;
      formattedData += `  - Forward P/E: ${formatValue(stock.forwardPE)}\n`;
      formattedData += `  - Price to Book: ${formatValue(stock.priceToBook)}\n`;
      formattedData += `  - Price to Sales: ${formatValue(stock.priceToSales)}\n`;
      formattedData += `  - Debt to Equity: ${formatValue(stock.debtToEquity)}\n`;
      
      // Add ROE with percentage formatting if available
      if (stock.returnOnEquity !== null) {
        const roeValue = typeof stock.returnOnEquity === 'number' && stock.returnOnEquity <= 1 
          ? (stock.returnOnEquity * 100).toFixed(1) + '%' 
          : formatValue(stock.returnOnEquity);
        formattedData += `  - Return on Equity: ${roeValue}\n`;
      } else {
        formattedData += `  - Return on Equity: N/A\n`;
      }
      
      // Add Beta
      formattedData += `  - Beta: ${formatValue(stock.beta)}\n`;
      
      // Add a blank line between stocks
      formattedData += "\n";
    }
    
    return formattedData;
  } catch (error) {
    Logger.log(`Error formatting stock group: ${error}`);
    return "Error formatting stock data.";
  }
}

/**
 * Formats a value for display
 * @param {Number} value - The value to format
 * @return {String} Formatted value
 */
function formatValue(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return "N/A";
  }
  
  return value.toFixed(2);
}

/**
 * Evaluates a metric compared to historical and sector averages
 * @param {Number} current - Current value
 * @param {Number} historical - Historical average
 * @param {Number} sector - Sector average
 * @param {String} metricType - Type of metric (PEG, P/E, etc.)
 * @param {Boolean} higherIsBetter - Whether higher values are better
 * @return {String} Evaluation
 */
function evaluateMetric(current, historical, sector, metricType, higherIsBetter = false) {
  if (current === null || historical === null || sector === null || 
      current === 0 || historical === 0 || sector === 0) {
    return "Insufficient data";
  }
  
  // Calculate percentage differences
  const histDiff = ((current - historical) / historical) * 100;
  const sectorDiff = ((current - sector) / sector) * 100;
  
  // Determine if the metric is favorable
  let histFavorable = higherIsBetter ? (histDiff > 0) : (histDiff < 0);
  let sectorFavorable = higherIsBetter ? (sectorDiff > 0) : (sectorDiff < 0);
  
  // Special case for PEG ratio
  if (metricType === "PEG") {
    if (current < 1.0) return "Potentially undervalued";
    if (current > 2.0) return "Potentially overvalued";
    return "Fairly valued";
  }
  
  // Evaluation based on differences
  if (Math.abs(histDiff) < 10 && Math.abs(sectorDiff) < 10) {
    return "Fairly valued";
  } else if (histFavorable && sectorFavorable) {
    return "Favorable";
  } else if (!histFavorable && !sectorFavorable) {
    return "Unfavorable";
  } else {
    return "Mixed signals";
  }
}

/**
 * Generates analysis for a stock/ETF based on its metrics
 * @param {String} symbol - The stock/ETF symbol
 * @param {Object} metrics - Current fundamental metrics
 * @param {Object} historicalAverages - Historical average metrics (optional)
 * @param {Object} sectorAverages - Sector average metrics (optional)
 * @return {String} Analysis
 */
function generateAnalysis(symbol, metrics, historicalAverages = {}, sectorAverages = {}) {
  try {
    // Check if we have valid data
    if (!metrics || (!metrics.pegRatio && !metrics.forwardPE && !metrics.priceToBook)) {
      return "Insufficient data to generate analysis.";
    }
    
    // Initialize analysis
    let analysis = "";
    
    // Determine if this is an ETF
    const isETF = ["SPY", "QQQ", "IWM", "DIA"].includes(symbol);
    
    if (isETF) {
      // ETF analysis
      analysis += `${symbol} is an ETF. `;
      
      if (metrics.expenseRatio) {
        if (metrics.expenseRatio < 0.1) {
          analysis += `It has a low expense ratio of ${formatValue(metrics.expenseRatio * 100)}%, which is favorable for long-term investors. `;
        } else if (metrics.expenseRatio < 0.5) {
          analysis += `It has a moderate expense ratio of ${formatValue(metrics.expenseRatio * 100)}%. `;
        } else {
          analysis += `It has a relatively high expense ratio of ${formatValue(metrics.expenseRatio * 100)}%, which may impact long-term returns. `;
        }
      }
      
      if (metrics.beta) {
        if (metrics.beta < 0.8) {
          analysis += `With a beta of ${formatValue(metrics.beta)}, it tends to be less volatile than the overall market. `;
        } else if (metrics.beta < 1.2) {
          analysis += `With a beta of ${formatValue(metrics.beta)}, it tends to move in line with the overall market. `;
        } else {
          analysis += `With a beta of ${formatValue(metrics.beta)}, it tends to be more volatile than the overall market. `;
        }
      }
      
      if (metrics.dividendYield) {
        if (metrics.dividendYield > 0.03) {
          analysis += `It offers a relatively high dividend yield of ${formatValue(metrics.dividendYield * 100)}%. `;
        } else if (metrics.dividendYield > 0.01) {
          analysis += `It offers a moderate dividend yield of ${formatValue(metrics.dividendYield * 100)}%. `;
        } else {
          analysis += `It offers a relatively low dividend yield of ${formatValue(metrics.dividendYield * 100)}%. `;
        }
      }
    } else {
      // Stock analysis
      analysis += `${symbol} is a stock. `;
      
      // PEG Ratio analysis
      if (metrics.pegRatio) {
        if (metrics.pegRatio < 1.0) {
          analysis += `With a PEG ratio of ${formatValue(metrics.pegRatio)}, the stock appears to be potentially undervalued relative to its growth rate. `;
        } else if (metrics.pegRatio < 2.0) {
          analysis += `With a PEG ratio of ${formatValue(metrics.pegRatio)}, the stock appears to be fairly valued relative to its growth rate. `;
        } else {
          analysis += `With a PEG ratio of ${formatValue(metrics.pegRatio)}, the stock may be overvalued relative to its growth rate. `;
        }
      }
      
      // Forward P/E analysis
      if (metrics.forwardPE) {
        if (metrics.forwardPE < 15) {
          analysis += `Its forward P/E ratio of ${formatValue(metrics.forwardPE)} is relatively low, suggesting potential undervaluation. `;
        } else if (metrics.forwardPE < 25) {
          analysis += `Its forward P/E ratio of ${formatValue(metrics.forwardPE)} is moderate, suggesting fair valuation. `;
        } else {
          analysis += `Its forward P/E ratio of ${formatValue(metrics.forwardPE)} is relatively high, suggesting potential overvaluation. `;
        }
      }
      
      // Price/Book analysis
      if (metrics.priceToBook) {
        if (metrics.priceToBook < 1.0) {
          analysis += `With a price-to-book ratio of ${formatValue(metrics.priceToBook)}, the stock is trading below its book value. `;
        } else if (metrics.priceToBook < 3.0) {
          analysis += `With a price-to-book ratio of ${formatValue(metrics.priceToBook)}, the stock is trading at a reasonable multiple of its book value. `;
        } else {
          analysis += `With a price-to-book ratio of ${formatValue(metrics.priceToBook)}, the stock is trading at a premium to its book value. `;
        }
      }
      
      // Return on Equity analysis
      if (metrics.returnOnEquity) {
        if (metrics.returnOnEquity > 0.2) {
          analysis += `It demonstrates strong profitability with a return on equity of ${formatValue(metrics.returnOnEquity * 100)}%. `;
        } else if (metrics.returnOnEquity > 0.1) {
          analysis += `It demonstrates solid profitability with a return on equity of ${formatValue(metrics.returnOnEquity * 100)}%. `;
        } else if (metrics.returnOnEquity > 0) {
          analysis += `It demonstrates modest profitability with a return on equity of ${formatValue(metrics.returnOnEquity * 100)}%. `;
        } else {
          analysis += `It currently shows negative profitability with a return on equity of ${formatValue(metrics.returnOnEquity * 100)}%. `;
        }
      }
      
      // Debt/Equity analysis
      if (metrics.debtToEquity) {
        if (metrics.debtToEquity < 0.5) {
          analysis += `The company has a conservative financial structure with a debt-to-equity ratio of ${formatValue(metrics.debtToEquity)}. `;
        } else if (metrics.debtToEquity < 1.5) {
          analysis += `The company has a moderate financial structure with a debt-to-equity ratio of ${formatValue(metrics.debtToEquity)}. `;
        } else {
          analysis += `The company has a leveraged financial structure with a debt-to-equity ratio of ${formatValue(metrics.debtToEquity)}. `;
        }
      }
    }
    
    // Beta analysis (applicable to both stocks and ETFs)
    if (metrics.beta) {
      if (metrics.beta < 0.8) {
        analysis += `It has historically been less volatile than the market with a beta of ${formatValue(metrics.beta)}. `;
      } else if (metrics.beta < 1.2) {
        analysis += `It has historically moved in line with the market with a beta of ${formatValue(metrics.beta)}. `;
      } else {
        analysis += `It has historically been more volatile than the market with a beta of ${formatValue(metrics.beta)}. `;
      }
    }
    
    // Dividend analysis (applicable to both stocks and ETFs)
    if (metrics.dividendYield) {
      if (metrics.dividendYield > 0.03) {
        analysis += `It offers an attractive dividend yield of ${formatValue(metrics.dividendYield * 100)}%. `;
      } else if (metrics.dividendYield > 0.01) {
        analysis += `It offers a moderate dividend yield of ${formatValue(metrics.dividendYield * 100)}%. `;
      } else if (metrics.dividendYield > 0) {
        analysis += `It offers a modest dividend yield of ${formatValue(metrics.dividendYield * 100)}%. `;
      }
    }
    
    return analysis;
  } catch (error) {
    Logger.log(`Error generating analysis for ${symbol}: ${error}`);
    return "Unable to generate analysis due to an error.";
  }
}

/**
 * Determines if a symbol is an ETF based on common ETF symbols
 * @param {String} symbol - The stock/ETF symbol
 * @return {Boolean} True if the symbol is likely an ETF
 */
function isETF(symbol) {
  // Common ETF symbols
  const commonETFs = ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'VEA', 'VWO', 'BND', 'AGG', 'GLD', 'SLV', 'XLF', 'XLE', 'XLK', 'XLV', 'XLY', 'XLP', 'XLI', 'XLB', 'XLU', 'XLRE', 'XLC', 'VIG', 'VYM', 'SCHD'];
  
  // Check if the symbol is in the list of common ETFs
  if (commonETFs.includes(symbol)) {
    return true;
  }
  
  // Check if the symbol has common ETF prefixes
  const etfPrefixes = ['SPY', 'DIA', 'QQQ', 'IWM', 'VT', 'VO', 'VI', 'VA', 'VB', 'VC', 'VV', 'VG', 'VD', 'VF', 'VE', 'VY', 'VU', 'VS', 'SH', 'SDS', 'PSQ', 'QID', 'DOG', 'DXD', 'SQQQ', 'SPXU', 'TQQQ', 'UPRO', 'UDOW', 'SDOW', 'TECL', 'TECS', 'XL'];
  
  for (const prefix of etfPrefixes) {
    if (symbol.startsWith(prefix)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Gets or creates a shared spreadsheet for Google Finance data
 * @return {Spreadsheet} The shared spreadsheet
 */
function getSharedFinanceSpreadsheet() {
  try {
    // Try to get the spreadsheet ID from script properties
    const scriptProperties = PropertiesService.getScriptProperties();
    const spreadsheetId = scriptProperties.getProperty('FINANCE_SPREADSHEET_ID');
    
    if (spreadsheetId) {
      try {
        // Try to open the existing spreadsheet
        return SpreadsheetApp.openById(spreadsheetId);
      } catch (e) {
        // If the spreadsheet doesn't exist anymore, create a new one
        Logger.log(`Existing finance spreadsheet not found, creating a new one: ${e.message}`);
      }
    }
    
    // Create a new spreadsheet
    const spreadsheet = SpreadsheetApp.create("AI Trading Agent - Finance Data");
    
    // Store the ID in script properties
    scriptProperties.setProperty('FINANCE_SPREADSHEET_ID', spreadsheet.getId());
    
    Logger.log(`Created new shared finance spreadsheet with ID: ${spreadsheet.getId()}`);
    
    return spreadsheet;
  } catch (error) {
    Logger.log(`Error getting or creating shared finance spreadsheet: ${error}`);
    throw error;
  }
}

/**
 * Fetches historical averages for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Historical averages
 */
function fetchHistoricalAverages(symbol) {
  try {
    // In a production environment, you would fetch historical data
    // For now, we'll simulate the data
    
    // For indices, use standard values
    if (["SPY", "QQQ", "IWM", "DIA"].includes(symbol)) {
      return {
        pegRatio: 1.5,
        forwardPE: 18.5,
        priceToBook: 3.2,
        priceToSales: 2.4
      };
    }
    
    // For Magnificent Seven, use higher values
    if (["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"].includes(symbol)) {
      return {
        pegRatio: 2.1,
        forwardPE: 25.0,
        priceToBook: 8.5,
        priceToSales: 6.0
      };
    }
    
    // For other stocks, generate random values
    return {
      pegRatio: getRandomMetric(1.0, 2.5),
      forwardPE: getRandomMetric(15, 22),
      priceToBook: getRandomMetric(2, 5),
      priceToSales: getRandomMetric(1.5, 4)
    };
  } catch (error) {
    Logger.log(`Error fetching historical averages for ${symbol}: ${error}`);
    
    // Return placeholder data
    return {
      pegRatio: 0,
      forwardPE: 0,
      priceToBook: 0,
      priceToSales: 0
    };
  }
}

/**
 * Fetches sector averages for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Sector averages
 */
function fetchSectorAverages(symbol) {
  try {
    // In a production environment, you would determine the sector and fetch sector averages
    // For now, we'll use predefined sector averages based on the symbol
    
    // Define sector mappings (simplified)
    const sectorMappings = {
      "AAPL": "Technology",
      "MSFT": "Technology",
      "GOOGL": "Technology",
      "AMZN": "Consumer Cyclical",
      "META": "Technology",
      "TSLA": "Consumer Cyclical",
      "NVDA": "Technology",
      "SPY": "Market",
      "QQQ": "Technology",
      "IWM": "Small Cap",
      "DIA": "Large Cap"
    };
    
    // Define sector averages
    const sectorAverages = {
      "Technology": {
        pegRatio: 1.8,
        forwardPE: 24.0,
        priceToBook: 7.5,
        priceToSales: 5.0
      },
      "Consumer Cyclical": {
        pegRatio: 1.5,
        forwardPE: 20.0,
        priceToBook: 4.5,
        priceToSales: 2.5
      },
      "Market": {
        pegRatio: 1.5,
        forwardPE: 18.5,
        priceToBook: 3.2,
        priceToSales: 2.4
      },
      "Small Cap": {
        pegRatio: 1.3,
        forwardPE: 16.0,
        priceToBook: 2.0,
        priceToSales: 1.5
      },
      "Large Cap": {
        pegRatio: 1.6,
        forwardPE: 19.0,
        priceToBook: 3.5,
        priceToSales: 2.8
      },
      "Default": {
        pegRatio: 1.5,
        forwardPE: 18.0,
        priceToBook: 3.0,
        priceToSales: 2.0
      }
    };
    
    // Get the sector for the symbol
    const sector = sectorMappings[symbol] || "Default";
    
    // Return the sector averages
    return sectorAverages[sector];
  } catch (error) {
    Logger.log(`Error fetching sector averages for ${symbol}: ${error}`);
    
    // Return placeholder data
    return {
      pegRatio: 0,
      forwardPE: 0,
      priceToBook: 0,
      priceToSales: 0
    };
  }
}

/**
 * Retrieves recently mentioned stocks/ETFs from CNBC
 * @return {Array} Recently mentioned stocks/ETFs
 */
function retrieveRecentlyMentionedStocks() {
  try {
    // In a production environment, you would scrape CNBC or use an API
    // For now, we'll return a list of commonly mentioned stocks
    return ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA", "SPY", "QQQ"];
  } catch (error) {
    Logger.log(`Error retrieving recently mentioned stocks: ${error}`);
    return [];
  }
}

/**
 * Helper function to generate a random metric value
 * @param {Number} min - Minimum value
 * @param {Number} max - Maximum value
 * @return {Number} Random metric value
 */
function getRandomMetric(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Validates a metric value for realistic ranges
 * @param {Number} value - The metric value
 * @param {String} key - The metric key
 * @return {Number} Validated metric value
 */
function validateMetric(value, key) {
  // Define realistic ranges for different metrics
  const ranges = {
    pegRatio: { min: 0, max: 10 },
    forwardPE: { min: 0, max: 100 },
    priceToBook: { min: 0, max: 50 },
    priceToSales: { min: 0, max: 50 },
    debtToEquity: { min: 0, max: 5 },
    returnOnEquity: { min: -1, max: 1 }, // -100% to 100%
    returnOnAssets: { min: -1, max: 1 }, // -100% to 100%
    profitMargin: { min: -1, max: 1 }, // -100% to 100%
    beta: { min: -2, max: 5 },
    dividendYield: { min: 0, max: 0.2 } // 0% to 20%
  };
  
  // Check if we have a range defined for this key
  if (ranges[key]) {
    const { min, max } = ranges[key];
    
    // If the value is outside the range, clamp it
    if (value < min) {
      return min;
    } else if (value > max) {
      return max;
    }
  }
  
  return value;
}

/**
 * Clears the fundamental metrics cache for all symbols
 */
function clearFundamentalMetricsCache() {
  try {
    const cache = CacheService.getScriptCache();
    
    // Define a list of common stock symbols to clear
    const stockSymbols = [
      // Major indices
      "SPY", "QQQ", "IWM", "DIA",
      
      // Magnificent Seven
      "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA",
      
      // Other popular stocks
      "XOM", "CVX", "BA", "CAT", "PG", "JNJ", "JPM", "V", "MA", "DIS", "NFLX",
      "INTC", "AMD", "CSCO", "IBM", "ORCL", "CRM", "ADBE", "PYPL", "SQ",
      
      // ETFs
      "VOO", "VTI", "VEA", "VWO", "BND", "AGG", "VIG", "VYM", "SCHD"
    ];
    
    // Create cache keys for each symbol
    const keys = stockSymbols.map(symbol => `FUNDAMENTAL_METRICS_${symbol}`);
    
    // Remove all keys from cache
    cache.removeAll(keys);
    
    Logger.log(`Cleared fundamental metrics cache for ${keys.length} symbols`);
    return `Cleared fundamental metrics cache for ${keys.length} symbols`;
  } catch (error) {
    Logger.log(`Error clearing fundamental metrics cache: ${error}`);
    return `Error clearing fundamental metrics cache: ${error}`;
  }
}

/**
 * Clears the fundamental metrics cache for a specific symbol
 * @param {String} symbol - The stock/ETF symbol to clear cache for
 * @return {String} Status message
 */
function clearFundamentalMetricsCacheForSymbol(symbol) {
  try {
    if (!symbol) {
      throw new Error("Symbol is required");
    }
    
    const cache = CacheService.getScriptCache();
    const cacheKey = `FUNDAMENTAL_METRICS_${symbol}`;
    
    // Remove the key from cache
    cache.remove(cacheKey);
    
    Logger.log(`Cleared fundamental metrics cache for ${symbol}`);
    return `Cleared fundamental metrics cache for ${symbol}`;
  } catch (error) {
    Logger.log(`Error clearing fundamental metrics cache for ${symbol}: ${error}`);
    return `Error clearing fundamental metrics cache for ${symbol}: ${error}`;
  }
}

/**
 * Test function for fundamental metrics caching
 */
function testFundamentalMetricsCaching() {
  try {
    // Test symbol
    const symbol = "AAPL";
    
    // Clear the cache for the test symbol
    clearFundamentalMetricsCacheForSymbol(symbol);
    
    // First call - should be a cache miss
    Logger.log(`First call for ${symbol} (should be cache miss):`);
    const startTime1 = new Date().getTime();
    const metrics1 = fetchFundamentalMetricsData(symbol);
    const executionTime1 = (new Date().getTime() - startTime1) / 1000;
    
    Logger.log(`Execution time: ${executionTime1.toFixed(3)} seconds`);
    Logger.log(`From cache: ${metrics1.fromCache ? "Yes" : "No"}`);
    
    // Second call - should be a cache hit
    Logger.log(`\nSecond call for ${symbol} (should be cache hit):`);
    const startTime2 = new Date().getTime();
    const metrics2 = fetchFundamentalMetricsData(symbol);
    const executionTime2 = (new Date().getTime() - startTime2) / 1000;
    
    Logger.log(`Execution time: ${executionTime2.toFixed(3)} seconds`);
    Logger.log(`From cache: ${metrics2.fromCache ? "Yes" : "No"}`);
    
    // Calculate performance improvement
    const improvementPercent = ((executionTime1 - executionTime2) / executionTime1) * 100;
    
    Logger.log(`\nCaching Performance:`);
    Logger.log(`First call (fresh data): ${executionTime1.toFixed(3)} seconds`);
    Logger.log(`Second call (cached data): ${executionTime2.toFixed(3)} seconds`);
    Logger.log(`Performance improvement: ${improvementPercent.toFixed(1)}%`);
    
    return {
      status: "success",
      firstCallTime: executionTime1,
      secondCallTime: executionTime2,
      improvementPercent: improvementPercent
    };
  } catch (error) {
    Logger.log(`Error in testFundamentalMetricsCaching: ${error}`);
    return {
      status: "error",
      message: `Test failed: ${error}`
    };
  }
}

/**
 * Fetches the expense ratio for an ETF
 * @param {String} symbol - The ETF symbol
 * @return {Number|null} The expense ratio or null if not found
 */
function fetchExpenseRatio(symbol) {
  // Simple implementation that returns null
  // In a real implementation, this would fetch the expense ratio from an API
  // For now, we'll just return a default value for common ETFs
  const etfExpenseRatios = {
    'SPY': 0.0945,
    'QQQ': 0.20,
    'IWM': 0.19,
    'DIA': 0.16,
    'VTI': 0.03,
    'VOO': 0.03,
    'VEA': 0.05,
    'VWO': 0.08,
    'BND': 0.03,
    'AGG': 0.03,
    'GLD': 0.40
  };
  
  return etfExpenseRatios[symbol] || null;
}
