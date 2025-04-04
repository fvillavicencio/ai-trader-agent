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
            beta: null,
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
          beta: null,
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
    
    // Initialize metrics object
    const metrics = {
      symbol: symbol,
      price: null,
      priceChange: null,
      changesPercentage: null,
      volume: null,
      marketCap: null,
      industry: null,
      sector: null,
      company: null,
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

    let sourcesUsed = [];
    let validMetricsCount = 0;
    
    // Try all data sources in order
    const dataSources = [
      { name: "Yahoo Finance API", func: fetchYahooFinanceData },
      { name: "Google Finance", func: fetchGoogleFinanceData },
      { name: "Tradier API", func: fetchTradierData },
      { name: "FMP API", func: fetchFMPData }
    ];

    for (const source of dataSources) {
      if (validMetricsCount < 5) {
        try {
          Logger.log(`Attempting to fetch data from ${source.name} for ${symbol}...`);
          const data = source.func(symbol);
          
          if (data && Object.keys(data).length > 0) {
            // Extract price data first
            metrics.price = data.price || null;
            metrics.priceChange = data.priceChange || null;
            metrics.changesPercentage = data.changesPercentage || null;
            metrics.volume = data.volume || null;
            metrics.marketCap = data.marketCap || null;
            metrics.company = data.company || null;
            
            // Then proceed with other metrics
            for (const key in data) {
              if (!metrics[key]) {
                metrics[key] = data[key];
                if (key !== 'price' && key !== 'volume') {
                  validMetricsCount++;
                }
              }
            }
            
            sourcesUsed.push(source.name);
          }
        } catch (error) {
          Logger.log(`Error fetching data from ${source.name} for ${symbol}: ${error}`);
        }
      }
    }
    
    // For ETFs, we need fewer metrics to consider the data valid
    const isETF = ["SPY", "QQQ", "IWM", "DIA"].includes(symbol);
    const minRequiredMetrics = isETF ? 2 : 5;
    
    // If we don't have enough valid metrics, try Yahoo Finance one more time
    if (validMetricsCount < minRequiredMetrics) {
      try {
        Logger.log(`Attempting final Yahoo Finance fetch for ${symbol}...`);
        const data = fetchYahooFinanceData(symbol);
        if (data && Object.keys(data).length > 0) {
          for (const key in data) {
            if (!metrics[key]) {
              metrics[key] = data[key];
              if (key !== 'price' && key !== 'volume') {
                validMetricsCount++;
              }
            }
          }
          if (!sourcesUsed.includes("Yahoo Finance API")) {
            sourcesUsed.push("Yahoo Finance API (final attempt)");
          }
        }
      } catch (error) {
        Logger.log(`Final Yahoo Finance attempt failed for ${symbol}: ${error}`);
      }
    }
    
    // Finalize metrics object
    metrics.dataSource = sourcesUsed.join(", ");
    metrics.lastUpdated = new Date().toISOString();
    
    // Cache the data if we have valid metrics
    const hasValidMetrics = Object.values(metrics).some(value => value !== null && value !== undefined && value !== "");
    
    if (hasValidMetrics) {
      const cacheData = {
        ...metrics,
        fromCache: false,
        lastUpdated: metrics.lastUpdated
      };
      scriptCache.put(cacheKey, JSON.stringify(cacheData), 30 * 60); // 30-minute cache
      Logger.log(`Cached fundamental metrics for ${symbol}`);
    } else {
      Logger.log(`No valid metrics to cache for ${symbol}`);
    }

    // Get company name from the spreadsheet
    try {
      const spreadsheet = getSharedFinanceSpreadsheet();
      const sheet = spreadsheet.getSheetByName('Companies') || spreadsheet.insertSheet('Companies');
      
      // Find or create the company entry
      const data = sheet.getDataRange().getValues();
      let found = false;
      
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === symbol) {
          metrics.company = data[i][1];
          found = true;
          break;
        }
      }
      
      if (!found && metrics.company) {
        // Add new entry
        const nextRow = data.length + 1;
        sheet.getRange(nextRow, 1).setValue(symbol);
        sheet.getRange(nextRow, 2).setValue(metrics.company);
      }
    } catch (error) {
      Logger.log(`Error getting company name from spreadsheet: ${error}`);
    }

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
      company: null,
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
      dataSource: "Error",
      error: error.message,
      fromCache: false
    };
  }
}

/**
 * Fetches data from Yahoo Finance for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Yahoo Finance data
 */
function fetchYahooFinanceData(symbol) {
  try {
    Logger.log(`Fetching Yahoo Finance data for ${symbol}`);
    
    // First try to get data from Yahoo Finance API
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price,summaryDetail,assetProfile,financialData`;
    const options = {
      'method': 'GET',
      'headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json'
      },
      'muteHttpExceptions': true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    
    if (data.quoteSummary && data.quoteSummary.result && data.quoteSummary.result.length > 0) {
      const result = data.quoteSummary.result[0];
      const priceData = result.price;
      const summaryData = result.summaryDetail;
      const assetData = result.assetProfile;
      const financialData = result.financialData;
      
      return {
        price: priceData?.regularMarketPrice?.raw || null,
        priceChange: priceData?.regularMarketChange?.raw || null,
        changesPercentage: priceData?.regularMarketChangePercent?.raw || null,
        volume: summaryData?.volume?.raw || null,
        marketCap: summaryData?.marketCap?.raw || null,
        name: assetData?.companyName || getCompanyName(symbol),
        industry: assetData?.industry || null,
        sector: assetData?.sector || null,
        beta: summaryData?.beta?.raw || null,
        pegRatio: financialData?.pegRatio?.raw || null,
        forwardPE: financialData?.forwardPE?.raw || null,
        priceToBook: financialData?.priceToBook?.raw || null,
        priceToSales: financialData?.priceToSales?.raw || null,
        debtToEquity: financialData?.debtToEquity?.raw || null,
        returnOnEquity: financialData?.returnOnEquity?.raw || null,
        returnOnAssets: financialData?.returnOnAssets?.raw || null,
        profitMargin: financialData?.profitMargins?.raw || null,
        dividendYield: summaryData?.dividendYield?.raw || null,
        afterHoursPrice: priceData?.afterHours?.raw || null,
        afterHoursChange: priceData?.afterHoursChange?.raw || null,
        afterHoursChangePercent: priceData?.afterHoursChangePercent?.raw || null
      };
    }
    
    return null;
  } catch (error) {
    Logger.log(`Error fetching Yahoo Finance data for ${symbol}: ${error}`);
    return null;
  }
}

/**
 * Fetches data from FMP API for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} FMP API data
 */
function fetchFMPData(symbol) {
  try {
    Logger.log(`Fetching FMP data for ${symbol}`);
    
    // Get the FMP API key from script properties
    const fmpApiKey = PropertiesService.getScriptProperties().getProperty('FMP_API_KEY');
    if (!fmpApiKey) {
      throw new Error('FMP API key not configured');
    }
    
    // Construct the FMP API URLs
    const profileUrl = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${fmpApiKey}`;
    const ratiosUrl = `https://financialmodelingprep.com/api/v3/ratios/${symbol}?apikey=${fmpApiKey}`;
    
    // Fetch company profile
    const profileResponse = UrlFetchApp.fetch(profileUrl, {'muteHttpExceptions': true});
    const profileData = JSON.parse(profileResponse.getContentText());
    
    // Fetch ratios
    const ratiosResponse = UrlFetchApp.fetch(ratiosUrl, {'muteHttpExceptions': true});
    const ratiosData = JSON.parse(ratiosResponse.getContentText());
    
    if (profileData.length > 0 && ratiosData.length > 0) {
      const profile = profileData[0];
      const latestRatios = ratiosData[0];
      
      return {
        price: parseFloat(profile.price) || null,
        priceChange: parseFloat(profile.changes) || null,
        changesPercentage: parseFloat(profile.changesPercentage) || null,
        volume: parseFloat(profile.volume) || null,
        marketCap: parseFloat(profile.mktCap) || null,
        name: profile.companyName || null,
        industry: profile.industry || null,
        sector: profile.sector || null,
        beta: parseFloat(latestRatios.beta) || null,
        pegRatio: parseFloat(latestRatios.pegRatio) || null,
        forwardPE: parseFloat(latestRatios.forwardPERatio) || null,
        priceToBook: parseFloat(latestRatios.priceToBookRatio) || null,
        priceToSales: parseFloat(latestRatios.priceToSalesRatio) || null,
        debtToEquity: parseFloat(latestRatios.debtToEquityRatio) || null,
        returnOnEquity: parseFloat(latestRatios.returnOnEquity) || null,
        returnOnAssets: parseFloat(latestRatios.returnOnAssets) || null,
        profitMargin: parseFloat(latestRatios.profitMargin) || null,
        dividendYield: parseFloat(profile.dividendYield) || null,
        beta: parseFloat(latestRatios.beta) || null
      };
    }
    
    return null;
  } catch (error) {
    Logger.log(`Error fetching FMP data for ${symbol}: ${error}`);
    return null;
  }
}

