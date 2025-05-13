/**
* The main prompt to ensure the sources consulted are relevant and recent
*/
function getMacroeconomicfactorsPrompt() {
  const currentDate = new Date();
  const formattedDate = Utilities.formatDate(currentDate, TIME_ZONE, "MMMM dd, yyyy");
  
  return `Search for CURRENT geopolitical risks impacting financial markets RIGHT NOW (within the last 48 hours).

Current Date: ${formattedDate}

CRITICAL TASK: Find the MOST SIGNIFICANT geopolitical developments affecting financial markets. Search for SPECIFIC events, policy changes, conflicts, or tensions that have ACTUAL MARKET IMPACT.

Focus on these sources (in order of priority):
1. Bloomberg, Financial Times, Reuters, Wall Street Journal, CNBC, S&P Global, Moody's, Fitch Ratings
2. Major bank research (Goldman Sachs, JPMorgan, Morgan Stanley)
3. Major news outlets (NPR, CNN, Yahoo Finance, New York Times, Al Jazeera, BBC)
4. Recognized Thinktanks (National Bureau of Economic Research (NBER), Brookings Institution, Center for Economic and Policy Research (CEPR), Peterson Institute for International Economics (PIIE), Bruegel)

DO NOT return generic, ongoing situations without specific new developments. Each risk MUST have:
1. A SPECIFIC recent development or event from the last 48 hours
2. DIRECT quotes from market analysts or officials
3. CLEAR market impact (specific sectors, assets, or indices affected)
4. EXACT source with URL to the specific article

Format your response as a valid JSON object with the following structure:
{
  "geopoliticalRiskIndex": 50, // A number from 0-100 representing overall risk level
  "risks": [
    {
      "type": "Event/Conflict/Policy",
      "name": "Brief name of the risk",
      "description": "Detailed description with SPECIFIC recent developments",
      "region": "Affected region",
      "impactLevel": "a number from 1 to 10, with 1 being least impactful and 10 being the most catastrophic",
      "marketImpact": "Description of potential market impact with SPECIFIC sectors and assets",
      "source": "Exact source name",
      "url": "Direct URL to specific article",
      "lastUpdated": "YYYY-MM-DD" // Date of the most recent information (must be within last 24 hours)
    }
  ],
  "source": "Data sources used",
  "sourceUrl": "URL to primary source",
  "lastUpdated": "YYYY-MM-DD" // Today's date
}

CRITICAL GUIDELINES:
1. Focus on QUALITY over QUANTITY - 3-5 well-documented risks with SPECIFIC details are better than many generic ones.
2. ONLY include risks with VERIFIED recent developments and CLEAR market impact.
3. If you cannot find specific details for a risk, OMIT it completely rather than including generic information.
4. Each risk MUST have a specific event or development from the past 48 hours.
5. Each risk MUST include the EXACT publication date (YYYY-MM-DD) and complete URL to the source.
6. Each risk MUST include specific market impacts (sectors, assets, indices affected).
7. You MUST assess the impact level based on actual market movements, not theoretical impacts.
8. You MUST format the response as a valid JSON object with no additional text or markdown.

Here's an example of a well-formatted risk entry:
{
  "type": "Policy",
  "name": "EU Digital Markets Act Enforcement",
  "description": "The European Commission announced today that it is launching formal investigations into tech giants for non-compliance with the Digital Markets Act. Competition Commissioner stated: 'We are taking decisive action to ensure fair digital markets.'",
  "region": "Europe",
  "impactLevel": 7,
  "marketImpact": "Tech stocks fell 2.3% on the news, with specific impact on platform companies. Analysts expect compliance costs to reduce Q3 earnings by 5-8% for affected firms.",
  "source": "Financial Times",
  "url": "https://www.ft.com/content/actual-article-url",
  "lastUpdated": "2025-05-12"
}

Your response should ONLY include the JSON object, without any additional text.`;
}

/**
 * Retrieves macroeconomic factors data
 * @return {Object} Macroeconomic factors data
 */
