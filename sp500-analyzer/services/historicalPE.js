import axios from 'axios';
/**
 * Fetches historical P/E ratios for the S&P 500 from multpl.com
 * Returns an object with historical data and metadata
 */
export async function getHistoricalPERatios() {
  try {
    console.log('[DIAG] Fetching historical P/E ratios from multpl.com');
    
    try {
      // First try to get annual data (more reliable for historical trends)
      const annualData = await fetchHistoricalPEByYear();
      if (annualData && annualData.data && annualData.data.length >= 5) {
        return {
          ...annualData,
          source: 'multpl.com (annual)',
          sourceUrl: 'https://www.multpl.com/s-p-500-pe-ratio/table/by-year'
        };
      }
    } catch (err) {
      console.error('[ERROR] Failed to fetch annual P/E data:', err.message);
    }
    
    try {
      // Fall back to monthly data if annual fails or doesn't have enough points
      const monthlyData = await fetchHistoricalPEByMonth();
      if (monthlyData && monthlyData.data && monthlyData.data.length >= 5) {
        return {
          ...monthlyData,
          source: 'multpl.com (monthly)',
          sourceUrl: 'https://www.multpl.com/s-p-500-pe-ratio/table/by-month'
        };
      }
    } catch (err) {
      console.error('[ERROR] Failed to fetch monthly P/E data:', err.message);
    }
    
    // If both fail, return fallback data
    return getFallbackHistoricalPE();
    
  } catch (error) {
    console.error('[ERROR] Failed to fetch historical P/E ratios:', error);
    return getFallbackHistoricalPE();
  }
}

/**
 * Fetches historical P/E ratios by year from multpl.com
 */
async function fetchHistoricalPEByYear() {
  try {
    // Dynamically import cheerio
    const cheerio = await import('cheerio').then(module => module.default || module);
    
    const url = 'https://www.multpl.com/s-p-500-pe-ratio/table/by-year';
    const { data } = await axios.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; sp500-analyzer/1.0)' },
      timeout: 10000
    });
    
    const $ = cheerio.load(data);
    const rows = $('table#datatable tbody tr');
    const peByYear = [];
    
    rows.each((i, row) => {
      const year = parseInt($(row).find('td').eq(0).text().trim(), 10);
      const pe = parseFloat($(row).find('td').eq(1).text().trim());
      
      if (!isNaN(year) && !isNaN(pe)) {
        peByYear.push({ year, pe: Number(pe.toFixed(2)) });
      }
    });
    
    // Sort by year descending (newest first)
    peByYear.sort((a, b) => b.year - a.year);
    
    // Get the last 5 years of data
    const last5Years = peByYear.slice(0, 5);
    
    // Calculate averages
    const currentYear = new Date().getFullYear();
    const pe5 = peByYear.filter(r => r.year > currentYear - 5).map(r => r.pe);
    const pe10 = peByYear.filter(r => r.year > currentYear - 10).map(r => r.pe);
    const avg5 = pe5.length ? Number((pe5.reduce((a, b) => a + b, 0) / pe5.length).toFixed(2)) : null;
    const avg10 = pe10.length ? Number((pe10.reduce((a, b) => a + b, 0) / pe10.length).toFixed(2)) : null;
    
    // Format data for the response
    const historicalPE = last5Years.map(item => item.pe);
    const years = last5Years.map(item => item.year);
    
    return {
      data: historicalPE,
      years,
      current: peByYear[0] ? peByYear[0].pe : null,
      fiveYearAvg: avg5,
      tenYearAvg: avg10,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('[ERROR] Failed to fetch annual P/E data:', error);
    return null;
  }
}

/**
 * Fetches historical P/E ratios by month from multpl.com
 */
