// Stock Data Retriever - Google Apps Script implementation

// Cache duration in minutes
const CACHE_DURATION = 30;

/**
 * Main function to retrieve stock metrics
 * @param {string} symbol - Stock symbol to retrieve metrics for
 * @return {Object} Metrics object containing stock data
 */
function retrieveStockMetrics(symbol) {
  try {
    // Validate symbol and handle deprecated symbols
    if (symbol === 'FB') {
      throw new Error('FB is no longer a valid symbol. Facebook/Meta Platforms is now represented by META.');
    } else if (symbol === 'TWTR') {
      throw new Error('TWTR is no longer a valid symbol. Twitter/X is now represented by X.');
    }

    Logger.log(`\n=== Data Retrieval for ${symbol} ===`);
    
    // Check cache first (30-minute cache for stock metrics)
    const scriptCache = CacheService.getScriptCache();
    const cacheKey = `STOCK_METRICS_${symbol}`;
    
    // Get cached data
    const cachedData = scriptCache.get(cacheKey);
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData);
        const cacheTime = new Date(parsedData.lastUpdated);
        const currentTime = new Date();
        const cacheAgeMinutes = (currentTime - cacheTime) / (1000 * 60);
        
        if (cacheAgeMinutes < CACHE_DURATION) {
          Logger.log(`Using cached stock metrics for ${symbol} (less than ${CACHE_DURATION} minutes old)`);
          // Return exactly what we stored in cache
          return {
            ...parsedData,
            fromCache: true
          };
        } else {
          Logger.log(`Cached stock metrics for ${symbol} is more than ${CACHE_DURATION} minutes old`);
        }
      } catch (parseError) {
        Logger.log(`Error parsing cached data for ${symbol}: ${parseError}`);
        scriptCache.remove(cacheKey);
      }
    }
    // Track execution time
    const startTime = new Date().getTime();

    // --- Fallback Order: Yahoo Finance API -> Tradier -> Yahoo Search -> Yahoo Web -> FMP (core) -> FMP (ratios) -> Google Finance ---
    // Initialize metrics object (all fields null)
    let metrics = {
      symbol: symbol,
      price: null,
      priceChange: null,
      changesPercentage: null,
      volume: null,
      marketCap: null,
      company: null,
      industry: null,
      sector: null,
      beta: null,
      pegRatio: null,
      pegForwardRatio: null,
      forwardPE: null,
      priceToBook: null,
      priceToSales: null,
      debtToEquity: null,
      returnOnEquity: null,
      returnOnAssets: null,
      profitMargin: null,
      dividendYield: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
      dayHigh: null,
      dayLow: null,
      open: null,
      close: null,
      fiftyTwoWeekAverage: null,
      peRatio: null,
      dataSource: [],
      _fieldSources: {}
    };

    // Helper to merge and track sources
    function mergeMetrics(newData, source) {
      for (var key in newData) {
        if (metrics.hasOwnProperty(key)) {
          const newVal = newData[key];
          const currVal = metrics[key];
          const isValid = newVal !== null && typeof newVal !== 'undefined' && newVal !== '' && newVal !== 'N/A';
          // For company: allow set only if current is null/empty/N/A (never overwrite a valid value)
          if (
            key === 'company' &&
            (currVal === null || typeof currVal === 'undefined' || currVal === '' || currVal === 'N/A') && isValid
          ) {
            metrics[key] = newVal;
            metrics._fieldSources[key] = source;
            continue;
          }
          // For price: Only allow Yahoo to set price if Tradier did not provide one
          if (
            key === 'price' && source === 'YahooFinanceWeb' && metrics._fieldSources['price'] === 'Tradier'
          ) {
            // Skip assigning price from Yahoo if Tradier already set it
            Logger.log('[mergeMetrics] Skipping Yahoo price because Tradier already set price for ' + metrics.symbol);
            continue;
          }
          // For all other fields
          if (
            key !== 'company' &&
            (currVal === null || typeof currVal === 'undefined' || currVal === '' || currVal === 'N/A') && isValid
          ) {
            metrics[key] = newVal;
            metrics._fieldSources[key] = source;
          }
          // If current value is valid, only replace with another valid value (for non-company fields)
          else if (
            key !== 'company' &&
            isValid &&
            currVal !== null && typeof currVal !== 'undefined' && currVal !== '' && currVal !== 'N/A' &&
            newVal !== currVal
          ) {
            metrics[key] = newVal;
            metrics._fieldSources[key] = source;
          }
        }
      }
      if (source && metrics.dataSource.indexOf(source) === -1) {
        metrics.dataSource.push(source);
      }
    }

    // 1. Yahoo Finance API (off-hour pricing)
    try {
      const yahooMetrics = fetchYahooFinanceData(symbol);
      if (yahooMetrics) {
        mergeMetrics(yahooMetrics, 'YahooFinanceAPI');
      }
    } catch (e) {
      Logger.log('Yahoo Finance API fetch failed: ' + e);
    }

    // 2. Tradier
    try {
      const tradierMetrics = fetchTradierData(symbol);
      if (tradierMetrics && tradierMetrics.company && tradierMetrics.company !== '' && tradierMetrics.company !== 'N/A') {
        metrics.company = tradierMetrics.company;
        metrics._fieldSources['company'] = 'Tradier';
      }
      mergeMetrics(tradierMetrics, 'Tradier');
    } catch (e) {
      Logger.log('Tradier fetch failed: ' + e);
    }

    // 3. Yahoo Search (company, industry, sector)
    try {
      if (!metrics.company || !metrics.industry || !metrics.sector) {
        const yahooSearch = fetchYahooSearchData(symbol);
        if (yahooSearch) {
          if (!metrics.company && yahooSearch.company) { metrics.company = yahooSearch.company; metrics._fieldSources['company'] = 'YahooSearch'; }
          if (!metrics.industry && yahooSearch.industry) { metrics.industry = yahooSearch.industry; metrics._fieldSources['industry'] = 'YahooSearch'; }
          if (!metrics.sector && yahooSearch.sector) { metrics.sector = yahooSearch.sector; metrics._fieldSources['sector'] = 'YahooSearch'; }
          if (metrics.dataSource.indexOf('YahooSearch') === -1) metrics.dataSource.push('YahooSearch');
        }
      }
    } catch (e) {
      Logger.log('Yahoo Search fetch failed: ' + e);
    }

    // 4. Yahoo Finance Web
    try {
      const yahooWeb = fetchYahooFinanceWebData(symbol);
      if (yahooWeb) {
        mergeMetrics(yahooWeb, 'YahooFinanceWeb');
      }
    } catch (e) {
      Logger.log('Yahoo Finance Web fetch failed: ' + e);
    }

    // 5. FMP (core)
    try {
      const fmpCore = fetchFMPData(symbol);
      if (fmpCore) {
        mergeMetrics(fmpCore, 'FMP');
      }
    } catch (e) {
      Logger.log('FMP core fetch failed: ' + e);
    }

    // 6. FMP Ratios (NEW: separate ratios endpoint)
    try {
      const fmpRatios = fetchFMPRatios(symbol);
      if (fmpRatios) {
        mergeMetrics(fmpRatios, 'FMP Ratios');
      }
    } catch (e) {
      Logger.log('FMP ratios fetch failed: ' + e);
    }

    // Calculate percentage change if needed
    if (metrics.price !== null && metrics.priceChange !== null && metrics.changesPercentage === null) {
      metrics.changesPercentage = (metrics.priceChange / metrics.price) * 100;
      Logger.log(`Calculated changesPercentage for ${symbol}: ${metrics.changesPercentage}%`);
    }

    // Ensure dataSource is an array
    if (!Array.isArray(metrics.dataSource)) {
      metrics.dataSource = [];
    }

    // --- FALLBACK TO TRADIER PRICE AND DESCRIPTION ---
    if ((metrics.price === null || !isValidCompanyName(metrics.company))) {
      Logger.log('Still missing price or company, trying Tradier quote for both');
      try {
        var tradierQuote = fetchTradierQuote(symbol);
        if (tradierQuote) {
          if (metrics.price === null && tradierQuote.last != null) {
            metrics.price = tradierQuote.last;
          }
          if (!isValidCompanyName(metrics.company) && tradierQuote.description && isValidCompanyName(tradierQuote.description)) {
            metrics.company = tradierQuote.description;
          }
          if (metrics.close === null && tradierQuote.close != null) {
            metrics.close = tradierQuote.close;
          }
          if (metrics.priceChange === null && tradierQuote.change != null) {
            metrics.priceChange = tradierQuote.change;
          }
          if (metrics.changesPercentage === null && tradierQuote.change_percentage != null) {
            metrics.changesPercentage = tradierQuote.change_percentage;
          }
          if (metrics.volume === null && tradierQuote.volume != null) {
            metrics.volume = tradierQuote.volume;
          }
        }
      } catch (e) { Logger.log('Tradier quote fallback failed: ' + e); }
    }
    // --- FALLBACK TO FMP ---
    if (!isValidCompanyName(metrics.company)) {
      Logger.log('Still missing or invalid company name, trying FMP');
      try {
        const fmpData = fetchFMPData(symbol);
        if (fmpData && isValidCompanyName(fmpData.company)) {
          metrics.company = fmpData.company;
          if (fmpData.industry) metrics.industry = fmpData.industry;
          if (fmpData.sector) metrics.sector = fmpData.sector;
        }
      } catch (e) { Logger.log('FMP fallback failed: ' + e); }
    }
    // --- FINAL FALLBACK ---
    if (!isValidCompanyName(metrics.company)) {
      metrics.company = symbol; // Use symbol as company name if all sources fail
    }
    Logger.log(`Final Yahoo Finance metrics: price=${metrics.price}, company=${metrics.company}, volume=${metrics.volume}`);
    const hasEssentialData = metrics.price !== null && isValidCompanyName(metrics.company);
    if (hasEssentialData) {
      Logger.log(`Yahoo Finance API result data:`, {
        price: metrics.price,
        volume: metrics.volume,
        marketCap: metrics.marketCap,
        company: metrics.company,
        industry: metrics.industry,
        sector: metrics.sector
      });
      // Calculate execution time
      const executionTime = (new Date().getTime() - startTime) / 1000;
      Logger.log(`Retrieved metrics for ${symbol} in ${executionTime} seconds`);
      Logger.log(`Data sources used: ${metrics.dataSource.join(', ')}`);
      
      // Ensure we have at least a company name for the symbol
      // If all APIs failed to provide a company name, use the symbol as the name
      if (!metrics.company || metrics.company === 'N/A' || metrics.company === '') {
        Logger.log(`No company name found for ${symbol}, using symbol as name`);
        metrics.company = symbol;
        metrics._fieldSources['company'] = 'Fallback';
        if (metrics.dataSource.indexOf('Fallback') === -1) {
          metrics.dataSource.push('Fallback');
        }
      }
      
      // Ensure we have at least a price for the symbol
      // If all APIs failed to provide a price, use 0 as a placeholder
      if (metrics.price === null || isNaN(metrics.price)) {
        Logger.log(`No valid price found for ${symbol}, using 0 as placeholder`);
        metrics.price = 0;
        metrics._fieldSources['price'] = 'Fallback';
        if (metrics.dataSource.indexOf('Fallback') === -1) {
          metrics.dataSource.push('Fallback');
        }
      }
      
      // Cache the results
      metrics.lastUpdated = new Date().toISOString();
      scriptCache.put(cacheKey, JSON.stringify(metrics), 21600); // 6 hours cache
      
      // Return the metrics
      return {
        ...metrics,
        fromCache: false
      };
    } else {
      Logger.log(`Failed to retrieve essential data from Yahoo Finance API. Missing price or valid company name.`);
      return null;
    }
  } catch (error) {
    Logger.log(`Error in retrieveStockMetrics: ${error}`);
    throw error;
  }
}

