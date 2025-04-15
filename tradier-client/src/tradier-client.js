require('dotenv').config();
const fetch = require('node-fetch');
const got = require('got');
const { fetchFMPData, fetchFMPRatios } = require('./fallbacks');

class TradierClientImpl {
  constructor() {
    this.apiToken = process.env.TRADIER_API_TOKEN;
    this.baseUrl = process.env.TRADIER_BASE_URL || 'https://api.tradier.com/v1/';
  }

  async makeRequest(path, options = {}) {
    // Build URL with correct path and query params
    let url = this.baseUrl;
    if (!url.endsWith('/')) url += '/';
    url += path;
    if (options.symbols) {
      url += (url.includes('?') ? '&' : '?') + 'symbols=' + encodeURIComponent(options.symbols);
    }
    // Set up headers
    const headers = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Accept': 'application/json',
      ...(options.headers || {})
    };
    // Make the request
    const response = await fetch(url, {
      headers,
      method: options.method || 'GET',
    });
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    if (response.status !== 200) {
      throw new Error(`HTTP Error: ${response.status} for ${url}. Raw response: ${text}`);
    }
    if (contentType && contentType.includes('application/json')) {
      return JSON.parse(text);
    } else {
      throw new Error(`Unexpected response type: ${contentType}. Response: ${text}`);
    }
  }

  async fetchYahooSearchData(symbol) {
    // Dummy implementation: always fails due to rate limit for now
    return undefined;
  }

  async fetchYahooFinanceWebData(symbol) {
    // Dummy implementation: always fails due to header overflow for now
    return undefined;
  }

  async getStockMetrics(symbol) {
    const metrics = {
      symbol,
      price: undefined,
      priceChange: undefined,
      changesPercentage: undefined,
      volume: undefined,
      marketCap: undefined,
      company: undefined,
      industry: undefined,
      sector: undefined,
      beta: undefined,
      pegRatio: undefined,
      forwardPE: undefined,
      priceToBook: undefined,
      priceToSales: undefined,
      debtToEquity: undefined,
      returnOnEquity: undefined,
      returnOnAssets: undefined,
      profitMargin: undefined,
      dividendYield: undefined,
      fiftyTwoWeekHigh: undefined,
      fiftyTwoWeekLow: undefined,
      dayHigh: undefined,
      dayLow: undefined,
      open: undefined,
      close: undefined,
      fiftyTwoWeekAverage: undefined,
      dataSource: [],
      fieldSource: {}
    };
    const fieldSource = {};
    // 1. Try Tradier
    try {
      const tradierData = await this.makeRequest('markets/quotes', {
        symbols: symbol,
        greeks: 'false'
      });
      if (tradierData && tradierData.quotes && tradierData.quotes.quote) {
        const quote = tradierData.quotes.quote;
        if (quote.last != null) { metrics.price = parseFloat(quote.last.toString() || ''); fieldSource['price'] = 'Tradier'; }
        if (quote.change != null) { metrics.priceChange = parseFloat(quote.change.toString() || ''); fieldSource['priceChange'] = 'Tradier'; }
        if (quote.change_percentage != null) { metrics.changesPercentage = parseFloat(quote.change_percentage.toString() || ''); fieldSource['changesPercentage'] = 'Tradier'; }
        if (quote.volume != null) { metrics.volume = parseFloat(quote.volume.toString() || ''); fieldSource['volume'] = 'Tradier'; }
        // Tradier returns the company name as the 'description' field in the quote response
        if (quote.description != null) { 
          metrics.company = quote.description; 
          fieldSource['company'] = 'Tradier'; 
        }
        if (quote.week_52_high != null) { metrics.fiftyTwoWeekHigh = parseFloat(quote.week_52_high.toString() || ''); fieldSource['fiftyTwoWeekHigh'] = 'Tradier'; }
        if (quote.week_52_low != null) { metrics.fiftyTwoWeekLow = parseFloat(quote.week_52_low.toString() || ''); fieldSource['fiftyTwoWeekLow'] = 'Tradier'; }
        if (quote.high != null) { metrics.dayHigh = parseFloat(quote.high.toString() || ''); fieldSource['dayHigh'] = 'Tradier'; }
        if (quote.low != null) { metrics.dayLow = parseFloat(quote.low.toString() || ''); fieldSource['dayLow'] = 'Tradier'; }
        if (quote.open != null) { metrics.open = parseFloat(quote.open.toString() || ''); fieldSource['open'] = 'Tradier'; }
        if (quote.close != null) { metrics.close = parseFloat(quote.close.toString() || ''); fieldSource['close'] = 'Tradier'; }
        if (metrics.fiftyTwoWeekHigh && metrics.fiftyTwoWeekLow)
          metrics.fiftyTwoWeekAverage = (metrics.fiftyTwoWeekHigh + metrics.fiftyTwoWeekLow) / 2;
        metrics.dataSource.push('Tradier Core Data');
      }
    } catch (err) {
      console.error('Tradier API error:', err);
      metrics.price = undefined;
      metrics.priceChange = undefined;
      metrics.changesPercentage = undefined;
      metrics.volume = undefined;
      metrics.company = undefined;
      metrics.fiftyTwoWeekHigh = undefined;
      metrics.fiftyTwoWeekLow = undefined;
      metrics.dayHigh = undefined;
      metrics.dayLow = undefined;
      metrics.open = undefined;
      metrics.close = undefined;
      metrics.fiftyTwoWeekAverage = undefined;
      metrics.industry = undefined;
      metrics.sector = undefined;
      metrics.marketCap = undefined;
      metrics.beta = undefined;
      metrics.dividendYield = undefined;
      metrics.pegRatio = undefined;
      metrics.forwardPE = undefined;
      metrics.priceToBook = undefined;
      metrics.priceToSales = undefined;
      metrics.debtToEquity = undefined;
      metrics.returnOnEquity = undefined;
      metrics.returnOnAssets = undefined;
      metrics.profitMargin = undefined;
      console.log('All Tradier fields cleared, fallbacks will be triggered.');
    }
    // --- Fallback logic for missing fields ---
    // 2. Yahoo Search fallback (for company, industry, sector)
    try {
      if (!metrics.company || !metrics.industry || !metrics.sector) {
        const yahooSearch = await this.fetchYahooSearchData(symbol);
        if (yahooSearch) {
          if (!metrics.company && yahooSearch.company) { metrics.company = yahooSearch.company; fieldSource['company'] = 'YahooSearch'; }
          if (!metrics.industry && yahooSearch.industry) { metrics.industry = yahooSearch.industry; fieldSource['industry'] = 'YahooSearch'; }
          if (!metrics.sector && yahooSearch.sector) { metrics.sector = yahooSearch.sector; fieldSource['sector'] = 'YahooSearch'; }
          metrics.dataSource.push('Yahoo Search');
        }
      }
    } catch (err) {
      console.error('Yahoo Search API request failed:', err);
    }
    // 3. Yahoo Finance Web fallback (for price, company, industry, sector)
    try {
      if (!metrics.price || !metrics.company || !metrics.industry || !metrics.sector) {
        const yahooWeb = await this.fetchYahooFinanceWebData(symbol);
        if (yahooWeb) {
          if (!metrics.price && yahooWeb.price) { metrics.price = yahooWeb.price; fieldSource['price'] = 'YahooFinanceWeb'; }
          if (!metrics.company && yahooWeb.company) { metrics.company = yahooWeb.company; fieldSource['company'] = 'YahooFinanceWeb'; }
          if (!metrics.industry && yahooWeb.industry) { metrics.industry = yahooWeb.industry; fieldSource['industry'] = 'YahooFinanceWeb'; }
          if (!metrics.sector && yahooWeb.sector) { metrics.sector = yahooWeb.sector; fieldSource['sector'] = 'YahooFinanceWeb'; }
          metrics.dataSource.push('Yahoo Finance Web');
        }
      }
    } catch (err) {
      console.error('Yahoo Finance Web scraping error:', err);
    }
    // 4. FMP fallback for company, industry, sector, etc.
    try {
      if (!metrics.company || !metrics.industry || !metrics.sector || !metrics.marketCap || !metrics.beta || !metrics.priceToBook || !metrics.priceToSales || !metrics.dividendYield) {
        const fmpApiKey = process.env.FMP_API_KEY;
        if (fmpApiKey) {
          const fmpData = await fetchFMPData(symbol, fmpApiKey);
          if (fmpData) {
            if (!metrics.company && fmpData.company) { metrics.company = fmpData.company; fieldSource['company'] = 'FMP'; }
            if (!metrics.industry && fmpData.industry) { metrics.industry = fmpData.industry; fieldSource['industry'] = 'FMP'; }
            if (!metrics.sector && fmpData.sector) { metrics.sector = fmpData.sector; fieldSource['sector'] = 'FMP'; }
            if (!metrics.marketCap && fmpData.marketCap) { metrics.marketCap = fmpData.marketCap; fieldSource['marketCap'] = 'FMP'; }
            if (!metrics.beta && fmpData.beta) { metrics.beta = fmpData.beta; fieldSource['beta'] = 'FMP'; }
            if (!metrics.priceToBook && fmpData.priceToBook) { metrics.priceToBook = fmpData.priceToBook; fieldSource['priceToBook'] = 'FMP'; }
            if (!metrics.priceToSales && fmpData.priceToSales) { metrics.priceToSales = fmpData.priceToSales; fieldSource['priceToSales'] = 'FMP'; }
            if (!metrics.dividendYield && fmpData.dividendYield) { metrics.dividendYield = fmpData.dividendYield; fieldSource['dividendYield'] = 'FMP'; }
            metrics.dataSource.push('FMP');
          }
        }
      }
    } catch (err) {
      console.error('FMP fallback error:', err);
    }
    // 5. FMP ratios fallback for financial ratios
    try {
      const fmpApiKey = process.env.FMP_API_KEY;
      if (fmpApiKey) {
        const ratios = await fetchFMPRatios(symbol, fmpApiKey);
        if (ratios) {
          if (!metrics.peRatio && ratios.peRatio) { metrics.peRatio = ratios.peRatio; fieldSource['peRatio'] = 'FMP'; }
          if (!metrics.pegRatio && ratios.pegRatio) { metrics.pegRatio = ratios.pegRatio; fieldSource['pegRatio'] = 'FMP'; }
          if (!metrics.pegForwardRatio && ratios.pegForwardRatio) { metrics.pegForwardRatio = ratios.pegForwardRatio; fieldSource['pegForwardRatio'] = 'FMP'; }
          if (!metrics.priceToBook && ratios.priceToBook) { metrics.priceToBook = ratios.priceToBook; fieldSource['priceToBook'] = 'FMP'; }
          if (!metrics.priceToSales && ratios.priceToSales) { metrics.priceToSales = ratios.priceToSales; fieldSource['priceToSales'] = 'FMP'; }
          if (!metrics.debtToEquity && ratios.debtToEquity) { metrics.debtToEquity = ratios.debtToEquity; fieldSource['debtToEquity'] = 'FMP'; }
          if (!metrics.returnOnEquity && ratios.returnOnEquity) { metrics.returnOnEquity = ratios.returnOnEquity; fieldSource['returnOnEquity'] = 'FMP'; }
          if (!metrics.returnOnAssets && ratios.returnOnAssets) { metrics.returnOnAssets = ratios.returnOnAssets; fieldSource['returnOnAssets'] = 'FMP'; }
          if (!metrics.profitMargin && ratios.profitMargin) { metrics.profitMargin = ratios.profitMargin; fieldSource['profitMargin'] = 'FMP'; }
          metrics.dataSource.push('FMP Ratios');
        }
      }
    } catch (err) {
      console.error('FMP ratios fallback error:', err);
    }
    metrics.fieldSource = fieldSource;
    return metrics;
  }
}

// --- CLI Entrypoint ---
const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: node tradier-client.js <symbol>');
  process.exit(1);
}
const symbol = args[0];

(async () => {
  const client = new TradierClientImpl();
  const metrics = await client.getStockMetrics(symbol);
  // Only output fields that have values (not undefined or null)
  const output = {};
  for (const [key, value] of Object.entries(metrics)) {
    if (value !== undefined && value !== null &&
        // filter out empty arrays/objects
        (!(Array.isArray(value)) || value.length > 0) &&
        (!(typeof value === 'object' && !Array.isArray(value)) || Object.keys(value).length > 0)) {
      output[key] = value;
    }
  }
  // Print each data element as: [data element], [value] (source: [source])
  const fieldSource = metrics.fieldSource || {};
  for (const [key, value] of Object.entries(output)) {
    if (key === 'fieldSource' || key === 'dataSource') continue;
    const source = fieldSource[key] ? ` (source: ${fieldSource[key]})` : '';
    console.log(`${key}, ${value}${source}`);
  }
})();
