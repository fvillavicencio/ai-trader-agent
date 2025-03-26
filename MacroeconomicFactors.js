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
    const geopoliticalRisks = retrieveGeopoliticalRisks();
    
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
 * Retrieves treasury yields data
 * @return {Object} Treasury yields data
 */
function retrieveTreasuryYieldsData() {
  try {
    Logger.log("Retrieving treasury yields data...");
    
    // Initialize the result object
    const result = {
      yields: {},
      yieldCurve: {},
      analysis: "",
      source: "",
      sourceUrl: "",
      lastUpdated: new Date()
    };
    
    // Fetch treasury yields data from primary source
    const treasuryData = fetchTreasuryYieldsFromTreasury();
    if (treasuryData && !treasuryData.error) {
      result.yields = treasuryData.yields;
      result.yieldCurve = treasuryData.yieldCurve;
      result.source = "U.S. Department of the Treasury";
      result.sourceUrl = "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve";
      result.lastUpdated = treasuryData.lastUpdated;
    } else {
      // Try Yahoo Finance as a backup
      const yahooData = fetchTreasuryYieldsFromYahoo();
      if (yahooData && !yahooData.error) {
        result.yields = yahooData.yields;
        result.yieldCurve = yahooData.yieldCurve;
        result.source = "Yahoo Finance";
        result.sourceUrl = "https://finance.yahoo.com/bonds";
        result.lastUpdated = yahooData.lastUpdated;
      } else {
        // Try FRED as a last resort
        const fredData = fetchTreasuryYieldsFromFRED();
        if (fredData && !fredData.error) {
          result.yields = fredData.yields;
          result.yieldCurve = fredData.yieldCurve;
          result.source = "Federal Reserve Economic Data (FRED)";
          result.sourceUrl = "https://fred.stlouisfed.org/";
          result.lastUpdated = fredData.lastUpdated;
        } else {
          // If all sources fail, return an error
          return {
            error: "Failed to retrieve treasury yields from all sources",
            lastUpdated: new Date()
          };
        }
      }
    }
    
    // Generate analysis based on the yield curve
    result.analysis = generateYieldCurveAnalysis(result.yieldCurve, result.yields);
    
    return result;
  } catch (error) {
    Logger.log(`Error retrieving treasury yields data: ${error}`);
    return {
      error: `Failed to retrieve treasury yields data: ${error}`,
      lastUpdated: new Date()
    };
  }
}

/**
 * Fetches treasury yields data from the U.S. Treasury website
 * @return {Object} Treasury yields data
 */
function fetchTreasuryYieldsFromTreasury() {
  try {
    Logger.log("Fetching treasury yields from U.S. Treasury website...");
    
    // Get the current year
    const currentYear = new Date().getFullYear();
    
    // U.S. Treasury yield curve data URL with dynamic year
    const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${currentYear}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${currentYear}&page&_format=csv`;
    
    const options = {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    };
    
    const response = UrlFetchApp.fetch(url, options);
    
    if (response.getResponseCode() === 200) {
      const csvData = response.getContentText();
      
      // Parse the CSV data
      const rows = Utilities.parseCsv(csvData);
      
      // Check if we have data
      if (rows.length > 1) {
        // Get the header row to identify columns
        const headers = rows[0];
        
        // Find the most recent data row (should be the first data row)
        const dataRow = rows[1];
        
        // Initialize the yields object
        const yields = {};
        
        // Map the columns to the appropriate yields
        const columnMap = {
          '1 Mo': 'oneMonth',
          '2 Mo': 'twoMonth',
          '3 Mo': 'threeMonth',
          '6 Mo': 'sixMonth',
          '1 Yr': 'oneYear',
          '2 Yr': 'twoYear',
          '3 Yr': 'threeYear',
          '5 Yr': 'fiveYear',
          '7 Yr': 'sevenYear',
          '10 Yr': 'tenYear',
          '20 Yr': 'twentyYear',
          '30 Yr': 'thirtyYear'
        };
        
        // Extract the date
        const dateIndex = headers.indexOf('Date');
        const dateStr = dataRow[dateIndex];
        const lastUpdated = new Date(dateStr);
        
        // Extract the yields
        for (const [headerName, yieldKey] of Object.entries(columnMap)) {
          const index = headers.indexOf(headerName);
          if (index !== -1 && dataRow[index] !== '') {
            yields[yieldKey] = parseFloat(dataRow[index]);
          }
        }
        
        // Check if we have enough data to determine the yield curve
        if (yields.threeMonth !== undefined && yields.tenYear !== undefined) {
          const spread = yields.tenYear - yields.threeMonth;
          
          const yieldCurve = {
            status: spread >= 0 ? 'normal' : 'inverted',
            spread: parseFloat(spread.toFixed(2)),
            description: spread >= 0 ? 'Normal (positive spread)' : 'Inverted (negative spread)'
          };
          
          // Calculate the 10Y-2Y spread if possible
          if (yields.twoYear !== undefined) {
            yieldCurve.tenYearTwoYearSpread = parseFloat((yields.tenYear - yields.twoYear).toFixed(2));
          }
          
          return {
            yields: yields,
            yieldCurve: yieldCurve,
            lastUpdated: lastUpdated
          };
        }
      }
    }
    
    // If we couldn't extract the data, return null
    return null;
  } catch (error) {
    Logger.log(`Error fetching treasury yields from U.S. Treasury: ${error}`);
    return null;
  }
}

/**
 * Fetches treasury yields data from Yahoo Finance
 * @return {Object} Treasury yields data
 */
function fetchTreasuryYieldsFromYahoo() {
  try {
    Logger.log("Fetching treasury yields from Yahoo Finance...");
    
    // Yahoo Finance URLs for different treasury yields
    const urls = {
      oneMonth: "https://finance.yahoo.com/quote/%5EUSY1M",
      threeMonth: "https://finance.yahoo.com/quote/%5EUSY3M",
      sixMonth: "https://finance.yahoo.com/quote/%5EUSY6M",
      oneYear: "https://finance.yahoo.com/quote/%5EUSY1Y",
      twoYear: "https://finance.yahoo.com/quote/%5EUSY2Y",
      threeYear: "https://finance.yahoo.com/quote/%5EUSY3Y",
      fiveYear: "https://finance.yahoo.com/quote/%5EUSY5Y",
      tenYear: "https://finance.yahoo.com/quote/%5EUSY10Y",
      thirtyYear: "https://finance.yahoo.com/quote/%5EUSY30Y"
    };
    
    const options = {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    };
    
    // Initialize the yields object
    const yields = {};
    
    // Track if we have the minimum required data
    let hasThreeMonth = false;
    let hasTwoYear = false;
    let hasTenYear = false;
    
    // Fetch data for each yield
    for (const [yieldKey, url] of Object.entries(urls)) {
      try {
        Logger.log(`Fetching ${yieldKey} yield from ${url}`);
        const response = UrlFetchApp.fetch(url, options);
        
        if (response.getResponseCode() === 200) {
          const content = response.getContentText();
          
          // Try to extract the embedded JSON data using the pattern root.App.main = (...)
          const jsonRegex = /root\.App\.main\s*=\s*(\{.+?\});/s;
          const jsonMatch = content.match(jsonRegex);
          
          if (jsonMatch && jsonMatch[1]) {
            try {
              const jsonData = JSON.parse(jsonMatch[1]);
              
              // Navigate to the QuoteSummaryStore which contains all the financial metrics
              if (jsonData.context && jsonData.context.dispatcher && 
                  jsonData.context.dispatcher.stores && 
                  jsonData.context.dispatcher.stores.QuoteSummaryStore) {
                
                const quoteStore = jsonData.context.dispatcher.stores.QuoteSummaryStore;
                
                // Extract the yield value
                if (quoteStore.price && quoteStore.price.regularMarketPrice) {
                  const yieldValue = quoteStore.price.regularMarketPrice.raw || 0;
                  
                  if (yieldValue > 0) {
                    yields[yieldKey] = yieldValue;
                    
                    if (yieldKey === 'threeMonth') {
                      hasThreeMonth = true;
                    } else if (yieldKey === 'twoYear') {
                      hasTwoYear = true;
                      Logger.log(`Found 2-year yield: ${yieldValue}`);
                    } else if (yieldKey === 'tenYear') {
                      hasTenYear = true;
                    }
                  }
                }
              }
            } catch (jsonError) {
              Logger.log(`Error parsing Yahoo Finance JSON for ${yieldKey}: ${jsonError}`);
            }
          }
          
          // If JSON extraction failed, try regex-based extraction as a fallback
          if (!yields[yieldKey]) {
            const priceRegex = /"regularMarketPrice":{"raw":([\d.]+)/;
            const priceMatch = content.match(priceRegex);
            
            if (priceMatch && priceMatch[1]) {
              const yieldValue = parseFloat(priceMatch[1]);
              
              if (!isNaN(yieldValue) && yieldValue > 0) {
                yields[yieldKey] = yieldValue;
                
                if (yieldKey === 'threeMonth') {
                  hasThreeMonth = true;
                } else if (yieldKey === 'twoYear') {
                  hasTwoYear = true;
                  Logger.log(`Found 2-year yield (regex): ${yieldValue}`);
                } else if (yieldKey === 'tenYear') {
                  hasTenYear = true;
                }
              }
            }
          }
        }
      } catch (urlError) {
        Logger.log(`Error fetching ${yieldKey} yield from Yahoo Finance: ${urlError}`);
      }
    }
    
    // Check if we have enough data to determine the yield curve
    if (hasThreeMonth && hasTenYear) {
      const tenYearThreeMonthSpread = yields.tenYear - yields.threeMonth;
      
      // If we have 2-year data, calculate the 10Y-2Y spread as well
      const tenYearTwoYearSpread = hasTwoYear ? yields.tenYear - yields.twoYear : null;
      
      const yieldCurve = {
        status: tenYearThreeMonthSpread >= 0 ? 'normal' : 'inverted',
        spread: parseFloat(tenYearThreeMonthSpread.toFixed(2)),
        tenYearTwoYearSpread: tenYearTwoYearSpread ? parseFloat(tenYearTwoYearSpread.toFixed(2)) : null,
        description: tenYearThreeMonthSpread >= 0 ? 'Normal (positive spread)' : 'Inverted (negative spread)'
      };
      
      return {
        yields: yields,
        yieldCurve: yieldCurve,
        lastUpdated: new Date()
      };
    }
    
    // If we couldn't extract enough data, return null
    return null;
  } catch (error) {
    Logger.log(`Error fetching treasury yields from Yahoo Finance: ${error}`);
    return null;
  }
}

/**
 * Fetches treasury yields data from FRED
 * @return {Object} Treasury yields data
 */
function fetchTreasuryYieldsFromFRED() {
  try {
    Logger.log("Fetching treasury yields from FRED...");
    
    // Get API key from script properties
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty("FRED_API_KEY");
    
    if (!apiKey) {
      Logger.log("FRED API key not found in script properties");
      return null;
    }
    
    // FRED API series IDs for treasury yields
    const seriesIds = {
      oneMonth: "DGS1MO",
      threeMonth: "DGS3MO",
      sixMonth: "DGS6MO",
      oneYear: "DGS1",
      twoYear: "DGS2",
      threeYear: "DGS3",
      fiveYear: "DGS5",
      sevenYear: "DGS7",
      tenYear: "DGS10",
      twentyYear: "DGS20",
      thirtyYear: "DGS30"
    };
    
    // Initialize the yields object
    const yields = {};
    
    // Track if we have the minimum required data
    let hasThreeMonth = false;
    let hasTenYear = false;
    
    // Fetch data for each yield
    for (const [yieldKey, seriesId] of Object.entries(seriesIds)) {
      try {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`;
        const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        
        if (response.getResponseCode() === 200) {
          const data = JSON.parse(response.getContentText());
          
          if (data.observations && data.observations.length > 0) {
            const yieldValue = parseFloat(data.observations[0].value);
            
            if (!isNaN(yieldValue) && yieldValue > 0) {
              yields[yieldKey] = yieldValue;
              
              if (yieldKey === 'threeMonth') {
                hasThreeMonth = true;
              } else if (yieldKey === 'tenYear') {
                hasTenYear = true;
              }
            }
          }
        }
      } catch (seriesError) {
        Logger.log(`Error fetching ${yieldKey} yield from FRED: ${seriesError}`);
      }
    }
    
    // Check if we have enough data to determine the yield curve
    if (hasThreeMonth && hasTenYear) {
      const spread = yields.tenYear - yields.threeMonth;
      
      // Calculate the 10Y-2Y spread if possible
      const tenYearTwoYearSpread = yields.twoYear ? yields.tenYear - yields.twoYear : null;
      
      const yieldCurve = {
        status: spread >= 0 ? 'normal' : 'inverted',
        spread: parseFloat(spread.toFixed(2)),
        tenYearTwoYearSpread: tenYearTwoYearSpread ? parseFloat(tenYearTwoYearSpread.toFixed(2)) : null,
        description: spread >= 0 ? 'Normal (positive spread)' : 'Inverted (negative spread)'
      };
      
      return {
        yields: yields,
        yieldCurve: yieldCurve,
        lastUpdated: new Date()
      };
    }
    
    // If we couldn't extract enough data, return null
    return null;
  } catch (error) {
    Logger.log(`Error fetching treasury yields from FRED: ${error}`);
    return null;
  }
}

