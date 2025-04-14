import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface StockMetrics {
  symbol: string;
  price: number | null;
  priceChange: number | null;
  changesPercentage: number | null;
  volume: number | null;
  marketCap: number | null;
  company: string | null;
  industry: string | null;
  sector: string | null;
  beta: number | null;
  pegRatio: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  priceToSales: number | null;
  debtToEquity: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  profitMargin: number | null;
  dividendYield: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  open: number | null;
  close: number | null;
  fiftyTwoWeekAverage: number | null;
  dataSource: string[];
}

interface TradierClient {
  getStockMetrics(symbol: string): Promise<StockMetrics>;
}

// Updated TradierClientImpl class with corrected endpoints and improved error handling
export class TradierClientImpl implements TradierClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('TRADIER_API_KEY must be provided');
    }
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(endpoint: string, params: { [key: string]: any } = {}): Promise<T> {
    const url = new URL(`https://api.tradier.com/v1/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value.toString());
    });

    console.log('Making request to', url.toString());

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Unexpected response type: ${contentType}. Response: ${text}`);
    }

    const data = await response.json();
    console.log(`Raw response from ${endpoint} :`, data);
    return data;
  }

  async getStockMetrics(symbol: string): Promise<StockMetrics> {
    const metrics: StockMetrics = {
      symbol,
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
      close: null,
      fiftyTwoWeekAverage: null,
      dataSource: ['Tradier']
    };

    try {
      // Get Quote Data
      console.log('Fetching quote data for', symbol);
      const quoteData = await this.makeRequest<{ quotes: { quote: { [key: string]: any } } }>('markets/quotes', {
        symbols: symbol,
        greeks: 'false'
      });

      console.log('Quote data received:', quoteData);
      
      if (quoteData.quotes?.quote) {
        const quote = quoteData.quotes.quote;
        metrics.price = parseFloat(quote.last?.toString() || '0');
        metrics.priceChange = parseFloat(quote.change?.toString() || '0');
        metrics.changesPercentage = parseFloat(quote.change_percentage?.toString() || '0');
        metrics.volume = parseInt(quote.volume?.toString() || '0');
        metrics.fiftyTwoWeekHigh = parseFloat(quote.week_52_high?.toString() || '0');
        metrics.fiftyTwoWeekLow = parseFloat(quote.week_52_low?.toString() || '0');
        metrics.dayHigh = parseFloat(quote.high?.toString() || '0');
        metrics.dayLow = parseFloat(quote.low?.toString() || '0');
        metrics.open = parseFloat(quote.open?.toString() || '0');
        metrics.close = parseFloat(quote.close?.toString() || '0');
        metrics.fiftyTwoWeekAverage = (metrics.fiftyTwoWeekHigh + metrics.fiftyTwoWeekLow) / 2;
        metrics.company = quote.description || symbol;
      }

      // Get Financial Metrics
      try {
        console.log('Fetching financial data for', symbol);
        const ratiosData = await this.makeRequest<{ fundamentals: { ratios: { [key: string]: any } } }>('beta/markets/fundamentals/ratios', {
          symbols: symbol
        });
        
        console.log('Financial data received:', ratiosData);
        
        if (ratiosData.fundamentals?.ratios) {
          const ratios = ratiosData.fundamentals.ratios;
          metrics.marketCap = parseFloat(ratios.market_cap?.toString() || '0');
          metrics.beta = parseFloat(ratios.beta?.toString() || '0');
          metrics.pegRatio = parseFloat(ratios.peg_ratio?.toString() || '0');
          metrics.forwardPE = parseFloat(ratios.pe_ratio_forward?.toString() || '0');
          metrics.priceToBook = parseFloat(ratios.price_to_book?.toString() || '0');
          metrics.priceToSales = parseFloat(ratios.price_to_sales?.toString() || '0');
          metrics.debtToEquity = parseFloat(ratios.debt_to_equity?.toString() || '0');
          metrics.returnOnEquity = parseFloat(ratios.return_on_equity?.toString() || '0');
          metrics.returnOnAssets = parseFloat(ratios.return_on_assets?.toString() || '0');
          metrics.profitMargin = parseFloat(ratios.profit_margin?.toString() || '0');
          metrics.dividendYield = parseFloat(ratios.dividend_yield?.toString() || '0');
        }
      } catch (error) {
        console.error('Error fetching financial data:', error);
      }

      // Check for null values and try to fill them with Yahoo Finance data
      const hasMissingData = 
        metrics.marketCap === null ||
        metrics.company === null ||
        metrics.industry === null ||
        metrics.sector === null ||
        metrics.beta === null ||
        metrics.pegRatio === null ||
        metrics.forwardPE === null ||
        metrics.priceToBook === null ||
        metrics.priceToSales === null ||
        metrics.debtToEquity === null ||
        metrics.returnOnEquity === null ||
        metrics.returnOnAssets === null ||
        metrics.profitMargin === null ||
        metrics.dividendYield === null;

      if (hasMissingData) {
        try {
          console.log('Fetching missing data from Yahoo Finance for', symbol);
          const yahooMetrics = await this.fetchYahooFinanceData(symbol);
          
          if (yahooMetrics) {
            metrics.dataSource.push('Yahoo Finance');
            
            // Update metrics with Yahoo Finance data only for null values
            if (metrics.marketCap === null) metrics.marketCap = yahooMetrics.marketCap;
            if (metrics.company === null) metrics.company = yahooMetrics.company;
            if (metrics.industry === null) metrics.industry = yahooMetrics.industry;
            if (metrics.sector === null) metrics.sector = yahooMetrics.sector;
            if (metrics.beta === null) metrics.beta = yahooMetrics.beta;
            if (metrics.pegRatio === null) metrics.pegRatio = yahooMetrics.pegRatio;
            if (metrics.forwardPE === null) metrics.forwardPE = yahooMetrics.forwardPE;
            if (metrics.priceToBook === null) metrics.priceToBook = yahooMetrics.priceToBook;
            if (metrics.priceToSales === null) metrics.priceToSales = yahooMetrics.priceToSales;
            if (metrics.debtToEquity === null) metrics.debtToEquity = yahooMetrics.debtToEquity;
            if (metrics.returnOnEquity === null) metrics.returnOnEquity = yahooMetrics.returnOnEquity;
            if (metrics.returnOnAssets === null) metrics.returnOnAssets = yahooMetrics.returnOnAssets;
            if (metrics.profitMargin === null) metrics.profitMargin = yahooMetrics.profitMargin;
            if (metrics.dividendYield === null) metrics.dividendYield = yahooMetrics.dividendYield;
          }
        } catch (error) {
          console.error('Error fetching Yahoo Finance data:', error);
        }
      }

      return metrics;
    } catch (error) {
      console.error('Error fetching stock metrics:', error);
      throw error;
    }
  }

  // Add Yahoo Finance data fetching function
  private async fetchYahooFinanceData(symbol: string): Promise<StockMetrics | null> {
    try {
      const rapidApiKey = process.env.RAPID_API_KEY;
      if (!rapidApiKey) {
        console.error('RAPID_API_KEY not found in environment variables');
        return null;
      }

      const response = await fetch(`https://yahoo-finance15.p.rapidapi.com/auto-complete?q=${symbol.toUpperCase()}`, {
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com'
        }
      });

      const data = await response.json();
      
      if (!data || !data.ResultSet?.Result?.[0]) {
        console.error('No data received from Yahoo Finance API');
        return null;
      }

      const quoteData = await fetch(`https://yahoo-finance15.p.rapidapi.com/quote/${data.ResultSet.Result[0].symbol}`, {
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com'
        }
      });

      const quote = await quoteData.json();

      if (!quote) {
        console.error('No quote data received from Yahoo Finance API');
        return null;
      }

      const metrics: StockMetrics = {
        symbol,
        price: quote.price?.raw,
        priceChange: quote.regularMarketChange?.raw,
        changesPercentage: quote.regularMarketChangePercent?.raw,
        volume: quote.regularMarketVolume?.raw,
        marketCap: quote.marketCap?.raw,
        company: quote.shortName || quote.longName,
        industry: quote.industryName,
        sector: quote.sectorName,
        beta: quote.beta?.raw,
        pegRatio: quote.pegRatio?.raw,
        forwardPE: quote.forwardPE?.raw,
        priceToBook: quote.priceToBook?.raw,
        priceToSales: quote.priceToSales?.raw,
        debtToEquity: quote.debtToEquity?.raw,
        returnOnEquity: quote.returnOnEquity?.raw,
        returnOnAssets: quote.returnOnAssets?.raw,
        profitMargin: quote.profitMargins?.raw,
        dividendYield: quote.trailingAnnualDividendYield?.raw,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh?.raw,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow?.raw,
        dayHigh: quote.regularMarketDayHigh?.raw,
        dayLow: quote.regularMarketDayLow?.raw,
        open: quote.regularMarketOpen?.raw,
        close: quote.regularMarketPreviousClose?.raw,
        fiftyTwoWeekAverage: (quote.fiftyTwoWeekHigh?.raw + quote.fiftyTwoWeekLow?.raw) / 2,
        dataSource: ['Yahoo Finance via RapidAPI']
      };

      // Clean up the company name
      if (metrics.company) {
        metrics.company = metrics.company.trim();
      }

      return metrics;
    } catch (error) {
      console.error('Error fetching Yahoo Finance data:', error);
      return null;
    }
  }
}

async function main(symbol: string) {
  const apiKey = process.env.TRADIER_API_KEY;
  if (!apiKey) {
    console.error('TRADIER_API_KEY environment variable is not set');
    return;
  }

  const client = new TradierClientImpl(apiKey);
  try {
    const metrics = await client.getStockMetrics(symbol);
    console.log('Stock Metrics:', JSON.stringify(metrics, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: npm start <symbol>');
  process.exit(1);
}

main(args[0]);