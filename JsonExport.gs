/**
 * JSON Export Module
 * 
 * This module handles the generation and export of the full JSON dataset
 * for the Market Pulse Daily report.
 */

/**
 * Generates a complete JSON dataset matching the structure of full-sample-data.json
 * This combines data from the OpenAI analysis with additional data from other sources
 * 
 * @param {Object|null} analysisJson - The analysis result JSON object from OpenAI, or null if not available
 * @param {Boolean} debugMode - Whether to include additional debug information
 * @return {Object} Complete JSON dataset
 */
function generateFullJsonDataset(analysisJson, debugMode = false) {
  try {
    // Enable debug logging if debugMode is true
    if (debugMode) {
      Logger.log("Generating full JSON dataset with debug mode enabled");
      if (analysisJson === null) {
        Logger.log("analysisJson is null, will generate dataset with available data only");
      }
    }
    
    // Track if analysisJson was originally null
    const analysisJsonWasNull = analysisJson === null;
    
    // If analysisJson is null, create an empty structure to avoid null reference errors
    if (analysisJsonWasNull) {
      analysisJson = {
        originallyNull: true, // Flag to track that this was generated without AI analysis
        decision: "No Decision",
        summary: "Generated without AI analysis",
        justification: "This report was generated with market data only, without AI analysis.",
        analysis: {
          marketSentiment: {
            overall: "Neutral",
            lastUpdated: new Date().toISOString()
          },
          macroeconomicFactors: {
            geopoliticalRisks: {}
          }
        }
      };
    }
    

    /**
     * Helper function to format dates consistently for the entire report
     * @param {Date|string} date - The date to format (can be Date object or string)
     * @return {string} Formatted date string in the format "MMMM d, yyyy 'at' h:mm a z"
     */
    function formatDate(date) {
      if (!date) return Utilities.formatDate(now, "America/New_York", "MMMM d, yyyy 'at' h:mm a z");
      try {
        // Convert to Date object if needed
        const d = date instanceof Date ? date : new Date(date);
        
        // Check if date is valid
        if (isNaN(d.getTime())) {
          Logger.log(`Invalid date value: ${date}`);
          return Utilities.formatDate(now, "America/New_York", "MMMM d, yyyy 'at' h:mm a z");
        }
        
        return Utilities.formatDate(d, "America/New_York", "MMMM d, yyyy 'at' h:mm a z");
      } catch (e) {
        Logger.log(`Error formatting date: ${e.message}`);
        return Utilities.formatDate(now, "America/New_York", "MMMM d, yyyy 'at' h:mm a z");
      }
    }
    
    // Get the current timestamp
    const now = new Date();
    // Format the current date
    const formattedDate = formatDate(now);
    
    /**
     * Helper function to get a stock name from its symbol using ETF holdings data
     * @param {string} symbol - The stock symbol to look up
     * @param {Array} etfHoldings - Array of ETF holdings objects
     * @return {string} The stock name if found, or the symbol if not found
     */
    function getStockNameFromSymbol(symbol, etfHoldings) {
      // Check each ETF's holdings for the symbol
      for (const etf of etfHoldings) {
        if (etf.holdings && Array.isArray(etf.holdings)) {
          for (const holding of etf.holdings) {
            if (holding.symbol === symbol && holding.name) {
              return holding.name;
            }
          }
        }
      }
      // If not found, return the symbol as the name
      return symbol;
    }
    
    // Get the newsletter name from script properties
    const props = PropertiesService.getScriptProperties();
    let newsletterName = props.getProperty('NEWSLETTER_NAME') || 'Market Pulse Daily';
    
    // Try to retrieve cached allData
    let allData = null;
    try {
      const cache = CacheService.getScriptCache();
      const cachedData = cache.get('allData');
      if (cachedData) {
        allData = JSON.parse(cachedData);
        if (debugMode) {
          Logger.log("Retrieved cached allData successfully");
        }
      } else {
        if (debugMode) {
          Logger.log("No cached allData found");
        }
      }
    } catch (cacheError) {
      if (debugMode) {
        Logger.log(`Error retrieving cached allData: ${cacheError}`);
      }
    }
    
    // If no cached data is available, try to retrieve it fresh
    if (!allData) {
      try {
        allData = retrieveAllData();
        if (debugMode) {
          Logger.log("Retrieved fresh allData successfully");
        }
      } catch (retrievalError) {
        if (debugMode) {
          Logger.log(`Error retrieving fresh allData: ${retrievalError}`);
        }
        // Create a minimal placeholder if we can't get the data
        allData = {
          marketSentiment: { source: "Data unavailable" },
          keyMarketIndicators: { indices: [] },
          fundamentalMetrics: { metrics: {} },
          macroeconomicFactors: {}
        };
      }
    }
    
    // Get S&P 500 analysis data if available
    let sp500Data = null;
    try {
      // Try to get SP500 data from the Lambda service
      const lambdaResponse = SP500Analyzer();
      
      // Debug logging for SP500 data
      if (debugMode) {
        Logger.log("SP500 Lambda Response:");
        Logger.log(JSON.stringify(lambdaResponse, null, 2));
        
        // Add specific debugging for historicalPE in the raw response
        if (lambdaResponse && lambdaResponse.historicalPE) {
          Logger.log("Raw historicalPE data found in Lambda response");
          Logger.log("historicalPE type: " + typeof lambdaResponse.historicalPE);
          if (Array.isArray(lambdaResponse.historicalPE)) {
            Logger.log("historicalPE is an array with " + lambdaResponse.historicalPE.length + " elements");
            if (lambdaResponse.historicalPE.length > 0) {
              Logger.log("First historicalPE element: " + JSON.stringify(lambdaResponse.historicalPE[0]));
            }
          } else if (typeof lambdaResponse.historicalPE === 'object') {
            Logger.log("historicalPE is an object with keys: " + Object.keys(lambdaResponse.historicalPE).join(', '));
            if (lambdaResponse.historicalPE.data) {
              Logger.log("historicalPE.data type: " + typeof lambdaResponse.historicalPE.data);
              if (Array.isArray(lambdaResponse.historicalPE.data)) {
                Logger.log("historicalPE.data is an array with " + lambdaResponse.historicalPE.data.length + " elements");
                if (lambdaResponse.historicalPE.data.length > 0) {
                  Logger.log("First historicalPE.data element: " + JSON.stringify(lambdaResponse.historicalPE.data[0]));
                }
              }
            }
          }
        } else {
          Logger.log("No historicalPE data found in raw Lambda response");
        }
      }
      
      // Parse the Lambda response - it comes with a body property containing a JSON string
      if (lambdaResponse && lambdaResponse.body) {
        try {
          // Parse the body if it's a string
          if (typeof lambdaResponse.body === 'string') {
            sp500Data = JSON.parse(lambdaResponse.body);
          } else {
            // If it's already an object, use it directly
            sp500Data = lambdaResponse.body;
          }
          
          if (debugMode) {
            Logger.log("Retrieved and parsed SP500 analysis data successfully");
            Logger.log(JSON.stringify(sp500Data, null, 2));
          }
        } catch (parseError) {
          if (debugMode) {
            Logger.log(`Error parsing SP500 Lambda response body: ${parseError}`);
            Logger.log(`Raw body: ${lambdaResponse.body}`);
          }
          sp500Data = null;
        }
      } else if (lambdaResponse) {
        // If there's no body property, use the response directly
        sp500Data = lambdaResponse;
        if (debugMode) {
          Logger.log("Retrieved SP500 analysis data (no body property)");
          Logger.log(JSON.stringify(sp500Data, null, 2));
        }
      } else {
        if (debugMode) {
          Logger.log("SP500Analyzer returned null or undefined");
        }
        sp500Data = null;
      }
    } catch (sp500Error) {
      if (debugMode) {
        Logger.log(`Error retrieving SP500 analysis data: ${sp500Error}`);
        Logger.log(`Error stack: ${sp500Error.stack}`);
      }
      // Ensure sp500Data is null in case of error
      sp500Data = null;
    }
    
    // Create the full JSON dataset structure
    const fullJsonDataset = {
      reportDate: now.toISOString(),
      reportDateFormatted: formattedDate,
      reportDateDisplay: "As of " + formattedDate,
      isTest: debugMode,
      // If analysisJson was originally null, add a suffix to the title
      metadata: {
        title: analysisJsonWasNull ? `${newsletterName} (Data Only)` : newsletterName,
        timestamp: formattedDate
      },
      marketSentiment: {
        overall: analysisJson && analysisJson.analysis && analysisJson.analysis.marketSentiment && analysisJson.analysis.marketSentiment.overall ? analysisJson.analysis.marketSentiment.overall : "Neutral",
        analysts: [],
        source: "Aggregated from multiple financial news sources",
        lastUpdated: analysisJson && analysisJson.analysis && analysisJson.analysis.marketSentiment && analysisJson.analysis.marketSentiment.lastUpdated ? analysisJson.analysis.marketSentiment.lastUpdated : formattedDate
      },
      decision: {
        text: analysisJson && analysisJson.decision ? analysisJson.decision : "No Decision",
        summary: analysisJson && analysisJson.summary ? analysisJson.summary : "",
        color: getDecisionColor(analysisJson ? analysisJson.decision : null),
        icon: getDecisionIcon(analysisJson ? analysisJson.decision : null)
      },
      justification: analysisJson && analysisJson.justification ? analysisJson.justification : "",
      marketIndicators: {
        majorIndices: [],
        sectorPerformance: [],
        fearGreed: {
          value: 0,
          category: "Neutral",
          description: "The Fear and Greed Index is currently in a neutral state.",
          previousDay: 0,
          oneWeekAgo: 0,
          oneMonthAgo: 0,
          color: "#888888",
          source: "CNN Money",
          sourceUrl: "https://money.cnn.com/data/fear-and-greed/",
          asOf: formattedDate
        },
        volatilityIndices: [],
        economicEvents: []
      },
      fundamentalMetrics: {
        majorIndices: [],
        otherStocks: []
      },
      macroeconomicFactors: {
        federalReserve: {
          forwardGuidance: "",
          forwardGuidanceSource: {
            name: "Federal Reserve",
            url: "https://www.federalreserve.gov/",
            lastUpdated: formattedDate
          },
          currentRate: {
            target: "0.00% - 0.00%",
            effectiveRate: "0.00%",
            lastUpdated: formattedDate
          },
          nextMeeting: {
            date: "",
            probabilities: {
              increase: 0,
              decrease: 0,
              noChange: 100
            },
            lastUpdated: formattedDate
          }
        },
        treasuryYields: {
          current: [],
          yieldCurve: {
            status: "Normal",
            inverted: false,
            tenYearTwoYearSpread: 0,
            lastUpdated: formattedDate
          }
        },
        inflation: {
          cpi: {
            headline: 0,
            core: 0,
            fiveYear: 0,
            lastUpdated: new Date().toISOString()
          },
          pce: {
            headline: 0,
            core: 0,
            lastUpdated: new Date().toISOString()
          },
          expectations: [],
          trendAnalysis: {
            analysis: "",
            color: "",
            source: "",
            sourceUrl: "",
            asOf: ""
          },
          trend: {
            direction: "",
            outlook: "",
            marketImpact: "",
            asOf: "",
            source: "",
            sourceUrl: ""
          },
          source: "Bureau of Labor Statistics & Federal Reserve",
          sourceUrl: "https://www.bls.gov/cpi/",
          lastUpdated: formattedDate
        },
        geopoliticalRisks: {}
      },
      sp500: sp500Data ? {
        // Index level data
        indexLevel: sp500Data.sp500Index ? sp500Data.sp500Index.price : 0,
        source: {
          name: sp500Data.sp500Index ? sp500Data.sp500Index.sourceName : "Yahoo Finance",
          url: sp500Data.sp500Index ? sp500Data.sp500Index.sourceUrl : "https://finance.yahoo.com/quote/%5EGSPC/",
          asOf: sp500Data.sp500Index ? formatDate(sp500Data.sp500Index.lastUpdated) : formattedDate
        },
        sourceUrl: sp500Data.sp500Index ? sp500Data.sp500Index.sourceUrl : "https://finance.yahoo.com/quote/%5EGSPC/",
        asOf: sp500Data.sp500Index ? formatDate(sp500Data.sp500Index.lastUpdated) : formattedDate,
        
        // Debug historicalPE data
        _debug_historicalPE_exists: !!sp500Data.historicalPE,
        _debug_historicalPE_type: sp500Data.historicalPE ? (Array.isArray(sp500Data.historicalPE) ? 'array' : typeof sp500Data.historicalPE) : 'undefined',
        _debug_historicalPE_keys: sp500Data.historicalPE && typeof sp500Data.historicalPE === 'object' ? Object.keys(sp500Data.historicalPE) : [],
        _debug_trailingPE_exists: !!sp500Data.trailingPE,
        
        // Historical P/E data
        historicalPE: sp500Data.historicalPE ? {
          data: Array.isArray(sp500Data.historicalPE.data) ? sp500Data.historicalPE.data : [],
          years: sp500Data.historicalPE.years || null,
          formattedData: sp500Data.historicalPE.formattedData || null,
          current: sp500Data.historicalPE.current || (sp500Data.trailingPE ? sp500Data.trailingPE.pe : null),
          fiveYearAvg: sp500Data.historicalPE.fiveYearAvg || null,
          tenYearAvg: sp500Data.historicalPE.tenYearAvg || null,
          source: sp500Data.historicalPE.source || "S&P Global",
          sourceUrl: sp500Data.historicalPE.sourceUrl || "https://www.spglobal.com/spdji/en/",
          lastUpdated: sp500Data.historicalPE.lastUpdated ? formatDate(sp500Data.historicalPE.lastUpdated) : formattedDate
        } : null,
        
        // Forward P/E ratio data
        forwardPE: sp500Data.forwardPE ? {
          current: sp500Data.forwardPE.current,
          eps: sp500Data.forwardPE.eps,
          year: sp500Data.forwardPE.year,
          source: sp500Data.forwardPE.source || "FactSet",
          sourceUrl: sp500Data.forwardPE.sourceUrl || "https://www.factset.com/",
          lastUpdated: sp500Data.forwardPE.lastUpdated ? formatDate(sp500Data.forwardPE.lastUpdated) : formattedDate
        } : null,
        
        // Earnings data
        eps: sp500Data.earnings ? {
          ttm: sp500Data.earnings.eps ? `$${sp500Data.earnings.eps}` : null,
          targetAt15x: sp500Data.earnings.eps ? `$${(sp500Data.earnings.eps * 15).toFixed(2)}` : null,
          targetAt17x: sp500Data.earnings.eps ? `$${(sp500Data.earnings.eps * 17).toFixed(2)}` : null,
          targetAt20x: sp500Data.earnings.eps ? `$${(sp500Data.earnings.eps * 20).toFixed(2)}` : null,
          source: sp500Data.earnings ? sp500Data.earnings.sourceName : "Yahoo Finance",
          sourceUrl: sp500Data.earnings ? sp500Data.earnings.sourceUrl : "https://finance.yahoo.com/quote/%5EGSPC/",
          asOf: sp500Data.earnings ? formatDate(sp500Data.earnings.lastUpdated) : formattedDate
        } : null,
        
        // Forward EPS estimates
        forwardEps: sp500Data.forwardEstimates ? sp500Data.forwardEstimates.map(estimate => {
          const currentIndex = sp500Data.sp500Index ? sp500Data.sp500Index.price : 0;
          const eps = estimate.eps || estimate.value;
          return {
            year: estimate.year.toString(),
            eps: `$${eps.toFixed(2)}`,
            targetAt15x: `$${(eps * 15).toFixed(2)}`,
            percentVsIndex15x: currentIndex ? ((eps * 15 / currentIndex - 1) * 100).toFixed(1) : null,
            targetAt17x: `$${(eps * 17).toFixed(2)}`,
            percentVsIndex17x: currentIndex ? ((eps * 17 / currentIndex - 1) * 100).toFixed(1) : null,
            targetAt20x: `$${(eps * 20).toFixed(2)}`,
            percentVsIndex20x: currentIndex ? ((eps * 20 / currentIndex - 1) * 100).toFixed(1) : null
          };
        }) : [],
        forwardEpsSource: sp500Data.forwardEstimates && sp500Data.forwardEstimates.length > 0 ? {
          name: sp500Data.forwardEstimates[0].source || "S&P Global",
          url: sp500Data.forwardEstimates[0].sourceUrl || "https://www.spglobal.com/spdji/en/",
          asOf: formatDate(sp500Data.forwardEstimates[0].lastUpdated || new Date())
        } : null,
        
        // ETF holdings data
        topHoldings: sp500Data.etfHoldings ? sp500Data.etfHoldings.map(etf => ({
          name: etf.indexName,
          symbol: etf.symbol,
          holdings: etf.holdings.map(holding => ({
            symbol: holding.symbol.trim(),
            name: holding.name,
            weight: parseFloat(holding.weight)
          })),
          source: etf.sourceName,
          sourceUrl: etf.sourceUrl,
          asOf: formatDate(etf.lastUpdated)
        })) : [],
        
        // Market path (RSI) data
        marketPath: sp500Data.marketPath ? {
          value: sp500Data.marketPath.value,
          rsi: sp500Data.marketPath.rsi,
          source: sp500Data.marketPath.sourceName,
          sourceUrl: sp500Data.marketPath.sourceUrl,
          asOf: formatDate(sp500Data.marketPath.lastUpdated)
        } : null,
        
        // Moving averages data
        movingAverages: sp500Data.movingAverages ? {
          latest: sp500Data.movingAverages.latest,
          sma50: sp500Data.movingAverages.sma50,
          sma200: sp500Data.movingAverages.sma200
        } : null,
        
        // Historical P/E data - extract and process with detailed logging
        historicalPE: (() => {
          if (debugMode) {
            Logger.log("Processing historicalPE data for JSON output");
            Logger.log("sp500Data.historicalPE exists: " + (sp500Data.historicalPE ? "YES" : "NO"));
            if (sp500Data.historicalPE) {
              Logger.log("sp500Data.historicalPE type: " + typeof sp500Data.historicalPE);
              if (typeof sp500Data.historicalPE === 'object') {
                Logger.log("sp500Data.historicalPE keys: " + Object.keys(sp500Data.historicalPE).join(", "));
              }
            }
          }
          
          // If no historicalPE data exists, return null
          if (!sp500Data.historicalPE) {
            if (debugMode) Logger.log("No historicalPE data found, returning null");
            return null;
          }
          
          // Prepare the data structure
          let result = {};
          
          // Handle the data array
          if (Array.isArray(sp500Data.historicalPE)) {
            if (debugMode) Logger.log("historicalPE is an array, using directly as data property");
            result.data = sp500Data.historicalPE;
          } else if (sp500Data.historicalPE.data && Array.isArray(sp500Data.historicalPE.data)) {
            if (debugMode) Logger.log("Using historicalPE.data array");
            result.data = sp500Data.historicalPE.data;
          } else {
            if (debugMode) Logger.log("No valid data array found, using empty array");
            result.data = [];
          }
          
          // Add other properties with fallbacks
          result.years = sp500Data.historicalPE.years || null;
          result.formattedData = sp500Data.historicalPE.formattedData || null;
          result.current = sp500Data.historicalPE.current || (sp500Data.trailingPE ? sp500Data.trailingPE.pe : null);
          result.fiveYearAvg = sp500Data.historicalPE.fiveYearAvg || null;
          result.tenYearAvg = sp500Data.historicalPE.tenYearAvg || null;
          result.source = sp500Data.historicalPE.source || "S&P Global";
          result.sourceUrl = sp500Data.historicalPE.sourceUrl || "https://www.spglobal.com/spdji/en/";
          result.lastUpdated = sp500Data.historicalPE.lastUpdated ? formatDate(sp500Data.historicalPE.lastUpdated) : formattedDate;
          
          if (debugMode) {
            Logger.log("Final historicalPE structure: " + JSON.stringify(result, null, 2));
            Logger.log("Data array length: " + result.data.length);
          }
          
          return result;
        })(),
        
        // Data freshness information
        dataFreshness: sp500Data.dataFreshness ? sp500Data.dataFreshness.map(item => ({
          label: item.label,
          lastUpdated: formatDate(item.lastUpdated),
          sourceName: item.sourceName
        })) : []
      } : {
        // Default values if no SP500 data is available
        indexLevel: 0,
        source: {
          name: "Yahoo Finance",
          url: "https://finance.yahoo.com/quote/%5EGSPC/",
          asOf: formattedDate
        },
        valuation: {
          currentPE: 0,
          forwardPE: 0,
          historicalAvgPE: 0,
          percentFromAvg: 0,
          lastUpdated: formattedDate
        },
        earnings: {
          ttmEPS: 0,
          forwardEPS: 0,
          expectedGrowth: 0,
          lastUpdated: formattedDate
        },
        technicals: {
          rsi: 0,
          macd: 0,
          signal: "",
          lastUpdated: formattedDate
        }
      }
    };
    
    // Populate market indicators from allData if available
    if (allData && allData.keyMarketIndicators) {
      const keyMarketIndicators = allData.keyMarketIndicators;
      
      // Map major indices
      if (keyMarketIndicators.majorIndices && Array.isArray(keyMarketIndicators.majorIndices)) {
        fullJsonDataset.marketIndicators.majorIndices = keyMarketIndicators.majorIndices.map(index => {
          const change = parseFloat(index.change) || 0;
          const isPositive = change >= 0;
          
          // Format price and change to 2 decimal places
          const formattedPrice = typeof index.price === 'number' ? 
            parseFloat(index.price.toFixed(2)) : index.price;
          
          return {
            name: index.name || "Unknown Index",
            price: formattedPrice || "N/A",
            change: parseFloat(change.toFixed(2)),
            isPositive: isPositive
          };
        });
        
        // Add source information for major indices
        if (keyMarketIndicators.majorIndices.length > 0 && keyMarketIndicators.majorIndices[0].source) {
          fullJsonDataset.marketIndicators.indicesSource = keyMarketIndicators.majorIndices[0].source;
          fullJsonDataset.marketIndicators.indicesSourceUrl = keyMarketIndicators.majorIndices[0].sourceUrl || "https://finance.yahoo.com/";
          fullJsonDataset.marketIndicators.indicesAsOf = keyMarketIndicators.majorIndices[0].lastUpdated || formattedDate;
        } else {
          fullJsonDataset.marketIndicators.indicesSource = "Yahoo Finance";
          fullJsonDataset.marketIndicators.indicesSourceUrl = "https://finance.yahoo.com/";
          fullJsonDataset.marketIndicators.indicesAsOf = formatDate(formattedDate);
        }
        
        if (debugMode) {
          Logger.log(`Mapped ${fullJsonDataset.marketIndicators.majorIndices.length} major indices`);
        }
      } else if (debugMode) {
        Logger.log("No major indices data available in keyMarketIndicators");
      }
      
      // Map sector performance
      if (keyMarketIndicators.sectorPerformance && Array.isArray(keyMarketIndicators.sectorPerformance)) {
        fullJsonDataset.marketIndicators.sectorPerformance = keyMarketIndicators.sectorPerformance.map(sector => ({
          name: sector.name,
          change: typeof sector.percentChange === 'number' ? parseFloat(sector.percentChange.toFixed(2)).toString() : (sector.percentChange ? sector.percentChange.toString() : "0")
        }));
        
        // Add sector performance source information
        fullJsonDataset.marketIndicators.sectorSource = keyMarketIndicators.sectorPerformance && 
          keyMarketIndicators.sectorPerformance.length > 0 && 
          keyMarketIndicators.sectorPerformance[0].source ? 
          keyMarketIndicators.sectorPerformance[0].source : "S&P Global";
          
        fullJsonDataset.marketIndicators.sectorSourceUrl = keyMarketIndicators.sectorPerformance && 
          keyMarketIndicators.sectorPerformance.length > 0 && 
          keyMarketIndicators.sectorPerformance[0].sourceUrl ? 
          keyMarketIndicators.sectorPerformance[0].sourceUrl : "https://www.spglobal.com/spdji/en/indices/equity/sp-500/";
          
        fullJsonDataset.marketIndicators.sectorAsOf = keyMarketIndicators.sectorPerformance && 
          keyMarketIndicators.sectorPerformance.length > 0 && 
          keyMarketIndicators.sectorPerformance[0].lastUpdated ? 
          keyMarketIndicators.sectorPerformance[0].lastUpdated : formattedDate;
        
        if (debugMode) {
          Logger.log(`Mapped ${fullJsonDataset.marketIndicators.sectorPerformance.length} sectors`);
        }
      } else if (debugMode) {
        Logger.log("No sector performance data available in keyMarketIndicators");
      }
      
      // Map market futures if available
      if (keyMarketIndicators.marketFutures && keyMarketIndicators.marketFutures.consolidated) {
        fullJsonDataset.marketIndicators.marketFutures = keyMarketIndicators.marketFutures.consolidated.map(future => ({
          name: future.name,
          value: typeof future.value === 'number' ? parseFloat(future.value.toFixed(2)) : future.value,
          change: typeof future.change === 'number' ? parseFloat(future.change.toFixed(2)) : future.change,
          isPositive: future.percentChange >= 0
        }));
        
        // Add market futures source information - ensure it's a string, not an object
        let futuresSource = "Investing.com";
        let futuresSourceUrl = "https://www.investing.com/indices/indices-futures";
        let futuresAsOf = formattedDate;
        
        if (keyMarketIndicators.marketFutures.source) {
          if (typeof keyMarketIndicators.marketFutures.source === 'object') {
            futuresSource = keyMarketIndicators.marketFutures.source.name || "Investing.com";
            futuresSourceUrl = keyMarketIndicators.marketFutures.source.url || "https://www.investing.com/indices/indices-futures";
          } else {
            futuresSource = keyMarketIndicators.marketFutures.source;
          }
        }
        
        if (keyMarketIndicators.marketFutures.lastUpdated) {
          futuresAsOf = keyMarketIndicators.marketFutures.lastUpdated;
        }
        
        fullJsonDataset.marketIndicators.futuresSource = futuresSource;
        fullJsonDataset.marketIndicators.futuresSourceUrl = futuresSourceUrl;
        fullJsonDataset.marketIndicators.futuresAsOf = futuresAsOf;
      }
      
      // Map volatility indices
      if (keyMarketIndicators.volatilityIndices && Array.isArray(keyMarketIndicators.volatilityIndices)) {
        fullJsonDataset.marketIndicators.volatilityIndices = keyMarketIndicators.volatilityIndices.map(index => ({
          name: index.name,
          value: typeof index.value === 'number' ? parseFloat(index.value.toFixed(2)) : index.value,
          change: index.change,
          trend: index.trend || (index.change < 0 ? "Falling" : "Rising")
        }));
        
        // Add volatility indices source information
        fullJsonDataset.marketIndicators.volatilitySource = keyMarketIndicators.volatilityIndices && 
          keyMarketIndicators.volatilityIndices.length > 0 && 
          keyMarketIndicators.volatilityIndices[0].source ? 
          keyMarketIndicators.volatilityIndices[0].source : "CBOE";
          
        fullJsonDataset.marketIndicators.volatilitySourceUrl = keyMarketIndicators.volatilityIndices && 
          keyMarketIndicators.volatilityIndices.length > 0 && 
          keyMarketIndicators.volatilityIndices[0].sourceUrl ? 
          keyMarketIndicators.volatilityIndices[0].sourceUrl : "https://www.cboe.com/tradable_products/vix/";
          
        fullJsonDataset.marketIndicators.volatilityAsOf = keyMarketIndicators.volatilityIndices && 
          keyMarketIndicators.volatilityIndices.length > 0 && 
          keyMarketIndicators.volatilityIndices[0].lastUpdated ? 
          keyMarketIndicators.volatilityIndices[0].lastUpdated : formattedDate;
      }
      
      // Map fear and greed index
      if (keyMarketIndicators.fearAndGreedIndex) {
        const fearGreedData = keyMarketIndicators.fearAndGreedIndex || {};
        
        // Get the current value from either currentValue or value field
        const currentValue = typeof fearGreedData.currentValue === 'number' ? 
          parseFloat(fearGreedData.currentValue.toFixed(0)) : 
          (typeof fearGreedData.value === 'number' ? parseFloat(fearGreedData.value.toFixed(0)) : 38);
        
        // Use the existing helper function for classification
        const currentClassification = fearGreedData.rating || 
          (currentValue !== null ? getFearGreedClassification(currentValue) : "Fear");
        
        // Get the analysis text - don't generate a default if not available
        const analysis = fearGreedData.analysis || generateFearGreedAnalysis(currentValue, fearGreedData.previousClose, fearGreedData.oneWeekAgo);
        
        // Helper function to format previous values without fallbacks
        const formatHistoricalValue = (value) => {
          if (typeof value === 'number' && isFinite(value)) {
            return {
              value: parseFloat(value.toFixed(0)),
              classification: getFearGreedClassification(value)
            };
          }
          return null;
        };
        
        // Source information
        const source = fearGreedData.source || "CNN Money";
        const sourceUrl = fearGreedData.sourceUrl || "https://money.cnn.com/data/fear-and-greed/";
        const timestamp = fearGreedData.timestamp || fearGreedData.lastUpdated || null;
        
        // Determine color based on the current value
        let color = "#888888"; // Default gray
        if (currentValue !== null) {
          if (currentValue <= 25) color = "#f44336"; // Extreme Fear - Red
          else if (currentValue <= 40) color = "#ff9800"; // Fear - Orange
          else if (currentValue <= 60) color = "#ffeb3b"; // Neutral - Yellow
          else if (currentValue <= 75) color = "#8bc34a"; // Greed - Light Green
          else color = "#4caf50"; // Extreme Greed - Green
        }
        
        // Format the timestamp consistently with other sections
        const formattedTimestamp = timestamp ? formatDate(timestamp) : formattedDate;
        
        // Create the fear and greed index object with the correct structure
        fullJsonDataset.marketIndicators.fearGreed = {
          value: currentValue,
          category: currentClassification,
          description: generateFearGreedAnalysis(currentValue, fearGreedData.previousClose, fearGreedData.oneWeekAgo),
          oneWeekAgo: fearGreedData.oneWeekAgo || 26,
          oneMonthAgo: fearGreedData.oneMonthAgo || 21,
          previousDay: fearGreedData.previousClose || 36, // Add explicit previousDay field
          previousValue: fearGreedData.previousValue || fearGreedData.previousClose || 36, // Add alternative field name
          color: color,
          source: source,
          sourceUrl: sourceUrl,
          asOf: formattedTimestamp
        };
        
        if (debugMode) {
          Logger.log(`Mapped Fear & Greed Index: ${JSON.stringify(fullJsonDataset.marketIndicators.fearGreed, null, 2)}`);
        }
      } else if (debugMode) {
        Logger.log("No Fear & Greed Index data available in keyMarketIndicators");
      }
      
      // Map economic events
      if (keyMarketIndicators.upcomingEconomicEvents && Array.isArray(keyMarketIndicators.upcomingEconomicEvents)) {
        fullJsonDataset.marketIndicators.economicEvents = keyMarketIndicators.upcomingEconomicEvents.map(event => {
          // Format the date to include only the date part (without duplicate time)
          const eventDate = new Date(event.date);
          const formattedDate = Utilities.formatDate(eventDate, 'America/New_York', 'MMM d, yyyy');
          const formattedTime = Utilities.formatDate(eventDate, 'America/New_York', 'h:mm a z');
          
          return {
            date: formattedDate,
            time: formattedTime,
            country: event.country || "US",
            name: event.event, // Keep the event name in the 'name' field to match template
            event: event.event, // Also keep original event field for backward compatibility
            source: event.source || "",
            actual: event.actual || "N/A",
            forecast: event.forecast || "N/A",
            previous: event.previous || "N/A",
            importance: event.importance || 3
          };
        });
      }
      
      // Add source information
      fullJsonDataset.marketIndicators.source = "Yahoo Finance";
      fullJsonDataset.marketIndicators.sourceUrl = "https://finance.yahoo.com";
      fullJsonDataset.marketIndicators.asOf = formattedDate;
    }
    
    // Populate market sentiment from allData if available
    if (allData && allData.marketSentiment && allData.marketSentiment.data) {
      const marketSentimentData = allData.marketSentiment.data;
      const newSentiment = marketSentimentData.overall || marketSentimentData.overallSentiment || marketSentimentData.summary || "Neutral";
      
      // Concatenate the new sentiment with the existing one if it exists
      if (fullJsonDataset.marketSentiment.overall && fullJsonDataset.marketSentiment.overall !== "Neutral") {
        fullJsonDataset.marketSentiment.overall = newSentiment + ". " + fullJsonDataset.marketSentiment.overall;
      } else {
        fullJsonDataset.marketSentiment.overall = newSentiment;
      }
      
      // Check if analysts array exists and is not empty
      if (marketSentimentData.analysts && Array.isArray(marketSentimentData.analysts) && marketSentimentData.analysts.length > 0) {
        // Create a copy of the analysts array to avoid modifying the original
        const shuffledAnalysts = [...marketSentimentData.analysts];
        
        // Fisher-Yates shuffle algorithm
        for (let i = shuffledAnalysts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledAnalysts[i], shuffledAnalysts[j]] = [shuffledAnalysts[j], shuffledAnalysts[i]];
        }
        
        fullJsonDataset.marketSentiment.analysts = shuffledAnalysts.map(analyst => {
          // Handle different field name possibilities
          const name = analyst.name || analyst.analyst || "Anonymous";
          const comment = analyst.comment || analyst.commentary || "";
          
          // Handle different ways mentionedStocks/Symbols might be represented
          let mentionedSymbols = [];
          if (analyst.mentionedSymbols && Array.isArray(analyst.mentionedSymbols)) {
            mentionedSymbols = analyst.mentionedSymbols;
          } else if (analyst.mentionedStocks && Array.isArray(analyst.mentionedStocks)) {
            mentionedSymbols = analyst.mentionedStocks;
          }
          
          return {
            name: name,
            comment: comment,
            mentionedSymbols: mentionedSymbols,
            source: analyst.source || analyst.firm || ""
          };
        });
        
        if (debugMode) {
          Logger.log(`Mapped ${fullJsonDataset.marketSentiment.analysts.length} analysts from market sentiment data`);
        }
      } else if (debugMode) {
        Logger.log("No analysts found in market sentiment data");
      }
      
      // Update the source and lastUpdated if available
      if (marketSentimentData.source) {
        fullJsonDataset.marketSentiment.source = marketSentimentData.source;
      }
      
      if (marketSentimentData.lastUpdated) {
        fullJsonDataset.marketSentiment.lastUpdated = marketSentimentData.lastUpdated;
      }
    } else if (debugMode) {
      Logger.log("No market sentiment data available");
    }
    
    // Populate fundamental metrics from allData if available
    if (allData && allData.fundamentalMetrics) {
      // Define major indices symbols
      const majorIndicesSymbols = ["SPY", "DIA", "QQQ", "IWM"];
      
      // Process metrics for each category
      const majorIndices = [];
      const topHoldings = [];
      const otherStocks = [];
      
      // Get deduplicated top index holdings (excluding major indices)
      const topIndexHoldings = typeof getTopIndexHoldings === 'function'
        ? getTopIndexHoldings()
        : [];
      const filteredTopHoldings = topIndexHoldings.filter(symbol => !majorIndicesSymbols.includes(symbol));
      
      // Helper function to create stock object with metrics array format
      const createStockObject = (symbol, data) => {
        // Skip if data is not a valid object or has an error
        if (!data || typeof data !== 'object' || data.error) {
          return null;
        }
        
        // Create the base stock object
        const stockObj = {
          symbol: symbol,
          name: data.name || data.company || symbol,
          price: typeof data.price === 'number' ? data.price : 0,
          priceChange: typeof data.priceChange === 'number' ? data.priceChange : 0,
          percentChange: typeof data.changesPercentage === 'string' ? data.changesPercentage : 
                        (typeof data.changesPercentage === 'number' ? data.changesPercentage.toFixed(2) + '%' : '0%'),
          metrics: []
        };
        
        // Map of metric keys to their display names
        const metricMapping = {
          peRatio: "P/E Ratio",
          forwardPE: "Forward P/E",
          pegRatio: "PEG Ratio",
          priceToBook: "Price/Book",
          priceToSales: "Price/Sales",
          debtToEquity: "Debt/Equity",
          returnOnEquity: "ROE",
          returnOnAssets: "ROA",
          profitMargin: "Profit Margin",
          dividendYield: "Dividend Yield",
          beta: "Beta",
          volume: "Volume",
          averageVolume: "Avg Volume",
          marketCap: "Market Cap",
          fiftyTwoWeekHigh: "52W High",
          fiftyTwoWeekLow: "52W Low",
          sector: "Sector",
          industry: "Industry",
          assets: "Assets"
        };
        
        // Format values appropriately based on the metric type
        const formatMetricValue = (key, value) => {
          if (value === null || value === undefined || value === "N/A" || value === "") {
            return "N/A";
          }
          
          // Format based on metric type
          if (key === "peRatio" || key === "forwardPE" || key === "pegRatio" || key === "priceToBook" || key === "priceToSales" || key === "debtToEquity" || key === "beta") {
            return typeof value === 'number' ? value.toFixed(2) : value.toString();
          } else if (key === "returnOnEquity" || key === "returnOnAssets" || key === "profitMargin" || key === "dividendYield") {
            // Format as percentage
            if (typeof value === 'number') {
              return value.toFixed(2) + '%';
            } else if (typeof value === 'string' && !value.includes('%')) {
              const numValue = parseFloat(value);
              return isNaN(numValue) ? value : numValue.toFixed(2) + '%';
            }
            return value.toString();
          } else if (key === "fiftyTwoWeekHigh" || key === "fiftyTwoWeekLow") {
            // Format as currency
            if (typeof value === 'number') {
              return '$' + value.toFixed(2);
            } else if (typeof value === 'string' && !value.includes('$')) {
              return '$' + value;
            }
            return value.toString();
          } else if (key === "volume" || key === "averageVolume") {
            // Format with suffix (M, B)
            if (typeof value === 'number') {
              if (value >= 1000000000) {
                return (value / 1000000000).toFixed(1) + 'B';
              } else if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
              } else if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'K';
              }
              return value.toString();
            }
            return value.toString();
          } else if (key === "marketCap" || key === "assets") {
            // Format with currency and suffix
            if (typeof value === 'number') {
              if (value >= 1000000000000) {
                return '$' + (value / 1000000000000).toFixed(1) + 'T';
              } else if (value >= 1000000000) {
                return '$' + (value / 1000000000).toFixed(1) + 'B';
              } else if (value >= 1000000) {
                return '$' + (value / 1000000).toFixed(1) + 'M';
              }
              return '$' + value.toString();
            } else if (typeof value === 'string') {
              if (!value.includes('$') && !isNaN(parseFloat(value))) {
                return '$' + value;
              }
            }
            return value.toString();
          }
          
          // Default case
          if (typeof value === 'number') {
            return value.toFixed(2);
          }
          return value.toString();
        };
        
        // Add metrics to the array
        for (const [key, displayName] of Object.entries(metricMapping)) {
          if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
            stockObj.metrics.push({
              name: displayName,
              value: formatMetricValue(key, data[key])
            });
          }
        }
        
        return stockObj;
      };
      
      // Get the metrics data from the correct location in the data structure
      let metricsData = {};
      
      // Debug logging to see the structure of fundamentalMetrics
      if (debugMode) {
        Logger.log("fundamentalMetrics structure:");
        Logger.log(JSON.stringify(allData.fundamentalMetrics, null, 2));
      }
      
      // Check all possible paths where the metrics data could be located
      if (allData.fundamentalMetrics.metrics && allData.fundamentalMetrics.metrics.metrics) {
        // Path: allData.fundamentalMetrics.metrics.metrics
        metricsData = allData.fundamentalMetrics.metrics.metrics;
      } else if (allData.fundamentalMetrics.metrics) {
        // Path: allData.fundamentalMetrics.metrics
        metricsData = allData.fundamentalMetrics.metrics;
      }
      
      // If we still don't have metrics data, try to retrieve it directly
      if (Object.keys(metricsData).length === 0) {
        try {
          const fundamentalMetricsData = retrieveFundamentalMetrics();
          if (fundamentalMetricsData && fundamentalMetricsData.metrics && fundamentalMetricsData.metrics.metrics) {
            metricsData = fundamentalMetricsData.metrics.metrics;
          }
        } catch (error) {
          Logger.log(`Error retrieving fundamental metrics directly: ${error}`);
        }
      }
      
      // Process each symbol in the metrics data
      for (const symbol in metricsData) {
        if (metricsData.hasOwnProperty(symbol) && typeof symbol === 'string' && symbol !== 'validSymbols' && symbol !== 'deprecatedSymbols') {
          // Check if this is a market index or deprecated name that should be excluded
          // Use the existing cleanAndReplaceSymbols function if available
          if (typeof cleanAndReplaceSymbols === 'function') {
            // Create a temporary array with just this symbol to check if it would be filtered out
            const cleanedSymbols = cleanAndReplaceSymbols([symbol]);
            
            // If the symbol was filtered out (not in the cleaned array), skip it
            if (cleanedSymbols.length === 0 || cleanedSymbols[0] !== symbol) {
              if (debugMode) {
                Logger.log(`Skipping excluded symbol: ${symbol}`);
              }
              continue;
            }
          }
          
          // Also check deprecated symbols list as a fallback
          if (typeof DEPRECATED_SYMBOLS !== 'undefined' && DEPRECATED_SYMBOLS.includes(symbol)) {
            if (debugMode) {
              Logger.log(`Skipping deprecated symbol: ${symbol}`);
            }
            continue;
          }
          
          // Additional check for common market indices not caught by other filters
          if (symbol === 'NASDAQ' || symbol === 'NYSE' || symbol.includes('S&P') || 
              symbol === 'DOW' || symbol === 'DJIA' || symbol.includes('RUSSELL')) {
            if (debugMode) {
              Logger.log(`Skipping market index: ${symbol}`);
            }
            continue;
          }
          
          const stockData = metricsData[symbol];
          const stockObject = createStockObject(symbol, stockData);
          
          // Only add valid stock objects
          if (stockObject) {
            // Track which category this stock belongs to
            if (majorIndicesSymbols.includes(symbol)) {
              majorIndices.push(stockObject);
            } else if (filteredTopHoldings.includes(symbol)) {
              topHoldings.push(stockObject);
            } else {
              // Only add to otherStocks if it's not already in topHoldings
              // This prevents duplicates when stocks are added to topHoldings later
              otherStocks.push(stockObject);
            }
          }
        }
      }
      
      // Sort each category alphabetically by symbol
      majorIndices.sort((a, b) => a.symbol.localeCompare(b.symbol));
      topHoldings.sort((a, b) => a.symbol.localeCompare(b.symbol));
      otherStocks.sort((a, b) => a.symbol.localeCompare(b.symbol));
      
      // Update the full JSON dataset
      fullJsonDataset.fundamentalMetrics.majorIndices = majorIndices;
      fullJsonDataset.fundamentalMetrics.topHoldings = topHoldings;
      fullJsonDataset.fundamentalMetrics.otherStocks = otherStocks;
      
      // If we have no data in any category, add some sample data for testing
      if (debugMode && majorIndices.length === 0 && otherStocks.length === 0) {
        Logger.log("No fundamental metrics data found. Adding sample data for testing.");
        
        // Add sample data for SPY
        fullJsonDataset.fundamentalMetrics.majorIndices.push({
          symbol: "SPY",
          name: "SPDR S&P 500 ETF",
          price: 502.18,
          priceChange: 1.53,
          percentChange: "0.31%",
          metrics: [
            { name: "P/E Ratio", value: "23.47" },
            { name: "Dividend Yield", value: "1.32%" },
            { name: "52W High", value: "$518.84" },
            { name: "52W Low", value: "$420.16" },
            { name: "Volume", value: "78.4M" },
            { name: "Beta", value: "1.0" },
            { name: "Sector", value: "Index ETF" },
            { name: "Assets", value: "$482.5B" }
          ]
        });
        
        // Add sample data for AAPL
        fullJsonDataset.fundamentalMetrics.topHoldings.push({
          symbol: "AAPL",
          name: "Apple Inc.",
          price: 169.32,
          priceChange: 0.87,
          percentChange: "0.52%",
          metrics: [
            { name: "P/E Ratio", value: "28.22" },
            { name: "Forward P/E", value: "26.8" },
            { name: "PEG Ratio", value: "2.45" },
            { name: "Price/Book", value: "35.7" },
            { name: "Price/Sales", value: "7.82" },
            { name: "Debt/Equity", value: "1.45" },
            { name: "ROE", value: "147.8%" },
            { name: "Sector", value: "Technology" },
            { name: "Industry", value: "Consumer Electronics" }
          ]
        });
      }
    }
    
    // Populate macroeconomic factors from allData if available
    if (allData && allData.macroeconomicFactors) {
      const macro = allData.macroeconomicFactors;
      
      // Federal Reserve data
      if (macro.federalReserve || macro.fedPolicy) {
        // Use either federalReserve or fedPolicy data, depending on what's available
        const fed = macro.fedPolicy || macro.federalReserve || {};
        
        // Forward guidance / commentary
        const guidance = fed.forwardGuidance || fed.guidance || "";
        const guidanceSource = fed.source?.components?.forwardGuidance?.components?.name || "Federal Reserve";
        const guidanceSourceUrl = fed.source?.components?.forwardGuidance?.components?.url || "https://www.federalreserve.gov/";
        const guidanceAsOf = fed.source?.components?.forwardGuidance?.components?.timestamp ? 
          formatDate(new Date(fed.source.components.forwardGuidance.components.timestamp)) : formattedDate;
        
        // Current rate information
        const currentRateValue = fed.currentRate?.currentRate || fed.currentRate?.effectiveRate || "";
        const rateRangeLow = fed.currentRate?.rangeLow || "";
        const rateRangeHigh = fed.currentRate?.rangeHigh || "";
        const rateRange = `${rateRangeLow}% - ${rateRangeHigh}%`;
        const rateSource = fed.source?.components?.fedFundsRate?.components?.name || "Federal Reserve";
        const rateSourceUrl = fed.source?.components?.fedFundsRate?.components?.url || "https://www.federalreserve.gov/";
        const rateAsOf = fed.source?.components?.fedFundsRate?.components?.timestamp ? 
          formatDate(new Date(fed.source.components.fedFundsRate.components.timestamp)) : formattedDate;
        
        // Futures information
        const futuresPrice = fed.futures?.currentPrice || "";
        const impliedRate = fed.futures?.impliedRate || "";
        const cutProbability = fed.futures?.probabilities?.cut || 0;
        const holdProbability = fed.futures?.probabilities?.hold || 0;
        const hikeProbability = fed.futures?.probabilities?.hike || 0;
        const futuresSource = fed.source?.components?.futures?.components?.name || "CME FedWatch Tool";
        const futuresSourceUrl = fed.source?.components?.futures?.components?.url || 
          "https://www.cmegroup.com/trading/interest-rates/countdown-to-fomc.html";
        const futuresAsOf = fed.source?.components?.futures?.components?.timestamp ? 
          formatDate(new Date(fed.source.components.futures.components.timestamp)) : formattedDate;
        
        // Meeting schedule
        const lastMeetingFull = fed.lastMeeting?.fullText || "";
        const nextMeetingFull = fed.nextMeeting?.fullText || "";
        
        // Extract just the date part from meeting strings
        let lastMeeting = lastMeetingFull;
        const nextMeetingMatch = nextMeetingFull.match(/(?:Next\s*FOMC\s*Meeting\s*-\s*)?(?:FOMC\s*Meeting\s*-\s*)?(.*)/i);
        const nextMeeting = nextMeetingMatch ? nextMeetingMatch[1].trim() : nextMeetingFull;
        
        // For display in the template, we want to show "March 18-19 2025" without any prefixes
        const lastMeetingMatch = lastMeetingFull.match(/(?:Previous:\s*)?(?:Last\s*FOMC\s*Meeting\s*-\s*)?(?:FOMC\s*Meeting\s*-\s*)?(.*)/i);
        if (lastMeetingMatch) {
          // Remove any "Previous:" prefix that might be in the matched group
          lastMeeting = lastMeetingMatch[1].replace(/^Previous:\s*/i, "").trim();
        } else {
          // Alternative pattern to extract just the month, date, and year
          const dateMatch = lastMeetingFull.match(/(?:March|April|May|June|July|August|September|October|November|December|January|February)\s+\d+-\d+\s+\d+/i);
          if (dateMatch) {
            lastMeeting = dateMatch[0];
          }
        }
        
        const meetingSource = fed.source?.components?.meetings?.components?.name || "Federal Reserve";
        const meetingSourceUrl = fed.source?.components?.meetings?.components?.url || "https://www.federalreserve.gov/";
        const meetingAsOf = fed.source?.components?.meetings?.components?.timestamp ? 
          formatDate(new Date(fed.source.components.meetings.components.timestamp)) : formattedDate;
        
        // Update the federalReserve structure for backward compatibility
        fullJsonDataset.macroeconomicFactors.federalReserve = {
          forwardGuidance: guidance,
          forwardGuidanceSource: {
            name: guidanceSource,
            url: guidanceSourceUrl,
            lastUpdated: guidanceAsOf
          },
          currentRate: {
            target: rateRange,
            effectiveRate: `${currentRateValue}%`,
            lastUpdated: rateAsOf
          },
          nextMeeting: {
            date: nextMeeting,
            probabilities: {
              increase: hikeProbability,
              decrease: cutProbability,
              noChange: holdProbability
            },
            lastUpdated: meetingAsOf
          }
        };
        
        // Add the new fedPolicy structure
        fullJsonDataset.macroeconomicFactors.fedPolicy = {
          futuresPrice: parseFloat(futuresPrice) ? parseFloat(futuresPrice).toFixed(2) : null,
          impliedRate: parseFloat(impliedRate) ? parseFloat(impliedRate).toFixed(2) : (impliedRate || ''),
          cutProbability: parseFloat(cutProbability) || 0,
          holdProbability: parseFloat(holdProbability) || 0,
          hikeProbability: parseFloat(hikeProbability) || 0,
          futuresSource: futuresSource,
          futuresSourceUrl: futuresSourceUrl,
          futuresAsOf: futuresAsOf,
          nextMeeting: nextMeeting,
          lastMeeting: lastMeeting,
          meetingSource: meetingSource,
          meetingSourceUrl: meetingSourceUrl,
          meetingAsOf: meetingAsOf,
          currentRate: currentRateValue.toString().includes('%') ? currentRateValue : `${currentRateValue}%`,
          rateRange: rateRange,
          guidance: guidance,
          guidanceSource: guidanceSource,
          guidanceSourceUrl: guidanceSourceUrl,
          guidanceAsOf: guidanceAsOf,
          rateSource: rateSource,
          rateSourceUrl: rateSourceUrl,
          rateAsOf: rateAsOf
        };
        
        // Add the fedWatch structure
        fullJsonDataset.macroeconomicFactors.fedWatch = {
          currentPrice: parseFloat(futuresPrice) ? parseFloat(futuresPrice).toFixed(2) : null,
          impliedRate: parseFloat(impliedRate) ? parseFloat(impliedRate).toFixed(2) : (impliedRate || ''),
          probabilities: {
            cut: parseFloat(cutProbability) || 0,
            hold: parseFloat(holdProbability) || 0,
            hike: parseFloat(hikeProbability) || 0
          },
          source: futuresSource,
          sourceUrl: futuresSourceUrl,
          asOf: futuresAsOf
        };
        
        // Add the meetingSchedule structure
        fullJsonDataset.macroeconomicFactors.meetingSchedule = {
          lastMeeting: lastMeeting,
          nextMeeting: nextMeeting,
          source: meetingSource,
          sourceUrl: meetingSourceUrl,
          asOf: meetingAsOf
        };
      }
      
      // Treasury yields
      if (macro.treasuryYields && Array.isArray(macro.treasuryYields.yields)) {
        const yields = macro.treasuryYields.yields.map(yield => ({
          maturity: yield.term || yield.maturity,
          rate: typeof yield.yield === 'number' ? parseFloat(yield.yield.toFixed(2)) : null,
          change: yield.change,
          timestamp: yield.timestamp
        }));
        
        // Sort yields by maturity duration (ascending)
        yields.sort((a, b) => {
          const maturityOrder = {
            "1 Month": 1, "3 Month": 2, "6 Month": 3, "1 Year": 4, "2 Year": 5,
            "3 Year": 6, "5 Year": 7, "7 Year": 8, "10 Year": 9, "20 Year": 10, "30 Year": 11
          };
          return maturityOrder[a.maturity] - maturityOrder[b.maturity];
        });
        
        // Store in both the current format and the new format
        fullJsonDataset.macroeconomicFactors.treasuryYields.current = yields;
        fullJsonDataset.macroeconomicFactors.treasuryYields.yields = yields;
        
        // Calculate yield curve status
        if (macro.treasuryYields.yieldCurve) {
          const yieldCurve = macro.treasuryYields.yieldCurve;
          
          // Determine color based on yield curve status
          let color = "#4caf50"; // Default green for normal
          if (yieldCurve.status === "Inverted") {
            color = "#f44336"; // Red for inverted
          } else if (yieldCurve.status === "Flat") {
            color = "#ff9800"; // Orange for flat
          }
          
          // Create description based on status if not provided
          const description = yieldCurve.analysis || generateYieldCurveDescription(yieldCurve.status);
          
          // Update the existing structure
          fullJsonDataset.macroeconomicFactors.treasuryYields.yieldCurve = {
            status: yieldCurve.status || "Normal",
            inverted: yieldCurve.inverted || false,
            tenYearTwoYearSpread: yieldCurve.tenYearTwoYearSpread || 0,
            lastUpdated: formattedDate,
            // Add new fields for the template
            color: color,
            description: description
          };
        }
        
        // Add source information
        fullJsonDataset.macroeconomicFactors.treasuryYields.source = macro.treasuryYields.source || "U.S. Department of the Treasury";
        fullJsonDataset.macroeconomicFactors.treasuryYields.sourceUrl = macro.treasuryYields.sourceUrl || "https://home.treasury.gov/";
        fullJsonDataset.macroeconomicFactors.treasuryYields.asOf = macro.treasuryYields.lastUpdated ? formatDate(macro.treasuryYields.lastUpdated) : formattedDate;
      }
      
      // Inflation data
      if (macro.inflation) {
        const inflation = macro.inflation;
        
        // CPI data
        if (inflation.cpi) {
          fullJsonDataset.macroeconomicFactors.inflation.cpi = {
            headline: inflation.cpi.yearOverYearChange !== undefined ? parseFloat(inflation.cpi.yearOverYearChange.toFixed(1)) : null,
            core: inflation.cpi.coreRate !== undefined ? parseFloat(inflation.cpi.coreRate.toFixed(1)) : null,
            fiveYear: inflation.cpi.fiveYear || null,
            tenYear: inflation.cpi.tenYear || null,
            asOf: inflation.cpi.lastUpdated ? formatDate(new Date(inflation.cpi.lastUpdated)) : formattedDate
          };
        }
        
        // PCE data
        if (inflation.pce) {
          fullJsonDataset.macroeconomicFactors.inflation.pce = {
            headline: inflation.pce.yearOverYearChange !== undefined ? parseFloat(inflation.pce.yearOverYearChange.toFixed(1)) : null,
            core: inflation.pce.coreRate !== undefined ? parseFloat(inflation.pce.coreRate.toFixed(1)) : null,
            lastUpdated: inflation.pce.lastUpdated ? formatDate(new Date(inflation.pce.lastUpdated)) : formattedDate
          };
        }
        
        // Inflation expectations
        if (inflation.expectations) {
          const expectations = [];
          
          // 1-Year expectations
          if (inflation.expectations.oneYear && inflation.expectations.oneYear.value !== undefined) {
            expectations.push({
              period: "1-Year",
              value: typeof inflation.expectations.oneYear.value === 'number' ? 
                inflation.expectations.oneYear.value : 
                (inflation.expectations.oneYear.value ? parseFloat(inflation.expectations.oneYear.value) : null),
              asOf: inflation.expectations.oneYear.lastUpdated ? 
                formatDate(new Date(inflation.expectations.oneYear.lastUpdated)) : 
                formattedDate
            });
          }
          
          // 5-Year expectations
          if (inflation.expectations.fiveYear && inflation.expectations.fiveYear.value !== undefined) {
            expectations.push({
              period: "5-Year",
              value: typeof inflation.expectations.fiveYear.value === 'number' ? 
                inflation.expectations.fiveYear.value : 
                (inflation.expectations.fiveYear.value ? parseFloat(inflation.expectations.fiveYear.value) : null),
              asOf: inflation.expectations.fiveYear.lastUpdated ? 
                formatDate(new Date(inflation.expectations.fiveYear.lastUpdated)) : 
                formattedDate
            });
          }
          
          // 10-Year expectations
          if (inflation.expectations.tenYear && inflation.expectations.tenYear.value !== undefined) {
            expectations.push({
              period: "10-Year",
              value: typeof inflation.expectations.tenYear.value === 'number' ? 
                inflation.expectations.tenYear.value : 
                (inflation.expectations.tenYear.value ? parseFloat(inflation.expectations.tenYear.value) : null),
              asOf: inflation.expectations.tenYear.lastUpdated ? 
                formatDate(new Date(inflation.expectations.tenYear.lastUpdated)) : 
                formattedDate
            });
          }
          
          // Add expectations to the dataset if we have any
          if (expectations.length > 0) {
            fullJsonDataset.macroeconomicFactors.inflation.expectations = expectations;
          }
          
          // Add source information for expectations
          if (inflation.expectations.source) {
            fullJsonDataset.macroeconomicFactors.inflation.expectationsSource = {
              name: inflation.expectations.source.name || null,
              url: inflation.expectations.source.url || null,
              lastUpdated: inflation.expectations.source.timestamp ? 
                formatDate(new Date(inflation.expectations.source.timestamp)) : 
                formattedDate
            };
          }
        }
        
        // Trend analysis
        // Determine color based on trend direction
        let color = "#4caf50"; // Default green for decreasing
        let direction = "Stable";
        
        // Check if we have CPI data to determine trend
        if (inflation.cpi && inflation.cpi.yearOverYearChange !== undefined) {
          const formattedYearOverYearChange = parseFloat(inflation.cpi.yearOverYearChange.toFixed(1));
          
          if (formattedYearOverYearChange > 3.0) {
            color = "#f44336"; // Red for high inflation
            direction = "Increasing";
          } else if (formattedYearOverYearChange > 2.0) {
            color = "#ff9800"; // Orange for moderate inflation
            direction = "Stable";
          } else {
            color = "#4caf50"; // Green for low inflation
            direction = "Decreasing";
          }
        }
        
        // Create analysis text from available data
        const analysisText = inflation.analysis || 
          "Inflation data indicates current economic conditions may impact monetary policy decisions.";
        
        // Add trend analysis to the dataset
        fullJsonDataset.macroeconomicFactors.inflation.trendAnalysis = {
          analysis: analysisText,
          color: color,
          source: inflation.source?.name || "Bureau of Labor Statistics & Federal Reserve",
          sourceUrl: inflation.source?.url || "https://www.bls.gov/cpi/",
          asOf: inflation.lastUpdated ? formatDate(new Date(inflation.lastUpdated)) : formattedDate
        };
        
        // Add trend details with meaningful defaults
        fullJsonDataset.macroeconomicFactors.inflation.trend = {
          direction: direction,
          outlook: "Inflation is being closely monitored by the Federal Reserve for potential policy adjustments.",
          marketImpact: "Changes in inflation may impact interest rates and asset valuations across markets.",
          asOf: inflation.lastUpdated ? formatDate(new Date(inflation.lastUpdated)) : formattedDate,
          source: inflation.source?.name || "Federal Reserve",
          sourceUrl: inflation.source?.url || "https://www.federalreserve.gov/"
        };
        
        // Add overall source information
        fullJsonDataset.macroeconomicFactors.inflation.source = inflation.source?.name || "Bureau of Labor Statistics & Federal Reserve";
        fullJsonDataset.macroeconomicFactors.inflation.sourceUrl = inflation.source?.url || "https://www.bls.gov/cpi/";
        fullJsonDataset.macroeconomicFactors.inflation.lastUpdated = inflation.lastUpdated ? 
          formatDate(new Date(inflation.lastUpdated)) : 
          formattedDate;
      }
      
      // Geopolitical risks
      if (macro.geopoliticalRisks) {
        const geoRisks = macro.geopoliticalRisks;
        
        // Create the geopolitical risks structure
        fullJsonDataset.macroeconomicFactors.geopoliticalRisks = {
          global: geoRisks.global || "Global geopolitical risk level is currently Moderate to High.",
          risks: []
        };
        
        if (debugMode) {
          Logger.log("Global geopolitical risk analysis from the AI response: \n"+JSON.stringify(analysisJson, null, 2));
          Logger.log("Geopolitical risks processed successfully: \n" + JSON.stringify(geoRisks, null, 2));
        }
        
        // Add the Global Overview
        if (analysisJson?.analysis?.macroeconomicFactors?.geopoliticalRisks?.global) {
          Logger.log("Setting the geopolitical global analysis to: " + analysisJson.analysis.macroeconomicFactors.geopoliticalRisks.global);
          // Remove any trailing ".." or "." from the global overview text
          if (typeof analysisJson.analysis.macroeconomicFactors.geopoliticalRisks.global === 'string') {
            let globalText = analysisJson.analysis.macroeconomicFactors.geopoliticalRisks.global;
            // Remove trailing ".."
            if (globalText.endsWith('..')) {
              globalText = globalText.substring(0, globalText.length - 2);
            } 
            // Remove trailing single "."
            else if (globalText.endsWith('.') && !globalText.endsWith('..')) {
              // Only remove if it's not part of a proper sentence-ending period
              // Check if the character before the period is not a space (indicating it might be an abbreviation)
              const charBeforePeriod = globalText.charAt(globalText.length - 2);
              if (charBeforePeriod !== ' ' && charBeforePeriod !== '.') {
                globalText = globalText.substring(0, globalText.length - 1);
              }
            }
            fullJsonDataset.macroeconomicFactors.geopoliticalRisks.global = globalText;
          } else {
            fullJsonDataset.macroeconomicFactors.geopoliticalRisks.global = analysisJson.analysis.macroeconomicFactors.geopoliticalRisks.global;
          }
        }
        
        // Add risks if available
        if (Array.isArray(geoRisks.risks)) {
          // Sort risks by impact level (descending)
          const sortedRisks = [...geoRisks.risks].sort((a, b) => {
            // Convert string impact levels to numeric for sorting
            const impactOrder = {
              'Severe': 4,
              'High': 3,
              'Medium': 2,
              'Low': 1,
              'Unknown': 0
            };
            
            const aImpact = impactOrder[a.impactLevel] || 0;
            const bImpact = impactOrder[b.impactLevel] || 0;
            
            return bImpact - aImpact;
          });
          
          // Map risks to the required format
          fullJsonDataset.macroeconomicFactors.geopoliticalRisks.risks = sortedRisks.map(risk => ({
            name: risk.name || 'Unknown Risk',
            description: risk.description || 'No description available',
            region: risk.region || 'Global',
            impactLevel: risk.impactLevel || 'Medium',
            source: risk.source || 'Council on Foreign Relations',
            sourceUrl: risk.url || risk.sourceUrl || 'https://www.cfr.org/global-conflict-tracker'
          }));
        }
        
        // Add source information
        fullJsonDataset.macroeconomicFactors.geopoliticalRisks.source = geoRisks.source || "Aggregated from multiple geopolitical risk assessments";
        fullJsonDataset.macroeconomicFactors.geopoliticalRisks.sourceUrl = geoRisks.sourceUrl || geoRisks.url || "https://www.cfr.org/global-conflict-tracker";
        fullJsonDataset.macroeconomicFactors.geopoliticalRisks.lastUpdated = geoRisks.lastUpdated ? 
          formatDate(new Date(geoRisks.lastUpdated)) : formattedDate;
      }
    }
    
    // Populate S&P 500 data if available
    if (sp500Data) {
      try {
        Logger.log("Processing SP500 data for JSON export...");
        
        // Format index level with 2 decimal places
        const indexLevel = typeof sp500Data.sp500Index?.price === 'number' ? 
          parseFloat(sp500Data.sp500Index.price.toFixed(2)) : 
          (typeof sp500Data.indexLevel === 'number' ? parseFloat(sp500Data.indexLevel.toFixed(2)) : null);
        
        // Format current PE ratio with 2 decimal places
        const currentPE = typeof sp500Data.trailingPE?.pe === 'number' ? 
          parseFloat(sp500Data.trailingPE.pe.toFixed(2)) : 
          (typeof sp500Data.valuation?.currentPE === 'number' ? parseFloat(sp500Data.valuation.currentPE.toFixed(2)) : 
            (typeof sp500Data.sp500Index?.pe === 'number' ? parseFloat(sp500Data.sp500Index.pe.toFixed(2)) : null));
        
        // Format 5-year average PE with 2 decimal places
        const fiveYearAvgPE = typeof sp500Data.trailingPE?.fiveYearAvg === 'number' ? 
          parseFloat(sp500Data.trailingPE.fiveYearAvg.toFixed(2)) : 
          (typeof sp500Data.trailingPE?.history?.fiveYearAvg === 'number' ? parseFloat(sp500Data.trailingPE.history.fiveYearAvg.toFixed(2)) : 
            (typeof sp500Data.trailingPE?.history?.avg5 === 'number' ? parseFloat(sp500Data.trailingPE.history.avg5.toFixed(2)) : 
              (typeof sp500Data.valuation?.fiveYearAvgPE === 'number' ? parseFloat(sp500Data.valuation.fiveYearAvgPE.toFixed(2)) : 
                (typeof sp500Data.valuation?.historicalAvgPE === 'number' ? parseFloat(sp500Data.valuation.historicalAvgPE.toFixed(2)) : null))));
        
        // Format 10-year average PE with 2 decimal places
        const tenYearAvgPE = typeof sp500Data.trailingPE?.tenYearAvg === 'number' ? 
          parseFloat(sp500Data.trailingPE.tenYearAvg.toFixed(2)) : 
          (typeof sp500Data.trailingPE?.history?.tenYearAvg === 'number' ? parseFloat(sp500Data.trailingPE.history.tenYearAvg.toFixed(2)) : 
            (typeof sp500Data.trailingPE?.history?.avg10 === 'number' ? parseFloat(sp500Data.trailingPE.history.avg10.toFixed(2)) : 
              (typeof sp500Data.valuation?.tenYearAvgPE === 'number' ? parseFloat(sp500Data.valuation.tenYearAvgPE.toFixed(2)) : null)));
        
        // Format TTM EPS with 2 decimal places
        const ttmEPS = typeof sp500Data.earnings?.eps === 'number' ? 
          parseFloat(sp500Data.earnings.eps.toFixed(2)) : 
          (typeof sp500Data.earnings?.ttmEPS === 'number' ? parseFloat(sp500Data.earnings.ttmEPS.toFixed(2)) : null);
        
        // Calculate target prices at different PE multiples
        const targetAt15x = ttmEPS !== null ? parseFloat((ttmEPS * 15).toFixed(2)) : null;
        const targetAt17x = ttmEPS !== null ? parseFloat((ttmEPS * 17).toFixed(2)) : null;
        const targetAt20x = ttmEPS !== null ? parseFloat((ttmEPS * 20).toFixed(2)) : null;
        
        // Format forward EPS estimates
        const forwardEpsEstimates = [];
        if (sp500Data.forwardEstimates && Array.isArray(sp500Data.forwardEstimates)) {
          sp500Data.forwardEstimates.forEach(estimate => {
            // Check if estimate exists and has required properties
            if (estimate) {
              // Get the year from estimateDate, period, or year property
              const year = estimate.estimateDate ? 
                (estimate.estimateDate.length >= 4 ? estimate.estimateDate.slice(-4) : null) : 
                (estimate.period || estimate.year || null);
              
              // Get the EPS value from eps or value property
              const eps = typeof estimate.eps === 'number' ? 
                parseFloat(estimate.eps.toFixed(2)) : 
                (typeof estimate.value === 'number' ? parseFloat(estimate.value.toFixed(2)) : null);
              
              // Only add the estimate if we have both year and eps
              if (year && eps !== null) {
                const targetAt15x = parseFloat((eps * 15).toFixed(2));
                const targetAt17x = parseFloat((eps * 17).toFixed(2));
                const targetAt20x = parseFloat((eps * 20).toFixed(2));
                
                // Calculate percent difference from current index
                const percentVsIndex15x = indexLevel > 0 ? 
                  ((targetAt15x / indexLevel - 1) * 100).toFixed(1) : "0.0";
                const percentVsIndex17x = indexLevel > 0 ? 
                  ((targetAt17x / indexLevel - 1) * 100).toFixed(1) : "0.0";
                const percentVsIndex20x = indexLevel > 0 ? 
                  ((targetAt20x / indexLevel - 1) * 100).toFixed(1) : "0.0";
                
                forwardEpsEstimates.push({
                  year: year.toString(),
                  eps: `$${eps.toFixed(2)}`,
                  targetAt15x: `$${targetAt15x.toFixed(2)}`,
                  percentVsIndex15x: percentVsIndex15x,
                  targetAt17x: `$${targetAt17x.toFixed(2)}`,
                  percentVsIndex17x: percentVsIndex17x,
                  targetAt20x: `$${targetAt20x.toFixed(2)}`,
                  percentVsIndex20x: percentVsIndex20x
                });
              }
            }
          });
        }
        
        // Sort forward EPS estimates by year in ascending order
        forwardEpsEstimates.sort((a, b) => parseInt(a.year) - parseInt(b.year));
        
        // Get source information
        const sourceName = sp500Data.sp500Index?.sourceName || "Yahoo Finance";
        const sourceUrl = sp500Data.sp500Index?.sourceUrl || "https://finance.yahoo.com/quote/%5EGSPC/";
        
        // Format dates consistently for the entire report
        const formatDateString = (dateStr) => {
          // Use the global formatDate function for consistency
          return formatDate(dateStr);
        };
        
        const asOf = formatDateString(sp500Data.sp500Index?.lastUpdated);
        const peAsOf = formatDateString(sp500Data.trailingPE?.lastUpdated);
        const epsAsOf = formatDateString(sp500Data.earnings?.lastUpdated);
        const forwardEpsAsOf = sp500Data.forwardEstimates && sp500Data.forwardEstimates[0]?.lastUpdated ? 
          formatDateString(sp500Data.forwardEstimates[0].lastUpdated) : asOf;
        
        // Create the SP500 object with the correct structure
        fullJsonDataset.sp500 = {
          indexLevel: indexLevel,
          source: {
            name: sourceName,
            url: sourceUrl,
            asOf: asOf
          },
          sourceUrl: sourceUrl,
          asOf: asOf,
          peRatio: {
            current: currentPE,
            fiveYearAvg: fiveYearAvgPE,
            tenYearAvg: tenYearAvgPE,
            source: sourceName,
            sourceUrl: sourceUrl,
            asOf: peAsOf || asOf
          },
          eps: {
            ttm: ttmEPS !== null ? `$${ttmEPS.toFixed(2)}` : null,
            targetAt15x: targetAt15x !== null ? `$${targetAt15x.toFixed(2)}` : null,
            targetAt17x: targetAt17x !== null ? `$${targetAt17x.toFixed(2)}` : null,
            targetAt20x: targetAt20x !== null ? `$${targetAt20x.toFixed(2)}` : null,
            source: sourceName,
            sourceUrl: sourceUrl,
            asOf: epsAsOf || asOf
          },
          forwardEps: forwardEpsEstimates,
          forwardEpsSource: {
            name: sp500Data.forwardEstimates && sp500Data.forwardEstimates[0]?.sourceName || "S&P Global",
            url: sp500Data.forwardEstimates && sp500Data.forwardEstimates[0]?.sourceUrl || "https://www.spglobal.com/spdji/en/indices/equity/sp-500/",
            asOf: forwardEpsAsOf
          },
          
          // Historical P/E data - provide both detailed object and simple array for chart
          historicalPE: sp500Data.historicalPE ? 
            // For the chart, we need a simple array of the last 5 years of data
            (Array.isArray(sp500Data.historicalPE.data) && sp500Data.historicalPE.data.length >= 5 ? 
              // Reverse the array to get the most recent 5 values (chart expects oldest to newest)
              sp500Data.historicalPE.data.slice(-5).reverse() : 
              // Fallback if we don't have enough data
              []) : 
            null,
          
          // Detailed historical P/E data for other uses
          historicalPEDetails: sp500Data.historicalPE ? {
            data: Array.isArray(sp500Data.historicalPE.data) ? sp500Data.historicalPE.data : [],
            years: sp500Data.historicalPE.years || null,
            formattedData: sp500Data.historicalPE.formattedData || null,
            current: sp500Data.historicalPE.current || (sp500Data.trailingPE ? sp500Data.trailingPE.pe : null),
            fiveYearAvg: sp500Data.historicalPE.fiveYearAvg || null,
            tenYearAvg: sp500Data.historicalPE.tenYearAvg || null,
            source: sp500Data.historicalPE.source || "S&P Global",
            sourceUrl: sp500Data.historicalPE.sourceUrl || "https://www.spglobal.com/spdji/en/",
            lastUpdated: sp500Data.historicalPE.lastUpdated ? formatDate(sp500Data.historicalPE.lastUpdated) : formattedDate
          } : null
        };
        
        // Add top holdings data if available
        if (sp500Data.etfHoldings && Array.isArray(sp500Data.etfHoldings) && sp500Data.etfHoldings.length > 0) {
          // Map ETF holdings to the required format
          const topHoldings = sp500Data.etfHoldings.map(etf => {
            // Format the date consistently
            const etfAsOf = etf.lastUpdated ? formatDate(etf.lastUpdated) : asOf;
            
            // Map each ETF to the required structure
            return {
              name: etf.indexName === "S&P 500" ? "S&P 500" : 
                    etf.indexName === "NASDAQ 100" ? "NASDAQ 100" : 
                    etf.indexName === "Dow Jones Industrial Average" ? "Dow Jones 30" : 
                    etf.indexName,
              symbol: etf.symbol,
              holdings: etf.holdings.slice(0, 5).map(holding => ({
                symbol: holding.symbol ? holding.symbol.trim() : "",
                name: holding.name ? holding.name.trim() : "",
                weight: typeof holding.weight === 'string' ? 
                  parseFloat(parseFloat(holding.weight.replace('%', '')).toFixed(2)) : 
                  typeof holding.weight === 'number' ? 
                  parseFloat(holding.weight.toFixed(2)) : 
                  null
              })),
              source: etf.sourceName || "ETF Database",
              sourceUrl: etf.sourceUrl || "https://etfdb.com/",
              asOf: etfAsOf
            };
          });
          
          // Add the topHoldings array to both the SP500 object and marketIndicators for compatibility
          fullJsonDataset.sp500.topHoldings = topHoldings;
          
          // Ensure marketIndicators exists
          if (!fullJsonDataset.marketIndicators) {
            fullJsonDataset.marketIndicators = {};
          }
          
          // Add to marketIndicators as well to match the template
          fullJsonDataset.marketIndicators.topHoldings = topHoldings;
          
          // Check if fundamentalMetrics.topHoldings is empty and populate it with stock data for top holdings
          if (fullJsonDataset.fundamentalMetrics && 
              Array.isArray(fullJsonDataset.fundamentalMetrics.topHoldings) && 
              fullJsonDataset.fundamentalMetrics.topHoldings.length === 0) {
            
            if (debugMode) {
              Logger.log('fundamentalMetrics.topHoldings is empty, populating from ETF holdings data');
            }
            
            // Extract unique symbols from the top 5 holdings of each ETF
            const topSymbols = new Set();
            topHoldings.forEach(etf => {
              if (etf.holdings && Array.isArray(etf.holdings)) {
                etf.holdings.forEach(holding => {
                  if (holding.symbol) {
                    topSymbols.add(holding.symbol);
                  }
                });
              }
            });
            
            // Create stock objects for each top symbol
            const topHoldingsStocks = [];
            Array.from(topSymbols).forEach(symbol => {
              // Check if we already have this stock in majorIndices or otherStocks
              let stockData = null;
              
              // Look for the stock in otherStocks first
              if (fullJsonDataset.fundamentalMetrics.otherStocks) {
                stockData = fullJsonDataset.fundamentalMetrics.otherStocks.find(s => s.symbol === symbol);
              }
                            // If not found, create a basic stock object
                if (!stockData) {
                  stockData = {
                    symbol: symbol,
                    name: getStockNameFromSymbol(symbol, sp500Data.etfHoldings),
                    metrics: []
                  };
                  
                  // Try to get price data from Yahoo Finance
                  try {
                    // First try using getYahooFinanceData if available
                    let yahooData = typeof getYahooFinanceData === 'function' ? 
                      getYahooFinanceData(symbol) : null;
                    
                    // If that doesn't work, try fetching directly from Yahoo Finance
                    if (!yahooData || !yahooData.price) {
                      try {
                        // This is a fallback method to get basic stock data
                        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
                        const response = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
                        const responseData = JSON.parse(response.getContentText());
                        
                        if (responseData && responseData.chart && responseData.chart.result && responseData.chart.result[0]) {
                          const result = responseData.chart.result[0];
                          const meta = result.meta || {};
                          const quote = result.indicators.quote[0] || {};
                          
                          yahooData = {
                            price: meta.regularMarketPrice || 0,
                            change: meta.regularMarketChange || 0,
                            changePercent: meta.regularMarketChangePercent || 0,
                            volume: quote.volume ? quote.volume[quote.volume.length - 1] : 0,
                            name: meta.shortName || symbol
                          };
                          
                          // Update the stock name if we got a better one
                          if (yahooData.name && yahooData.name !== symbol) {
                            stockData.name = yahooData.name;
                          }
                          
                          // Add some basic metrics
                          if (meta.fiftyTwoWeekHigh) {
                            stockData.metrics.push({
                              name: "52W High",
                              value: `$${meta.fiftyTwoWeekHigh.toFixed(2)}`
                            });
                          }
                          
                          if (meta.fiftyTwoWeekLow) {
                            stockData.metrics.push({
                              name: "52W Low",
                              value: `$${meta.fiftyTwoWeekLow.toFixed(2)}`
                            });
                          }
                          
                          if (yahooData.volume) {
                            let volumeStr = yahooData.volume;
                            if (yahooData.volume >= 1000000) {
                              volumeStr = (yahooData.volume / 1000000).toFixed(1) + 'M';
                            } else if (yahooData.volume >= 1000) {
                              volumeStr = (yahooData.volume / 1000).toFixed(1) + 'K';
                            }
                            
                            stockData.metrics.push({
                              name: "Volume",
                              value: volumeStr
                            });
                          }
                          
                          if (meta.exchangeName) {
                            stockData.metrics.push({
                              name: "Exchange",
                              value: meta.exchangeName
                            });
                          }
                        }
                      } catch (yahooError) {
                        if (debugMode) {
                          Logger.log(`Error fetching Yahoo Finance data directly for ${symbol}: ${yahooError}`);
                        }
                      }
                    }
                    
                    // Update stock data with Yahoo Finance data
                    if (yahooData && yahooData.price) {
                      stockData.price = yahooData.price;
                      stockData.priceChange = yahooData.change || 0;
                      stockData.percentChange = yahooData.changePercent ? 
                        `${yahooData.changePercent.toFixed(2)}%` : '0.00%';
                    }
                  } catch (e) {
                    if (debugMode) {
                      Logger.log(`Error getting Yahoo data for ${symbol}: ${e}`);
                    }
                  }
                }
              
              // Add to topHoldingsStocks if we have valid data
              if (stockData) {
                topHoldingsStocks.push(stockData);
              }
            });
            
            // Update the fundamentalMetrics.topHoldings array
            fullJsonDataset.fundamentalMetrics.topHoldings = topHoldingsStocks;
            
            // Remove any stocks from otherStocks that are now in topHoldings to prevent duplicates
            if (fullJsonDataset.fundamentalMetrics.otherStocks && Array.isArray(fullJsonDataset.fundamentalMetrics.otherStocks)) {
              const topHoldingsSymbols = topHoldingsStocks.map(stock => stock.symbol);
              fullJsonDataset.fundamentalMetrics.otherStocks = fullJsonDataset.fundamentalMetrics.otherStocks.filter(
                stock => !topHoldingsSymbols.includes(stock.symbol)
              );
              
              if (debugMode) {
                Logger.log(`Filtered out duplicate stocks from otherStocks, ${fullJsonDataset.fundamentalMetrics.otherStocks.length} stocks remain`);
              }
            }
            
            if (debugMode) {
              Logger.log(`Added ${topHoldingsStocks.length} stocks to fundamentalMetrics.topHoldings`);
            }
          }
          
          if (debugMode) {
            Logger.log(`Mapped ${topHoldings.length} ETF holdings`);
          }
        } else {
          // If no ETF holdings data is available, set to empty array in both locations
          fullJsonDataset.sp500.topHoldings = [];
          
          // Ensure marketIndicators exists
          if (!fullJsonDataset.marketIndicators) {
            fullJsonDataset.marketIndicators = {};
          }
          
          // Add empty array to marketIndicators as well
          fullJsonDataset.marketIndicators.topHoldings = [];
          
          if (debugMode) {
            Logger.log("No ETF holdings data available");
          }
        }
        
        // Store the SP500 data for later use with RSI
        const sp500AnalysisData = sp500Data;
        
        // Debug logging for parsed SP500 data structure
        if (debugMode) {
          Logger.log("Parsed SP500 Data Structure:");
          Logger.log("Keys in sp500Data: " + Object.keys(sp500Data).join(', '));
          
          // Log specific sections we're interested in
          if (sp500Data.historicalPE) {
            Logger.log("historicalPE structure: " + JSON.stringify(sp500Data.historicalPE, null, 2));
            Logger.log("historicalPE type: " + typeof sp500Data.historicalPE);
            if (Array.isArray(sp500Data.historicalPE)) {
              Logger.log("historicalPE is an array with " + sp500Data.historicalPE.length + " elements");
            } else if (typeof sp500Data.historicalPE === 'object') {
              Logger.log("historicalPE is an object with keys: " + Object.keys(sp500Data.historicalPE).join(', '));
              if (sp500Data.historicalPE.data) {
                Logger.log("historicalPE.data type: " + typeof sp500Data.historicalPE.data);
                if (Array.isArray(sp500Data.historicalPE.data)) {
                  Logger.log("historicalPE.data is an array with " + sp500Data.historicalPE.data.length + " elements");
                  Logger.log("historicalPE.data contents: " + JSON.stringify(sp500Data.historicalPE.data));
                }
              }
            }
          } else {
            Logger.log("historicalPE is not present in sp500Data");
          }
          
          if (sp500Data.trailingPE) {
            Logger.log("trailingPE structure: " + JSON.stringify(sp500Data.trailingPE, null, 2));
            if (sp500Data.trailingPE.history) {
              Logger.log("trailingPE.history type: " + typeof sp500Data.trailingPE.history);
              if (Array.isArray(sp500Data.trailingPE.history)) {
                Logger.log("trailingPE.history is an array with " + sp500Data.trailingPE.history.length + " elements");
              } else if (typeof sp500Data.trailingPE.history === 'object') {
                Logger.log("trailingPE.history is an object with keys: " + Object.keys(sp500Data.trailingPE.history).join(', '));
                if (sp500Data.trailingPE.history.data) {
                  Logger.log("trailingPE.history.data type: " + typeof sp500Data.trailingPE.history.data);
                  if (Array.isArray(sp500Data.trailingPE.history.data)) {
                    Logger.log("trailingPE.history.data is an array with " + sp500Data.trailingPE.history.data.length + " elements");
                    Logger.log("trailingPE.history.data contents: " + JSON.stringify(sp500Data.trailingPE.history.data));
                  }
                }
              }
            }
          }
        }
        
        // Add RSI data from SP500 analysis if available
        try {
          // Use the already fetched SP500 data instead of fetching it again
          const rsiData = sp500AnalysisData;
          
          if (rsiData && rsiData.marketPath && rsiData.marketPath.rsi !== undefined) {
            const rsiValue = typeof rsiData.marketPath.rsi === 'number' ? 
              parseFloat(rsiData.marketPath.rsi.toFixed(1)) : 
              (rsiData.marketPath.rsi || null);
              
            const sourceUrl = rsiData.marketPath.sourceUrl || 'https://www.tradingview.com/symbols/SPX/';
            const source = (sourceUrl.includes('yahoo')) ? 
              'Yahoo Finance' : 
              (rsiData.marketPath.sourceName || 'Tradier (RSI)');
            
            const asOf = rsiData.marketPath.lastUpdated ? 
              formatDate(rsiData.marketPath.lastUpdated) : 
              formattedDate;
            
            // Make sure marketIndicators exists
            if (!fullJsonDataset.marketIndicators) {
              fullJsonDataset.marketIndicators = {};
            }
            
            // Add RSI data to marketIndicators
            fullJsonDataset.marketIndicators.rsi = {
              value: rsiValue,
              source: source,
              sourceUrl: sourceUrl,
              asOf: asOf
            };
            
            Logger.log(`Added RSI data: ${JSON.stringify(fullJsonDataset.marketIndicators.rsi, null, 2)}`);
          } else {
            Logger.log("No marketPath data or RSI value available in SP500 analysis");
          }
        } catch (rsiError) {
          Logger.log("Error adding RSI data: " + rsiError);
        }
        
        if (debugMode) {
          Logger.log(`Mapped SP500 data: ${JSON.stringify(fullJsonDataset.sp500, null, 2)}`);
        }
      } catch (sp500Error) {
        Logger.log(`Error processing SP500 data: ${sp500Error}`);
        // Create a minimal SP500 object with default values
        fullJsonDataset.sp500 = {
          indexLevel: null,
          source: {
            name: "Yahoo Finance",
            url: "https://finance.yahoo.com/quote/%5EGSPC/",
            asOf: formattedDate
          },
          sourceUrl: "https://finance.yahoo.com/quote/%5EGSPC/",
          asOf: formattedDate,
          peRatio: {
            current: null,
            fiveYearAvg: null,
            tenYearAvg: null,
            source: "Yahoo Finance",
            sourceUrl: "https://finance.yahoo.com/quote/%5EGSPC/key-statistics/",
            asOf: formattedDate
          },
          eps: {
            ttm: null,
            ttmFormatted: null,
            targetAt15x: null,
            targetAt15xFormatted: null,
            targetAt17x: null,
            targetAt17xFormatted: null,
            targetAt20x: null,
            targetAt20xFormatted: null,
            source: "Yahoo Finance",
            sourceUrl: "https://finance.yahoo.com/quote/%5EGSPC/analysis/",
            asOf: formattedDate
          },
          forwardEps: [
            {
              year: (new Date().getFullYear() + 1).toString(),
              eps: null,
              epsFormatted: null,
              targetAt15x: null,
              targetAt15xFormatted: null,
              percentVsIndex15x: "0.0",
              targetAt17x: null,
              targetAt17xFormatted: null,
              percentVsIndex17x: "0.0",
              targetAt20x: null,
              targetAt20xFormatted: null,
              percentVsIndex20x: "0.0"
            },
            {
              year: (new Date().getFullYear() + 2).toString(),
              eps: null,
              epsFormatted: null,
              targetAt15x: null,
              targetAt15xFormatted: null,
              percentVsIndex15x: "0.0",
              targetAt17x: null,
              targetAt17xFormatted: null,
              percentVsIndex17x: "0.0",
              targetAt20x: null,
              targetAt20xFormatted: null,
              percentVsIndex20x: "0.0"
            }
          ],
          forwardEpsSource: {
            name: "S&P Global",
            url: "https://www.spglobal.com/spdji/en/indices/equity/sp-500/",
            asOf: formattedDate
          },
          
          // Historical P/E data (empty array in fallback case for chart compatibility)
          historicalPE: [],
          // Detailed historical P/E data (null in fallback case)
          historicalPEDetails: null
        };
      }
    } else {
      // Create a minimal SP500 object with default values if no data is available
      fullJsonDataset.sp500 = {
        indexLevel: null,
        source: {
          name: "Yahoo Finance",
          url: "https://finance.yahoo.com/quote/%5EGSPC/",
          asOf: formattedDate
        },
        sourceUrl: "https://finance.yahoo.com/quote/%5EGSPC/",
        asOf: formattedDate,
        peRatio: {
          current: null,
          fiveYearAvg: null,
          tenYearAvg: null,
          source: "Yahoo Finance",
          sourceUrl: "https://finance.yahoo.com/quote/%5EGSPC/key-statistics/",
          asOf: formattedDate
        },
        eps: {
          ttm: null,
          ttmFormatted: null,
          targetAt15x: null,
          targetAt15xFormatted: null,
          targetAt17x: null,
          targetAt17xFormatted: null,
          targetAt20x: null,
          targetAt20xFormatted: null,
          source: "Yahoo Finance",
          sourceUrl: "https://finance.yahoo.com/quote/%5EGSPC/analysis/",
          asOf: formattedDate
        },
        forwardEps: [
          {
            year: (new Date().getFullYear() + 1).toString(),
            eps: null,
            epsFormatted: null,
            targetAt15x: null,
            targetAt15xFormatted: null,
            percentVsIndex15x: "0.0",
            targetAt17x: null,
            targetAt17xFormatted: null,
            percentVsIndex17x: "0.0",
            targetAt20x: null,
            targetAt20xFormatted: null,
            percentVsIndex20x: "0.0"
          },
          {
            year: (new Date().getFullYear() + 2).toString(),
            eps: null,
            epsFormatted: null,
            targetAt15x: null,
            targetAt15xFormatted: null,
            percentVsIndex15x: "0.0",
            targetAt17x: null,
            targetAt17xFormatted: null,
            percentVsIndex17x: "0.0",
            targetAt20x: null,
            targetAt20xFormatted: null,
            percentVsIndex20x: "0.0"
          }
        ],
        forwardEpsSource: {
          name: "S&P Global",
          url: "https://www.spglobal.com/spdji/en/indices/equity/sp-500/",
          asOf: formattedDate
        },
        
        // Historical P/E data (empty array in fallback case for chart compatibility)
        historicalPE: [],
        // Detailed historical P/E data (null in fallback case)
        historicalPEDetails: null
      };
    }
    
    // Populate sections from OpenAI analysis if available
    if (analysisJson && analysisJson.sections && Array.isArray(analysisJson.sections)) {
      fullJsonDataset.sections = analysisJson.sections.map(section => ({
        title: section.title || "",
        content: section.content || ""
      }));
    }
    
    // Populate key points from OpenAI analysis if available
    if (analysisJson && analysisJson.keyPoints && Array.isArray(analysisJson.keyPoints)) {
      fullJsonDataset.keyPoints = analysisJson.keyPoints.map(point => point || "");
    }
    
    // Populate opportunities and risks from OpenAI analysis if available
    if (analysisJson && analysisJson.opportunities && Array.isArray(analysisJson.opportunities)) {
      fullJsonDataset.opportunities = analysisJson.opportunities.map(opportunity => opportunity || "");
    }
    
    if (analysisJson && analysisJson.risks && Array.isArray(analysisJson.risks)) {
      fullJsonDataset.risks = analysisJson.risks.map(risk => risk || "");
    }
    
    // Populate action items from OpenAI analysis if available
    if (analysisJson && analysisJson.actionItems && Array.isArray(analysisJson.actionItems)) {
      fullJsonDataset.actionItems = analysisJson.actionItems.map(item => item || "");
    }
    
    if (debugMode) {
      Logger.log("Full JSON dataset generation completed successfully");
    }
    
    // Add debug logging for the final output JSON
    if (debugMode) {
      Logger.log("Final JSON output check:");
      if (fullJsonDataset.sp500) {
        Logger.log("sp500 section exists in final output: YES");
        Logger.log("sp500 keys: " + Object.keys(fullJsonDataset.sp500).join(", "));
        
        if (fullJsonDataset.sp500.historicalPE) {
          Logger.log("historicalPE exists in final output: YES");
          Logger.log("historicalPE type: " + typeof fullJsonDataset.sp500.historicalPE);
          if (Array.isArray(fullJsonDataset.sp500.historicalPE)) {
            Logger.log("historicalPE is an array with " + fullJsonDataset.sp500.historicalPE.length + " elements");
            if (fullJsonDataset.sp500.historicalPE.length > 0) {
              Logger.log("First few historicalPE elements: " + JSON.stringify(fullJsonDataset.sp500.historicalPE.slice(0, 3)));
            } else {
              Logger.log("historicalPE array is empty");
            }
          }
        } else {
          Logger.log("historicalPE exists in final output: NO");
          
          // Debug the extraction process
          Logger.log("Debugging historicalPE extraction process:");
          if (sp500Data) {
            Logger.log("sp500Data exists: YES");
            Logger.log("sp500Data keys: " + Object.keys(sp500Data).join(", "));
            
            if (sp500Data.historicalPE) {
              Logger.log("sp500Data.historicalPE exists: YES");
              Logger.log("sp500Data.historicalPE type: " + typeof sp500Data.historicalPE);
              if (Array.isArray(sp500Data.historicalPE)) {
                Logger.log("sp500Data.historicalPE is an array with " + sp500Data.historicalPE.length + " elements");
              } else if (typeof sp500Data.historicalPE === 'object') {
                Logger.log("sp500Data.historicalPE is an object with keys: " + Object.keys(sp500Data.historicalPE).join(", "));
                if (sp500Data.historicalPE.data) {
                  Logger.log("sp500Data.historicalPE.data exists: YES");
                  Logger.log("sp500Data.historicalPE.data type: " + typeof sp500Data.historicalPE.data);
                  if (Array.isArray(sp500Data.historicalPE.data)) {
                    Logger.log("sp500Data.historicalPE.data is an array with " + sp500Data.historicalPE.data.length + " elements");
                  }
                } else {
                  Logger.log("sp500Data.historicalPE.data exists: NO");
                }
              }
            } else {
              Logger.log("sp500Data.historicalPE exists: NO");
            }
            
            if (sp500Data.trailingPE && sp500Data.trailingPE.history) {
              Logger.log("sp500Data.trailingPE.history exists: YES");
              Logger.log("sp500Data.trailingPE.history type: " + typeof sp500Data.trailingPE.history);
              if (Array.isArray(sp500Data.trailingPE.history)) {
                Logger.log("sp500Data.trailingPE.history is an array with " + sp500Data.trailingPE.history.length + " elements");
              } else if (typeof sp500Data.trailingPE.history === 'object') {
                Logger.log("sp500Data.trailingPE.history is an object with keys: " + Object.keys(sp500Data.trailingPE.history).join(", "));
                if (sp500Data.trailingPE.history.data) {
                  Logger.log("sp500Data.trailingPE.history.data exists: YES");
                  Logger.log("sp500Data.trailingPE.history.data type: " + typeof sp500Data.trailingPE.history.data);
                  if (Array.isArray(sp500Data.trailingPE.history.data)) {
                    Logger.log("sp500Data.trailingPE.history.data is an array with " + sp500Data.trailingPE.history.data.length + " elements");
                  }
                } else {
                  Logger.log("sp500Data.trailingPE.history.data exists: NO");
                }
              }
            } else {
              Logger.log("sp500Data.trailingPE.history exists: NO");
            }
          } else {
            Logger.log("sp500Data exists: NO");
          }
        }
      } else {
        Logger.log("sp500 section does not exist in final output");
      }
    }
    
    return fullJsonDataset;
  } catch (error) {
    Logger.log(`Error in generateFullJsonDataset: ${error}`);
    // Return a minimal dataset with error information
    return {
      reportDate: new Date().toISOString(),
      reportDateFormatted: formattedDate,
      reportDateDisplay: "As of " + formattedDate,
      isTest: debugMode,
      error: {
        message: `Error generating full JSON dataset: ${error.message}`,
        stack: error.stack
      },
      metadata: {
        title: PropertiesService.getScriptProperties().getProperty('NEWSLETTER_NAME') || 'Market Pulse Daily',
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Gets the color for a decision based on the decision text
 * 
 * @param {string} decision - The decision text
 * @return {string} The color for the decision
 */
function getDecisionColor(decision) {
  if (!decision) return "#f59e0b"; // Default to yellow (warning)
  
  const decisionLower = decision.toLowerCase();
  
  if (decisionLower.includes("buy") || decisionLower.includes("bullish")) {
    return "#10b981"; // Green
  } else if (decisionLower.includes("sell") || decisionLower.includes("bearish")) {
    return "#ef4444"; // Red
  } else if (decisionLower.includes("hold") || decisionLower.includes("neutral")) {
    return "#3b82f6"; // Blue
  } else if (decisionLower.includes("watch")) {
    return "#f59e0b"; // Yellow/Orange
  } else {
    return "#8b5cf6"; // Purple (default for unknown)
  }
}

/**
 * Gets the icon for a decision based on the decision text
 * 
 * @param {string} decision - The decision text
 * @return {string} The icon for the decision
 */
function getDecisionIcon(decision) {
  if (!decision) return "⚠️"; // Default to warning
  
  const decisionLower = decision.toLowerCase();
  
  if (decisionLower.includes("buy") || decisionLower.includes("bullish")) {
    return "📈"; // Chart up
  } else if (decisionLower.includes("sell") || decisionLower.includes("bearish")) {
    return "📉"; // Chart down
  } else if (decisionLower.includes("hold") || decisionLower.includes("neutral")) {
    return "⏸️"; // Pause
  } else if (decisionLower.includes("watch")) {
    return "⚠️"; // Warning
  } else {
    return "❓"; // Question mark (default for unknown)
  }
}

/**
 * Test function to generate and save the full JSON dataset
 * This can be run directly from the Apps Script editor
 */
function testGenerateFullJsonDataset() {
  try {
    Logger.log("Starting test of full JSON dataset generation...");
    
    // Enable debug mode for this test
    const scriptProperties = PropertiesService.getScriptProperties();
    const debugMode = scriptProperties.getProperty('DEBUG_MODE') === 'true';
    
    // Get a sample analysis JSON (either from cache or generate a debug one)
    let analysisJson = null;
    const cache = CacheService.getScriptCache();
    const cachedAnalysis = cache.get('OPENAI_ANALYSIS_CACHE');
    
    if (cachedAnalysis) {
      Logger.log("Using cached OpenAI analysis for test");
      analysisJson = JSON.parse(cachedAnalysis);
    } else if (debugMode) {
        Logger.log("No cached analysis found, generating debug response");
        analysisJson = generateDebugOpenAIResponse();
    } else {
      Logger.log("No cached analysis found, getting OpenAI analysis");
      analysisJson = getOpenAITradingAnalysis();
      if (analysisJson.success === false) {
        Logger.log("Failed to get OpenAI analysis, using debug response");
        analysisJson = generateDebugOpenAIResponse();
      }
    }
    
    // Generate the full JSON dataset
    Logger.log("Generating full JSON dataset...");
    const fullJsonDataset = generateFullJsonDataset(analysisJson, debugMode);
     
    // Save the full JSON dataset to Google Drive
    const fullJsonFileName = "test-full-json-dataset.json";
    const jsonString = JSON.stringify(fullJsonDataset, null, 2);
    const fullJsonFileUrl = saveToGoogleDrive(fullJsonFileName, jsonString);
    
    Logger.log(`Test full JSON dataset saved to Google Drive: ${fullJsonFileUrl}`);
    
    // Call the Lambda service to generate HTML (optional)
    try {
      // Get the Lambda service URL from script properties
      const props = PropertiesService.getScriptProperties();
      const lambdaUrl = props.getProperty('MARKET_PULSE_LAMBDA_URL');
      const lambdaApiKey = props.getProperty('MARKET_PULSE_LAMBDA_API_KEY');
      const lambdaFunctionName = props.getProperty('MARKET_PULSE_LAMBDA_FUNCTION_NAME');
      
      if (lambdaUrl && lambdaApiKey && lambdaFunctionName) {
        Logger.log("Calling Lambda service to generate HTML...");
        const result = generateHtmlUsingProvidedLambdaService(jsonString, fullJsonFileUrl, true);
        Logger.log(`HTML generation result: ${JSON.stringify(result)}`);
      } else {
        Logger.log("Skipping Lambda service call (missing configuration)");
      }
    } catch (lambdaError) {
      Logger.log(`Error calling Lambda service: ${lambdaError}`);
    }
    
    return {
      success: true,
      message: "Full JSON dataset generated and saved successfully",
      url: fullJsonFileUrl
    };
  } catch (error) {
    Logger.log(`Error in testGenerateFullJsonDataset: ${error}`);
    return {
      success: false,
      message: `Error: ${error.message}`,
      error: error
    };
  }
}

/**
 * Generates a complete JSON dataset matching the structure of full-sample-data.json
 * This combines data from the OpenAI analysis with additional data from other sources
 * 
 * @param {Object} analysisJson - The analysis result JSON object from OpenAI
 * @param {Boolean} debugMode - Whether to include additional debug information
 * @return {Object} Complete JSON dataset
 */
function generateAndSaveFullJsonDataset(analysisJson, debugMode) {
  try {
    // Check if DEBUG_MODE is enabled if debugMode is not explicitly provided
    if (debugMode === undefined) {
      const props = PropertiesService.getScriptProperties();
      debugMode = props.getProperty('DEBUG_MODE') === 'true';
    }
    
    if (debugMode) {
      Logger.log("Generating full JSON dataset for saving to Google Drive...");
    }
    
    // Generate the full JSON dataset
    const fullJsonDataset = generateFullJsonDataset(analysisJson, debugMode);
    
    // Output a stringified version of the JSON
    const jsonString = JSON.stringify(fullJsonDataset, null, 2);
    if (debugMode) {
      Logger.log("JSON dataset stringified successfully");
    }
    
    // Save the full JSON dataset to Google Drive
    const fullJsonFileName = "full-json-dataset.json";
    const fullJsonFileUrl = saveToGoogleDrive(fullJsonFileName, jsonString);
    
    if (debugMode) {
      Logger.log(`Full JSON dataset saved to Google Drive: ${fullJsonFileUrl}`);
    }
    
    // Call the Lambda service and get the HTML response
    try {
      // Get the Lambda service URL from script properties
      const props = PropertiesService.getScriptProperties();
      const lambdaUrl = props.getProperty('MARKET_PULSE_LAMBDA_URL');
      const lambdaApiKey = props.getProperty('MARKET_PULSE_LAMBDA_API_KEY');
      const lambdaFunctionName = props.getProperty('MARKET_PULSE_LAMBDA_FUNCTION_NAME');
      
      if (!lambdaUrl || !lambdaApiKey || !lambdaFunctionName) {
        if (debugMode) {
          Logger.log('Missing MARKET_PULSE_LAMBDA_URL, MARKET_PULSE_LAMBDA_API_KEY, or MARKET_PULSE_LAMBDA_FUNCTION_NAME in Script Properties. Skipping HTML generation.');
          Logger.log('To enable HTML generation, set the following script properties:');
          Logger.log('1. MARKET_PULSE_LAMBDA_URL: The URL of your AWS Lambda function');
          Logger.log('2. MARKET_PULSE_LAMBDA_API_KEY: The API key for your Lambda function');
          Logger.log('3. MARKET_PULSE_LAMBDA_FUNCTION_NAME: The name of your Lambda function');
        }
        // Return just the JSON URL if Lambda properties are missing
        return fullJsonFileUrl;
      }
      
      return generateHtmlUsingProvidedLambdaService(jsonString, fullJsonFileUrl, true);
    } catch (lambdaError) {
      if (debugMode) {
        Logger.log(`Error calling Lambda service: ${lambdaError}`);
      }
      // Return just the JSON URL if Lambda service call failed
      return fullJsonFileUrl;
    }
  } catch (error) {
    Logger.log(`Error in generateAndSaveFullJsonDataset: ${error}`);
    throw error;
  }
}

/**
 * Generates HTML using the provided Lambda service
 * 
 * @param {String} jsonString - The JSON data as a string
 * @param {String} jsonFileUrl - The URL of the JSON file in Google Drive
 * @param {Boolean} debugMode - Whether to enable debug logging
 * @return {Object} Object containing jsonUrl and htmlUrl
 */
function generateHtmlUsingProvidedLambdaService(jsonString, jsonFileUrl, debugMode) {
  try {
    // Get the Lambda service URL from script properties
    const props = PropertiesService.getScriptProperties();
    const lambdaUrl = props.getProperty('MARKET_PULSE_LAMBDA_URL');
    const lambdaApiKey = props.getProperty('MARKET_PULSE_LAMBDA_API_KEY');
    
    if (debugMode) {
      Logger.log(`Calling Market Pulse Lambda service at: ${lambdaUrl}`);
      Logger.log(`Using API key: ${lambdaApiKey.substring(0, 5)}...`);
    }
    
    // Set up the request options
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': jsonString,
      'headers': {
        'x-api-key': lambdaApiKey
      },
      'muteHttpExceptions': true
    };
    
    // Make the request to the Lambda function
    if (debugMode) {
      Logger.log("Sending request to Lambda function...");
    }
    
    const response = UrlFetchApp.fetch(lambdaUrl, options);
    const responseCode = response.getResponseCode();
    
    if (debugMode) {
      Logger.log(`Lambda response code: ${responseCode}`);
      Logger.log(`Lambda response headers: ${JSON.stringify(response.getAllHeaders())}`);
    }
    
    if (responseCode === 200) {
      const responseContent = response.getContentText();
      
      if (!responseContent || responseContent.trim() === '') {
        throw new Error("Lambda function returned empty content");
      }
      
      let htmlContent;
      
      if (debugMode) {
        Logger.log(`Lambda response (first 200 chars): ${responseContent.substring(0, 200)}...`);
      }
      
      // Try to parse the response as JSON
      try {
        const jsonResponse = JSON.parse(responseContent);
        
        // AWS Lambda typically returns a response with statusCode, headers, and body
        if (jsonResponse.body) {
          // The body could be HTML directly or another JSON string
          try {
            // Try to parse the body as JSON
            const bodyJson = JSON.parse(jsonResponse.body);
            
            // If body is JSON and has an html property, use that
            if (bodyJson.html) {
              htmlContent = bodyJson.html;
              if (debugMode) {
                Logger.log("Extracted HTML from nested JSON response body.html");
              }
            } else {
              // Body is JSON but no html property, use stringified body
              htmlContent = jsonResponse.body;
              if (debugMode) {
                Logger.log("No html property in nested JSON, using full body");
              }
            }
          } catch (bodyParseError) {
            // If body is not JSON, assume it's HTML directly
            htmlContent = jsonResponse.body;
            if (debugMode) {
              Logger.log("Response body is not JSON, using as direct HTML");
            }
          }
        } 
        // Direct response format (no AWS Lambda wrapper)
        else if (jsonResponse.html) {
          htmlContent = jsonResponse.html;
          if (debugMode) {
            Logger.log("Extracted HTML from direct JSON response");
          }
        } else {
          // No recognizable structure, use the entire response
          htmlContent = responseContent;
          if (debugMode) {
            Logger.log("No recognizable structure in JSON response, using full response");
          }
        }
      } catch (parseError) {
        // If not valid JSON, assume the response is directly HTML
        htmlContent = responseContent;
        
        if (debugMode) {
          Logger.log("Response is not JSON, using as direct HTML");
        }
      }
      
      if (!htmlContent || htmlContent.trim() === '') {
        throw new Error("Could not extract HTML content from Lambda response");
      }
      
      if (debugMode) {
        Logger.log("Successfully extracted HTML content");
        Logger.log(`HTML content length: ${htmlContent.length} characters`);
        Logger.log(`HTML content starts with: ${htmlContent.substring(0, 100)}...`);
      }
      
      // Save the HTML directly to Google Drive
      const htmlFileName = 'MarketPulseDaily.html';
      const htmlFileUrl = saveToGoogleDrive(htmlFileName, htmlContent);
      
      if (debugMode) {
        Logger.log(`HTML saved to Google Drive: ${htmlFileUrl}`);
      }
      
      return {
        jsonUrl: jsonFileUrl,
        htmlUrl: htmlFileUrl
      };
    } else {
      // Handle error response
      Logger.log(`Error calling Lambda service: ${responseCode}`);
      Logger.log(`Response content: ${response.getContentText()}`);
      
      // Return just the JSON URL if Lambda service call failed
      return { jsonUrl: jsonFileUrl };
    }
  } catch (error) {
    // Handle any exceptions
    Logger.log(`Exception calling Lambda service: ${error.toString()}`);
    
    // Return just the JSON URL if Lambda service call failed
    return { jsonUrl: jsonFileUrl };
  }
}

/**
 * Helper function to get the classification for a given Fear and Greed Index value
 * 
 * @param {number} value - The Fear and Greed Index value
 * @return {string} The classification for the given value
 */
function getFearGreedClassification(value) {
  if (value < 25) {
    return "Extreme Fear";
  } else if (value < 45) {
    return "Fear";
  } else if (value < 55) {
    return "Neutral";
  } else if (value < 75) {
    return "Greed";
  } else {
    return "Extreme Greed";
  }
}

/**
 * Helper function to get the classification for a given value
 * 
 * @param {number} value - The value
 * @return {string} The classification for the given value
 */
function getClassificationFromValue(value) {
  if (value < 25) {
    return "Extreme Fear";
  } else if (value < 45) {
    return "Fear";
  } else if (value < 55) {
    return "Neutral";
  } else if (value < 75) {
    return "Greed";
  } else {
    return "Extreme Greed";
  }
}

/**
 * Helper function to generate analysis text for the fear and greed index
 * 
 * @param {number} currentValue - The current value of the fear and greed index
 * @param {number} previousClose - The previous close value of the fear and greed index
 * @param {number} oneWeekAgo - The value of the fear and greed index one week ago
 * @return {string} The analysis text
 */
function generateFearGreedAnalysis(currentValue, previousClose, oneWeekAgo) {
  const classification = getFearGreedClassification(currentValue);
  
  if (classification === "Extreme Fear") {
    return "The Fear and Greed Index is currently in a state of extreme fear, indicating a high level of market anxiety. This may be a good time to consider buying opportunities.";
  } else if (classification === "Fear") {
    return "The Fear and Greed Index is currently in a state of fear, indicating a moderate level of market anxiety. This may be a good time to consider buying opportunities.";
  } else if (classification === "Neutral") {
    return "The Fear and Greed Index is currently in a neutral state, indicating a balanced level of market sentiment. This may be a good time to consider holding or taking a wait-and-see approach.";
  } else if (classification === "Greed") {
    return "The Fear and Greed Index is currently in a state of greed, indicating a high level of market optimism. This may be a good time to consider selling opportunities.";
  } else if (classification === "Extreme Greed") {
    return "The Fear and Greed Index is currently in a state of extreme greed, indicating a very high level of market optimism. This may be a good time to consider selling opportunities.";
  }
  
  // If no classification is found, return a default message
  return "The Fear and Greed Index is currently at a level of " + currentValue + ", indicating a " + classification + " market sentiment.";
}

/**
 * Helper function to generate a description for the yield curve status
 * 
 * @param {string} status - The yield curve status
 * @return {string} The description for the yield curve status
 */
function generateYieldCurveDescription(status) {
  if (status === "Normal") {
    return "The yield curve is currently in a normal state, indicating a healthy economy.";
  } else if (status === "Inverted") {
    return "The yield curve is currently inverted, indicating a potential recession.";
  } else if (status === "Flat") {
    return "The yield curve is currently flat, indicating a stable economy.";
  }
  
  // If no description is found, return a default message
  return "The yield curve is currently in a state of " + status + ".";
}

/**
 * Helper function to generate analysis text for inflation
 * 
 * @param {Object} inflation - The inflation data
 * @return {string} The analysis text
 */
function generateInflationAnalysis(inflation) {
  const trend = inflation.trend || inflation.direction;
  const outlook = inflation.outlook || "";
  const marketImpact = inflation.marketImpact || "";
  
  if (trend === "Increasing") {
    return `Inflation is currently increasing, with a ${outlook} outlook and ${marketImpact} market impact.`;
  } else if (trend === "Decreasing") {
    return `Inflation is currently decreasing, with a ${outlook} outlook and ${marketImpact} market impact.`;
  } else if (trend === "Stable") {
    return `Inflation is currently stable, with a ${outlook} outlook and ${marketImpact} market impact.`;
  }
  
  // If no trend is found, return a default message
  return "Inflation is currently at a level of " + inflation.currentValue + ", with a " + inflation.outlook + " outlook and " + inflation.marketImpact + " market impact.";
}

/**
 * Test function to generate and save the full JSON dataset
 */
function testGenerateAndSaveFullJsonDataset() {
  const debugMode = scriptProperties.getProperty('DEBUG_MODE') === 'true';
  try {
    // Get the analysis from OpenAI (will use cache if available)
    const analysisJson = getOpenAITradingAnalysis();
    
    // Generate and save the full JSON dataset
    const result = generateAndSaveFullJsonDataset(analysisJson, debugMode);
    
    if (typeof result === 'object' && result.jsonUrl && result.htmlUrl) {
      Logger.log(`Full JSON dataset saved to: ${result.jsonUrl}`);
      Logger.log(`HTML saved to: ${result.htmlUrl}`);
    } else {
      Logger.log(`Full JSON dataset saved to: ${result}`);
    }
  } catch (error) {
    Logger.log(`Error in test: ${error}`);
  }
}

/**
 * Generates HTML from a JSON dataset using the Lambda function
 * 
 * @param {Object} jsonData - The JSON data object
 * @param {Boolean} debugMode - Whether to enable debug logging
 * @return {String} The generated HTML content
 */
function generateHtmlFromJson(jsonData, debugMode = false) {
  try {
    // Get script properties
    const props = PropertiesService.getScriptProperties();
    if (!props.getProperty('DEBUG_MODE')) {
      debugMode = false;
    } else {
      debugMode = props.getProperty('DEBUG_MODE') === 'true';
    }
    
    if (debugMode) {
      Logger.log("Generating HTML from JSON data using Lambda function");
    }
    
    // Convert JSON data to string if it's an object
    const jsonString = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);
    
    // Get Lambda function details from script properties
    const lambdaUrl = props.getProperty('MARKET_PULSE_LAMBDA_URL');
    const apiKey = props.getProperty('MARKET_PULSE_LAMBDA_API_KEY');
    
    if (!lambdaUrl || !apiKey) {
      throw new Error("Lambda URL or API Key not found in script properties");
    }
    
    if (debugMode) {
      Logger.log(`Using Lambda URL: ${lambdaUrl}`);
    }
    
    // Set up the request options
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': jsonString,
      'headers': {
        'x-api-key': apiKey
      },
      'muteHttpExceptions': true
    };
    
    // Make the request to the Lambda function
    if (debugMode) {
      Logger.log("Sending request to Lambda function...");
    }
    
    const response = UrlFetchApp.fetch(lambdaUrl, options);
    const responseCode = response.getResponseCode();
    
    if (debugMode) {
      Logger.log(`Lambda response code: ${responseCode}`);
      Logger.log(`Lambda response headers: ${JSON.stringify(response.getAllHeaders())}`);
    }
    
    if (responseCode === 200) {
      const responseContent = response.getContentText();
      
      if (!responseContent || responseContent.trim() === '') {
        throw new Error("Lambda function returned empty HTML content");
      }
      
      let htmlContent;
      
      // Try to parse the response as JSON
      try {
        const jsonResponse = JSON.parse(responseContent);
        
        // AWS Lambda typically returns a response with statusCode, headers, and body
        if (jsonResponse.body) {
          // The body could be HTML directly or another JSON string
          try {
            // Try to parse the body as JSON
            const bodyJson = JSON.parse(jsonResponse.body);
            
            // If body is JSON and has an html property, use that
            if (bodyJson.html) {
              htmlContent = bodyJson.html;
              if (debugMode) {
                Logger.log("Extracted HTML from nested JSON response body.html");
              }
            } else {
              // Body is JSON but no html property, use stringified body
              htmlContent = jsonResponse.body;
              if (debugMode) {
                Logger.log("No html property in nested JSON, using full body");
              }
            }
          } catch (bodyParseError) {
            // If body is not JSON, assume it's HTML directly
            htmlContent = jsonResponse.body;
            if (debugMode) {
              Logger.log("Response body is not JSON, using as direct HTML");
            }
          }
        } 
        // Direct response format (no AWS Lambda wrapper)
        else if (jsonResponse.html) {
          htmlContent = jsonResponse.html;
          if (debugMode) {
            Logger.log("Extracted HTML from direct JSON response");
          }
        } else {
          // No recognizable structure, use the entire response
          htmlContent = responseContent;
          if (debugMode) {
            Logger.log("No recognizable structure in JSON response, using full response");
          }
        }
      } catch (parseError) {
        // If not valid JSON, assume the response is directly HTML
        htmlContent = responseContent;
        
        if (debugMode) {
          Logger.log("Response is not JSON, using as direct HTML");
        }
      }
      
      return htmlContent;
    } else {
      // Handle error response
      Logger.log(`Error calling Lambda service: ${responseCode}`);
      Logger.log(`Response content: ${response.getContentText()}`);
      
      // Return just the JSON URL if Lambda service call failed
      return { jsonUrl: jsonFileUrl };
    }
  } catch (error) {
    // Handle any exceptions
    Logger.log(`Exception calling Lambda service: ${error.toString()}`);
    
    // Return just the JSON URL if Lambda service call failed
    return { jsonUrl: jsonFileUrl };
  }
}

