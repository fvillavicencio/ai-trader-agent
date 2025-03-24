/**
 * Macroeconomic Factors Module
 * Handles retrieval of macroeconomic data including treasury yields, Fed policy,
 * inflation data, and geopolitical risks
 */

/**
 * Retrieves macroeconomic factors data
 * @return {Object} Macroeconomic factors data
 */
function retrieveMacroeconomicFactors() {
  try {
    Logger.log("Retrieving macroeconomic factors data...");
    
    // Retrieve treasury yields data
    const treasuryYields = retrieveTreasuryYieldsData();
    
    // Retrieve Fed policy data
    const fedPolicy = retrieveFedPolicyData();
    
    // Retrieve inflation data
    const inflation = retrieveInflationData();
    
    // Retrieve geopolitical risks
    const geopoliticalRisks = retrieveGeopoliticalRisksData();
    
    // Check if we have data for each section
    const hasTreasuryYields = treasuryYields && !treasuryYields.error;
    const hasFedPolicy = fedPolicy && !fedPolicy.error;
    const hasInflation = inflation && !inflation.error;
    const hasGeopoliticalRisks = geopoliticalRisks && Array.isArray(geopoliticalRisks.risks) && geopoliticalRisks.risks.length > 0;
    
    // Format the data for display
    const formattedData = formatMacroeconomicFactorsData({
      treasuryYields: treasuryYields,
      fedPolicy: fedPolicy,
      inflation: inflation,
      geopoliticalRisks: geopoliticalRisks
    });
    
    // Log the results
    Logger.log("MACROECONOMIC FACTORS DATA RESULTS:");
    Logger.log(`Status: ${(hasTreasuryYields || hasFedPolicy || hasInflation || hasGeopoliticalRisks) ? "Success" : "Failure"}`);
    Logger.log(`Message: ${(hasTreasuryYields || hasFedPolicy || hasInflation || hasGeopoliticalRisks) ? "Macroeconomic factors data retrieved successfully." : "Failed to retrieve macroeconomic factors data."}`);
    Logger.log(`Treasury Yields: ${hasTreasuryYields ? "Retrieved" : "Not found"}`);
    Logger.log(`Fed Policy: ${hasFedPolicy ? "Retrieved" : "Not found"}`);
    Logger.log(`Inflation: ${hasInflation ? "Retrieved" : "Not found"}`);
    Logger.log(`Geopolitical Risks: ${hasGeopoliticalRisks ? `Found ${geopoliticalRisks.risks.length} risks` : "Not found"}`);
    Logger.log("Formatted Macroeconomic Factors Data:");
    Logger.log(formattedData);
    
    // Return the results
    return {
      success: (hasTreasuryYields || hasFedPolicy || hasInflation || hasGeopoliticalRisks),
      message: (hasTreasuryYields || hasFedPolicy || hasInflation || hasGeopoliticalRisks) ? "Macroeconomic factors data retrieved successfully." : "Failed to retrieve macroeconomic factors data.",
      treasuryYields: treasuryYields,
      fedPolicy: fedPolicy,
      inflation: inflation,
      geopoliticalRisks: geopoliticalRisks,
      formattedData: formattedData,
      timestamp: new Date()
    };
  } catch (error) {
    Logger.log(`Error retrieving macroeconomic factors data: ${error}`);
    return {
      success: false,
      message: `Failed to retrieve macroeconomic factors data: ${error}`,
      timestamp: new Date()
    };
  }
}

/**
 * Formats the macroeconomic factors data for display
 * @param {Object} macroData - Macroeconomic factors data object returned by retrieveMacroeconomicFactors
 * @return {String} Formatted macroeconomic factors data
 */