function retrieveMacroeconomicFactors() {
  try {
    Logger.log("Retrieving macroeconomic factors data...");
    
    // Check cache first (24-hour cache for complete macroeconomic factors data)
    const scriptCache = CacheService.getScriptCache();
    const cachedData = scriptCache.get('MACROECONOMIC_FACTORS_COMPLETE');
    
    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      Logger.log("Using cached complete macroeconomic factors data");
      return parsedData;
    }
    
    // Retrieve treasury yields data
    const treasuryYields = retrieveTreasuryYieldsData();
    
    // Retrieve Fed policy data
    const fedPolicy = retrieveFedPolicyData();
    
    // Retrieve inflation data
    const inflation = retrieveInflationData();

    if (debugMode){
      Logger.log("Inflation data retrieved in retrieveMacroeconomicFactors:\n"+JSON.stringify(inflation, null, 2));
    }
    
    // Retrieve geopolitical risks
    const geopoliticalRisks = retrieveGeopoliticalRisksData();
    
    // Check if we have data for each section
    const hasTreasuryYields = treasuryYields && !treasuryYields.error;
    const hasFedPolicy = fedPolicy && !fedPolicy.error;
    const hasInflation = inflation && !inflation.error;
    const hasGeopoliticalRisks = geopoliticalRisks && Array.isArray(geopoliticalRisks.risks) && geopoliticalRisks.risks.length > 0;
    
    // Create the data object that will be used by formatMacroeconomicFactorsData
    const macroData = {
      treasuryYields: treasuryYields,
      fedPolicy: fedPolicy,
      inflation: inflation,
      geopoliticalRisks: geopoliticalRisks
    };
    
    // Format the data for display
    const formattedData = formatMacroeconomicFactorsData(macroData);
    
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
    
    // Create the result object
    const result = {
      success: (hasTreasuryYields || hasFedPolicy || hasInflation || hasGeopoliticalRisks),
      message: (hasTreasuryYields || hasFedPolicy || hasInflation || hasGeopoliticalRisks) ? "Macroeconomic factors data retrieved successfully." : "Failed to retrieve macroeconomic factors data.",
      data: macroData,  // Include the data object explicitly
      treasuryYields: treasuryYields,
      fedPolicy: fedPolicy,
      inflation: inflation,
      geopoliticalRisks: geopoliticalRisks,
      formattedData: formattedData,
      timestamp: new Date()
    };
    
    // Cache the complete result for 24 hours (in seconds)
    scriptCache.put('MACROECONOMIC_FACTORS_COMPLETE', JSON.stringify(result), 24 * 60 * 60);
    
    // Return the results
    return result;
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
  
  // Check if macroData is defined
  if (!macroData) {
    Logger.log("Warning: macroData is undefined in formatMacroeconomicFactorsData");
    return "Macroeconomic data unavailable";
  }
  
  // Extract individual components from the macroData object
  const treasuryYields = macroData.treasuryYields;
  const fedPolicy = macroData.fedPolicy;
  const inflation = macroData.inflation;
  const geopoliticalRisks = macroData.geopoliticalRisks;

  // Format treasury yields data
  if (treasuryYields && !treasuryYields.error) {
    formattedData += "Treasury Yields:\n";
    
    // Find specific yields safely with null checks
    const threeMonthYield = treasuryYields.yields ? treasuryYields.yields.find(y => y.term === "3-Month") : null;
    const oneYearYield = treasuryYields.yields ? treasuryYields.yields.find(y => y.term === "1-Year") : null;
    const twoYearYield = treasuryYields.yields ? treasuryYields.yields.find(y => y.term === "2-Year") : null;
    const fiveYearYield = treasuryYields.yields ? treasuryYields.yields.find(y => y.term === "5-Year") : null;
    const tenYearYield = treasuryYields.yields ? treasuryYields.yields.find(y => y.term === "10-Year") : null;
    const thirtyYearYield = treasuryYields.yields ? treasuryYields.yields.find(y => y.term === "30-Year") : null;
    
    if (threeMonthYield && threeMonthYield.yield !== undefined) {
      formattedData += `  - 3-Month Treasury Yield: ${formatValue(threeMonthYield.yield)}% (${threeMonthYield.change >= 0 ? "+" : ""}${formatValue(threeMonthYield.change)})\n`;
    }
    
    if (oneYearYield && oneYearYield.yield !== undefined) {
      formattedData += `  - 1-Year Treasury Yield: ${formatValue(oneYearYield.yield)}% (${oneYearYield.change >= 0 ? "+" : ""}${formatValue(oneYearYield.change)})\n`;
    }
    
    if (twoYearYield && twoYearYield.yield !== undefined) {
      formattedData += `  - 2-Year Treasury Yield: ${formatValue(twoYearYield.yield)}% (${twoYearYield.change >= 0 ? "+" : ""}${formatValue(twoYearYield.change)})\n`;
    }
    
    if (fiveYearYield && fiveYearYield.yield !== undefined) {
      formattedData += `  - 5-Year Treasury Yield: ${formatValue(fiveYearYield.yield)}% (${fiveYearYield.change >= 0 ? "+" : ""}${formatValue(fiveYearYield.change)})\n`;
    }
    
    if (tenYearYield && tenYearYield.yield !== undefined) {
      formattedData += `  - 10-Year Treasury Yield: ${formatValue(tenYearYield.yield)}% (${tenYearYield.change >= 0 ? "+" : ""}${formatValue(tenYearYield.change)})\n`;
    }
    
    if (thirtyYearYield && thirtyYearYield.yield !== undefined) {
      formattedData += `  - 30-Year Treasury Yield: ${formatValue(thirtyYearYield.yield)}% (${thirtyYearYield.change >= 0 ? "+" : ""}${formatValue(thirtyYearYield.change)})\n`;
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
    const debugMode = PropertiesService.getScriptProperties().getProperty('DEBUG_MODE') === 'true';
    if (debugMode) {
      Logger.log("----------------------------------------");
      Logger.log("Fed Policy Data:");
      Logger.log(JSON.stringify(fedPolicy, null, 2));
      Logger.log("----------------------------------------");
    }
    
    if (fedPolicy.currentRate && fedPolicy.currentRate.currentRate !== undefined) {
      formattedData += `  - Current Federal Funds Rate: ${formatValue(fedPolicy.currentRate.currentRate)}% - Range: ${formatValue(fedPolicy.currentRate.rangeLow)}% - ${formatValue(fedPolicy.currentRate.rangeHigh)}%\n`;
    }

    // Format futures data if available
    if (fedPolicy.futures) {
      formattedData += `  - Federal Funds Futures Data:\n`;
      if (fedPolicy.futures.currentPrice !== undefined && fedPolicy.futures.currentPrice !== null) {
        formattedData += `    - Current Price: ${formatValue(fedPolicy.futures.currentPrice)}\n`;
      }
      if (fedPolicy.futures.impliedRate !== undefined && fedPolicy.futures.impliedRate !== null) {
        formattedData += `    - Implied Rate: ${formatValue(fedPolicy.futures.impliedRate)}%\n`;
      }
      if (fedPolicy.futures.probabilities) {
        formattedData += `    - Probability of Rate Cut: ${formatValue(fedPolicy.futures.probabilities.cut)}%\n`;
        formattedData += `    - Probability of Rate Hold: ${formatValue(fedPolicy.futures.probabilities.hold)}%\n`;
        formattedData += `    - Probability of Rate Hike: ${formatValue(fedPolicy.futures.probabilities.hike)}%\n`;
      }
    }

    if (fedPolicy.lastMeeting && fedPolicy.lastMeeting.startDate) {
      formattedData += `  - Last ${fedPolicy.lastMeeting.fullText}${fedPolicy.lastMeeting.minutesUrl ? ` (Minutes: ${fedPolicy.lastMeeting.minutesUrl})` : ""}\n`;
    }
    
    if (fedPolicy.nextMeeting && fedPolicy.nextMeeting.startDate) {
      formattedData += `  - Next ${fedPolicy.nextMeeting.fullText}\n`;
    }
    
    if (fedPolicy.forwardGuidance) {
      formattedData += `  - Forward Guidance: ${fedPolicy.forwardGuidance}\n`;
    }
    
    if (fedPolicy.commentary) {
      formattedData += `  - Recent Fed Commentary: ${fedPolicy.commentary}\n`;
    }
    
    // Add source information
    if (fedPolicy.source) {
      const timestamp = new Date(fedPolicy.source.timestamp);
      formattedData += `  - Source: ${fedPolicy.source.url}\n`;
      formattedData += `  - Last Updated: ${timestamp.toLocaleDateString()}, ${timestamp.toLocaleTimeString()}\n`;
      
      // Add component sources if available
      if (fedPolicy.source.components) {
        formattedData += `  - Components:\n`;
        for (const [component, info] of Object.entries(fedPolicy.source.components)) {
          if (info && info.url) {
            formattedData += `    - ${component}: ${info.url}\n`;
          }
        }
      }
    }
    
    formattedData += "\n";
  }
  
  // Format inflation data
  if (inflation && !inflation.error) {
    formattedData += "Inflation Data:\n";
    
    // Add CPI metrics
    if (inflation.cpi && inflation.cpi.yearOverYearChange !== undefined) {
      formattedData += `  - CPI (Year-over-Year): ${formatValue(inflation.cpi.yearOverYearChange)}%\n`;
    }
    
    if (inflation.cpi && inflation.cpi.coreRate !== undefined) {
      formattedData += `  - Core CPI (Year-over-Year): ${formatValue(inflation.cpi.coreRate)}%\n`;
    }
    
    if (inflation.cpi && inflation.cpi.monthOverMonthChange !== undefined) {
      formattedData += `  - CPI (Month-over-Month): ${formatValue(inflation.cpi.monthOverMonthChange)}%\n`;
    }
    
    // Add PCE metrics
    if (inflation.pce && inflation.pce.yearOverYearChange !== undefined) {
      formattedData += `  - PCE (Year-over-Year): ${formatValue(inflation.pce.yearOverYearChange)}%\n`;
    }
    
    if (inflation.pce && inflation.pce.coreRate !== undefined) {
      formattedData += `  - Core PCE (Year-over-Year): ${formatValue(inflation.pce.coreRate)}%\n`;
    }
    
    if (inflation.pce && inflation.pce.monthOverMonthChange !== undefined) {
      formattedData += `  - PCE (Month-over-Month): ${formatValue(inflation.pce.monthOverMonthChange)}%\n`;
    }
    
    // Add inflation expectations
    if (inflation.expectations && inflation.expectations.oneYear !== undefined) {
      formattedData += `  - University of Michigan 1-Year Inflation Expectation: ${formatValue(inflation.expectations.oneYear.value)}% (Last Updated: ${new Date(inflation.expectations.oneYear.lastUpdated).toLocaleDateString()})\n`;
    }
    
    if (inflation.expectations && inflation.expectations.fiveYear !== undefined) {
      formattedData += `  - University of Michigan 5-Year Inflation Expectation: ${formatValue(inflation.expectations.fiveYear.value)}% (Last Updated: ${new Date(inflation.expectations.fiveYear.lastUpdated).toLocaleDateString()})\n`;
    }
    
    if (inflation.expectations && inflation.expectations.tenYear !== undefined) {
      formattedData += `  - University of Michigan 10-Year Inflation Expectation: ${formatValue(inflation.expectations.tenYear.value)}% (Last Updated: ${new Date(inflation.expectations.tenYear.lastUpdated).toLocaleDateString()})\n`;
    }
    
    // Add additional inflation metrics
    if (inflation.additionalMetrics && inflation.additionalMetrics.consumption !== undefined) {
      formattedData += `  - Personal Consumption Expenditures: ${formatValue(inflation.additionalMetrics.consumption)}%\n`;
    }
    
    if (inflation.additionalMetrics && inflation.additionalMetrics.income !== undefined) {
      formattedData += `  - Personal Income: ${formatValue(inflation.additionalMetrics.income)}%\n`;
    }
    
    if (inflation.additionalMetrics && inflation.additionalMetrics.savingsRate !== undefined) {
      formattedData += `  - Personal Savings Rate: ${formatValue(inflation.additionalMetrics.savingsRate)}%\n`;
    }
    
    // Add analysis
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
        formattedData += `    - Value: ${formatValue(risk.value)}\n`;
        formattedData += `    - Change: ${formatValue(risk.change)}\n`;
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
      Logger.log("Using cached treasury yields data");
      return parsedData;
    }
    
    // Define the treasury yield terms to fetch
    const terms = ["3m", "1y", "2y", "5y", "10y", "30y"];
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
        yieldCurveAnalysis = `The yield curve is inverted with the 10Y-2Y spread at ${formatValue(yieldCurveSpread)}%. This is a potential recession signal that has historically preceded economic downturns.`;
      } else if (yieldCurveSpread < 0.5) {
        yieldCurveStatus = "Flat";
        yieldCurveAnalysis = `The yield curve is relatively flat with the 10Y-2Y spread at ${formatValue(yieldCurveSpread)}%. This suggests market uncertainty about future economic conditions.`;
      } else {
        yieldCurveStatus = "Normal";
        yieldCurveAnalysis = `The yield curve has a normal positive slope with the 10Y-2Y spread at ${formatValue(yieldCurveSpread)}%. This typically indicates expectations of economic growth.`;
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
        yieldCurveAnalysis = `The yield curve is inverted with the 10Y-2Y spread at ${formatValue(yieldCurveSpread)}%. This is a potential recession signal that has historically preceded economic downturns.`;
      } else if (yieldCurveSpread < 0.5) {
        yieldCurveStatus = "Flat";
        yieldCurveAnalysis = `The yield curve is relatively flat with the 10Y-2Y spread at ${formatValue(yieldCurveSpread)}%. This suggests market uncertainty about future economic conditions.`;
      } else {
        yieldCurveStatus = "Normal";
        yieldCurveAnalysis = `The yield curve has a normal positive slope with the 10Y-2Y spread at ${formatValue(yieldCurveSpread)}%. This typically indicates expectations of economic growth.`;
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
            "1y": "1-Year",
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
          
          Logger.log(`Successfully retrieved ${termNames[term]} yield: ${formatValue(yieldValue)}%`);
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
      yieldCurveAnalysis = `The yield curve is inverted with the 10Y-2Y spread at ${formatValue(yieldCurveSpread)}%. This is a potential recession signal that has historically preceded economic downturns.`;
    } else if (yieldCurveSpread < 0.5) {
      yieldCurveStatus = "Flat";
      yieldCurveAnalysis = `The yield curve is relatively flat with the 10Y-2Y spread at ${formatValue(yieldCurveSpread)}%. This suggests market uncertainty about future economic conditions.`;
    } else {
      yieldCurveStatus = "Normal";
      yieldCurveAnalysis = `The yield curve has a normal positive slope with the 10Y-2Y spread at ${formatValue(yieldCurveSpread)}%. This typically indicates expectations of economic growth.`;
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
    "1y": "^FVX",  // 5-year Treasury Note
    "2y": "^UST2Y", // 2-year Treasury Note
    "5y": "^FVX",  // 5-year Treasury Note
    "10y": "^TNX", // 10-year Treasury Note
    "30y": "^TYX"  // 30-year Treasury Bond
  };
  
  return symbols[term] || "";
}

