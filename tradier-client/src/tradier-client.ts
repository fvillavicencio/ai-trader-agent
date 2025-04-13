import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface StockMetrics {
  symbol: string;
  price: number;
  priceChange: number;
  changesPercentage: number;
  volume: number;
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
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  dayHigh: number;
  dayLow: number;
  open: number;
  close: number;
  fiftyTwoWeekAverage: number;
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
      price: 0,
      priceChange: 0,
      changesPercentage: 0,
      volume: 0,
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
      fiftyTwoWeekHigh: 0,
      fiftyTwoWeekLow: 0,
      dayHigh: 0,
      dayLow: 0,
      open: 0,
      close: 0,
      fiftyTwoWeekAverage: 0
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
      }

      // Get Company Information
      try {
        console.log('Fetching company data for', symbol);
        const companyData = await this.makeRequest<{ fundamentals: { company: { [key: string]: any } } }>('v1/markets/fundamentals/company', {
          symbols: symbol
        });

        console.log('Company data received:', companyData);
        
        if (companyData.fundamentals?.company) {
          const company = companyData.fundamentals.company;
          metrics.company = company.name || company.description || symbol;
          metrics.industry = company.industry;
          metrics.sector = company.sector;
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
      }

      // Get Financial Metrics
      try {
        console.log('Fetching financial data for', symbol);
        const ratiosData = await this.makeRequest<{ fundamentals: { ratios: { [key: string]: any } } }>('v1/markets/fundamentals/ratios', {
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

      return metrics;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
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