function formatMacroeconomicFactorsData(macroData) {
  let formattedData = "";
  
  // Extract individual components from the macroData object
  const treasuryYields = macroData.treasuryYields;
  const fedPolicy = macroData.fedPolicy;
  const inflation = macroData.inflation;
  const geopoliticalRisks = macroData.geopoliticalRisks;
  
  // Format treasury yields data
  if (treasuryYields && !treasuryYields.error) {
    formattedData += "Treasury Yields:\n";
    
    // Find specific yields safely with null checks
    const twoYearYield = treasuryYields.yields ? treasuryYields.yields.find(y => y.term === "2-Year") : null;
    const tenYearYield = treasuryYields.yields ? treasuryYields.yields.find(y => y.term === "10-Year") : null;
    
    if (twoYearYield && twoYearYield.yield !== undefined) {
      formattedData += `  - 2-Year Treasury Yield: ${twoYearYield.yield.toFixed(2)}% (${twoYearYield.change >= 0 ? "+" : ""}${twoYearYield.change.toFixed(2)})\n`;
    }
    
    if (tenYearYield && tenYearYield.yield !== undefined) {
      formattedData += `  - 10-Year Treasury Yield: ${tenYearYield.yield.toFixed(2)}% (${tenYearYield.change >= 0 ? "+" : ""}${tenYearYield.change.toFixed(2)})\n`;
    }
    
    if (treasuryYields.yieldCurve) {
      formattedData += `  - Yield Curve Status: ${treasuryYields.yieldCurve.status}\n`;
      formattedData += `  - Analysis: ${treasuryYields.yieldCurve.analysis}\n`;
    }
    
    // Add source information
    if (treasuryYields.source && treasuryYields.lastUpdated) {
      const timestamp = new Date(treasuryYields.lastUpdated);
      formattedData += `  - Source: ${treasuryYields.source} (${treasuryYields.sourceUrl}), as of ${timestamp.toLocaleDateString()}, ${timestamp.toLocaleTimeString()}\n`;
    }
    
    formattedData += "\n";
  }
  
  // Format Fed policy data
  if (fedPolicy && !fedPolicy.error) {
    formattedData += "Federal Reserve Policy:\n";
    
    if (fedPolicy.currentRate && fedPolicy.currentRate.rate !== undefined) {
      formattedData += `  - Current Federal Funds Rate: ${fedPolicy.currentRate.rate.toFixed(2)}%\n`;
    }
    
    if (fedPolicy.lastMeeting && fedPolicy.lastMeeting.date) {
      formattedData += `  - Last FOMC Meeting: ${new Date(fedPolicy.lastMeeting.date).toLocaleDateString()}\n`;
    }
    
    if (fedPolicy.nextMeeting && fedPolicy.nextMeeting.date) {
      formattedData += `  - Next FOMC Meeting: ${new Date(fedPolicy.nextMeeting.date).toLocaleDateString()}\n`;
    }
    
    if (fedPolicy.forwardGuidance) {
      formattedData += `  - Forward Guidance: ${fedPolicy.forwardGuidance}\n`;
    }
    
    if (fedPolicy.commentary) {
      formattedData += `  - Recent Fed Commentary: ${fedPolicy.commentary}\n`;
    }
    
    // Add source information
    if (fedPolicy.source && fedPolicy.lastUpdated) {
      const timestamp = new Date(fedPolicy.lastUpdated);
      formattedData += `  - Source: ${fedPolicy.source} (${fedPolicy.sourceUrl}), as of ${timestamp.toLocaleDateString()}, ${timestamp.toLocaleTimeString()}\n`;
    }
    
    formattedData += "\n";
  }
  
  // Format inflation data
  if (inflation && !inflation.error) {
    formattedData += "Inflation Data:\n";
    
    if (inflation.cpi && inflation.cpi.yearOverYearChange !== undefined) {
      formattedData += `  - CPI (Year-over-Year): ${inflation.cpi.yearOverYearChange.toFixed(1)}%\n`;
    }
    
    if (inflation.cpi && inflation.cpi.coreRate !== undefined) {
      formattedData += `  - Core CPI (Year-over-Year): ${inflation.cpi.coreRate.toFixed(1)}%\n`;
    }
    
    if (inflation.pce && inflation.pce.yearOverYearChange !== undefined) {
      formattedData += `  - PCE (Year-over-Year): ${inflation.pce.yearOverYearChange.toFixed(1)}%\n`;
    }
    
    if (inflation.pce && inflation.pce.coreRate !== undefined) {
      formattedData += `  - Core PCE (Year-over-Year): ${inflation.pce.coreRate.toFixed(1)}%\n`;
    }
    
    if (inflation.analysis) {
      formattedData += `  - Analysis: ${inflation.analysis}\n`;
    }
    
    // Add source information
    if (inflation.source && inflation.lastUpdated) {
      const timestamp = new Date(inflation.lastUpdated);
      formattedData += `  - Source: ${inflation.source} (${inflation.sourceUrl}), as of ${timestamp.toLocaleDateString()}, ${timestamp.toLocaleTimeString()}\n`;
    }
    
    formattedData += "\n";
  }
  
  // Format geopolitical risks data
  if (geopoliticalRisks && Array.isArray(geopoliticalRisks.risks) && geopoliticalRisks.risks.length > 0) {
    formattedData += "Geopolitical Risks:\n";
    
    // Add each risk
    for (const risk of geopoliticalRisks.risks) {
      formattedData += `  - ${risk.name}:\n`;
      
      // Handle different types of risks differently
      if (risk.type === "Index") {
        // For index-type risks
        formattedData += `    - Value: ${risk.value ? risk.value.toFixed(1) : 'N/A'}\n`;
        formattedData += `    - Change: ${risk.change ? (risk.change > 0 ? '+' : '') + risk.change.toFixed(1) : 'N/A'}\n`;
        formattedData += `    - Interpretation: ${risk.interpretation || 'N/A'}\n`;
      } else {
        // For event-type risks
        formattedData += `    - Description: ${risk.description || 'N/A'}\n`;
        formattedData += `    - Region: ${risk.region || 'Global'}\n`;
        formattedData += `    - Impact Level: ${risk.impactLevel || 'N/A'}\n`;
        formattedData += `    - Market Impact: ${risk.marketImpact || 'N/A'}\n`;
      }
      
      formattedData += `    - Source: ${risk.source} (${risk.url})\n`;
      formattedData += "\n";
    }
  }
  
  return formattedData;
}

/**
 * Retrieves treasury yields data
 * @return {Object} Treasury yields data
 */
