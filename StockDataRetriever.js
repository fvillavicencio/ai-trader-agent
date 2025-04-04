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
    // Check cache first
    const cache = CacheService.getScriptCache();
    const cachedData = cache.get(symbol);
    
    if (cachedData) {
      console.log(`Using cached data for ${symbol}`);
      return JSON.parse(cachedData);
    }

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
      pegRatio: null,
      forwardPE: null,
      priceToBook: null,
      priceToSales: null,
      debtToEquity: null,
      returnOnEquity: null,
      returnOnAssets: null,
      profitMargin: null,
      beta: null,
      dividendYield: null,
      expenseRatio: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
      dayHigh: null,
      dayLow: null,
      open: null,
      close: null,
      sources: [],
      fromCache: false,
      lastUpdated: new Date().toISOString()
    };

    console.log(`\n=== Data Retrieval for ${symbol} ===`);
    console.log('Attempting Yahoo Finance API...');
    const yahooMetrics = fetchYahooFinanceData(symbol);
    if (yahooMetrics) {
      console.log('Yahoo Finance API provided data:', Object.keys(yahooMetrics).join(', '));
      updateMetrics(metrics, yahooMetrics, 'Yahoo Finance API');
    } else {
      console.log('No data from Yahoo Finance API');
    }

    console.log('Attempting Tradier API...');
    const tradierMetrics = fetchTradierData(symbol);
    if (tradierMetrics) {
      console.log('Tradier API provided data:', Object.keys(tradierMetrics).join(', '));
      updateMetrics(metrics, tradierMetrics, 'Tradier API');
    } else {
      console.log('No data from Tradier API');
    }

    console.log('Attempting Google Finance...');
    const googleFinanceMetrics = fetchGoogleFinanceData(symbol);
    if (googleFinanceMetrics) {
      console.log('Google Finance provided data:', Object.keys(googleFinanceMetrics).join(', '));
      updateMetrics(metrics, googleFinanceMetrics, 'Google Finance');
    } else {
      console.log('No data from Google Finance');
    }

    console.log('Attempting FMP API...');
    const fmpMetrics = fetchFMPData(symbol);
    if (fmpMetrics) {
      console.log('FMP API provided data:', Object.keys(fmpMetrics).join(', '));
      updateMetrics(metrics, fmpMetrics, 'FMP API');
    } else {
      console.log('No data from FMP API');
    }

    console.log('Attempting Yahoo Finance Web...');
    const yahooWebMetrics = fetchYahooFinanceWebData(symbol);
    if (yahooWebMetrics) {
      console.log('Yahoo Finance Web provided data:', Object.keys(yahooWebMetrics).join(', '));
      updateMetrics(metrics, yahooWebMetrics, 'Yahoo Finance Web');
    } else {
      console.log('No data from Yahoo Finance Web');
    }

    console.log('\nFinal metrics for', symbol, ':');
    for (const [key, value] of Object.entries(metrics)) {
      if (key !== 'sources' && key !== 'fromCache' && key !== 'lastUpdated') {
        console.log(key, ':', value);
      }
    }

    // Cache the results if we have valid data
    if (Object.values(metrics).some(value => value !== null && value !== undefined)) {
      cache.put(symbol, JSON.stringify(metrics), CACHE_DURATION);
    }

    return metrics;
  } catch (error) {
    console.error('Error in retrieveStockMetrics:', error);
    throw error;
  }
}

/**
 * Helper function to update metrics with new data
 * @param {Object} metrics - Current metrics object
 * @param {Object} newData - New data to merge
 * @param {string} source - Source of the data
 */
function updateMetrics(metrics, newData, source) {
  if (!metrics.sources) {
    metrics.sources = [];
  }
  
  for (const [key, value] of Object.entries(newData)) {
    if (value !== null && value !== undefined && metrics[key] === null) {
      metrics[key] = value;
    }
  }
  
  metrics.sources.push(source);
}

/**
 * Helper function to make API requests with retry logic
 * @param {string} url - API endpoint URL
 * @param {number} maxRetries - Maximum number of retries
 * @return {Object|null} API response or null on failure
 */