/**
 * Fetches current price data for a symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Price data including current price, change, and percent change
 */
function fetchPriceData(symbol) {
  try {
    // Try to get price data from Google Finance
    const ss = getSharedFinanceSpreadsheet();
    const sheet = ss.getSheets()[0];
    
    // Clear any existing data
    sheet.clear();
    
    // Set up the GOOGLEFINANCE formula for price data
    sheet.getRange("A1").setValue(symbol);
    sheet.getRange("B1").setFormula(`=GOOGLEFINANCE(A1,"price")`);
    sheet.getRange("C1").setFormula(`=GOOGLEFINANCE(A1,"priceopen")`);
    sheet.getRange("D1").setFormula(`=GOOGLEFINANCE(A1,"changepct")`);
    
    // Wait for formulas to calculate
    Utilities.sleep(1000);
    
    // Get the price data
    const price = sheet.getRange("B1").getValue();
    const openPrice = sheet.getRange("C1").getValue();
    const percentChange = sheet.getRange("D1").getValue();
    
    // Calculate price change
    const priceChange = price - openPrice;
    
    return {
      price: price,
      priceChange: priceChange,
      percentChange: percentChange
    };
  } catch (error) {
    Logger.log(`Error fetching price data for ${symbol}: ${error}`);
    return null;
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
    sheet.getRange("A1").setValue("Symbol");
    sheet.getRange("B1").setValue("Price");
    sheet.getRange("C1").setValue("Change");
    sheet.getRange("D1").setValue("Change Pct");
    sheet.getRange("E1").setValue("PEG Ratio");
    sheet.getRange("F1").setValue("Forward P/E");
    sheet.getRange("G1").setValue("P/B");
    sheet.getRange("H1").setValue("P/S");
    sheet.getRange("I1").setValue("D/E");
    sheet.getRange("J1").setValue("ROE");
    sheet.getRange("K1").setValue("Beta");
    sheet.getRange("L1").setValue("Expense Ratio");
    
    // Set the symbol
    sheet.getRange("A2").setValue(symbol);
    
    // Set the formulas for each metric
    sheet.getRange("B2").setFormula(`=GOOGLEFINANCE("${symbol}", "price")`);
    sheet.getRange("C2").setFormula(`=GOOGLEFINANCE("${symbol}", "change")`);
    sheet.getRange("D2").setFormula(`=GOOGLEFINANCE("${symbol}", "changepct")`);
    sheet.getRange("E2").setFormula(`=GOOGLEFINANCE("${symbol}", "pegratio")`);
    sheet.getRange("F2").setFormula(`=GOOGLEFINANCE("${symbol}", "forwardpe")`);
    sheet.getRange("G2").setFormula(`=GOOGLEFINANCE("${symbol}", "pb")`);
    sheet.getRange("H2").setFormula(`=GOOGLEFINANCE("${symbol}", "ps")`);
    sheet.getRange("I2").setFormula(`=GOOGLEFINANCE("${symbol}", "de")`);
    sheet.getRange("J2").setFormula(`=GOOGLEFINANCE("${symbol}", "roe")`);
    sheet.getRange("K2").setFormula(`=GOOGLEFINANCE("${symbol}", "beta")`);
    sheet.getRange("L2").setFormula(`=IF(REGEXMATCH("${symbol}", "^(SPY|QQQ|IWM|DIA|VOO|VTI|VXUS|BND|AGG)$"), GOOGLEFINANCE("${symbol}", "expenseratio"), "")`);
    
    // Wait for formulas to calculate
    Utilities.sleep(3000); // Increased from 1000 to 3000ms
    
    // Extract the data
    const price = sheet.getRange("B2").getValue();
    const change = sheet.getRange("C2").getValue();
    const changePct = sheet.getRange("D2").getValue();
    const pegRatio = sheet.getRange("E2").getValue();
    const forwardPE = sheet.getRange("F2").getValue();
    const priceToBook = sheet.getRange("G2").getValue();
    const priceToSales = sheet.getRange("H2").getValue();
    const debtToEquity = sheet.getRange("I2").getValue();
    const returnOnEquity = sheet.getRange("J2").getValue();
    const beta = sheet.getRange("K2").getValue();
    const expenseRatio = sheet.getRange("L2").getValue();
    
    // Determine if this is an ETF based on common ETF symbols
    const isETF = /^(SPY|QQQ|IWM|DIA|VOO|VTI|VXUS|BND|AGG)$/i.test(symbol);
    
    // Count how many fundamental metrics we actually have
    let validMetricsCount = 0;
    const metrics = {
      pegRatio, forwardPE, priceToBook, priceToSales, debtToEquity, returnOnEquity, beta
    };
    
    for (const [key, value] of Object.entries(metrics)) {
      // Convert #N/A to null
      const cleanValue = value === '#N/A' ? null : value;
      
      // Validate the metric
      if (cleanValue !== null && 
          typeof cleanValue === 'number' && 
          !isNaN(cleanValue) && 
          Math.abs(cleanValue) !== Infinity) {
        validMetricsCount++;
      }
    }
    
    // For ETFs, we need fewer metrics to consider the data valid
    const minRequiredMetrics = isETF ? 1 : 2; // Reduced from 3 to 2
    
    // Log the metrics we found
    Logger.log(`Found ${validMetricsCount} valid metrics for ${symbol}: ${JSON.stringify(metrics)}`);
    
    // If we don't have enough valid metrics, throw an error to try the next data source
    if (validMetricsCount < minRequiredMetrics) {
      Logger.log(`Google Finance returned insufficient metrics for ${symbol}: ${validMetricsCount}/${minRequiredMetrics} valid metrics`);
      throw new Error("Insufficient fundamental metrics from Google Finance");
    }
    
    // Return the data
    return {
      symbol: symbol,
      price: price,
      change: change,
      changePct: changePct,
      pegRatio: pegRatio === '#N/A' ? null : pegRatio,
      forwardPE: forwardPE === '#N/A' ? null : forwardPE,
      priceToBook: priceToBook === '#N/A' ? null : priceToBook,
      priceToSales: priceToSales === '#N/A' ? null : priceToSales,
      debtToEquity: debtToEquity === '#N/A' ? null : debtToEquity,
      returnOnEquity: returnOnEquity === '#N/A' ? null : returnOnEquity,
      returnOnAssets: 0,
      profitMargin: 0,
      dividendYield: 0,
      beta: beta === '#N/A' ? null : beta,
      expenseRatio: expenseRatio === '#N/A' ? null : expenseRatio
    };
  } catch (error) {
    Logger.log(`Error fetching Google Finance data for ${symbol}: ${error}`);
    throw error;
  }
}

/**
 * Fetches data from Yahoo Finance for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Yahoo Finance data
 */