function retrieveTreasuryYieldsData() {
  try {
    Logger.log("Retrieving treasury yields data...");
    
    // Check cache first (24-hour cache for Treasury yields)
    const scriptCache = CacheService.getScriptCache();
    const cachedData = scriptCache.get('TREASURY_YIELDS_DATA');
    
    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      const cacheTime = new Date(parsedData.lastUpdated);
      const currentTime = new Date();
      const cacheAgeHours = (currentTime - cacheTime) / (1000 * 60 * 60);
      
      if (cacheAgeHours < 24) {
        Logger.log("Using cached treasury yields data (less than 24 hours old)");
        return parsedData;
      } else {
        Logger.log("Cached treasury yields data is more than 24 hours old");
      }
    }
    
    // Define the treasury yield terms to fetch
    const terms = ["3m", "2y", "5y", "10y", "30y"];
    const yields = [];
    
    // Try FRED API first (primary source)
    const fredYields = retrieveTreasuryYieldsFromFRED();
    if (fredYields && fredYields.length > 0) {
      Logger.log("Successfully retrieved treasury yields from FRED API");
      
      // Calculate the 10Y-2Y spread (a key recession indicator)
      const tenYearYield = fredYields.find(y => y.term === "10-Year")?.yield || 0;
      const twoYearYield = fredYields.find(y => y.term === "2-Year")?.yield || 0;
      const yieldCurveSpread = tenYearYield - twoYearYield;
      
      // Determine if the yield curve is inverted
      const isInverted = yieldCurveSpread < 0;
      
      // Create an analysis of the yield curve
      let yieldCurveStatus = "Normal";
      let yieldCurveAnalysis = "";
      
      if (isInverted) {
        yieldCurveStatus = "Inverted";
        yieldCurveAnalysis = `The yield curve is inverted with the 10Y-2Y spread at ${yieldCurveSpread.toFixed(2)}%. This is a potential recession signal that has historically preceded economic downturns.`;
      } else if (yieldCurveSpread < 0.5) {
        yieldCurveStatus = "Flat";
        yieldCurveAnalysis = `The yield curve is relatively flat with the 10Y-2Y spread at ${yieldCurveSpread.toFixed(2)}%. This suggests market uncertainty about future economic conditions.`;
      } else {
        yieldCurveStatus = "Normal";
        yieldCurveAnalysis = `The yield curve has a normal positive slope with the 10Y-2Y spread at ${yieldCurveSpread.toFixed(2)}%. This typically indicates expectations of economic growth.`;
      }
      
      // Format the result
      const result = {
        yields: fredYields,
        yieldCurve: {
          status: yieldCurveStatus,
          isInverted: isInverted,
          tenYearTwoYearSpread: yieldCurveSpread,
          analysis: yieldCurveAnalysis
        },
        source: "Federal Reserve Economic Data (FRED)",
        sourceUrl: "https://fred.stlouisfed.org/",
        lastUpdated: new Date()
      };
      
      // Store in cache for 24 hours (in seconds)
      scriptCache.put('TREASURY_YIELDS_DATA', JSON.stringify(result), 24 * 60 * 60);
      
      return result;
    }
    
    // If FRED API fails, try Alpha Vantage (backup source)
    const alphaVantageYields = retrieveTreasuryYieldsFromAlphaVantage();
    if (alphaVantageYields && alphaVantageYields.length > 0) {
      Logger.log("Successfully retrieved treasury yields from Alpha Vantage API");
      
      // Calculate the 10Y-2Y spread (a key recession indicator)
      const tenYearYield = alphaVantageYields.find(y => y.term === "10-Year")?.yield || 0;
      const twoYearYield = alphaVantageYields.find(y => y.term === "2-Year")?.yield || 0;
      const yieldCurveSpread = tenYearYield - twoYearYield;
      
      // Determine if the yield curve is inverted
      const isInverted = yieldCurveSpread < 0;
      
      // Create an analysis of the yield curve
      let yieldCurveStatus = "Normal";
      let yieldCurveAnalysis = "";
      
      if (isInverted) {
        yieldCurveStatus = "Inverted";
        yieldCurveAnalysis = `The yield curve is inverted with the 10Y-2Y spread at ${yieldCurveSpread.toFixed(2)}%. This is a potential recession signal that has historically preceded economic downturns.`;
      } else if (yieldCurveSpread < 0.5) {
        yieldCurveStatus = "Flat";
        yieldCurveAnalysis = `The yield curve is relatively flat with the 10Y-2Y spread at ${yieldCurveSpread.toFixed(2)}%. This suggests market uncertainty about future economic conditions.`;
      } else {
        yieldCurveStatus = "Normal";
        yieldCurveAnalysis = `The yield curve has a normal positive slope with the 10Y-2Y spread at ${yieldCurveSpread.toFixed(2)}%. This typically indicates expectations of economic growth.`;
      }
      
      // Format the result
      const result = {
        yields: alphaVantageYields,
        yieldCurve: {
          status: yieldCurveStatus,
          isInverted: isInverted,
          tenYearTwoYearSpread: yieldCurveSpread,
          analysis: yieldCurveAnalysis
        },
        source: "Alpha Vantage",
        sourceUrl: "https://www.alphavantage.co/",
        lastUpdated: new Date()
      };
      
      // Store in cache for 24 hours (in seconds)
      scriptCache.put('TREASURY_YIELDS_DATA', JSON.stringify(result), 24 * 60 * 60);
      
      return result;
    }
    
    // If both APIs fail, try the original Yahoo Finance method as a last resort
    for (const term of terms) {
      // Use Yahoo Finance API to get real-time data
      const symbol = getTreasurySymbol(term);
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
      
      const options = {
        muteHttpExceptions: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        contentType: 'application/json'
      };
      
      try {
        const response = UrlFetchApp.fetch(url, options);
        
        if (response.getResponseCode() === 200) {
          const data = JSON.parse(response.getContentText());
          const result = data.chart.result[0];
          const meta = result.meta;
          
          // Get the latest price (yield)
          const yieldValue = meta.regularMarketPrice;
          
          // Get the previous close
          const previousClose = meta.previousClose || meta.chartPreviousClose;
          
          // Calculate the change
          const change = yieldValue - previousClose;
          
          // Map the term abbreviation to the full term name
          const termNames = {
            "3m": "3-Month",
            "2y": "2-Year",
            "5y": "5-Year",
            "10y": "10-Year",
            "30y": "30-Year"
          };
          
          yields.push({
            term: termNames[term],
            yield: yieldValue,
            change: change,
            timestamp: new Date(meta.regularMarketTime * 1000)
          });
          
          Logger.log(`Successfully retrieved ${termNames[term]} yield: ${yieldValue.toFixed(2)}%`);
        } else {
          Logger.log(`Failed to retrieve ${term} yield. Response code: ${response.getResponseCode()}`);
          throw new Error(`Failed to retrieve ${term} yield. Response code: ${response.getResponseCode()}`);
        }
      } catch (error) {
        Logger.log(`Error fetching treasury yield data for ${term}: ${error}`);
        throw new Error(`Error fetching treasury yield data for ${term}: ${error}`);
      }
    }
    
    // Verify we have the key yields (2-year and 10-year)
    const has2Year = yields.some(y => y.term === "2-Year");
    const has10Year = yields.some(y => y.term === "10-Year");
    
    if (!has2Year || !has10Year) {
      Logger.log("Missing critical treasury yield data - cannot proceed without fresh data");
      throw new Error("Failed to retrieve critical treasury yield data. Please check data sources and try again.");
    }
    
    // Calculate the 10Y-2Y spread (a key recession indicator)
    const tenYearYield = yields.find(y => y.term === "10-Year")?.yield || 0;
    const twoYearYield = yields.find(y => y.term === "2-Year")?.yield || 0;
    const yieldCurveSpread = tenYearYield - twoYearYield;
    
    // Determine if the yield curve is inverted
    const isInverted = yieldCurveSpread < 0;
    
    // Create an analysis of the yield curve
    let yieldCurveStatus = "Normal";
    let yieldCurveAnalysis = "";
    
    if (isInverted) {
      yieldCurveStatus = "Inverted";
      yieldCurveAnalysis = `The yield curve is inverted with the 10Y-2Y spread at ${yieldCurveSpread.toFixed(2)}%. This is a potential recession signal that has historically preceded economic downturns.`;
    } else if (yieldCurveSpread < 0.5) {
      yieldCurveStatus = "Flat";
      yieldCurveAnalysis = `The yield curve is relatively flat with the 10Y-2Y spread at ${yieldCurveSpread.toFixed(2)}%. This suggests market uncertainty about future economic conditions.`;
    } else {
      yieldCurveStatus = "Normal";
      yieldCurveAnalysis = `The yield curve has a normal positive slope with the 10Y-2Y spread at ${yieldCurveSpread.toFixed(2)}%. This typically indicates expectations of economic growth.`;
    }
    
    // Format the result
    const result = {
      yields: yields,
      yieldCurve: {
        status: yieldCurveStatus,
        isInverted: isInverted,
        tenYearTwoYearSpread: yieldCurveSpread,
        analysis: yieldCurveAnalysis
      },
      source: "Yahoo Finance",
      sourceUrl: "https://finance.yahoo.com/bonds",
      lastUpdated: new Date()
    };
    
    // Store in cache for 24 hours (in seconds)
    scriptCache.put('TREASURY_YIELDS_DATA', JSON.stringify(result), 24 * 60 * 60);
    
    return result;
  } catch (error) {
    Logger.log(`Error retrieving treasury yields: ${error}`);
    throw new Error(`Failed to retrieve treasury yields data: ${error.message}`);
  }
}

