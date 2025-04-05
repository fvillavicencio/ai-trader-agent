/**
 * Fundamental Metrics Module
 * Handles calculation and analysis of fundamental metrics for stocks/ETFs
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
    
    // Get unique symbols from both lists
    const allSymbols = [...new Set([...symbols, ...defaultSymbols, ...mentionedStocks])];
    
    // Initialize metrics object
    const metrics = {
      metrics: {},
      validSymbols: [],
      deprecatedSymbols: []
    };
    
    // List of deprecated symbols
    const deprecatedSymbols = ['FB'];
    
    // Process each symbol
    for (const symbol of allSymbols) {
      try {
        // Mark deprecated symbols
        if (deprecatedSymbols.includes(symbol)) {
          metrics.deprecatedSymbols.push(symbol);
          metrics.metrics[symbol] = {
            symbol: symbol,
            isDeprecated: true,
            note: `This symbol has been deprecated and replaced by META. The data shown here may not reflect current market conditions.`,
            fromCache: false
          };
          continue;
        }
        
        // Get raw stock data from StockDataRetriever
        const stockData = retrieveStockMetrics(symbol);
        
        // Calculate and analyze metrics
        const symbolMetrics = {
          ...stockData,
          analysis: generateAnalysis(symbol, stockData),
          fromCache: stockData.fromCache
        };
        
        metrics.metrics[symbol] = symbolMetrics;
        metrics.validSymbols.push(symbol);
        
        // Log the metrics for debugging
        Logger.log(`Metrics object structure for ${symbol}:`);
        Logger.log(JSON.stringify(symbolMetrics, null, 2));
        
      } catch (error) {
        Logger.log(`Error retrieving metrics for ${symbol}: ${error}`);
        metrics.metrics[symbol] = {
          symbol: symbol,
          error: error.message,
          fromCache: false
        };
      }
    }
    
    // Calculate execution time
    const executionTime = (new Date().getTime() - startTime) / 1000;
    Logger.log(`Retrieved fundamental metrics for ${allSymbols.length} symbols in ${executionTime} seconds`);
    
    return metrics;
  } catch (error) {
    Logger.log(`Error in retrieveFundamentalMetrics: ${error}`);
    throw error;
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
 * Formats a value for display
 * @param {Number} value - The value to format
 * @param {Boolean} fixedDecimals - Whether to use a fixed number of decimals
 * @param {Number} decimals - Number of decimals to use if fixedDecimals is true
 * @return {String} Formatted value
 */
function formatValue(value, fixedDecimals = true, decimals = 2) {
  if (value === null || value === undefined || isNaN(value) || typeof value !== 'number') {
    // Try to convert to number if it's a string
    if (typeof value === 'string') {
      const parsedValue = parseFloat(value);
      if (!isNaN(parsedValue)) {
        value = parsedValue;
      } else {
        return "N/A";
      }
    } else {
      return "N/A";
    }
  }
  
  if (fixedDecimals) {
    return value.toFixed(decimals);
  }
  
  return value.toString();
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

/**
 * Fetches Yahoo Finance data for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Yahoo Finance data
 */
function fetchYahooFinanceData(symbol) {
  try {
    const cacheKey = `yahoo_${symbol}`;
    const cachedData = CacheService.getScriptCache().get(cacheKey);
    if (cachedData) {
      Logger.log(`Using cached Yahoo Finance data for ${symbol}`);
      return JSON.parse(cachedData);
    }

    // Implement rate limiting
    const lastCall = PropertiesService.getScriptProperties().getProperty(`yahoo_last_call_${symbol}`);
    if (lastCall) {
      const lastCallTime = new Date(lastCall).getTime();
      const currentTime = new Date().getTime();
      const timeSinceLastCall = (currentTime - lastCallTime) / 1000;
      
      if (timeSinceLastCall < 60) { // Wait 1 minute between calls
        Logger.log(`Waiting for rate limit on Yahoo Finance for ${symbol}`);
        Utilities.sleep((60 - timeSinceLastCall) * 1000);
      }
    }

    // Fetch data from Yahoo Finance
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price,defaultKeyStatistics,financialData`;
    const options = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());

    // Cache the data for 1 hour
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(data), 3600);
    PropertiesService.getScriptProperties().setProperty(`yahoo_last_call_${symbol}`, new Date().toISOString());

    return data;
  } catch (error) {
    Logger.log(`Error in fetchYahooFinanceData for ${symbol}: ${error}`);
    return null;
  }
}

/**
 * Fetches Tradier data for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Tradier data
 */
function fetchTradierData(symbol) {
  try {
    const cacheKey = `tradier_${symbol}`;
    const cachedData = CacheService.getScriptCache().get(cacheKey);
    if (cachedData) {
      Logger.log(`Using cached Tradier data for ${symbol}`);
      return JSON.parse(cachedData);
    }

    // Get Tradier API key
    const apiKey = PropertiesService.getScriptProperties().getProperty('TRADIER_API_KEY');
    if (!apiKey) {
      throw new Error('Tradier API key not found');
    }

    // Fetch data from Tradier
    const url = `https://api.tradier.com/v1/markets/quotes?symbols=${symbol}`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());

    // Cache the data for 1 hour
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(data), 3600);

    return data;
  } catch (error) {
    Logger.log(`Error in fetchTradierData for ${symbol}: ${error}`);
    return null;
  }
}

/**
 * Fetches Google Finance data for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Google Finance data
 */
function fetchGoogleFinanceData(symbol) {
  try {
    const cacheKey = `google_${symbol}`;
    const cachedData = CacheService.getScriptCache().get(cacheKey);
    if (cachedData) {
      Logger.log(`Using cached Google Finance data for ${symbol}`);
      return JSON.parse(cachedData);
    }

    // Fetch data from Google Finance
    const url = `https://finance.google.com/finance/info?client=ig&q=${symbol}`;
    const options = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText().replace(/\]/g, '').replace(/\[/g, ''));

    // Cache the data for 1 hour
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(data), 3600);

    return data;
  } catch (error) {
    Logger.log(`Error in fetchGoogleFinanceData for ${symbol}: ${error}`);
    return null;
  }
}