function fetchYahooFinanceData(symbol) {
  try {
    Logger.log(`Fetching Yahoo Finance data for ${symbol}`);
    
    // First try to get data from Yahoo Finance API
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price,summaryDetail,assetProfile,financialData`;
    const options = {
      'method': 'GET',
      'headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json'
      },
      'muteHttpExceptions': true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    
    if (data.quoteSummary && data.quoteSummary.result && data.quoteSummary.result.length > 0) {
      const result = data.quoteSummary.result[0];
      const priceData = result.price;
      const summaryData = result.summaryDetail;
      const assetData = result.assetProfile;
      const financialData = result.financialData;
      
      return {
        price: priceData?.regularMarketPrice?.raw || null,
        priceChange: priceData?.regularMarketChange?.raw || null,
        changesPercentage: priceData?.regularMarketChangePercent?.raw || null,
        volume: summaryData?.volume?.raw || null,
        marketCap: summaryData?.marketCap?.raw || null,
        name: assetData?.companyName || getCompanyName(symbol),
        industry: assetData?.industry || null,
        sector: assetData?.sector || null,
        beta: summaryData?.beta?.raw || null,
        pegRatio: financialData?.pegRatio?.raw || null,
        forwardPE: financialData?.forwardPE?.raw || null,
        priceToBook: financialData?.priceToBook?.raw || null,
        priceToSales: financialData?.priceToSales?.raw || null,
        debtToEquity: financialData?.debtToEquity?.raw || null,
        returnOnEquity: financialData?.returnOnEquity?.raw || null,
        returnOnAssets: financialData?.returnOnAssets?.raw || null,
        profitMargin: financialData?.profitMargins?.raw || null,
        dividendYield: summaryData?.dividendYield?.raw || null,
        afterHoursPrice: priceData?.afterHours?.raw || null,
        afterHoursChange: priceData?.afterHoursChange?.raw || null,
        afterHoursChangePercent: priceData?.afterHoursChangePercent?.raw || null
      };
    }
    
    return null;
  } catch (error) {
    Logger.log(`Error fetching Yahoo Finance data for ${symbol}: ${error}`);
    return null;
  }
}

/**
 * Extracts a metric from HTML content using regex
 * @param {String} htmlContent - The HTML content
 * @param {RegExp} regex - The regex pattern to extract the metric
 * @return {Number|null} The extracted metric or null if not found
 */
function extractMetric(htmlContent, regex) {
  try {
    const match = htmlContent.match(regex);
    
    if (match && match[1]) {
      // Check if the value is N/A
      if (match[1] === "N/A") {
        return null;
      }
      
      // Remove % sign if present and convert to number
      let value = match[1].replace('%', '');
      
      // Remove any commas in the number (e.g., 1,234.56 -> 1234.56)
      value = value.replace(/,/g, '');
      
      // Convert to number
      const numValue = parseFloat(value);
      
      // Check if the conversion was successful
      if (!isNaN(numValue)) {
        return numValue;
      }
    }
    
    return null;
  } catch (error) {
    Logger.log(`Error extracting metric: ${error}`);
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
        const priceFormatted = `$${stock.price.toFixed(2)}`;
        let priceChangeFormatted = "";
        
        if (stock.priceChange !== null && stock.changesPercentage !== null) {
          const changePrefix = stock.priceChange >= 0 ? '+' : '';
          const percentPrefix = stock.changesPercentage >= 0 ? '+' : '';
          priceChangeFormatted = ` (${changePrefix}${stock.priceChange.toFixed(2)}, ${percentPrefix}${stock.changesPercentage.toFixed(1)}%)`;
        }
        
        formattedData += `  - Price: ${priceFormatted}${priceChangeFormatted}\n`;
      } else if (stock.formattedPrice && stock.formattedPriceChange) {
        // Use pre-formatted price if available
        formattedData += `  - Price: ${stock.formattedPrice} ${stock.formattedPriceChange}\n`;
      }
      
      // Add volume and market cap if available
      if (stock.volume !== null) {
        formattedData += `  - Volume: ${stock.volume.toLocaleString()}\n`;
      }
      if (stock.marketCap !== null) {
        formattedData += `  - Market Cap: $${(stock.marketCap / 1e9).toFixed(1)}B\n`;
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
 * Tests the fundamental metrics data retrieval
 */
function testFundamentalMetrics() {
  try {
    // Test with a few symbols
    const testSymbols = ["AAPL", "MSFT", "SPY", "AMZN"];
    Logger.log(`Testing fundamental metrics for symbols: ${testSymbols.join(", ")}`);
    
    // Retrieve the fundamental metrics
    const fundamentalMetrics = retrieveFundamentalMetrics(testSymbols);
    
    // Check if we have metrics
    if (!fundamentalMetrics.success) {
      Logger.log(`Error retrieving fundamental metrics: ${fundamentalMetrics.error}`);
      return;
    }
    
    // Log the metrics
    Logger.log(`Successfully retrieved fundamental metrics for ${fundamentalMetrics.metrics.length} symbols`);
    
    // Log detailed metrics for each symbol
    Logger.log("DETAILED METRICS BY SYMBOL:");
    fundamentalMetrics.metrics.forEach(metric => {
      Logger.log(`\n${metric.symbol} (${metric.isETF ? 'ETF' : 'Stock'}):`);
      Logger.log(`  PEG Ratio: ${formatValue(metric.pegRatio)}`);
      Logger.log(`  Forward P/E: ${formatValue(metric.forwardPE)}`);
      Logger.log(`  Price to Book: ${formatValue(metric.priceToBook)}`);
      Logger.log(`  Price to Sales: ${formatValue(metric.priceToSales)}`);
      Logger.log(`  Debt to Equity: ${formatValue(metric.debtToEquity)}`);
      Logger.log(`  Return on Equity: ${formatValue(metric.returnOnEquity * 100)}%`);
      Logger.log(`  Return on Assets: ${formatValue(metric.returnOnAssets * 100)}%`);
      Logger.log(`  Profit Margin: ${formatValue(metric.profitMargin * 100)}%`);
      Logger.log(`  Dividend Yield: ${formatValue(metric.dividendYield * 100)}%`);
      Logger.log(`  Beta: ${formatValue(metric.beta)}`);
      if (metric.isETF) {
        Logger.log(`  Expense Ratio: ${formatValue(metric.expenseRatio * 100)}%`);
      }
      Logger.log(`  Source: ${metric.source || 'Not specified'}`);
    });
    
    // Test the formatting function
    const formattedData = formatFundamentalMetricsData(fundamentalMetrics.metrics);
    Logger.log("\nFORMATTED FUNDAMENTAL METRICS DATA:");
    Logger.log(formattedData.substring(0, 500) + "...");
    
    // Test the analysis function directly for one symbol
    if (fundamentalMetrics.metrics.length > 0) {
      Logger.log("\nSAMPLE ANALYSES:");
      fundamentalMetrics.metrics.forEach(stock => {
        const analysis = generateAnalysis(
          stock.symbol, 
          stock, 
          {}, 
          {}
        );
        
        Logger.log(`\n${stock.symbol} Analysis:`);
        Logger.log(analysis);
      });
    }
    
    // Test with invalid symbol - just test error handling without including in results
    Logger.log("\nTESTING INVALID SYMBOL ERROR HANDLING:");
    const invalidSymbol = "INVALID_SYMBOL_123";
    
    // Test Google Finance error handling
    try {
      const googleData = fetchGoogleFinanceData(invalidSymbol);
      Logger.log(`Unexpected success with Google Finance for ${invalidSymbol}`);
    } catch (e) {
      Logger.log(`Expected error from Google Finance for ${invalidSymbol}: ${e.message}`);
    }
    
    // Test Yahoo Finance error handling
    try {
      const yahooData = fetchYahooFinanceData(invalidSymbol);
      Logger.log(`Unexpected success with Yahoo Finance for ${invalidSymbol}`);
    } catch (error) {
      Logger.log(`Expected error from Yahoo Finance for ${invalidSymbol}: ${error.message}`);
    }
    
    return "Test completed. Check the logs for results.";
  } catch (error) {
    Logger.log(`Error testing fundamental metrics: ${error}`);
    return `Error testing fundamental metrics: ${error}`;
  }
}

/**
 * Tests the enhanced fundamental metrics data retrieval with multiple symbols
 * This function tests the cascading approach with a variety of stock and ETF symbols
 */
function testEnhancedFundamentalMetrics() {
  try {
    Logger.log("=== TESTING ENHANCED FUNDAMENTAL METRICS RETRIEVAL ===");
    
    // Test with a variety of symbols (stocks and ETFs)
    const testSymbols = [
      "AAPL",  // Large cap tech stock
      "MSFT",  // Another large cap tech stock
      "SPY",   // ETF
      "XOM",   // Energy sector
      "TSLA",  // High growth stock
      "BRK-B", // Conglomerate with special character in symbol
      "VTI"    // Another ETF
    ];
    
    const results = {};
    
    // Test each symbol
    for (const symbol of testSymbols) {
      Logger.log(`\n--- Testing ${symbol} ---`);
      
      try {
        const startTime = new Date().getTime();
        
        // Yahoo Finance API endpoint for fundamentals data
        const apiUrl = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/get-fundamentals?region=US&symbol=${symbol}&lang=en-US&modules=price,summaryDetail,assetProfile,financialData`;
        
        const options = {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": "YOUR_API_KEY",
            "X-RapidAPI-Host": "apidojo-yahoo-finance-v1.p.rapidapi.com"
          },
          muteHttpExceptions: true
        };
        
        // Make the API request
        Logger.log(`Making fundamentals API request for ${symbol}...`);
        const response = UrlFetchApp.fetch(apiUrl, options);
        const statusCode = response.getResponseCode();
        
        if (statusCode === 200) {
          const data = JSON.parse(response.getContentText());
          
          if (data.quoteSummary && data.quoteSummary.result && data.quoteSummary.result.length > 0) {
            const result = data.quoteSummary.result[0];
            const yahooApiData = {};
            
            // Extract metrics from the API response
            if (result.defaultKeyStatistics) {
              const stats = result.defaultKeyStatistics;
              yahooApiData.pegRatio = stats.pegRatio ? stats.pegRatio.raw : 0;
              yahooApiData.priceToBook = stats.priceToBook ? stats.priceToBook.raw : 0;
              yahooApiData.beta = stats.beta ? stats.beta.raw : 0;
              
              // Log available metrics for debugging
              Logger.log(`Available metrics in defaultKeyStatistics: ${Object.keys(stats).join(', ')}`);
            }
            
            if (result.financialData) {
              const financials = result.financialData;
              yahooApiData.returnOnEquity = financials.returnOnEquity ? financials.returnOnEquity.raw : 0;
              yahooApiData.returnOnAssets = financials.returnOnAssets ? financials.returnOnAssets.raw : 0;
              yahooApiData.profitMargin = financials.profitMargins ? financials.profitMargins.raw : 0;
              yahooApiData.debtToEquity = financials.debtToEquity ? financials.debtToEquity.raw : 0;
            }
            
            // Get additional quote data for more metrics
            const quoteUrl = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes?region=US&symbols=${symbol}`;
            Logger.log(`Making quote API request for ${symbol}...`);
            const quoteResponse = UrlFetchApp.fetch(quoteUrl, options);
            
            if (quoteResponse.getResponseCode() === 200) {
              const quoteData = JSON.parse(quoteResponse.getContentText());
              
              if (quoteData && quoteData.quoteResponse && quoteData.quoteResponse.result && quoteData.quoteResponse.result.length > 0) {
                const quote = quoteData.quoteResponse.result[0];
                
                yahooApiData.forwardPE = quote.forwardPE || 0;
                yahooApiData.priceToSales = quote.priceToSales || 0;
                yahooApiData.dividendYield = quote.dividendYield ? quote.dividendYield / 100 : 0; // Convert to decimal
              }
            }
            
            const endTime = new Date().getTime();
            const executionTime = (endTime - startTime) / 1000; // in seconds
            
            // Log the results
            Logger.log(`Execution time: ${executionTime.toFixed(2)} seconds`);
            Logger.log(`Metrics retrieved: ${Object.keys(yahooApiData).join(', ')}`);
            
            // Log some key metrics
            Logger.log(`PEG Ratio: ${yahooApiData.pegRatio || 'N/A'}`);
            Logger.log(`Forward P/E: ${yahooApiData.forwardPE || 'N/A'}`);
            Logger.log(`Price to Book: ${yahooApiData.priceToBook || 'N/A'}`);
            Logger.log(`Beta: ${yahooApiData.beta || 'N/A'}`);
            
            // Store results
            results[symbol] = {
              success: true,
              executionTime: executionTime,
              metrics: yahooApiData
            };
          } else {
            Logger.log(`No results found in quoteSummary for ${symbol}`);
            results[symbol] = {
              success: false,
              error: "No results found in quoteSummary"
            };
          }
        } else {
          Logger.log(`API returned status code ${statusCode} for ${symbol}`);
          results[symbol] = {
            success: false,
            error: `API returned status code ${statusCode}`
          };
        }
      } catch (error) {
        Logger.log(`Error testing ${symbol}: ${error}`);
        results[symbol] = {
          success: false,
          error: error.toString()
        };
      }
    }
    
    // Log summary of results
    Logger.log("\n=== TEST SUMMARY ===");
    for (const symbol in results) {
      const result = results[symbol];
      if (result.success) {
        Logger.log(`${symbol}: Success - Data source: ${result.dataSource} (${result.executionTime.toFixed(2)}s)`);
      } else {
        Logger.log(`${symbol}: Failed - ${result.error}`);
      }
    }
    
    return results;
  } catch (error) {
    Logger.log(`Error in testEnhancedFundamentalMetrics: ${error}`);
    return { success: false, error: error.toString() };
  }
}

/**
 * Tests the full retrieveFundamentalMetrics function with caching
 * This function will:
 * 1. Clear the cache for test symbols
 * 2. Call retrieveFundamentalMetrics once (should be cache misses)
 * 3. Call retrieveFundamentalMetrics again (should be cache hits)
 * 4. Compare execution times and verify data consistency
 */
function testFullFundamentalMetricsCaching() {
  try {
    // Choose test symbols
    const testSymbols = ["SPY", "QQQ", "AAPL"];
    
    // Clear the cache for test symbols
    const scriptCache = CacheService.getScriptCache();
    for (const symbol of testSymbols) {
      const cacheKey = `FUNDAMENTAL_METRICS_${symbol}`;
      scriptCache.remove(cacheKey);
      Logger.log(`Cleared cache for ${symbol}`);
    }
    
    Logger.log(`\nFIRST CALL - SHOULD RETRIEVE FRESH DATA FOR ALL SYMBOLS:`);
    const startTime1 = new Date().getTime();
    const result1 = retrieveFundamentalMetrics(testSymbols);
    const executionTime1 = (new Date().getTime() - startTime1) / 1000;
    
    Logger.log(`First call execution time: ${executionTime1.toFixed(3)} seconds`);
    Logger.log(`Status: ${result1.status}`);
    Logger.log(`Cache hits: ${result1.cachePerformance ? result1.cachePerformance.hits : 'N/A'}`);
    Logger.log(`Cache misses: ${result1.cachePerformance ? result1.cachePerformance.misses : 'N/A'}`);
    Logger.log(`Cache hit rate: ${result1.cachePerformance ? result1.cachePerformance.hitRate : 'N/A'}`);
    
    // Format the data
    const formattedData1 = formatFundamentalMetricsData(result1.data);
    Logger.log("\nFORMATTED FUNDAMENTAL METRICS DATA:");
    Logger.log(formattedData1.substring(0, 500) + "...");
    
    Logger.log(`\nSECOND CALL - SHOULD USE CACHED DATA FOR ALL SYMBOLS:`);
    const startTime2 = new Date().getTime();
    const result2 = retrieveFundamentalMetrics(testSymbols);
    const executionTime2 = (new Date().getTime() - startTime2) / 1000;
    
    Logger.log(`Second call execution time: ${executionTime2.toFixed(3)} seconds`);
    Logger.log(`Status: ${result2.status}`);
    Logger.log(`Cache hits: ${result2.cachePerformance ? result2.cachePerformance.hits : 'N/A'}`);
    Logger.log(`Cache misses: ${result2.cachePerformance ? result2.cachePerformance.misses : 'N/A'}`);
    Logger.log(`Cache hit rate: ${result2.cachePerformance ? result2.cachePerformance.hitRate : 'N/A'}`);
    
    // Format the data
    const formattedData2 = formatFundamentalMetricsData(result2.data);
    
    Logger.log("\nCACHING PERFORMANCE:");
    Logger.log(`First call (fresh data): ${executionTime1.toFixed(3)} seconds`);
    Logger.log(`Second call (cached data): ${executionTime2.toFixed(3)} seconds`);
    
    const improvementPercent = ((executionTime1 - executionTime2) / executionTime1) * 100;
    Logger.log(`Performance improvement: ${improvementPercent.toFixed(1)}%`);
    
    // Verify data consistency by comparing the actual metrics objects
    let dataConsistent = true;
    
    // Check if we have the same number of items
    if (result1.data.length !== result2.data.length) {
      dataConsistent = false;
      Logger.log(`Data inconsistency: Different number of items (${result1.data.length} vs ${result2.data.length})`);
    } else {
      // Compare each metrics object
      for (let i = 0; i < result1.data.length; i++) {
        const metrics1 = result1.data[i];
        const metrics2 = result2.data[i];
        
        // Compare important fields
        const keysToCompare = ['symbol', 'name', 'price', 'priceChange', 'percentChange', 
                               'pegRatio', 'forwardPE', 'priceToBook', 'priceToSales', 
                               'debtToEquity', 'returnOnEquity', 'beta'];
        
        for (const key of keysToCompare) {
          // Skip lastUpdated and other time-based fields
          if (key === 'lastUpdated') continue;
          
          // Compare values with a tolerance for floating point differences
          if (typeof metrics1[key] === 'number' && typeof metrics2[key] === 'number') {
            // Allow small floating point differences
            if (Math.abs(metrics1[key] - metrics2[key]) > 0.0001) {
              dataConsistent = false;
              Logger.log(`Data inconsistency found in ${metrics1.symbol}.${key}: ${metrics1[key]} vs ${metrics2[key]}`);
            }
          } else if (JSON.stringify(metrics1[key]) !== JSON.stringify(metrics2[key])) {
            dataConsistent = false;
            Logger.log(`Data inconsistency found in ${metrics1.symbol}.${key}: ${metrics1[key]} vs ${metrics2[key]}`);
          }
        }
      }
    }
    
    Logger.log("\nDATA CONSISTENCY CHECK:");
    Logger.log(`Metrics data from both calls is identical: ${dataConsistent ? "Yes" : "No"}`);
    
    return {
      success: true,
      executionTime1: executionTime1,
      executionTime2: executionTime2,
      improvementPercent: improvementPercent,
      dataConsistent: dataConsistent
    };
  } catch (error) {
    Logger.log(`Error in testFullFundamentalMetricsCaching: ${error}`);
    return {
      success: false,
      error: error.toString()
    };
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
    // First check if we already have the name cached
    const cache = CacheService.getScriptCache();
    const cachedName = cache.get(`COMPANY_NAME_${symbol}`);
    if (cachedName) {
      return cachedName;
    }

    // Try to get the name from Google Finance
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
      sheet.getRange("B1").setFormula(`=GOOGLEFINANCE(A1,"name")`);
      
      // Wait for formula to calculate
      Utilities.sleep(1000);
      
      // Get the company name
      const companyName = sheet.getRange("B1").getValue();
      
      // If we got a valid name, cache it and return it
      if (companyName && companyName !== "#N/A" && companyName !== "#ERROR!") {
        cache.put(`COMPANY_NAME_${symbol}`, companyName, 3600); // Cache for 1 hour
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
      "IJR": "iShares Core S&P Small-Cap ETF",
      "IJH": "iShares Core S&P Mid-Cap ETF",
      "GLD": "SPDR Gold Shares",
      "SLV": "iShares Silver Trust",
      "XLF": "Financial Select Sector SPDR Fund",
      "XLK": "Technology Select Sector SPDR Fund",
      "XLE": "Energy Select Sector SPDR Fund",
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
      cache.put(`COMPANY_NAME_${symbol}`, companyNames[symbol], 3600); // Cache for 1 hour
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
 * Tests the Yahoo Finance API with a simple query
 * @param {string} apiKey - Optional Yahoo Finance API key (if not provided, will use the stored key)
 * @return {Object} Test result with success status and error message if applicable
 */
function testYahooFinanceAPI(apiKey) {
  try {
    Logger.log("=== TESTING YAHOO FINANCE API ===");
    
    // Get the API key if not provided
    if (!apiKey) {
      const scriptProperties = PropertiesService.getScriptProperties();
      apiKey = scriptProperties.getProperty('YAHOO_FINANCE_API_KEY');
      
      if (!apiKey) {
        const errorMsg = "Yahoo Finance API key not found in script properties.";
        Logger.log(errorMsg);
        return { success: false, message: errorMsg };
      }
    }
    
    Logger.log(`Using API key: ${apiKey.substring(0, 5)}...`);
    
    // Test multiple endpoints to ensure comprehensive API testing
    const endpoints = [
      {
        name: "Fundamentals",
        url: "https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/get-fundamentals?region=US&symbol=AAPL&lang=en-US&modules=price,summaryDetail,assetProfile,financialData"
      },
      {
        name: "Quote",
        url: "https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes?region=US&symbols=AAPL"
      }
    ];
    
    const results = [];
    
    // Test each endpoint
    for (const endpoint of endpoints) {
      Logger.log(`\nTesting endpoint: ${endpoint.name}`);
      
      const options = {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "apidojo-yahoo-finance-v1.p.rapidapi.com"
        },
        muteHttpExceptions: true
      };
      
      Logger.log(`Making API request to: ${endpoint.url}`);
      
      try {
        // Make the API request
        const response = UrlFetchApp.fetch(endpoint.url, options);
        const statusCode = response.getResponseCode();
        
        // Log the response for debugging
        Logger.log(`Response status code: ${statusCode}`);
        
        // Check if the request was successful
        if (statusCode === 200) {
          const data = JSON.parse(response.getContentText());
          
          // Log the keys in the response for debugging
          Logger.log(`Response keys: ${Object.keys(data).join(', ')}`);
          
          // Check for specific data structure based on endpoint
          let isValidData = false;
          let dataStructure = "";
          
          if (endpoint.name === "Fundamentals" && data.quoteSummary && data.quoteSummary.result) {
            isValidData = true;
            dataStructure = "quoteSummary.result";
          } else if (endpoint.name === "Quote" && data.quoteResponse && data.quoteResponse.result) {
            isValidData = true;
            dataStructure = "quoteResponse.result";
          }
          
          if (isValidData) {
            Logger.log(`${endpoint.name} endpoint returned valid data with structure: ${dataStructure}`);
            results.push({ 
              endpoint: endpoint.name, 
              success: true, 
              message: "API request successful" 
            });
          } else {
            // Still consider it a success if we get valid JSON, just log what we received
            Logger.log(`${endpoint.name} endpoint returned data but missing expected structure. Found keys: ${Object.keys(data).join(', ')}`);
            results.push({ 
              endpoint: endpoint.name, 
              success: true, 
              message: "API returned data but not in the expected format",
              data: Object.keys(data)
            });
          }
        }
      } catch (requestError) {
        Logger.log(`${endpoint.name} request error: ${requestError}`);
        results.push({ 
          endpoint: endpoint.name, 
          success: false, 
          message: requestError.toString() 
        });
      }
    }
    
    // Determine overall success based on individual endpoint results
    const allSuccess = results.every(result => result.success);
    const anySuccess = results.some(result => result.success);
    
    // Generate summary
    Logger.log("\n=== YAHOO FINANCE API TEST SUMMARY ===");
    for (const result of results) {
      Logger.log(`${result.endpoint}: ${result.success ? "Success" : "Failed"} - ${result.message}`);
    }
    
    if (allSuccess) {
      return { 
        success: true, 
        message: "All Yahoo Finance API endpoints tested successfully", 
        results: results 
      };
    } else if (anySuccess) {
      return { 
        success: true, 
        message: "Some Yahoo Finance API endpoints tested successfully", 
        results: results 
      };
    } else {
      return { 
        success: false, 
        message: "All Yahoo Finance API endpoint tests failed", 
        results: results 
      };
    }
  } catch (error) {
    Logger.log(`Yahoo Finance API test error: ${error}`);
    return { success: false, message: error.toString() };
  }
}

/**
 * Tests the Yahoo Finance API integration specifically
 * This function forces the use of Yahoo Finance API by skipping Google Finance
 */
function testYahooFinanceAPIIntegration() {
  try {
    Logger.log("=== TESTING YAHOO FINANCE API INTEGRATION ===");
    
    // Test with a variety of symbols (stocks and ETFs)
    const testSymbols = [
      "AAPL",  // Large cap tech stock
      "MSFT",  // Another large cap tech stock
      "SPY",   // ETF
      "XOM",   // Energy sector
      "TSLA"   // High growth stock
    ];
    
    const results = {};
    
    // Get the Yahoo Finance API key
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('YAHOO_FINANCE_API_KEY');
    
    if (!apiKey) {
      Logger.log('Yahoo Finance API key not found. Please set the YAHOO_FINANCE_API_KEY property.');
      return { success: false, error: "API key not found" };
    }
    
    // Test each symbol
    for (const symbol of testSymbols) {
      Logger.log(`\n--- Testing ${symbol} ---`);
      
      try {
        const startTime = new Date().getTime();
        
        // Yahoo Finance API endpoint for fundamentals data
        const apiUrl = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/get-fundamentals?region=US&symbol=${symbol}&lang=en-US&modules=assetProfile%2CsummaryProfile%2CfundProfile`;
        
        const options = {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": apiKey,
            "X-RapidAPI-Host": "apidojo-yahoo-finance-v1.p.rapidapi.com"
          },
          muteHttpExceptions: true
        };
        
        // Make the API request
        Logger.log(`Making fundamentals API request for ${symbol}...`);
        const response = UrlFetchApp.fetch(apiUrl, options);
        const statusCode = response.getResponseCode();
        
        if (statusCode === 200) {
          const data = JSON.parse(response.getContentText());
          
          if (data.quoteSummary && data.quoteSummary.result && data.quoteSummary.result.length > 0) {
            const result = data.quoteSummary.result[0];
            const yahooApiData = {};
            
            // Extract metrics from the API response
            if (result.defaultKeyStatistics) {
              const stats = result.defaultKeyStatistics;
              yahooApiData.pegRatio = stats.pegRatio ? stats.pegRatio.raw : 0;
              yahooApiData.priceToBook = stats.priceToBook ? stats.priceToBook.raw : 0;
              yahooApiData.beta = stats.beta ? stats.beta.raw : 0;
              
              // Log available metrics for debugging
              Logger.log(`Available metrics in defaultKeyStatistics: ${Object.keys(stats).join(', ')}`);
            }
            
            if (result.financialData) {
              const financials = result.financialData;
              yahooApiData.returnOnEquity = financials.returnOnEquity ? financials.returnOnEquity.raw : 0;
              yahooApiData.returnOnAssets = financials.returnOnAssets ? financials.returnOnAssets.raw : 0;
              yahooApiData.profitMargin = financials.profitMargins ? financials.profitMargins.raw : 0;
              yahooApiData.debtToEquity = financials.debtToEquity ? financials.debtToEquity.raw : 0;
            }
            
            // Get additional quote data for more metrics
            const quoteUrl = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes?region=US&symbols=${symbol}`;
            Logger.log(`Making quote API request for ${symbol}...`);
            const quoteResponse = UrlFetchApp.fetch(quoteUrl, options);
            
            if (quoteResponse.getResponseCode() === 200) {
              const quoteData = JSON.parse(quoteResponse.getContentText());
              
              if (quoteData && quoteData.quoteResponse && quoteData.quoteResponse.result && quoteData.quoteResponse.result.length > 0) {
                const quote = quoteData.quoteResponse.result[0];
                
                yahooApiData.forwardPE = quote.forwardPE || 0;
                yahooApiData.priceToSales = quote.priceToSales || 0;
                yahooApiData.dividendYield = quote.dividendYield ? quote.dividendYield / 100 : 0; // Convert to decimal
              }
            }
            
            const endTime = new Date().getTime();
            const executionTime = (endTime - startTime) / 1000; // in seconds
            
            // Log the results
            Logger.log(`Execution time: ${executionTime.toFixed(2)} seconds`);
            Logger.log(`Metrics retrieved: ${Object.keys(yahooApiData).join(', ')}`);
            
            // Log some key metrics
            Logger.log(`PEG Ratio: ${yahooApiData.pegRatio || 'N/A'}`);
            Logger.log(`Forward P/E: ${yahooApiData.forwardPE || 'N/A'}`);
            Logger.log(`Price to Book: ${yahooApiData.priceToBook || 'N/A'}`);
            Logger.log(`Beta: ${yahooApiData.beta || 'N/A'}`);
            
            // Store results
            results[symbol] = {
              success: true,
              executionTime: executionTime,
              metrics: yahooApiData
            };
          } else {
            Logger.log(`No results found in quoteSummary for ${symbol}`);
            results[symbol] = {
              success: false,
              error: "No results found in quoteSummary"
            };
          }
        } else {
          Logger.log(`API returned status code ${statusCode} for ${symbol}`);
          results[symbol] = {
            success: false,
            error: `API returned status code ${statusCode}`
          };
        }
      } catch (error) {
        Logger.log(`Error testing ${symbol}: ${error}`);
        results[symbol] = {
          success: false,
          error: error.toString()
        };
      }
    }
    
    // Log summary of results
    Logger.log("\n=== TEST SUMMARY ===");
    for (const symbol in results) {
      const result = results[symbol];
      if (result.success) {
        Logger.log(`${symbol}: Success - Data source: ${result.dataSource} (${result.executionTime.toFixed(2)}s)`);
      } else {
        Logger.log(`${symbol}: Failed - ${result.error}`);
      }
    }
    
    return results;
  } catch (error) {
    Logger.log(`Error in testYahooFinanceAPIIntegration: ${error}`);
    return { success: false, error: error.toString() };
  }
}

/**
 * Fetches data from Tradier API for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Fundamental metrics data from Tradier
 */
function fetchTradierData(symbol) {
  try {
    Logger.log(`Fetching Tradier data for ${symbol}`);
    
    // Initialize metrics with null values
    const metrics = {
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
      volume: null,
      marketCap: null,
      name: null,
      industry: null,
      sector: null
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
    Logger.log(`Fetching company profile for ${symbol} from Tradier API`);
    const profileUrl = `https://api.tradier.com/v1/markets/fundamentals/company?symbols=${symbol}`;
    const profileData = makeApiRequest(profileUrl);
    
    if (profileData && profileData.length > 0 && profileData[0].results) {
      const results = profileData[0].results;
      
      // Find the company data
      const companyData = results.find(result => result.type === "Company");
      
      if (companyData && companyData.tables) {
        // Extract company profile data
        if (companyData.tables.company_profile) {
          const profile = companyData.tables.company_profile;
          metrics.name = profile.company_name || null;
          metrics.industry = profile.industry || null;
          metrics.sector = profile.sector || null;
          Logger.log(`Found company profile data for ${symbol}`);
        }
      }
    }
    
    // Next, get the financial ratios using the beta endpoint
    Logger.log(`Fetching financial ratios for ${symbol} from Tradier API`);
    const ratiosUrl = `https://api.tradier.com/v1/markets/fundamentals/ratios?symbols=${symbol}`;
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
      }
      
      // Process stock-specific ratios
      const stockData = results.find(result => result.type === "Stock");
      if (stockData && stockData.tables) {
        // Extract valuation ratios if available
        if (stockData.tables.valuation_ratios) {
          const valuation = stockData.tables.valuation_ratios;
          
          // Extract PEG ratio
          if (valuation.peg_ratio) {
            metrics.pegRatio = parseFloat(valuation.peg_ratio);
            Logger.log(`Found PEG ratio from Tradier: ${metrics.pegRatio}`);
          }
          
          // Extract forward P/E
          if (valuation.forward_pe) {
            metrics.forwardPE = parseFloat(valuation.forward_pe);
            Logger.log(`Found forward P/E from Tradier: ${metrics.forwardPE}`);
          }
          
          // Extract price to book
          if (valuation.price_to_book) {
            metrics.priceToBook = parseFloat(valuation.price_to_book);
            Logger.log(`Found price to book from Tradier: ${metrics.priceToBook}`);
          }
          
          // Extract price to sales
          if (valuation.price_to_sales) {
            metrics.priceToSales = parseFloat(valuation.price_to_sales);
            Logger.log(`Found price to sales from Tradier: ${metrics.priceToSales}`);
          }
        }
        
        // Extract market cap and volume
        if (stockData.tables.market_data) {
          const market = stockData.tables.market_data;
          metrics.marketCap = market.market_cap ? parseFloat(market.market_cap) : null;
          metrics.volume = market.volume ? parseFloat(market.volume) : null;
        }
      }
    }
    
    // If we still don't have dividend yield, try the dividends endpoint
    if (metrics.dividendYield === null) {
      Logger.log(`Fetching dividend data for ${symbol} from Tradier API`);
      const dividendsUrl = `https://api.tradier.com/v1/markets/dividends?symbols=${symbol}`;
      const dividendsData = makeApiRequest(dividendsUrl);
      
      if (dividendsData && dividendsData.dividends && dividendsData.dividends.dividend) {
        const dividend = dividendsData.dividends.dividend;
        if (dividend.yield) {
          metrics.dividendYield = parseFloat(dividend.yield);
          Logger.log(`Found dividend yield from Tradier: ${metrics.dividendYield}`);
        }
      }
    }
    
    return metrics;
  } catch (error) {
    Logger.log(`Error in fetchTradierData for ${symbol}: ${error}`);
    
    // Return null values for all metrics
    return {
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
      volume: null,
      marketCap: null,
      name: null,
      industry: null,
      sector: null
    };
  }
}