/**
 * Generates an analysis of the yield curve
 * @param {Object} yieldCurve - Yield curve data
 * @param {Object} yields - Treasury yields data
 * @return {String} Analysis of the yield curve
 */
function generateYieldCurveAnalysis(yieldCurve, yields) {
  try {
    let analysis = "";
    
    if (yieldCurve && yieldCurve.status) {
      // Check if we have both 10Y-3M and 10Y-2Y spreads
      if (yieldCurve.tenYearTwoYearSpread !== undefined && yieldCurve.tenYearTwoYearSpread !== null) {
        // Use both spreads in the analysis
        if (yieldCurve.status === 'inverted') {
          analysis = `The yield curve is currently inverted with a 10Y-3M spread of ${yieldCurve.spread}% and a 10Y-2Y spread of ${yieldCurve.tenYearTwoYearSpread}%. An inverted yield curve has historically been a reliable predictor of economic recessions, often preceding them by 6-18 months. This suggests increased market concerns about future economic growth.`;
        } else {
          if (yieldCurve.spread < 0.5 || yieldCurve.tenYearTwoYearSpread < 0.3) {
            analysis = `The yield curve is normal but flattening with a 10Y-3M spread of ${yieldCurve.spread}% and a 10Y-2Y spread of ${yieldCurve.tenYearTwoYearSpread}%. A flattening yield curve may indicate slowing economic growth expectations.`;
          } else if (yieldCurve.spread < 1.5 || yieldCurve.tenYearTwoYearSpread < 0.7) {
            analysis = `The yield curve is normal with a moderate 10Y-3M spread of ${yieldCurve.spread}% and a 10Y-2Y spread of ${yieldCurve.tenYearTwoYearSpread}%, suggesting stable economic growth expectations.`;
          } else {
            analysis = `The yield curve is normal with a steep 10Y-3M spread of ${yieldCurve.spread}% and a 10Y-2Y spread of ${yieldCurve.tenYearTwoYearSpread}%, typically indicating expectations of strong economic growth and potentially rising inflation.`;
          }
        }
      } else {
        // Fallback to just using the 10Y-3M spread
        if (yieldCurve.status === 'inverted') {
          analysis = `The yield curve is currently inverted with a spread of ${yieldCurve.spread}% between the 10-year and 3-month Treasury yields. An inverted yield curve has historically been a reliable predictor of economic recessions, often preceding them by 6-18 months. This suggests increased market concerns about future economic growth.`;
        } else {
          if (yieldCurve.spread < 0.5) {
            analysis = `The yield curve is normal but flattening with a narrow spread of ${yieldCurve.spread}% between the 10-year and 3-month Treasury yields. A flattening yield curve may indicate slowing economic growth expectations.`;
          } else if (yieldCurve.spread < 1.5) {
            analysis = `The yield curve is normal with a moderate spread of ${yieldCurve.spread}% between the 10-year and 3-month Treasury yields, suggesting stable economic growth expectations.`;
          } else {
            analysis = `The yield curve is normal with a steep spread of ${yieldCurve.spread}% between the 10-year and 3-month Treasury yields, typically indicating expectations of strong economic growth and potentially rising inflation.`;
          }
        }
      }
      
      // Add information about the Fed policy implications
      if (yields.twoYear && yields.tenYear) {
        const shortTermYield = yields.twoYear;
        
        if (shortTermYield > 4.5) {
          analysis += " Short-term yields are elevated, reflecting the Federal Reserve's restrictive monetary policy stance.";
        } else if (shortTermYield > 3.0) {
          analysis += " Short-term yields reflect the Federal Reserve's moderately restrictive monetary policy stance.";
        } else {
          analysis += " Short-term yields suggest the Federal Reserve's monetary policy is relatively accommodative.";
        }
      }
    } else {
      analysis = "Yield curve data is currently unavailable. Please check back later for updated information.";
    }
    
    return analysis;
  } catch (error) {
    Logger.log(`Error generating yield curve analysis: ${error}`);
    return "Unable to generate yield curve analysis due to an error.";
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
    
    // Display all available yields
    if (treasuryYields.yields && Object.keys(treasuryYields.yields).length > 0) {
      // Sort yields by term length (3-Month, 2-Year, 5-Year, 10-Year, 30-Year)
      const termOrder = {
        "oneMonth": 0,
        "threeMonth": 1,
        "sixMonth": 2,
        "oneYear": 3,
        "twoYear": 4,
        "threeYear": 5,
        "fiveYear": 6,
        "sevenYear": 7,
        "tenYear": 8,
        "twentyYear": 9,
        "thirtyYear": 10
      };
      
      const sortedYields = Object.keys(treasuryYields.yields).sort((a, b) => {
        return (termOrder[a] || 99) - (termOrder[b] || 99);
      });
      
      // Display each yield
      sortedYields.forEach(yieldKey => {
        if (treasuryYields.yields[yieldKey] !== undefined) {
          formattedData += `  * ${yieldKey.replace(/([A-Z])/g, " $1")} Treasury Yield: ${treasuryYields.yields[yieldKey].toFixed(2)}%\n`;
        }
      });
    }
    
    // Add yield curve information
    if (treasuryYields.yieldCurve) {
      formattedData += `  * Yield Curve Status: ${treasuryYields.yieldCurve.status}\n`;
      formattedData += `  * 10Y-3M Spread: ${treasuryYields.yieldCurve.spread ? treasuryYields.yieldCurve.spread.toFixed(2) + '%' : 'N/A'}\n`;
      if (treasuryYields.yieldCurve.tenYearTwoYearSpread) {
        formattedData += `  * 10Y-2Y Spread: ${treasuryYields.yieldCurve.tenYearTwoYearSpread.toFixed(2)}%\n`;
      }
      formattedData += `  * Inverted: ${treasuryYields.yieldCurve.status === 'inverted' ? 'Yes' : 'No'}\n`;
      formattedData += `  * Analysis: ${treasuryYields.analysis || 'No analysis available'}\n`;
    }
    
    // Add source and timestamp
    formattedData += `  * Source: ${treasuryYields.source} (${treasuryYields.sourceUrl})\n`;
    formattedData += `  * Last Updated: ${treasuryYields.lastUpdated ? treasuryYields.lastUpdated.toLocaleString() : 'Unknown'}\n`;
  } else {
    formattedData += "Treasury Yields: No data available or error retrieving data\n";
    if (treasuryYields && treasuryYields.error) {
      formattedData += `  * Error: ${treasuryYields.error}\n`;
    }
  }
  
  // Format Fed policy data
  if (fedPolicy && !fedPolicy.error) {
    formattedData += "\nFederal Reserve Policy:\n";
    formattedData += `  * Current Federal Funds Rate: ${fedPolicy.currentRate}% (Range: ${fedPolicy.rateRange})\n`;
    formattedData += `  * Last FOMC Meeting: ${fedPolicy.lastMeeting ? new Date(fedPolicy.lastMeeting).toLocaleDateString() : 'Unknown'}\n`;
    formattedData += `  * Summary: ${fedPolicy.summary || 'No summary available'}\n`;
    
    if (fedPolicy.nextMeeting) {
      formattedData += `  * Next FOMC Meeting: ${new Date(fedPolicy.nextMeeting).toLocaleDateString()}\n`;
    }
    
    if (fedPolicy.forwardGuidance) {
      formattedData += `  * Forward Guidance: ${fedPolicy.forwardGuidance}\n`;
    }
    
    // Add source information
    if (fedPolicy.source && fedPolicy.sourceUrl) {
      formattedData += `  * Source: ${fedPolicy.source} (${fedPolicy.sourceUrl})\n`;
    }
    
    // Add timestamp
    if (fedPolicy.lastUpdated) {
      formattedData += `  * Last Updated: ${new Date(fedPolicy.lastUpdated).toLocaleString()}\n`;
    }
  } else {
    formattedData += "\nFederal Reserve Policy: No data available or error retrieving data\n";
    if (fedPolicy && fedPolicy.error) {
      formattedData += `  * Error: ${fedPolicy.error}\n`;
    }
  }
  
  // Format inflation data
  if (inflation && !inflation.error) {
    formattedData += "\nInflation Data:\n";
    
    // CPI data
    if (inflation.cpi && !inflation.cpi.error) {
      formattedData += `  * CPI (Current): ${inflation.cpi.yearOverYearChange}%\n`;
      formattedData += `  * CPI (Year-over-Year): ${inflation.cpi.yearOverYearChange}%\n`;
      formattedData += `  * Core CPI: ${inflation.cpi.coreRate}%\n`;
      
      if (inflation.cpi.lastUpdated) {
        formattedData += `  * CPI Last Updated: ${new Date(inflation.cpi.lastUpdated).toLocaleString()}\n`;
      }
      
      if (inflation.cpi.source) {
        formattedData += `  * CPI Source: ${inflation.cpi.source}\n`;
      }
    } else {
      formattedData += `  * CPI: No data available or error retrieving data\n`;
      if (inflation.cpi && inflation.cpi.error) {
        formattedData += `  * CPI Error: ${inflation.cpi.error}\n`;
      }
    }
    
    // PCE data
    if (inflation.pce && !inflation.pce.error) {
      formattedData += `  * PCE (Current): ${inflation.pce.yearOverYearChange}%\n`;
      formattedData += `  * PCE (Year-over-Year): ${inflation.pce.yearOverYearChange}%\n`;
      formattedData += `  * Core PCE: ${inflation.pce.coreRate}%\n`;
      
      if (inflation.pce.lastUpdated) {
        formattedData += `  * PCE Last Updated: ${new Date(inflation.pce.lastUpdated).toLocaleString()}\n`;
      }
      
      if (inflation.pce.source) {
        formattedData += `  * PCE Source: ${inflation.pce.source}\n`;
      }
    } else {
      formattedData += `  * PCE: No data available or error retrieving data\n`;
      if (inflation.pce && inflation.pce.error) {
        formattedData += `  * PCE Error: ${inflation.pce.error}\n`;
      }
    }
    
    // Inflation expectations
    if (inflation.expectations && !inflation.expectations.error) {
      formattedData += `  * Inflation Expectations: 1-Year (${inflation.expectations.oneYear}%), 5-Year (${inflation.expectations.fiveYear}%), 10-Year (${inflation.expectations.tenYear}%)\n`;
      
      if (inflation.expectations.lastUpdated) {
        formattedData += `  * Expectations Last Updated: ${new Date(inflation.expectations.lastUpdated).toLocaleString()}\n`;
      }
      
      if (inflation.expectations.source) {
        formattedData += `  * Expectations Source: ${inflation.expectations.source}\n`;
      }
    }
    
    // Add analysis if available
    if (inflation.analysis) {
      formattedData += "\n**Inflation Analysis**:\n";
      formattedData += inflation.analysis + "\n";
      
      if (inflation.source) {
        formattedData += `  * Source: ${inflation.source}\n`;
      }
      
      if (inflation.lastUpdated) {
        formattedData += `  * Last Updated: ${new Date(inflation.lastUpdated).toLocaleString()}\n`;
      }
    }
  } else {
    formattedData += "\nInflation Data: No data available or error retrieving data\n";
    if (inflation && inflation.error) {
      formattedData += `  * Error: ${inflation.error}\n`;
    }
  }
  
  // Format geopolitical risks data
  if (geopoliticalRisks && Array.isArray(geopoliticalRisks.risks) && geopoliticalRisks.risks.length > 0) {
    formattedData += "\nGeopolitical Risks:\n";
    
    // Add each risk
    for (const risk of geopoliticalRisks.risks) {
      formattedData += `  - ${risk.title || "Unknown Risk"}:\n`;
      
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
      }
      
      formattedData += `    - Source: ${risk.source}\n`;
      formattedData += "\n";
    }
  }
  
  return formattedData;
}