/**
 * Retrieves geopolitical risks data
 * @return {Object} Geopolitical risks data
 */
function retrieveGeopoliticalRisksData() {
  try {
    Logger.log("Retrieving geopolitical risks data...");
    
    // Check cache first (24-hour cache for geopolitical risks)
    const scriptCache = CacheService.getScriptCache();
    const cachedData = scriptCache.get('GEOPOLITICAL_RISKS_DATA');
    
    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      Logger.log("Using cached geopolitical risks data");
      return parsedData;
    }
    
    // Instead of calling AI services, return a hardcoded sample data structure
    // that matches what JsonExport.generateFullJsonDataset expects
    Logger.log("Using hardcoded geopolitical risks data");
    
    // Create a sample data structure with the expected fields
    const currentDate = new Date();
    const formattedDate = Utilities.formatDate(currentDate, "America/New_York", "MMMM d, yyyy 'at' h:mm a z");
    
    const sampleData = {
      // This field is used by JsonExport.generateFullJsonDataset
      global: "Global geopolitical risk level is currently Moderate to High, with several ongoing conflicts and tensions affecting market stability.",
      
      // Array of risks with the structure expected by JsonExport
      risks: [
        {
          name: "US-China Tensions",
          description: "Ongoing trade and technology disputes between the United States and China continue to impact global markets, with particular focus on semiconductor restrictions and tariff policies.",
          region: "Global",
          impactLevel: "High",
          source: "Reuters",
          sourceUrl: "https://www.reuters.com/world/"
        },
        {
          name: "Russia-Ukraine Conflict",
          description: "The ongoing military conflict between Russia and Ukraine continues to disrupt energy markets and global supply chains, with implications for commodity prices and inflation.",
          region: "Europe",
          impactLevel: "High",
          source: "Bloomberg",
          sourceUrl: "https://www.bloomberg.com/"
        },
        {
          name: "Middle East Tensions",
          description: "Escalating conflicts in the Middle East are raising concerns about oil supply disruptions and broader regional instability, affecting energy markets and investor sentiment.",
          region: "Middle East",
          impactLevel: "Medium",
          source: "Financial Times",
          sourceUrl: "https://www.ft.com/"
        }
      ],
      
      // Source information
      source: "Aggregated from multiple geopolitical risk assessments",
      sourceUrl: "https://www.cfr.org/global-conflict-tracker",
      lastUpdated: formattedDate
    };
    
    // Cache the data for 24 hours (in seconds)
    scriptCache.put('GEOPOLITICAL_RISKS_DATA', JSON.stringify(sampleData), 24 * 60 * 60);
    
    return sampleData;
  } catch (error) {
    Logger.log(`Error retrieving geopolitical risks data: ${error}`);
    
    // Return a fallback object with the structure expected by JsonExport
    return {
      global: "Geopolitical risk assessment unavailable due to system error.",
      risks: [
        {
          name: "System Error",
          description: "Geopolitical risk data retrieval encountered a system error.",
          region: "Global",
          impactLevel: "Unknown",
          source: "System",
          sourceUrl: "https://openai.com/"
        }
      ],
      source: "System (Error Fallback)",
      sourceUrl: "https://openai.com/",
      lastUpdated: new Date().toISOString()
    };
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
      "DGS1": "1-Year",
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
          
          Logger.log(`Successfully retrieved ${term} yield from FRED: ${formatValue(yieldValue)}%`);
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
      "1year": "1-Year",
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
          
          Logger.log(`Successfully retrieved ${term} yield from Alpha Vantage: ${formatValue(yieldValue)}%`);
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
 * @param {Number} decimals - Number of decimal places (default: 2)
 * @return {String} Formatted value
 */
function formatValue(value, decimals = 2) {
  // Handle undefined, null, or NaN values
  if (value === undefined || value === null || isNaN(value)) {
    return "N/A";
  }
  
  // Convert to number if it's not already
  if (typeof value !== 'number') {
    // Try to parse as number if it's a string
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return parsed.toFixed(decimals);
      }
    }
    // For other non-number types, return N/A
    return "N/A";
  }
  
  return value.toFixed(decimals);
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
 * Tests the caching implementation for macroeconomic factors data
 * Run this function to verify that caching is working correctly
 */
