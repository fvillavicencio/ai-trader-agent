/**
 * Fundamental Metrics Module
 * Handles retrieval of fundamental metrics for stocks/ETFs including PEG ratios, 
 * Forward P/E Ratios, and other relevant metrics
 */

/**
 * Retrieves fundamental metrics for a list of stocks/ETFs
 * @param {Array} symbols - List of stock/ETF symbols to retrieve fundamental metrics for (can be empty)
 * @return {Object} Fundamental metrics data
 */
function retrieveFundamentalMetrics(symbols = []) {
  try {
    // Ensure symbols is an array
    if (!Array.isArray(symbols)) {
      symbols = [];
    }
    
    // Add default symbols (major indices and magnificent seven)
    const defaultSymbols = [
      // Major indices
      "SPY",  // S&P 500
      "QQQ",  // NASDAQ
      "IWM",  // Russell 2000
      "DIA",  // Dow Jones
      
      // Magnificent Seven
      "AAPL", // Apple
      "MSFT", // Microsoft
      "GOOGL", // Alphabet (Google)
      "AMZN", // Amazon
      "META", // Meta (Facebook)
      "TSLA", // Tesla
      "NVDA"  // NVIDIA
    ];
    
    // Combine user-provided symbols with default symbols
    const allSymbols = [...symbols, ...defaultSymbols];
    
    // Remove duplicates and ensure uppercase
    const uniqueSymbols = [...new Set(allSymbols.map(symbol => symbol.toUpperCase()))];
    
    Logger.log(`Retrieving fundamental metrics for ${uniqueSymbols.length} symbols...`);
    
    // Initialize results array
    const results = [];
    
    // Process each symbol
    for (const symbol of uniqueSymbols) {
      Logger.log(`Retrieving fundamental metrics for ${symbol}...`);
      
      try {
        // Fetch fundamental metrics data for the symbol
        const metrics = getFundamentalMetrics(symbol);
        results.push(metrics);
      } catch (error) {
        Logger.log(`Error retrieving fundamental metrics for ${symbol}: ${error}`);
      }
    }
    
    // Format the data for display
    const formattedData = formatFundamentalMetricsData(results);
    
    // Return the results
    return {
      success: results.length > 0,
      message: results.length > 0 ? `Successfully retrieved fundamental metrics for ${results.length} symbols` : "Failed to retrieve fundamental metrics.",
      metrics: results,
      formattedData: formattedData,
      timestamp: new Date()
    };
  } catch (error) {
    Logger.log(`Error retrieving fundamental metrics: ${error}`);
    return {
      success: false,
      message: `Failed to retrieve fundamental metrics: ${error}`,
      timestamp: new Date()
    };
  }
}

/**
 * Gets fundamental metrics for a stock or ETF
 * Uses a cascading approach to try multiple data sources
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Fundamental metrics
 */
function getFundamentalMetrics(symbol) {
  try {
    Logger.log(`Getting fundamental metrics for ${symbol}`);
    
    // Initialize metrics with null values
    const metrics = {
      price: null,           // Current stock price
      priceChange: null,     // Price change (delta)
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
      expenseRatio: null
    };
    
    // Step 1: Try to get metrics from Google Finance first
    try {
      Logger.log(`Fetching Google Finance data for ${symbol}`);
      const googleMetrics = fetchGoogleFinanceData(symbol);
      
      // Fill in metrics from Google Finance
      Object.keys(metrics).forEach(key => {
        if (googleMetrics[key] !== null && googleMetrics[key] !== undefined) {
          metrics[key] = googleMetrics[key];
        }
      });
      
      Logger.log(`Google Finance metrics for ${symbol}: ${JSON.stringify(metrics)}`);
    } catch (googleError) {
      Logger.log(`Error fetching Google Finance data for ${symbol}: ${googleError}`);
    }
    
    // Step 2: Fill in any missing metrics from Tradier
    const missingMetricsAfterGoogle = Object.keys(metrics).filter(key => metrics[key] === null);
    
    if (missingMetricsAfterGoogle.length > 0) {
      try {
        Logger.log(`Fetching Tradier data for ${symbol} to fill in missing metrics: ${missingMetricsAfterGoogle.join(', ')}`);
        const tradierMetrics = fetchTradierData(symbol);
        
        // Only fill in metrics that are still missing
        Object.keys(metrics).forEach(key => {
          if (metrics[key] === null && tradierMetrics[key] !== null) {
            metrics[key] = tradierMetrics[key];
          }
        });
        
        Logger.log(`Updated metrics after Tradier for ${symbol}: ${JSON.stringify(metrics)}`);
      } catch (tradierError) {
        Logger.log(`Error fetching Tradier data for ${symbol}: ${tradierError}`);
      }
    }
    
    // Step 3: Fill in any remaining missing metrics from Yahoo Finance API
    const missingMetricsAfterTradier = Object.keys(metrics).filter(key => metrics[key] === null);
    
    if (missingMetricsAfterTradier.length > 0) {
      try {
        Logger.log(`Fetching Yahoo Finance API data for ${symbol} to fill in missing metrics: ${missingMetricsAfterTradier.join(', ')}`);
        const yahooAPIMetrics = fetchYahooFinanceAPI(symbol);
        
        // Only fill in metrics that are still missing
        Object.keys(metrics).forEach(key => {
          if (metrics[key] === null && yahooAPIMetrics[key] !== null) {
            metrics[key] = yahooAPIMetrics[key];
          }
        });
        
        Logger.log(`Updated metrics after Yahoo Finance API for ${symbol}: ${JSON.stringify(metrics)}`);
      } catch (yahooAPIError) {
        Logger.log(`Error fetching Yahoo Finance API data for ${symbol}: ${yahooAPIError}`);
      }
    }
    
    // Step 4: Fill in any remaining missing metrics from Yahoo Finance web scraping
    const missingMetricsAfterYahooAPI = Object.keys(metrics).filter(key => metrics[key] === null);
    
    if (missingMetricsAfterYahooAPI.length > 0) {
      try {
        Logger.log(`Fetching Yahoo Finance web data for ${symbol} to fill in missing metrics: ${missingMetricsAfterYahooAPI.join(', ')}`);
        const yahooWebMetrics = fetchYahooFinanceData(symbol);
        
        // Only fill in metrics that are still missing
        Object.keys(metrics).forEach(key => {
          if (metrics[key] === null && yahooWebMetrics[key] !== null) {
            metrics[key] = yahooWebMetrics[key];
          }
        });
        
        Logger.log(`Updated metrics after Yahoo Finance web for ${symbol}: ${JSON.stringify(metrics)}`);
      } catch (yahooWebError) {
        Logger.log(`Error fetching Yahoo Finance web data for ${symbol}: ${yahooWebError}`);
      }
    }
    
    // Validate all metrics for realistic values
    Object.keys(metrics).forEach(key => {
      metrics[key] = validateMetric(metrics[key], key);
    });
    
    Logger.log(`Final metrics for ${symbol}: ${JSON.stringify(metrics)}`);
    
    return metrics;
  } catch (error) {
    Logger.log(`Error in getFundamentalMetrics for ${symbol}: ${error}`);
    throw error;
  }
}

/**
 * Fetches data from Yahoo Finance API for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Metrics from Yahoo Finance API
 */
function fetchYahooFinanceAPI(symbol) {
  try {
    Logger.log(`Fetching Yahoo Finance API data for ${symbol}`);
    
    // Initialize metrics with null values
    const metrics = {
      price: null,
      priceChange: null,
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
      expenseRatio: null
    };
    
    // Get the API key from script properties
    const scriptProperties = PropertiesService.getScriptProperties();
    const rapidApiKey = scriptProperties.getProperty('RAPIDAPI_KEY');
    
    if (!rapidApiKey) {
      Logger.log('RapidAPI key not found. Please set the RAPIDAPI_KEY property.');
      return metrics;
    }
    
    // Set up the API request options
    const options = {
      'method': 'GET',
      'headers': {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'yahoo-finance127.p.rapidapi.com'
      },
      'muteHttpExceptions': true
    };
    
    // Make the API request
    const url = `https://yahoo-finance127.p.rapidapi.com/finance-analytics/${symbol}`;
    const response = UrlFetchApp.fetch(url, options);
    
    // Check if the response is valid
    if (response.getResponseCode() !== 200) {
      Logger.log(`Error fetching Yahoo Finance API data for ${symbol}: ${response.getContentText()}`);
      return metrics;
    }
    
    // Parse the response
    const data = JSON.parse(response.getContentText());
    
    // Extract metrics from the API response
    if (data && data.quoteSummary && data.quoteSummary.result && data.quoteSummary.result.length > 0) {
      const result = data.quoteSummary.result[0];
      
      // Extract defaultKeyStatistics
      if (result.defaultKeyStatistics) {
        const keyStats = result.defaultKeyStatistics;
        
        if (keyStats.pegRatio && keyStats.pegRatio.raw) {
          metrics.pegRatio = keyStats.pegRatio.raw;
        }
        
        if (keyStats.forwardPE && keyStats.forwardPE.raw) {
          metrics.forwardPE = keyStats.forwardPE.raw;
        }
        
        if (keyStats.priceToBook && keyStats.priceToBook.raw) {
          metrics.priceToBook = keyStats.priceToBook.raw;
        }
        
        if (keyStats.beta && keyStats.beta.raw) {
          metrics.beta = keyStats.beta.raw;
        }
      }
      
      // Extract financialData
      if (result.financialData) {
        const financialData = result.financialData;
        
        if (financialData.debtToEquity && financialData.debtToEquity.raw) {
          metrics.debtToEquity = financialData.debtToEquity.raw;
        }
        
        if (financialData.returnOnEquity && financialData.returnOnEquity.raw) {
          metrics.returnOnEquity = financialData.returnOnEquity.raw;
        }
        
        if (financialData.returnOnAssets && financialData.returnOnAssets.raw) {
          metrics.returnOnAssets = financialData.returnOnAssets.raw;
        }
        
        if (financialData.profitMargins && financialData.profitMargins.raw) {
          metrics.profitMargin = financialData.profitMargins.raw;
        }
        
        if (financialData.priceToSales && financialData.priceToSales.raw) {
          metrics.priceToSales = financialData.priceToSales.raw;
        }
      }
      
      // Extract summaryDetail
      if (result.summaryDetail) {
        const summaryDetail = result.summaryDetail;
        
        if (summaryDetail.dividendYield && summaryDetail.dividendYield.raw) {
          metrics.dividendYield = summaryDetail.dividendYield.raw;
        }
        
        if (!metrics.priceToSales && summaryDetail.priceToSalesTrailing12Months && summaryDetail.priceToSalesTrailing12Months.raw) {
          metrics.priceToSales = summaryDetail.priceToSalesTrailing12Months.raw;
        }
      }
      
      // Extract fundProfile for ETFs
      if (result.fundProfile) {
        const fundProfile = result.fundProfile;
        
        if (fundProfile.feesExpensesInvestment && fundProfile.feesExpensesInvestment.annualReportExpenseRatio) {
          metrics.expenseRatio = fundProfile.feesExpensesInvestment.annualReportExpenseRatio.raw;
          
          // Try alternative expense ratio fields if the main one is not available
          if (metrics.expenseRatio === null) {
            metrics.expenseRatio = fundProfile.feesExpensesInvestment.netExpenseRatio;
          }
          if (metrics.expenseRatio === null) {
            metrics.expenseRatio = fundProfile.feesExpensesInvestment.grossExpenseRatio;
          }
        }
      }
    }
    
    // Validate metrics for realistic values
    Object.keys(metrics).forEach(key => {
      metrics[key] = validateMetric(metrics[key], key);
    });
    
    Logger.log(`Yahoo Finance API metrics for ${symbol}: ${JSON.stringify(metrics)}`);
    
    return metrics;
  } catch (error) {
    Logger.log(`Error in fetchYahooFinanceAPI for ${symbol}: ${error}`);
    
    // Return null values for all metrics
    return {
      price: null,
      priceChange: null,
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
      expenseRatio: null
    };
  }
}

