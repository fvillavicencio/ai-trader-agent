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
    const processedSymbols = new Set();
    for (const symbol of allSymbols) {
      if (processedSymbols.has(symbol)) continue; // Prevent duplicate fetches
      processedSymbols.add(symbol);
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
    
    // Check if we have any valid data
    const hasValidData = metrics.validSymbols.length > 0;
    
    return {
      success: hasValidData,
      message: hasValidData ? `Retrieved fundamental metrics for ${metrics.validSymbols.length} symbols` : 'No valid fundamental metrics data retrieved',
      error: !hasValidData ? `Failed to retrieve valid fundamental metrics for any symbols` : null,
      metrics: metrics,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    Logger.log(`Error in retrieveFundamentalMetrics: ${error}`);
    return {
      success: false,
      message: `Failed to retrieve fundamental metrics: ${error.message}`,
      error: error.message,
      metrics: {},
      timestamp: new Date().toISOString()
    };
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
  // Robustly handle missing, error, or non-numeric values
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    value === 'N/A' ||
    value === '#ERROR!' ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return 'N/A';
  }

  // Convert string to number if possible
  if (typeof value === 'string') {
    const parsedValue = parseFloat(value);
    if (!isNaN(parsedValue) && isFinite(parsedValue)) {
      value = parsedValue;
    } else {
      return 'N/A';
    }
  }

  // Only format if number is finite
  if (typeof value !== 'number' || !isFinite(value)) {
    return 'N/A';
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

    // Log response details for debugging
    Logger.log(`Yahoo Finance API Response for ${symbol}:`);
    Logger.log(`Status: ${response.getResponseCode()}`);
    Logger.log(`Response: ${JSON.stringify(data, null, 2)}`);

    // Cache the data for 1 hour
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(data), 3600);
    PropertiesService.getScriptProperties().setProperty(`yahoo_last_call_${symbol}`, new Date().toISOString());

    return data;
  } catch (error) {
    Logger.log(`Error in fetchYahooFinanceData for ${symbol}: ${error}`);
    Logger.log(`Error details: ${error.stack}`);
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
    const url = `https://api.tradier.com/v2/markets/quotes?symbols=${symbol}`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());

    // Log response details for debugging
    Logger.log(`Tradier API Response for ${symbol}:`);
    Logger.log(`Status: ${response.getResponseCode()}`);
    Logger.log(`Response: ${JSON.stringify(data, null, 2)}`);

    // Cache the data for 1 hour
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(data), 3600);

    return data;
  } catch (error) {
    Logger.log(`Error in fetchTradierData for ${symbol}: ${error}`);
    Logger.log(`Error details: ${error.stack}`);
    return null;
  }
}

// Commented out Google Finance API usage as per user request
// function fetchGoogleFinanceData(symbol) {
//   try {
//     const cacheKey = `google_${symbol}`;
//     const cachedData = CacheService.getScriptCache().get(cacheKey);
//     if (cachedData) {
//       Logger.log(`Using cached Google Finance data for ${symbol}`);
//       return JSON.parse(cachedData);
//     }
//     // Fetch data from Google Finance
//     const url = `https://finance.google.com/finance/info?client=ig&q=${symbol}`;
//     const options = {
//       method: 'GET',
//       headers: {},
//     };
//     const response = UrlFetchApp.fetch(url, options);
//     const data = JSON.parse(response.getContentText().replace(/\]/g, '').replace(/\[/g, ''));
//     Logger.log(`Google Finance API Response for ${symbol}:`);
//     Logger.log(`Status: ${response.getResponseCode()}`);
//     Logger.log(`Response: ${JSON.stringify(data, null, 2)}`);
//     CacheService.getScriptCache().put(cacheKey, JSON.stringify(data), 3600);
//     return data;
//   } catch (error) {
//     Logger.log(`Error in fetchGoogleFinanceData for ${symbol}: ${error}`);
//     Logger.log(`Error details: ${error.stack}`);
//     return null;
//   }
// }

/**
 * Test function to debug API calls
 * @param {String} symbol - The stock/ETF symbol to test
 */
function testApiCalls(symbol = 'AAPL') {
  try {
    Logger.log(`\n=== Testing API Calls for ${symbol} ===`);
    
    // Test Yahoo Finance
    Logger.log('\nTesting Yahoo Finance...');
    const yahooData = fetchYahooFinanceData(symbol);
    Logger.log('Yahoo Finance Response:', JSON.stringify(yahooData, null, 2));
    
    // Test Tradier
    Logger.log('\nTesting Tradier...');
    const tradierData = fetchTradierData(symbol);
    Logger.log('Tradier Response:', JSON.stringify(tradierData, null, 2));
    
    // Test Google Finance
    Logger.log('\nTesting Google Finance...');
    // const googleData = fetchGoogleFinanceData(symbol);
    // Logger.log('Google Finance Response:', JSON.stringify(googleData, null, 2));
    
    Logger.log('\n=== API Testing Complete ===');
  } catch (error) {
    Logger.log(`Error in testApiCalls: ${error}`);
    Logger.log(`Error details: ${error.stack}`);
  }
}