/**
 * Fetches ratios from FMP API (separate endpoint)
 * @param {string} symbol - Stock symbol
 * @return {Object} Ratios object or null
 */
function fetchFMPRatios(symbol) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('FMP_API_KEY');
    if (!apiKey) {
      throw new Error('FMP API key not found');
    }
    const baseUrl = 'https://financialmodelingprep.com/api/v3';
    const ratiosUrl = `${baseUrl}/ratios/${symbol}?apikey=${apiKey}`;
    const response = UrlFetchApp.fetch(ratiosUrl, {
      muteHttpExceptions: true,
      headers: { 'Accept': 'application/json' }
    });
    if (response.getResponseCode() !== 200) {
      Logger.log(`FMP ratios API error: ${response.getContentText()}`);
      return null;
    }
    const ratiosData = JSON.parse(response.getContentText());
    if (!Array.isArray(ratiosData) || ratiosData.length === 0) {
      return null;
    }
    const r = ratiosData[0];
    return {
      peRatio: r.priceEarningsRatioTTM || r.peRatio || null,
      priceToSales: r.priceToSalesRatioTTM || r.priceToSalesRatio || null,
      returnOnAssets: r.returnOnAssetsTTM || r.returnOnAssets || null,
      profitMargin: r.netProfitMarginTTM || r.netProfitMargin || null,
      pegRatio: r.pegRatio || null,
      pegForwardRatio: r.forwardPEG || r.forwardPegRatio || null,
      forwardPE: r.forwardPE || null,
      dividendYield: r.dividendYield || null
    };
  } catch (e) {
    Logger.log('Error in fetchFMPRatios: ' + e);
    return null;
  }
}

/**
 * Fetches data from FMP API
 * @param {string} symbol - Stock symbol
 * @return {Object} Metrics object or null
 */
