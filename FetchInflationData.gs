/**
 * Retrieves inflation expectations data
 * @return {Object} Inflation expectations data
 */
function retrieveInflationExpectations() {
  try {
    // Check cache first
    const scriptCache = CacheService.getScriptCache();
    const cachedData = scriptCache.get('INFLATION_DATA');
    
    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      const cachedExpectations = parsedData.expectations;
      
      if (cachedExpectations && cachedExpectations.oneYear && cachedExpectations.fiveYear) {
        Logger.log("Using cached inflation expectations data");
        return cachedExpectations;
      }
    }
    
    // Get FRED API key
    const apiKey = getFREDApiKey();
    if (!apiKey) {
      Logger.log("FRED API key not found");
      return null;
    }
    
    const baseUrl = "https://api.stlouisfed.org/fred/series/observations";
    
    // FRED Series IDs
    const series = {
<<<<<<< HEAD
      oneYear: "EXPINF1YR",  // 1-year expected inflation
=======
      oneYear: "MICH",        // 1-year expectation (median from U. Michigan)
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
      fiveYear: "T5YIE",      // 5-year breakeven inflation
      tenYear: "T10YIE"       // 10-year breakeven inflation
    };

    try {
      const results = {};
      for (const [key, seriesId] of Object.entries(series)) {
        const url = `${baseUrl}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`;
        const response = UrlFetchApp.fetch(url);
        const data = JSON.parse(response.getContentText());
        
        if (data.observations && data.observations.length > 0) {
          const observation = data.observations[0];
          results[key] = {
<<<<<<< HEAD
            value: key === 'oneYear' ? parseFloat(parseFloat(observation.value).toFixed(2)) : parseFloat(observation.value),
=======
            value: parseFloat(observation.value),
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
            lastUpdated: observation.date,
            source: {
              name: "FRED (Federal Reserve Economic Data)",
              url: `https://fred.stlouisfed.org/series/${seriesId}`
            }
          };
        }
      }

      return {
        oneYear: results.oneYear,
        fiveYear: results.fiveYear,
        tenYear: results.tenYear,
        source: {
<<<<<<< HEAD
          url: `https://fred.stlouisfed.org/series/${series.oneYear}`,
          name: "St. Louis Fed (FRED API)",
          timestamp: new Date().toISOString(),
          components: {
            url: `https://fred.stlouisfed.org/series/${series.oneYear}`,
=======
          url: "https://fred.stlouisfed.org/series/MICH",
          name: "St. Louis Fed (FRED API)",
          timestamp: new Date().toISOString(),
          components: {
            url: "https://fred.stlouisfed.org/series/MICH",
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
            name: "St. Louis Fed (FRED API)",
            timestamp: new Date().toISOString()
          }
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      Logger.log(`Error retrieving inflation expectations: ${error}`);
      return null;
    }
  } catch (error) {
    Logger.log(`Error retrieving inflation expectations: ${error}`);
    return null;
  }
}

/**
<<<<<<< HEAD
=======
 * Generates an analysis of inflation data
 * @param {Object} cpiData - CPI data
 * @param {Object} pceData - PCE data (optional)
 * @param {Object} expectationsData - Inflation expectations data
 * @return {String} Analysis of inflation data
 */
function generateInflationAnalysis(cpiData, pceData, expectationsData) {
  try {
    let analysis = "";
    
    // Check if we have CPI data (required)
    if (!cpiData) {
      return "Insufficient data to generate inflation analysis (CPI data required).";
    }
    
    // Get the headline CPI values
    const cpiValue = cpiData.yearOverYearChange;
    const cpiChange = cpiData.change;
    const coreCpiValue = cpiData.coreRate;
    const coreCpiChange = cpiData.coreChange;
    
    // Get the inflation expectations
    const oneYearExpectation = expectationsData?.oneYear;
    const fiveYearExpectation = expectationsData?.fiveYear;
    
    // Determine the trend
    const cpiTrend = cpiChange < 0 ? "decreasing" : cpiChange > 0 ? "increasing" : "stable";
    const coreCpiTrend = coreCpiChange < 0 ? "decreasing" : coreCpiChange > 0 ? "increasing" : "stable";
    
    // Generate the analysis
    analysis += `Headline CPI is currently at ${formatValue(cpiValue)}% (${cpiTrend}), while Core CPI (excluding food and energy) is at ${formatValue(coreCpiValue)}% (${coreCpiTrend}). `;
    
    // Add PCE data if available
    if (pceData) {
      const pceValue = pceData.yearOverYearChange;
      const pceChange = pceData.change;
      const corePceValue = pceData.coreRate;
      const corePceChange = pceData.coreChange;
      const pceTrend = pceChange < 0 ? "decreasing" : pceChange > 0 ? "increasing" : "stable";
      const corePceTrend = corePceChange < 0 ? "decreasing" : corePceChange > 0 ? "increasing" : "stable";
      
      analysis += `The Fed's preferred inflation measure, PCE, is at ${formatValue(pceValue)}% (${pceTrend}), with Core PCE at ${formatValue(corePceValue)}% (${corePceTrend}). `;
    } else {
      analysis += "PCE data is not available for comparison with the Fed's preferred inflation measure. ";
    }
    
    // Compare to Fed target using Core CPI if PCE is not available
    const fedTarget = 2.0;
    const coreValue = pceData ? pceData.coreRate : coreCpiValue;
    
    if (coreValue > fedTarget + 0.5) {
      analysis += `Core inflation remains above the Fed's ${fedTarget}% target, which may influence monetary policy decisions. `;
    } else if (coreValue < fedTarget - 0.5) {
      analysis += `Core inflation is below the Fed's ${fedTarget}% target, which may influence monetary policy decisions. `;
    } else {
      analysis += `Core inflation is near the Fed's ${fedTarget}% target. `;
    }
    
    // Add information about expectations if available
    if (oneYearExpectation && fiveYearExpectation) {
      analysis += `Inflation expectations for the next year are at ${formatValue(oneYearExpectation.value)}%, while 5-year expectations are at ${formatValue(fiveYearExpectation.value)}%. `;
    } else {
      analysis += "Inflation expectations data is not currently available. ";
    }
    
    // Conclude with an overall assessment
    if (coreValue > fedTarget + 1.0 || cpiValue > fedTarget + 1.5) {
      analysis += `Overall, inflation remains elevated relative to the Fed's target, suggesting continued vigilance from policymakers.`;
    } else if (coreValue < fedTarget - 0.5 || cpiValue < fedTarget - 0.5) {
      analysis += `Overall, inflation is running below the Fed's target, which may influence future monetary policy decisions.`;
    } else {
      analysis += `Overall, inflation appears to be moderating toward the Fed's target, suggesting a balanced approach to monetary policy.`;
    }
    
    return analysis;
  } catch (error) {
    Logger.log(`Error generating inflation analysis: ${error}`);
    return "Error generating inflation analysis.";
  }
}

/**
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
 * Tests the inflation data retrieval
 */
function testInflationData() {
  Logger.log("Testing inflation data retrieval...");
  
  // Clear cache to ensure we get fresh data
  const scriptCache = CacheService.getScriptCache();
  scriptCache.remove('INFLATION_DATA');
  Logger.log("Cleared inflation data cache for testing");
  
  // Retrieve inflation data
  const inflation = retrieveInflationData();
  
  // Log the results
  Logger.log("INFLATION DATA TEST RESULTS:");
  Logger.log(`Success: ${!inflation.error}`);
  
  if (!inflation.error) {
    // Log CPI data
    if (inflation.cpi) {
      Logger.log("CPI Data:");
      Logger.log(`  Year-over-Year: ${inflation.cpi.yearOverYearChange}%`);
      Logger.log(`  Core Rate: ${inflation.cpi.coreRate}%`);
      Logger.log(`  Change: ${inflation.cpi.change}%`);
      Logger.log(`  Source: ${inflation.cpi.source.name}`);
      Logger.log(`  Last Updated: ${new Date(inflation.cpi.source.timestamp).toLocaleString()}`);
    } else {
      Logger.log("CPI Data: Not available");
    }
    
    // Log PCE data
    if (inflation.pce) {
      Logger.log("PCE Data:");
      Logger.log(`  Year-over-Year: ${inflation.pce.yearOverYearChange}%`);
      Logger.log(`  Core Rate: ${inflation.pce.coreRate}%`);
      Logger.log(`  Change: ${inflation.pce.change}%`);
      Logger.log(`  Source: ${inflation.pce.source.name}`);
      Logger.log(`  Last Updated: ${new Date(inflation.pce.source.timestamp).toLocaleString()}`);
    } else {
      Logger.log("PCE Data: Not available");
    }
    
    // Log inflation expectations
    if (inflation.expectations) {
      Logger.log("Inflation Expectations:");
      Logger.log(`  1-Year: ${inflation.expectations.oneYear.value}% (Last Updated: ${new Date(inflation.expectations.source.timestamp).toLocaleString()})`);
      Logger.log(`  5-Year: ${inflation.expectations.fiveYear.value}% (Last Updated: ${new Date(inflation.expectations.source.timestamp).toLocaleString()})`);
      if (inflation.expectations.tenYear) {
        Logger.log(`  10-Year: ${inflation.expectations.tenYear.value}% (Last Updated: ${new Date(inflation.expectations.source.timestamp).toLocaleString()})`);
      }
      Logger.log(`  Source: ${inflation.expectations.source.name}`);
      Logger.log(`  Last Updated: ${new Date(inflation.expectations.source.timestamp).toLocaleString()}`);
    } else {
      Logger.log("Inflation Expectations: Not available");
    }
    
    // Log analysis
    if (inflation.analysis) {
      Logger.log("Analysis:");
      Logger.log(inflation.analysis);
    } else {
      Logger.log("Analysis: Not available");
    }
    
    // Log source and timestamp
    Logger.log(`Source: ${inflation.source.name}`);
    Logger.log(`Last Updated: ${new Date(inflation.source.timestamp).toLocaleString()}`);
  } else {
    Logger.log(`Error: ${inflation.message}`);
  }
  
  return inflation;
}

/**
<<<<<<< HEAD
 * Tests the inflation expectations data retrieval
 */
function testInflationExpectations() {
  Logger.log("Testing inflation expectations data retrieval...");
  
  // Clear cache to ensure we get fresh data
  const scriptCache = CacheService.getScriptCache();
  scriptCache.remove('INFLATION_DATA');
  Logger.log("Cleared inflation data cache for testing");
  
  // Retrieve inflation expectations data
  const expectations = retrieveInflationExpectations();
  
  // Log the results
  Logger.log("INFLATION EXPECTATIONS TEST RESULTS:");
  
  if (expectations) {
    // Log 1-Year expectations
    if (expectations.oneYear) {
      Logger.log("1-Year Inflation Expectations:");
      Logger.log(`  Value: ${expectations.oneYear.value}%`);
      Logger.log(`  Last Updated: ${expectations.oneYear.lastUpdated}`);
      Logger.log(`  Source: ${expectations.oneYear.source.name}`);
      Logger.log(`  Source URL: ${expectations.oneYear.source.url}`);
    } else {
      Logger.log("1-Year Inflation Expectations: Not available");
    }
    
    // Log 5-Year expectations
    if (expectations.fiveYear) {
      Logger.log("5-Year Inflation Expectations:");
      Logger.log(`  Value: ${expectations.fiveYear.value}%`);
      Logger.log(`  Last Updated: ${expectations.fiveYear.lastUpdated}`);
      Logger.log(`  Source: ${expectations.fiveYear.source.name}`);
      Logger.log(`  Source URL: ${expectations.fiveYear.source.url}`);
    } else {
      Logger.log("5-Year Inflation Expectations: Not available");
    }
    
    // Log 10-Year expectations
    if (expectations.tenYear) {
      Logger.log("10-Year Inflation Expectations:");
      Logger.log(`  Value: ${expectations.tenYear.value}%`);
      Logger.log(`  Last Updated: ${expectations.tenYear.lastUpdated}`);
      Logger.log(`  Source: ${expectations.tenYear.source.name}`);
      Logger.log(`  Source URL: ${expectations.tenYear.source.url}`);
    } else {
      Logger.log("10-Year Inflation Expectations: Not available");
    }
    
    Logger.log(`Overall Source: ${expectations.source.name}`);
    Logger.log(`Overall Source URL: ${expectations.source.url}`);
    Logger.log(`Last Updated: ${expectations.lastUpdated}`);
    
    return "Inflation expectations data test completed successfully.";
  } else {
    Logger.log("Failed to retrieve inflation expectations data.");
    return "Failed to retrieve inflation expectations data.";
  }
}

/**
=======
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
 * Tests the PCE data retrieval from BEA API
 * Logs detailed information about the API response structure
 */
function testPCEData() {
  Logger.log("Testing PCE data retrieval...");
  
  // Get BEA API key
  const apiKey = getBEAApiKey();
  if (!apiKey) {
    Logger.log("BEA API key not found");
    return;
  }
  
  // Set up the request
  const url = "https://apps.bea.gov/api/data";
  
  // Current date
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const previousYear = currentDate.getFullYear() - 1;
  
  // Request parameters - using quarterly data which is more reliable
  const params = {
    "UserID": apiKey,
    "method": "GetData",
    "datasetname": "NIPA",
    "TableName": "T20805", // Updated table identifier for Personal Consumption Expenditures
    "Frequency": "Q",
    "Year": `${previousYear},${currentYear}`,
    "ResultFormat": "JSON",
    "ShowMillions": "N"
  };
  
  // Build the query string
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");
  
  // Make the request
  const response = UrlFetchApp.fetch(`${url}?${queryString}`, {
    method: "get",
    muteHttpExceptions: true
  });
  
  // Check if the request was successful
  if (response.getResponseCode() !== 200) {
    Logger.log(`BEA API request failed with response code: ${response.getResponseCode()}`);
    return;
  }
  
  // Parse the response
  const responseText = response.getContentText();
  const data = JSON.parse(responseText);
  
  // Log the complete response structure for debugging
  Logger.log("BEA API response structure: " + JSON.stringify(Object.keys(data)));
  
  // Detailed logging of the response structure
  if (data.BEAAPI) {
    Logger.log("BEAAPI object keys: " + JSON.stringify(Object.keys(data.BEAAPI)));
    
    if (data.BEAAPI.Results) {
      Logger.log("Results object keys: " + JSON.stringify(Object.keys(data.BEAAPI.Results)));
      
      // Log the first few data items to understand the structure
      if (data.BEAAPI.Results.Data && Array.isArray(data.BEAAPI.Results.Data) && data.BEAAPI.Results.Data.length > 0) {
        Logger.log("Sample data item: " + JSON.stringify(data.BEAAPI.Results.Data[0]));
        
        // Log all available series codes for debugging
        const seriesCodes = [...new Set(data.BEAAPI.Results.Data.map(item => item.SeriesCode))];
        Logger.log("Available series codes: " + JSON.stringify(seriesCodes));
      }
    }
  }
  
  // Check if there's an error message
  if (data && data.BEAAPI && data.BEAAPI.Error) {
    Logger.log("BEA API error: " + JSON.stringify(data.BEAAPI.Error));
  }
  
  // Also try the FRED API as a comparison
  Logger.log("Testing FRED API for PCE data...");
  const fredData = fetchPCEDataFromFRED();
  if (fredData) {
    Logger.log("FRED API returned valid PCE data");
    Logger.log(JSON.stringify(fredData));
  } else {
    Logger.log("FRED API failed to return valid PCE data");
  }
  
  Logger.log("PCE data test complete");
}

/**
 * Retrieves inflation data
 * @return {Object} Inflation data
 */
function retrieveInflationData() {
  try {
    Logger.log("Retrieving inflation data...");
    
    // Check cache first (1-hour cache for inflation data)
    const scriptCache = CacheService.getScriptCache();
    const cachedData = scriptCache.get('INFLATION_DATA');
    
    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      const cacheTime = new Date(parsedData.lastUpdated);
      const currentTime = new Date();
      const cacheAgeMinutes = (currentTime - cacheTime) / (1000 * 60);
      
      if (cacheAgeMinutes < 60) {
        Logger.log("Using cached inflation data (less than 1 hour old)");
        return parsedData;
      } else {
        Logger.log("Cached inflation data is more than 1 hour old");
      }
    }
    
    // Retrieve CPI data
    const cpiData = retrieveCPIData();
    
    // Retrieve PCE data
    const pceData = retrievePCEData();
    
    // Retrieve inflation expectations
    const expectationsData = retrieveInflationExpectations();
      
    // If we couldn't get any data, return an error
    if (!cpiData && !pceData && !expectationsData) {
      return {
        error: true,
        message: "Failed to retrieve any inflation data"
      };
    }
    
    // Generate analysis only if we have data
    const analysis = (cpiData || pceData) ? generateInflationAnalysis(cpiData, pceData, expectationsData) : null;
    
    // Create the result object
    const result = {
      cpi: cpiData,
      pce: pceData,
      expectations: {
        oneYear: expectationsData?.oneYear,
        fiveYear: expectationsData?.fiveYear,
        tenYear: expectationsData?.tenYear,
        source: expectationsData?.source,
        lastUpdated: expectationsData?.lastUpdated || new Date()
      },
      analysis: analysis,
      source: {
        url: "https://www.bls.gov/cpi/",
        name: "Bureau of Labor Statistics",
        timestamp: new Date().toISOString(),
        components: {
          url: "https://www.bls.gov/cpi/",
          name: "Bureau of Labor Statistics",
          timestamp: new Date().toISOString()
        }
      },
      lastUpdated: new Date().toISOString()
    };
    
    // Cache the data for 1 hour (in seconds)
    scriptCache.put('INFLATION_DATA', JSON.stringify(result), 60 * 60);
     
    return result;
  } catch (error) {
    Logger.log(`Error retrieving inflation data: ${error}`);
    return {
      error: true,
      message: `Failed to retrieve inflation data: ${error}`
    };
  }
}

/**
 * Retrieves CPI data
 * @return {Object} CPI data or null if failed
 */
function retrieveCPIData() {
  try {
    Logger.log("Retrieving CPI data...");
    
    // Try to get data from BLS API
    const cpiData = fetchCPIDataFromBLS();
    if (cpiData && cpiData.yearOverYearChange !== undefined) {
      return cpiData;
    }
    
    // Fallback to web scraping from FRED
    const scrapedData = fetchCPIDataFromFRED();
    if (scrapedData && scrapedData.yearOverYearChange !== undefined) {
      return scrapedData;
    }
    
    // If all attempts failed, return null
    Logger.log("Failed to retrieve CPI data from all sources");
    return null;
    
  } catch (error) {
    Logger.log(`Error retrieving CPI data: ${error}`);
    return null;
  }
}

/**
 * Fetches CPI data from BLS API
 * @return {Object} CPI data or null if failed
 */
function fetchCPIDataFromBLS() {
  try {
    // Get BLS API key
    const apiKey = getBLSApiKey();
    if (!apiKey) {
      Logger.log("BLS API key not found");
      return null;
    }
    
    // Set up the request
    const url = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
    
    // CPI-U (All Urban Consumers) series ID
    const seriesId = "CUUR0000SA0"; // All items
    const coreSeriesId = "CUUR0000SA0L1E"; // All items less food and energy
    
    // Current date
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const lastYear = currentYear - 1;
    
    // Request parameters
    const payload = {
      "seriesid": [seriesId, coreSeriesId],
      "startyear": lastYear.toString(),
      "endyear": currentYear.toString(),
      "registrationkey": apiKey
    };
    
    // Make the request
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    // Check if the request was successful
    if (responseCode !== 200) {
      Logger.log(`BLS API request failed with response code: ${responseCode}`);
      return null;
    }
    
    // Parse the response
    const responseText = response.getContentText();
    const data = JSON.parse(responseText);
    
    // Check if the response contains the expected data
    if (!data || data.status !== "REQUEST_SUCCEEDED" || !data.Results || !data.Results.series || !Array.isArray(data.Results.series)) {
      Logger.log("BLS API response does not contain expected data structure");
      return null;
    }
    
    // Extract the CPI data
    const cpiSeries = data.Results.series.find(series => series.seriesID === seriesId);
    const coreCpiSeries = data.Results.series.find(series => series.seriesID === coreSeriesId);
    
    if (!cpiSeries || !cpiSeries.data || !Array.isArray(cpiSeries.data) || cpiSeries.data.length === 0 ||
        !coreCpiSeries || !coreCpiSeries.data || !Array.isArray(coreCpiSeries.data) || coreCpiSeries.data.length === 0) {
      Logger.log("BLS API response does not contain expected CPI data");
      return null;
    }
    
    // Sort data by date (newest first)
    cpiSeries.data.sort((a, b) => {
      if (a.year !== b.year) {
        return parseInt(b.year) - parseInt(a.year);
      }
      return parseInt(b.period.substring(1)) - parseInt(a.period.substring(1));
    });
    
    coreCpiSeries.data.sort((a, b) => {
      if (a.year !== b.year) {
        return parseInt(b.year) - parseInt(a.year);
      }
      return parseInt(b.period.substring(1)) - parseInt(a.period.substring(1));
    });
    
    // Get the latest and previous month values
    const latestCpi = parseFloat(cpiSeries.data[0].value);
    const previousCpi = parseFloat(cpiSeries.data[1].value);
    const latestCoreCpi = parseFloat(coreCpiSeries.data[0].value);
    const previousCoreCpi = parseFloat(coreCpiSeries.data[1].value);
    
    // Calculate year-over-year change
    // Find the same month from last year
    const latestMonth = parseInt(cpiSeries.data[0].period.substring(1));
    const latestYear = parseInt(cpiSeries.data[0].year);
    
    const lastYearSameMonthCpi = cpiSeries.data.find(item => 
      parseInt(item.year) === latestYear - 1 && parseInt(item.period.substring(1)) === latestMonth
    );
    
    const lastYearSameMonthCoreCpi = coreCpiSeries.data.find(item => 
      parseInt(item.year) === latestYear - 1 && parseInt(item.period.substring(1)) === latestMonth
    );
    
    let yearOverYearChange = null;
    let yearOverYearCoreChange = null;
    
    if (lastYearSameMonthCpi) {
      const lastYearCpi = parseFloat(lastYearSameMonthCpi.value);
      yearOverYearChange = ((latestCpi - lastYearCpi) / lastYearCpi) * 100;
    }
    
    if (lastYearSameMonthCoreCpi) {
      const lastYearCoreCpi = parseFloat(lastYearSameMonthCoreCpi.value);
      yearOverYearCoreChange = ((latestCoreCpi - lastYearCoreCpi) / lastYearCoreCpi) * 100;
    }
    
    // Calculate month-over-month percentage change
    const monthOverMonthChange = ((latestCpi - previousCpi) / previousCpi) * 100;
    
    // Validate the data - ensure values are within reasonable ranges for inflation
    // Typical inflation rates are between -2% and 15%
    if (yearOverYearChange !== null && (yearOverYearChange < -2 || yearOverYearChange > 15)) {
      Logger.log(`Suspicious CPI year-over-year change value: ${yearOverYearChange}%. This is outside normal ranges.`);
      return null;
    }
    
    if (yearOverYearCoreChange !== null && (yearOverYearCoreChange < -2 || yearOverYearCoreChange > 15)) {
      Logger.log(`Suspicious Core CPI year-over-year change value: ${yearOverYearCoreChange}%. This is outside normal ranges.`);
      // Use a calculated value based on month-over-month change
      yearOverYearCoreChange = ((latestCoreCpi - previousCoreCpi) / previousCoreCpi) * 12 * 100;
      
      // Still validate the calculated value
      if (yearOverYearCoreChange < -2 || yearOverYearCoreChange > 15) {
        Logger.log(`Calculated Core CPI value still suspicious: ${yearOverYearCoreChange}%. Returning null.`);
        return null;
      }
    }
    
    // Create the CPI data object
    return {
      currentRate: latestCpi,
      previousRate: previousCpi,
      change: monthOverMonthChange, // Use percentage change instead of absolute change
      yearOverYearChange: yearOverYearChange !== null ? yearOverYearChange : monthOverMonthChange * 12, // Annualize if YoY not available
      coreRate: yearOverYearCoreChange !== null ? yearOverYearCoreChange : null, // Use the YoY change as the core rate
      corePreviousRate: previousCoreCpi,
      coreChange: ((latestCoreCpi - previousCoreCpi) / previousCoreCpi) * 100,
      month: latestMonth - 1, // Convert to 0-indexed month
      year: latestYear,
      source: {
        url: "https://www.bls.gov/cpi/",
        name: "Bureau of Labor Statistics",
        timestamp: new Date().toISOString(),
        components: {
          url: "https://www.bls.gov/cpi/",
          name: "Bureau of Labor Statistics",
          timestamp: new Date().toISOString()
        }
      },
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    Logger.log(`Error fetching CPI data from BLS: ${error}`);
    return null;
  }
}

/**
 * Fetches CPI data from FRED website
 * @return {Object} CPI data or null if failed
 */
function fetchCPIDataFromFRED() {
  try {
    // Get FRED API key
    const apiKey = getFREDApiKey();
    if (!apiKey) {
      Logger.log("FRED API key not found");
      return null;
    }
    
    // Set up the request for CPI (All Items)
    const cpiUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key=${apiKey}&file_type=json&sort_order=desc&limit=13`;
    
    // Set up the request for Core CPI (All Items Less Food and Energy)
    const coreCpiUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=CPILFESL&api_key=${apiKey}&file_type=json&sort_order=desc&limit=13`;
    
    // Make the requests
    const options = {
      method: "get",
      muteHttpExceptions: true
    };
    
    const cpiResponse = UrlFetchApp.fetch(cpiUrl, options);
    const coreCpiResponse = UrlFetchApp.fetch(coreCpiUrl, options);
    
    // Check if the requests were successful
    if (cpiResponse.getResponseCode() !== 200 || coreCpiResponse.getResponseCode() !== 200) {
      Logger.log(`FRED API request failed with response codes: CPI=${cpiResponse.getResponseCode()}, Core CPI=${coreCpiResponse.getResponseCode()}`);
      return null;
    }
    
    // Parse the responses
    const cpiData = JSON.parse(cpiResponse.getContentText());
    const coreCpiData = JSON.parse(coreCpiResponse.getContentText());
    
    // Check if the responses contain the expected data
    if (!cpiData || !cpiData.observations || !Array.isArray(cpiData.observations) || cpiData.observations.length === 0 ||
        !coreCpiData || !coreCpiData.observations || !Array.isArray(coreCpiData.observations) || coreCpiData.observations.length === 0) {
      Logger.log("FRED API response does not contain expected CPI data");
      return null;
    }
    
    // Get the latest and previous month values
    const latestCpi = parseFloat(cpiData.observations[0].value);
    const previousCpi = parseFloat(cpiData.observations[1].value);
    const latestCoreCpi = parseFloat(coreCpiData.observations[0].value);
    const previousCoreCpi = parseFloat(coreCpiData.observations[1].value);
    
    // Get the same month from last year
    const oneYearAgoIndex = cpiData.observations.findIndex(obs => {
      const obsDate = new Date(obs.date);
      const latestDate = new Date(cpiData.observations[0].date);
      return obsDate.getMonth() === latestDate.getMonth() && obsDate.getFullYear() === latestDate.getFullYear() - 1;
    });
    
    const oneYearAgoCoreCpiIndex = coreCpiData.observations.findIndex(obs => {
      const obsDate = new Date(obs.date);
      const latestDate = new Date(coreCpiData.observations[0].date);
      return obsDate.getMonth() === latestDate.getMonth() && obsDate.getFullYear() === latestDate.getFullYear() - 1;
    });
    
    // Calculate year-over-year changes
    let yearOverYearChange = null;
    let yearOverYearCoreChange = null;
    
    if (oneYearAgoIndex !== -1 && oneYearAgoIndex < cpiData.observations.length) {
      const oneYearAgoCpi = parseFloat(cpiData.observations[oneYearAgoIndex].value);
      yearOverYearChange = ((latestCpi - oneYearAgoCpi) / oneYearAgoCpi) * 100;
    }
    
    if (oneYearAgoCoreCpiIndex !== -1 && oneYearAgoCoreCpiIndex < coreCpiData.observations.length) {
      const oneYearAgoCoreCpi = parseFloat(coreCpiData.observations[oneYearAgoCoreCpiIndex].value);
      yearOverYearCoreChange = ((latestCoreCpi - oneYearAgoCoreCpi) / oneYearAgoCoreCpi) * 100;
    }
    
    // Calculate month-over-month percentage change
    const monthOverMonthChange = ((latestCpi - previousCpi) / previousCpi) * 100;
    
    // Validate the data - ensure values are within reasonable ranges for inflation
    // Typical inflation rates are between -2% and 15%
    if (yearOverYearChange !== null && (yearOverYearChange < -2 || yearOverYearChange > 15)) {
      Logger.log(`Suspicious CPI year-over-year change value: ${yearOverYearChange}%. This is outside normal ranges.`);
      // Use a calculated value based on month-over-month change
      yearOverYearChange = monthOverMonthChange * 12;
      
      // Still validate the calculated value
      if (yearOverYearChange < -2 || yearOverYearChange > 15) {
        Logger.log(`Calculated CPI value still suspicious: ${yearOverYearChange}%. Returning null.`);
        return null;
      }
    }
    
    if (yearOverYearCoreChange !== null && (yearOverYearCoreChange < -2 || yearOverYearCoreChange > 15)) {
      Logger.log(`Suspicious Core CPI year-over-year change value: ${yearOverYearCoreChange}%. This is outside normal ranges.`);
      // Use a calculated value based on month-over-month change
      yearOverYearCoreChange = ((latestCoreCpi - previousCoreCpi) / previousCoreCpi) * 12;
      
      // Still validate the calculated value
      if (yearOverYearCoreChange < -2 || yearOverYearCoreChange > 15) {
        Logger.log(`Calculated Core CPI value still suspicious: ${yearOverYearCoreChange}%. Returning null.`);
        return null;
      }
    }
    
    // Create the CPI data object
    return {
      currentRate: latestCpi,
      previousRate: previousCpi,
      change: monthOverMonthChange,
      yearOverYearChange: yearOverYearChange !== null ? yearOverYearChange : monthOverMonthChange * 12, // Annualize if YoY not available
      coreRate: yearOverYearCoreChange !== null ? yearOverYearCoreChange : null, // Use the YoY change as the core rate
      corePreviousRate: previousCoreCpi,
      coreChange: ((latestCoreCpi - previousCoreCpi) / previousCoreCpi) * 100,
      month: new Date(cpiData.observations[0].date).getMonth(),
      year: new Date(cpiData.observations[0].date).getFullYear(),
      source: {
        url: "https://fred.stlouisfed.org/",
        name: "Federal Reserve Economic Data (FRED)",
        timestamp: new Date().toISOString(),
        components: {
          url: "https://fred.stlouisfed.org/",
          name: "Federal Reserve Economic Data (FRED)",
          timestamp: new Date().toISOString()
        }
      },
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    Logger.log(`Error fetching CPI data from FRED: ${error}`);
    return null;
  }
}

/**
 * Retrieves PCE data
 * @return {Object} PCE data or null if failed
 */
function retrievePCEData() {
  try {
    Logger.log("Retrieving PCE data...");
    
    // Try to get data from BEA API
    const pceData = fetchPCEDataFromBEA();
    
    // If we got valid data, return it
    if (pceData && pceData.yearOverYearChange !== undefined) {
      return pceData;
    }
    
    // Fallback to web scraping from FRED
    const scrapedData = fetchPCEDataFromFRED();
    if (scrapedData && scrapedData.yearOverYearChange !== undefined) {
      return scrapedData;
    }
    
    // If all attempts failed, return null
    Logger.log("Failed to retrieve PCE data from all sources");
    return null;
    
  } catch (error) {
    Logger.log(`Error retrieving PCE data: ${error}`);
    return null;
  }
}

/**
 * Fetches PCE data from BEA API
 * @return {Object} PCE data or null if failed
 */
function fetchPCEDataFromBEA() {
  try {
    // Get BEA API key
    const apiKey = getBEAApiKey();
    if (!apiKey) {
      Logger.log("BEA API key not found");
      return null;
    }
    
    // Set up the request
    const url = "https://apps.bea.gov/api/data";
    
    // Current date
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const previousYear = currentDate.getFullYear() - 1;
    
    // Request parameters - using quarterly data which is more reliable
    const params = {
      "UserID": apiKey,
      "method": "GetData",
      "datasetname": "NIPA",
      "TableName": "T20805", // Updated table identifier for Personal Consumption Expenditures
      "Frequency": "Q",
      "Year": `${previousYear},${currentYear}`,
      "ResultFormat": "JSON",
      "ShowMillions": "N"
    };
    
    // Build the query string
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join("&");
    
    // Make the request
    const response = UrlFetchApp.fetch(`${url}?${queryString}`, {
      method: "get",
      muteHttpExceptions: true
    });
    
    // Check if the request was successful
    if (response.getResponseCode() !== 200) {
      Logger.log(`BEA API request failed with response code: ${response.getResponseCode()}`);
      return null;
    }
    
    // Parse the response
    const responseText = response.getContentText();
    const data = JSON.parse(responseText);
    
    // Log the response structure for debugging
    Logger.log("BEA API response structure: " + JSON.stringify(data));
    
    // Check if the response contains the expected data
    if (!data || data.BEAAPI === undefined || data.BEAAPI.Results === undefined || data.BEAAPI.Results.Data === undefined || !Array.isArray(data.BEAAPI.Results.Data)) {
      Logger.log("BEA API response does not contain expected data structure");
      
      // Check if there's an error message
      if (data && data.BEAAPI && data.BEAAPI.Error) {
        Logger.log("BEA API error: " + JSON.stringify(data.BEAAPI.Error));
        
        // If the error is 201 (data not available yet), return null to fall back to FRED
        if (data.BEAAPI.Error.APIErrorCode === "201") {
          Logger.log("BEA API: Data not available yet, falling back to FRED");
          return null;
        }
      }
      
      return null;
    }
    
    // Extract the PCE data
    // PCE (All Items)
    const pceData = data.BEAAPI.Results.Data.filter(item => 
      item.SeriesCode === "DPCERG" // PCE price index
    );
    
    // Core PCE (All Items Less Food and Energy)
    const corePceData = data.BEAAPI.Results.Data.filter(item => 
      item.SeriesCode === "DPCCRG" // Core PCE price index
    );
    
    if (pceData.length === 0 || corePceData.length === 0) {
      Logger.log("BEA API response does not contain expected PCE data");
      
      // Log all available series codes for debugging
      const seriesCodes = [...new Set(data.BEAAPI.Results.Data.map(item => item.SeriesCode))];
      Logger.log("Available series codes: " + JSON.stringify(seriesCodes));
      
      return null;
    }
    
    // Sort data by date (newest first)
    pceData.sort((a, b) => {
      if (a.year !== b.year) {
        return parseInt(b.year) - parseInt(a.year);
      }
      return parseInt(b.period.substring(1)) - parseInt(a.period.substring(1));
    });
    
    corePceData.sort((a, b) => {
      if (a.year !== b.year) {
        return parseInt(b.year) - parseInt(a.year);
      }
      return parseInt(b.period.substring(1)) - parseInt(a.period.substring(1));
    });
    
    // Get the latest and previous quarter values
    const latestPce = parseFloat(pceData[0].DataValue);
    const previousPce = parseFloat(pceData[1].DataValue);
    const latestCorePce = parseFloat(corePceData[0].DataValue);
    const previousCorePce = parseFloat(corePceData[1].DataValue);
    
    // Calculate year-over-year change
    // Find the same quarter from last year
    const latestDate = new Date(pceData[0].TimePeriod);
    const latestQuarter = pceData[0].TimePeriod.substring(pceData[0].TimePeriod.length - 2);
    const latestYear = latestDate.getFullYear();
    
    const lastYearSameQuarterPce = pceData.find(item => {
      return item.TimePeriod.endsWith(latestQuarter) && 
             item.TimePeriod.startsWith((latestYear - 1).toString());
    });
    
    const lastYearSameQuarterCorePce = corePceData.find(item => {
      return item.TimePeriod.endsWith(latestQuarter) && 
             item.TimePeriod.startsWith((latestYear - 1).toString());
    });
    
    let yearOverYearChange = null;
    let yearOverYearCoreChange = null;
    
    if (lastYearSameQuarterPce) {
      const lastYearPce = parseFloat(lastYearSameQuarterPce.DataValue);
      yearOverYearChange = ((latestPce - lastYearPce) / lastYearPce) * 100;
    }
    
    if (lastYearSameQuarterCorePce) {
      const lastYearCorePce = parseFloat(lastYearSameQuarterCorePce.DataValue);
      yearOverYearCoreChange = ((latestCorePce - lastYearCorePce) / lastYearCorePce) * 100;
    }
    
    // Calculate quarter-over-quarter percentage change
    const quarterOverQuarterChange = ((latestPce - previousPce) / previousPce) * 100;
    
    // Validate the data - ensure values are within reasonable ranges for inflation
    // Typical inflation rates are between -2% and 15%
    if (yearOverYearChange !== null && (yearOverYearChange < -2 || yearOverYearChange > 15)) {
      Logger.log(`Suspicious PCE year-over-year change value: ${yearOverYearChange}%. This is outside normal ranges.`);
      // Use a calculated value based on quarter-over-quarter change
      yearOverYearChange = quarterOverQuarterChange * 4;
      
      // Still validate the calculated value
      if (yearOverYearChange < -2 || yearOverYearChange > 15) {
        Logger.log(`Calculated PCE value still suspicious: ${yearOverYearChange}%. Returning null.`);
        return null;
      }
    }
    
    if (yearOverYearCoreChange !== null && (yearOverYearCoreChange < -2 || yearOverYearCoreChange > 15)) {
      Logger.log(`Suspicious Core PCE year-over-year change value: ${yearOverYearCoreChange}%. This is outside normal ranges.`);
      // Use a calculated value based on quarter-over-quarter change
      yearOverYearCoreChange = ((latestCorePce - previousCorePce) / previousCorePce) * 4;
      
      // Still validate the calculated value
      if (yearOverYearCoreChange < -2 || yearOverYearCoreChange > 15) {
        Logger.log(`Calculated Core PCE value still suspicious: ${yearOverYearCoreChange}%. Returning null.`);
        return null;
      }
    }
    
    // Create the PCE data object
    return {
      currentRate: latestPce,
      previousRate: previousPce,
      change: quarterOverQuarterChange,
      yearOverYearChange: yearOverYearChange !== null ? yearOverYearChange : quarterOverQuarterChange * 4, // Annualize if YoY not available
      coreRate: yearOverYearCoreChange !== null ? yearOverYearCoreChange : null, // Use the YoY change as the core rate
      corePreviousRate: previousCorePce,
      coreChange: ((latestCorePce - previousCorePce) / previousCorePce) * 100,
      quarter: latestQuarter,
      year: latestYear,
      source: {
        url: "https://www.bea.gov/data/personal-consumption-expenditures-price-index",
        name: "Bureau of Economic Analysis",
        timestamp: new Date().toISOString(),
        components: {
          url: "https://www.bea.gov/data/personal-consumption-expenditures-price-index",
          name: "Bureau of Economic Analysis",
          timestamp: new Date().toISOString()
        }
      },
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    Logger.log(`Error fetching PCE data from BEA: ${error}`);
    return null;
  }
}

/**
 * Fetches PCE data from FRED API
 * @return {Object} PCE data or null if failed
 */
function fetchPCEDataFromFRED() {
  try {
    // Get FRED API key
    const apiKey = getFREDApiKey();
    if (!apiKey) {
      Logger.log("FRED API key not found");
      return null;
    }
    
    // Set up the request for PCE (All Items)
    const pceUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=PCEPI&api_key=${apiKey}&file_type=json&sort_order=desc&limit=13`;
    
    // Set up the request for Core PCE (All Items Less Food and Energy)
    const corePceUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=PCEPILFE&api_key=${apiKey}&file_type=json&sort_order=desc&limit=13`;
    
    // Make the requests
    const options = {
      method: "get",
      muteHttpExceptions: true
    };
    
    const pceResponse = UrlFetchApp.fetch(pceUrl, options);
    const pceResponseCode = pceResponse.getResponseCode();
    
    const corePceResponse = UrlFetchApp.fetch(corePceUrl, options);
    const corePceResponseCode = corePceResponse.getResponseCode();
    
    // Check if the requests were successful
    if (pceResponseCode !== 200 || corePceResponseCode !== 200) {
      Logger.log(`FRED API request failed with response codes: PCE=${pceResponseCode}, Core PCE=${corePceResponseCode}`);
      return null;
    }
    
    // Parse the responses
    const pceData = JSON.parse(pceResponse.getContentText());
    const corePceData = JSON.parse(corePceResponse.getContentText());
    
    // Check if the responses contain the expected data
    if (!pceData || !pceData.observations || !Array.isArray(pceData.observations) || pceData.observations.length === 0 ||
        !corePceData || !corePceData.observations || !Array.isArray(corePceData.observations) || corePceData.observations.length === 0) {
      Logger.log("FRED API response does not contain expected PCE data");
      return null;
    }
    
    // Get the latest and previous month values
    const latestPce = parseFloat(pceData.observations[0].value);
    const previousPce = parseFloat(pceData.observations[1].value);
    const latestCorePce = parseFloat(corePceData.observations[0].value);
    const previousCorePce = parseFloat(corePceData.observations[1].value);
    
    // Get the same month from last year
    const oneYearAgoIndex = pceData.observations.findIndex(obs => {
      const obsDate = new Date(obs.date);
      const latestDate = new Date(pceData.observations[0].date);
      return obsDate.getMonth() === latestDate.getMonth() && obsDate.getFullYear() === latestDate.getFullYear() - 1;
    });
    
    const oneYearAgoCorePceIndex = corePceData.observations.findIndex(obs => {
      const obsDate = new Date(obs.date);
      const latestDate = new Date(corePceData.observations[0].date);
      return obsDate.getMonth() === latestDate.getMonth() && obsDate.getFullYear() === latestDate.getFullYear() - 1;
    });
    
    // Calculate year-over-year changes
    let yearOverYearChange = null;
    let yearOverYearCoreChange = null;
    
    if (oneYearAgoIndex !== -1 && oneYearAgoIndex < pceData.observations.length) {
      const oneYearAgoPce = parseFloat(pceData.observations[oneYearAgoIndex].value);
      yearOverYearChange = ((latestPce - oneYearAgoPce) / oneYearAgoPce) * 100;
    }
    
    if (oneYearAgoCorePceIndex !== -1 && oneYearAgoCorePceIndex < corePceData.observations.length) {
      const oneYearAgoCorePce = parseFloat(corePceData.observations[oneYearAgoCorePceIndex].value);
      yearOverYearCoreChange = ((latestCorePce - oneYearAgoCorePce) / oneYearAgoCorePce) * 100;
    }
    
    // Calculate month-over-month percentage change
    const monthOverMonthChange = ((latestPce - previousPce) / previousPce) * 100;
    const coreMonthOverMonthChange = ((latestCorePce - previousCorePce) / previousCorePce) * 100;
    
    // Validate the data - ensure values are within reasonable ranges for inflation
    // Typical inflation rates are between -2% and 15%
    if (yearOverYearChange !== null && (yearOverYearChange < -2 || yearOverYearChange > 15)) {
      Logger.log(`Suspicious PCE year-over-year change value: ${yearOverYearChange}%. This is outside normal ranges.`);
      // Use a calculated value based on month-over-month change
      yearOverYearChange = monthOverMonthChange * 12;
      
      // Still validate the calculated value
      if (yearOverYearChange < -2 || yearOverYearChange > 15) {
        Logger.log(`Calculated PCE value still suspicious: ${yearOverYearChange}%. Returning null.`);
        return null;
      }
    }
    
    if (yearOverYearCoreChange !== null && (yearOverYearCoreChange < -2 || yearOverYearCoreChange > 15)) {
      Logger.log(`Suspicious Core PCE year-over-year change value: ${yearOverYearCoreChange}%. This is outside normal ranges.`);
      // Use a calculated value based on month-over-month change
      yearOverYearCoreChange = coreMonthOverMonthChange * 12;
      
      // Still validate the calculated value
      if (yearOverYearCoreChange < -2 || yearOverYearCoreChange > 15) {
        Logger.log(`Calculated Core PCE value still suspicious: ${yearOverYearCoreChange}%. Returning null.`);
        return null;
      }
    }
    
    // Create the PCE data object
    return {
      currentRate: latestPce,
      previousRate: previousPce,
      change: monthOverMonthChange,
      yearOverYearChange: yearOverYearChange !== null ? yearOverYearChange : monthOverMonthChange * 12, // Annualize if YoY not available
      coreRate: yearOverYearCoreChange !== null ? yearOverYearCoreChange : coreMonthOverMonthChange * 12, // Annualize if YoY not available
      corePreviousRate: previousCorePce,
      coreChange: coreMonthOverMonthChange,
      month: new Date(pceData.observations[0].date).getMonth(),
      year: new Date(pceData.observations[0].date).getFullYear(),
      source: {
        url: "https://fred.stlouisfed.org/",
        name: "Federal Reserve Economic Data (FRED)",
        timestamp: new Date().toISOString(),
        components: {
          url: "https://fred.stlouisfed.org/",
          name: "Federal Reserve Economic Data (FRED)",
          timestamp: new Date().toISOString()
        }
      },
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    Logger.log(`Error fetching PCE data from FRED: ${error}`);
    return null;
  }
}
<<<<<<< HEAD

/**
 * Generates an analysis of inflation data
 * @param {Object} cpiData - CPI data
 * @param {Object} pceData - PCE data (optional)
 * @param {Object} expectationsData - Inflation expectations data
 * @return {String} Analysis of inflation data
 */
function generateInflationAnalysis(cpiData, pceData, expectationsData) {
  try {
    let analysis = "";
    
    // Check if we have CPI data (required)
    if (!cpiData) {
      return "Insufficient data to generate inflation analysis (CPI data required).";
    }
    
    // Get the headline CPI values
    const cpiValue = cpiData.yearOverYearChange;
    const cpiChange = cpiData.change;
    const coreCpiValue = cpiData.coreRate;
    const coreCpiChange = cpiData.coreChange;
    
    // Get the inflation expectations
    const oneYearExpectation = expectationsData?.oneYear;
    const fiveYearExpectation = expectationsData?.fiveYear;
    
    // Determine the trend
    const cpiTrend = cpiChange < 0 ? "decreasing" : cpiChange > 0 ? "increasing" : "stable";
    const coreCpiTrend = coreCpiChange < 0 ? "decreasing" : coreCpiChange > 0 ? "increasing" : "stable";
    
    // Generate the analysis
    analysis += `Headline CPI is currently at ${formatValue(cpiValue)}% (${cpiTrend}), while Core CPI (excluding food and energy) is at ${formatValue(coreCpiValue)}% (${coreCpiTrend}). `;
    
    // Add PCE data if available
    if (pceData) {
      const pceValue = pceData.yearOverYearChange;
      const pceChange = pceData.change;
      const corePceValue = pceData.coreRate;
      const corePceChange = pceData.coreChange;
      const pceTrend = pceChange < 0 ? "decreasing" : pceChange > 0 ? "increasing" : "stable";
      const corePceTrend = corePceChange < 0 ? "decreasing" : corePceChange > 0 ? "increasing" : "stable";
      
      analysis += `The Fed's preferred inflation measure, PCE, is at ${formatValue(pceValue)}% (${pceTrend}), with Core PCE at ${formatValue(corePceValue)}% (${corePceTrend}). `;
    } else {
      analysis += "PCE data is not available for comparison with the Fed's preferred inflation measure. ";
    }
    
    // Compare to Fed target using Core CPI if PCE is not available
    const fedTarget = 2.0;
    const coreValue = pceData ? pceData.coreRate : coreCpiValue;
    
    if (coreValue > fedTarget + 0.5) {
      analysis += `Core inflation remains above the Fed's ${fedTarget}% target, which may influence monetary policy decisions. `;
    } else if (coreValue < fedTarget - 0.5) {
      analysis += `Core inflation is below the Fed's ${fedTarget}% target, which may influence monetary policy decisions. `;
    } else {
      analysis += `Core inflation is near the Fed's ${fedTarget}% target. `;
    }
    
    // Add information about expectations if available
    if (oneYearExpectation && fiveYearExpectation) {
      analysis += `Inflation expectations for the next year are at ${formatValue(oneYearExpectation.value)}%, while 5-year expectations are at ${formatValue(fiveYearExpectation.value)}%. `;
    } else {
      analysis += "Inflation expectations data is not currently available. ";
    }
    
    // Conclude with an overall assessment
    if (coreValue > fedTarget + 1.0 || cpiValue > fedTarget + 1.5) {
      analysis += `Overall, inflation remains elevated relative to the Fed's target, suggesting continued vigilance from policymakers.`;
    } else if (coreValue < fedTarget - 0.5 || cpiValue < fedTarget - 0.5) {
      analysis += `Overall, inflation is running below the Fed's target, which may influence future monetary policy decisions.`;
    } else {
      analysis += `Overall, inflation appears to be moderating toward the Fed's target, suggesting a balanced approach to monetary policy.`;
    }
    
    return analysis;
  } catch (error) {
    Logger.log(`Error generating inflation analysis: ${error}`);
    return "Error generating inflation analysis.";
  }
}
=======
>>>>>>> e80430d35c78aec5ecc761bbc6b43d16d32918fa