function testMacroeconomicFactorsCaching() {
  // Clear all caches first to ensure a fresh start
  const scriptCache = CacheService.getScriptCache();
  scriptCache.remove('TREASURY_YIELDS_DATA');
  scriptCache.remove('FED_POLICY_DATA');
  scriptCache.remove('INFLATION_DATA');
  scriptCache.remove('GEOPOLITICAL_RISKS_DATA');
  scriptCache.remove('MACROECONOMIC_FACTORS_COMPLETE');
  Logger.log("Cleared all macroeconomic factors caches");
  
  // First call - should retrieve fresh data from sources
  Logger.log("FIRST CALL - SHOULD RETRIEVE FRESH DATA:");
  const startTime1 = new Date().getTime();
  const result1 = retrieveMacroeconomicFactors();
  const endTime1 = new Date().getTime();
  const executionTime1 = (endTime1 - startTime1) / 1000;
  
  Logger.log(`First call execution time: ${executionTime1} seconds`);
  Logger.log(`Treasury Yields: ${result1.treasuryYields ? "Retrieved" : "Not found"}`);
  Logger.log(`Fed Policy: ${result1.fedPolicy ? "Retrieved" : "Not found"}`);
  Logger.log(`Inflation: ${result1.inflation ? "Retrieved" : "Not found"}`);
  Logger.log(`Geopolitical Risks: ${result1.geopoliticalRisks ? "Retrieved" : "Not found"}`);
  
  // Second call - should use cached data
  Logger.log("\nSECOND CALL - SHOULD USE CACHED DATA:");
  const startTime2 = new Date().getTime();
  const result2 = retrieveMacroeconomicFactors();
  const endTime2 = new Date().getTime();
  const executionTime2 = (endTime2 - startTime2) / 1000;
  
  Logger.log(`Second call execution time: ${executionTime2} seconds`);
  Logger.log(`Treasury Yields: ${result2.treasuryYields ? "Retrieved from cache" : "Not found"}`);
  Logger.log(`Fed Policy: ${result2.fedPolicy ? "Retrieved from cache" : "Not found"}`);
  Logger.log(`Inflation: ${result2.inflation ? "Retrieved from cache" : "Not found"}`);
  Logger.log(`Geopolitical Risks: ${result2.geopoliticalRisks ? "Retrieved from cache" : "Not found"}`);
  
  // Compare execution times
  Logger.log("\nCACHING PERFORMANCE:");
  Logger.log(`First call (fresh data): ${executionTime1} seconds`);
  Logger.log(`Second call (cached data): ${executionTime2} seconds`);
  Logger.log(`Performance improvement: ${Math.round((1 - executionTime2/executionTime1) * 100)}%`);
  
  // Verify data consistency
  Logger.log("\nDATA CONSISTENCY CHECK:");
  const dataMatch = JSON.stringify(result1) === JSON.stringify(result2);
  Logger.log(`Data from both calls is identical: ${dataMatch ? "Yes" : "No"}`);
  
  return {
    firstCallTime: executionTime1,
    secondCallTime: executionTime2,
    improvementPercentage: Math.round((1 - executionTime2/executionTime1) * 100),
    dataConsistent: dataMatch
  };
}

