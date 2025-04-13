import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';

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
}

interface TradierClient {
  getStockMetrics(symbol: string): Promise<StockMetrics>;
}

export class TradierClientImpl implements TradierClient {
  private readonly baseUrl = 'https://api.tradier.com/v1';
  private readonly headers: { [key: string]: string };

  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new Error('TRADIER_API_KEY must be provided');
    }
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Accept': 'application/json'
    };
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value.toString());
    }

    console.log('Making request to', url.toString());
    
    const response = await fetch(url.toString(), {
      headers: this.headers
    });

    const data = await response.json();
    console.log('Raw response from', endpoint, ':', data);

    if (!response.ok) {
      throw new Error(`Tradier API error: ${response.statusText}`);
    }

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
        const companyData = await this.makeRequest<{ fundamentals: { company: { [key: string]: any } } }>('beta/markets/fundamentals/company', {
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

      return metrics;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }
}

// Example usage
async function main() {
  const symbol = process.argv[2] || 'AAPL';
  const client = new TradierClientImpl(process.env.TRADIER_API_KEY || '');

  try {
    const metrics = await client.getStockMetrics(symbol);
    console.log('Stock Metrics:', JSON.stringify(metrics, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  main();
}