async function fetchHistoricalPEByMonth() {
  try {
    // Dynamically import cheerio
    const cheerio = await import('cheerio').then(module => module.default || module);
    
    const url = 'https://www.multpl.com/s-p-500-pe-ratio/table/by-month';
    const { data } = await axios.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; sp500-analyzer/1.0)' },
      timeout: 10000
    });
    
    const $ = cheerio.load(data);
    const rows = $('table#datatable tbody tr');
    const peData = [];
    
    rows.each((i, el) => {
      const tds = $(el).find('td');
      const dateText = $(tds[0]).text().trim();
      const pe = parseFloat($(tds[1]).text().replace(/[^\d.]/g, ''));
      
      if (dateText && !isNaN(pe)) {
        // Parse the date (format: "May 1, 2023")
        const dateParts = dateText.split(' ');
        if (dateParts.length >= 3) {
          const year = parseInt(dateParts[2], 10);
          peData.push({ date: dateText, year, pe: Number(pe.toFixed(2)) });
        }
      }
    });
    
    // Group by year and take the latest entry for each year
    const peByYear = {};
    peData.forEach(item => {
      if (!peByYear[item.year] || new Date(item.date) > new Date(peByYear[item.year].date)) {
        peByYear[item.year] = item;
      }
    });
    
    // Convert to array and sort by year descending
    const yearlyData = Object.values(peByYear).sort((a, b) => b.year - a.year);
    
    // Get the last 5 years of data
    const last5Years = yearlyData.slice(0, 5);
    
    // Calculate averages from monthly data
    const currentYear = new Date().getFullYear();
    const last5YearsData = peData.filter(item => item.year > currentYear - 5);
    const last10YearsData = peData.filter(item => item.year > currentYear - 10);
    
    const avg5 = last5YearsData.length ? 
      Number((last5YearsData.reduce((sum, item) => sum + item.pe, 0) / last5YearsData.length).toFixed(2)) : null;
    
    const avg10 = last10YearsData.length ? 
      Number((last10YearsData.reduce((sum, item) => sum + item.pe, 0) / last10YearsData.length).toFixed(2)) : null;
    
    // Format data for the response
    const historicalPE = last5Years.map(item => item.pe);
    const years = last5Years.map(item => item.year);
    
    const formattedData = historicalPE.map((value, index) => {
      return {
        year: years[index],
        value: Number(value.toFixed(2))
      };
    });
    
    // Sort by year (newest first)
    formattedData.sort((a, b) => b.year - a.year);
    
    return {
      data: historicalPE,
      years,
      formattedData,
      current: peData[0] ? peData[0].pe : null,
      fiveYearAvg: avg5,
      tenYearAvg: avg10,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('[ERROR] Failed to fetch monthly P/E data:', error);
    return null;
  }
}

/**
 * Returns fallback historical P/E data when API calls fail
 */
function getFallbackHistoricalPE() {
  const currentYear = new Date().getFullYear();
  return {
    data: [22.5, 23.7, 25.2, 26.6, 24.8],
    years: [currentYear-5, currentYear-4, currentYear-3, currentYear-2, currentYear-1],
    current: 24.8,
    fiveYearAvg: 24.56,
    tenYearAvg: 23.92,
    source: 'Fallback data',
    sourceUrl: 'https://www.multpl.com/s-p-500-pe-ratio',
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Fetches historical P/E ratios from FRED (Federal Reserve Economic Data)
 * This is an alternative data source if multpl.com scraping fails
 */
export async function getHistoricalPEFromFRED() {
  try {
    const FRED_API_KEY = process.env.FRED_API_KEY;
    if (!FRED_API_KEY) {
      console.warn('[WARN] FRED_API_KEY not set in environment variables');
      return null;
    }
    
    // Series ID for S&P 500 P/E Ratio
    const seriesId = 'MULTPL/SP500_PE_RATIO_MONTH';
    const url = `https://api.stlouisfed.org/fred/series/observations`;
    
    const response = await axios.get(url, {
      params: {
        series_id: seriesId,
        api_key: FRED_API_KEY,
        file_type: 'json',
        sort_order: 'desc',
        limit: 120 // Get 10 years of monthly data
      },
      timeout: 10000
    });
    
    if (!response.data || !response.data.observations) {
      console.warn('[WARN] Invalid response from FRED API');
      return null;
    }
    
    const observations = response.data.observations;
    
    // Group by year
    const peByYear = {};
    observations.forEach(obs => {
      const year = parseInt(obs.date.split('-')[0], 10);
      const value = parseFloat(obs.value);
      
      if (!isNaN(year) && !isNaN(value)) {
        if (!peByYear[year]) {
          peByYear[year] = [];
        }
        peByYear[year].push(value);
      }
    });
    
    // Calculate yearly averages
    const yearlyAverages = Object.entries(peByYear).map(([year, values]) => {
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      return { year: parseInt(year, 10), pe: Number(avg.toFixed(2)) };
    });
    
    // Sort by year descending
    yearlyAverages.sort((a, b) => b.year - a.year);
    
    // Get the last 5 years
    const last5Years = yearlyAverages.slice(0, 5);
    
    // Calculate 5-year and 10-year averages
    const currentYear = new Date().getFullYear();
    const pe5 = yearlyAverages.filter(r => r.year > currentYear - 5).map(r => r.pe);
    const pe10 = yearlyAverages.filter(r => r.year > currentYear - 10).map(r => r.pe);
    
    const avg5 = pe5.length ? Number((pe5.reduce((a, b) => a + b, 0) / pe5.length).toFixed(2)) : null;
    const avg10 = pe10.length ? Number((pe10.reduce((a, b) => a + b, 0) / pe10.length).toFixed(2)) : null;
    
    // Format data for the response
    const historicalPE = last5Years.map(item => item.pe);
    const years = last5Years.map(item => item.year);
    
    return {
      data: historicalPE,
      years,
      current: yearlyAverages[0] ? yearlyAverages[0].pe : null,
      fiveYearAvg: avg5,
      tenYearAvg: avg10,
      source: 'FRED (Federal Reserve Economic Data)',
      sourceUrl: 'https://fred.stlouisfed.org/series/MULTPL/SP500_PE_RATIO_MONTH',
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('[ERROR] Failed to fetch P/E data from FRED:', error);
    return null;
  }
}
