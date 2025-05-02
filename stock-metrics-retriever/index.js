require('dotenv').config();

const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');

// Initialize cache with 30-minute expiration
const cache = new NodeCache({ stdTTL: 1800 });

// Configuration
const API_KEYS = {
  FMP_API_KEY: process.env.FMP_API_KEY,
  TRADIER_API_KEY: process.env.TRADIER_API_KEY,
  YAHOO_FINANCE_API_KEY: process.env.YAHOO_FINANCE_API_KEY
};

// Remove duplicates from the target symbols array
const TARGET_SYMBOLS = [...new Set(['TSLA', 'SPY', 'QQQ', 'IWM', 'DIA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA'])];

// Helper function to add delay between API calls

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Exponential backoff function
const exponentialBackoff = (attempt) => Math.min(1000 * Math.pow(2, attempt), 30000);

async function fetchWithRetry(func, symbol, maxRetries = 3) {
  let attempt = 0;
  let lastError = null;
  
  while (attempt < maxRetries) {
    try {
      const result = await func(symbol);
      return result; // Return the result if successful
    } catch (error) {
      lastError = error;
      attempt++;
      
      if (error.response && error.response.status === 429) {
        console.error(`Attempt ${attempt} failed for ${symbol}: ${error.message}`);
        if (attempt < maxRetries) {
          const delay = exponentialBackoff(attempt);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } else {
        // For other errors, don't retry
        break;
      }
    }
  }
  
  // If we get here, all attempts failed
  if (lastError && lastError.response && lastError.response.status === 429) {
    throw lastError; // Rethrow the rate limit error for handling upstream
  }
  
  return null; // Return null for other errors
}

async function retrieveFundamentalMetrics(symbols = []) {
  const results = [];
  
  for (const symbol of symbols) {
    console.log(`\n=== Retrieving metrics for ${symbol} ===`);
    
    // Check cache first
    const cacheKey = `METRICS_${symbol}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Using cached data for ${symbol} (less than 30 minutes old)`);
      results.push({...cachedData, fromCache: true});
      continue;
    }
    
    // Initialize metrics object with null values
    const metrics = {
      symbol,
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
      
      // Greeks
      delta: null,
      gamma: null,
      theta: null,
      vega: null,
      rho: null,
      sources: [],
      fromCache: false,
      lastUpdated: new Date().toISOString()
    };
    
    // Try all data sources in order - prioritize the ones that are working
    const dataSources = [
      { name: "Yahoo Finance API", func: fetchYahooFinanceData },
      { name: "Tradier API", func: fetchTradierData },
      { name: "FMP API", func: fetchFMPData },
      { name: "Yahoo Finance Web", func: fetchYahooFinanceWebData }
    ];
    
    // Track rate limited APIs to avoid retrying them
    const rateLimitedApis = new Set();
    
    // Try each data source and progressively merge data
    for (const source of dataSources) {
      // Skip rate limited APIs
      if (rateLimitedApis.has(source.name)) {
        console.log(`Skipping ${source.name} due to rate limiting`);
        continue;
      }
      
      try {
        console.log(`Attempting to fetch data from ${source.name} for ${symbol}...`);
        const data = await fetchWithRetry(source.func, symbol);
        
        // Add a small delay between API calls to avoid rate limiting
        await delay(500);
        
        if (data) {
          console.log(`Retrieved data from ${source.name} for ${symbol}`);
          
          // Merge data from this source into our metrics object
          // Only overwrite null values with non-null values
          let metricsAdded = 0;
          for (const [key, value] of Object.entries(data)) {
            if (value !== null && value !== undefined && metrics.hasOwnProperty(key) && metrics[key] === null) {
              metrics[key] = value;
              metricsAdded++;
            }
          }
          
          console.log(`Added ${metricsAdded} metrics from ${source.name}`);
          
          // Add this source to the list of sources used
          if (metrics.sources && Array.isArray(metrics.sources)) {
            metrics.sources.push(source.name);
          }
        }
      } catch (error) {
        if (error.response && error.response.status === 429) {
          console.error(`${source.name} rate limit exceeded for ${symbol}`);
          rateLimitedApis.add(source.name);
        } else {
          console.error(`Error fetching data from ${source.name} for ${symbol}: ${error.message}`);
        }
      }
    }
    
    // Count valid metrics
    let validMetricsCount = 0;
    for (const [key, value] of Object.entries(metrics)) {
      if (key !== 'symbol' && key !== 'sources' && key !== 'fromCache' && key !== 'lastUpdated' && 
          value !== null && value !== undefined) {
        validMetricsCount++;
      }
    }
    
    console.log(`Found ${validMetricsCount} valid metrics for ${symbol}`);
    
    // Cache the metrics data (30-minute cache)
    if (validMetricsCount > 0) {
      cache.set(cacheKey, metrics);
      console.log(`Cached metrics for ${symbol}`);
    }
    
    results.push(metrics);
  }
  
  return results;
}