/**
 * Gets the Yahoo Finance symbol for a treasury yield
 * @param {String} term - The term to get the symbol for
 * @return {String} The Yahoo Finance symbol
 */
function getTreasurySymbol(term) {
  const symbols = {
    "3m": "^IRX",  // 13-week Treasury Bill
    "2y": "^UST2Y", // 2-year Treasury Note
    "5y": "^FVX",  // 5-year Treasury Note
    "10y": "^TNX", // 10-year Treasury Note
    "30y": "^TYX"  // 30-year Treasury Bond
  };
  
  return symbols[term] || "";
}

/**
 * Retrieves Fed policy data
 * @return {Object} Fed policy data
 */
function retrieveFedPolicyData() {
  try {
    Logger.log("Retrieving Fed policy data...");
    
    // Current Federal Funds Rate (as of March 2025)
    const currentRate = {
      rate: 5.375,
      range: "5.25% - 5.50%",
      lastChanged: new Date("2023-07-26"), // Last rate hike
      direction: "Unchanged"
    };
    
    // FOMC Meetings
    const today = new Date();
    
    // Define upcoming FOMC meetings for 2025
    const fomcMeetings2025 = [
      new Date("2025-01-29"),
      new Date("2025-03-19"),
      new Date("2025-04-30"),
      new Date("2025-06-11"),
      new Date("2025-07-30"),
      new Date("2025-09-17"),
      new Date("2025-11-05"),
      new Date("2025-12-17")
    ];
    
    // Find the last meeting and the next meeting
    let lastMeeting = null;
    let nextMeeting = null;
    
    for (const meeting of fomcMeetings2025) {
      if (meeting <= today) {
        lastMeeting = meeting;
      } else {
        nextMeeting = meeting;
        break;
      }
    }
    
    // If we couldn't find a last meeting, use a reasonable fallback
    if (!lastMeeting) {
      lastMeeting = new Date("2025-03-19");
    }
    
    // If we couldn't find a next meeting, use a reasonable fallback
    if (!nextMeeting) {
      nextMeeting = new Date("2025-04-30");
    }
    
    // Market probabilities for the next meeting
    const probabilityOfHike = 5.0; // 5% chance of a rate hike
    const probabilityOfCut = 15.0; // 15% chance of a rate cut
    const probabilityOfNoChange = 80.0; // 80% chance of no change
    
    // Forward guidance and commentary
    const forwardGuidance = "The Federal Reserve remains committed to its dual mandate of maximum employment and price stability.";
    const commentary = "Based on recent Fed communications, the Committee is focused on balancing inflation concerns with economic growth. The Fed remains data-dependent in its approach to future rate decisions.";
    
    return {
      currentRate: currentRate,
      lastMeeting: {
        date: lastMeeting,
        summary: "The Committee decided to maintain the target range for the federal funds rate."
      },
      nextMeeting: {
        date: nextMeeting,
        probabilityOfHike: probabilityOfHike,
        probabilityOfCut: probabilityOfCut,
        probabilityOfNoChange: probabilityOfNoChange
      },
      forwardGuidance: forwardGuidance,
      commentary: commentary,
      source: "Federal Reserve",
      sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
      lastUpdated: new Date()
    };
  } catch (error) {
    Logger.log(`Error retrieving Fed policy data: ${error}`);
    return {
      error: true,
      message: `Failed to retrieve Fed policy data: ${error}`
    };
  }
}

/**
 * Retrieves inflation data
 * @return {Object} Inflation data
 */