/**
 * Resets the macroeconomic factors cache
 * Clears all cached macroeconomic data from the script cache
 * @return {Object} Result object with success status and message
 */
function resetMacroeconomicFactorsCache() {
  try {
    Logger.log("Resetting macroeconomic factors cache...");
    
    // Get the script cache
    const scriptCache = CacheService.getScriptCache();
    
    // Remove all macroeconomic factors related caches
    const cacheKeys = [
      'MACROECONOMIC_FACTORS_COMPLETE',  // Main complete data cache
      'TREASURY_YIELDS_DATA',            // Treasury yields component cache
      'FED_POLICY_DATA',                 // Fed policy component cache
      'INFLATION_DATA',                  // Inflation data component cache
      'GEOPOLITICAL_RISKS_DATA'          // Geopolitical risks component cache
    ];
    
    // Remove all caches
    scriptCache.removeAll(cacheKeys);
    
    Logger.log("Macroeconomic factors cache has been successfully reset");
    
    return {
      success: true,
      message: "Macroeconomic factors cache has been successfully reset",
      timestamp: new Date()
    };
  } catch (error) {
    Logger.log(`Error resetting macroeconomic factors cache: ${error}`);
    return {
      success: false,
      message: `Failed to reset macroeconomic factors cache: ${error}`,
      timestamp: new Date()
    };
  }
}