async function fetchYahooFinanceData(symbol) {
  try {
    // First fetch fundamentals data
    const baseUrl = 'https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/get-fundamentals';
    
    const fundamentalsOptions = {
      headers: {
        'X-RapidAPI-Key': API_KEYS.YAHOO_FINANCE_API_KEY,
        'X-RapidAPI-Host': 'apidojo-yahoo-finance-v1.p.rapidapi.com'
      },
      params: {
        region: 'US',
        symbol: symbol,
        lang: 'en-US',
        modules: 'assetProfile,summaryProfile,fundProfile'
      }
    };
    
    // Add delay to avoid rate limiting
    await delay(1000);
    
    let fundamentalsResponse;
    try {
      fundamentalsResponse = await axios.get(baseUrl, fundamentalsOptions);
    } catch (error) {
      console.log(`Error fetching fundamentals data for ${symbol} from Yahoo Finance: ${error.message}`);
      if (error.response && error.response.status === 429) {
        throw error; // Let the retry mechanism handle it
      }
      // Continue with null fundamentals data
      fundamentalsResponse = { data: null };
    }
    
    const fundamentalsData = fundamentalsResponse.data;
    
    let fundamentalsResult = null;
    if (fundamentalsData && fundamentalsData.quoteSummary && fundamentalsData.quoteSummary.result && fundamentalsData.quoteSummary.result.length > 0) {
      fundamentalsResult = fundamentalsData.quoteSummary.result[0];
    } else {
      console.log(`No fundamentals data found for ${symbol} from Yahoo Finance`);
    }
    
    // Then fetch quote data
    const quoteUrl = 'https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes';
    
    const quoteOptions = {
      headers: {
        'X-RapidAPI-Key': API_KEYS.YAHOO_FINANCE_API_KEY,
        'X-RapidAPI-Host': 'apidojo-yahoo-finance-v1.p.rapidapi.com'
      },
      params: {
        region: 'US',
        symbols: symbol
      }
    };
    
    // Add delay to avoid rate limiting
    await delay(1000);
    
    let quoteResponse;
    try {
      quoteResponse = await axios.get(quoteUrl, quoteOptions);
    } catch (error) {
      console.log(`Error fetching quote data for ${symbol} from Yahoo Finance: ${error.message}`);
      if (error.response && error.response.status === 429) {
        throw error; // Let the retry mechanism handle it
      }
      // Continue with null quote data
      quoteResponse = { data: null };
    }
    
    const quoteData = quoteResponse.data;
    
    let quoteResult = null;
    if (quoteData && quoteData.quoteResponse && quoteData.quoteResponse.result && quoteData.quoteResponse.result.length > 0) {
      quoteResult = quoteData.quoteResponse.result[0];
    } else {
      console.log(`No quote data found for ${symbol} from Yahoo Finance`);
    }
    
    // If both fundamentals and quote data are null, return null
    if (!fundamentalsResult && !quoteResult) {
      console.log(`No data found for ${symbol} from Yahoo Finance`);
      return null;
    }
    
    // Extract metrics
    const metrics = {
      price: quoteResult?.regularMarketPrice || null,
      priceChange: quoteResult?.regularMarketChange || null,
      changesPercentage: quoteResult?.regularMarketChangePercent || null,
      volume: quoteResult?.regularMarketVolume || null,
      marketCap: quoteResult?.marketCap || null,
      company: quoteResult?.shortName || null,
      industry: fundamentalsResult?.assetProfile?.industry || null,
      sector: fundamentalsResult?.assetProfile?.sector || null,
      pegRatio: fundamentalsResult?.defaultKeyStatistics?.pegRatio?.raw || null,
      forwardPE: fundamentalsResult?.summaryDetail?.forwardPE?.raw || null,
      priceToBook: fundamentalsResult?.defaultKeyStatistics?.priceToBook?.raw || null,
      priceToSales: fundamentalsResult?.summaryDetail?.priceToSales?.raw || null,
      debtToEquity: fundamentalsResult?.financialData?.debtToEquity?.raw || null,
      returnOnEquity: fundamentalsResult?.financialData?.returnOnEquity?.raw || null,
      returnOnAssets: fundamentalsResult?.financialData?.returnOnAssets?.raw || null,
      profitMargin: fundamentalsResult?.financialData?.profitMargins?.raw || null,
      beta: quoteResult?.beta || null,
      dividendYield: quoteResult?.dividendYield || null,
      expenseRatio: quoteResult?.netExpenseRatio || null,
      
      // Additional metrics
      fiftyTwoWeekHigh: quoteResult?.fiftyTwoWeekHigh || null,
      fiftyTwoWeekLow: quoteResult?.fiftyTwoWeekLow || null,
      dayHigh: quoteResult?.regularMarketDayHigh || null,
      dayLow: quoteResult?.regularMarketDayLow || null,
      open: quoteResult?.regularMarketOpen || null,
      close: quoteResult?.regularMarketPreviousClose || null,
      
      // Greeks (if available)
      delta: fundamentalsResult?.optionChain?.result?.[0]?.options?.[0]?.calls?.[0]?.delta || null,
      gamma: fundamentalsResult?.optionChain?.result?.[0]?.options?.[0]?.calls?.[0]?.gamma || null,
      theta: fundamentalsResult?.optionChain?.result?.[0]?.options?.[0]?.calls?.[0]?.theta || null,
      vega: fundamentalsResult?.optionChain?.result?.[0]?.options?.[0]?.calls?.[0]?.vega || null,
      rho: fundamentalsResult?.optionChain?.result?.[0]?.options?.[0]?.calls?.[0]?.rho || null
    };
    
    // Count non-null values
    const validMetricsCount = Object.values(metrics).filter(value => 
      value !== null && 
      !['symbol', 'sources', 'fromCache', 'lastUpdated'].includes(value)
    ).length;
    
    console.log(`Retrieved ${validMetricsCount} metrics from Yahoo Finance for ${symbol}`);
    return metrics;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.error(`Yahoo Finance API rate limit exceeded for ${symbol}`);
      throw error; // Let the retry mechanism handle it
    }
    console.error(`Error fetching Yahoo Finance data for ${symbol}: ${error.message}`);
    return null;
  }
}