function makeTradierApiRequest(url, maxRetries = 3) {
  let retries = 0;
  let response;
  
  while (retries < maxRetries) {
    try {
      response = UrlFetchApp.fetch(url, {
        headers: {
          'Authorization': `Bearer ${PropertiesService.getScriptProperties().getProperty('TRADIER_API_KEY')}`,
          'Accept': 'application/json'
        },
        muteHttpExceptions: true
      });
      
      // If successful, return the response
      if (response.getResponseCode() === 200) {
        return JSON.parse(response.getContentText());
      }
      
      // If rate limited, wait and retry
      if (response.getResponseCode() === 429) {
        console.log(`Rate limited. Retrying in ${Math.pow(2, retries)} seconds...`);
        Utilities.sleep(Math.pow(2, retries) * 1000);
        retries++;
        continue;
      }
      
      // If other error, log and return null
      console.error(`API error: ${response.getResponseCode()} - ${response.getContentText()}`);
      return null;
    } catch (error) {
      console.error(`API request error: ${error}. Retry ${retries + 1}/${maxRetries}`);
      retries++;
      
      if (retries < maxRetries) {
        Utilities.sleep(Math.pow(2, retries) * 1000);
      }
    }
  }
  
  return null;
}

/**
 * Fetches data from Tradier API for a specific symbol
 * @param {string} symbol - Stock symbol
 * @return {Object} Metrics object or null
 */
function fetchTradierData(symbol) {
  try {
    console.log(`Fetching Tradier data for ${symbol}`);
    
    // Initialize metrics object with null values
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
      company: null,
      industry: null,
      sector: null,
      price: null,
      priceChange: null,
      changesPercentage: null,
      volume: null,
      marketCap: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
      dayHigh: null,
      dayLow: null,
      open: null,
      close: null
    };

    // Check API key
    const tradierApiKey = PropertiesService.getScriptProperties().getProperty('TRADIER_API_KEY');
    if (!tradierApiKey) {
      console.error('Tradier API key not configured');
      return null;
    }

    // Fetch quotes data
    const quotesUrl = `https://api.tradier.com/v1/markets/quotes?symbols=${symbol}&includeTags=true`;
    const quotesData = makeTradierApiRequest(quotesUrl);
    
    if (quotesData && quotesData.quotes && quotesData.quotes.quote) {
      const quote = quotesData.quotes.quote;
      metrics.price = parseFloat(quote.last);
      metrics.priceChange = parseFloat(quote.change);
      metrics.changesPercentage = parseFloat(quote.change_percent);
      metrics.volume = parseFloat(quote.volume);
      metrics.marketCap = parseFloat(quote.market_cap);
      metrics.company = quote.description;
      metrics.industry = quote.industry;
      metrics.sector = quote.sector;
      metrics.beta = parseFloat(quote.beta);
      metrics.fiftyTwoWeekHigh = parseFloat(quote.high_52);
      metrics.fiftyTwoWeekLow = parseFloat(quote.low_52);
      metrics.dayHigh = parseFloat(quote.high);
      metrics.dayLow = parseFloat(quote.low);
      metrics.open = parseFloat(quote.open);
      metrics.close = parseFloat(quote.prevclose);
    }

    // Fetch company profile
    const profileUrl = `https://api.tradier.com/v1/markets/fundamentals/company?symbols=${symbol}`;
    const profileData = makeTradierApiRequest(profileUrl);
    
    if (profileData && profileData.length > 0 && profileData[0].results) {
      const results = profileData[0].results;
      const companyData = results.find(result => result.type === "Company");
      
      if (companyData && companyData.tables) {
        if (companyData.tables.company_profile) {
          const profile = companyData.tables.company_profile;
          metrics.company = profile.company_name;
          metrics.industry = profile.industry;
          metrics.sector = profile.sector;
        }
        
        if (companyData.tables.market_cap) {
          metrics.marketCap = companyData.tables.market_cap[0].value;
        }
        
        if (companyData.tables.volume) {
          metrics.volume = companyData.tables.volume[0].value;
        }
      }
    }

    // Fetch financial ratios
    const ratiosUrl = `https://api.tradier.com/v1/markets/fundamentals/ratios?symbols=${symbol}`;
    const ratiosData = makeTradierApiRequest(ratiosUrl);
    
    if (ratiosData && ratiosData.length > 0 && ratiosData[0].results) {
      const results = ratiosData[0].results;
      const companyData = results.find(result => result.type === "Company");
      
      if (companyData && companyData.tables) {
        if (companyData.tables.operation_ratios_restate && companyData.tables.operation_ratios_restate.length > 0) {
          const ratios = companyData.tables.operation_ratios_restate[0].period_1y;
          
          if (ratios) {
            metrics.returnOnEquity = parseFloat(ratios.r_o_e);
            metrics.returnOnAssets = parseFloat(ratios.r_o_a);
            metrics.profitMargin = parseFloat(ratios.net_margin);
            metrics.debtToEquity = parseFloat(ratios.financial_leverage) - 1;
          }
        }
      }
    }

    // Validate required fields
    if (metrics.price === null || metrics.volume === null) {
      console.error('Missing required fields in Tradier response');
      return null;
    }

    return metrics;
  } catch (error) {
    console.error(`Error fetching Tradier data for ${symbol}: ${error}`);
    return null;
  }
}