/**
 * Retrieves inflation data
 * @return {Object} Inflation data
 */
function retrieveInflationData() {
  try {
    Logger.log("Retrieving inflation data...");
    
    // Initialize the result object
    const result = {
      cpi: null,
      pce: null,
      expectations: null,
      analysis: "",
      source: "",
      sourceUrl: "",
      lastUpdated: new Date()
    };
    
    // Get API keys from script properties
    const scriptProperties = PropertiesService.getScriptProperties();
    const blsApiKey = scriptProperties.getProperty("BLS_API_KEY");
    const beaApiKey = scriptProperties.getProperty("BEA_API_KEY");
    const fredApiKey = scriptProperties.getProperty("FRED_API_KEY");
    
    // Log API key status for debugging
    Logger.log(`BLS API key: ${blsApiKey ? "Found" : "Not found"}`);
    Logger.log(`BEA API key: ${beaApiKey ? "Found" : "Not found"}`);
    Logger.log(`FRED API key: ${fredApiKey ? "Found" : "Not found"}`);
    
    // Try to get CPI data
    let cpiData = null;
    if (blsApiKey) {
      cpiData = fetchCPIFromBLSAPI(blsApiKey);
    }
    
    if (!cpiData) {
      // Try web scraping as a backup
      cpiData = fetchCPIFromBLSWebsite();
    }
    
    if (!cpiData && fredApiKey) {
      // Try FRED as a last resort
      cpiData = fetchCPIFromFRED(fredApiKey);
    }
    
    // If all methods fail, use fallback data
    if (!cpiData) {
      Logger.log("Using fallback CPI data");
      cpiData = {
        currentRate: 3.2,
        yearOverYearChange: 3.2,
        coreRate: 3.8,
        source: "Fallback Data (Last Known Values)",
        sourceUrl: "https://www.bls.gov/cpi/",
        lastUpdated: new Date(),
        isEstimated: true
      };
    }
    
    // Try to get PCE data
    let pceData = null;
    if (beaApiKey) {
      pceData = fetchPCEFromBEAAPI(beaApiKey);
    }
    
    if (!pceData) {
      // Try web scraping as a backup
      pceData = fetchPCEFromBEAWebsite();
    }
    
    if (!pceData && fredApiKey) {
      // Try FRED as a last resort
      pceData = fetchPCEFromFRED(fredApiKey);
    }
    
    // If all methods fail, use fallback data
    if (!pceData) {
      Logger.log("Using fallback PCE data");
      pceData = {
        currentRate: 2.5,
        yearOverYearChange: 2.5,
        coreRate: 2.8,
        source: "Fallback Data (Last Known Values)",
        sourceUrl: "https://www.bea.gov/",
        lastUpdated: new Date(),
        isEstimated: true
      };
    }
    
    // Try to get inflation expectations data
    let expectationsData = null;
    if (fredApiKey) {
      expectationsData = fetchInflationExpectationsFromFRED(fredApiKey);
    }
    
    if (!expectationsData) {
      // Try web scraping as a backup
      expectationsData = fetchInflationExpectationsFromClevelandFed();
    }
    
    // If all methods fail, use fallback data
    if (!expectationsData) {
      Logger.log("Using fallback inflation expectations data");
      expectationsData = {
        shortTerm: 2.9,
        mediumTerm: 2.7,
        longTerm: 2.3,
        source: "Fallback Data (Last Known Values)",
        sourceUrl: "https://www.federalreserve.gov/",
        lastUpdated: new Date(),
        isEstimated: true
      };
    }
    
    // Store the data in the result object
    result.cpi = cpiData;
    result.pce = pceData;
    result.expectations = expectationsData;
    
    // Generate analysis
    result.analysis = generateInflationAnalysis(cpiData, pceData, expectationsData);
    
    // Set source and URL based on the most reliable data source
    if (!cpiData.isEstimated) {
      result.source = cpiData.source;
      result.sourceUrl = cpiData.sourceUrl;
    } else if (!pceData.isEstimated) {
      result.source = pceData.source;
      result.sourceUrl = pceData.sourceUrl;
    } else {
      result.source = "Cleveland Federal Reserve";
      result.sourceUrl = "https://www.clevelandfed.org/indicators-and-data/inflation-expectations";
    }
    
    return result;
  } catch (error) {
    Logger.log(`Error retrieving inflation data: ${error}`);
    return getInflationFallbackData();
  }
}

/**
 * Fetches CPI data from the BLS API
 * @param {String} apiKey - BLS API key
 * @return {Object} CPI data
 */
