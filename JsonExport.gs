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
 * @param {Object} analysisJson - The analysis result JSON object from OpenAI
 * @param {Boolean} debugMode - Whether to include additional debug information
 * @return {Object} Complete JSON dataset
 */
function generateFullJsonDataset(analysisJson, debugMode = false) {
  try {
    // Enable debug logging if debugMode is true
    if (debugMode) {
      Logger.log("Generating full JSON dataset with debug mode enabled");
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
      reportDate: new Date().toISOString(),
      isTest: debugMode,
      metadata: {
        title: newsletterName,
        timestamp: formattedDate
      },
      marketSentiment: {
        overall: analysisJson && analysisJson.marketSentiment ? analysisJson.marketSentiment : "Neutral",
        analysts: [],
        source: "Aggregated from multiple financial news sources",
        lastUpdated: formattedDate
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
        fearAndGreed: {
          current: 0,
          previousClose: 0,
          oneWeekAgo: 0,
          oneMonthAgo: 0,
          oneYearAgo: 0,
          source: "CNN Money",
          url: "https://money.cnn.com/data/fear-and-greed/",
          lastUpdated: formattedDate
        },
        volatilityIndices: [],
        economicEvents: []
      },
      fundamentalMetrics: {
        majorIndices: [],
        magnificentSeven: [],
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
      sp500: {
        indexLevel: 0,
        source: {
          name: "Yahoo Finance",
          url: "https://finance.yahoo.com/quote/%5EGSPC",
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
          // Format the values with proper decimal places
          let formattedValue = typeof index.value === 'number' ? parseFloat(index.value.toFixed(2)) : index.value;
          let formattedChange = typeof index.change === 'number' ? parseFloat(index.change.toFixed(2)) : index.change;
          
          return {
            name: index.name,
            value: formattedValue,
            change: formattedChange,
            isPositive: index.change >= 0
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
      if (keyMarketIndicators.fearAndGreedIndex || keyMarketIndicators.fearAndGreed) {
        const fearGreedData = keyMarketIndicators.fearAndGreedIndex || keyMarketIndicators.fearAndGreed || {};
        
        // Get the current value from either currentValue or value field
        const currentValue = typeof fearGreedData.currentValue === 'number' ? 
          parseFloat(fearGreedData.currentValue.toFixed(0)) : 
          (typeof fearGreedData.value === 'number' ? parseFloat(fearGreedData.value.toFixed(0)) : null);
        
        // Use the existing helper function for classification
        const currentClassification = fearGreedData.rating || 
          (currentValue !== null ? getFearGreedClassification(currentValue) : null);
        
        // Get the analysis text - don't generate a default if not available
        const analysis = fearGreedData.analysis || null;
        
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
        const source = fearGreedData.source || null;
        const sourceUrl = fearGreedData.sourceUrl || null;
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
        fullJsonDataset.marketIndicators.fearGreedIndex = {
          currentValue: currentValue,
          currentClassification: currentClassification,
          previousDay: formatHistoricalValue(fearGreedData.previousClose),
          oneWeekAgo: formatHistoricalValue(fearGreedData.oneWeekAgo),
          oneMonthAgo: formatHistoricalValue(fearGreedData.oneMonthAgo),
          oneYearAgo: formatHistoricalValue(fearGreedData.oneYearAgo),
          source: source,
          sourceUrl: sourceUrl,
          asOf: formattedTimestamp,
          timestamp: timestamp,
          analysis: analysis
        };
        
        // Create the structure expected by the template
        fullJsonDataset.marketIndicators.fearGreed = {
          value: currentValue,
          category: currentClassification,
          description: analysis || generateFearGreedAnalysis(currentValue, fearGreedData.previousClose, fearGreedData.oneWeekAgo),
          oneWeekAgo: fearGreedData.oneWeekAgo || null,
          oneMonthAgo: fearGreedData.oneMonthAgo || null,
          previousClose: fearGreedData.previousClose || null,
          previousDay: fearGreedData.previousClose || null, // Add explicit previousDay field
          previousValue: fearGreedData.previousValue || fearGreedData.previousClose || null, // Add alternative field name
          color: color,
          source: source,
          sourceUrl: sourceUrl,
          asOf: formattedTimestamp
        };
        
        if (debugMode) {
          Logger.log(`Mapped Fear & Greed Index: ${JSON.stringify(fullJsonDataset.marketIndicators.fearGreedIndex, null, 2)}`);
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
      fullJsonDataset.marketSentiment.overall = marketSentimentData.overall || marketSentimentData.overallSentiment || marketSentimentData.summary || "Neutral";
      
      // Check if analysts array exists and is not empty
      if (marketSentimentData.analysts && Array.isArray(marketSentimentData.analysts) && marketSentimentData.analysts.length > 0) {
        fullJsonDataset.marketSentiment.analysts = marketSentimentData.analysts.map(analyst => {
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
      
      // Define Magnificent Seven symbols
      const magSevenSymbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"];
      
      // Process metrics for each category
      const majorIndices = [];
      const magnificentSeven = [];
      const otherStocks = [];
      
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
          if (key === "peRatio" || key === "forwardPE" || key === "pegRatio" || key === "priceToBook" || key === "priceToSales") {
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
          const stockData = metricsData[symbol];
          const stockObject = createStockObject(symbol, stockData);
          
          // Only add valid stock objects
          if (stockObject) {
            if (majorIndicesSymbols.includes(symbol)) {
              majorIndices.push(stockObject);
            } else if (magSevenSymbols.includes(symbol)) {
              magnificentSeven.push(stockObject);
            } else {
              otherStocks.push(stockObject);
            }
          }
        }
      }
      
      // Sort each category alphabetically by symbol
      majorIndices.sort((a, b) => a.symbol.localeCompare(b.symbol));
      magnificentSeven.sort((a, b) => a.symbol.localeCompare(b.symbol));
      otherStocks.sort((a, b) => a.symbol.localeCompare(b.symbol));
      
      // Update the full JSON dataset
      fullJsonDataset.fundamentalMetrics.majorIndices = majorIndices;
      fullJsonDataset.fundamentalMetrics.magnificentSeven = magnificentSeven;
      fullJsonDataset.fundamentalMetrics.otherStocks = otherStocks;
      
      // If we have no data in any category, add some sample data for testing
      if (debugMode && majorIndices.length === 0 && magnificentSeven.length === 0 && otherStocks.length === 0) {
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
        fullJsonDataset.fundamentalMetrics.magnificentSeven.push({
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
          fullJsonDataset.macroeconomicFactors.geopoliticalRisks.global = analysisJson.analysis.macroeconomicFactors.geopoliticalRisks.global;
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
        const fiveYearAvgPE = typeof sp500Data.trailingPE?.history?.avg5 === 'number' ? 
          parseFloat(sp500Data.trailingPE.history.avg5.toFixed(2)) : 
          (typeof sp500Data.valuation?.fiveYearAvgPE === 'number' ? parseFloat(sp500Data.valuation.fiveYearAvgPE.toFixed(2)) : 
            (typeof sp500Data.valuation?.historicalAvgPE === 'number' ? parseFloat(sp500Data.valuation.historicalAvgPE.toFixed(2)) : null));
        
        // Format 10-year average PE with 2 decimal places
        const tenYearAvgPE = typeof sp500Data.trailingPE?.history?.avg10 === 'number' ? 
          parseFloat(sp500Data.trailingPE.history.avg10.toFixed(2)) : 
          (typeof sp500Data.valuation?.tenYearAvgPE === 'number' ? parseFloat(sp500Data.valuation.tenYearAvgPE.toFixed(2)) : null);
        
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
          }
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
          }
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
        }
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
    
    return fullJsonDataset;
  } catch (error) {
    Logger.log(`Error in generateFullJsonDataset: ${error}`);
    // Return a minimal dataset with error information
    return {
      reportDate: new Date().toISOString(),
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
    const originalDebugMode = scriptProperties.getProperty('DEBUG_MODE');
    scriptProperties.setProperty('DEBUG_MODE', 'true');
    
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
      Logger.log("No JSON analysis available, no report to generate");
      return {
        success: false,
        message: "No JSON analysis available, no report to generate"
      };
    }
    
    // Generate the full JSON dataset
    Logger.log("Generating full JSON dataset...");
    const fullJsonDataset = generateFullJsonDataset(analysisJson, true);
    
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
    
    // Restore original debug mode setting
    if (originalDebugMode) {
      scriptProperties.setProperty('DEBUG_MODE', originalDebugMode);
    } else {
      scriptProperties.deleteProperty('DEBUG_MODE');
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
      
      return generateHtmlUsingProvidedLambdaService(jsonString, fullJsonFileUrl, debugMode);
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
    
    // Call the Lambda service with the JSON data
    const response = UrlFetchApp.fetch(lambdaUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: jsonString,
      headers: {
        'x-api-key': lambdaApiKey
      },
      muteHttpExceptions: true
    });
    const responseCode = response.getResponseCode();
    
    if (debugMode) {
      Logger.log(`Lambda service response code: ${responseCode}`);
      Logger.log(`Lambda service response headers: ${JSON.stringify(response.getAllHeaders())}`);
    }
    
    if (responseCode === 200) {
      const responseText = response.getContentText();
      if (debugMode) {
        Logger.log(`Lambda service response: ${responseText.substring(0, 200)}...`);
      }
      
      // Check if the response is HTML (starts with <!DOCTYPE or <html)
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        Logger.log('Received HTML response instead of JSON. This likely indicates an error page from the Lambda service.');
        // Return just the JSON URL if we received an error page
        return { jsonUrl: jsonFileUrl };
      }
      
      try {
        // Parse the response
        const responseJson = JSON.parse(responseText);
        
        // The Lambda function returns a nested response where the actual response is in the body property as a string
        let htmlContent;
        
        // Check if the response has the expected format
        if (responseJson.body) {
          // The body is a string that needs to be parsed
          const innerBody = JSON.parse(responseJson.body);
          if (debugMode) {
            Logger.log(`Inner body: ${JSON.stringify(innerBody).substring(0, 200)}...`);
          }
          
          if (innerBody.html) {
            htmlContent = innerBody.html;
          }
        } else if (responseJson.html) {
          // Direct format
          htmlContent = responseJson.html;
        }
        
        if (htmlContent) {
          // Save the HTML to Google Drive using the saveToGoogleDrive function
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
          Logger.log('Error: HTML content not found in the response');
          Logger.log(`Full response: ${responseText}`);
          
          // Return just the JSON URL if HTML content is not found
          return { jsonUrl: jsonFileUrl };
        }
      } catch (error) {
        Logger.log(`Error parsing Lambda response: ${error}`);
        // Return just the JSON URL if parsing failed
        return { jsonUrl: jsonFileUrl };
      }
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
 * Test function to generate and save the full JSON dataset
 */
function testGenerateAndSaveFullJsonDataset() {
  const debugMode = true;
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