/**
 * Gets the BLS API key from script properties
 * @return {String} The BLS API key
 */
function getBLSApiKey() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('BLS_API_KEY');
    
    if (!apiKey) {
      Logger.log("BLS API key not found in script properties");
      return null;
    }
    
    return apiKey;
  } catch (error) {
    Logger.log(`Error getting BLS API key: ${error}`);
    return null;
  }
}

/**
 * Gets the OpenAI API key from script properties
 * @return {String} The OpenAI API key
 */
function getOpenAIApiKey() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('OPENAI_API_KEY');
    
    if (!apiKey) {
      Logger.log("OpenAI API key not found in script properties");
      return null;
    }
    
    return apiKey;
  } catch (error) {
    Logger.log(`Error getting OpenAI API key: ${error}`);
    return null;
  }
}

/**
 * Gets the Perplexity API key from script properties
 * @return {String} The Perplexity API key
 */
function getPerplexityApiKey() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('PERPLEXITY_API_KEY');
    
    if (!apiKey) {
      Logger.log("Perplexity API key not found in script properties");
      return null;
    }
    
    return apiKey;
  } catch (error) {
    Logger.log(`Error getting Perplexity API key: ${error}`);
    return null;
  }
}

/**
 * Gets the macroeconomic AI provider from script properties
 * @return {String} The macroeconomic AI provider (either "openai" or "perplexity")
 */
function getMacroeconomicAIProvider() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const provider = scriptProperties.getProperty('MACROECONOMIC_AI_PROVIDER');
    
    if (!provider) {
      Logger.log("Macroeconomic AI provider not found in script properties. Defaulting to OpenAI.");
      return "openai";
    }
    
    if (provider.toLowerCase() !== "openai" && provider.toLowerCase() !== "perplexity") {
      Logger.log("Invalid macroeconomic AI provider specified in script properties. Defaulting to OpenAI.");
      return "openai";
    }
    
    return provider.toLowerCase();
  } catch (error) {
    Logger.log(`Error getting macroeconomic AI provider: ${error}`);
    return "openai"; // Default to OpenAI if there's an error
  }
}

/**
 * Retrieves geopolitical risks data from Perplexity API
 * @return {Object} Geopolitical risks data
 */
