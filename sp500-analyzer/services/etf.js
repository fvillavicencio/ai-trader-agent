import axios from 'axios';
import * as cheerio from 'cheerio';
import * as XLSX from 'xlsx';

const TRADIER_API_KEY = process.env.TRADIER_API_KEY;
const TRADIER_BASE_URL = 'https://api.tradier.com/v1/markets/fundamentals/holdings';

const ETF_XLSX_URLS = {
  SPY: 'https://www.ssga.com/library-content/products/fund-data/etfs/us/holdings-daily-us-en-spy.xlsx',
  DIA: 'https://www.ssga.com/library-content/products/fund-data/etfs/us/holdings-daily-us-en-dia.xlsx',
  QQQ: 'https://www.invesco.com/us/financial-products/etfs/holdings/main/holdings/0?audienceType=Investor&action=download&ticker=QQQ'
};
const ETF_SOURCES = {
  SPY: {
    name: 'State Street Global Advisors',
    url: ETF_XLSX_URLS.SPY
  },
  QQQ: {
    name: 'Invesco',
    url: ETF_XLSX_URLS.QQQ
  },
  DIA: {
    name: 'State Street Global Advisors',
    url: ETF_XLSX_URLS.DIA
  }
};

export async function getTopHoldings(symbol) {
  let lastUpdated = new Date().toISOString();
  // Try Tradier first
  if (TRADIER_API_KEY) {
    try {
      const response = await axios.get(TRADIER_BASE_URL, {
        params: { symbols: symbol },
        headers: {
          Authorization: `Bearer ${TRADIER_API_KEY}`,
          Accept: 'application/json'
        }
      });
      const holdings = response.data && response.data.holdings && response.data.holdings.holding;
      if (holdings && Array.isArray(holdings) && holdings.length > 0) {
        // Tradier sometimes returns the ETF symbol instead of the actual holding for QQQ
        // If all symbols are the ETF, fallback to Excel
        const allAreETF = holdings.slice(0, 5).every(h => h.symbol === symbol);
        if (allAreETF) {
          console.log(`Falling back to Excel for ${symbol} holdings (Tradier returned only ETF symbols)`);
          return await fetchTopHoldingsFromXlsx(symbol);
        }
        const top = holdings
          .filter(h => h.weight && h.symbol)
          .sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight))
          .slice(0, 5)
          .map(h => ({
            symbol: h.symbol,
            name: h.name,
            weight: h.weight + '%'
          }));
        console.log(`Returned holdings for ${symbol} from Tradier API`);
        return { holdings: top, sourceName: 'Tradier', sourceUrl: TRADIER_BASE_URL, lastUpdated };
      }
    } catch (e) {
      // If 404 or other error, fallback to Excel
      console.log(`Error fetching holdings for ${symbol} from Tradier: ${e.message}`);
    }
  }
  // Fallback: Download and parse Excel file from provider
  console.log(`Falling back to Excel for ${symbol} holdings (Tradier not used)`);
  const { holdings, lastUpdated: excelUpdated } = await fetchTopHoldingsFromXlsx(symbol);
  lastUpdated = excelUpdated;
  return { holdings, sourceName: ETF_SOURCES[symbol].name, sourceUrl: ETF_SOURCES[symbol].url, lastUpdated };
}

async function fetchTopHoldingsFromXlsx(symbol) {
  const url = ETF_XLSX_URLS[symbol];
  if (!url) throw new Error(`No Excel URL for symbol ${symbol}`);
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const workbook = XLSX.read(response.data, { type: 'buffer' });
  // Try to find the sheet with holdings (usually first or named 'Holdings')
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  // Find the header row (look for 'Holding Ticker' for QQQ, else Ticker/Symbol/Holding, and 'Weight')
  const headerIdx = rows.findIndex(row => row.some(cell => (symbol === 'QQQ' ? /holding ticker/i.test(cell) : /ticker|symbol|identifier|holding/i.test(cell)) && row.some(cell => /weight/i.test(cell))));
  if (headerIdx === -1) throw new Error('Could not find header row in Excel');
  const header = rows[headerIdx];
  let tickerCol;
  if (symbol === 'QQQ') {
    tickerCol = header.findIndex(cell => /holding ticker/i.test(cell));
  } else {
    tickerCol = header.findIndex(cell => /ticker/i.test(cell));
    if (tickerCol === -1) tickerCol = header.findIndex(cell => /symbol/i.test(cell));
    if (tickerCol === -1) tickerCol = header.findIndex(cell => /identifier/i.test(cell));
    if (tickerCol === -1) tickerCol = header.findIndex(cell => /holding/i.test(cell));
  }
  const nameCol = header.findIndex(cell => /name|company/i.test(cell));
  const weightCol = header.findIndex(cell => /weight/i.test(cell));
  if (tickerCol === -1 || weightCol === -1) throw new Error('Could not find Ticker/Symbol/Holding Ticker/Identifier/Holding or Weight column');
  const holdings = rows.slice(headerIdx + 1)
    .filter(row => row[tickerCol] && row[weightCol])
    .map(row => ({
      symbol: row[tickerCol],
      name: nameCol !== -1 ? row[nameCol] : '',
      weight: typeof row[weightCol] === 'number' ? row[weightCol].toFixed(2) + '%' : String(row[weightCol])
    }))
    .sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight))
    .slice(0, 5);
  console.log(`Returned holdings for ${symbol} from Excel file`);
  // Try to parse the last updated date from the Excel file if available
  let lastUpdated = new Date().toISOString();
  if (workbook.Props && workbook.Props.ModifiedDate) {
    lastUpdated = workbook.Props.ModifiedDate;
  }
  return { holdings, lastUpdated };
}
