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

// Enhanced: Robustly extract 'As of' date from all common formats in the first 20 rows
function extractAsOfDate(rows, workbook) {
  let lastUpdated = null;
  const patterns = [
    // Holdings: As of 15-Apr-2025
    /holdings:?\s*as of:?\s*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/i,
    // Holdings: As of Apr 15, 2025
    /holdings:?\s*as of:?\s*([A-Za-z]{3,9})\s*([0-9]{1,2}),?\s*([0-9]{4})/i,
    // Holdings as of: April 15, 2025
    /holdings\s*as of:?\s*([A-Za-z]{3,9})\s*([0-9]{1,2}),?\s*([0-9]{4})/i,
    // As of: 2025-04-15
    /as of:?\s*([0-9]{4})-([0-9]{2})-([0-9]{2})/i
  ];
  for (let i = 0; i < Math.min(20, rows.length); ++i) {
    for (const cell of rows[i]) {
      for (const pat of patterns) {
        const m = pat.exec(cell);
        if (m) {
          if (pat === patterns[0]) {
            // 15-Apr-2025
            const [day, mon, year] = m[1].split('-');
            const monthNum = {
              Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11
            }[mon];
            if (monthNum !== undefined) {
              lastUpdated = new Date(Date.UTC(parseInt(year), monthNum, parseInt(day))).toISOString();
            }
          } else if (pat === patterns[1] || pat === patterns[2]) {
            // Apr 15, 2025 or April 15, 2025
            const mon = m[1].slice(0,3);
            const day = m[2];
            const year = m[3];
            const monthNum = {
              Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11
            }[mon];
            if (monthNum !== undefined) {
              lastUpdated = new Date(Date.UTC(parseInt(year), monthNum, parseInt(day))).toISOString();
            }
          } else if (pat === patterns[3]) {
            // 2025-04-15
            const year = m[1];
            const month = parseInt(m[2], 10) - 1;
            const day = m[3];
            lastUpdated = new Date(Date.UTC(parseInt(year), month, parseInt(day))).toISOString();
          }
        }
      }
      if (lastUpdated) return lastUpdated;
    }
  }
  // Fallback to file metadata if not found
  if (!lastUpdated && workbook.Props && workbook.Props.ModifiedDate) {
    lastUpdated = workbook.Props.ModifiedDate;
  }
  // Fallback to now if nothing found
  if (!lastUpdated) lastUpdated = new Date().toISOString();
  return lastUpdated;
}

// Helper: Validate plausible as-of date (not before 2020, not in the future)
function isValidAsOfDate(dateStr) {
  if (!dateStr) return false;
  const dt = new Date(dateStr);
  const now = new Date('2025-04-16T19:27:09-04:00'); // use provided current time
  if (isNaN(dt.getTime())) return false;
  if (dt.getUTCFullYear() < 2020) return false;
  if (dt > now) return false;
  return true;
}

// Scrape State Street individual ETF pages for SPY/DIA holdings and as-of date using hidden input for date
async function fetchStateStreetHoldingsAndDate(symbol) {
  const urls = {
    SPY: 'https://www.ssga.com/us/en/individual/etfs/spdr-sp-500-etf-trust-spy',
    DIA: 'https://www.ssga.com/us/en/individual/etfs/spdr-dow-jones-industrial-average-etf-trust-dia'
  };
  const url = urls[symbol];
  if (!url) return null;
  try {
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    // Extract 'As of' date from hidden input JSON
    let asOf = null;
    const quickInfoVal = $('#fund-quick-info').attr('value');
    if (quickInfoVal) {
      try {
        const quickInfo = JSON.parse(quickInfoVal.replace(/&quot;/g, '"'));
        if (quickInfo && quickInfo.asOfDateSimple) {
          // Format as ISO string
          const date = new Date(quickInfo.asOfDateSimple + ' UTC');
          if (!isNaN(date.getTime())) {
            asOf = date.toISOString();
          }
        }
      } catch (e) {}
    }
    // Attempt to extract Top Holdings table if present
    let holdings = [];
    // Look for a table with at least 4 columns and header containing 'Holding' or 'Weight'
    $('table').each((i, table) => {
      const header = $(table).find('thead th').map((i, th) => $(th).text().toLowerCase()).get().join(' ');
      if (/holding|weight/.test(header)) {
        $(table).find('tbody tr').slice(0, 5).each((j, row) => {
          const tds = $(row).find('td');
          if (tds.length >= 4) {
            holdings.push({
              symbol: $(tds[0]).text().trim(),
              name: $(tds[1]).text().trim(),
              weight: $(tds[3]).text().trim()
            });
          }
        });
      }
    });
    return { holdings, asOf };
  } catch (e) {
    return null;
  }
}