function fetchFMPData(symbol) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('FMP_API_KEY');
    if (!apiKey) {
      throw new Error('FMP API key not found');
    }

    const baseUrl = 'https://financialmodelingprep.com/api/v3';
    const profileUrl = `${baseUrl}/profile/${symbol}?apikey=${apiKey}`;
    const quoteUrl = `${baseUrl}/quote/${symbol}?apikey=${apiKey}`;
    const keyMetricsUrl = `${baseUrl}/key-metrics-ttm/${symbol}?apikey=${apiKey}`;
    const ratiosUrl = `${baseUrl}/ratios/${symbol}?apikey=${apiKey}`; // NEW: FMP ratios endpoint for forward PEG

    // Fetch profile data
    const profileResponse = UrlFetchApp.fetch(profileUrl, {
      muteHttpExceptions: true,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (profileResponse.getResponseCode() !== 200) {
      console.error(`FMP API error for profile: ${profileResponse.getContentText()}`);
      return null;
    }

    const profileData = JSON.parse(profileResponse.getContentText());
    if (!Array.isArray(profileData) || profileData.length === 0) {
      return null;
    }

    // Fetch quote data
    const quoteResponse = UrlFetchApp.fetch(quoteUrl, {
      muteHttpExceptions: true,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (quoteResponse.getResponseCode() !== 200) {
      console.error(`FMP API error for quote: ${quoteResponse.getContentText()}`);
      return null;
    }

    const quoteData = JSON.parse(quoteResponse.getContentText());
    if (!Array.isArray(quoteData) || quoteData.length === 0) {
      return null;
    }

    // Fetch key metrics
    const keyMetricsResponse = UrlFetchApp.fetch(keyMetricsUrl, {
      muteHttpExceptions: true,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (keyMetricsResponse.getResponseCode() !== 200) {
      console.error(`FMP API error for key metrics: ${keyMetricsResponse.getContentText()}`);
      return null;
    }

    const keyMetricsData = JSON.parse(keyMetricsResponse.getContentText());
    if (!Array.isArray(keyMetricsData) || keyMetricsData.length === 0) {
      return null;
    }

    // Fetch ratios data for forward PEG
    let pegForwardRatio = null;
    try {
      const ratiosResponse = UrlFetchApp.fetch(ratiosUrl, {
        muteHttpExceptions: true,
        headers: {
          'Accept': 'application/json'
        }
      });
      if (ratiosResponse.getResponseCode() === 200) {
        const ratiosData = JSON.parse(ratiosResponse.getContentText());
        if (Array.isArray(ratiosData) && ratiosData.length > 0) {
          pegForwardRatio = ratiosData[0].forwardPEG || ratiosData[0].forwardPegRatio || null;
        }
      }
    } catch (e) {
      // Ignore ratios endpoint errors
    }

    // Combine all data
    const metrics = {
      company: profileData[0].companyName,
      industry: profileData[0].industry,
      sector: profileData[0].sector,
      marketCap: profileData[0].marketCap,
      beta: profileData[0].beta,
      dividendYield: profileData[0].dividendYield,
      price: quoteData[0].price,
      priceChange: quoteData[0].change,
      changesPercentage: quoteData[0].changesPercentage * 100,
      volume: quoteData[0].volume,
      open: quoteData[0].open,
      close: quoteData[0].previousClose,
      dayHigh: quoteData[0].dayHigh,
      dayLow: quoteData[0].dayLow,
      fiftyTwoWeekHigh: quoteData[0].yearHigh,
      fiftyTwoWeekLow: quoteData[0].yearLow,
      pegRatio: keyMetricsData[0].pegRatio,
      pegForwardRatio: pegForwardRatio, // NEW FIELD
      forwardPE: keyMetricsData[0].forwardPE,
      priceToBook: keyMetricsData[0].pbRatioTTM,
      priceToSales: keyMetricsData[0].psRatioTTM,
      debtToEquity: keyMetricsData[0].debtToEquityTTM,
      returnOnEquity: keyMetricsData[0].roeTTM * 100,
      returnOnAssets: keyMetricsData[0].roaTTM * 100,
      profitMargin: keyMetricsData[0].netProfitMarginTTM * 100
    };

    return metrics;
  } catch (error) {
    console.error('Error in fetchFMPData:', error);
    return null;
  }
}

/**
 * Fetches fundamental metrics from Google Finance
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Google Finance data
 */
function fetchGoogleFinanceData(symbol) {
  try {
    console.log(`Fetching Google Finance data for ${symbol}`);
    
    // Create a temporary spreadsheet to get the data
    const tempSpreadsheet = SpreadsheetApp.create(`Temp Finance Data ${symbol}`);
    const sheet = tempSpreadsheet.getActiveSheet();
    
    // Set up GOOGLEFINANCE formulas
    sheet.getRange("A1").setValue(symbol);
    sheet.getRange("B1").setFormula(`=GOOGLEFINANCE(A1,"price")`);
    sheet.getRange("C1").setFormula(`=GOOGLEFINANCE(A1,"priceopen")`);
    sheet.getRange("D1").setFormula(`=GOOGLEFINANCE(A1,"volume")`);
    sheet.getRange("E1").setFormula(`=GOOGLEFINANCE(A1,"marketcap")`);
    sheet.getRange("F1").setFormula(`=GOOGLEFINANCE(A1,"beta")`);
    
    // Wait for formulas to calculate
    Utilities.sleep(1000);
    
    // Get the values (SANITIZED)
    const price = sanitizeMetricValue(sheet.getRange("B1").getValue());
    const openPrice = sanitizeMetricValue(sheet.getRange("C1").getValue());
    const volume = sanitizeMetricValue(sheet.getRange("D1").getValue());
    const marketCap = sanitizeMetricValue(sheet.getRange("E1").getValue());
    const beta = sanitizeMetricValue(sheet.getRange("F1").getValue());
    
    // Calculate price change and percentage change
    const priceChange = (price !== null && openPrice !== null) ? price - openPrice : null;
    const changesPercentage = (priceChange !== null && openPrice !== null && openPrice !== 0) ? (priceChange / openPrice) * 100 : null;
    
    // Get company name from the shared spreadsheet
    const companyData = getCompanyName(symbol);
    
    // Clean up
    DriveApp.getFileById(tempSpreadsheet.getId()).setTrashed(true);
    
    // Create metrics object (SANITIZED)
    const metrics = {
      price: price,
      priceChange: priceChange,
      changesPercentage: changesPercentage,
      volume: volume,
      marketCap: marketCap,
      beta: beta,
      company: companyData?.name || null,
      industry: companyData?.industry || null,
      sector: companyData?.sector || null,
      pegForwardRatio: null // NEW FIELD
    };
    
    // Detailed logging
    console.log(`Google Finance data for ${symbol}:`, metrics);
    
    return metrics;
  } catch (error) {
    console.error(`Error fetching Google Finance data for ${symbol}: ${error}`);
    console.error(`Error details:`, error.stack);
    return null;
  }
}

/**
 * Gets or creates a shared spreadsheet for Google Finance data
 * @return {Spreadsheet} The shared spreadsheet
 */
function getSharedFinanceSpreadsheet() {
  try {
    // Try to get the spreadsheet ID from script properties
    const scriptProperties = PropertiesService.getScriptProperties();
    let spreadsheetId = scriptProperties.getProperty('FINANCE_SPREADSHEET_ID');
    
    if (spreadsheetId) {
      try {
        // Try to open the existing spreadsheet
        const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
        if (spreadsheet) {
          return spreadsheet;
        }
      } catch (e) {
        console.error(`Existing finance spreadsheet not found: ${e.message}`);
        // If existing spreadsheet can't be opened, clear the ID and create a new one
        scriptProperties.deleteProperty('FINANCE_SPREADSHEET_ID');
        spreadsheetId = null;
      }
    }
    
    if (!spreadsheetId) {
      // Create a new spreadsheet
      const spreadsheet = SpreadsheetApp.create('Finance Data');
      spreadsheetId = spreadsheet.getId();
      
      // Save the ID to script properties
      scriptProperties.setProperty('FINANCE_SPREADSHEET_ID', spreadsheetId);
      
      // Set up the spreadsheet
      setupSpreadsheet();
      
      return spreadsheet;
    }
    
    throw new Error('Finance spreadsheet ID not configured');
    
  } catch (error) {
    console.error(`Error getting shared finance spreadsheet: ${error}`);
    throw error;
  }
}

/**
 * Fetches data from Yahoo Finance Web

 * @param {string} symbol - Stock symbol
 * @return {Object} Metrics object or null
 */
function fetchYahooFinanceWebData(symbol) {
  try {
    const url = `https://finance.yahoo.com/quote/${symbol}`;
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      }
    });

    if (response.getResponseCode() !== 200) {
      console.error(`Yahoo Finance Web error: ${response.getContentText()}`);
      return null;
    }

    const htmlContent = response.getContentText();

    // Check for error/captcha/block page
    if (
      htmlContent.includes('detected unusual traffic') ||
      htmlContent.includes('captcha') ||
      htmlContent.includes('To continue, please verify you are not a robot') ||
      htmlContent.includes('Access to this page has been denied')
    ) {
      Logger.log(`[YahooWeb] Blocked or error page detected for symbol: ${symbol}`);
      return null;
    }

    // Extract metrics using regex
    const pegRatioMatch = htmlContent.match(/PEG Ratio[^<]*<\/td>\s*<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const forwardPERatioMatch = htmlContent.match(/Forward P\/E[^<]*<\/td>\s*<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const priceToBookMatch = htmlContent.match(/Price\/Book[^<]*<\/td>\s*<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const priceToSalesMatch = htmlContent.match(/Price\/Sales[^<]*<\/td>\s*<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const debtToEquityMatch = htmlContent.match(/Total Debt\/Equity[^<]*<\/td>\s*<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const returnOnEquityMatch = htmlContent.match(/Return on Equity[^<]*<\/td>\s*<td[^>]*>([\d.,]+%|N\/A)<\/td>/is);
    const returnOnAssetsMatch = htmlContent.match(/Return on Assets[^<]*<\/td>\s*<td[^>]*>([\d.,]+%|N\/A)<\/td>/is);
    const profitMarginMatch = htmlContent.match(/Profit Margin[^<]*<\/td>\s*<td[^>]*>([\d.,]+%|N\/A)<\/td>/is);
    const betaMatch = htmlContent.match(/Beta \([^)]*\)[^<]*<\/td>\s*<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const dividendYieldMatch = htmlContent.match(/Dividend Yield[^<]*<\/td>\s*<td[^>]*>([\d.,]+%|N\/A)<\/td>/is);
    const pegForwardRatioMatch = htmlContent.match(/Forward PEG Ratio[^<]*<\/td>\s*<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    
    // Extract company information
    const companyMatch = htmlContent.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const industryMatch = htmlContent.match(/Industry[^<]*<\/span>\s*<span[^>]*>([^<]+)<\/span>/);
    const sectorMatch = htmlContent.match(/Sector[^<]*<\/span>\s*<span[^>]*>([^<]+)<\/span>/);
    
    // Extract price and market cap
    const priceMatch = htmlContent.match(/<fin-streamer[^>]*data-field=\"regularMarketPrice\"[^>]*>([\d.,]+)<\/fin-streamer>/);
    const marketCapMatch = htmlContent.match(/Market Cap[^<]*<\/td>\s*<td[^>]*>([\d.,]+\s*[A-Z]+|N\/A)<\/td>/is);
    
    // Extract volume
    const volumeMatch = htmlContent.match(/Volume[^<]*<\/td>\s*<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    
    // Create metrics object
    const metrics = {
      pegRatio: extractMetric(htmlContent, pegRatioMatch),
      forwardPE: extractMetric(htmlContent, forwardPERatioMatch),
      priceToBook: extractMetric(htmlContent, priceToBookMatch),
      priceToSales: extractMetric(htmlContent, priceToSalesMatch),
      debtToEquity: extractMetric(htmlContent, debtToEquityMatch),
      returnOnEquity: extractMetric(htmlContent, returnOnEquityMatch),
      returnOnAssets: extractMetric(htmlContent, returnOnAssetsMatch),
      profitMargin: extractMetric(htmlContent, profitMarginMatch),
      beta: extractMetric(htmlContent, betaMatch),
      dividendYield: extractMetric(htmlContent, dividendYieldMatch),
      pegForwardRatio: extractMetric(htmlContent, pegForwardRatioMatch),
      
      // Add basic stock data
      company: companyMatch ? companyMatch[1].trim() : null,
      industry: industryMatch ? industryMatch[1].trim() : null,
      sector: sectorMatch ? sectorMatch[1].trim() : null,
      price: extractMetric(htmlContent, priceMatch),
      marketCap: marketCapMatch ? marketCapMatch[1].trim() : null,
      volume: extractMetric(htmlContent, volumeMatch)
    };
    
    return metrics;
  } catch (error) {
    console.error(`Error fetching Yahoo Finance Web data for ${symbol}: ${error}`);
    return null;
  }
}

function extractMetric(htmlContent, match) {
  if (!match) return null;
  const value = match[1].trim();
  return value === 'N/A' ? null : value;
}

/**
 * Fetches price data from Yahoo Finance for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Price data
 */
function fetchYahooPriceData(symbol) {
  try {
    const yahooFinanceKey = getYahooFinanceApiKey();
    if (!yahooFinanceKey) {
      Logger.log('Yahoo Finance API key not configured');
      return null;
    }
    
    const url = `https://yahu-finance2.p.rapidapi.com/price/${symbol.toLowerCase()}`;
    const options = {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": yahooFinanceKey,
        "X-RapidAPI-Host": "yahu-finance2.p.rapidapi.com"
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (statusCode === 200) {
      const data = JSON.parse(responseText);
      Logger.log(`Price data received: ${JSON.stringify(data).substring(0, 200)}...`);
      
      return {
        price: extractYahooValue(data, 'regularMarketPrice'),
        fiftyTwoWeekAverage: extractYahooValue(data, 'fiftyTwoWeekAverage'),
        dayHigh: extractYahooValue(data, 'regularMarketDayHigh'),
        dayLow: extractYahooValue(data, 'regularMarketDayLow'),
        open: extractYahooValue(data, 'regularMarketOpen'),
        close: extractYahooValue(data, 'regularMarketPreviousClose'),
        volume: extractYahooValue(data, 'regularMarketVolume')
      };
    }
    
    Logger.log(`Yahoo Price API request failed with status: ${statusCode}`);
    return null;
  } catch (error) {
    Logger.log(`Error fetching Yahoo price data for ${symbol}: ${error}`);
    return null;
  }
}

/**
 * Fetches key statistics from Yahoo Finance for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Key statistics data
 */
function fetchYahooKeyStatistics(symbol) {
  try {
    const yahooFinanceKey = getYahooFinanceApiKey();
    if (!yahooFinanceKey) {
      Logger.log('Yahoo Finance API key not configured');
      return null;
    }
    
    const url = `https://yahu-finance2.p.rapidapi.com/key-statistics/${symbol.toLowerCase()}`;
    const options = {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": yahooFinanceKey,
        "X-RapidAPI-Host": "yahu-finance2.p.rapidapi.com"
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (statusCode === 200) {
      const data = JSON.parse(responseText);
      Logger.log(`Key statistics data received: ${JSON.stringify(data).substring(0, 200)}...`);
      
      return {
        marketCap: extractYahooValue(data, 'marketCap'),
        company: data.shortName || data.longName,
        industry: data.industry,
        sector: data.sector,
        beta: extractYahooValue(data, 'beta'),
        pegRatio: extractYahooValue(data, 'pegRatio'),
        forwardPE: extractYahooValue(data, 'forwardPE'),
        priceToBook: extractYahooValue(data, 'priceToBook'),
        priceToSales: extractYahooValue(data, 'priceToSales'),
        debtToEquity: extractYahooValue(data, 'debtToEquity'),
        returnOnEquity: extractYahooValue(data, 'returnOnEquity'),
        returnOnAssets: extractYahooValue(data, 'returnOnAssets'),
        profitMargin: extractYahooValue(data, 'profitMargin'),
        dividendYield: extractYahooValue(data, 'dividendYield'),
        fiftyTwoWeekHigh: extractYahooValue(data, 'fiftyTwoWeekHigh'),
        fiftyTwoWeekLow: extractYahooValue(data, 'fiftyTwoWeekLow'),
        currentPrice: extractYahooValue(data, 'currentPrice'),
        previousClose: extractYahooValue(data, 'previousClose'),
        pegForwardRatio: extractYahooValue(data, 'pegForwardRatio') // NEW FIELD
      };
    }
    
    Logger.log(`Yahoo Key Statistics API request failed with status: ${statusCode}`);
    return null;
  } catch (error) {
    Logger.log(`Error fetching Yahoo key statistics for ${symbol}: ${error}`);
    return null;
  }
}

/**
 * Fetches search data from Yahoo Finance for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Search data
 */
function fetchYahooSearchData(symbol) {
  try {
    const yahooFinanceKey = getYahooFinanceApiKey();
    if (!yahooFinanceKey) {
      Logger.log('Yahoo Finance API key not configured');
      return null;
    }
    
    const url = `https://yahu-finance2.p.rapidapi.com/search/${symbol.toLowerCase()}`;
    const options = {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": yahooFinanceKey,
        "X-RapidAPI-Host": "yahu-finance2.p.rapidapi.com"
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (statusCode === 200) {
      const data = JSON.parse(responseText);
      Logger.log(`Search data received: ${JSON.stringify(data).substring(0, 200)}...`);
      
      // Extract the first result if it's an array
      if (Array.isArray(data.quotes) && data.quotes.length > 0) {
        const firstResult = data.quotes[0];
        return {
          company: firstResult.longname || firstResult.shortname,
          industry: firstResult.industry,
          sector: firstResult.sector
        };
      }
      
      return {
        company: data.longname || data.shortname,
        industry: data.industry,
        sector: data.sector
      };
    }
    
    Logger.log(`Yahoo Search API request failed with status: ${statusCode}`);
    return null;
  } catch (error) {
    Logger.log(`Error fetching Yahoo search data for ${symbol}: ${error}`);
    return null;
  }
}

/**
 * Safely extracts a value from a potentially nested object with raw property
 * @param {Object} data - The data object
 * @param {String} key - The key to extract
 * @return {any} The extracted value
 */
function extractYahooValue(data, key) {
  if (!data || !data[key]) return null;
  
  // If the value is an object with a raw property, extract the raw value
  if (data[key] && typeof data[key] === 'object' && 'raw' in data[key]) {
    return data[key].raw;
  }
  
  // Otherwise return the value directly
  return data[key];
}

/**
 * Fetches comprehensive data from Yahoo Finance for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Yahoo Finance data
 */
function fetchYahooFinanceData(symbol) {
  try {
    Logger.log(`Fetching Yahoo Finance data for ${symbol}`);
    
    // Initialize metrics object
    const metrics = {
      symbol: symbol,
      price: null,
      priceChange: null,
      changesPercentage: null,
      volume: null,
      marketCap: null,
      company: null,
      industry: null,
      sector: null,
      beta: null,
      pegRatio: null,
      pegForwardRatio: null, // NEW FIELD
      forwardPE: null,
      priceToBook: null,
      priceToSales: null,
      debtToEquity: null,
      returnOnEquity: null,
      returnOnAssets: null,
      profitMargin: null,
      dividendYield: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
      dayHigh: null,
      dayLow: null,
      open: null,
      close: null,
      fiftyTwoWeekAverage: null,
      dataSource: ['Yahoo Finance API']
    };
    
    // Try key statistics endpoint first (most comprehensive)
    const statsData = fetchYahooKeyStatistics(symbol);
    if (statsData) {
      Logger.log('Successfully retrieved key statistics data');
      
      // Update metrics with key statistics
      metrics.marketCap = statsData.marketCap;
      metrics.company = statsData.company;
      metrics.industry = statsData.industry;
      metrics.sector = statsData.sector;
      metrics.beta = statsData.beta;
      metrics.pegRatio = statsData.pegRatio;
      metrics.forwardPE = statsData.forwardPE;
      metrics.priceToBook = statsData.priceToBook;
      metrics.priceToSales = statsData.priceToSales;
      metrics.debtToEquity = statsData.debtToEquity;
      metrics.returnOnEquity = statsData.returnOnEquity;
      metrics.returnOnAssets = statsData.returnOnAssets;
      metrics.profitMargin = statsData.profitMargin;
      metrics.dividendYield = statsData.dividendYield;
      metrics.fiftyTwoWeekHigh = statsData.fiftyTwoWeekHigh;
      metrics.fiftyTwoWeekLow = statsData.fiftyTwoWeekLow;
      metrics.price = statsData.currentPrice;
      metrics.close = statsData.previousClose;
      metrics.pegForwardRatio = statsData.pegForwardRatio; // NEW FIELD
      
      // Calculate price change and percentage change
      if (metrics.price && metrics.close) {
        metrics.priceChange = metrics.price - metrics.close;
        metrics.changesPercentage = ((metrics.price - metrics.close) / metrics.close) * 100;
      }
    }
    
    // If we're missing price data, try price endpoint
    if (!metrics.price || !metrics.volume) {
      Logger.log('Missing price data, trying price endpoint');
      const priceData = fetchYahooPriceData(symbol);
      if (priceData) {
        Logger.log('Successfully retrieved price data');
        
        // Only update if values are null
        if (!metrics.price) metrics.price = priceData.price;
        if (!metrics.volume) metrics.volume = priceData.volume;
        if (!metrics.dayHigh) metrics.dayHigh = priceData.dayHigh;
        if (!metrics.dayLow) metrics.dayLow = priceData.dayLow;
        if (!metrics.open) metrics.open = priceData.open;
        if (!metrics.close) metrics.close = priceData.close;
        if (!metrics.fiftyTwoWeekAverage) metrics.fiftyTwoWeekAverage = priceData.fiftyTwoWeekAverage;
        
        // Recalculate price change if needed
        if (metrics.price && metrics.close && !metrics.priceChange) {
          metrics.priceChange = metrics.price - metrics.close;
          metrics.changesPercentage = ((metrics.price - metrics.close) / metrics.close) * 100;
        }
      }
    }
    
    // --- VALIDATE COMPANY NAME ---
    // If we're missing company data, try search endpoint
    if (!isValidCompanyName(metrics.company) || !metrics.industry || !metrics.sector) {
      Logger.log('Missing or invalid company data, trying search endpoint');
      const searchData = fetchYahooSearchData(symbol);
      if (searchData) {
        Logger.log('Successfully retrieved search data');
        if (!isValidCompanyName(metrics.company) && isValidCompanyName(searchData.company)) metrics.company = searchData.company;
        if (!metrics.industry && searchData.industry) metrics.industry = searchData.industry;
        if (!metrics.sector && searchData.sector) metrics.sector = searchData.sector;
      }
    }
    // --- FALLBACK TO FMP ---
    if (!isValidCompanyName(metrics.company)) {
      Logger.log('Still missing or invalid company name, trying FMP');
      try {
        const fmpData = fetchFMPData(symbol);
        if (fmpData && isValidCompanyName(fmpData.company)) {
          metrics.company = fmpData.company;
          if (fmpData.industry) metrics.industry = fmpData.industry;
          if (fmpData.sector) metrics.sector = fmpData.sector;
        }
      } catch (e) { Logger.log('FMP fallback failed: ' + e); }
    }
    // --- FALLBACK TO TRADIER DESCRIPTION ---
    if (!isValidCompanyName(metrics.company)) {
      Logger.log('Still missing or invalid company name, trying Tradier quote description');
      try {
        var tradierQuote = fetchTradierQuote(symbol);
        if (tradierQuote && tradierQuote.description && isValidCompanyName(tradierQuote.description)) {
          metrics.company = tradierQuote.description;
        }
      } catch (e) { Logger.log('Tradier quote fallback failed: ' + e); }
    }
    // --- FINAL FALLBACK ---
    if (!isValidCompanyName(metrics.company)) {
      metrics.company = symbol; // Use symbol as company name if all sources fail
    }
    Logger.log(`Final Yahoo Finance metrics: price=${metrics.price}, company=${metrics.company}, volume=${metrics.volume}`);
    const hasEssentialData = metrics.price !== null && isValidCompanyName(metrics.company);
    if (hasEssentialData) {
      Logger.log(`Yahoo Finance API result data:`, {
        price: metrics.price,
        volume: metrics.volume,
        marketCap: metrics.marketCap,
        company: metrics.company,
        industry: metrics.industry,
        sector: metrics.sector
      });
      return metrics;
    } else {
      Logger.log(`Failed to retrieve essential data from Yahoo Finance API. Missing price or valid company name.`);
      return null;
    }
  } catch (error) {
    Logger.log(`Error in fetchYahooFinanceData for ${symbol}: ${error}`);
    return null;
  }
}

/**
 * Formats numeric values with proper formatting
 * @param {number|Object} value - Numeric value or object with raw value
 * @param {string} metricType - Type of metric (e.g., 'beta')
 * @return {string} Formatted value
 */
function formatValue(value, metricType = 'default') {
  if (!value) return 'N/A';
  
  // Handle objects with raw values (like from Yahoo Finance)
  if (typeof value === 'object' && value !== null && 'raw' in value) {
    value = value.raw;
  }

  // Convert to number if it's a string
  if (typeof value === 'string') {
    value = parseFloat(value);
  }

  // Handle beta specifically
  if (metricType === 'beta') {
    return value.toFixed(2);
  }

  // Default formatting for other metrics
  return value.toFixed(2);
}

/**
 * Formats market cap values with appropriate suffixes
 * @param {number} value - Market cap value
 * @return {string} Formatted market cap
 */
function formatMarketCap(value) {
  if (!value) return 'N/A';
  
  // Convert to number if it's a string
  value = parseFloat(value);
  
  if (value >= 1e12) {
    return (value / 1e12).toFixed(2) + 'T';
  } else if (value >= 1e9) {
    return (value / 1e9).toFixed(2) + 'B';
  } else if (value >= 1e6) {
    return (value / 1e6).toFixed(2) + 'M';
  } else {
    return value.toFixed(2);
  }
}

/**
 * Formats volume values with appropriate suffixes
 * @param {number} value - Volume value
 * @return {string} Formatted volume
 */
function formatVolume(value) {
  if (!value) return 'N/A';
  
  // Convert to number if it's a string
  value = parseFloat(value);
  
  if (value >= 1e9) {
    return (value / 1e9).toFixed(2) + 'B';
  } else if (value >= 1e6) {
    return (value / 1e6).toFixed(2) + 'M';
  } else if (value >= 1e3) {
    return (value / 1e3).toFixed(2) + 'K';
  } else {
    return value.toFixed(2);
  }
}

/**
 * Formats percentages with proper formatting
 * @param {number} value - Percentage value
 * @return {string} Formatted percentage
 */
function formatPercentage(value) {
  if (!value) return 'N/A';
  return (value * 100).toFixed(2) + '%';
}

/**
 * Display metrics in a readable format
 * @param {Object} metrics - Metrics object
 * @param {string} outputRange - Range to output to (e.g., 'A1')
 */
function displayMetrics(metrics, outputRange = 'A1') {
  try {
    // Get the shared spreadsheet
    const spreadsheet = getSharedFinanceSpreadsheet();
    if (!spreadsheet) {
      console.error('No shared finance spreadsheet found');
      return;
    }
    
    // Get the first sheet for output
    const sheet = spreadsheet.getSheets()[0];
    if (!sheet) {
      console.error('No sheets found in spreadsheet');
      return;
    }

    // Create formatted output
    const output = [
      ['=== Metrics for ' + (metrics.symbol || 'N/A') + ' ===', ''],
      ['Execution Time:', metrics.executionTime ? metrics.executionTime.toFixed(2) + ' seconds' : 'N/A'],
      ['Sources:', metrics.sources?.join(', ') || 'N/A'],
      ['', ''],
      ['Current Price:', ''],
      ['Price:', metrics.price ? '$' + formatValue(metrics.price) : 'N/A'],
      ['Change:', metrics.priceChange ? '$' + formatValue(metrics.priceChange) : 'N/A'],
      ['Change %:', metrics.changesPercentage ? formatPercentage(metrics.changesPercentage) : 'N/A'],
      ['', ''],
      ['Daily Range:', ''],
      ['Open:', metrics.open ? '$' + formatValue(metrics.open) : 'N/A'],
      ['High:', metrics.dayHigh ? '$' + formatValue(metrics.dayHigh) : 'N/A'],
      ['Low:', metrics.dayLow ? '$' + formatValue(metrics.dayLow) : 'N/A'],
      ['Close:', metrics.close ? '$' + formatValue(metrics.close) : 'N/A'],
      ['', ''],
      ['52-Week Range:', ''],
      ['52-Week High:', metrics.fiftyTwoWeekHigh ? '$' + formatValue(metrics.fiftyTwoWeekHigh) : 'N/A'],
      ['52-Week Low:', metrics.fiftyTwoWeekLow ? '$' + formatValue(metrics.fiftyTwoWeekLow) : 'N/A'],
      ['', ''],
      ['Valuation Metrics:', ''],
      ['PEG Ratio:', metrics.pegRatio ? formatValue(metrics.pegRatio) : 'N/A'],
      ['Forward P/E:', metrics.forwardPE ? formatValue(metrics.forwardPE) : 'N/A'],
      ['Price/Book:', metrics.priceToBook ? formatValue(metrics.priceToBook) : 'N/A'],
      ['Price/Sales:', metrics.priceToSales ? formatValue(metrics.priceToSales) : 'N/A'],
      ['Debt/Equity:', metrics.debtToEquity ? formatValue(metrics.debtToEquity) : 'N/A'],
      ['', ''],
      ['Performance Metrics:', ''],
      ['Return on Equity:', metrics.returnOnEquity ? formatPercentage(metrics.returnOnEquity) : 'N/A'],
      ['Return on Assets:', metrics.returnOnAssets ? formatPercentage(metrics.returnOnAssets) : 'N/A'],
      ['Profit Margin:', metrics.profitMargin ? formatPercentage(metrics.profitMargin) : 'N/A'],
      ['Beta:', metrics.beta ? formatValue(metrics.beta, 'beta') : 'N/A'],
      ['', ''],
      ['Dividend & Expense:', ''],
      ['Dividend Yield:', metrics.dividendYield ? formatPercentage(metrics.dividendYield) : 'N/A'],
      ['Expense Ratio:', metrics.expenseRatio ? formatPercentage(metrics.expenseRatio) : 'N/A'],
      ['', ''],
      ['Company Info:', ''],
      ['Company:', metrics.company || 'N/A'],
      ['Industry:', metrics.industry || 'N/A'],
      ['Sector:', metrics.sector || 'N/A'],
      ['', ''],
      ['Market Metrics:', ''],
      ['Market Cap:', metrics.marketCap ? formatMarketCap(metrics.marketCap) : 'N/A'],
      ['Volume:', metrics.volume ? formatVolume(metrics.volume) : 'N/A'],
      ['Forward PEG Ratio:', metrics.pegForwardRatio ? formatValue(metrics.pegForwardRatio) : 'N/A'] // NEW FIELD
    ];

    // Clear the output range
    const range = sheet.getRange(outputRange);
    range.offset(0, 0, output.length, 2).clearContent();  // Clear 2 columns

    // Write the data
    range.offset(0, 0, output.length, 2).setValues(output);

    // Format the table
    const tableRange = sheet.getRange(outputRange).offset(0, 0, output.length, 2);
    tableRange.setBorder(true, true, true, true, true, true);
    tableRange.setHorizontalAlignment('left');
    
    // Format header row
    const headerRange = sheet.getRange(outputRange).offset(0, 0, 1, 2);
    headerRange.setBackground('#f3f3f3');
    headerRange.setFontWeight('bold');

    // Set column widths
    sheet.autoResizeColumns(1, 2);

    console.log(`Metrics displayed successfully for ${metrics.symbol}`);
  } catch (error) {
    console.error(`Error in displayMetrics: ${error}`);
    throw error;
  }
}

/**
 * Tests the caching implementation for stock metrics
 * This function will:
 * 1. Clear the cache for a test symbol
 * 2. Call retrieveStockMetrics once (should be cache miss)
 * 3. Call retrieveStockMetrics again (should be cache hit)
 * 4. Compare execution times and verify data consistency
 */
function testStockMetricsCaching() {
  Logger.log('Testing stock metrics caching...');
  
  // Clear cache first
  Logger.log('Clearing stock metrics cache for AAPL...');
  const clearResult = clearStockMetricsCacheForSymbol('AAPL');
  Logger.log(`Cache cleared: ${clearResult.success}`);
  
  // First call (should be cache miss)
  Logger.log('\nFirst call for AAPL (should be cache miss):');
  const startTime = new Date().getTime();
  const firstMetrics = retrieveStockMetrics('AAPL');
  const firstExecutionTime = (new Date().getTime() - startTime) / 1000;
  
  if (firstMetrics) {
    Logger.log('First call execution time: ' + firstExecutionTime + ' seconds');
    Logger.log('From cache: ' + firstMetrics.fromCache);
    
    // Log detailed metrics values
    Logger.log('\nDetailed metrics values:');
    Logger.log('Price: ' + firstMetrics.price);
    Logger.log('Volume: ' + firstMetrics.volume);
    Logger.log('Market Cap: ' + firstMetrics.marketCap);
    Logger.log('Company: ' + firstMetrics.company);
    Logger.log('Industry: ' + firstMetrics.industry);
    Logger.log('Sector: ' + firstMetrics.sector);
    Logger.log('Beta: ' + firstMetrics.beta);
    Logger.log('Peg Ratio: ' + firstMetrics.pegRatio);
    Logger.log('Forward PE: ' + firstMetrics.forwardPE);
    Logger.log('Dividend Yield: ' + firstMetrics.dividendYield);
    Logger.log('52 Week High: ' + firstMetrics.fiftyTwoWeekHigh);
    Logger.log('52 Week Low: ' + firstMetrics.fiftyTwoWeekLow);
    Logger.log('Day High: ' + firstMetrics.dayHigh);
    Logger.log('Day Low: ' + firstMetrics.dayLow);
    Logger.log('Open: ' + firstMetrics.open);
    Logger.log('Close: ' + firstMetrics.close);
    Logger.log('Data Sources: ' + (firstMetrics.dataSource ? firstMetrics.dataSource.join(', ') : 'None'));
  }
  
  // Second call (should be cache hit)
  Logger.log('\nSecond call for AAPL (should be cache hit):');
  const startTime2 = new Date().getTime();
  const secondMetrics = retrieveStockMetrics('AAPL');
  const secondExecutionTime = (new Date().getTime() - startTime2) / 1000;
  
  let isConsistent = false;
  
  if (secondMetrics) {
    Logger.log('Second call execution time: ' + secondExecutionTime + ' seconds');
    Logger.log('From cache: ' + secondMetrics.fromCache);
    
    // Create copies of the metrics objects without lastUpdated and fromCache for comparison
    const firstMetricsCopy = JSON.parse(JSON.stringify(firstMetrics));
    const secondMetricsCopy = JSON.parse(JSON.stringify(secondMetrics));
    
    delete firstMetricsCopy.lastUpdated;
    delete secondMetricsCopy.lastUpdated;
    delete firstMetricsCopy.fromCache;
    delete secondMetricsCopy.fromCache;
    
    // Verify data consistency
    isConsistent = JSON.stringify(firstMetricsCopy) === JSON.stringify(secondMetricsCopy);
    Logger.log('Data consistency: ' + (isConsistent ? 'Passed' : 'Failed'));
    
    // Log detailed metrics values for comparison
    Logger.log('\nCached metrics values:');
    Logger.log('Price: ' + secondMetrics.price);
    Logger.log('Volume: ' + secondMetrics.volume);
    Logger.log('Market Cap: ' + secondMetrics.marketCap);
    Logger.log('Company: ' + secondMetrics.company);
    Logger.log('Industry: ' + secondMetrics.industry);
    Logger.log('Sector: ' + secondMetrics.sector);
    Logger.log('Beta: ' + secondMetrics.beta);
    Logger.log('Peg Ratio: ' + secondMetrics.pegRatio);
    Logger.log('Forward PE: ' + secondMetrics.forwardPE);
    Logger.log('Dividend Yield: ' + secondMetrics.dividendYield);
    Logger.log('52 Week High: ' + secondMetrics.fiftyTwoWeekHigh);
    Logger.log('52 Week Low: ' + secondMetrics.fiftyTwoWeekLow);
    Logger.log('Day High: ' + secondMetrics.dayHigh);
    Logger.log('Day Low: ' + secondMetrics.dayLow);
    Logger.log('Open: ' + secondMetrics.open);
    Logger.log('Close: ' + secondMetrics.close);
    Logger.log('Data Sources: ' + (secondMetrics.dataSource ? secondMetrics.dataSource.join(', ') : 'None'));
  }
  
  // Calculate performance improvement
  const improvement = ((firstExecutionTime - secondExecutionTime) / firstExecutionTime * 100).toFixed(2);
  
  // Summary
  Logger.log('\nCaching Test Summary:');
  Logger.log('First call (fresh data): ' + firstExecutionTime + ' seconds');
  Logger.log('Second call (cached data): ' + secondExecutionTime + ' seconds');
  Logger.log('Performance improvement: ' + improvement + '%');
  Logger.log('Data consistency: ' + (isConsistent ? 'Passed' : 'Failed'));
  
  return {
    firstExecutionTime: firstExecutionTime,
    secondExecutionTime: secondExecutionTime,
    improvement: improvement,
    isConsistent: isConsistent
  };
}

/**
 * Function to test retrieving multiple stocks
 */
function testMultipleStocks() {
  // Define categories of stocks
  const stocks = {
    'Magnificent Seven': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA'],
    'Major Indices': ['SPY', 'QQQ', 'IWM', 'DIA'],
    'Energy': ['XOM', 'CVX'],
    'Aerospace & Defense': ['BA', 'CAT'],
    'Consumer Goods': ['PG']
  };

  // Process each category
  for (const [category, symbols] of Object.entries(stocks)) {
    Logger.log(`\n=== ${category} ===`);
    testStockMetrics(symbols);
  }
}

/**
 * Main function to test the script
 * @param {Array} symbols - Optional array of stock symbols to test
 */
function testStockMetrics(symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA']) {
  try {
    // Set up the spreadsheet
    setupSpreadsheet();
    
    for (const symbol of symbols) {
      Logger.log(`\nTesting stock metrics retrieval for ${symbol}...`);
      
      const startTime = new Date().getTime();
      
      // Retrieve metrics
      const metrics = retrieveStockMetrics(symbol);
      
      const endTime = new Date().getTime();
      const executionTime = (endTime - startTime) / 1000;
      
      // Log results in table format with source tracking
      Logger.log(`\nField               | Value                | Source`);
      Logger.log(`--------------------|---------------------|---------------------`);
      for (const [key, value] of Object.entries(metrics)) {
        if (key === '_fieldSources' || key === 'sources' || key === 'dataSource' || key === 'fromCache') continue;
        if (value !== null && value !== undefined) {
          const source = metrics._fieldSources && metrics._fieldSources[key] ? metrics._fieldSources[key] : (metrics.dataSource ? metrics.dataSource.join(', ') : 'Unknown');
          Logger.log(`${key.padEnd(19)}| ${String(value).padEnd(20)}| ${source}`);
        }
      }
      Logger.log(`From Cache: ${metrics.fromCache ? 'Yes' : 'No'}`);
      Logger.log(`Execution Time: ${executionTime.toFixed(2)} seconds`);
      
      // Display metrics in the active sheet
      displayMetrics(metrics);
    }
    
  } catch (error) {
    Logger.log(`Error in testStockMetrics: ${error}`);
    throw error;
  }
}

/**
 * Ensure the spreadsheet is properly set up
 */
function setupSpreadsheet() {
  try {
    const spreadsheet = getSharedFinanceSpreadsheet();
    if (!spreadsheet) {
      throw new Error('No shared finance spreadsheet found');
    }
    
    // Create Company Data sheet if it doesn't exist
    let companyDataSheet = spreadsheet.getSheetByName('Company Data');
    if (!companyDataSheet) {
      companyDataSheet = spreadsheet.insertSheet('Company Data');
      
      // Set up headers
      const headers = [
        'Symbol', 'Company', 'Industry', 'Sector', 'Price', 'Market Cap', 'Volume',
        'Beta', '52 Week High', '52 Week Low', 'Day High', 'Day Low', 'Open', 'Close'
      ];
      companyDataSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format headers
      const headerRange = companyDataSheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#f3f3f3');
      headerRange.setFontWeight('bold');
      headerRange.setHorizontalAlignment('center');
    }
    
    console.log('Spreadsheet setup completed successfully');
  } catch (error) {
    console.error(`Error in setupSpreadsheet: ${error}`);
    throw error;
  }
}

/**
 * Sets up the RapidAPI key for Yahoo Finance API
 * @param {string} apiKey - The RapidAPI key
 */
function setupRapidAPIKey(apiKey) {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty('RAPID_API_KEY', apiKey);
    console.log('RapidAPI key set successfully');
  } catch (error) {
    console.error('Error setting up RapidAPI key:', error);
    throw error;
  }
}

/**
 * Gets the Yahoo Finance API key from script properties
 * @return {string} The Yahoo Finance API key
 */
function getYahooFinanceApiKey() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    return scriptProperties.getProperty('YAHOO_FINANCE_API_KEY');
  } catch (error) {
    console.error('Error getting Yahoo Finance API key:', error);
    throw error;
  }
}

/**
 * --- Utility: Pick first valid (non-null/undefined) value ---
/**
 * Returns the first valid (non-null/undefined) value from a list of values
 * @param {...any} values - List of values to check
 * @return {any} The first valid value or null if all values are invalid
 */
function pickFirstValid(...values) {
  for (let v of values) {
    if (v !== null && v !== undefined) return v;
  }
  return null;
}

/**
 * Fetches data from RapidAPI stock overview endpoint
 * @param {string} symbol - Stock symbol
 * @return {Object} Metrics object or null
 */
function fetchRapidAPIStockData(symbol) {
  try {
    const rapidApiKey = PropertiesService.getScriptProperties().getProperty('RAPID_API_KEY');
    if (!rapidApiKey) {
      Logger.log('No RapidAPI key found');
      return null;
    }

    const url = `https://real-time-finance-data.p.rapidapi.com/stock-overview?symbol=${symbol}%3ANASDAQ&language=en`;
    const response = UrlFetchApp.fetch(url, {
      headers: {
        'x-rapidapi-host': 'real-time-finance-data.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey
      },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      Logger.log(`RapidAPI request failed with status ${response.getResponseCode()}`);
      return null;
    }

    const data = JSON.parse(response.getContentText());
    if (!data || !data.data) {
      Logger.log('No valid data returned from RapidAPI');
      return null;
    }

    const stockData = data.data;
    
    // Log detailed response values
    Logger.log('\nRapidAPI Response Details:');
    Logger.log('Symbol: ' + stockData.symbol);
    Logger.log('Price: ' + stockData.price);
    Logger.log('Change: ' + stockData.change);
    Logger.log('Change %: ' + stockData.change_percent);
    Logger.log('Volume: ' + stockData.volume);
    Logger.log('Market Cap: ' + stockData.company_market_cap);
    Logger.log('Company: ' + stockData.name);
    Logger.log('Industry: ' + stockData.company_industry);
    Logger.log('Sector: ' + stockData.company_sector);
    Logger.log('P/E Ratio: ' + stockData.company_pe_ratio);
    Logger.log('Dividend Yield: ' + stockData.company_dividend_yield);
    Logger.log('52 Week High: ' + stockData.year_high);
    Logger.log('52 Week Low: ' + stockData.year_low);
    Logger.log('Day High: ' + stockData.high);
    Logger.log('Day Low: ' + stockData.low);
    Logger.log('Open: ' + stockData.open);
    Logger.log('Previous Close: ' + stockData.previous_close);

    return {
      symbol: stockData.symbol,
      price: stockData.price,
      priceChange: stockData.change,
      changesPercentage: stockData.change_percent,
      volume: stockData.volume,
      marketCap: stockData.company_market_cap,
      company: stockData.name,
      industry: stockData.company_industry,
      sector: stockData.company_sector,
      beta: null,
      pegRatio: null,
      forwardPE: stockData.company_pe_ratio,
      priceToBook: null,
      priceToSales: null,
      debtToEquity: null,
      returnOnEquity: null,
      returnOnAssets: null,
      profitMargin: null,
      dividendYield: stockData.company_dividend_yield,
      fiftyTwoWeekHigh: stockData.year_high,
      fiftyTwoWeekLow: stockData.year_low,
      dayHigh: stockData.high,
      dayLow: stockData.low,
      open: stockData.open,
      close: stockData.previous_close,
      fiftyTwoWeekAverage: null,
      dataSource: ['RapidAPI']
    };
  } catch (error) {
    Logger.log(`Error in fetchRapidAPIStockData: ${error}`);
    return null;
  }
}

/**
 * Global configuration.
 * For beta usage (as per the provided documentation sample), use:
 *    "https://api.tradier.com/beta"
 * For production, change this to:
 *    "https://api.tradier.com/v1"
 */
/**
 * Global Tradier API token from property store
 */
const TRADIER_API_TOKEN = PropertiesService.getScriptProperties().getProperty('TRADIER_API_KEY');

/**
 * Environment configuration.
 * Set to 'beta' for beta endpoints or 'production' for production endpoints.
 * Update this based on your Tradier account settings.
 */
const TRADIER_ENVIRONMENT = 'production'; // Changed from 'beta' to 'production'

// Base URLs for different environments
const TRADIER_BASE_URLS = {
  beta: "https://api.tradier.com/beta",
  production: "https://api.tradier.com/v1"
};

// Get the appropriate base URL based on environment
var TRADIER_BASE_URL = TRADIER_BASE_URLS[TRADIER_ENVIRONMENT];

/**
 * Retrieves combined stock data from Tradier for a given symbol.
 * Merges quote data, company fundamentals (company endpoint), and financial ratios.
 *
 * @param {string} symbol - The stock symbol to fetch data for.
 * @return {Object} - Merged stock data.
 */
function fetchTradierData(symbol) {
  if (!symbol) {
    throw new Error("No symbol provided for fetchTradierData");
  }
  
  // Log the environment being used for debugging
  Logger.log(`Using Tradier environment: ${TRADIER_ENVIRONMENT}`);
  
  // Retrieve quote data.
  var quoteData = fetchTradierQuote(symbol);
  // Retrieve company fundamentals.
  var companyData = fetchTradierCompany(symbol);
  // Retrieve financial ratios.
  var ratiosData = fetchTradierRatios(symbol);
  
  // Log the raw data we received for debugging
  Logger.log(`Raw quote data: ${JSON.stringify(quoteData)}`);
  Logger.log(`Raw company data: ${JSON.stringify(companyData)}`);
  Logger.log(`Raw ratios data: ${JSON.stringify(ratiosData)}`);
  
  // Merge fundamentals from the company endpoint.
  var fundamentals = {};
  if (companyData) {
    fundamentals.company = companyData.name || null;
    fundamentals.industry = companyData.industry || null;
    fundamentals.sector = companyData.sector || null;
  }
  
  // Merge data from the ratios endpoint.
  if (ratiosData) {
    fundamentals.marketcap = ratiosData.market_cap || null;
    fundamentals.beta = ratiosData.beta || null;
    fundamentals.dividendYield = ratiosData.dividend_yield || null;
    fundamentals.profitMargin = ratiosData.profit_margin || null;
    fundamentals.returnOnEquity = ratiosData.return_on_equity || null;
    fundamentals.returnOnAssets = ratiosData.return_on_assets || null;
  }
  
  // Merge all data.
  var combinedData = {
    symbol: symbol,
    price: quoteData ? quoteData.last : null,
    volume: quoteData ? quoteData.volume : null,
    open: quoteData ? quoteData.open : null,
    close: quoteData ? quoteData.close : null,
    priceChange: quoteData ? quoteData.change : null,
    changesPercentage: quoteData ? quoteData.change_percentage : null,
    company: fundamentals.company || (quoteData ? quoteData.description : null) || null,
    industry: fundamentals.industry || null,
    sector: fundamentals.sector || null,
    marketcap: fundamentals.marketcap || null,
    beta: fundamentals.beta || null,
    dividendYield: fundamentals.dividendYield || null,
    profitMargin: fundamentals.profitMargin || null,
    returnOnEquity: fundamentals.returnOnEquity || null,
    returnOnAssets: fundamentals.returnOnAssets || null,
    // --- Properly map Tradier quote fields to internal metrics fields ---
    fiftyTwoWeekHigh: quoteData ? quoteData.week_52_high : null,
    fiftyTwoWeekLow: quoteData ? quoteData.week_52_low : null,
    dayHigh: quoteData ? quoteData.high : null,
    dayLow: quoteData ? quoteData.low : null
  };
  
  return combinedData;
}

/**
 * Fetches quote information from Tradier for a given symbol.
 */
function fetchTradierQuote(symbol) {
  var url = TRADIER_BASE_URL + "/markets/quotes?symbols=" + encodeURIComponent(symbol);
  var headers = {
    "Authorization": "Bearer " + TRADIER_API_TOKEN,
    "Accept": "application/json"
  };
  var options = { "method": "get", "headers": headers, "muteHttpExceptions": true };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var content = response.getContentText();
    var responseCode = response.getResponseCode();
    Logger.log(`Quote endpoint response code: ${responseCode}`);
    Logger.log(`Quote endpoint response content: ${content}`);
    if (responseCode !== 200) {
      Logger.log("HTTP Error: " + responseCode + " for symbol: " + symbol + ". Raw response: " + content);
      throw new Error("HTTP Error: " + responseCode + " for symbol: " + symbol);
    }
    var json = JSON.parse(content);
    if (!json.quotes || !json.quotes.quote) {
      throw new Error("No quote data returned for symbol: " + symbol);
    }
    var quote = json.quotes.quote;
    // --- PATCH: Always include description as company name fallback ---
    return {
      ...quote,
      description: quote.description || null, // Always provide description
      company: quote.description || null      // Patch: alias for company name
    };
  } catch (e) {
    Logger.log("Error in fetchTradierQuote for " + symbol + ": " + e.message);
    return null;
  }
}

/**
 * Fetches company fundamentals from Tradier using the company endpoint.
 */
function fetchTradierCompany(symbol) {
  var url = TRADIER_BASE_URL + "/markets/fundamentals/company?symbols=" + encodeURIComponent(symbol);
  var headers = {
    "Authorization": "Bearer " + TRADIER_API_TOKEN,
    "Accept": "application/json"
  };
  var options = { "method": "get", "headers": headers, "muteHttpExceptions": true };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var content = response.getContentText();
    var responseCode = response.getResponseCode();
    Logger.log(`Company endpoint response code: ${responseCode}`);
    Logger.log(`Company endpoint response content: ${content}`);
    if (responseCode !== 200) {
      Logger.log("HTTP Error in fetchTradierCompany for " + symbol + ": " + responseCode + ". Raw response: " + content);
      throw new Error("HTTP Error: " + responseCode);
    }
    var json = JSON.parse(content);
    if (!json.company) {
      throw new Error("No company data returned for symbol: " + symbol);
    }
    return json.company;
  } catch (e) {
    Logger.log("Error in fetchTradierCompany for " + symbol + ": " + e.message);
    return null;
  }
}

/**
 * Fetches financial ratios from Tradier using the ratios endpoint.
 */
function fetchTradierRatios(symbol) {
  var url = TRADIER_BASE_URL + "/markets/fundamentals/ratios?symbols=" + encodeURIComponent(symbol);
  var headers = {
    "Authorization": "Bearer " + TRADIER_API_TOKEN,
    "Accept": "application/json"
  };
  var options = { "method": "get", "headers": headers, "muteHttpExceptions": true };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var content = response.getContentText();
    var responseCode = response.getResponseCode();
    Logger.log(`Ratios endpoint response code: ${responseCode}`);
    Logger.log(`Ratios endpoint response content: ${content}`);
    if (responseCode !== 200) {
      Logger.log("HTTP Error in fetchTradierRatios for " + symbol + ": " + responseCode + ". Raw response: " + content);
      throw new Error("HTTP Error: " + responseCode);
    }
    var json = JSON.parse(content);
    if (!json.ratios) {
      throw new Error("No ratios data returned for symbol: " + symbol);
    }
    return json.ratios;
  } catch (e) {
    Logger.log("Error in fetchTradierRatios for " + symbol + ": " + e.message);
    return null;
  }
}

/**
 * Test function to verify Tradier API integration
 */
function testTradierAPI() {
  const stocks = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META'];
  const randomIndex = Math.floor(Math.random() * stocks.length);
  const symbol = stocks[randomIndex];
  
  Logger.log(`Testing Tradier API for ${symbol}...`);
  
  const startTime = new Date().getTime();
  const data = fetchTradierData(symbol);
  const executionTime = (new Date().getTime() - startTime) / 1000;
  
  if (!data) {
    Logger.log(`No data retrieved from Tradier for ${symbol}`);
    return;
  }
  
  Logger.log(`Execution time: ${executionTime.toFixed(2)} seconds`);
  Logger.log(`Data retrieved for ${symbol}:`);
  Logger.log(JSON.stringify(data, null, 2));
  
  // Check for specific fields
  const requiredFields = ['price', 'volume', 'company', 'sector', 'industry'];
  const missingFields = requiredFields.filter(field => data[field] === null || data[field] === undefined);
  
  if (missingFields.length > 0) {
    Logger.log(`Missing required fields: ${missingFields.join(', ')}`);
  } else {
    Logger.log('All required fields present');
  }
}

/**
 * --- UTILITY: Sanitize metric values ---
/**
 * Sanitizes a metric value, converting #ERROR!, N/A, null, undefined, empty, or NaN to null
 * @param {any} value
 * @return {any|null}
 */
function sanitizeMetricValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (
      trimmed === '' ||
      trimmed.toUpperCase() === 'N/A' ||
      trimmed.toUpperCase() === 'NA' ||
      trimmed.toUpperCase() === 'NULL' ||
      trimmed.toUpperCase() === 'UNDEFINED' ||
      trimmed.startsWith('#ERROR')
    ) {
      return null;
    }
  }
  if (typeof value === 'number' && isNaN(value)) return null;
  return value;
}

/**
 * --- UTILITY: Validate company name ---
/**
 * Checks if a company name is valid (not null, not N/A, not NaN, not empty)
 * @param {string|null|undefined} name
 * @return {boolean}
 */
function isValidCompanyName(name) {
  if (!name) return false;
  if (typeof name !== 'string') return false;
  const invalids = ['N/A', 'NaN', 'null', 'undefined', ''];
  return !invalids.includes(name.trim());
}

/**
 * Fetches data from Yahoo Finance for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Yahoo Finance data
 */
function fetchYahooFinanceData(symbol) {
  try {
    Logger.log(`Fetching Yahoo Finance data for ${symbol}`);
    
    // Initialize metrics object
    const metrics = {
      symbol: symbol,
      price: null,
      priceChange: null,
      changesPercentage: null,
      volume: null,
      marketCap: null,
      company: null,
      industry: null,
      sector: null,
      beta: null,
      pegRatio: null,
      pegForwardRatio: null, // NEW FIELD
      forwardPE: null,
      priceToBook: null,
      priceToSales: null,
      debtToEquity: null,
      returnOnEquity: null,
      returnOnAssets: null,
      profitMargin: null,
      dividendYield: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
      dayHigh: null,
      dayLow: null,
      open: null,
      close: null,
      fiftyTwoWeekAverage: null,
      dataSource: ['Yahoo Finance API']
    };
    
    // Try key statistics endpoint first (most comprehensive)
    const statsData = fetchYahooKeyStatistics(symbol);
    if (statsData) {
      Logger.log('Successfully retrieved key statistics data');
      
      // Update metrics with key statistics
      metrics.marketCap = statsData.marketCap;
      metrics.company = statsData.company;
      metrics.industry = statsData.industry;
      metrics.sector = statsData.sector;
      metrics.beta = statsData.beta;
      metrics.pegRatio = statsData.pegRatio;
      metrics.forwardPE = statsData.forwardPE;
      metrics.priceToBook = statsData.priceToBook;
      metrics.priceToSales = statsData.priceToSales;
      metrics.debtToEquity = statsData.debtToEquity;
      metrics.returnOnEquity = statsData.returnOnEquity;
      metrics.returnOnAssets = statsData.returnOnAssets;
      metrics.profitMargin = statsData.profitMargin;
      metrics.dividendYield = statsData.dividendYield;
      metrics.fiftyTwoWeekHigh = statsData.fiftyTwoWeekHigh;
      metrics.fiftyTwoWeekLow = statsData.fiftyTwoWeekLow;
      metrics.price = statsData.currentPrice;
      metrics.close = statsData.previousClose;
      metrics.pegForwardRatio = statsData.pegForwardRatio; // NEW FIELD
      
      // Calculate price change and percentage change
      if (metrics.price && metrics.close) {
        metrics.priceChange = metrics.price - metrics.close;
        metrics.changesPercentage = ((metrics.price - metrics.close) / metrics.close) * 100;
      }
    }
    
    // If we're missing price data, try price endpoint
    if (!metrics.price || !metrics.volume) {
      Logger.log('Missing price data, trying price endpoint');
      const priceData = fetchYahooPriceData(symbol);
      if (priceData) {
        Logger.log('Successfully retrieved price data');
        
        // Only update if values are null
        if (!metrics.price) metrics.price = priceData.price;
        if (!metrics.volume) metrics.volume = priceData.volume;
        if (!metrics.dayHigh) metrics.dayHigh = priceData.dayHigh;
        if (!metrics.dayLow) metrics.dayLow = priceData.dayLow;
        if (!metrics.open) metrics.open = priceData.open;
        if (!metrics.close) metrics.close = priceData.close;
        if (!metrics.fiftyTwoWeekAverage) metrics.fiftyTwoWeekAverage = priceData.fiftyTwoWeekAverage;
        
        // Recalculate price change if needed
        if (metrics.price && metrics.close && !metrics.priceChange) {
          metrics.priceChange = metrics.price - metrics.close;
          metrics.changesPercentage = ((metrics.price - metrics.close) / metrics.close) * 100;
        }
      }
    }
    
    // --- VALIDATE COMPANY NAME ---
    // If we're missing company data, try search endpoint
    if (!isValidCompanyName(metrics.company) || !metrics.industry || !metrics.sector) {
      Logger.log('Missing or invalid company data, trying search endpoint');
      const searchData = fetchYahooSearchData(symbol);
      if (searchData) {
        Logger.log('Successfully retrieved search data');
        if (!isValidCompanyName(metrics.company) && isValidCompanyName(searchData.company)) metrics.company = searchData.company;
        if (!metrics.industry && searchData.industry) metrics.industry = searchData.industry;
        if (!metrics.sector && searchData.sector) metrics.sector = searchData.sector;
      }
    }
    // --- FALLBACK TO FMP ---
    if (!isValidCompanyName(metrics.company)) {
      Logger.log('Still missing or invalid company name, trying FMP');
      try {
        const fmpData = fetchFMPData(symbol);
        if (fmpData && isValidCompanyName(fmpData.company)) {
          metrics.company = fmpData.company;
          if (fmpData.industry) metrics.industry = fmpData.industry;
          if (fmpData.sector) metrics.sector = fmpData.sector;
        }
      } catch (e) { Logger.log('FMP fallback failed: ' + e); }
    }
    // --- FALLBACK TO TRADIER DESCRIPTION ---
    if (!isValidCompanyName(metrics.company)) {
      Logger.log('Still missing or invalid company name, trying Tradier quote description');
      try {
        var tradierQuote = fetchTradierQuote(symbol);
        if (tradierQuote && tradierQuote.description && isValidCompanyName(tradierQuote.description)) {
          metrics.company = tradierQuote.description;
        }
      } catch (e) { Logger.log('Tradier quote fallback failed: ' + e); }
    }
    // --- FINAL FALLBACK ---
    if (!isValidCompanyName(metrics.company)) {
      metrics.company = symbol; // Use symbol as company name if all sources fail
    }
    Logger.log(`Final Yahoo Finance metrics: price=${metrics.price}, company=${metrics.company}, volume=${metrics.volume}`);
    const hasEssentialData = metrics.price !== null && isValidCompanyName(metrics.company);
    if (hasEssentialData) {
      Logger.log(`Yahoo Finance API result data:`, {
        price: metrics.price,
        volume: metrics.volume,
        marketCap: metrics.marketCap,
        company: metrics.company,
        industry: metrics.industry,
        sector: metrics.sector
      });
      return metrics;
    } else {
      Logger.log(`Failed to retrieve essential data from Yahoo Finance API. Missing price or valid company name.`);
      return null;
    }
  } catch (error) {
    Logger.log(`Error in fetchYahooFinanceData for ${symbol}: ${error}`);
    return null;
  }
}

/**
 * Gets the company name for a given symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Object containing company name, sector, and industry
 */
function getCompanyName(symbol) {
  try {
    // Default return if we can't find the company name
    const defaultReturn = {
      company: symbol,
      sector: null,
      industry: null
    };
    
    // First try to get from cache
    const scriptCache = CacheService.getScriptCache();
    const cacheKey = `COMPANY_DATA_${symbol}`;
    
    const cachedData = scriptCache.get(cacheKey);
    
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {
        Logger.log(`Error parsing cached company data for ${symbol}: ${e}`);
      }
    }
    
    // Try to get company name from Yahoo Finance search
    try {
      const searchData = fetchYahooSearchData(symbol);
      if (searchData && searchData.company) {
        const companyData = {
          company: searchData.company,
          sector: searchData.sector || null,
          industry: searchData.industry || null
        };
        
        // Cache the data
        scriptCache.put(cacheKey, JSON.stringify(companyData), 21600); // 6 hours
        return companyData;
      }
    } catch (e) {
      Logger.log(`Error getting company name from Yahoo for ${symbol}: ${e}`);
    }
    
    // If Yahoo fails, try FMP
    try {
      const fmpData = fetchFMPData(symbol);
      if (fmpData && fmpData.company) {
        const companyData = {
          company: fmpData.company,
          sector: fmpData.sector || null,
          industry: fmpData.industry || null
        };
        
        // Cache the data
        scriptCache.put(cacheKey, JSON.stringify(companyData), 21600); // 6 hours
        return companyData;
      }
    } catch (e) {
      Logger.log(`Error getting company name from FMP for ${symbol}: ${e}`);
    }
    
    // If all else fails, return the symbol as the company name
    return defaultReturn;
  } catch (error) {
    Logger.log(`Error in getCompanyName for ${symbol}: ${error}`);
    return {
      company: symbol,
      sector: null,
      industry: null
    };
  }
}

/**
 * Clears the stock metrics cache for all symbols
 * This is useful when you want to force fresh data retrieval
 */
function clearStockMetricsCache() {
  try {
    Logger.log('Clearing stock metrics cache...');
    
    // Get script cache
    const scriptCache = CacheService.getScriptCache();
    
    // Define our stock symbols
    const stockSymbols = [
      // Major Indices
      'SPY', 'QQQ', 'IWM', 'DIA',
      // Magnificent Seven
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA',
      // Other common stocks
      'V', 'JPM', 'JNJ', 'UNH', 'HD', 'PG', 'MA', 'BAC', 'DIS', 'ADBE',
      'NFLX', 'CRM', 'AMD', 'TSM', 'ASML', 'AVGO', 'CSCO', 'INTC', 'QCOM',
      // Energy and Industrial
      'XOM', 'CVX',
      'BA', 'CAT', 'GE', 'MMM',
      // Deprecated stock symbols
      'FB', 'TWTR'
    ];
    
    // Create cache keys for each symbol
    const keysToRemove = stockSymbols.map(symbol => `STOCK_METRICS_${symbol}`);
    
    // Remove all keys in a batch operation
    if (keysToRemove.length > 0) {
      scriptCache.removeAll(keysToRemove);
    }
    
    Logger.log(`Cleared stock metrics cache for ${keysToRemove.length} symbols`);
    
    return {
      success: true,
      message: `Cleared stock metrics cache for ${keysToRemove.length} symbols`
    };
  } catch (error) {
    Logger.log(`Error clearing stock metrics cache: ${error}`);
    return {
      success: false,
      message: `Error clearing cache: ${error}`
    };
  }
}

/**
 * Clears the stock metrics cache for a specific symbol
 * @param {string} symbol - Stock symbol to clear cache for
 * @return {Object} Result object with success status and message
 */
function clearStockMetricsCacheForSymbol(symbol) {
  try {
    Logger.log(`Clearing stock metrics cache for ${symbol}...`);
    
    const scriptCache = CacheService.getScriptCache();
    const cacheKey = `STOCK_METRICS_${symbol}`;
    
    // Remove the cache entry
    scriptCache.remove(cacheKey);
    
    Logger.log(`Cleared cache for ${symbol}`);
    
    return {
      success: true,
      message: `Cleared stock metrics cache for ${symbol}`
    };
  } catch (error) {
    Logger.log(`Error clearing stock metrics cache for ${symbol}: ${error}`);
    return {
      success: false,
      message: `Error clearing cache for ${symbol}: ${error}`
    };
  }
}