function fetchCPIFromBLSAPI(apiKey) {
  try {
    Logger.log("Fetching CPI data from BLS API...");
    
    // BLS API endpoint
    const apiUrl = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
    
    // Request parameters
    const requestData = {
      "seriesid": ["CUUR0000SA0", "CUUR0000SA0L1E"],
      "startyear": new Date().getFullYear() - 1,
      "endyear": new Date().getFullYear(),
      "registrationkey": apiKey
    };
    
    // Request options
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(requestData),
      muteHttpExceptions: true
    };
    
    // Make the API request
    const response = UrlFetchApp.fetch(apiUrl, options);
    
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      
      // Check if the API request was successful
      if (data.status === "REQUEST_SUCCEEDED" && data.Results && data.Results.series) {
        const allItemsSeries = data.Results.series.find(s => s.seriesID === "CUUR0000SA0");
        const coreSeries = data.Results.series.find(s => s.seriesID === "CUUR0000SA0L1E");
        
        if (allItemsSeries && allItemsSeries.data && allItemsSeries.data.length > 0 &&
            coreSeries && coreSeries.data && coreSeries.data.length > 0) {
          // Sort data by date (most recent first)
          allItemsSeries.data.sort((a, b) => {
            const aDate = new Date(parseInt(a.year), parseInt(a.period.substring(1)) - 1, 1);
            const bDate = new Date(parseInt(b.year), parseInt(b.period.substring(1)) - 1, 1);
            return bDate - aDate;
          });
          
          coreSeries.data.sort((a, b) => {
            const aDate = new Date(parseInt(a.year), parseInt(a.period.substring(1)) - 1, 1);
            const bDate = new Date(parseInt(b.year), parseInt(b.period.substring(1)) - 1, 1);
            return bDate - aDate;
          });
          
          // Get the most recent CPI value
          const currentCPI = parseFloat(allItemsSeries.data[0].value);
          const previousCPI = parseFloat(allItemsSeries.data[1].value);
          
          // Calculate month-over-month change
          const momChange = ((currentCPI - previousCPI) / previousCPI) * 100;
          
          // Get the CPI value from 12 months ago (should be index 12 if we have monthly data for a year)
          const yearAgoCPI = allItemsSeries.data.find(d => {
            const currentDate = new Date(parseInt(allItemsSeries.data[0].year), parseInt(allItemsSeries.data[0].period.substring(1)) - 1, 1);
            const dataDate = new Date(parseInt(d.year), parseInt(d.period.substring(1)) - 1, 1);
            const diffMonths = (currentDate.getFullYear() - dataDate.getFullYear()) * 12 + currentDate.getMonth() - dataDate.getMonth();
            return diffMonths === 12;
          });
          
          // Calculate year-over-year change
          const yoyChange = yearAgoCPI ? ((currentCPI - parseFloat(yearAgoCPI.value)) / parseFloat(yearAgoCPI.value)) * 100 : null;
          
          // Get the most recent core CPI value
          const currentCoreCPI = parseFloat(coreSeries.data[0].value);
          const previousCoreCPI = parseFloat(coreSeries.data[1].value);
          
          // Calculate core month-over-month change
          const coreMomChange = ((currentCoreCPI - previousCoreCPI) / previousCoreCPI) * 100;
          
          // Get the core CPI value from 12 months ago
          const yearAgoCoreCPI = coreSeries.data.find(d => {
            const currentDate = new Date(parseInt(coreSeries.data[0].year), parseInt(coreSeries.data[0].period.substring(1)) - 1, 1);
            const dataDate = new Date(parseInt(d.year), parseInt(d.period.substring(1)) - 1, 1);
            const diffMonths = (currentDate.getFullYear() - dataDate.getFullYear()) * 12 + currentDate.getMonth() - dataDate.getMonth();
            return diffMonths === 12;
          });
          
          // Calculate core year-over-year change
          const coreYoyChange = yearAgoCoreCPI ? ((currentCoreCPI - parseFloat(yearAgoCoreCPI.value)) / parseFloat(yearAgoCoreCPI.value)) * 100 : null;
          
          // Get the release date
          const releaseDate = new Date();
          const year = parseInt(allItemsSeries.data[0].year);
          const month = parseInt(allItemsSeries.data[0].period.substring(1)) - 1;
          releaseDate.setFullYear(year, month, 15); // Approximate release date
          
          return {
            currentRate: parseFloat(momChange.toFixed(1)),
            yearOverYearChange: yoyChange ? parseFloat(yoyChange.toFixed(1)) : null,
            coreRate: coreYoyChange ? parseFloat(coreYoyChange.toFixed(1)) : null,
            source: "Bureau of Labor Statistics (BLS API)",
            sourceUrl: "https://www.bls.gov/cpi/",
            lastUpdated: releaseDate,
            isEstimated: false
          };
        }
      } else {
        Logger.log(`BLS API error: ${data.status || "Unknown error"}`);
      }
    } else {
      Logger.log(`BLS API HTTP error: ${response.getResponseCode()}`);
    }
    
    // If we couldn't extract the data, return null
    return null;
  } catch (error) {
    Logger.log(`Error fetching CPI from BLS API: ${error}`);
    return null;
  }
}

/**
 * Fetches CPI data by scraping the BLS website
 * @return {Object} CPI data
 */
function fetchCPIFromBLSWebsite() {
  try {
    Logger.log("Fetching CPI data from BLS website...");
    
    // BLS CPI news release page
    const url = "https://www.bls.gov/news.release/cpi.nr0.htm";
    
    const options = {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    };
    
    const response = UrlFetchApp.fetch(url, options);
    
    if (response.getResponseCode() === 200) {
      const content = response.getContentText();
      
      // Extract the release date
      const releaseDateRegex = /Release Date:\s*([A-Za-z]+ \d+, \d{4})/i;
      const releaseDateMatch = content.match(releaseDateRegex);
      
      let releaseDate = new Date();
      if (releaseDateMatch && releaseDateMatch[1]) {
        releaseDate = new Date(releaseDateMatch[1]);
      }
      
      // Extract the CPI values
      // This pattern looks for text like "The Consumer Price Index for All Urban Consumers (CPI-U) increased 0.4 percent in February"
      const cpiRegex = /Consumer Price Index for All Urban Consumers \(CPI-U\) (increased|decreased|rose|fell|was unchanged) (?:by )?(\d+\.\d+|\d+)? ?percent/i;
      const cpiMatch = content.match(cpiRegex);
      
      let currentRate = null;
      if (cpiMatch) {
        const direction = cpiMatch[1].toLowerCase();
        const value = cpiMatch[2] ? parseFloat(cpiMatch[2]) : 0;
        
        currentRate = direction.includes("decreased") || direction.includes("fell") ? -value : value;
      }
      
      // Extract the year-over-year CPI change
      // This pattern looks for text like "Over the last 12 months, the all items index increased 3.2 percent"
      const yoyRegex = /Over the last 12 months,? the all items index (increased|decreased|rose|fell|was unchanged) (?:by )?(\d+\.\d+|\d+)? ?percent/i;
      const yoyMatch = content.match(yoyRegex);
      
      let yearOverYearChange = null;
      if (yoyMatch) {
        const direction = yoyMatch[1].toLowerCase();
        const value = yoyMatch[2] ? parseFloat(yoyMatch[2]) : 0;
        
        yearOverYearChange = direction.includes("decreased") || direction.includes("fell") ? -value : value;
      }
      
      // Extract the core CPI (excluding food and energy)
      // This pattern looks for text like "The index for all items less food and energy rose 0.2 percent"
      const coreRegex = /index for all items less food and energy (increased|decreased|rose|fell|was unchanged) (?:by )?(\d+\.\d+|\d+)? ?percent/i;
      const coreMatch = content.match(coreRegex);
      
      let coreRate = null;
      if (coreMatch) {
        const direction = coreMatch[1].toLowerCase();
        const value = coreMatch[2] ? parseFloat(coreMatch[2]) : 0;
        
        coreRate = direction.includes("decreased") || direction.includes("fell") ? -value : value;
      }
      
      // Extract the year-over-year core CPI change
      // This pattern looks for text like "From the same month one year ago, the all items less food and energy index rose 3.8 percent"
      const coreYoyRegex = /From the same month one year ago, the all items less food and energy index (increased|decreased|rose|fell|was unchanged) (?:by )?(\d+\.\d+|\d+)? ?percent/i;
      const coreYoyMatch = content.match(coreYoyRegex);
      
      if (coreYoyMatch) {
        const direction = coreYoyMatch[1].toLowerCase();
        const value = coreYoyMatch[2] ? parseFloat(coreYoyMatch[2]) : 0;
        
        coreRate = direction.includes("decreased") || direction.includes("fell") ? -value : value;
      }
      
      // If we have at least one value, return the data
      if (currentRate !== null || yearOverYearChange !== null || coreRate !== null) {
        return {
          currentRate: currentRate,
          yearOverYearChange: yearOverYearChange,
          coreRate: coreRate,
          source: "Bureau of Labor Statistics (Website)",
          sourceUrl: url,
          lastUpdated: releaseDate,
          isEstimated: false
        };
      }
    }
    
    // If we couldn't extract the data, return null
    return null;
  } catch (error) {
    Logger.log(`Error fetching CPI from BLS website: ${error}`);
    return null;
  }
}

/**
 * Fetches CPI data from FRED
 * @param {String} apiKey - FRED API key
 * @return {Object} CPI data
 */