// Patch getTopHoldings to use new State Street page for SPY/DIA
export async function getTopHoldings(symbol) {
  let lastUpdated = null;
  let lastUpdatedSource = '';
  let holdings = [];
  // For SPY/DIA, extract date from web, but use spreadsheet for holdings
  if (symbol === 'SPY' || symbol === 'DIA') {
    // Extract date from web page
    const webData = await fetchStateStreetHoldingsAndDate(symbol);
    if (webData && webData.asOf && isValidAsOfDate(webData.asOf)) {
      lastUpdated = webData.asOf;
      lastUpdatedSource = 'State Street Web (Date Only)';
    }
    // Always use spreadsheet for holdings
    const { holdings: excelHoldings } = await fetchTopHoldingsFromXlsx(symbol);
    holdings = excelHoldings;
    if (!lastUpdated) {
      // fallback to Excel date if web failed
      const { lastUpdated: excelUpdated } = await fetchTopHoldingsFromXlsx(symbol);
      if (isValidAsOfDate(excelUpdated)) {
        lastUpdated = excelUpdated;
        lastUpdatedSource = 'Excel';
      }
    }
    if (!lastUpdated) {
      lastUpdated = new Date('2025-04-16T19:49:29-04:00').toISOString();
      lastUpdatedSource = 'Fallback (now)';
    }
    console.log(`[getTopHoldings] Using as-of date for ${symbol}: ${lastUpdated} (source: ${lastUpdatedSource})`);
    return { holdings, sourceName: ETF_SOURCES[symbol].name, sourceUrl: ETF_SOURCES[symbol].url, lastUpdated };
  }
  // For SPY/DIA, use new web source
  if (symbol === 'SPY' || symbol === 'DIA') {
    const webData = await fetchStateStreetHoldingsAndDate(symbol);
    if (webData && webData.holdings.length && isValidAsOfDate(webData.asOf)) {
      holdings = webData.holdings;
      lastUpdated = webData.asOf;
      lastUpdatedSource = 'State Street Web (Individual ETF)';
      console.log(`[getTopHoldings] Using new State Street page for ${symbol}`);
      return { holdings, sourceName: ETF_SOURCES[symbol].name, sourceUrl: '', lastUpdated };
    }
  }
  // If not found or not SPY/DIA, fallback to previous logic
  // For SPY/DIA, try web scrape first
  if (symbol === 'SPY' || symbol === 'DIA') {
    const webAsOf = await fetchStateStreetAsOfDate(symbol);
    if (isValidAsOfDate(webAsOf)) {
      lastUpdated = webAsOf;
      lastUpdatedSource = 'State Street Web';
    }
  }
  // If not found, try Tradier
  if (!lastUpdated && TRADIER_API_KEY) {
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
        if (response.data.holdings.as_of_date && isValidAsOfDate(response.data.holdings.as_of_date)) {
          lastUpdated = new Date(response.data.holdings.as_of_date).toISOString();
          lastUpdatedSource = 'Tradier API';
        }
        return { holdings, sourceName: ETF_SOURCES[symbol].name, sourceUrl: ETF_SOURCES[symbol].url, lastUpdated };
      }
    } catch (e) {
      console.log(`Error fetching holdings for ${symbol} from Tradier: ${e.message}`);
    }
  }
  // Fallback: Download and parse Excel file from provider
  console.log(`Falling back to Excel for ${symbol} holdings`);
  const { holdings: excelHoldings, lastUpdated: excelUpdated } = await fetchTopHoldingsFromXlsx(symbol);
  if (isValidAsOfDate(excelUpdated)) {
    lastUpdated = excelUpdated;
    lastUpdatedSource = 'Excel';
  }
  // If still not valid, fallback to file metadata or now
  if (!lastUpdated) {
    lastUpdated = new Date('2025-04-16T19:27:09-04:00').toISOString(); // fallback to current time
    lastUpdatedSource = 'Fallback (now)';
  }
  console.log(`[getTopHoldings] Using as-of date for ${symbol}: ${lastUpdated} (source: ${lastUpdatedSource})`);
  return { holdings: excelHoldings, sourceName: ETF_SOURCES[symbol].name, sourceUrl: ETF_SOURCES[symbol].url, lastUpdated };
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
  const lastUpdated = extractAsOfDate(rows, workbook);
  console.log(`Returned holdings for ${symbol} from Excel file`);
  return { holdings, lastUpdated };
}

// Scrape State Street site for SPY/DIA 'As of' date
async function fetchStateStreetAsOfDate(symbol) {
  const urls = {
    SPY: 'https://www.ssga.com/us/en/intermediary/etfs/funds/spdr-sp-500-etf-trust-spy#fund-holdings',
    DIA: 'https://www.ssga.com/us/en/intermediary/etfs/funds/spdr-dow-jones-industrial-average-etf-trust-dia#fund-holdings'
  };
  const url = urls[symbol];
  if (!url) return null;
  try {
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    // Look for 'Holdings as of' or similar text
    let asOf = null;
    $('[class*=asOf], [class*=date], div, span, p)').each((i, el) => {
      const text = $(el).text();
      const m = /(Holdings)?\s*as of:?\s*([A-Za-z]{3,9})\s*([0-9]{1,2}),?\s*([0-9]{4})/i.exec(text);
      if (m) {
        const mon = m[2].slice(0,3);
        const day = m[3];
        const year = m[4];
        const monthNum = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11}[mon];
        if (monthNum !== undefined) {
          asOf = new Date(Date.UTC(parseInt(year), monthNum, parseInt(day))).toISOString();
        }
      }
    });
    return asOf;
  } catch (e) {
    return null;
  }
}
