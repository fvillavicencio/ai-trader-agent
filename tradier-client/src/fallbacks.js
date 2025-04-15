const fetch = require('node-fetch');

// --- Financial Modeling Prep (FMP) ---
async function fetchFMPData(symbol, apiKey) {
  const url = `https://financialmodelingprep.com/api/v3/profile/${encodeURIComponent(symbol)}?apikey=${apiKey}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return undefined;
    const fmp = data[0];
    return {
      industry: fmp.industry || undefined,
      sector: fmp.sector || undefined,
      company: fmp.companyName || undefined,
      marketCap: fmp.mktCap || undefined,
      beta: fmp.beta || undefined,
      priceToBook: fmp.priceToBook || undefined,
      priceToSales: fmp.priceToSalesTTM || undefined,
      dividendYield: fmp.lastDiv || undefined
    };
  } catch (err) {
    console.error('FMP fallback error:', err);
    return undefined;
  }
}

async function fetchFMPRatios(symbol, apiKey) {
  const url = `https://financialmodelingprep.com/api/v3/ratios/${encodeURIComponent(symbol)}?apikey=${apiKey}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return undefined;
    const ratios = data[0]; // Most recent year/quarter
    return {
      peRatio: ratios.priceEarningsRatio || undefined,
      pegRatio: ratios.pegRatio || undefined,
      pegForwardRatio: ratios.forwardPEG || ratios.forwardPegRatio || undefined,
      priceToBook: ratios.priceToBookRatio || undefined,
      priceToSales: ratios.priceToSalesRatio || undefined,
      debtToEquity: ratios.debtEquityRatio || undefined,
      returnOnEquity: ratios.returnOnEquity || undefined,
      returnOnAssets: ratios.returnOnAssets || undefined,
      profitMargin: ratios.netProfitMargin || undefined
    };
  } catch (err) {
    console.error('FMP ratios fallback error:', err);
    return undefined;
  }
}

// --- IEX Cloud ---
async function fetchIEXData(symbol, apiKey) {
  const url = `https://cloud.iexapis.com/stable/stock/${encodeURIComponent(symbol)}/company?token=${apiKey}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const data = await response.json();
    return {
      industry: data.industry || undefined,
      sector: data.sector || undefined,
      company: data.companyName || undefined
    };
  } catch (err) {
    console.error('IEX fallback error:', err);
    return undefined;
  }
}

module.exports = {
  fetchFMPData,
  fetchFMPRatios,
  fetchIEXData
};