/**
 * Fetch data from FMP API
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
    Utilities.sleep(2000);
    
    // Get the values
    const price = sheet.getRange("B1").getValue();
    const openPrice = sheet.getRange("C1").getValue();
    const volume = sheet.getRange("D1").getValue();
    const marketCap = sheet.getRange("E1").getValue();
    const beta = sheet.getRange("F1").getValue();
    
    // Calculate price change and percentage change
    const priceChange = price - openPrice;
    const changesPercentage = (priceChange / openPrice) * 100;
    
    // Get company name from the shared spreadsheet
    const companyData = getCompanyName(symbol);
    
    // Clean up
    DriveApp.getFileById(tempSpreadsheet.getId()).setTrashed(true);
    
    // Create metrics object
    const metrics = {
      price: price,
      priceChange: priceChange,
      changesPercentage: changesPercentage,
      volume: volume,
      marketCap: marketCap,
      beta: beta,
      company: companyData?.name || null,
      industry: companyData?.industry || null,
      sector: companyData?.sector || null
    };
    
    // Detailed logging
    console.log(`Google Finance data for ${symbol}:`, {
      price: metrics.price,
      priceChange: metrics.priceChange,
      changesPercentage: metrics.changesPercentage,
      volume: metrics.volume,
      marketCap: metrics.marketCap,
      beta: metrics.beta,
      company: metrics.company,
      industry: metrics.industry,
      sector: metrics.sector
    });
    
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
 * Fetch data from Yahoo Finance Web
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
 * Fetches data from Yahoo Finance for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Yahoo Finance data
 */