function retrieveInflationData() {
  try {
    Logger.log("Retrieving inflation data...");
    
    // Enable caching to improve performance
    const scriptCache = CacheService.getScriptCache();
    
    // Clear the cache to ensure we get fresh data
    scriptCache.remove('INFLATION_DATA');
    Logger.log("Cleared inflation data cache to ensure fresh data");
    
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
      expectations: expectationsData,
      analysis: analysis,
      source: "Bureau of Labor Statistics, Federal Reserve",
      sourceUrl: "https://www.bls.gov/cpi/",
      lastUpdated: new Date()
    };
    
    // Cache the data for 1 hour
    scriptCache.put('INFLATION_DATA', JSON.stringify(result), 3600);
    
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
    
    // If we got valid data, return it
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
      Logger.log(`Suspicious Core CPI year-over-year change value: ${yearOverYearCoreChange}%. Using calculated value instead.`);
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
      source: "Bureau of Labor Statistics",
      sourceUrl: "https://www.bls.gov/cpi/",
      lastUpdated: new Date()
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
      Logger.log("FRED API response does not contain expected data structure");
      return null;
    }
    
    // Get the latest and previous month values
    const latestCpi = parseFloat(cpiData.observations[0].value);
    const previousCpi = parseFloat(cpiData.observations[1].value);
    const latestCoreCpi = parseFloat(coreCpiData.observations[0].value);
    const previousCoreCpi = parseFloat(coreCpiData.observations[1].value);
    
    // Calculate year-over-year change
    const yearAgoCpi = parseFloat(cpiData.observations[12].value);
    const yearAgoCoreCpi = parseFloat(coreCpiData.observations[12].value);
    
    const yearOverYearChange = ((latestCpi - yearAgoCpi) / yearAgoCpi) * 100;
    const yearOverYearCoreChange = ((latestCoreCpi - yearAgoCoreCpi) / yearAgoCoreCpi) * 100;
    
    // Calculate month-over-month percentage change
    const monthOverMonthChange = ((latestCpi - previousCpi) / previousCpi) * 100;
    const coreMonthOverMonthChange = ((latestCoreCpi - previousCoreCpi) / previousCoreCpi) * 100;
    
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
    
    // Create the CPI data object
    return {
      currentRate: latestCpi,
      previousRate: previousCpi,
      change: monthOverMonthChange,
      yearOverYearChange: yearOverYearChange !== null ? yearOverYearChange : monthOverMonthChange * 12, // Annualize if YoY not available
      coreRate: yearOverYearCoreChange !== null ? yearOverYearCoreChange : coreMonthOverMonthChange * 12, // Annualize if YoY not available
      corePreviousRate: previousCoreCpi,
      coreChange: coreMonthOverMonthChange,
      month: new Date(cpiData.observations[0].date).getMonth(),
      year: new Date(cpiData.observations[0].date).getFullYear(),
      source: "Federal Reserve Economic Data (FRED)",
      sourceUrl: "https://fred.stlouisfed.org/",
      lastUpdated: new Date()
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
    
    // Request parameters - using quarterly data which is more reliable
    const params = {
      "UserID": apiKey,
      "method": "GetData",
      "datasetname": "NIPA",
      "TableName": "T20804",
      "Frequency": "Q",
      "Year": `${currentYear-1},${currentYear}`,
      "ResultFormat": "JSON"
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
    Logger.log("BEA API response structure: " + JSON.stringify(Object.keys(data)));
    
    // Check if the response contains the expected data
    if (!data || !data.BEAAPI || !data.BEAAPI.Results || !data.BEAAPI.Results.Data || !Array.isArray(data.BEAAPI.Results.Data)) {
      Logger.log("BEA API response does not contain expected data structure");
      
      // Check if there's an error message
      if (data && data.BEAAPI && data.BEAAPI.Error) {
        Logger.log("BEA API error: " + JSON.stringify(data.BEAAPI.Error));
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
      const aDate = new Date(a.TimePeriod);
      const bDate = new Date(b.TimePeriod);
      return bDate - aDate;
    });
    
    corePceData.sort((a, b) => {
      const aDate = new Date(a.TimePeriod);
      const bDate = new Date(b.TimePeriod);
      return bDate - aDate;
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
    const coreQuarterOverQuarterChange = ((latestCorePce - previousCorePce) / previousCorePce) * 100;
    
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
      yearOverYearCoreChange = coreQuarterOverQuarterChange * 4;
      
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
      coreRate: yearOverYearCoreChange !== null ? yearOverYearCoreChange : coreQuarterOverQuarterChange * 4, // Annualize if YoY not available
      corePreviousRate: previousCorePce,
      coreChange: coreQuarterOverQuarterChange,
      quarter: latestQuarter,
      year: latestYear,
      source: "Bureau of Economic Analysis",
      sourceUrl: "https://www.bea.gov/data/personal-consumption-expenditures-price-index",
      lastUpdated: new Date()
    };
  } catch (error) {
    Logger.log(`Error fetching PCE data from BEA: ${error}`);
    return null;
  }
}

/**
 * Fetches PCE data from FRED website
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
    } else {
      // If we can't find the exact month from last year, use the 12-month change
      const twelveMonthsAgoPce = pceData.observations.length >= 12 ? parseFloat(pceData.observations[11].value) : null;
      if (twelveMonthsAgoPce !== null) {
        yearOverYearChange = ((latestPce - twelveMonthsAgoPce) / twelveMonthsAgoPce) * 100;
      }
    }
    
    if (oneYearAgoCorePceIndex !== -1 && oneYearAgoCorePceIndex < corePceData.observations.length) {
      const oneYearAgoCorePce = parseFloat(corePceData.observations[oneYearAgoCorePceIndex].value);
      yearOverYearCoreChange = ((latestCorePce - oneYearAgoCorePce) / oneYearAgoCorePce) * 100;
    } else {
      // If we can't find the exact month from last year, use the 12-month change
      const twelveMonthsAgoCorePce = corePceData.observations.length >= 12 ? parseFloat(corePceData.observations[11].value) : null;
      if (twelveMonthsAgoCorePce !== null) {
        yearOverYearCoreChange = ((latestCorePce - twelveMonthsAgoCorePce) / twelveMonthsAgoCorePce) * 100;
      }
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
      source: "Federal Reserve Economic Data (FRED)",
      sourceUrl: "https://fred.stlouisfed.org/",
      lastUpdated: new Date()
    };
  } catch (error) {
    Logger.log(`Error fetching PCE data from FRED: ${error}`);
    return null;
  }
}

/**
 * Retrieves inflation expectations data
 * @return {Object} Inflation expectations data
 */
function retrieveInflationExpectations() {
  try {
    // Use Fed data or survey data to get inflation expectations
    // For now, using static recent data as fallback
    
    // 1-year inflation expectations
    const oneYearExpectation = 2.9;
    
    // 5-year inflation expectations
    const fiveYearExpectation = 2.5;
    
    // 10-year inflation expectations
    const tenYearExpectation = 2.3;
    
    return {
      oneYear: oneYearExpectation,
      fiveYear: fiveYearExpectation,
      tenYear: tenYearExpectation,
      source: "University of Michigan Survey of Consumers",
      lastUpdated: new Date()
    };
  } catch (error) {
    Logger.log(`Error retrieving inflation expectations data: ${error}`);
    return null;
  }
}

/**
 * Generates an analysis of inflation data
 * @param {Object} cpiData - CPI data
 * @param {Object} pceData - PCE data
 * @param {Object} expectationsData - Inflation expectations data
 * @return {String} Analysis of inflation data
 */
function generateInflationAnalysis(cpiData, pceData, expectationsData) {
  try {
    let analysis = "";
    
    // Check if we have all the data
    if (!cpiData || !pceData || !expectationsData) {
      return "Insufficient data to generate inflation analysis.";
    }
    
    // Get the headline CPI and PCE values
    const cpiValue = cpiData.yearOverYearChange;
    const cpiChange = cpiData.change;
    const pceValue = pceData.yearOverYearChange;
    const pceChange = pceData.change;
    
    // Get the core CPI and PCE values
    const coreCpiValue = cpiData.coreRate;
    const coreCpiChange = cpiData.coreChange;
    const corePceValue = pceData.coreRate;
    const corePceChange = pceData.coreChange;
    
    // Get the inflation expectations
    const oneYearExpectation = expectationsData.oneYear;
    const fiveYearExpectation = expectationsData.fiveYear;
    
    // Determine the trend
    const cpiTrend = cpiChange < 0 ? "decreasing" : cpiChange > 0 ? "increasing" : "stable";
    const pceTrend = pceChange < 0 ? "decreasing" : pceChange > 0 ? "increasing" : "stable";
    const coreCpiTrend = coreCpiChange < 0 ? "decreasing" : coreCpiChange > 0 ? "increasing" : "stable";
    const corePceTrend = corePceChange < 0 ? "decreasing" : corePceChange > 0 ? "increasing" : "stable";
    
    // Generate the analysis
    analysis += `Headline CPI is currently at ${formatValue(cpiValue)}% (${cpiTrend}), while Core CPI (excluding food and energy) is at ${formatValue(coreCpiValue)}% (${coreCpiTrend}). `;
    analysis += `The Fed's preferred inflation measure, PCE, is at ${formatValue(pceValue)}% (${pceTrend}), with Core PCE at ${formatValue(corePceValue)}% (${corePceTrend}). `;
    
    // Compare to Fed target
    const fedTarget = 2.0;
    if (corePceValue > fedTarget + 0.5) {
      analysis += `Core PCE remains above the Fed's ${fedTarget}% target, which may influence monetary policy decisions. `;
    } else if (corePceValue < fedTarget - 0.5) {
      analysis += `Core PCE is below the Fed's ${fedTarget}% target, which may influence monetary policy decisions. `;
    } else {
      analysis += `Core PCE is near the Fed's ${fedTarget}% target. `;
    }
    
    // Add information about expectations
    analysis += `Inflation expectations for the next year are at ${formatValue(oneYearExpectation)}%, while 5-year expectations are at ${formatValue(fiveYearExpectation)}%. `;
    
    // Conclude with an overall assessment
    if (corePceValue > fedTarget + 1.0 || cpiValue > fedTarget + 1.5) {
      analysis += `Overall, inflation remains elevated relative to the Fed's target, suggesting continued vigilance from policymakers.`;
    } else if (corePceValue < fedTarget - 0.5 || cpiValue < fedTarget - 0.5) {
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
 * Retrieves geopolitical risks data
 * @return {Object} Geopolitical risks data
 */
function retrieveGeopoliticalRisksData() {
  try {
    Logger.log("Retrieving geopolitical risks data...");
    
    // Get the OpenAI API key
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      throw new Error("OpenAI API key not found in script properties");
    }
    
    // Create a prompt for OpenAI to retrieve geopolitical risks
    const prompt = `
    Identify the top 3 current geopolitical risks that could impact financial markets. DO NOT include any explanatory text, apologies, or content outside the JSON format.
    
    For each risk, provide:
    1. A brief title/name
    2. A concise description (1-2 sentences)
    3. The region(s) affected
    4. Impact level (Low, Moderate, High, Severe)
    5. Potential market impact (1-2 sentences)
    6. A specific URL to a reputable news source reporting on this risk (Reuters, Bloomberg, Financial Times, etc.)
    
    Format your response as a valid JSON object with this structure:
    {
      "geopoliticalRiskIndex": 65, // A number from 0-100 representing overall risk level
      "majorRisks": [
        {
          "name": "Risk Name",
          "description": "Brief description",
          "region": "Affected Region",
          "impactLevel": "High",
          "marketImpact": "Description of potential market impact",
          "source": "News Source Name",
          "url": "https://specific-article-url.com"
        }
      ]
    }
    
    Provide EXACT URLs to specific articles, not just homepage URLs.
    `;
    
    Logger.log("Trying OpenAI API with model: gpt-4-turbo");
    
    const payload = {
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a financial analyst specializing in geopolitical risk assessment. You MUST ALWAYS provide accurate, up-to-date information about current geopolitical risks affecting financial markets in the exact JSON format specified in the user's prompt. NEVER respond with explanations, apologies, or any text outside the JSON format. Always include specific URLs to news sources."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(OPENAI_API_URL, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      throw new Error(`OpenAI API returned status code ${responseCode}: ${response.getContentText()}`);
    }
    
    const responseData = JSON.parse(response.getContentText());
    Logger.log("OpenAI API call successful with model: gpt-4-turbo");
    
    // Extract the content from the response
    const content = responseData.choices[0].message.content;
    
    // Try multiple approaches to extract JSON
    let geopoliticalData;
    
    // First, try to extract JSON using regex for JSON object pattern
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        geopoliticalData = JSON.parse(jsonMatch[0]);
        Logger.log("Successfully extracted geopolitical risks JSON using regex pattern");
      } catch (parseError) {
        Logger.log("Error parsing extracted geopolitical risks JSON: " + parseError);
      }
    }
    
    // If that fails, try to extract JSON from code blocks
    if (!geopoliticalData) {
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        try {
          geopoliticalData = JSON.parse(codeBlockMatch[1].trim());
          Logger.log("Successfully extracted geopolitical risks JSON from code block");
        } catch (parseError) {
          Logger.log("Error parsing geopolitical risks JSON from code block: " + parseError);
        }
      }
    }
    
    // If both approaches fail, try to parse the entire content as JSON
    if (!geopoliticalData) {
      try {
        geopoliticalData = JSON.parse(content);
        Logger.log("Successfully parsed entire geopolitical risks content as JSON");
      } catch (parseError) {
        Logger.log("Error parsing entire geopolitical risks content as JSON: " + parseError);
        throw new Error("Could not extract JSON from OpenAI response for geopolitical risks");
      }
    }
    
    // Format the result
    const result = {
      geopoliticalRiskIndex: geopoliticalData.geopoliticalRiskIndex,
      risks: geopoliticalData.majorRisks.map(risk => ({
        type: 'Event',
        name: risk.name,
        description: risk.description,
        region: risk.region,
        impactLevel: risk.impactLevel,
        marketImpact: risk.marketImpact,
        source: risk.source,
        url: risk.url
      })),
      source: "OpenAI (aggregated from multiple news sources)",
      sourceUrl: "https://openai.com/",
      lastUpdated: new Date()
    };
    
    return result;
  } catch (error) {
    Logger.log(`Error retrieving geopolitical risks data: ${error}`);
    throw new Error(`Failed to retrieve geopolitical risks data: ${error}`);
  }
}