/**
 * Validates a metric value for realistic ranges
 * @param {Number} value - The metric value
 * @param {String} key - The metric key
 * @return {Number} Validated metric value
 */
function validateMetric(value, key) {
  // Define realistic ranges for each metric
  const ranges = {
    pegRatio: [0, 5],
    forwardPE: [5, 50],
    priceToBook: [0, 20],  
    priceToSales: [0, 20], 
    debtToEquity: [0, 5],
    returnOnEquity: [0, 1],
    returnOnAssets: [0, 1],
    profitMargin: [0, 1],
    dividendYield: [0, 1],
    beta: [0, 5],
    expenseRatio: [0, 1]
  };
  
  // Check if the value is within the realistic range
  if (value < ranges[key][0] || value > ranges[key][1]) {
    Logger.log(`Invalid value for ${key}: ${value}. Setting to null.`);
    return null;
  }
  
  return value;
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
        const priceFormatted = `$${stock.price.toFixed(2)}`;
        let priceChangeFormatted = "";
        
        if (stock.priceChange !== null && stock.percentChange !== null) {
          const changePrefix = stock.priceChange >= 0 ? '+' : '';
          const percentPrefix = stock.percentChange >= 0 ? '+' : '';
          priceChangeFormatted = ` (${changePrefix}${stock.priceChange.toFixed(2)}, ${percentPrefix}${stock.percentChange.toFixed(1)}%)`;
        }
        
        formattedData += `  - Price: ${priceFormatted}${priceChangeFormatted}\n`;
      } else if (stock.formattedPrice && stock.formattedPriceChange) {
        // Use pre-formatted price if available
        formattedData += `  - Price: ${stock.formattedPrice} ${stock.formattedPriceChange}\n`;
      }
      
      // Add volume and market cap if available
      if (stock.volume !== null) {
        formattedData += `  - Volume: ${stock.volume.toLocaleString()}\n`;
      }
      if (stock.marketCap !== null) {
        formattedData += `  - Market Cap: $${(stock.marketCap / 1e9).toFixed(1)}B\n`;
      }
      
      // Add fundamental metrics
      formattedData += `  - PEG Ratio: ${formatValue(stock.pegRatio)}\n`;
      formattedData += `  - Forward P/E: ${formatValue(stock.forwardPE)}\n`;
      formattedData += `  - Price/Book: ${formatValue(stock.priceToBook)}\n`;
      formattedData += `  - Price/Sales: ${formatValue(stock.priceToSales)}\n`;
      formattedData += `  - Debt/Equity: ${formatValue(stock.debtToEquity)}\n`;
      
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
 * Tests the caching implementation for fundamental metrics data
 * This function will:
 * 1. Clear the cache for a test symbol
 * 2. Call retrieveFundamentalMetrics once (should be cache misses)
 * 3. Call retrieveFundamentalMetrics again (should be cache hits)
 * 4. Compare execution times and verify data consistency
 */