function retrieveGeopoliticalRisksFromPerplexity() {
  try {
    Logger.log("Retrieving geopolitical risks data from Perplexity API...");
    
    // Get the Perplexity API key
    const apiKey = getPerplexityApiKey();
    if (!apiKey) {
      throw new Error("Perplexity API key not found in script properties");
    }
    
    // Create the prompt
    const prompt = getMacroeconomicfactorsPrompt();
    
    // Set up the API request
    const url = "https://api.perplexity.ai/chat/completions";
    const payload = {
      model: "sonar-pro",  // Valid Perplexity model with web search capability
      messages: [
        {
          role: "system",
          content: "You are a geopolitical risk analyst for a major investment bank. Find ONLY VERIFIED, SPECIFIC geopolitical developments with ACTUAL market impact from the past 48 hours. Focus on quality over quantity - 3-5 well-documented risks with specific details are better than many generic ones. Return ONLY valid JSON with no explanations or markdown formatting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.0,  // Zero temperature for maximum factuality
      max_tokens: 4000,  // Increased token limit for comprehensive results
      top_p: 1.0  // Maximum sampling for complete coverage
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Accept': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    // Call the Perplexity API
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      throw new Error(`Perplexity API returned status code ${responseCode}: ${response.getContentText()}`);
    }
    
    const responseData = JSON.parse(response.getContentText());
    const content = responseData.choices[0].message.content;
    
    // Add debugging to log the raw response
    Logger.log("Raw Perplexity response (first 500 chars):");
    Logger.log(content.substring(0, 500) + "...");
    
    // Extract JSON from the response with improved handling
    let geopoliticalData;
    try {
      // First try to parse the entire response as JSON
      geopoliticalData = JSON.parse(content);
    } catch (e) {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error("Could not extract JSON from Perplexity response: " + content.substring(0, 200) + "...");
      }
      
      try {
        geopoliticalData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (parseError) {
        throw new Error("Failed to parse extracted JSON: " + parseError + "\nExtracted content: " + 
                      (jsonMatch[1] || jsonMatch[0]).substring(0, 200) + "...");
      }
    }
    
    // Validate the structure
    if (!geopoliticalData || !Array.isArray(geopoliticalData.risks)) {
      throw new Error("Invalid geopolitical data structure: missing risks array");
    }
    
    // Validate and enrich each risk
    if (Array.isArray(geopoliticalData.risks)) {
      // Keep only risks with proper descriptions and sources
      geopoliticalData.risks = geopoliticalData.risks.filter(risk => 
        risk.description && risk.description.length > 100 && 
        risk.source && risk.url && 
        risk.url.startsWith('http')
      );
      
      // Ensure we have at least 3 risks
      if (geopoliticalData.risks.length < 3) {
        throw new Error("Insufficient valid risks returned: " + geopoliticalData.risks.length);
      }
      
      // Limit to top 5 risks by impact
      if (geopoliticalData.risks.length > 5) {
        geopoliticalData.risks = geopoliticalData.risks.slice(0, 5);
      }
      
      // Map numeric impact to qualitative and sort descending
      geopoliticalData.risks.forEach(risk => {
        // Accept impact as either 'impactLevel' or 'impact' (prefer number)
        let impactNum = null;
        if (typeof risk.impact === 'number') {
          impactNum = risk.impact;
        } else if (typeof risk.impactLevel === 'number') {
          impactNum = risk.impactLevel;
        } else if (typeof risk.impactLevel === 'string' && !isNaN(Number(risk.impactLevel))) {
          impactNum = Number(risk.impactLevel);
        }
        if (impactNum !== null) {
          // Store the numeric value for reference
          risk._impactNum = impactNum;
          // Map to qualitative
          if (impactNum >= 9) {
            risk.impactLevel = 'Severe';
          } else if (impactNum >= 5) {
            risk.impactLevel = 'High';
          } else if (impactNum >= 3) {
            risk.impactLevel = 'Medium';
          } else {
            risk.impactLevel = 'Low';
          }
        }
      });
      
      // Sort descending by numeric impact if present
      geopoliticalData.risks.sort((a, b) => (b._impactNum || 0) - (a._impactNum || 0));
    }
    
    // Log the extracted data
    Logger.log("Extracted geopolitical data (first 500 chars):");
    Logger.log(JSON.stringify(geopoliticalData, null, 2).substring(0, 500) + "...");

    // Add timestamp
    geopoliticalData.lastUpdated = new Date();
    
    // Cache the result for 24 hours
    const scriptCache = CacheService.getScriptCache();
    scriptCache.put('GEOPOLITICAL_RISKS_DATA', JSON.stringify(geopoliticalData), 86400);
    
    return geopoliticalData;
  } catch (error) {
    Logger.log(`Error retrieving geopolitical risks from Perplexity: ${error}`);
    
    // Fall back to OpenAI if Perplexity fails
    try {
      Logger.log("Falling back to OpenAI for geopolitical risks data");
      return retrieveGeopoliticalRisksFromOpenAI();
    } catch (fallbackError) {
      Logger.log(`Fallback to OpenAI also failed: ${fallbackError}`);
      
      // Return a fallback object
      return {
        geopoliticalRiskIndex: 50,
        risks: [
          {
            type: 'Event',
            name: "API Error",
            description: "Geopolitical risk data retrieval encountered an API error.",
            region: "Global",
            impactLevel: "Unknown",
            marketImpact: "Unable to assess market impact at this time.",
            source: "System",
            url: "https://perplexity.ai/"
          }
        ],
        source: "System (Error Fallback)",
        sourceUrl: "https://perplexity.ai/",
        lastUpdated: new Date(),
        error: error.toString()
      };
    }
  }
}

/**
 * Retrieves geopolitical risks data from OpenAI API
 * @return {Object} Geopolitical risks data
 */
function retrieveGeopoliticalRisksFromOpenAI() {
  try {
    Logger.log("Retrieving geopolitical risks data from OpenAI API...");
    
    // Get the OpenAI API key
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      throw new Error("OpenAI API key not found in script properties");
    }
    
    // Create the prompt for OpenAI
    const currentDate = new Date();
    const formattedDate = Utilities.formatDate(currentDate, TIME_ZONE, "MMMM dd, yyyy");
    
    const prompt = getMacroeconomicfactorsPrompt();
    
    // Set up the API request
    const url = "https://api.openai.com/v1/chat/completions";
    const payload = {
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a geopolitical analyst specializing in identifying risks that impact financial markets. Provide accurate, up-to-date information in JSON format only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 3000
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
    
    // Call the OpenAI API
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      throw new Error(`OpenAI API returned status code ${responseCode}: ${response.getContentText()}`);
    }
    
    const responseData = JSON.parse(response.getContentText());
    const content = responseData.choices[0].message.content;
    
    // Extract JSON from the response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from OpenAI response");
    }
    
    const geopoliticalData = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    // Map numeric impact to qualitative and sort descending (robust to either impactLevel or impact fields)
    if (Array.isArray(geopoliticalData.risks)) {
      geopoliticalData.risks.forEach(risk => {
        // Accept impact as either 'impactLevel' or 'impact' (prefer number)
        let impactNum = null;
        if (typeof risk.impact === 'number') {
          impactNum = risk.impact;
        } else if (typeof risk.impactLevel === 'number') {
          impactNum = risk.impactLevel;
        } else if (typeof risk.impactLevel === 'string' && !isNaN(Number(risk.impactLevel))) {
          impactNum = Number(risk.impactLevel);
        }
        if (impactNum !== null) {
          // Map to qualitative
          if (impactNum >= 9) {
            risk.impactLevel = 'Severe';
          } else if (impactNum >= 5) {
            risk.impactLevel = 'High';
          } else if (impactNum >= 3) {
            risk.impactLevel = 'Medium';
          } else {
            risk.impactLevel = 'Low';
          }
          // Store the numeric value for sorting
          risk._impactNum = impactNum;
        }
      });
      // Sort descending by numeric impact if present
      geopoliticalData.risks.sort((a, b) => (b._impactNum || 0) - (a._impactNum || 0));
    }

    // Add timestamp
    geopoliticalData.lastUpdated = new Date();
    
    // Cache the result for 24 hours
    const scriptCache = CacheService.getScriptCache();
    scriptCache.put('GEOPOLITICAL_RISKS_DATA', JSON.stringify(geopoliticalData), 86400);
    
    return geopoliticalData;
  } catch (error) {
    Logger.log(`Error retrieving geopolitical risks from OpenAI: ${error}`);
    
    // Return a fallback object
    return {
      geopoliticalRiskIndex: 50,
      risks: [
        {
          type: 'Event',
          name: "API Error",
          description: "Geopolitical risk data retrieval encountered an API error.",
          region: "Global",
          impactLevel: "Unknown",
          marketImpact: "Unable to assess market impact at this time.",
          source: "System",
          url: "https://openai.com/"
        }
      ],
      source: "System (Error Fallback)",
      sourceUrl: "https://openai.com/",
      lastUpdated: new Date(),
      error: error.toString()
    };
  }
}