/**
 * Formats an individual stock card for HTML output (consistent rich formatting)
 * @param {Object} stock - The stock data object
 * @returns {String} HTML for the stock card
 */
function formatStockCard(stock) {
  if (!stock) return '';

  var symbol = stock.symbol || stock.ticker || 'N/A';
  var name = stock.name || stock.companyName || 'N/A';
  var price = (typeof stock.price === 'number' && isFinite(stock.price)) ? ('$' + stock.price.toFixed(2)) : (stock.price || 'N/A');
  var formattedPrice = (typeof price === 'string' && price.indexOf('$') === 0) ? price : ('$' + price);
  var priceChange = stock.priceChange || stock.change || '0%';
  var priceChangeValue = parseFloat((priceChange + '').replace('%', '').replace('+', ''));
  var priceChangeColor = priceChangeValue > 0 ? '#4caf50' : priceChangeValue < 0 ? '#f44336' : '#757575';
  var priceChangeArrow = priceChangeValue > 0 ? '▲' : priceChangeValue < 0 ? '▼' : '';
  var priceChangeFormatted = priceChangeValue > 0 ? ('+' + priceChange) : priceChange;
  var peRatio = stock.pe || stock.peRatio || 'N/A';
  var marketCap = stock.marketCap || 'N/A';
  var comment = stock.comment || stock.analysis || '';
  var source = stock.source || 'N/A';
  var sourceUrl = stock.sourceUrl || '#';
  var lastUpdated = stock.lastUpdated || 'N/A';

  // Format key price fields with $ and 2 decimals if number
  function fmt(val) {
    return (typeof val === 'number' && isFinite(val)) ? ('$' + val.toFixed(2)) : (val != null ? val : 'N/A');
  }

  return [
    '<div style="flex: 1; min-width: 250px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">',
    '  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border-bottom: 1px solid #e0e0e0; background-color: #f9f9ff;">',
    '    <div style="font-size: 18px; font-weight: 600; color: #5e35b1;">' + symbol + '</div>',
    '    <div style="font-size: 14px; color: #666; font-style: italic;">' + name + '</div>',
    '  </div>',
    '  <div style="padding: 15px; background-color: #f5f5f5;">',
    '    <div style="display: flex; justify-content: space-between; align-items: center;">',
    '      <div style="font-size: 22px; font-weight: bold;">' + formattedPrice + '</div>',
    '      <div style="display: flex; align-items: center;">',
    '        <span style="font-size: 14px; color: ' + priceChangeColor + '; margin-right: 4px;">' + priceChangeArrow + '</span>',
    '        <span style="font-size: 14px; color: ' + priceChangeColor + ';">' + priceChangeFormatted + '</span>',
    '      </div>',
    '    </div>',
    '  </div>',
    '  <div style="padding: 10px 15px;">',
    '    <div style="font-size: 14px; color: #333;">',
    '      <span style="margin-right: 16px;"><strong>P/E:</strong> ' + peRatio + '</span>',
    '      <span><strong>Market Cap:</strong> ' + marketCap + '</span>',
    '    </div>',
    '    <div style="margin-top: 8px; font-size: 13px;">',
    '      <div><strong>Volume</strong> <span style="float:right;">' + (stock.volume != null ? stock.volume.toLocaleString() : 'N/A') + '</span></div>',
    '      <div><strong>Open</strong> <span style="float:right;">' + fmt(stock.open) + '</span></div>',
    '      <div><strong>Previous Close</strong> <span style="float:right;">' + fmt(stock.previousClose) + '</span></div>',
    '      <div><strong>Day High</strong> <span style="float:right;">' + fmt(stock.dayHigh) + '</span></div>',
    '      <div><strong>Day Low</strong> <span style="float:right;">' + fmt(stock.dayLow) + '</span></div>',
    '      <div><strong>52W High</strong> <span style="float:right;">' + fmt(stock.high52Week) + '</span></div>',
    '      <div><strong>52W Low</strong> <span style="float:right;">' + fmt(stock.low52Week) + '</span></div>',
    '    </div>',
    comment ? '    <div style="margin-top: 8px; color: #5e35b1; font-size: 13px; font-style: italic;">' + comment + '</div>' : '',
    '  </div>',
    '  <div style="padding: 8px 15px 10px 15px; font-size: 12px; color: #888; background: #fafafa; border-top: 1px solid #e0e0e0;">',
    '    <span>Source: <a href="' + sourceUrl + '" style="color: #5e35b1; text-decoration: underline;">' + source + '</a></span>',
    '    <span style="float: right;">' + lastUpdated + '</span>',
    '  </div>',
    '</div>'
  ].join('\n');
}