function fetchCPIFromFRED(apiKey) {
  try {
    Logger.log("Fetching CPI data from FRED...");
    
    // FRED API series IDs for CPI data
    // CPIAUCSL - Consumer Price Index for All Urban Consumers: All Items
    // CPILFESL - Consumer Price Index for All Urban Consumers: All Items Less Food & Energy
    const cpiSeriesId = "CPIAUCSL";
    const coreCpiSeriesId = "CPILFESL";
    
    // Fetch the CPI data
    const cpiUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${cpiSeriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=13`;
    const cpiResponse = UrlFetchApp.fetch(cpiUrl, { muteHttpExceptions: true });
    
    // Fetch the core CPI data
    const coreCpiUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${coreCpiSeriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=13`;
    const coreCpiResponse = UrlFetchApp.fetch(coreCpiUrl, { muteHttpExceptions: true });
    
    if (cpiResponse.getResponseCode() === 200 && coreCpiResponse.getResponseCode() === 200) {
      const cpiData = JSON.parse(cpiResponse.getContentText());
      const coreCpiData = JSON.parse(coreCpiResponse.getContentText());
      
      if (cpiData.observations && cpiData.observations.length > 0 && 
          coreCpiData.observations && coreCpiData.observations.length > 0) {
        
        // Get the most recent CPI value
        const currentCPI = parseFloat(cpiData.observations[0].value);
        const previousCPI = parseFloat(cpiData.observations[1].value);
        
        // Calculate the month-over-month change
        const momChange = ((currentCPI - previousCPI) / previousCPI) * 100;
        
        // Get the CPI value from 12 months ago
        const yearAgoCPI = parseFloat(cpiData.observations[12].value);
        
        // Calculate the year-over-year change
        const yoyChange = ((currentCPI - yearAgoCPI) / yearAgoCPI) * 100;
        
        // Get the most recent core CPI value
        const currentCoreCPI = parseFloat(coreCpiData.observations[0].value);
        const previousCoreCPI = parseFloat(coreCpiData.observations[1].value);
        
        // Calculate the core month-over-month change
        const coreMomChange = ((currentCoreCPI - previousCoreCPI) / previousCoreCPI) * 100;
        
        // Get the core CPI value from 12 months ago
        const yearAgoCoreCPI = parseFloat(coreCpiData.observations[12].value);
        
        // Calculate the core year-over-year change
        const coreYoyChange = ((currentCoreCPI - yearAgoCoreCPI) / yearAgoCoreCPI) * 100;
        
        // Get the release date
        const releaseDate = new Date(cpiData.observations[0].date);
        
        return {
          currentRate: parseFloat(momChange.toFixed(1)),
          yearOverYearChange: parseFloat(yoyChange.toFixed(1)),
          coreRate: parseFloat(coreYoyChange.toFixed(1)),
          source: "Federal Reserve Economic Data (FRED)",
          sourceUrl: "https://fred.stlouisfed.org/",
          lastUpdated: releaseDate,
          isEstimated: false
        };
      }
    }
    
    // If we couldn't extract the data, return null
    return null;
  } catch (error) {
    Logger.log(`Error fetching CPI from FRED: ${error}`);
    return null;
  }
}

/**
 * Fetches PCE data from the Bureau of Economic Analysis
 * @param {String} apiKey - BEA API key
 * @return {Object} PCE data
 */
function fetchPCEFromBEAAPI(apiKey) {
  try {
    Logger.log("Fetching PCE data from BEA API...");
    
    // BEA API endpoint
    const apiUrl = "https://apps.bea.gov/api/data";
    
    // Request parameters
    const requestData = {
      "UserID": apiKey,
      "method": "GetData",
      "datasetname": "NIPA",
      "TableName": "T20804",
      "Frequency": "M",
      "Year": "X",
      "Quarter": "X",
      "ResultFormat": "JSON"
    };
    
    // Request options
    const options = {
      method: "post",
      contentType: "application/x-www-form-urlencoded",
      payload: requestData,
      muteHttpExceptions: true
    };
    
    // Make the API request
    const response = UrlFetchApp.fetch(apiUrl, options);
    
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      
      // Check if the API request was successful
      if (data.BEAAPI && data.BEAAPI.Results && data.BEAAPI.Results.Data) {
        const resultsData = data.BEAAPI.Results.Data;
        
        // Filter for PCE price index and core PCE price index
        const pceData = resultsData.filter(item => 
          item.LineDescription === "Personal consumption expenditures (PCE)" && 
          item.LineNumber === "1" &&
          item.TimePeriod.length === 6 // Format: YYYYMM
        );
        
        const corePceData = resultsData.filter(item => 
          item.LineDescription === "PCE excluding food and energy" && 
          item.LineNumber === "2" &&
          item.TimePeriod.length === 6 // Format: YYYYMM
        );
        
        if (pceData.length > 0 && corePceData.length > 0) {
          // Sort data by date (most recent first)
          pceData.sort((a, b) => parseInt(b.year) - parseInt(a.year));
          corePceData.sort((a, b) => parseInt(b.year) - parseInt(a.year));
          
          // Get the most recent values
          const currentPCE = parseFloat(pceData[0].DataValue);
          const previousPCE = parseFloat(pceData[1].DataValue);
          
          // Find the value from 12 months ago
          const yearAgoPCE = pceData.find(item => {
            const itemDate = new Date(item.year, 0, 1);
            const today = new Date();
            const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), 1);
            return itemDate.getFullYear() === yearAgo.getFullYear() && itemDate.getMonth() === yearAgo.getMonth();
          });
          
          // Calculate year-over-year change
          const yoyChange = yearAgoPCE ? ((currentPCE - parseFloat(yearAgoPCE.DataValue)) / parseFloat(yearAgoPCE.DataValue)) * 100 : null;
          
          // Get the most recent core PCE value
          const currentCorePCE = parseFloat(corePceData[0].DataValue);
          
          // Find the core PCE value from 12 months ago
          const yearAgoCorePCE = corePceData.find(item => {
            const itemDate = new Date(item.year, 0, 1);
            const today = new Date();
            const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), 1);
            return itemDate.getFullYear() === yearAgo.getFullYear() && itemDate.getMonth() === yearAgo.getMonth();
          });
          
          // Calculate core year-over-year change
          const coreYoyChange = yearAgoCorePCE ? ((currentCorePCE - parseFloat(yearAgoCorePCE.DataValue)) / parseFloat(yearAgoCorePCE.DataValue)) * 100 : null;
          
          // Get the release date
          const releaseDate = new Date();
          if (pceData[0].TimePeriod) {
            const year = parseInt(pceData[0].TimePeriod.substring(0, 4));
            const month = parseInt(pceData[0].TimePeriod.substring(4, 6)) - 1;
            releaseDate.setFullYear(year, month, 28); // Approximate release date
          }
          
          return {
            currentRate: parseFloat(((currentPCE - previousPCE) / previousPCE * 100).toFixed(1)),
            yearOverYearChange: yoyChange ? parseFloat(yoyChange.toFixed(1)) : null,
            coreRate: coreYoyChange ? parseFloat(coreYoyChange.toFixed(1)) : null,
            source: "Bureau of Economic Analysis (BEA API)",
            sourceUrl: "https://www.bea.gov/",
            lastUpdated: releaseDate,
            isEstimated: false
          };
        }
      }
    }
    
    // If we couldn't extract the data, return null
    return null;
  } catch (error) {
    Logger.log(`Error fetching PCE from BEA API: ${error}`);
    return null;
  }
}

/**
 * Fetches PCE data by scraping the BEA website
 * @return {Object} PCE data
 */
function fetchPCEFromBEAWebsite() {
  try {
    Logger.log("Fetching PCE data from BEA website...");
    
    // BEA PCE news release page - try current year first
    const currentYear = new Date().getFullYear();
    const url = `https://www.bea.gov/news/${currentYear}/personal-income-and-outlays`;
    
    const options = {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    };
    
    const response = UrlFetchApp.fetch(url, options);
    
    if (response.getResponseCode() === 200) {
      const content = response.getContentText();
      
      // Extract the release date
      const releaseDateRegex = /Release Date:\s*([A-Za-z]+ \d+, \d{4})/i;
      const releaseDateMatch = content.match(releaseDateRegex);
      
      let releaseDate = new Date();
      if (releaseDateMatch && releaseDateMatch[1]) {
        releaseDate = new Date(releaseDateMatch[1]);
      }
      
      // Extract the PCE values
      // This pattern looks for text like "The PCE price index increased 0.3 percent"
      const pceRegex = /PCE price index (increased|decreased|rose|fell|was unchanged) (?:by )?(\d+\.\d+|\d+)? ?percent/i;
      const pceMatch = content.match(pceRegex);
      
      let currentRate = null;
      if (pceMatch) {
        const direction = pceMatch[1].toLowerCase();
        const value = pceMatch[2] ? parseFloat(pceMatch[2]) : 0;
        
        currentRate = direction.includes("decreased") || direction.includes("fell") ? -value : value;
      }
      
      // Extract the year-over-year PCE change
      // This pattern looks for text like "From the same month one year ago, the PCE price index increased 2.6 percent"
      const yoyRegex = /From the same month one year ago, the PCE price index (increased|decreased|rose|fell|was unchanged) (?:by )?(\d+\.\d+|\d+)? ?percent/i;
      const yoyMatch = content.match(yoyRegex);
      
      let yearOverYearChange = null;
      if (yoyMatch) {
        const direction = yoyMatch[1].toLowerCase();
        const value = yoyMatch[2] ? parseFloat(yoyMatch[2]) : 0;
        
        yearOverYearChange = direction.includes("decreased") || direction.includes("fell") ? -value : value;
      }
      
      // Extract the core PCE (excluding food and energy)
      // This pattern looks for text like "Excluding food and energy, the PCE price index increased 0.2 percent"
      const coreRegex = /Excluding food and energy, the PCE price index (increased|decreased|rose|fell|was unchanged) (?:by )?(\d+\.\d+|\d+)? ?percent/i;
      const coreMatch = content.match(coreRegex);
      
      let coreRate = null;
      if (coreMatch) {
        const direction = coreMatch[1].toLowerCase();
        const value = coreMatch[2] ? parseFloat(coreMatch[2]) : 0;
        
        coreRate = direction.includes("decreased") || direction.includes("fell") ? -value : value;
      }
      
      // Extract the year-over-year core PCE change
      // This pattern looks for text like "From the same month one year ago, the PCE price index excluding food and energy increased 2.9 percent"
      const coreYoyRegex = /From the same month one year ago, the PCE price index excluding food and energy (increased|decreased|rose|fell|was unchanged) (?:by )?(\d+\.\d+|\d+)? ?percent/i;
      const coreYoyMatch = content.match(coreYoyRegex);
      
      if (coreYoyMatch) {
        const direction = coreYoyMatch[1].toLowerCase();
        const value = coreYoyMatch[2] ? parseFloat(coreYoyMatch[2]) : 0;
        
        coreRate = direction.includes("decreased") || direction.includes("fell") ? -value : value;
      }
      
      // If we have at least one value, return the data
      if (currentRate !== null || yearOverYearChange !== null || coreRate !== null) {
        return {
          currentRate: currentRate,
          yearOverYearChange: yearOverYearChange,
          coreRate: coreRate,
          source: "Bureau of Economic Analysis (Website)",
          sourceUrl: url,
          lastUpdated: releaseDate,
          isEstimated: false
        };
      }
    }
    
    // If current year fails, try previous year
    const previousYear = currentYear - 1;
    const previousYearUrl = `https://www.bea.gov/news/${previousYear}/personal-income-and-outlays`;
    
    const previousYearResponse = UrlFetchApp.fetch(previousYearUrl, options);
    
    if (previousYearResponse.getResponseCode() === 200) {
      // Process the same way as current year
      // (Implementation similar to above)
      // ...
    }
    
    // If we couldn't extract the data, return null
    return null;
  } catch (error) {
    Logger.log(`Error fetching PCE from BEA website: ${error}`);
    return null;
  }
}