async function fetchTradierData(symbol) {
  try {
    console.log(`Fetching Tradier data for ${symbol}`);
    
    // Initialize metrics with null values
    const metrics = {
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
      close: null
    };
    
    // Helper function to make API requests with retry logic
    async function makeApiRequest(url, maxRetries = 3) {
      let retries = 0;
      
      while (retries < maxRetries) {
        try {
          const response = await axios.get(url, {
            headers: {
              'Authorization': `Bearer ${API_KEYS.TRADIER_API_KEY}`,
              'Accept': 'application/json'
            }
          });
          
          if (response.status === 200) {
            return response.data;
          }
          
          // If rate limited, wait and retry
          if (response.status === 429) {
            console.log(`Rate limited. Retrying in ${Math.pow(2, retries)} seconds...`);
            await delay(Math.pow(2, retries) * 1000); // Exponential backoff
            retries++;
            continue;
          }
          
          // If other error, log and return null
          console.error(`API error: ${response.status} - ${response.data}`);
          return null;
        } catch (error) {
          console.error(`API request error: ${error.message}. Retry ${retries + 1}/${maxRetries}`);
          retries++;
          
          if (retries < maxRetries) {
            await delay(Math.pow(2, retries) * 1000); // Exponential backoff
          }
        }
      }
      
      return null;
    }
    
    // First, get the company profile
    const profileUrl = `https://api.tradier.com/v1/markets/fundamentals/company?symbols=${encodeURIComponent(symbol)}`;
    const profileData = await makeApiRequest(profileUrl);
    
    if (profileData && profileData.securities && profileData.securities.security) {
      const security = profileData.securities.security;
      
      // Extract company data
      metrics.company = security.company_name || null;
      metrics.industry = security.industry || null;
      metrics.sector = security.sector || null;
      metrics.marketCap = security.market_cap || null;
      metrics.beta = security.beta || null;
      metrics.dividendYield = security.dividend_yield || null;
      
      // Extract price data
      metrics.price = security.last || null;
      metrics.priceChange = security.change || null;
      metrics.changesPercentage = security.change_percentage || null;
      metrics.volume = security.volume || null;
      metrics.open = security.open || null;
      metrics.close = security.prevclose || null;
      metrics.dayHigh = security.high || null;
      metrics.dayLow = security.low || null;
      metrics.fiftyTwoWeekHigh = security.week_52_high || null;
      metrics.fiftyTwoWeekLow = security.week_52_low || null;
    }
    
    // Next, get the financial ratios
    const ratiosUrl = `https://api.tradier.com/v1/markets/fundamentals/ratios?symbols=${encodeURIComponent(symbol)}`;
    const ratiosData = await makeApiRequest(ratiosUrl);
    
    if (ratiosData && ratiosData.securities && ratiosData.securities.security) {
      const security = ratiosData.securities.security;
      
      // Extract valuation ratios
      metrics.pegRatio = security.peg_ratio || null;
      metrics.forwardPE = security.forward_pe || null;
      metrics.priceToBook = security.price_to_book || null;
      metrics.priceToSales = security.price_to_sales || null;
      
      // Extract financial ratios
      metrics.returnOnEquity = security.return_on_equity || null;
      metrics.returnOnAssets = security.return_on_assets || null;
      metrics.profitMargin = security.profit_margin || null;
      metrics.debtToEquity = security.debt_to_equity || null;
    }
    
    // If we still don't have dividend yield, try the dividends endpoint
    if (metrics.dividendYield === null) {
      const dividendsUrl = `https://api.tradier.com/v1/markets/dividends?symbols=${encodeURIComponent(symbol)}`;
      const dividendsData = await makeApiRequest(dividendsUrl);
      
      if (dividendsData && dividendsData.dividends && dividendsData.dividends.dividend) {
        const dividend = dividendsData.dividends.dividend;
        if (dividend.yield) {
          metrics.dividendYield = parseFloat(dividend.yield);
        }
      }
    }
    
    // Count non-null values
    const validMetricsCount = Object.values(metrics).filter(value => 
      value !== null && 
      !['symbol', 'sources', 'fromCache', 'lastUpdated'].includes(value)
    ).length;
    
    console.log(`Retrieved ${validMetricsCount} metrics from Tradier for ${symbol}`);
    return metrics;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.error(`Tradier API rate limit exceeded for ${symbol}`);
      throw error; // Let the retry mechanism handle it
    }
    console.error(`Error fetching Tradier data for ${symbol}: ${error.message}`);
    return null;
  }
}