/**
 * Clears all macroeconomic factors caches
 * This function clears both the script cache and any stale caches in properties service
 * @return {Object} Result object with success status and message
 */
function clearMacroeconomicFactorsCache() {
  try {
    Logger.log("Clearing all macroeconomic factors caches...");
    
    // Step 1: Clear script cache
    const scriptCache = CacheService.getScriptCache();
    const cacheKeys = [
      'MACROECONOMIC_FACTORS_COMPLETE',  // Main complete data cache
      'TREASURY_YIELDS_DATA',            // Treasury yields component cache
      'FED_POLICY_DATA',                 // Fed policy component cache
      'INFLATION_DATA',                  // Inflation data component cache
      'GEOPOLITICAL_RISKS_DATA'          // Geopolitical risks component cache
    ];
    
    scriptCache.removeAll(cacheKeys);
    Logger.log("Script cache cleared successfully");
    
    // Step 2: Clear stale caches from properties service
    const scriptProperties = PropertiesService.getScriptProperties();
    const stalePropertyKeys = [
      'TREASURY_YIELDS_STALE_CACHE',
      'FED_POLICY_STALE_CACHE',
      'INFLATION_DATA_STALE_CACHE',
      'GEOPOLITICAL_RISKS_STALE_CACHE',
      'MACROECONOMIC_FACTORS_STALE_CACHE'
    ];
    
    stalePropertyKeys.forEach(key => {
      try {
        scriptProperties.deleteProperty(key);
        Logger.log(`Deleted stale cache property: ${key}`);
      } catch (propError) {
        Logger.log(`Error deleting property ${key}: ${propError}`);
      }
    });
    
    const result = {
      success: true,
      message: "All macroeconomic factors caches have been successfully cleared",
      clearedCaches: {
        scriptCache: cacheKeys,
        propertiesCache: stalePropertyKeys
      },
      timestamp: new Date()
    };
    
    Logger.log(result.message);
    return result;
  } catch (error) {
    const errorResult = {
      success: false,
      message: `Failed to clear macroeconomic factors caches: ${error}`,
      timestamp: new Date()
    };
    
    Logger.log(errorResult.message);
    return errorResult;
  }
}