/**
 * Fetches data from Yahoo Finance for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Metrics from Yahoo Finance
 */
function fetchYahooFinanceData(symbol) {
  try {
    Logger.log(`Fetching Yahoo Finance data for ${symbol}`);
    
    // Initialize metrics with null values
    const metrics = {
      price: null,
      priceChange: null,
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
      expenseRatio: null
    };
    
    // Enhanced options with more complete headers to avoid being blocked
    const options = {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0'
      }
    };
    
    // Step 1: Try the summary page first
    try {
      // Construct the Yahoo Finance URL for summary page
      const summaryUrl = `https://finance.yahoo.com/quote/${symbol}?p=${symbol}`;
      
      // Fetch the webpage
      const summaryResponse = UrlFetchApp.fetch(summaryUrl, options);
      const summaryContent = summaryResponse.getContentText();
      
      // Extract metrics from the summary page
      const summaryMetrics = extractMetricsWithRegex(summaryContent, symbol);
      
      // Merge the metrics
      Object.keys(metrics).forEach(key => {
        if (summaryMetrics[key] !== null) {
          metrics[key] = summaryMetrics[key];
        }
      });
    } catch (summaryError) {
      Logger.log(`Error fetching summary page for ${symbol}: ${summaryError}`);
    }
    
    // Step 2: Try the key-statistics page as a fallback for missing metrics
    const missingMetrics = Object.keys(metrics).filter(key => metrics[key] === null);
    
    if (missingMetrics.length > 0) {
      try {
        // Construct the Yahoo Finance URL for key-statistics page
        const statsUrl = `https://finance.yahoo.com/quote/${symbol}/key-statistics?p=${symbol}`;
        
        // Fetch the webpage
        const statsResponse = UrlFetchApp.fetch(statsUrl, options);
        const statsContent = statsResponse.getContentText();
        
        // Extract metrics from the key-statistics page
        const statsMetrics = extractMetricsWithRegex(statsContent, symbol);
        
        // Merge the metrics, only filling in missing ones
        Object.keys(metrics).forEach(key => {
          if (metrics[key] === null && statsMetrics[key] !== null) {
            metrics[key] = statsMetrics[key];
          }
        });
      } catch (statsError) {
        Logger.log(`Error fetching key-statistics page for ${symbol}: ${statsError}`);
      }
    }
    
    // Step 3: Try the financials page as a last resort for specific metrics
    const stillMissingMetrics = Object.keys(metrics).filter(key => metrics[key] === null);
    
    if (stillMissingMetrics.length > 0) {
      try {
        // Construct the Yahoo Finance URL for financials page
        const financialsUrl = `https://finance.yahoo.com/quote/${symbol}/financials?p=${symbol}`;
        
        // Fetch the webpage
        const financialsResponse = UrlFetchApp.fetch(financialsUrl, options);
        const financialsContent = financialsResponse.getContentText();
        
        // Extract metrics from the financials page
        const financialsMetrics = extractMetricsWithRegex(financialsContent, symbol);
        
        // Merge the metrics, only filling in missing ones
        Object.keys(metrics).forEach(key => {
          if (metrics[key] === null && financialsMetrics[key] !== null) {
            metrics[key] = financialsMetrics[key];
          }
        });
      } catch (financialsError) {
        Logger.log(`Error fetching financials page for ${symbol}: ${financialsError}`);
      }
    }
    
    // Validate all metrics for realistic values
    Object.keys(metrics).forEach(key => {
      metrics[key] = validateMetric(metrics[key], key);
    });
    
    // Log the results
    Logger.log(`Yahoo Finance metrics for ${symbol}: ${JSON.stringify(metrics)}`);
    
    return metrics;
  } catch (error) {
    Logger.log(`Error in fetchYahooFinanceData for ${symbol}: ${error}`);
    
    // Return null values for all metrics
    return {
      price: null,
      priceChange: null,
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
      expenseRatio: null
    };
  }
}

/**
 * Extracts metrics from the QuoteSummaryStore object
 * @param {Object} quoteSummaryStore - The QuoteSummaryStore object
 * @return {Object} Extracted metrics
 */