async function fetchFMPData(symbol) {
  try {
    console.log(`Fetching FMP data for ${symbol}`);
    
    // Initialize metrics with null values
    const metrics = {
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
      close: null
    };
    
    // Helper function to make API requests with retry logic
    async function makeApiRequest(url, maxRetries = 3) {
      let retries = 0;
      
      while (retries < maxRetries) {
        try {
          const response = await axios.get(url, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
            },
            params: {
              apikey: API_KEYS.FMP_API_KEY
            }
          });
          
          if (response.status === 200) {
            return response.data;
          }
          
          // If rate limited, wait and retry
          if (response.status === 429) {
            console.log(`Rate limited. Retrying in ${Math.pow(2, retries)} seconds...`);
            await delay(Math.pow(2, retries) * 1000);
            retries++;
            continue;
          }
          
          // If other error, log and return null
          console.error(`API error: ${response.status} - ${response.data}`);
          return null;
        } catch (error) {
          console.error(`API request error: ${error.message}. Retry ${retries + 1}/${maxRetries}`);
          retries++;
          
          if (retries < maxRetries) {
            await delay(Math.pow(2, retries) * 1000);
          }
        }
      }
      
      return null;
    }
    
    // First, get the profile data
    const profileUrl = `https://financialmodelingprep.com/api/v3/profile/${symbol}`;
    const profileData = await makeApiRequest(profileUrl);
    
    if (profileData && Array.isArray(profileData) && profileData.length > 0) {
      const profile = profileData[0];
      
      // Extract company data
      metrics.company = profile.companyName || null;
      metrics.industry = profile.industry || null;
      metrics.sector = profile.sector || null;
      metrics.marketCap = profile.marketCap || null;
      metrics.beta = profile.beta || null;
      metrics.dividendYield = profile.dividendYield || null;
    }
    
    // Next, get the quote data
    const quoteUrl = `https://financialmodelingprep.com/api/v3/quote/${symbol}`;
    const quoteData = await makeApiRequest(quoteUrl);
    
    if (quoteData && Array.isArray(quoteData) && quoteData.length > 0) {
      const quote = quoteData[0];
      
      // Extract price data
      metrics.price = quote.price || null;
      metrics.priceChange = quote.change || null;
      metrics.changesPercentage = quote.changesPercentage || null;
      metrics.volume = quote.volume || null;
      metrics.open = quote.open || null;
      metrics.close = quote.previousClose || null;
      metrics.dayHigh = quote.dayHigh || null;
      metrics.dayLow = quote.dayLow || null;
      metrics.fiftyTwoWeekHigh = quote.yearHigh || null;
      metrics.fiftyTwoWeekLow = quote.yearLow || null;
    }
    
    // Get key metrics for additional ratios
    const keyMetricsUrl = `https://financialmodelingprep.com/api/v3/key-metrics-ttm/${symbol}`;
    const keyMetricsData = await makeApiRequest(keyMetricsUrl);
    
    if (keyMetricsData && Array.isArray(keyMetricsData) && keyMetricsData.length > 0) {
      const metricsData = keyMetricsData[0];
      
      // Extract valuation ratios
      metrics.pegRatio = metricsData.pegRatio || null;
      metrics.forwardPE = metricsData.forwardPE || null;
      metrics.priceToBook = metricsData.pbRatioTTM || null;
      metrics.priceToSales = metricsData.psRatioTTM || null;
      
      // Extract financial ratios
      metrics.returnOnEquity = metricsData.roeTTM || null;
      metrics.returnOnAssets = metricsData.roaTTM || null;
      metrics.profitMargin = metricsData.netProfitMarginTTM || null;
      metrics.debtToEquity = metricsData.debtToEquityTTM || null;
    }
    
    // Count non-null values
    const validMetricsCount = Object.values(metrics).filter(value => 
      value !== null && 
      !['symbol', 'sources', 'fromCache', 'lastUpdated'].includes(value)
    ).length;
    
    console.log(`Retrieved ${validMetricsCount} metrics from FMP for ${symbol}`);
    return metrics;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.error(`FMP API rate limit exceeded for ${symbol}`);
      throw error; // Let the retry mechanism handle it
    }
    console.error(`Error fetching FMP data for ${symbol}: ${error.message}`);
    return null;
  }
}