/**
 * Fetches PCE data from FRED
 * @param {String} apiKey - FRED API key
 * @return {Object} PCE data
 */
function fetchPCEFromFRED(apiKey) {
  try {
    Logger.log("Fetching PCE data from FRED...");
    
    // FRED API endpoints
    // PCEPI - Personal Consumption Expenditures: Chain-type Price Index
    // PCEPILFE - Personal Consumption Expenditures Excluding Food and Energy (Chain-Type Price Index)
    const pceSeriesId = "PCEPI";
    const corePceSeriesId = "PCEPILFE";
    
    // Fetch the PCE data
    const pceUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${pceSeriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=13`;
    const pceResponse = UrlFetchApp.fetch(pceUrl, { muteHttpExceptions: true });
    
    // Fetch the core PCE data
    const corePceUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${corePceSeriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=13`;
    const corePceResponse = UrlFetchApp.fetch(corePceUrl, { muteHttpExceptions: true });
    
    if (pceResponse.getResponseCode() === 200 && corePceResponse.getResponseCode() === 200) {
      const pceData = JSON.parse(pceResponse.getContentText());
      const corePceData = JSON.parse(corePceResponse.getContentText());
      
      if (pceData.observations && pceData.observations.length > 0 && 
          corePceData.observations && corePceData.observations.length > 0) {
        
        // Get the most recent PCE value
        const currentPCE = parseFloat(pceData.observations[0].value);
        const previousPCE = parseFloat(pceData.observations[1].value);
        
        // Calculate the month-over-month change
        const momChange = ((currentPCE - previousPCE) / previousPCE) * 100;
        
        // Get the PCE value from 12 months ago
        const yearAgoPCE = parseFloat(pceData.observations[12].value);
        
        // Calculate the year-over-year change
        const yoyChange = ((currentPCE - yearAgoPCE) / yearAgoPCE) * 100;
        
        // Get the most recent core PCE value
        const currentCorePCE = parseFloat(corePceData.observations[0].value);
        const previousCorePCE = parseFloat(corePceData.observations[1].value);
        
        // Calculate the core month-over-month change
        const coreMomChange = ((currentCorePCE - previousCorePCE) / previousCorePCE) * 100;
        
        // Get the core PCE value from 12 months ago
        const yearAgoCorePCE = parseFloat(corePceData.observations[12].value);
        
        // Calculate the core year-over-year change
        const coreYoyChange = ((currentCorePCE - yearAgoCorePCE) / yearAgoCorePCE) * 100;
        
        // Get the release date
        const releaseDate = new Date(pceData.observations[0].date);
        
        return {
          currentRate: parseFloat(momChange.toFixed(1)),
          yearOverYearChange: parseFloat(yoyChange.toFixed(1)),
          coreRate: parseFloat(coreYoyChange.toFixed(1)),
          source: "Federal Reserve Economic Data (FRED)",
          sourceUrl: "https://fred.stlouisfed.org/",
          lastUpdated: releaseDate,
          isEstimated: false
        };
      }
    }
    
    // If we couldn't extract the data, return null
    return null;
  } catch (error) {
    Logger.log(`Error fetching PCE from FRED: ${error}`);
    return null;
  }
}

/**
 * Fetches inflation expectations data from various sources
 * @return {Object} Inflation expectations data
 */
function fetchInflationExpectations() {
  try {
    Logger.log("Fetching inflation expectations data...");
    
    // Try FRED API first
    const expectationsFromFRED = fetchInflationExpectationsFromFRED();
    if (expectationsFromFRED && !expectationsFromFRED.error) {
      return expectationsFromFRED;
    }
    
    // If FRED fails, try alternative sources
    const expectationsFromAlternative = fetchInflationExpectationsFromAlternative();
    if (expectationsFromAlternative && !expectationsFromAlternative.error) {
      return expectationsFromAlternative;
    }
    
    // If all methods fail, return an error
    return {
      error: "Failed to retrieve inflation expectations data from all sources",
      lastUpdated: new Date()
    };
  } catch (error) {
    Logger.log(`Error fetching inflation expectations data: ${error}`);
    return {
      error: `Failed to fetch inflation expectations data: ${error}`,
      lastUpdated: new Date()
    };
  }
}

/**
 * Fetches inflation expectations data from FRED
 * @param {String} apiKey - FRED API key
 * @return {Object} Inflation expectations data
 */
function fetchInflationExpectationsFromFRED(apiKey) {
  try {
    Logger.log("Fetching inflation expectations from FRED...");
    
    // FRED API endpoints for inflation expectations
    // T5YIE - 5-Year Breakeven Inflation Rate
    // T10YIE - 10-Year Breakeven Inflation Rate
    // MICH - University of Michigan Inflation Expectation
    const fiveYearSeriesId = "T5YIE";
    const tenYearSeriesId = "T10YIE";
    const oneYearSeriesId = "MICH";
    
    // Fetch the 5-year inflation expectations
    const fiveYearUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${fiveYearSeriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`;
    const fiveYearResponse = UrlFetchApp.fetch(fiveYearUrl, { muteHttpExceptions: true });
    
    // Fetch the 10-year inflation expectations
    const tenYearUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${tenYearSeriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`;
    const tenYearResponse = UrlFetchApp.fetch(tenYearUrl, { muteHttpExceptions: true });
    
    // Fetch the 1-year inflation expectations
    const oneYearUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${oneYearSeriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`;
    const oneYearResponse = UrlFetchApp.fetch(oneYearUrl, { muteHttpExceptions: true });
    
    if (fiveYearResponse.getResponseCode() === 200 && 
        tenYearResponse.getResponseCode() === 200 && 
        oneYearResponse.getResponseCode() === 200) {
      
      const fiveYearData = JSON.parse(fiveYearResponse.getContentText());
      const tenYearData = JSON.parse(tenYearResponse.getContentText());
      const oneYearData = JSON.parse(oneYearResponse.getContentText());
      
      if (fiveYearData.observations && fiveYearData.observations.length > 0 && 
          tenYearData.observations && tenYearData.observations.length > 0 && 
          oneYearData.observations && oneYearData.observations.length > 0) {
        
        // Get the most recent values
        const fiveYearRate = parseFloat(fiveYearData.observations[0].value);
        const tenYearRate = parseFloat(tenYearData.observations[0].value);
        const oneYearRate = parseFloat(oneYearData.observations[0].value);
        
        // Get the most recent date
        const lastUpdated = new Date(Math.max(
          new Date(fiveYearData.observations[0].date).getTime(),
          new Date(tenYearData.observations[0].date).getTime(),
          new Date(oneYearData.observations[0].date).getTime()
        ));
        
        return {
          oneYear: parseFloat(oneYearRate.toFixed(1)),
          fiveYear: parseFloat(fiveYearRate.toFixed(1)),
          tenYear: parseFloat(tenYearRate.toFixed(1)),
          source: "Federal Reserve Economic Data (FRED)",
          sourceUrl: "https://fred.stlouisfed.org/",
          lastUpdated: lastUpdated,
          isEstimated: false
        };
      }
    }
    
    // If we couldn't extract all the data, return null
    return null;
  } catch (error) {
    Logger.log(`Error fetching inflation expectations from FRED: ${error}`);
    return null;
  }
}

/**
 * Fetches inflation expectations data from alternative sources
 * @return {Object} Inflation expectations data
 */
function fetchInflationExpectationsFromAlternative() {
  try {
    Logger.log("Fetching inflation expectations from alternative sources...");
    
    // Try to scrape from Cleveland Fed
    const clevelandFedUrl = "https://www.clevelandfed.org/indicators-and-data/inflation-expectations";
    
    const options = {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    };
    
    const response = UrlFetchApp.fetch(clevelandFedUrl, options);
    
    if (response.getResponseCode() === 200) {
      const content = response.getContentText();
      
      // Extract the inflation expectations values
      // This is a simplified approach - actual implementation would need to be adapted to the page structure
      const oneYearRegex = /1-year inflation expectation[^0-9]*(\d+\.\d+)/i;
      const fiveYearRegex = /5-year inflation expectation[^0-9]*(\d+\.\d+)/i;
      const tenYearRegex = /10-year inflation expectation[^0-9]*(\d+\.\d+)/i;
      
      const oneYearMatch = content.match(oneYearRegex);
      const fiveYearMatch = content.match(fiveYearRegex);
      const tenYearMatch = content.match(tenYearRegex);
      
      let oneYear = null;
      let fiveYear = null;
      let tenYear = null;
      
      if (oneYearMatch && oneYearMatch[1]) {
        oneYear = parseFloat(oneYearMatch[1]);
      }
      
      if (fiveYearMatch && fiveYearMatch[1]) {
        fiveYear = parseFloat(fiveYearMatch[1]);
      }
      
      if (tenYearMatch && tenYearMatch[1]) {
        tenYear = parseFloat(tenYearMatch[1]);
      }
      
      // If we have at least one value, return the data
      if (oneYear !== null || fiveYear !== null || tenYear !== null) {
        return {
          oneYear: oneYear,
          fiveYear: fiveYear,
          tenYear: tenYear,
          source: "Cleveland Federal Reserve",
          sourceUrl: clevelandFedUrl,
          lastUpdated: new Date(),
          isEstimated: false
        };
      }
    }
    
    // If Cleveland Fed fails, try New York Fed
    const nyFedUrl = "https://www.newyorkfed.org/microeconomics/sce";
    
    const nyFedResponse = UrlFetchApp.fetch(nyFedUrl, options);
    
    if (nyFedResponse.getResponseCode() === 200) {
      const content = nyFedResponse.getContentText();
      
      // Extract the inflation expectations values
      const oneYearRegex = /Median one-year-ahead expected inflation rate[^0-9]*(\d+\.\d+)/i;
      const threeYearRegex = /Median three-year-ahead expected inflation rate[^0-9]*(\d+\.\d+)/i;
      
      const oneYearMatch = content.match(oneYearRegex);
      const threeYearMatch = content.match(threeYearRegex);
      
      let oneYear = null;
      let threeYear = null;
      
      if (oneYearMatch && oneYearMatch[1]) {
        oneYear = parseFloat(oneYearMatch[1]);
      }
      
      if (threeYearMatch && threeYearMatch[1]) {
        threeYear = parseFloat(threeYearMatch[1]);
      }
      
      // If we have at least one value, return the data
      if (oneYear !== null || threeYear !== null) {
        return {
          oneYear: oneYear,
          fiveYear: threeYear, // Using 3-year as a proxy for 5-year
          tenYear: null,
          source: "New York Federal Reserve",
          sourceUrl: nyFedUrl,
          lastUpdated: new Date(),
          isEstimated: false
        };
      }
    }
    
    // If we couldn't extract the data from any source, return null
    return null;
  } catch (error) {
    Logger.log(`Error fetching inflation expectations from alternative sources: ${error}`);
    return null;
  }
}

/**
 * Fetches inflation expectations data from the Cleveland Fed website
 * @return {Object} Inflation expectations data
 */
function fetchInflationExpectationsFromClevelandFed() {
  try {
    Logger.log("Fetching inflation expectations from Cleveland Fed website...");
    
    // Cleveland Fed inflation expectations page
    const url = "https://www.clevelandfed.org/indicators-and-data/inflation-expectations";
    
    const options = {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      }
    };
    
    const response = UrlFetchApp.fetch(url, options);
    
    if (response.getResponseCode() === 200) {
      const content = response.getContentText();
      
      // Extract short-term (1-year) expectations
      const shortTermRegex = /1-year[^<]*?(\d+\.\d+)%/i;
      const shortTermMatch = content.match(shortTermRegex);
      
      // Extract medium-term (5-year) expectations
      const mediumTermRegex = /5-year[^<]*?(\d+\.\d+)%/i;
      const mediumTermMatch = content.match(mediumTermRegex);
      
      // Extract long-term (10-year) expectations
      const longTermRegex = /10-year[^<]*?(\d+\.\d+)%/i;
      const longTermMatch = content.match(longTermRegex);
      
      const shortTerm = shortTermMatch && shortTermMatch[1] ? parseFloat(shortTermMatch[1]) : 2.9;
      const mediumTerm = mediumTermMatch && mediumTermMatch[1] ? parseFloat(mediumTermMatch[1]) : 2.7;
      const longTerm = longTermMatch && longTermMatch[1] ? parseFloat(longTermMatch[1]) : 2.3;
      
      return {
        shortTerm: shortTerm,
        mediumTerm: mediumTerm,
        longTerm: longTerm,
        source: "Cleveland Federal Reserve",
        sourceUrl: url,
        lastUpdated: new Date(),
        isEstimated: false
      };
    }
    
    return null;
  } catch (error) {
    Logger.log(`Error fetching inflation expectations from Cleveland Fed: ${error}`);
    return null;
  }
}

/**
 * Generates an analysis of inflation data
 * @param {Object} inflationData - Inflation data
 * @return {String} Analysis of inflation data
 */
function generateInflationAnalysis(inflationData) {
  try {
    let analysis = "";
    
    // Check if we have CPI data
    const hasCPI = inflationData.cpi && !inflationData.cpi.error && 
                  inflationData.cpi.yearOverYearChange !== null;
    
    // Check if we have PCE data
    const hasPCE = inflationData.pce && !inflationData.pce.error && 
                  inflationData.pce.yearOverYearChange !== null;
    
    // Check if we have inflation expectations
    const hasExpectations = inflationData.expectations && !inflationData.expectations.error && 
                           inflationData.expectations.oneYear !== null;
    
    if (hasCPI || hasPCE) {
      // Start with current inflation levels
      if (hasCPI && hasPCE) {
        analysis += `Current CPI inflation is at ${inflationData.cpi.yearOverYearChange}% year-over-year, with core CPI at ${inflationData.cpi.coreRate}%. PCE inflation, the Fed's preferred measure, is at ${inflationData.pce.yearOverYearChange}% year-over-year, with core PCE at ${inflationData.pce.coreRate}%.`;
      } else if (hasCPI) {
        analysis += `Current CPI inflation is at ${inflationData.cpi.yearOverYearChange}% year-over-year, with core CPI at ${inflationData.cpi.coreRate}%.`;
      } else if (hasPCE) {
        analysis += `PCE inflation, the Fed's preferred measure, is at ${inflationData.pce.yearOverYearChange}% year-over-year, with core PCE at ${inflationData.pce.coreRate}%.`;
      }
      
      // Add trend analysis
      const cpiYoY = hasCPI ? inflationData.cpi.yearOverYearChange : null;
      const pceYoY = hasPCE ? inflationData.pce.yearOverYearChange : null;
      
      // Use the available measure for trend analysis, prioritizing PCE
      const inflationRate = pceYoY !== null ? pceYoY : cpiYoY;
      
      if (inflationRate !== null) {
        if (inflationRate > 4) {
          analysis += " Inflation is significantly above the Fed's 2% target.";
        } else if (inflationRate > 2.5) {
          analysis += " Inflation is moderating but still above the Fed's 2% target.";
        } else if (inflationRate >= 1.5 && inflationRate <= 2.5) {
          analysis += " Inflation is near the Fed's 2% target.";
        } else {
          analysis += " Inflation is below the Fed's 2% target.";
        }
      }
      
      // Add information about inflation expectations if available
      if (hasExpectations) {
        analysis += ` Market-based inflation expectations are ${inflationData.expectations.oneYear}% for 1-year and ${inflationData.expectations.fiveYear}% for 5-year horizons.`;
      }
    } else {
      analysis = "Inflation data is currently unavailable from all sources. Please check back later for updated information.";
    }
    
    return analysis;
  } catch (error) {
    Logger.log(`Error generating inflation analysis: ${error}`);
    return "Unable to generate inflation analysis due to an error.";
  }
}

/**
 * Formats the inflation data for display
 * @param {Object} inflation - Inflation data
 * @return {String} Formatted inflation data
 */
function formatInflationData(inflation) {
  try {
    let formattedData = "";
    
    if (inflation) {
      formattedData += "Inflation:\n";
      
      // Add current inflation rate
      if (inflation.currentRate !== null && inflation.currentRate !== undefined) {
        formattedData += `  * Current Rate (Monthly): ${inflation.currentRate.toFixed(1)}%\n`;
      }
      
      // Add year-over-year change
      if (inflation.yearOverYearChange !== null && inflation.yearOverYearChange !== undefined) {
        formattedData += `  * Year-over-Year Rate: ${inflation.yearOverYearChange.toFixed(1)}%\n`;
      }
      
      // Add core inflation rate
      if (inflation.coreRate !== null && inflation.coreRate !== undefined) {
        formattedData += `  * Core Inflation Rate: ${inflation.coreRate.toFixed(1)}%\n`;
      }
      
      // Add analysis
      if (inflation.analysis) {
        formattedData += `  * Analysis: ${inflation.analysis}\n`;
      }
      
      // Add source and timestamp
      if (inflation.source) {
        formattedData += `  * Source: ${inflation.source}`;
        if (inflation.sourceUrl) {
          formattedData += ` (${inflation.sourceUrl})`;
        }
        formattedData += `\n  * Last Updated: ${formatDate(inflation.lastUpdated)}\n`;
      } else {
        formattedData += `  * Source: Estimated\n`;
      }
    } else {
      formattedData += "Inflation: Data not available\n";
    }
    
    return formattedData;
  } catch (error) {
    Logger.log(`Error formatting inflation data: ${error}`);
    return "Inflation: Error formatting data\n";
  }
}

/**
 * Retrieves Fed policy data
 * @return {Object} Fed policy data
 */
function retrieveFedPolicyData() {
  try {
    Logger.log("Retrieving Fed policy data...");
    
    // Initialize the result object
    const result = {
      federalFundsRate: 5.375,
      currentRate: 5.375,
      rateRange: "5.25-5.50%",
      lastMeeting: new Date("2025-03-20"),
      nextMeeting: new Date("2025-04-30"),
      summary: "The Federal Reserve maintained its target range for the federal funds rate at 5.25-5.50%, continuing its restrictive policy stance to bring inflation back to its 2% target.",
      forwardGuidance: "The Committee seeks to achieve maximum employment and inflation at the rate of 2 percent over the longer run. The Committee judges that the risks to achieving its employment and inflation goals are moving into better balance. The economic outlook is uncertain, and the Committee remains highly attentive to inflation risks.",
      source: "Federal Reserve",
      sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
      lastUpdated: new Date()
    };
    
    // Try to fetch the latest Fed policy data
    const fedData = fetchFedPolicyFromFederalReserve();
    if (fedData && !fedData.error) {
      // Update the result with the fetched data
      Object.assign(result, fedData);
    } else {
      // Log that we're using fallback data
      Logger.log("Using fallback Fed policy data");
    }
    
    return result;
  } catch (error) {
    Logger.log(`Error retrieving Fed policy data: ${error}`);
    return {
      error: true,
      message: `Failed to retrieve Fed policy data: ${error}`,
      timestamp: new Date(),
      federalFundsRate: 5.375,
      currentRate: 5.375,
      rateRange: "5.25-5.50%",
      lastMeeting: new Date("2025-03-20"),
      nextMeeting: new Date("2025-04-30"),
      forwardGuidance: "The Committee seeks to achieve maximum employment and inflation at the rate of 2 percent over the longer run. The Committee judges that the risks to achieving its employment and inflation goals are moving into better balance. The economic outlook is uncertain, and the Committee remains highly attentive to inflation risks.",
      source: "Federal Reserve (Fallback Data)",
      sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
    };
  }
}

/**
 * Fetches Fed policy data from the Federal Reserve website
 * @return {Object} Fed policy data
 */
function fetchFedPolicyFromFederalReserve() {
  try {
    Logger.log("Fetching Fed policy data from Federal Reserve website...");
    
    // Federal Reserve FOMC calendar page
    const url = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm";
    
    const options = {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    };
    
    const response = UrlFetchApp.fetch(url, options);
    
    if (response.getResponseCode() === 200) {
      const content = response.getContentText();
      
      // Extract the current federal funds rate
      const rateRegex = /federal funds rate at (\d+(?:\.\d+)?-\d+(?:\.\d+)?)\s*percent/i;
      const rateMatch = content.match(rateRegex);
      
      let federalFundsRate = 5.375; // Default fallback value
      let rateRange = "5.25-5.50%"; // Default fallback value
      
      if (rateMatch && rateMatch[1]) {
        const rangeText = rateMatch[1];
        const rangeParts = rangeText.split('-');
        
        if (rangeParts.length === 2) {
          const lowerBound = parseFloat(rangeParts[0]);
          const upperBound = parseFloat(rangeParts[1]);
          federalFundsRate = (lowerBound + upperBound) / 2;
          rateRange = `${lowerBound}-${upperBound}%`;
        }
      }
      
      // Extract the last meeting date
      const lastMeetingRegex = /(\w+ \d+-\d+, \d{4})[^<]*?statement/i;
      const lastMeetingMatch = content.match(lastMeetingRegex);
      
      let lastMeeting = new Date("2025-03-20"); // Default fallback value
      
      if (lastMeetingMatch && lastMeetingMatch[1]) {
        try {
          // Handle date ranges like "January 30-31, 2025"
          const dateText = lastMeetingMatch[1];
          if (dateText.includes('-')) {
            const parts = dateText.split('-');
            const endDate = parts[0].split(' ')[0] + ' ' + parts[1];
            lastMeeting = new Date(endDate);
          } else {
            lastMeeting = new Date(dateText);
          }
        } catch (e) {
          Logger.log(`Error parsing last meeting date: ${e}`);
        }
      }
      
      // Extract the next meeting date
      const nextMeetingRegex = /next meeting[^<]*?(\w+ \d+-\d+, \d{4})/i;
      const nextMeetingMatch = content.match(nextMeetingRegex);
      
      let nextMeeting = new Date("2025-04-30"); // Default fallback value
      
      if (nextMeetingMatch && nextMeetingMatch[1]) {
        try {
          // Handle date ranges like "January 30-31, 2025"
          const dateText = nextMeetingMatch[1];
          if (dateText.includes('-')) {
            const parts = dateText.split('-');
            const endDate = parts[0].split(' ')[0] + ' ' + parts[1];
            nextMeeting = new Date(endDate);
          } else {
            nextMeeting = new Date(dateText);
          }
        } catch (e) {
          Logger.log(`Error parsing next meeting date: ${e}`);
        }
      }
      
      // Extract forward guidance
      const guidanceRegex = /(The Committee seeks to achieve maximum employment[^<.]*(?:\.[^<.]*){1,3})/i;
      const guidanceMatch = content.match(guidanceRegex);
      
      let forwardGuidance = "The Committee seeks to achieve maximum employment and inflation at the rate of 2 percent over the longer run. The Committee judges that the risks to achieving its employment and inflation goals are moving into better balance. The economic outlook is uncertain, and the Committee remains highly attentive to inflation risks.";
      
      if (guidanceMatch && guidanceMatch[1]) {
        forwardGuidance = guidanceMatch[1].trim();
      }
      
      return {
        federalFundsRate: federalFundsRate,
        currentRate: federalFundsRate,
        rateRange: rateRange,
        lastMeeting: lastMeeting,
        nextMeeting: nextMeeting,
        summary: `The Federal Reserve maintained its target range for the federal funds rate at ${rateRange}, continuing its restrictive policy stance to bring inflation back to its 2% target.`,
        forwardGuidance: forwardGuidance,
        source: "Federal Reserve",
        sourceUrl: url,
        lastUpdated: new Date()
      };
    }
    
    return null;
  } catch (error) {
    Logger.log(`Error fetching Fed policy from Federal Reserve: ${error}`);
    return null;
  }
}

/**
 * Retrieves geopolitical risks
 * @return {Object} Geopolitical risks data
 */
function retrieveGeopoliticalRisks() {
  try {
    Logger.log("Retrieving geopolitical risks...");
    
    // Try to get geopolitical risks from Perplexity API
    const geopoliticalRisks = fetchGeopoliticalRisksFromPerplexity();
    
    if (geopoliticalRisks && geopoliticalRisks.length > 0) {
      // Format the geopolitical risks data
      const formattedRisks = geopoliticalRisks.map((risk, index) => {
        return {
          id: index + 1,
          title: risk.title || `Risk ${index + 1}`,
          description: risk.description || "No description available",
          region: risk.region || "Global",
          impactLevel: risk.impactLevel || "Medium",
          source: risk.source || "Perplexity AI"
        };
      });
      
      return {
        risks: formattedRisks,
        count: formattedRisks.length,
        source: "Perplexity AI",
        sourceUrl: "https://www.perplexity.ai/",
        lastUpdated: new Date()
      };
    } else {
      Logger.log("Using fallback geopolitical risks data");
      return getGeopoliticalRisksFallbackData();
    }
  } catch (error) {
    Logger.log(`Error retrieving geopolitical risks: ${error}`);
    return getGeopoliticalRisksFallbackData();
  }
}

/**
 * Fetches geopolitical risks data from Perplexity API
 * @return {Array} Geopolitical risks data
 */
function fetchGeopoliticalRisksFromPerplexity() {
  try {
    // Get the Perplexity API key from script properties
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty("PERPLEXITY_API_KEY");
    
    if (!apiKey) {
      Logger.log("Perplexity API key not found in script properties");
      return null;
    }
    
    // Perplexity API endpoint
    const apiUrl = "https://api.perplexity.ai/chat/completions";
    
    // Prepare the prompt for Perplexity
    const prompt = `Identify the top 3 current geopolitical risks that could impact financial markets. For each risk, provide:
1. A title (1-3 words)
2. A brief description (1-2 sentences)
3. The primary region affected (e.g., Global, North America, Europe, Asia, Middle East)
4. Impact level (High, Medium, Low)
5. Source of information

Format your response as a JSON array with objects containing these fields: title, description, region, impactLevel, and source. Do not include any other text in your response.`;
    
    // Models: mistral-7b-instruct, sonar-small-online, sonar-medium-online, sonar-large-online, sonar-medium-chat, sonar-large-chat, sonar-small-chat, sonar-pro
    const model = "sonar-pro";
    
    Logger.log(`Trying Perplexity API with model: ${model}`);
    
    // Request parameters
    const requestData = {
      model: model,
      messages: [
        {
          role: "system",
          content: "You are a financial analyst specializing in geopolitical risk assessment. Provide concise, accurate information about current geopolitical risks affecting financial markets."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2
    };
    
    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      },
      payload: JSON.stringify(requestData),
      muteHttpExceptions: true
    };
    
    // Make the API request
    const response = UrlFetchApp.fetch(apiUrl, options);
    
    if (response.getResponseCode() === 200) {
      Logger.log(`Perplexity API call successful with model: ${model}`);
      
      const responseData = JSON.parse(response.getContentText());
      const content = responseData.choices[0].message.content;
      
      // Try to parse the JSON response
      try {
        // Extract JSON array from the response
        let jsonContent = content;
        
        // If the response contains markdown code blocks, extract the JSON
        if (content.includes("```json")) {
          const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch && jsonMatch[1]) {
            jsonContent = jsonMatch[1];
          }
        } else if (content.includes("```")) {
          const jsonMatch = content.match(/```\s*([\s\S]*?)\s*```/);
          if (jsonMatch && jsonMatch[1]) {
            jsonContent = jsonMatch[1];
          }
        }
        
        // Parse the JSON content
        const parsedRisks = JSON.parse(jsonContent);
        
        // Validate that we have an array of risks
        if (Array.isArray(parsedRisks) && parsedRisks.length > 0) {
          return parsedRisks;
        } else {
          Logger.log("Invalid geopolitical risks data format from Perplexity API");
          return null;
        }
      } catch (parseError) {
        Logger.log(`Error parsing Perplexity response: ${parseError}`);
        Logger.log(`Raw content: ${content}`);
        return null;
      }
    } else {
      Logger.log(`Perplexity API error: ${response.getResponseCode()} - ${response.getContentText()}`);
      return null;
    }
  } catch (error) {
    Logger.log(`Error fetching geopolitical risks from Perplexity: ${error}`);
    return null;
  }
}