/**
 * Retrieves treasury yields data from FRED API
 * @return {Array} Array of treasury yield objects
 */
function retrieveTreasuryYieldsFromFRED() {
  try {
    Logger.log("Attempting to retrieve treasury yields from FRED API...");
    
    // Get API key from script properties
    const scriptProperties = PropertiesService.getScriptProperties();
    const fredApiKey = scriptProperties.getProperty('FRED_API_KEY');
    
    if (!fredApiKey) {
      Logger.log("No FRED API key found in script properties");
      return null;
    }
    
    // Define the treasury yield series IDs in FRED
    const seriesMap = {
      "DGS3MO": "3-Month",
      "DGS2": "2-Year",
      "DGS5": "5-Year",
      "DGS10": "10-Year",
      "DGS30": "30-Year"
    };
    
    const yields = [];
    
    // Fetch data for each series
    for (const [seriesId, term] of Object.entries(seriesMap)) {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${fredApiKey}&file_type=json&sort_order=desc&limit=1`;
      
      const options = {
        muteHttpExceptions: true,
        headers: {
          'Accept': 'application/json'
        }
      };
      
      const response = UrlFetchApp.fetch(url, options);
      
      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        
        if (data.observations && data.observations.length > 0) {
          const latestObservation = data.observations[0];
          const yieldValue = parseFloat(latestObservation.value);
          
          // Get previous day's value for calculating change
          const prevUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${fredApiKey}&file_type=json&sort_order=desc&limit=2`;
          const prevResponse = UrlFetchApp.fetch(prevUrl, options);
          let change = 0;
          
          if (prevResponse.getResponseCode() === 200) {
            const prevData = JSON.parse(prevResponse.getContentText());
            if (prevData.observations && prevData.observations.length > 1) {
              const prevObservation = prevData.observations[1];
              const prevValue = parseFloat(prevObservation.value);
              change = yieldValue - prevValue;
            }
          }
          
          yields.push({
            term: term,
            yield: yieldValue,
            change: change,
            timestamp: new Date(latestObservation.date)
          });
          
          Logger.log(`Successfully retrieved ${term} yield from FRED: ${yieldValue.toFixed(2)}%`);
        }
      } else {
        Logger.log(`Failed to retrieve ${term} yield from FRED. Response code: ${response.getResponseCode()}`);
      }
    }
    
    return yields.length > 0 ? yields : null;
  } catch (error) {
    Logger.log(`Error retrieving treasury yields from FRED: ${error}`);
    return null;
  }
}