async function fetchYahooFinanceWebData(symbol) {
  try {
    console.log(`Fetching Yahoo Finance web data for ${symbol}`);
    
    // Initialize metrics with null values
    const metrics = {
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
      close: null
    };
    
    // Helper function to make API requests with retry logic
    async function makeApiRequest(url, maxRetries = 3) {
      let retries = 0;
      
      while (retries < maxRetries) {
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Cache-Control': 'max-age=0'
            },
            timeout: 10000
          });
          
          if (response.status === 200) {
            return response.data;
          }
          
          // If rate limited, wait and retry
          if (response.status === 429) {
            console.log(`Rate limited. Retrying in ${Math.pow(2, retries)} seconds...`);
            await delay(Math.pow(2, retries) * 1000);
            retries++;
            continue;
          }
          
          // If other error, log and return null
          console.error(`API error: ${response.status} - ${response.data}`);
          return null;
        } catch (error) {
          console.error(`API request error: ${error.message}. Retry ${retries + 1}/${maxRetries}`);
          retries++;
          
          if (retries < maxRetries) {
            await delay(Math.pow(2, retries) * 1000);
          }
        }
      }
      
      return null;
    }
    
    // Fetch the HTML content from Yahoo Finance
    const url = `https://finance.yahoo.com/quote/${symbol}`;
    const html = await makeApiRequest(url);
    
    if (!html) {
      console.error(`Failed to fetch Yahoo Finance HTML for ${symbol}`);
      return null;
    }
    
    // Use regex to extract the JSON data embedded in the page
    const regex = /root\.App\.main\s*=(\s*\{.*\});/;
    const matches = html.match(regex);
    
    if (!matches || matches.length < 2) {
      console.error(`Could not find the JSON data on the page for ${symbol}`);
      return null;
    }
    
    const jsonStr = matches[1];
    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch (e) {
      console.error(`Error parsing JSON for ${symbol}: ${e.message}`);
      return null;
    }
    
    // Navigate through the JSON structure to access the QuoteSummaryStore
    const store = data.context && data.context.dispatcher && data.context.dispatcher.stores && data.context.dispatcher.stores.QuoteSummaryStore;
    if (!store) {
      console.error(`Could not locate the QuoteSummaryStore in the JSON data for ${symbol}`);
      return null;
    }
    
    // Extract price data
    if (store.price && store.price.regularMarketPrice) {
      metrics.price = store.price.regularMarketPrice.raw;
    }
    
    if (store.price && store.price.regularMarketChange) {
      metrics.priceChange = store.price.regularMarketChange.raw;
    }
    
    if (store.price && store.price.regularMarketChangePercent) {
      metrics.changesPercentage = store.price.regularMarketChangePercent.raw * 100;
    }
    
    // Extract volume
    if (store.summaryDetail && store.summaryDetail.volume) {
      metrics.volume = store.summaryDetail.volume.raw;
    }
    
    // Extract market cap
    if (store.summaryDetail && store.summaryDetail.marketCap) {
      metrics.marketCap = store.summaryDetail.marketCap.raw;
    }
    
    // Extract company data
    if (store.price && store.price.longName) {
      metrics.company = store.price.longName;
    }
    
    // Extract industry and sector
    if (store.summaryProfile && store.summaryProfile.industry) {
      metrics.industry = store.summaryProfile.industry;
    }
    
    if (store.summaryProfile && store.summaryProfile.sector) {
      metrics.sector = store.summaryProfile.sector;
    }
    
    // Extract ratios
    if (store.summaryDetail && store.summaryDetail.pegRatio) {
      metrics.pegRatio = store.summaryDetail.pegRatio.raw;
    }
    
    if (store.summaryDetail && store.summaryDetail.forwardPE) {
      metrics.forwardPE = store.summaryDetail.forwardPE.raw;
    }
    
    if (store.defaultKeyStatistics && store.defaultKeyStatistics.priceToBook) {
      metrics.priceToBook = store.defaultKeyStatistics.priceToBook.raw;
    }
    
    if (store.defaultKeyStatistics && store.defaultKeyStatistics.priceToSales) {
      metrics.priceToSales = store.defaultKeyStatistics.priceToSales.raw;
    }
    
    if (store.defaultKeyStatistics && store.defaultKeyStatistics.debtToEquity) {
      metrics.debtToEquity = store.defaultKeyStatistics.debtToEquity.raw;
    }
    
    if (store.defaultKeyStatistics && store.defaultKeyStatistics.returnOnEquity) {
      metrics.returnOnEquity = store.defaultKeyStatistics.returnOnEquity.raw;
    }
    
    if (store.defaultKeyStatistics && store.defaultKeyStatistics.returnOnAssets) {
      metrics.returnOnAssets = store.defaultKeyStatistics.returnOnAssets.raw;
    }
    
    if (store.defaultKeyStatistics && store.defaultKeyStatistics.profitMargins) {
      metrics.profitMargin = store.defaultKeyStatistics.profitMargins.raw;
    }
    
    if (store.summaryDetail && store.summaryDetail.beta) {
      metrics.beta = store.summaryDetail.beta.raw;
    }
    
    if (store.summaryDetail && store.summaryDetail.dividendYield) {
      metrics.dividendYield = store.summaryDetail.dividendYield.raw * 100;
    }
    
    // Extract price ranges
    if (store.summaryDetail && store.summaryDetail.dayHigh) {
      metrics.dayHigh = store.summaryDetail.dayHigh.raw;
    }
    
    if (store.summaryDetail && store.summaryDetail.dayLow) {
      metrics.dayLow = store.summaryDetail.dayLow.raw;
    }
    
    if (store.summaryDetail && store.summaryDetail.yearHigh) {
      metrics.fiftyTwoWeekHigh = store.summaryDetail.yearHigh.raw;
    }
    
    if (store.summaryDetail && store.summaryDetail.yearLow) {
      metrics.fiftyTwoWeekLow = store.summaryDetail.yearLow.raw;
    }
    
    if (store.summaryDetail && store.summaryDetail.open) {
      metrics.open = store.summaryDetail.open.raw;
    }
    
    if (store.summaryDetail && store.summaryDetail.previousClose) {
      metrics.close = store.summaryDetail.previousClose.raw;
    }
    
    // Count non-null values
    const validMetricsCount = Object.values(metrics).filter(value => 
      value !== null && 
      !['symbol', 'sources', 'fromCache', 'lastUpdated'].includes(value)
    ).length;
    
    console.log(`Retrieved ${validMetricsCount} metrics from Yahoo Finance web for ${symbol}`);
    return metrics;
  } catch (error) {
    console.error(`Error fetching Yahoo Finance web data for ${symbol}: ${error.message}`);
    return null;
  }
}