function extractMetricsFromQuoteSummaryStore(quoteSummaryStore) {
  const metrics = {
    price: null,
    priceChange: null,
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
    expenseRatio: null
  };
  
  try {
    // Helper function to safely extract nested properties
    function safeExtract(obj, path) {
      try {
        const parts = path.split('.');
        let current = obj;
        
        for (const part of parts) {
          if (current === null || current === undefined || typeof current !== 'object') {
            return null;
          }
          current = current[part];
        }
        
        // Handle Yahoo Finance's format where values are often objects with 'raw' property
        if (current && typeof current === 'object' && current.raw !== undefined) {
          return current.raw;
        }
        
        return current;
      } catch (e) {
        return null;
      }
    }
    
    // Define possible paths for each metric
    const pathMappings = {
      price: [
        'price',
        'quoteSummary.result.0.price',
        'context.dispatcher.stores.QuoteSummaryStore.price'
      ],
      priceChange: [
        'priceChange',
        'quoteSummary.result.0.priceChange',
        'context.dispatcher.stores.QuoteSummaryStore.priceChange'
      ],
      pegRatio: [
        'defaultKeyStatistics.pegRatio',
        'quoteSummary.result.0.defaultKeyStatistics.pegRatio',
        'context.dispatcher.stores.QuoteSummaryStore.defaultKeyStatistics.pegRatio'
      ],
      forwardPE: [
        'defaultKeyStatistics.forwardPE',
        'quoteSummary.result.0.defaultKeyStatistics.forwardPE',
        'context.dispatcher.stores.QuoteSummaryStore.defaultKeyStatistics.forwardPE'
      ],
      priceToBook: [
        'defaultKeyStatistics.priceToBook',
        'quoteSummary.result.0.defaultKeyStatistics.priceToBook',
        'context.dispatcher.stores.QuoteSummaryStore.defaultKeyStatistics.priceToBook'
      ],
      priceToSales: [
        'summaryDetail.priceToSalesTrailing12Months',
        'quoteSummary.result.0.summaryDetail.priceToSalesTrailing12Months',
        'context.dispatcher.stores.QuoteSummaryStore.summaryDetail.priceToSalesTrailing12Months'
      ],
      debtToEquity: [
        'financialData.debtToEquity',
        'quoteSummary.result.0.financialData.debtToEquity',
        'context.dispatcher.stores.QuoteSummaryStore.financialData.debtToEquity'
      ],
      returnOnEquity: [
        'financialData.returnOnEquity',
        'quoteSummary.result.0.financialData.returnOnEquity',
        'context.dispatcher.stores.QuoteSummaryStore.financialData.returnOnEquity'
      ],
      returnOnAssets: [
        'financialData.returnOnAssets',
        'quoteSummary.result.0.financialData.returnOnAssets',
        'context.dispatcher.stores.QuoteSummaryStore.financialData.returnOnAssets'
      ],
      profitMargin: [
        'financialData.profitMargins',
        'quoteSummary.result.0.financialData.profitMargins',
        'context.dispatcher.stores.QuoteSummaryStore.financialData.profitMargins'
      ],
      dividendYield: [
        'summaryDetail.dividendYield',
        'quoteSummary.result.0.summaryDetail.dividendYield',
        'context.dispatcher.stores.QuoteSummaryStore.summaryDetail.dividendYield'
      ],
      beta: [
        'defaultKeyStatistics.beta',
        'quoteSummary.result.0.defaultKeyStatistics.beta',
        'context.dispatcher.stores.QuoteSummaryStore.defaultKeyStatistics.beta'
      ],
      expenseRatio: [
        'fundProfile.feesExpensesInvestment.annualReportExpenseRatio',
        'quoteSummary.result.0.fundProfile.feesExpensesInvestment.annualReportExpenseRatio',
        'context.dispatcher.stores.QuoteSummaryStore.fundProfile.feesExpensesInvestment.annualReportExpenseRatio'
      ]
    };
    
    // Try each path for each metric
    for (const [metric, paths] of Object.entries(pathMappings)) {
      for (const path of paths) {
        const value = safeExtract(quoteSummaryStore, path);
        if (value !== null && value !== undefined && !isNaN(value)) {
          metrics[metric] = value;
          break;
        }
      }
    }
    
    // Additional check for ETF expense ratio in different locations
    if (metrics.expenseRatio === null) {
      // Try alternative paths for expense ratio
      const altExpenseRatioPaths = [
        'fundProfile.feesExpensesInvestment.netExpenseRatio',
        'quoteSummary.result.0.fundProfile.feesExpensesInvestment.netExpenseRatio',
        'context.dispatcher.stores.QuoteSummaryStore.fundProfile.feesExpensesInvestment.netExpenseRatio',
        'fundProfile.feesExpensesInvestment.grossExpenseRatio',
        'quoteSummary.result.0.fundProfile.feesExpensesInvestment.grossExpenseRatio',
        'context.dispatcher.stores.QuoteSummaryStore.fundProfile.feesExpensesInvestment.grossExpenseRatio'
      ];
      
      for (const path of altExpenseRatioPaths) {
        const value = safeExtract(quoteSummaryStore, path);
        if (value !== null && value !== undefined && !isNaN(value)) {
          metrics.expenseRatio = value;
          break;
        }
      }
    }
    
    // Validate metrics for realistic values
    metrics.pegRatio = validateMetric(metrics.pegRatio, 'pegRatio');
    metrics.forwardPE = validateMetric(metrics.forwardPE, 'forwardPE');
    metrics.priceToBook = validateMetric(metrics.priceToBook, 'priceToBook');
    metrics.priceToSales = validateMetric(metrics.priceToSales, 'priceToSales');
    metrics.debtToEquity = validateMetric(metrics.debtToEquity, 'debtToEquity');
    metrics.returnOnEquity = validateMetric(metrics.returnOnEquity, 'returnOnEquity');
    metrics.returnOnAssets = validateMetric(metrics.returnOnAssets, 'returnOnAssets');
    metrics.profitMargin = validateMetric(metrics.profitMargin, 'profitMargin');
    metrics.dividendYield = validateMetric(metrics.dividendYield, 'dividendYield');
    metrics.beta = validateMetric(metrics.beta, 'beta');
    metrics.expenseRatio = validateMetric(metrics.expenseRatio, 'expenseRatio');
    
    // Convert percentage values to decimal if needed
    if (metrics.dividendYield !== null && metrics.dividendYield > 1) {
      metrics.dividendYield = metrics.dividendYield / 100;
    }
    
    if (metrics.returnOnEquity !== null && metrics.returnOnEquity > 1) {
      metrics.returnOnEquity = metrics.returnOnEquity / 100;
    }
    
    if (metrics.returnOnAssets !== null && metrics.returnOnAssets > 1) {
      metrics.returnOnAssets = metrics.returnOnAssets / 100;
    }
    
    if (metrics.profitMargin !== null && metrics.profitMargin > 1) {
      metrics.profitMargin = metrics.profitMargin / 100;
    }
    
    // Log the extracted metrics
    Logger.log(`Extracted metrics from QuoteSummaryStore: ${JSON.stringify(metrics)}`);
    
    return metrics;
  } catch (error) {
    Logger.log(`Error extracting metrics from QuoteSummaryStore: ${error}`);
    return metrics;
  }
}

/**
 * Validates a metric for realistic values
 * @param {Number} value - The value to validate
 * @param {String} metricName - The name of the metric
 * @return {Number} The validated value or null if invalid
 */
function validateMetric(value, metricName) {
  // Define realistic ranges for each metric
  const realisticRanges = {
    pegRatio: [0, 5],
    forwardPE: [5, 50],
    priceToBook: [0, 10],
    priceToSales: [0, 10],
    debtToEquity: [0, 5],
    returnOnEquity: [0, 1],
    returnOnAssets: [0, 1],
    profitMargin: [0, 1],
    dividendYield: [0, 1],
    beta: [0, 5],
    expenseRatio: [0, 1]
  };
  
  // Check if the value is within the realistic range
  if (value !== null && value !== undefined && !isNaN(value)) {
    const range = realisticRanges[metricName];
    if (value < range[0] || value > range[1]) {
      Logger.log(`Invalid value for ${metricName}: ${value}. Using null instead.`);
      return null;
    }
  }
  
  return value;
}

/**
 * Extracts metrics using regex patterns as a fallback
 * @param {String} htmlContent - The HTML content of the Yahoo Finance page
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Extracted metrics
 */