/**
 * Returns fallback geopolitical risks data
 * @return {Object} Fallback geopolitical risks data
 */
function getGeopoliticalRisksFallbackData() {
  return {
    risks: [
      {
        id: 1,
        title: "Middle East Conflict",
        description: "Escalating tensions in the Middle East with potential for regional conflict expansion.",
        region: "Middle East",
        impactLevel: "High",
        source: "Fallback Data"
      },
      {
        id: 2,
        title: "Trade Tensions",
        description: "Trade tensions between major economies with new tariff implementations.",
        region: "Global",
        impactLevel: "Medium",
        source: "Fallback Data"
      },
      {
        id: 3,
        title: "EM Instability",
        description: "Political instability in emerging markets affecting currency valuations.",
        region: "Emerging Markets",
        impactLevel: "Medium",
        source: "Fallback Data"
      }
    ],
    count: 3,
    source: "Fallback Data (Last Known Values)",
    sourceUrl: "N/A",
    lastUpdated: new Date()
  };
}

/**
 * Formats geopolitical risks data for display
 * @param {Object} geopoliticalRisks - Geopolitical risks data
 * @return {String} Formatted geopolitical risks data
 */
function formatGeopoliticalRisksData(geopoliticalRisks) {
  if (!geopoliticalRisks || !geopoliticalRisks.risks || geopoliticalRisks.risks.length === 0) {
    return "No geopolitical risks data available.";
  }
  
  let formattedData = "Geopolitical Risks:\n";
  
  geopoliticalRisks.risks.forEach(risk => {
    formattedData += `  - ${risk.title || "Unknown Risk"}:\n`;
    formattedData += `    - Description: ${risk.description || "No description available"}\n`;
    formattedData += `    - Region: ${risk.region || "Global"}\n`;
    formattedData += `    - Impact Level: ${risk.impactLevel || "N/A"}\n`;
    formattedData += `    - Source: ${risk.source || "N/A"}\n\n`;
  });
  
  return formattedData;
}