// Format functions
function formatMarketCap(value) {
  if (value === null) return "N/A";
  const absValue = Math.abs(value);
  if (absValue >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (absValue >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (absValue >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  return value.toFixed(2);
}

function formatVolume(value) {
  if (value === null) return "N/A";
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (absValue >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (absValue >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
}

function formatPercentage(value) {
  if (value === null) return "N/A";
  return `${(value * 100).toFixed(2)}%`;
}

function formatValue(value) {
  if (value === null) return "N/A";
  return value.toFixed(2);
}

// Display metrics function
function displayMetrics(metrics) {
  if (!metrics) {
    console.log(`\n=== Metrics for N/A ===`);
    console.log(`No metrics available`);
    return;
  }

  console.log(`\n=== Metrics for ${metrics.symbol || 'N/A'} ===`);
  console.log(`Execution time: ${metrics.executionTime || 'N/A'} seconds`);
  console.log(`Sources used: ${metrics.sources?.join(', ') || 'N/A'}`);
  
  // Current price and change
  console.log(`\nCurrent Price:`);
  console.log(`Price: ${metrics.price ? `$${metrics.price.toFixed(2)}` : 'N/A'}`);
  console.log(`Change: ${metrics.priceChange ? `$${metrics.priceChange.toFixed(2)}` : 'N/A'}`);
  console.log(`Change %: ${metrics.changesPercentage ? formatPercentage(metrics.changesPercentage) : 'N/A'}`);
  
  // Daily range
  console.log(`\nDaily Range:`);
  console.log(`Open: ${metrics.open ? `$${metrics.open.toFixed(2)}` : 'N/A'}`);
  console.log(`High: ${metrics.dayHigh ? `$${metrics.dayHigh.toFixed(2)}` : 'N/A'}`);
  console.log(`Low: ${metrics.dayLow ? `$${metrics.dayLow.toFixed(2)}` : 'N/A'}`);
  console.log(`Close: ${metrics.close ? `$${metrics.close.toFixed(2)}` : 'N/A'}`);
  
  // 52-week range
  console.log(`\n52-Week Range:`);
  console.log(`52-Week High: ${metrics.fiftyTwoWeekHigh ? `$${metrics.fiftyTwoWeekHigh.toFixed(2)}` : 'N/A'}`);
  console.log(`52-Week Low: ${metrics.fiftyTwoWeekLow ? `$${metrics.fiftyTwoWeekLow.toFixed(2)}` : 'N/A'}`);
  
  // Valuation metrics
  console.log(`\nValuation Metrics:`);
  console.log(`PEG Ratio: ${metrics.pegRatio ? formatValue(metrics.pegRatio) : 'N/A'}`);
  console.log(`Forward P/E: ${metrics.forwardPE ? formatValue(metrics.forwardPE) : 'N/A'}`);
  console.log(`Price/Book: ${metrics.priceToBook ? formatValue(metrics.priceToBook) : 'N/A'}`);
  console.log(`Price/Sales: ${metrics.priceToSales ? formatValue(metrics.priceToSales) : 'N/A'}`);
  console.log(`Debt/Equity: ${metrics.debtToEquity ? formatValue(metrics.debtToEquity) : 'N/A'}`);
  
  // Performance metrics
  console.log(`\nPerformance Metrics:`);
  console.log(`Return on Equity: ${metrics.returnOnEquity ? formatPercentage(metrics.returnOnEquity) : 'N/A'}`);
  console.log(`Return on Assets: ${metrics.returnOnAssets ? formatPercentage(metrics.returnOnAssets) : 'N/A'}`);
  console.log(`Profit Margin: ${metrics.profitMargin ? formatPercentage(metrics.profitMargin) : 'N/A'}`);
  console.log(`Beta: ${metrics.beta ? formatValue(metrics.beta) : 'N/A'}`);
  
  // Dividend and expense
  console.log(`\nDividend & Expense:`);
  console.log(`Dividend Yield: ${metrics.dividendYield ? formatPercentage(metrics.dividendYield) : 'N/A'}`);
  console.log(`Expense Ratio: ${metrics.expenseRatio ? formatPercentage(metrics.expenseRatio) : 'N/A'}`);
  
  // Company info
  console.log(`\nCompany Info:`);
  console.log(`Company: ${metrics.company || 'N/A'}`);
  console.log(`Industry: ${metrics.industry || 'N/A'}`);
  console.log(`Sector: ${metrics.sector || 'N/A'}`);
  
  // Market metrics
  console.log(`\nMarket Metrics:`);
  console.log(`Market Cap: ${metrics.marketCap ? formatMarketCap(metrics.marketCap) : 'N/A'}`);
  console.log(`Volume: ${metrics.volume ? formatVolume(metrics.volume) : 'N/A'}`);
  
  // Greeks (if available)
  if (metrics.delta || metrics.gamma || metrics.theta || metrics.vega || metrics.rho) {
    console.log(`\nGreeks:`);
    console.log(`Delta: ${metrics.delta ? metrics.delta.toFixed(4) : 'N/A'}`);
    console.log(`Gamma: ${metrics.gamma ? metrics.gamma.toFixed(4) : 'N/A'}`);
    console.log(`Theta: ${metrics.theta ? metrics.theta.toFixed(4) : 'N/A'}`);
    console.log(`Vega: ${metrics.vega ? metrics.vega.toFixed(4) : 'N/A'}`);
    console.log(`Rho: ${metrics.rho ? metrics.rho.toFixed(4) : 'N/A'}`);
  }
}

// Main function
async function main() {
  console.log('Starting stock metrics retrieval...');
  
  const symbols = ['TSLA', 'SPY', 'QQQ', 'KO'];
  const startTime = new Date().getTime();
  const metrics = await retrieveFundamentalMetrics(symbols);
  const executionTime = (new Date().getTime() - startTime) / 1000;
  
  // Display results
  for (const metric of metrics) {
    metric.executionTime = executionTime;
    displayMetrics(metric);
  }
}

main().catch(console.error);