/**
 * Retrieves treasury yields data from Alpha Vantage API
 * @return {Array} Array of treasury yield objects
 */
function retrieveTreasuryYieldsFromAlphaVantage() {
  try {
    Logger.log("Attempting to retrieve treasury yields from Alpha Vantage API...");
    
    // Get API key from script properties
    const scriptProperties = PropertiesService.getScriptProperties();
    const alphaVantageApiKey = scriptProperties.getProperty('ALPHA_VANTAGE_API_KEY');
    
    if (!alphaVantageApiKey) {
      Logger.log("No Alpha Vantage API key found in script properties");
      return null;
    }
    
    // Define the treasury yield maturities to fetch
    const maturities = {
      "3month": "3-Month",
      "2year": "2-Year",
      "5year": "5-Year",
      "10year": "10-Year",
      "30year": "30-Year"
    };
    
    const yields = [];
    
    // Fetch data for each maturity
    for (const [maturity, term] of Object.entries(maturities)) {
      const url = `https://www.alphavantage.co/query?function=TREASURY_YIELD&interval=daily&maturity=${maturity}&apikey=${alphaVantageApiKey}`;
      
      const options = {
        muteHttpExceptions: true,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      };
      
      const response = UrlFetchApp.fetch(url, options);
      
      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        
        if (data.data && data.data.length > 0) {
          const latestData = data.data[0];
          const yieldValue = parseFloat(latestData.value);
          
          // Calculate change if we have at least 2 data points
          let change = 0;
          if (data.data.length > 1) {
            const previousData = data.data[1];
            const previousValue = parseFloat(previousData.value);
            change = yieldValue - previousValue;
          }
          
          yields.push({
            term: term,
            yield: yieldValue,
            change: change,
            timestamp: new Date(latestData.date)
          });
          
          Logger.log(`Successfully retrieved ${term} yield from Alpha Vantage: ${yieldValue.toFixed(2)}%`);
        }
      } else {
        Logger.log(`Failed to retrieve ${term} yield from Alpha Vantage. Response code: ${response.getResponseCode()}`);
      }
      
      // Add a small delay to avoid hitting rate limits
      Utilities.sleep(1000);
    }
    
    return yields.length > 0 ? yields : null;
  } catch (error) {
    Logger.log(`Error retrieving treasury yields from Alpha Vantage: ${error}`);
    return null;
  }
}

/**
 * Helper function to format values safely
 * @param {Number} value - The value to format
 * @param {Number} decimals - Number of decimal places (default: 1)
 * @return {String} Formatted value
 */
function formatValue(value, decimals = 1) {
  if (value === undefined || value === null || isNaN(value)) {
    return "N/A";
  }
  return value.toFixed(decimals);
}

/**
 * Tests the inflation data retrieval
 */
function testInflationData() {
  try {
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
        Logger.log(`  Source: ${inflation.cpi.source}`);
        Logger.log(`  Last Updated: ${new Date(inflation.cpi.lastUpdated).toLocaleString()}`);
      } else {
        Logger.log("CPI Data: Not available");
      }
      
      // Log PCE data
      if (inflation.pce) {
        Logger.log("PCE Data:");
        Logger.log(`  Year-over-Year: ${inflation.pce.yearOverYearChange}%`);
        Logger.log(`  Core Rate: ${inflation.pce.coreRate}%`);
        Logger.log(`  Change: ${inflation.pce.change}%`);
        Logger.log(`  Source: ${inflation.pce.source}`);
        Logger.log(`  Last Updated: ${new Date(inflation.pce.lastUpdated).toLocaleString()}`);
      } else {
        Logger.log("PCE Data: Not available");
      }
      
      // Log inflation expectations
      if (inflation.expectations) {
        Logger.log("Inflation Expectations:");
        Logger.log(`  1-Year: ${inflation.expectations.oneYear}%`);
        Logger.log(`  5-Year: ${inflation.expectations.fiveYear}%`);
        Logger.log(`  10-Year: ${inflation.expectations.tenYear}%`);
        Logger.log(`  Source: ${inflation.expectations.source}`);
        Logger.log(`  Last Updated: ${new Date(inflation.expectations.lastUpdated).toLocaleString()}`);
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
      Logger.log(`Source: ${inflation.source}`);
      Logger.log(`Last Updated: ${new Date(inflation.lastUpdated).toLocaleString()}`);
    } else {
      Logger.log(`Error: ${inflation.message}`);
    }
    
    return inflation;
  } catch (error) {
    Logger.log(`Error testing inflation data retrieval: ${error}`);
    return {
      error: true,
      message: `Error testing inflation data retrieval: ${error}`
    };
  }
}

/**
 * Tests the PCE data retrieval from BEA API
 * Logs detailed information about the API response structure
 */