function fetchYahooFinanceData(symbol) {
  try {
    console.log(`Fetching Yahoo Finance data for ${symbol}`);
    
    // Get the API key from script properties
    const yahooFinanceKey = getYahooFinanceApiKey();
    
    if (!yahooFinanceKey) {
      console.error('Yahoo Finance API key not configured');
      return null;
    }
    
    const options = {
      'method': 'GET',
      'headers': {
        'X-RapidAPI-Key': yahooFinanceKey,
        'X-RapidAPI-Host': 'yahoo-finance127.p.rapidapi.com'
      },
      'muteHttpExceptions': true
    };
    
    // Make the API request
    const url = `https://yahoo-finance127.p.rapidapi.com/finance-analytics/${symbol}`;
    console.log(`Yahoo Finance API URL: ${url}`);
    
    const response = UrlFetchApp.fetch(url, options);
    console.log(`Yahoo Finance API response code: ${response.getResponseCode()}`);
    
    if (response.getResponseCode() !== 200) {
      console.error(`Error fetching Yahoo Finance API data for ${symbol}: ${response.getContentText()}`);
      return null;
    }
    
    // Parse the response
    const data = JSON.parse(response.getContentText());
    console.log(`Yahoo Finance API response:`, JSON.stringify(data, null, 2));
    
    if (data && data.quoteSummary && data.quoteSummary.result && data.quoteSummary.result.length > 0) {
      const result = data.quoteSummary.result[0];
      
      // Extract metrics
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
        close: null
      };
      
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
      }
      
      // Extract price data
      if (result.price) {
        const priceData = result.price;
        
        if (priceData.regularMarketPrice && priceData.regularMarketPrice.raw) {
          metrics.price = priceData.regularMarketPrice.raw;
        }
        
        if (priceData.regularMarketChange && priceData.regularMarketChange.raw) {
          metrics.priceChange = priceData.regularMarketChange.raw;
        }
        
        if (priceData.regularMarketChangePercent && priceData.regularMarketChangePercent.raw) {
          metrics.changesPercentage = priceData.regularMarketChangePercent.raw;
        }
        
        if (priceData.regularMarketVolume && priceData.regularMarketVolume.raw) {
          metrics.volume = priceData.regularMarketVolume.raw;
        }
        
        if (priceData.regularMarketPreviousClose && priceData.regularMarketPreviousClose.raw) {
          metrics.close = priceData.regularMarketPreviousClose.raw;
        }
      }
      
      // Extract summary detail
      if (result.summaryDetail) {
        const summaryData = result.summaryDetail;
        
        if (summaryData.marketCap && summaryData.marketCap.raw) {
          metrics.marketCap = summaryData.marketCap.raw;
        }
        
        if (summaryData.fiftyTwoWeekHigh && summaryData.fiftyTwoWeekHigh.raw) {
          metrics.fiftyTwoWeekHigh = summaryData.fiftyTwoWeekHigh.raw;
        }
        
        if (summaryData.fiftyTwoWeekLow && summaryData.fiftyTwoWeekLow.raw) {
          metrics.fiftyTwoWeekLow = summaryData.fiftyTwoWeekLow.raw;
        }
        
        if (summaryData.dayHigh && summaryData.dayHigh.raw) {
          metrics.dayHigh = summaryData.dayHigh.raw;
        }
        
        if (summaryData.dayLow && summaryData.dayLow.raw) {
          metrics.dayLow = summaryData.dayLow.raw;
        }
        
        if (summaryData.open && summaryData.open.raw) {
          metrics.open = summaryData.open.raw;
        }
        
        if (summaryData.dividendYield && summaryData.dividendYield.raw) {
          metrics.dividendYield = summaryData.dividendYield.raw;
        }
      }
      
      // Extract asset profile
      if (result.assetProfile) {
        const assetData = result.assetProfile;
        
        if (assetData.companyName) {
          metrics.company = assetData.companyName;
        }
        
        if (assetData.industry) {
          metrics.industry = assetData.industry;
        }
        
        if (assetData.sector) {
          metrics.sector = assetData.sector;
        }
      }
      
      console.log(`Yahoo Finance API result data:`, {
        price: metrics.price,
        volume: metrics.volume,
        marketCap: metrics.marketCap,
        company: metrics.company,
        industry: metrics.industry,
        sector: metrics.sector
      });
      
      return metrics;
    } else {
      console.log('Yahoo Finance API response has no results:', data);
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching Yahoo Finance data for ${symbol}: ${error}`);
    console.error(`Error details:`, error.stack);
    return null;
  }
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
      ['Beta:', metrics.beta ? formatValue(metrics.beta) : 'N/A'],
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
      ['Volume:', metrics.volume ? formatVolume(metrics.volume) : 'N/A']
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
 * Formats numeric values with proper formatting
 * @param {number} value - Numeric value
 * @return {string} Formatted value
 */
function formatValue(value) {
  if (!value) return 'N/A';
  return value.toFixed(2);
}

/**
 * Main function to test the script
 */
function testStockMetrics() {
  try {
    // Ensure spreadsheet is set up
    setupSpreadsheet();
    
    // Set up Yahoo Finance API key
    const yahooFinanceKey = 'YOUR_YAHOO_FINANCE_API_KEY'; // Replace with actual key
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty('YAHOO_FINANCE_API_KEY', yahooFinanceKey);
    console.log('Yahoo Finance API key set successfully');
    
    const symbol = 'TSLA';
    console.log(`\nTesting stock metrics retrieval for ${symbol}...`);
    
    const startTime = new Date().getTime();
    const metrics = retrieveStockMetrics(symbol);
    const executionTime = (new Date().getTime() - startTime) / 1000;
    
    if (!metrics) {
      console.error('No metrics returned');
      return;
    }
    
    console.log(`\nMetrics for ${symbol}:`);
    console.log(`Price: $${metrics.price}`);
    console.log(`Company: ${metrics.company}`);
    console.log(`Industry: ${metrics.industry}`);
    console.log(`Sector: ${metrics.sector}`);
    console.log(`Market Cap: ${metrics.marketCap}`);
    console.log(`Volume: ${metrics.volume}`);
    console.log(`Sources: ${metrics.sources.join(', ')}`);
    console.log(`From Cache: ${metrics.fromCache ? 'Yes' : 'No'}`);
    console.log(`Execution Time: ${executionTime.toFixed(2)} seconds`);
    
    // Display metrics in the active sheet
    displayMetrics(metrics);
    
  } catch (error) {
    console.error(`Error in testStockMetrics: ${error}`);
    throw error;
  }
}

/**
 * Add menu item to run the script
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    const menu = ui.createMenu('Stock Data');
    menu.addItem('Retrieve Metrics', 'testStockMetrics');
    menu.addToUi();
  } catch (error) {
    console.error(`Error in onOpen: ${error}`);
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