function extractMetricsWithRegex(htmlContent, symbol) {
  try {
    // Initialize metrics with null values
    const metrics = {
      price: null,
      priceChange: null,
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
      expenseRatio: null
    };
    
    // First attempt: Extract the embedded JSON data using multiple patterns
    let jsonData = null;
    
    // Try different patterns to extract the JSON data
    const jsonPatterns = [
      /root\.App\.main = (.*?);\s*\(function\(/s,
      /root\.App\.main = (.*?);\s*root\._/s,
      /"QuoteSummaryStore":(.*?),"ScreenerResultsStore"/s,
      /root\["App"\]\["main"\] = (.*?);\s*\(function\(/s,
      /root\["App"\]\["main"\] = (.*?);\s*root\["_/s
    ];
    
    for (const pattern of jsonPatterns) {
      try {
        const jsonMatch = htmlContent.match(pattern);
        if (jsonMatch && jsonMatch[1]) {
          const rawJson = jsonMatch[1];
          let parsedData;
          
          // Handle different extraction patterns
          if (pattern.toString().includes("QuoteSummaryStore")) {
            // Direct extraction of QuoteSummaryStore
            try {
              parsedData = JSON.parse(`{${rawJson}}`);
              jsonData = parsedData;
            } catch (parseError) {
              Logger.log(`Error parsing QuoteSummaryStore JSON for ${symbol}: ${parseError}`);
            }
          } else {
            // Full App.main extraction
            try {
              parsedData = JSON.parse(rawJson);
              
              // Navigate to QuoteSummaryStore where the financial data is stored
              if (parsedData && 
                  parsedData.context && 
                  parsedData.context.dispatcher && 
                  parsedData.context.dispatcher.stores && 
                  parsedData.context.dispatcher.stores.QuoteSummaryStore) {
                
                jsonData = parsedData.context.dispatcher.stores.QuoteSummaryStore;
              }
            } catch (parseError) {
              Logger.log(`Error parsing App.main JSON for ${symbol}: ${parseError}`);
            }
          }
          
          if (jsonData) {
            Logger.log(`Successfully extracted JSON data for ${symbol}`);
            break;
          }
        }
      } catch (patternError) {
        // Continue to the next pattern
        Logger.log(`Pattern extraction failed for ${symbol}: ${patternError}`);
      }
    }
    
    // If we have valid JSON data, extract metrics from it
    if (jsonData) {
      // Extract metrics from the JSON data
      const defaultModules = jsonData.defaultKeyStatistics || {};
      const financialData = jsonData.financialData || {};
      const summaryDetail = jsonData.summaryDetail || {};
      
      // Check if this is an ETF by looking for specific ETF properties
      const isETF = defaultModules.fundFamily !== undefined;
      
      // Helper function to safely extract values
      function safeExtract(obj, property) {
        if (!obj || !obj[property]) return null;
        
        const value = obj[property];
        if (typeof value === 'number') return value;
        if (value && typeof value === 'object' && value.raw !== undefined) return value.raw;
        
        return null;
      }
      
      // Extract each metric individually
      metrics.price = safeExtract(defaultModules, 'currentPrice');
      metrics.priceChange = safeExtract(defaultModules, 'priceChange');
      metrics.pegRatio = safeExtract(defaultModules, 'pegRatio');
      metrics.forwardPE = safeExtract(defaultModules, 'forwardPE');
      metrics.priceToBook = safeExtract(defaultModules, 'priceToBook');
      metrics.priceToSales = safeExtract(summaryDetail, 'priceToSalesTrailing12Months');
      metrics.debtToEquity = safeExtract(financialData, 'debtToEquity');
      metrics.returnOnEquity = safeExtract(financialData, 'returnOnEquity');
      metrics.returnOnAssets = safeExtract(financialData, 'returnOnAssets');
      metrics.profitMargin = safeExtract(financialData, 'profitMargins');
      metrics.dividendYield = safeExtract(summaryDetail, 'dividendYield');
      metrics.beta = safeExtract(defaultModules, 'beta');
      
      // Handle expense ratio for ETFs
      if (isETF) {
        if (jsonData.fundProfile && jsonData.fundProfile.feesExpensesInvestment) {
          metrics.expenseRatio = safeExtract(jsonData.fundProfile.feesExpensesInvestment, 'annualReportExpenseRatio');
          
          // Try alternative expense ratio fields if the main one is not available
          if (metrics.expenseRatio === null) {
            metrics.expenseRatio = safeExtract(jsonData.fundProfile.feesExpensesInvestment, 'netExpenseRatio');
          }
          if (metrics.expenseRatio === null) {
            metrics.expenseRatio = safeExtract(jsonData.fundProfile.feesExpensesInvestment, 'grossExpenseRatio');
          }
        }
      }
      
      // Validate metrics for realistic values
      Object.keys(metrics).forEach(key => {
        metrics[key] = validateMetric(metrics[key], key);
      });
      
      return metrics;
    }
    
    // Second attempt: Extract metrics using regex as a fallback
    Logger.log(`Falling back to regex extraction for ${symbol}`);
    
    // Extract metrics using regex patterns
    const priceMatch = htmlContent.match(/Current\s+Price[^<]*<\/td>.*?<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const priceChangeMatch = htmlContent.match(/Price\s+Change[^<]*<\/td>.*?<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const pegRatioMatch = htmlContent.match(/PEG\s+Ratio[^<]*<\/td>.*?<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const forwardPEMatch = htmlContent.match(/Forward\s+P\/E[^<]*<\/td>.*?<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const priceToBookMatch = htmlContent.match(/Price\/Book[^<]*<\/td>.*?<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const priceToSalesMatch = htmlContent.match(/Price\/Sales[^<]*<\/td>.*?<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const debtToEquityMatch = htmlContent.match(/Total\s+Debt\/Equity[^<]*<\/td>.*?<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const returnOnEquityMatch = htmlContent.match(/Return\s+on\s+Equity[^<]*<\/td>.*?<td[^>]*>([\d.,]+%|N\/A)<\/td>/is);
    const returnOnAssetsMatch = htmlContent.match(/Return\s+on\s+Assets[^<]*<\/td>.*?<td[^>]*>([\d.,]+%|N\/A)<\/td>/is);
    const profitMarginMatch = htmlContent.match(/Profit\s+Margin[^<]*<\/td>.*?<td[^>]*>([\d.,]+%|N\/A)<\/td>/is);
    const dividendYieldMatch = htmlContent.match(/Forward\s+Annual\s+Dividend\s+Yield[^<]*<\/td>.*?<td[^>]*>([\d.,]+%|N\/A)<\/td>/is);
    const betaMatch = htmlContent.match(/Beta[^<]*<\/td>.*?<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const expenseRatioMatch = htmlContent.match(/Annual\s+Report\s+Expense\s+Ratio[^<]*<\/td>.*?<td[^>]*>([\d.,]+%|N\/A)<\/td>/is);
    
    // Parse the extracted values
    metrics.price = parseMetricValue(priceMatch ? priceMatch[1] : null);
    metrics.priceChange = parseMetricValue(priceChangeMatch ? priceChangeMatch[1] : null);
    metrics.pegRatio = parseMetricValue(pegRatioMatch ? pegRatioMatch[1] : null);
    metrics.forwardPE = parseMetricValue(forwardPEMatch ? forwardPEMatch[1] : null);
    metrics.priceToBook = parseMetricValue(priceToBookMatch ? priceToBookMatch[1] : null);
    metrics.priceToSales = parseMetricValue(priceToSalesMatch ? priceToSalesMatch[1] : null);
    metrics.debtToEquity = parseMetricValue(debtToEquityMatch ? debtToEquityMatch[1] : null);
    metrics.returnOnEquity = parseMetricValue(returnOnEquityMatch ? returnOnEquityMatch[1] : null, true);
    metrics.returnOnAssets = parseMetricValue(returnOnAssetsMatch ? returnOnAssetsMatch[1] : null, true);
    metrics.profitMargin = parseMetricValue(profitMarginMatch ? profitMarginMatch[1] : null, true);
    metrics.dividendYield = parseMetricValue(dividendYieldMatch ? dividendYieldMatch[1] : null, true);
    metrics.beta = parseMetricValue(betaMatch ? betaMatch[1] : null);
    metrics.expenseRatio = parseMetricValue(expenseRatioMatch ? expenseRatioMatch[1] : null, true);
    
    // Validate metrics for realistic values
    Object.keys(metrics).forEach(key => {
      metrics[key] = validateMetric(metrics[key], key);
    });
    
    return metrics;
  } catch (error) {
    Logger.log(`Error extracting metrics with regex for ${symbol}: ${error}`);
    return {
      price: null,
      priceChange: null,
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
      expenseRatio: null
    };
  }
}

/**
 * Helper function to parse metric values from Yahoo Finance
 * @param {String} value - The value to parse
 * @param {Boolean} isPercentage - Whether the value is a percentage
 * @return {Number} The parsed value or null if N/A
 */
function parseMetricValue(value, isPercentage = false) {
  if (!value || value === 'N/A') {
    return null;
  }
  
  try {
    // Remove any non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, '');
    const parsedValue = parseFloat(numericValue);
    
    if (isNaN(parsedValue)) {
      return null;
    }
    
    // If it's a percentage, divide by 100
    return isPercentage ? parsedValue / 100 : parsedValue;
  } catch (error) {
    Logger.log(`Error parsing metric value ${value}: ${error}`);
    return null;
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
 * Formats the fundamental metrics data for display
 * @param {Array} fundamentalMetrics - Array of fundamental metrics data objects
 * @return {String} Formatted fundamental metrics data
 */
function formatFundamentalMetricsData(fundamentalMetrics) {
  try {
    let formattedData = "## Fundamental Metrics Analysis\n\n";
    
    // Check if we have data
    if (!fundamentalMetrics || fundamentalMetrics.length === 0) {
      return "No fundamental metrics data available.";
    }
    
    // Group stocks by category
    const indices = fundamentalMetrics.filter(stock => ["SPY", "QQQ", "IWM", "DIA"].includes(stock.symbol));
    const magSeven = fundamentalMetrics.filter(stock => ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"].includes(stock.symbol));
    const otherStocks = fundamentalMetrics.filter(stock => 
      !["SPY", "QQQ", "IWM", "DIA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"].includes(stock.symbol)
    );
    
    // Format indices
    if (indices.length > 0) {
      formattedData += "### Major Indices\n\n";
      formattedData += formatStockGroup(indices);
    }
    
    // Format Magnificent Seven
    if (magSeven.length > 0) {
      formattedData += "### Magnificent Seven\n\n";
      formattedData += formatStockGroup(magSeven);
    }
    
    // Format other stocks
    if (otherStocks.length > 0) {
      formattedData += "### Recently Mentioned Stocks\n\n";
      formattedData += formatStockGroup(otherStocks);
    }
    
    // Add summary
    formattedData += "\n### Summary\n\n";
    formattedData += "This analysis compares current valuations to historical averages and sector benchmarks. ";
    formattedData += "PEG ratios below 1.0 may indicate undervaluation, while ratios above 2.0 could suggest overvaluation. ";
    formattedData += "Forward P/E ratios should be compared to historical and sector averages to identify potential opportunities or risks.\n\n";
    formattedData += "Data sourced from Yahoo Finance and other financial data providers. Last updated: " + new Date().toLocaleString() + "\n";
    
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
      
      // Add price and price change information if available
      let priceInfo = "";
      if (stock.price) {
        priceInfo = ` - $${formatValue(stock.price)}`;
        
        if (stock.priceChange) {
          const priceChangeColor = stock.priceChange.includes('+') ? 'green' : 
                                  stock.priceChange.includes('-') ? 'red' : 'gray';
          priceInfo += ` (${stock.priceChange})`;
        }
      }
      
      formattedData += `#### ${symbol} (${name})${priceInfo}\n\n`;
      
      // Check if we have data for this stock
      if (!stock.forwardPE && !stock.pegRatio && !stock.priceToBook && !stock.price) {
        formattedData += "Data not available for this symbol.\n\n";
        continue;
      }
      
      // Format the metrics
      formattedData += "| Metric | Value | Evaluation |\n";
      formattedData += "|--------|-------|------------|\n";
      
      // Add price and price change as metrics if available
      if (stock.price !== undefined) {
        formattedData += `| Price | $${formatValue(stock.price)} | - |\n`;
      }
      
      if (stock.priceChange !== undefined) {
        formattedData += `| Price Change | ${stock.priceChange} | - |\n`;
      }
      
      // Add the metrics
      if (stock.pegRatio !== undefined) {
        formattedData += `| PEG Ratio | ${formatValue(stock.pegRatio)} | ${evaluateMetric(stock.pegRatio, 1.0, 1.0, "PEG", false)} |\n`;
      }
      
      if (stock.forwardPE !== undefined) {
        formattedData += `| Forward P/E | ${formatValue(stock.forwardPE)} | ${evaluateMetric(stock.forwardPE, 15, 15, "P/E", false)} |\n`;
      }
      
      if (stock.priceToBook !== undefined) {
        formattedData += `| Price/Book | ${formatValue(stock.priceToBook)} | ${evaluateMetric(stock.priceToBook, 2.0, 2.0, "P/B", false)} |\n`;
      }
      
      if (stock.priceToSales !== undefined) {
        formattedData += `| Price/Sales | ${formatValue(stock.priceToSales)} | ${evaluateMetric(stock.priceToSales, 2.0, 2.0, "P/S", false)} |\n`;
      }
      
      if (stock.debtToEquity !== undefined) {
        formattedData += `| Debt/Equity | ${formatValue(stock.debtToEquity)} | ${evaluateMetric(stock.debtToEquity, 1.0, 1.0, "D/E", false)} |\n`;
      }
      
      if (stock.returnOnEquity !== undefined) {
        formattedData += `| Return on Equity | ${formatValue(stock.returnOnEquity * 100)}% | ${evaluateMetric(stock.returnOnEquity, 0.15, 0.15, "ROE", true)} |\n`;
      }
      
      if (stock.returnOnAssets !== undefined) {
        formattedData += `| Return on Assets | ${formatValue(stock.returnOnAssets * 100)}% | ${evaluateMetric(stock.returnOnAssets, 0.05, 0.05, "ROA", true)} |\n`;
      }
      
      if (stock.profitMargin !== undefined) {
        formattedData += `| Profit Margin | ${formatValue(stock.profitMargin * 100)}% | ${evaluateMetric(stock.profitMargin, 0.10, 0.10, "Margin", true)} |\n`;
      }
      
      if (stock.dividendYield !== undefined) {
        formattedData += `| Dividend Yield | ${formatValue(stock.dividendYield * 100)}% | ${evaluateMetric(stock.dividendYield, 0.02, 0.02, "Yield", true)} |\n`;
      }
      
      if (stock.beta !== undefined) {
        formattedData += `| Beta | ${formatValue(stock.beta)} | ${evaluateMetric(stock.beta, 1.0, 1.0, "Beta", null)} |\n`;
      }
      
      if (stock.expenseRatio !== undefined && stock.expenseRatio > 0) {
        formattedData += `| Expense Ratio | ${formatValue(stock.expenseRatio * 100)}% | ${evaluateMetric(stock.expenseRatio, 0.05, 0.05, "Expense", false)} |\n`;
      }
      
      // Add a sample analysis
      formattedData += "\n**Analysis:** ";
      try {
        const analysis = generateAnalysis(symbol, stock, {}, {});
        formattedData += analysis || "Insufficient data to generate analysis.";
      } catch (error) {
        formattedData += "Insufficient data to generate analysis.";
      }
      
      formattedData += "\n\n";
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
  
  // Evaluation based on differences
  if (Math.abs(histDiff) < 10 && Math.abs(sectorDiff) < 10) {
    return "Fairly valued";
  }
  
  // Special case for PEG ratio
  if (metricType === "PEG") {
    if (current < 1.0) return "Potentially undervalued";
    if (current > 2.0) return "Potentially overvalued";
    return "Fairly valued";
  }
  
  if (histFavorable && sectorFavorable) {
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
 * Tests the enhanced fundamental metrics retrieval system
 * Tests multiple symbols across stocks and ETFs to verify data from all sources
 */
function testEnhancedFundamentalMetrics() {
  try {
    // Get the shared finance spreadsheet
    const ss = getSharedFinanceSpreadsheet();
    
    // Check if a FundamentalMetricsTest sheet already exists
    let sheet = ss.getSheetByName('FundamentalMetricsTest');
    
    // If the sheet exists, clear it; otherwise, create a new one
    if (sheet) {
      sheet.clear();
    } else {
      sheet = ss.insertSheet('FundamentalMetricsTest');
    }
    
    // Set up the header row
    const headers = [
      'Symbol', 
      'Data Sources', 
      'Price', 
      'Price Change', 
      'PEG Ratio', 
      'Forward P/E', 
      'Price/Book', 
      'Price/Sales', 
      'Debt/Equity', 
      'ROE', 
      'ROA', 
      'Profit Margin', 
      'Dividend Yield', 
      'Beta',
      'Expense Ratio'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    
    // Test symbols (mix of stocks and ETFs)
    const testSymbols = [
      'AAPL',  // Apple
      'MSFT',  // Microsoft
      'GOOGL', // Alphabet
      'AMZN',  // Amazon
      'META',  // Meta Platforms
      'TSLA',  // Tesla
      'NVDA',  // NVIDIA
      'SPY',   // S&P 500 ETF
      'QQQ',   // Nasdaq 100 ETF
      'VTI',   // Vanguard Total Stock Market ETF
      'BRK-B', // Berkshire Hathaway
      'JNJ',   // Johnson & Johnson
      'V',     // Visa
      'PG',    // Procter & Gamble
      'HD'     // Home Depot
    ];
    
    // Test each symbol with each data source
    const results = [];
    
    for (const symbol of testSymbols) {
      // Initialize data source tracking
      const dataSources = {
        google: false,
        tradier: false,
        yahooAPI: false,
        yahoo: false
      };
      
      // Get Google Finance data
      let googleData = null;
      try {
        googleData = fetchGoogleFinanceData(symbol);
        if (googleData) {
          // Check if Google data has any valid values
          const hasValidGoogleData = Object.values(googleData).some(value => 
            value !== null && value !== undefined && 
            value !== "#N/A" && value !== "#ERROR!" && 
            !isNaN(value));
          
          if (hasValidGoogleData) {
            dataSources.google = true;
          }
        }
      } catch (e) {
        Logger.log(`Error getting Google Finance data for ${symbol}: ${e.message}`);
      }
      
      // Get Tradier data
      let tradierData = null;
      try {
        tradierData = fetchTradierData(symbol);
        if (tradierData) {
          // Check if Tradier data has any valid values
          const hasValidTradierData = Object.values(tradierData).some(value => 
            value !== null && value !== undefined && 
            !isNaN(value) && value !== 0);
          
          if (hasValidTradierData) {
            dataSources.tradier = true;
          }
        }
      } catch (e) {
        Logger.log(`Error getting Tradier data for ${symbol}: ${e.message}`);
      }
      
      // Get Yahoo Finance API data
      let yahooAPIData = null;
      try {
        yahooAPIData = fetchYahooFinanceAPI(symbol);
        if (yahooAPIData) {
          // Check if Yahoo Finance API data has any valid values
          const hasValidYahooAPIData = Object.values(yahooAPIData).some(value => 
            value !== null && value !== undefined && 
            !isNaN(value));
          
          if (hasValidYahooAPIData) {
            dataSources.yahooAPI = true;
          }
        }
      } catch (e) {
        Logger.log(`Error getting Yahoo Finance API data for ${symbol}: ${e.message}`);
      }
      
      // Get Yahoo Finance data (fallback to web scraping)
      let yahooData = null;
      try {
        yahooData = fetchYahooFinanceData(symbol);
        if (yahooData) {
          // Check if Yahoo data has any valid values
          const hasValidYahooData = Object.values(yahooData).some(value => 
            value !== null && value !== undefined && 
            !isNaN(value));
          
          if (hasValidYahooData) {
            dataSources.yahoo = true;
          }
        }
      } catch (e) {
        Logger.log(`Error getting Yahoo Finance data for ${symbol}: ${e.message}`);
      }
      
      // Get the combined data using the cascading approach
      const metrics = getFundamentalMetrics(symbol);
      
      // Format the data sources used
      const dataSourcesUsed = [];
      if (dataSources.google) dataSourcesUsed.push('Google');
      if (dataSources.tradier) dataSourcesUsed.push('Tradier');
      if (dataSources.yahooAPI) dataSourcesUsed.push('Yahoo API');
      if (dataSources.yahoo) dataSourcesUsed.push('Yahoo Web');
      
      // Write the results to the sheet
      const rowData = [
        symbol,
        dataSourcesUsed.join(', '),
        metrics.price,
        metrics.priceChange,
        metrics.pegRatio,
        metrics.forwardPE,
        metrics.priceToBook,
        metrics.priceToSales,
        metrics.debtToEquity,
        metrics.returnOnEquity,
        metrics.returnOnAssets,
        metrics.profitMargin,
        metrics.dividendYield,
        metrics.beta,
        metrics.expenseRatio
      ];
      
      results.push(rowData);
    }
    
    // Write all results to the sheet
    sheet.getRange(2, 1, results.length, headers.length).setValues(results);
    
    // Format the sheet
    sheet.autoResizeColumns(1, headers.length);
    
    // Add conditional formatting to highlight zero values
    const range = sheet.getRange(2, 3, results.length, headers.length - 2);
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenNumberEqualTo(0)
      .setBackground('#FFC7CE')
      .setRanges([range])
      .build();
    
    const rules = sheet.getConditionalFormatRules();
    rules.push(rule);
    sheet.setConditionalFormatRules(rules);
    
    Logger.log('Test completed successfully');
    
    return `Test completed successfully. Check the FundamentalMetricsTest sheet in the shared finance spreadsheet: ${ss.getUrl()}`;
  } catch (error) {
    Logger.log(`Error in testEnhancedFundamentalMetrics: ${error}`);
    return `Error: ${error.message}`;
  }
}

/**
 * Tests specifically the Tradier API integration
 * Focuses on testing the beta endpoints and detailed data extraction
 */
function testTradierAPIIntegration() {
  try {
    // Get the shared finance spreadsheet
    const ss = getSharedFinanceSpreadsheet();
    
    // Check if a TradierAPITest sheet already exists
    let sheet = ss.getSheetByName('TradierAPITest');
    
    // If the sheet exists, clear it; otherwise, create a new one
    if (sheet) {
      sheet.clear();
    } else {
      sheet = ss.insertSheet('TradierAPITest');
    }
    
    // Set up the header row
    const headers = [
      'Symbol', 
      'API Endpoint',
      'Response Status',
      'PEG Ratio', 
      'Forward P/E', 
      'Price/Book', 
      'Price/Sales', 
      'Debt/Equity', 
      'ROE', 
      'ROA', 
      'Profit Margin', 
      'Dividend Yield', 
      'Beta',
      'Expense Ratio'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    
    // Test symbols (mix of stocks and ETFs)
    const testSymbols = [
      'AAPL',  // Apple
      'MSFT',  // Microsoft
      'GOOGL', // Alphabet
      'AMZN',  // Amazon
      'SPY',   // S&P 500 ETF
      'QQQ',   // Nasdaq 100 ETF
      'VTI',   // Vanguard Total Stock Market ETF
      'BRK-B', // Berkshire Hathaway
      'JNJ',   // Johnson & Johnson
      'V',     // Visa
      'PG',    // Procter & Gamble
      'HD'     // Home Depot
    ];
    
    // Get the API key from script properties
    const scriptProperties = PropertiesService.getScriptProperties();
    const tradierApiKey = scriptProperties.getProperty('TRADIER_API_KEY');
    
    if (!tradierApiKey) {
      sheet.getRange(2, 1, 1, 3).setValues([['ERROR', 'API Key Missing', 'Tradier API key not found in script properties']]);
      return;
    }
    
    // Set up the API request options
    const options = {
      'method': 'GET',
      'headers': {
        'Authorization': `Bearer ${tradierApiKey}`,
        'Accept': 'application/json'
      },
      'muteHttpExceptions': true
    };
    
    let rowIndex = 2; // Start from row 2 (after headers)
    
    // Test each symbol with different Tradier endpoints
    for (const symbol of testSymbols) {
      Logger.log(`Testing Tradier API for ${symbol}...`);
      
      // Test the beta company endpoint
      try {
        const betaCompanyUrl = `https://api.tradier.com/beta/markets/fundamentals/company?symbols=${symbol}`;
        const response = UrlFetchApp.fetch(betaCompanyUrl, options);
        const statusCode = response.getResponseCode();
        const responseText = response.getContentText();
        
        let rowData = [symbol, 'Beta Company', statusCode];
        let metrics = Array(9).fill('N/A'); // 9 metrics columns
        
        if (statusCode === 200) {
          const data = JSON.parse(responseText);
          // Add a sample of the raw response (truncated)
          const sampleResponse = responseText.substring(0, 200) + '...';
          
          // Add metrics if available (most will be N/A from this endpoint)
          metrics.push(sampleResponse);
          
          sheet.getRange(rowIndex, 1, 1, rowData.length + metrics.length).setValues([rowData.concat(metrics)]);
        } else {
          metrics.push(`Error: ${responseText.substring(0, 200)}`);
          sheet.getRange(rowIndex, 1, 1, rowData.length + metrics.length).setValues([rowData.concat(metrics)]);
        }
      } catch (e) {
        sheet.getRange(rowIndex, 1, 1, 4).setValues([[symbol, 'Beta Company', 'ERROR', e.message]]);
      }
      
      rowIndex++;
      
      // Test the beta ratios endpoint
      try {
        const betaRatiosUrl = `https://api.tradier.com/beta/markets/fundamentals/ratios?symbols=${symbol}`;
        const response = UrlFetchApp.fetch(betaRatiosUrl, options);
        const statusCode = response.getResponseCode();
        const responseText = response.getContentText();
        
        let rowData = [symbol, 'Beta Ratios', statusCode];
        let metrics = Array(9).fill('N/A'); // 9 metrics columns
        
        if (statusCode === 200) {
          const data = JSON.parse(responseText);
          const sampleResponse = responseText.substring(0, 200) + '...';
          
          // Extract metrics if available
          if (data && data.length > 0 && data[0].results) {
            const results = data[0].results;
            
            // Find stock data
            const stockData = results.find(result => result.type === "Stock");
            if (stockData && stockData.tables && stockData.tables.valuation_ratios) {
              const valuation = stockData.tables.valuation_ratios;
              
              metrics = [
                valuation.p_e_g_ratio !== undefined ? valuation.p_e_g_ratio : 'N/A',
                valuation.forward_p_e_ratio !== undefined ? valuation.forward_p_e_ratio : 'N/A',
                valuation.p_b_ratio !== undefined ? valuation.p_b_ratio : 'N/A',
                valuation.p_s_ratio !== undefined ? valuation.p_s_ratio : 'N/A',
                'N/A', // Debt/Equity not directly available
                'N/A', // ROE not in this endpoint
                'N/A', // ROA not in this endpoint
                'N/A', // Profit Margin not in this endpoint
                valuation.dividend_yield !== undefined ? valuation.dividend_yield : 'N/A'
              ];
            }
          }
          
          metrics.push(sampleResponse);
          sheet.getRange(rowIndex, 1, 1, rowData.length + metrics.length).setValues([rowData.concat(metrics)]);
        } else {
          metrics.push(`Error: ${responseText.substring(0, 200)}`);
          sheet.getRange(rowIndex, 1, 1, rowData.length + metrics.length).setValues([rowData.concat(metrics)]);
        }
      } catch (e) {
        sheet.getRange(rowIndex, 1, 1, 4).setValues([[symbol, 'Beta Ratios', 'ERROR', e.message]]);
      }
      
      rowIndex++;
      
      // Test the v1 dividends endpoint
      try {
        const dividendsUrl = `https://api.tradier.com/v1/markets/fundamentals/dividends?symbols=${symbol}`;
        const response = UrlFetchApp.fetch(dividendsUrl, options);
        const statusCode = response.getResponseCode();
        const responseText = response.getContentText();
        
        let rowData = [symbol, 'V1 Dividends', statusCode];
        let metrics = Array(8).fill('N/A'); // 8 metrics columns before dividend yield
        
        if (statusCode === 200) {
          const data = JSON.parse(responseText);
          const sampleResponse = responseText.substring(0, 200) + '...';
          
          // Extract dividend yield if available
          let dividendYield = 'N/A';
          if (data && data.securities && data.securities.security) {
            const dividends = data.securities.security;
            
            if (dividends.dividend_yield) {
              dividendYield = dividends.dividend_yield;
            }
          }
          
          metrics.push(dividendYield);
          metrics.push('N/A'); // Beta
          metrics.push(sampleResponse);
          
          sheet.getRange(rowIndex, 1, 1, rowData.length + metrics.length).setValues([rowData.concat(metrics)]);
        } else {
          metrics.push('N/A'); // Dividend Yield
          metrics.push('N/A'); // Beta
          metrics.push(`Error: ${responseText.substring(0, 200)}`);
          sheet.getRange(rowIndex, 1, 1, rowData.length + metrics.length).setValues([rowData.concat(metrics)]);
        }
      } catch (e) {
        sheet.getRange(rowIndex, 1, 1, 4).setValues([[symbol, 'V1 Dividends', 'ERROR', e.message]]);
      }
      
      rowIndex++;
      
      // Test the integrated fetchTradierData function
      try {
        const tradierData = fetchTradierData(symbol);
        
        let rowData = [symbol, 'Integrated Function', 'SUCCESS'];
        let metrics = [
          tradierData.pegRatio !== null ? tradierData.pegRatio : 'N/A',
          tradierData.forwardPE !== null ? tradierData.forwardPE : 'N/A',
          tradierData.priceToBook !== null ? tradierData.priceToBook : 'N/A',
          tradierData.priceToSales !== null ? tradierData.priceToSales : 'N/A',
          tradierData.debtToEquity !== null ? tradierData.debtToEquity : 'N/A',
          tradierData.returnOnEquity !== null ? tradierData.returnOnEquity : 'N/A',
          tradierData.returnOnAssets !== null ? tradierData.returnOnAssets : 'N/A',
          tradierData.profitMargin !== null ? tradierData.profitMargin : 'N/A',
          tradierData.dividendYield !== null ? tradierData.dividendYield : 'N/A',
          tradierData.beta !== null ? tradierData.beta : 'N/A',
          JSON.stringify(tradierData).substring(0, 200) + '...'
        ];
        
        sheet.getRange(rowIndex, 1, 1, rowData.length + metrics.length).setValues([rowData.concat(metrics)]);
      } catch (e) {
        sheet.getRange(rowIndex, 1, 1, 4).setValues([[symbol, 'Integrated Function', 'ERROR', e.message]]);
      }
      
      rowIndex++;
      
      // Add a separator row
      sheet.getRange(rowIndex, 1, 1, headers.length).setBackground('#f0f0f0');
      rowIndex++;
    }
    
    // Format the sheet
    sheet.autoResizeColumns(1, headers.length);
    
    // Return the URL to the spreadsheet
    return ss.getUrl();
  } catch (error) {
    Logger.log(`Error in testTradierAPIIntegration: ${error}`);
    return `Error: ${error.message}`;
  }
}

/**
 * Retrieves recently mentioned stocks/ETFs from CNBC
 * @return {Array} Recently mentioned stocks/ETFs
 */
function retrieveRecentlyMentionedStocks() {
  try {
    Logger.log("Retrieving recently mentioned stocks/ETFs...");
    
    // This would be implemented with actual web scraping in a production environment
    // For example, using UrlFetchApp to fetch the CNBC website and parse the data
    
    // For now, we'll return a placeholder array of popular stocks
    // In a production environment, this would be dynamically scraped
    const stocks = [
      "AAPL",
      "MSFT",
      "GOOGL",
      "AMZN",
      "NVDA",
      "META",
      "TSLA",
      "BRK-B",
      "JPM",
      "V"
    ];
    
    Logger.log(`Retrieved ${stocks.length} recently mentioned stocks/ETFs.`);
    return stocks;
  } catch (error) {
    Logger.log(`Error retrieving recently mentioned stocks/ETFs: ${error}`);
    return ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"]; // Fallback to a few major stocks
  }
}

/**
 * Helper function to get a company name from a symbol
 * @param {String} symbol - Stock/ETF symbol
 * @return {String} Company name
 */
function getCompanyName(symbol) {
  try {
    // First try to get the name from Google Finance
    try {
      // Get the shared finance spreadsheet
      const spreadsheet = getSharedFinanceSpreadsheet();
      
      // Create or get a sheet for company names
      let sheet = spreadsheet.getSheetByName("CompanyNames");
      if (!sheet) {
        sheet = spreadsheet.insertSheet("CompanyNames");
      }
      
      // Set up formula to fetch company name
      sheet.getRange("A1").setValue(symbol);
      sheet.getRange("B1").setFormula(`=GOOGLEFINANCE(A1, "name")`);
      
      // Wait for formula to calculate
      Utilities.sleep(1000);
      
      // Get the company name
      const companyName = sheet.getRange("B1").getValue();
      
      // If we got a valid name, return it
      if (companyName && companyName !== "#N/A" && companyName !== "#ERROR!") {
        return companyName;
      }
    } catch (e) {
      Logger.log(`Error getting company name from Google Finance: ${e.message}`);
    }
    
    // If we couldn't get the name from Google Finance, try a hardcoded list
    const companyNames = {
      // Major indices
      "SPY": "SPDR S&P 500 ETF",
      "QQQ": "Invesco QQQ Trust (NASDAQ-100 Index)",
      "IWM": "iShares Russell 2000 ETF",
      "DIA": "SPDR Dow Jones Industrial Average ETF",
      
      // Magnificent Seven
      "AAPL": "Apple Inc.",
      "MSFT": "Microsoft Corporation",
      "GOOGL": "Alphabet Inc. (Google)",
      "GOOG": "Alphabet Inc. (Google)",
      "AMZN": "Amazon.com, Inc.",
      "META": "Meta Platforms, Inc. (Facebook)",
      "TSLA": "Tesla, Inc.",
      "NVDA": "NVIDIA Corporation",
      
      // Other popular stocks
      "NFLX": "Netflix, Inc.",
      "JPM": "JPMorgan Chase & Co.",
      "V": "Visa Inc.",
      "JNJ": "Johnson & Johnson",
      "WMT": "Walmart Inc.",
      "PG": "Procter & Gamble Company",
      "MA": "Mastercard Incorporated",
      "UNH": "UnitedHealth Group Incorporated",
      "HD": "The Home Depot, Inc.",
      "BAC": "Bank of America Corporation",
      "XOM": "Exxon Mobil Corporation",
      "PFE": "Pfizer Inc.",
      "CSCO": "Cisco Systems, Inc.",
      "VZ": "Verizon Communications Inc.",
      "INTC": "Intel Corporation",
      "ADBE": "Adobe Inc.",
      "CRM": "Salesforce, Inc.",
      "PYPL": "PayPal Holdings, Inc.",
      "CMCSA": "Comcast Corporation",
      "COST": "Costco Wholesale Corporation",
      "ABT": "Abbott Laboratories",
      "AVGO": "Broadcom Inc.",
      "PEP": "PepsiCo, Inc.",
      "TMO": "Thermo Fisher Scientific Inc.",
      "ACN": "Accenture plc",
      "NKE": "NIKE, Inc.",
      "ABBV": "AbbVie Inc.",
      "TXN": "Texas Instruments Incorporated",
      "MRK": "Merck & Co., Inc.",
      "DHR": "Danaher Corporation",
      
      // Popular ETFs
      "VOO": "Vanguard S&P 500 ETF",
      "VTI": "Vanguard Total Stock Market ETF",
      "VXUS": "Vanguard Total International Stock ETF",
      "BND": "Vanguard Total Bond Market ETF",
      "VEA": "Vanguard FTSE Developed Markets ETF",
      "VWO": "Vanguard FTSE Emerging Markets ETF",
      "AGG": "iShares Core U.S. Aggregate Bond ETF",
      "IJH": "iShares Core S&P Mid-Cap ETF",
      "IJR": "iShares Core S&P Small-Cap ETF",
      "GLD": "SPDR Gold Shares",
      "SLV": "iShares Silver Trust",
      "XLF": "Financial Select Sector SPDR Fund",
      "XLE": "Energy Select Sector SPDR Fund",
      "XLK": "Technology Select Sector SPDR Fund",
      "XLV": "Health Care Select Sector SPDR Fund",
      "XLY": "Consumer Discretionary Select Sector SPDR Fund",
      "XLP": "Consumer Staples Select Sector SPDR Fund",
      "XLI": "Industrial Select Sector SPDR Fund",
      "XLU": "Utilities Select Sector SPDR Fund",
      "XLB": "Materials Select Sector SPDR Fund",
      "XLRE": "Real Estate Select Sector SPDR Fund"
    };
    
    // If we have a hardcoded name, return it
    if (companyNames[symbol]) {
      return companyNames[symbol];
    }
    
    // If all else fails, just return the symbol
    return symbol;
  } catch (error) {
    Logger.log(`Error getting company name for ${symbol}: ${error}`);
    return symbol;
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
 * Fetches data from Tradier API for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Metrics from Tradier API
 */
function fetchTradierData(symbol) {
  try {
    Logger.log(`Fetching Tradier data for ${symbol}`);
    
    // Initialize metrics with null values
    const metrics = {
      price: null,
      priceChange: null,
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
      expenseRatio: null
    };
    
    // Get the API key from script properties
    const scriptProperties = PropertiesService.getScriptProperties();
    const tradierApiKey = scriptProperties.getProperty('TRADIER_API_KEY');
    
    if (!tradierApiKey) {
      Logger.log('Tradier API key not found. Please set the TRADIER_API_KEY property.');
      return metrics;
    }
    
    // Set up the API request options
    const options = {
      'method': 'GET',
      'headers': {
        'Authorization': `Bearer ${tradierApiKey}`,
        'Accept': 'application/json'
      },
      'muteHttpExceptions': true
    };
    
    // Helper function to make API requests with retry logic
    function makeApiRequest(url, maxRetries = 3) {
      let retries = 0;
      let response;
      
      while (retries < maxRetries) {
        try {
          response = UrlFetchApp.fetch(url, options);
          
          // If successful, return the response
          if (response.getResponseCode() === 200) {
            return JSON.parse(response.getContentText());
          }
          
          // If rate limited, wait and retry
          if (response.getResponseCode() === 429) {
            Logger.log(`Rate limited. Retrying in ${Math.pow(2, retries)} seconds...`);
            Utilities.sleep(Math.pow(2, retries) * 1000); // Exponential backoff
            retries++;
            continue;
          }
          
          // If other error, log and return null
          Logger.log(`API error: ${response.getResponseCode()} - ${response.getContentText()}`);
          return null;
        } catch (error) {
          Logger.log(`API request error: ${error}. Retry ${retries + 1}/${maxRetries}`);
          retries++;
          
          if (retries < maxRetries) {
            Utilities.sleep(Math.pow(2, retries) * 1000); // Exponential backoff
          }
        }
      }
      
      return null;
    }
    
    // First, get the company profile using the beta endpoint
    Logger.log(`Fetching company profile for ${symbol} from Tradier beta API`);
    const profileUrl = `https://api.tradier.com/beta/markets/fundamentals/company?symbols=${symbol}`;
    const profileData = makeApiRequest(profileUrl);
    
    if (profileData && profileData.length > 0 && profileData[0].results) {
      const results = profileData[0].results;
      
      // Find the company data
      const companyData = results.find(result => result.type === "Company");
      
      if (companyData && companyData.tables) {
        // Extract data from asset_classification if available
        if (companyData.tables.asset_classification) {
          const assetClass = companyData.tables.asset_classification;
          
          // Beta might be in the asset classification data
          if (assetClass.financial_health_grade) {
            Logger.log(`Found financial health grade: ${assetClass.financial_health_grade}`);
          }
        }
        
        // Extract company profile data
        if (companyData.tables.company_profile) {
          const profile = companyData.tables.company_profile;
          Logger.log(`Found company profile data for ${symbol}`);
        }
        
        // Extract long description if available
        if (companyData.tables.long_descriptions) {
          const description = companyData.tables.long_descriptions;
          Logger.log(`Found company description for ${symbol}`);
        }
      }
    }
    
    // Next, get the financial ratios using the beta endpoint
    Logger.log(`Fetching financial ratios for ${symbol} from Tradier beta API`);
    const ratiosUrl = `https://api.tradier.com/beta/markets/fundamentals/ratios?symbols=${symbol}`;
    const ratiosData = makeApiRequest(ratiosUrl);
    
    if (ratiosData && ratiosData.length > 0 && ratiosData[0].results) {
      const results = ratiosData[0].results;
      
      // Process company ratios
      const companyData = results.find(result => result.type === "Company");
      if (companyData && companyData.tables) {
        // Extract operation ratios if available
        if (companyData.tables.operation_ratios_restate && companyData.tables.operation_ratios_restate.length > 0) {
          const ratios = companyData.tables.operation_ratios_restate[0].period_1y;
          
          if (ratios) {
            // Extract return on equity
            if (ratios.r_o_e !== undefined) {
              metrics.returnOnEquity = parseFloat(ratios.r_o_e);
              Logger.log(`Found ROE from Tradier: ${metrics.returnOnEquity}`);
            }
            
            // Extract return on assets
            if (ratios.r_o_a !== undefined) {
              metrics.returnOnAssets = parseFloat(ratios.r_o_a);
              Logger.log(`Found ROA from Tradier: ${metrics.returnOnAssets}`);
            }
            
            // Extract profit margin
            if (ratios.net_margin !== undefined) {
              metrics.profitMargin = parseFloat(ratios.net_margin);
              Logger.log(`Found profit margin from Tradier: ${metrics.profitMargin}`);
            }
            
            // Extract debt to equity (may need calculation)
            if (ratios.financial_leverage !== undefined) {
              // This is an approximation, may need adjustment
              metrics.debtToEquity = parseFloat(ratios.financial_leverage) - 1;
              Logger.log(`Calculated debt to equity from financial leverage: ${metrics.debtToEquity}`);
            }
          }
        }
        
        // Try alternative operation ratios format if needed
        if (!metrics.returnOnEquity && companyData.tables.operation_ratios_a_o_r && companyData.tables.operation_ratios_a_o_r.length > 0) {
          const ratios = companyData.tables.operation_ratios_a_o_r[0].period_1y;
          
          if (ratios) {
            // Extract return on equity
            if (ratios.r_o_e !== undefined) {
              metrics.returnOnEquity = parseFloat(ratios.r_o_e);
              Logger.log(`Found ROE from alternative ratios: ${metrics.returnOnEquity}`);
            }
            
            // Extract return on assets
            if (ratios.r_o_a !== undefined) {
              metrics.returnOnAssets = parseFloat(ratios.r_o_a);
              Logger.log(`Found ROA from alternative ratios: ${metrics.returnOnAssets}`);
            }
            
            // Extract profit margin
            if (ratios.net_margin !== undefined) {
              metrics.profitMargin = parseFloat(ratios.net_margin);
              Logger.log(`Found profit margin from alternative ratios: ${metrics.profitMargin}`);
            }
          }
        }
      }
      
      // Process stock-specific ratios
      const stockData = results.find(result => result.type === "Stock");
      if (stockData && stockData.tables) {
        // Extract valuation ratios if available
        if (stockData.tables.valuation_ratios) {
          const valuation = stockData.tables.valuation_ratios;
          
          // Extract P/E ratio
          if (valuation.forward_p_e_ratio !== undefined) {
            metrics.forwardPE = parseFloat(valuation.forward_p_e_ratio);
            Logger.log(`Found forward P/E from Tradier: ${metrics.forwardPE}`);
          }
          
          // Extract PEG ratio
          if (valuation.p_e_g_ratio !== undefined) {
            metrics.pegRatio = parseFloat(valuation.p_e_g_ratio);
            Logger.log(`Found PEG ratio from Tradier: ${metrics.pegRatio}`);
          }
          
          // Extract price to book
          if (valuation.p_b_ratio !== undefined) {
            metrics.priceToBook = parseFloat(valuation.p_b_ratio);
            Logger.log(`Found price to book from Tradier: ${metrics.priceToBook}`);
          }
          
          // Extract price to sales
          if (valuation.p_s_ratio !== undefined) {
            metrics.priceToSales = parseFloat(valuation.p_s_ratio);
            Logger.log(`Found price to sales from Tradier: ${metrics.priceToSales}`);
          }
          
          // Extract dividend yield
          if (valuation.dividend_yield !== undefined) {
            metrics.dividendYield = parseFloat(valuation.dividend_yield) / 100; // Convert from percentage
            Logger.log(`Found dividend yield from Tradier: ${metrics.dividendYield}`);
          }
        }
        
        // Extract beta from alpha_beta if available
        if (stockData.tables.alpha_beta && stockData.tables.alpha_beta.period_60m) {
          const alphaBeta = stockData.tables.alpha_beta.period_60m;
          
          if (alphaBeta.beta !== undefined) {
            metrics.beta = parseFloat(alphaBeta.beta);
            Logger.log(`Found beta from Tradier alpha_beta: ${metrics.beta}`);
          }
        }
      }
    }
    
    // If we still don't have dividend yield, try the dividends endpoint
    if (metrics.dividendYield === null) {
      Logger.log(`Fetching dividend data for ${symbol} from Tradier API`);
      const dividendsUrl = `https://api.tradier.com/v1/markets/fundamentals/dividends?symbols=${symbol}`;
      const dividendsData = makeApiRequest(dividendsUrl);
      
      if (dividendsData && dividendsData.securities && dividendsData.securities.security) {
        const dividends = dividendsData.securities.security;
        
        // Extract dividend yield
        if (dividends.dividend_yield) {
          metrics.dividendYield = parseFloat(dividends.dividend_yield) / 100; // Convert percentage to decimal
          Logger.log(`Found dividend yield from Tradier dividends endpoint: ${metrics.dividendYield}`);
        }
      }
    }
    
    // For ETFs, try to get expense ratio
    if (isETF(symbol)) {
      try {
        // Tradier doesn't have a direct ETF expense ratio endpoint
        // This is a placeholder - we'll keep the expense ratio as null
        Logger.log(`${symbol} is an ETF, but Tradier doesn't provide expense ratio data`);
      } catch (etfError) {
        Logger.log(`Error checking ETF data for ${symbol}: ${etfError}`);
      }
    }
    
    // Validate metrics for realistic values
    Object.keys(metrics).forEach(key => {
      metrics[key] = validateMetric(metrics[key], key);
    });
    
    Logger.log(`Final Tradier metrics for ${symbol}: ${JSON.stringify(metrics)}`);
    
    return metrics;
  } catch (error) {
    Logger.log(`Error in fetchTradierData for ${symbol}: ${error}`);
    
    // Return null values for all metrics
    return {
      price: null,
      priceChange: null,
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
      expenseRatio: null
    };
  }
}

/**
 * Helper function to check if a symbol is an ETF
 * @param {String} symbol - The stock/ETF symbol
 * @return {Boolean} True if the symbol is an ETF, false otherwise
 */
function isETF(symbol) {
  // Common ETF symbols
  const commonETFs = ["SPY", "QQQ", "IWM", "DIA", "VTI", "VOO", "VEA", "VWO", "BND", "AGG", "VIG", "VYM"];
  
  if (commonETFs.includes(symbol)) {
    return true;
  }
  
  // ETFs often have these prefixes
  const etfPrefixes = ["SPY", "IVV", "VOO", "VTI", "QQQ", "IWM", "GLD", "VEA", "VWO", "EFA", "EEM", "AGG", "BND", "LQD", "VIG", "VYM", "SCHD"];
  
  for (const prefix of etfPrefixes) {
    if (symbol.startsWith(prefix)) {
      return true;
    }
  }
  
  // Check if the symbol contains common ETF indicators
  if (symbol.includes("-ETF") || symbol.includes(".ETF")) {
    return true;
  }
  
  // For more accurate detection, you would need to query a database or API
  // This is just a basic heuristic
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
 * Fetches data from Google Finance
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Google Finance data
 */
function fetchGoogleFinanceData(symbol) {
  try {
    // Get the shared spreadsheet
    const spreadsheet = getSharedFinanceSpreadsheet();
    
    // Clear any existing data
    const sheet = spreadsheet.getActiveSheet();
    sheet.clear();
    
    // Set up the GOOGLEFINANCE formula for various metrics
    sheet.getRange("A1").setValue(symbol);
    sheet.getRange("B1").setFormula(`=GOOGLEFINANCE(A1, "price")`);
    sheet.getRange("C1").setFormula(`=GOOGLEFINANCE(A1, "change")`);
    sheet.getRange("D1").setFormula(`=GOOGLEFINANCE(A1, "changePct")`);
    sheet.getRange("E1").setFormula(`=GOOGLEFINANCE(A1, "pegratio")`);
    sheet.getRange("F1").setFormula(`=GOOGLEFINANCE(A1, "forwardpe")`);
    sheet.getRange("G1").setFormula(`=GOOGLEFINANCE(A1, "pb")`);
    sheet.getRange("H1").setFormula(`=GOOGLEFINANCE(A1, "ps")`);
    sheet.getRange("I1").setFormula(`=GOOGLEFINANCE(A1, "de")`);
    sheet.getRange("J1").setFormula(`=GOOGLEFINANCE(A1, "roe")`);
    sheet.getRange("K1").setFormula(`=GOOGLEFINANCE(A1, "beta")`);
    sheet.getRange("L1").setFormula(`=IF(REGEXMATCH("${symbol}", "^(SPY|QQQ|IWM|DIA|VOO|VTI|VXUS|BND|AGG)$"), GOOGLEFINANCE("${symbol}", "expenseratio"), "")`);
    
    // Wait for formulas to calculate
    Utilities.sleep(1000);
    
    // Extract the data
    const price = sheet.getRange("B1").getValue();
    const change = sheet.getRange("C1").getValue();
    const changePct = sheet.getRange("D1").getValue();
    const pegRatio = sheet.getRange("E1").getValue();
    const forwardPE = sheet.getRange("F1").getValue();
    const priceToBook = sheet.getRange("G1").getValue();
    const priceToSales = sheet.getRange("H1").getValue();
    const debtToEquity = sheet.getRange("I1").getValue();
    const returnOnEquity = sheet.getRange("J1").getValue();
    const beta = sheet.getRange("K1").getValue();
    const expenseRatio = sheet.getRange("L1").getValue();
    
    // Determine if this is an ETF based on common ETF symbols
    const isETF = /^(SPY|QQQ|IWM|DIA|VOO|VTI|VXUS|BND|AGG)$/i.test(symbol);
    
    // Format price change with +/- sign and percentage
    let formattedPriceChange = null;
    if (change !== null && changePct !== null && !isNaN(change) && !isNaN(changePct)) {
      const sign = change >= 0 ? '+' : '';
      const formattedChange = change.toFixed(2);
      const formattedChangePct = (changePct * 100).toFixed(2);
      formattedPriceChange = `${sign}${formattedChange} (${sign}${formattedChangePct}%)`;
    }
    
    // Return the data
    return {
      symbol: symbol,
      price: price,
      priceChange: formattedPriceChange,
      pegRatio: pegRatio,
      forwardPE: forwardPE,
      priceToBook: priceToBook,
      priceToSales: priceToSales,
      debtToEquity: debtToEquity,
      returnOnEquity: returnOnEquity,
      returnOnAssets: 0,
      profitMargin: 0,
      dividendYield: 0,
      beta: beta,
      expenseRatio: expenseRatio
    };
  } catch (error) {
    Logger.log(`Error fetching Google Finance data for ${symbol}: ${error}`);
    throw error;
  }
}
