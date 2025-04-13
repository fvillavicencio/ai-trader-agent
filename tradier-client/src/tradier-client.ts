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
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    };
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    try {
      const response = await axios.get<T>(`${this.baseUrl}/${endpoint}`, {
        headers: this.headers,
        params
      });
      
      if (!response.data) {
        throw new Error('No data returned from Tradier API');
      }
      
      // Log the raw response for debugging
      console.log(`Raw response from ${endpoint}:`, response.data);
      
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || axiosError.message;
      console.error(`API Error for endpoint ${endpoint}:`, {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        message: message
      });
      throw new Error(`Tradier API error: ${message}`);
    }
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
      fiftyTwoWeekAverage: null
    };

    try {
      // Get Quote Data
      console.log('Fetching quote data for', symbol);
      const quoteData = await this.makeRequest<{ quotes: { quote: { [key: string]: any } } }>('markets/quotes', {
        symbols: symbol,
        greeks: 'false'
      });
      
      console.log('Quote data received:', quoteData);
      
      if (!quoteData.quotes?.quote) {
        throw new Error('No quote data returned');
      }
      
      const quote = quoteData.quotes.quote;

      metrics.price = parseFloat(quote.last?.toString() || '0');
      metrics.priceChange = metrics.price - parseFloat(quote.prevclose?.toString() || '0');
      metrics.changesPercentage = metrics.priceChange ? ((metrics.priceChange / parseFloat(quote.prevclose?.toString() || '0')) * 100) : 0;
      metrics.dayHigh = parseFloat(quote.high?.toString() || '0');
      metrics.dayLow = parseFloat(quote.low?.toString() || '0');
      metrics.open = parseFloat(quote.open?.toString() || '0');
      metrics.close = parseFloat(quote.close?.toString() || '0');
      metrics.volume = parseFloat(quote.volume?.toString() || '0');
      metrics.fiftyTwoWeekHigh = parseFloat(quote.week_52_high?.toString() || '0');
      metrics.fiftyTwoWeekLow = parseFloat(quote.week_52_low?.toString() || '0');
      
      // Calculate 52-week average only if both values exist
      if (metrics.fiftyTwoWeekHigh > 0 && metrics.fiftyTwoWeekLow > 0) {
        metrics.fiftyTwoWeekAverage = (metrics.fiftyTwoWeekHigh + metrics.fiftyTwoWeekLow) / 2;
      }

      // Get Company Information
      try {
        console.log('Fetching company data for', symbol);
        const companyData = await this.makeRequest<{ companies: { company: { [key: string]: any } } }>('markets/fundamentals/company', {
          symbols: symbol
        });
        
        console.log('Company data received:', companyData);
        
        if (companyData.companies?.company) {
          const company = companyData.companies.company;
          metrics.company = company.name;
          metrics.industry = company.industry;
          metrics.sector = company.sector;
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
      }

      // Get Financial Metrics
      try {
        console.log('Fetching financial data for', symbol);
        const financialsData = await this.makeRequest<{ fundamentals: { financials: { [key: string]: any } } }>('markets/fundamentals/financials', {
          symbols: symbol,
          metrics: 'all'
        });
        
        console.log('Financial data received:', financialsData);
        
        if (financialsData.fundamentals?.financials) {
          const financials = financialsData.fundamentals.financials;
          metrics.marketCap = parseFloat(financials.market_cap?.toString() || '0');
          metrics.beta = parseFloat(financials.beta?.toString() || '0');
          metrics.pegRatio = parseFloat(financials.peg_ratio?.toString() || '0');
          metrics.forwardPE = parseFloat(financials.pe_ratio_forward?.toString() || '0');
          metrics.priceToBook = parseFloat(financials.price_to_book?.toString() || '0');
          metrics.priceToSales = parseFloat(financials.price_to_sales?.toString() || '0');
          metrics.debtToEquity = parseFloat(financials.debt_to_equity?.toString() || '0');
          metrics.returnOnEquity = parseFloat(financials.return_on_equity?.toString() || '0');
          metrics.returnOnAssets = parseFloat(financials.return_on_assets?.toString() || '0');
          metrics.profitMargin = parseFloat(financials.profit_margin?.toString() || '0');
          metrics.dividendYield = parseFloat(financials.dividend_yield?.toString() || '0');
        }
      } catch (error) {
        console.error('Error fetching financial data:', error);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }

    return metrics;
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