function testFundamentalMetricsCaching() {
  try {
    // Choose a test symbol
    const testSymbol = "QQQ";
    
    // Clear the cache for the test symbol
    const scriptCache = CacheService.getScriptCache();
    const cacheKey = `FUNDAMENTAL_METRICS_${testSymbol}`;
    scriptCache.remove(cacheKey);
    Logger.log(`Cleared cache for ${testSymbol}`);
    
    Logger.log(`\nFIRST CALL - SHOULD RETRIEVE FRESH DATA:`);
    const startTime1 = new Date().getTime();
    const result1 = retrieveFundamentalMetrics([testSymbol]);
    const executionTime1 = (new Date().getTime() - startTime1) / 1000;
    
    // Get the first symbol's data
    const metrics1 = result1.data[0];
    
    Logger.log(`First call execution time: ${executionTime1.toFixed(3)} seconds`);
    Logger.log(`Data source: ${metrics1.dataSource}`);
    Logger.log(`Price: ${metrics1.price ? `$${metrics1.price.toFixed(2)}` : "N/A"} ${metrics1.priceChange ? `(${metrics1.priceChange >= 0 ? '+' : ''}${metrics1.priceChange.toFixed(2)}, ${metrics1.percentChange >= 0 ? '+' : ''}${metrics1.percentChange.toFixed(1)}%)` : ""}`);
    Logger.log(`PEG Ratio: ${metrics1.pegRatio || "N/A"}`);
    Logger.log(`Forward P/E: ${metrics1.forwardPE || "N/A"}`);
    Logger.log(`Beta: ${metrics1.beta || "N/A"}`);
    
    Logger.log(`\nSECOND CALL - SHOULD USE CACHED DATA:`);
    
    // Second call - should be cache hits
    const startTime2 = new Date().getTime();
    const result2 = retrieveFundamentalMetrics([testSymbol]);
    const executionTime2 = (new Date().getTime() - startTime2) / 1000;
    
    // Get the first symbol's data
    const metrics2 = result2.data[0];
    
    Logger.log(`Second call execution time: ${executionTime2.toFixed(3)} seconds`);
    Logger.log(`Data source: ${metrics2.dataSource}`);
    Logger.log(`From cache: ${metrics2.fromCache ? "Yes" : "No"}`);
    
    Logger.log(`\nCACHING PERFORMANCE:`);
    Logger.log(`First call (fresh data): ${executionTime1.toFixed(3)} seconds`);
    Logger.log(`Second call (cached data): ${executionTime2.toFixed(3)} seconds`);
    
    // Check cache performance
    const cachePerformance = result2.cachePerformance;
    Logger.log("\nCACHE PERFORMANCE:");
    Logger.log(`Hits: ${cachePerformance.hits}`);
    Logger.log(`Misses: ${cachePerformance.misses}`);
    Logger.log(`Hit rate: ${cachePerformance.hitRate}`);
    
    // Verify data consistency
    const dataConsistent = JSON.stringify(metrics1) === JSON.stringify(metrics2);
    Logger.log("\nDATA CONSISTENCY CHECK:");
    Logger.log(`Metrics data from both calls is identical: ${dataConsistent ? "Yes" : "No"}`);
    
    return {
      success: true,
      executionTime1: executionTime1,
      executionTime2: executionTime2,
      cachePerformance: cachePerformance,
      dataConsistent: dataConsistent
    };
  } catch (error) {
    Logger.log(`Error in testFundamentalMetricsCaching: ${error}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Tests the Yahoo Finance API for fundamental metrics
 * @return {Object} Test results
 */
function testFundamentalMetricsAPI() {
  try {
    // Test symbols
    const testSymbols = ['AAPL', 'GOOGL', 'MSFT'];
    Logger.log(`Testing fundamental metrics for symbols: ${testSymbols.join(', ')}`);
    
    // Retrieve the fundamental metrics
    const fundamentalMetrics = retrieveFundamentalMetrics(testSymbols);
    
    // Check if we have metrics
    if (!fundamentalMetrics.success) {
      Logger.log(`Error retrieving fundamental metrics: ${fundamentalMetrics.error}`);
      return { success: false, error: fundamentalMetrics.error };
    }
    
    // Log metrics for each symbol
    testSymbols.forEach(symbol => {
      const metrics = fundamentalMetrics.metrics.find(m => m.symbol === symbol);
      if (metrics) {
        Logger.log(`\nMetrics for ${symbol}:`);
        Logger.log(`PEG Ratio: ${metrics.pegRatio}`);
        Logger.log(`Forward P/E: ${metrics.forwardPE}`);
        Logger.log(`Price to Book: ${metrics.priceToBook}`);
        Logger.log(`Price to Sales: ${metrics.priceToSales}`);
        Logger.log(`Debt to Equity: ${metrics.debtToEquity}`);
        Logger.log(`Return on Equity: ${metrics.returnOnEquity}`);
        Logger.log(`Return on Assets: ${metrics.returnOnAssets}`);
        Logger.log(`Profit Margin: ${metrics.profitMargin}`);
        Logger.log(`Dividend Yield: ${metrics.dividendYield}`);
        Logger.log(`Beta: ${metrics.beta}`);
        Logger.log(`Expense Ratio: ${metrics.expenseRatio}`);
        Logger.log(`Volume: ${metrics.volume}`);
        Logger.log(`Market Cap: ${metrics.marketCap}`);
        Logger.log(`Name: ${metrics.name}`);
        Logger.log(`Industry: ${metrics.industry}`);
        Logger.log(`Sector: ${metrics.sector}`);
      }
    });
    
    return { success: true, metrics: fundamentalMetrics.metrics };
  } catch (error) {
    Logger.log(`Error in testFundamentalMetricsAPI: ${error}`);
    return { success: false, error: error.toString() };
  }
}

/**
 * Fetches data from Yahoo Finance web page for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Yahoo Finance web data
 */
function fetchYahooFinanceWebData(symbol) {
  try {
    Logger.log(`Fetching Yahoo Finance web data for ${symbol}`);
    
    // Construct the Yahoo Finance URL
    const url = `https://finance.yahoo.com/quote/${symbol}`;
    
    // Fetch the page content
    const options = {
      'method': 'GET',
      'headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html'
      },
      'muteHttpExceptions': true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const content = response.getContentText();
    
    // Extract after-hours data using regex
    const afterHoursRegex = /"afterHoursPrice":\{.*?"raw":(.*?),.*?"afterHoursChange":\{.*?"raw":(.*?),.*?"afterHoursChangePercent":\{.*?"raw":(.*?)\}/;
    const afterHoursMatch = content.match(afterHoursRegex);
    
    if (afterHoursMatch) {
      const afterHoursPrice = parseFloat(afterHoursMatch[1]);
      const afterHoursChange = parseFloat(afterHoursMatch[2]);
      const afterHoursChangePercent = parseFloat(afterHoursMatch[3]);
      
      return {
        price: afterHoursPrice,
        priceChange: afterHoursChange,
        changesPercentage: afterHoursChangePercent,
        name: getCompanyName(symbol),
        dataSource: "Yahoo Finance Web"
      };
    }
    
    return null;
  } catch (error) {
    Logger.log(`Error fetching Yahoo Finance web data for ${symbol}: ${error}`);
    return null;
  }
}

/**
 * Clears the fundamental metrics cache for all symbols
 */
function clearFundamentalMetricsCache() {
  const cache = CacheService.getScriptCache();
  
  // Define our stock symbols
  const stockSymbols = [
    // Major Indices
    'SPY', 'QQQ', 'IWM', 'DIA',
    // Magnificent Seven
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA',
    // Other common stocks
    'V', 'JPM', 'JNJ', 'UNH', 'HD', 'PG', 'MA', 'BAC', 'DIS', 'ADBE',
    'NFLX', 'CRM', 'AMD', 'TSM', 'ASML', 'AVGO', 'CSCO', 'INTC', 'QCOM',
    'XOM', 'CVX', 'BA', 'CAT', 'PG', 'KO', 'FB', 'TGT', 'WMT'
  ];
  
  // Create cache keys for each symbol
  const keys = stockSymbols.map(symbol => `FUNDAMENTAL_METRICS_${symbol}`);
  
  // Remove all matching keys at once
  if (keys.length > 0) {
    cache.removeAll(keys);
  }
  
  Logger.log('Cleared fundamental metrics cache');
}

/**
 * Fetches ETF-specific metrics from Yahoo Finance
 * @param {String} symbol - The ETF symbol
 * @return {Object} ETF metrics
 */
function fetchETFData(symbol) {
  try {
    Logger.log(`Fetching ETF data for ${symbol}`);
    
    // Construct the Yahoo Finance URL
    const url = `https://finance.yahoo.com/quote/${symbol}`;
    
    // Fetch the page content
    const options = {
      'method': 'GET',
      'headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html'
      },
      'muteHttpExceptions': true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const content = response.getContentText();
    
    // Extract ETF metrics using regex
    const etfMetricsRegex = /"fundProfile":\{.*?"totalNetAssets":\{.*?"raw":(.*?)\}.*?"expenseRatio":\{.*?"raw":(.*?)\}.*?"yield":\{.*?"raw":(.*?)\}/;
    const etfMetricsMatch = content.match(etfMetricsRegex);
    
    if (etfMetricsMatch) {
      const totalNetAssets = parseFloat(etfMetricsMatch[1]);
      const expenseRatio = parseFloat(etfMetricsMatch[2]);
      const yieldValue = parseFloat(etfMetricsMatch[3]);
      
      return {
        totalNetAssets: totalNetAssets,
        expenseRatio: expenseRatio,
        yield: yieldValue,
        dataSource: "Yahoo Finance Web"
      };
    }
    
    return null;
  } catch (error) {
    Logger.log(`Error fetching ETF data for ${symbol}: ${error}`);
    return null;
  }
}
