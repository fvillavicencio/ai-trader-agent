"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradierClientImpl = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class TradierClientImpl {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.tradier.com/v1';
        if (!apiKey) {
            throw new Error('TRADIER_API_KEY must be provided');
        }
        this.headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
        };
    }
    async makeRequest(endpoint, params = {}) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/${endpoint}`, {
                headers: this.headers,
                params
            });
            if (!response.data) {
                throw new Error('No data returned from Tradier API');
            }
            return response.data;
        }
        catch (error) {
            const axiosError = error;
            const message = axiosError.response?.data?.message || axiosError.message;
            throw new Error(`Tradier API error: ${message}`);
        }
    }
    async getStockMetrics(symbol) {
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
            const quoteData = await this.makeRequest('markets/quotes', {
                symbols: symbol,
                greeks: 'false'
            });
            if (!quoteData.quotes?.quote?.[0]) {
                throw new Error('No quote data returned');
            }
            const quote = quoteData.quotes.quote[0];
            metrics.price = parseFloat(quote.last?.toString() || '0');
            metrics.priceChange = metrics.price - parseFloat(quote.previous_close?.toString() || '0');
            metrics.changesPercentage = metrics.priceChange ? ((metrics.priceChange / parseFloat(quote.previous_close?.toString() || '0')) * 100) : 0;
            metrics.dayHigh = parseFloat(quote.high?.toString() || '0');
            metrics.dayLow = parseFloat(quote.low?.toString() || '0');
            metrics.open = parseFloat(quote.open?.toString() || '0');
            metrics.close = parseFloat(quote.previous_close?.toString() || '0');
            metrics.volume = parseFloat(quote.volume?.toString() || '0');
            metrics.fiftyTwoWeekHigh = parseFloat(quote['52_week_high']?.toString() || '0');
            metrics.fiftyTwoWeekLow = parseFloat(quote['52_week_low']?.toString() || '0');
            // Calculate 52-week average only if both values exist
            if (metrics.fiftyTwoWeekHigh > 0 && metrics.fiftyTwoWeekLow > 0) {
                metrics.fiftyTwoWeekAverage = (metrics.fiftyTwoWeekHigh + metrics.fiftyTwoWeekLow) / 2;
            }
            // Get Company Information
            const companyData = await this.makeRequest('markets/fundamentals/company', {
                symbols: symbol
            });
            if (companyData.companies?.company?.[0]) {
                const company = companyData.companies.company[0];
                metrics.company = company.name;
                metrics.industry = company.industry;
                metrics.sector = company.sector;
            }
            // Get Financial Metrics
            const financialsData = await this.makeRequest('markets/fundamentals/financials', {
                symbols: symbol,
                metrics: 'all'
            });
            if (financialsData.fundamentals?.financials?.[0]) {
                const financials = financialsData.fundamentals.financials[0];
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
        }
        catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
        return metrics;
    }
}
exports.TradierClientImpl = TradierClientImpl;
// Example usage
async function main() {
    const symbol = process.argv[2] || 'AAPL';
    const client = new TradierClientImpl(process.env.TRADIER_API_KEY || '');
    try {
        const metrics = await client.getStockMetrics(symbol);
        console.log('Stock Metrics:', JSON.stringify(metrics, null, 2));
    }
    catch (error) {
        console.error('Error:', error);
    }
}
if (require.main === module) {
    main();
}