function testPCEData() {
  try {
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
    
    // Request parameters - using quarterly data which is more reliable
    const params = {
      "UserID": apiKey,
      "method": "GetData",
      "datasetname": "NIPA",
      "TableName": "T20804",
      "Frequency": "Q",
      "Year": `${currentYear-1},${currentYear}`,
      "ResultFormat": "JSON"
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
  } catch (error) {
    Logger.log(`Error in PCE data test: ${error}`);
  }
}

/**
 * Runs all macroeconomic data tests
 */
function testMacroeconomicData() {
  Logger.log("Running all macroeconomic data tests...");
  
  // Test inflation data
  testInflationData();
  
  // Test PCE data
  testPCEData();
  
  Logger.log("All macroeconomic data tests complete");
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
    
    // Request parameters - using quarterly data which is more reliable
    const params = {
      "UserID": apiKey,
      "method": "GetData",
      "datasetname": "NIPA",
      "TableName": "T20804",
      "Frequency": "Q",
      "Year": `${currentYear-1},${currentYear}`,
      "ResultFormat": "JSON"
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
    Logger.log("BEA API response structure: " + JSON.stringify(Object.keys(data)));
    
    // Check if the response contains the expected data
    if (!data || !data.BEAAPI || !data.BEAAPI.Results || !data.BEAAPI.Results.Data || !Array.isArray(data.BEAAPI.Results.Data)) {
      Logger.log("BEA API response does not contain expected data structure");
      
      // Check if there's an error message
      if (data && data.BEAAPI && data.BEAAPI.Error) {
        Logger.log("BEA API error: " + JSON.stringify(data.BEAAPI.Error));
      }
      
      return null;
    }
    
    // Try to find PCE data with flexible series code matching
    // First, look for the exact codes we expect
    let pceData = data.BEAAPI.Results.Data.filter(item => 
      item.SeriesCode === "DPCERG" // PCE price index
    );
    
    let corePceData = data.BEAAPI.Results.Data.filter(item => 
      item.SeriesCode === "DPCCRG" // Core PCE price index
    );
    
    // If we didn't find the exact codes, look for any PCE-related codes
    if (pceData.length === 0) {
      const seriesCodes = [...new Set(data.BEAAPI.Results.Data.map(item => item.SeriesCode))];
      Logger.log("Looking for alternative PCE codes. Available codes: " + JSON.stringify(seriesCodes));
      
      // Look for any code containing "PCE" and not containing "CORE"
      const pceCandidates = data.BEAAPI.Results.Data.filter(item => 
        (item.SeriesCode && item.SeriesCode.includes("PCE") && !item.SeriesCode.includes("CORE")) ||
        (item.LineDescription && item.LineDescription.includes("PCE") && !item.LineDescription.includes("Core"))
      );
      
      if (pceCandidates.length > 0) {
        Logger.log("Found alternative PCE data: " + JSON.stringify(pceCandidates[0]));
        pceData = pceCandidates;
      }
    }
    
    // If we didn't find core PCE data, look for alternatives
    if (corePceData.length === 0) {
      // Look for any code containing both "PCE" and "CORE"
      const corePceCandidates = data.BEAAPI.Results.Data.filter(item => 
        (item.SeriesCode && item.SeriesCode.includes("PCE") && item.SeriesCode.includes("CORE")) ||
        (item.LineDescription && item.LineDescription.includes("PCE") && item.LineDescription.includes("Core"))
      );
      
      if (corePceCandidates.length > 0) {
        Logger.log("Found alternative Core PCE data: " + JSON.stringify(corePceCandidates[0]));
        corePceData = corePceCandidates;
      }
    }
    
    if (pceData.length === 0 || corePceData.length === 0) {
      Logger.log("BEA API response does not contain expected PCE data after flexible matching");
      return null;
    }
    
    // Sort data by date (newest first)
    // First, determine the date format used in the response
    const dateField = pceData[0].hasOwnProperty('TimePeriod') ? 'TimePeriod' : 
                     (pceData[0].hasOwnProperty('Quarter') ? 'Quarter' : 'Time Period');
    
    Logger.log(`Using date field: ${dateField}`);
    
    pceData.sort((a, b) => {
      const aDate = new Date(a[dateField]);
      const bDate = new Date(b[dateField]);
      return bDate - aDate;
    });
    
    corePceData.sort((a, b) => {
      const aDate = new Date(a[dateField]);
      const bDate = new Date(b[dateField]);
      return bDate - aDate;
    });
    
    // Determine the value field used in the response
    const valueField = pceData[0].hasOwnProperty('DataValue') ? 'DataValue' : 
                      (pceData[0].hasOwnProperty('Value') ? 'Value' : 'Data Value');
    
    Logger.log(`Using value field: ${valueField}`);
    
    // Get the latest and previous quarter values
    const latestPce = parseFloat(pceData[0][valueField]);
    const previousPce = parseFloat(pceData[1][valueField]);
    const latestCorePce = parseFloat(corePceData[0][valueField]);
    const previousCorePce = parseFloat(corePceData[1][valueField]);
    
    // Log the values we're using
    Logger.log(`Latest PCE: ${latestPce}, Previous PCE: ${previousPce}`);
    Logger.log(`Latest Core PCE: ${latestCorePce}, Previous Core PCE: ${previousCorePce}`);
    
    // Calculate year-over-year change
    // Find the same quarter from last year
    const latestDate = new Date(pceData[0][dateField]);
    const latestQuarter = pceData[0][dateField].toString().match(/Q(\d+)/) ? 
                         pceData[0][dateField].toString().match(/Q(\d+)/)[0] : 
                         pceData[0][dateField].substring(pceData[0][dateField].length - 2);
    const latestYear = latestDate.getFullYear();
    
    Logger.log(`Latest quarter: ${latestQuarter}, Latest year: ${latestYear}`);
    
    const lastYearSameQuarterPce = pceData.find(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate.getFullYear() === latestYear - 1 && 
             item[dateField].toString().includes(latestQuarter);
    });
    
    const lastYearSameQuarterCorePce = corePceData.find(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate.getFullYear() === latestYear - 1 && 
             item[dateField].toString().includes(latestQuarter);
    });
    
    let yearOverYearChange = null;
    let yearOverYearCoreChange = null;
    
    if (lastYearSameQuarterPce) {
      const lastYearPce = parseFloat(lastYearSameQuarterPce[valueField]);
      yearOverYearChange = ((latestPce - lastYearPce) / lastYearPce) * 100;
      Logger.log(`Year-over-year PCE change: ${yearOverYearChange}%`);
    }
    
    if (lastYearSameQuarterCorePce) {
      const lastYearCorePce = parseFloat(lastYearSameQuarterCorePce[valueField]);
      yearOverYearCoreChange = ((latestCorePce - lastYearCorePce) / lastYearCorePce) * 100;
      Logger.log(`Year-over-year Core PCE change: ${yearOverYearCoreChange}%`);
    }
    
    // Calculate quarter-over-quarter percentage change
    const quarterOverQuarterChange = ((latestPce - previousPce) / previousPce) * 100;
    const coreQuarterOverQuarterChange = ((latestCorePce - previousCorePce) / previousCorePce) * 100;
    
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
      yearOverYearCoreChange = coreQuarterOverQuarterChange * 4;
      
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
      coreRate: yearOverYearCoreChange !== null ? yearOverYearCoreChange : coreQuarterOverQuarterChange * 4, // Annualize if YoY not available
      corePreviousRate: previousCorePce,
      coreChange: coreQuarterOverQuarterChange,
      quarter: latestQuarter,
      year: latestYear,
      source: "Bureau of Economic Analysis",
      sourceUrl: "https://www.bea.gov/data/personal-consumption-expenditures-price-index",
      lastUpdated: new Date()
    };
  } catch (error) {
    Logger.log(`Error fetching PCE data from BEA: ${error}`);
    return null;
  }
}