/**
 * Test function specifically for verifying historical PE data extraction
 */
function testHistoricalPEExtraction() {
  // Get SP500 data with debug mode enabled
  var sp500Data = SP500Analyzer();
  
  Logger.log("SP500 Data retrieved: " + (sp500Data ? "YES" : "NO"));
  
  // Check if historicalPE exists
  Logger.log("historicalPE exists: " + (sp500Data.historicalPE ? "YES" : "NO"));
  
  if (sp500Data.historicalPE) {
    Logger.log("historicalPE type: " + typeof sp500Data.historicalPE);
    
    if (typeof sp500Data.historicalPE === 'object') {
      Logger.log("historicalPE keys: " + Object.keys(sp500Data.historicalPE).join(", "));
    }
    
    if (Array.isArray(sp500Data.historicalPE)) {
      Logger.log("historicalPE is an array with " + sp500Data.historicalPE.length + " elements");
    } else if (sp500Data.historicalPE.data && Array.isArray(sp500Data.historicalPE.data)) {
      Logger.log("historicalPE.data is an array with " + sp500Data.historicalPE.data.length + " elements");
    }
  }
  
  // Generate full JSON dataset with debug mode
  var fullJson = generateFullJsonDataset(null, true);
  
  // Check if historicalPE exists in the final output
  Logger.log("historicalPE in final JSON: " + (fullJson.sp500.historicalPE ? "YES" : "NO"));
  
  if (fullJson.sp500.historicalPE) {
    Logger.log("Final historicalPE structure: " + JSON.stringify(fullJson.sp500.historicalPE, null, 2));
    
    // Save the JSON to Google Drive for inspection
    var filename = "historical-pe-test-" + new Date().toISOString().replace(/[:.]/g, '-') + ".json";
    var jsonString = JSON.stringify(fullJson, null, 2);
    var file = DriveApp.createFile(filename, jsonString, MimeType.JSON);
    var fileId = file.getId();
    Logger.log("Saved full JSON to Google Drive with ID: " + fileId);
    
    return "Test completed. Historical PE data extraction " + 
           (fullJson.sp500.historicalPE.data ? "SUCCESSFUL" : "FAILED") + 
           ". Check logs for details and Google Drive for the full JSON.";
  } else {
    return "Test failed. No historicalPE data in final JSON output. Check logs for details.";
  }
}

// Export the functions for use in other scripts
var JsonExport = {
  generateFullJsonDataset: generateFullJsonDataset,
  generateAndSaveFullJsonDataset: generateAndSaveFullJsonDataset,
  testGenerateFullJsonDataset: testGenerateFullJsonDataset,
  testGenerateAndSaveFullJsonDataset: testGenerateAndSaveFullJsonDataset,
  testHistoricalPEExtraction: testHistoricalPEExtraction,
  generateHtmlFromJson: generateHtmlFromJson
};
