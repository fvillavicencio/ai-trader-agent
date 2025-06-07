/**
 * Generates a complete data retrieval text for the OpenAI prompt
 * Retrieves all data (market sentiment, key market indicators, fundamental metrics, and macroeconomic factors)
 * and formats it in a text format similar to sampleDataRetrieval.txt
 * @return {String} Formatted data retrieval text
 */
function generateDataRetrievalText() {
  try {
    Logger.log("Generating data retrieval text...");
    
    // Retrieve all data
    const allData = retrieveAllData();
    
    // Initialize formatted text
    let formattedText = "\n\n**Retrieved Data:**\n\n";
    
    // Add Market Sentiment section
    formattedText += "**Market Sentiment Data:**\n";
    
    if (allData && allData.success) {
      // Format market sentiment data
      formattedText += "MARKET SENTIMENT DATA:\n";
      
      if (allData.marketSentiment && allData.marketSentiment.success) {
        const marketSentimentData = allData.marketSentiment;
        formattedText += `- Last Updated: ${new Date(marketSentimentData.timestamp).toLocaleString()}\n`;
        
        // Extract the actual data
        let sentimentData = marketSentimentData.data;
        
        // Navigate through the nested data structure if needed
        if (sentimentData.data && typeof sentimentData.data === 'object') {
          sentimentData = sentimentData.data;
        }
        
        // Add analyst commentary if available
        if (sentimentData.analysts && Array.isArray(sentimentData.analysts) && sentimentData.analysts.length > 0) {
          formattedText += "- Analyst Commentary:\n";
          
          sentimentData.analysts.forEach(analyst => {
            const analystName = analyst.name || "Unknown Analyst";
            const commentary = analyst.commentary || "No commentary provided";
            const source = analyst.source || "N/A";
            const sourceUrl = analyst.url || "N/A";
            
            formattedText += `  * ${analystName}: "${commentary}" (Source: ${source}, ${sourceUrl})\n`;
            
            // Add mentioned stocks if available
            if (analyst.mentionedStocks && Array.isArray(analyst.mentionedStocks) && analyst.mentionedStocks.length > 0) {
              formattedText += `    Mentioned stocks: ${analyst.mentionedStocks.join(', ')}\n`;
            } else if (analyst.mentionedSymbols && Array.isArray(analyst.mentionedSymbols) && analyst.mentionedSymbols.length > 0) {
              formattedText += `    Mentioned stocks: ${analyst.mentionedSymbols.join(', ')}\n`;
            }
          });
        }
        
        // Add overall market sentiment if available
        if (sentimentData.overall) {
          formattedText += `- Overall Market Sentiment: ${sentimentData.overall}\n`;
        }
      } else {
        formattedText += "- Error retrieving market sentiment data\n";
      }
      
      formattedText += "\n";
      
      // Format key market indicators data
      formattedText += "**Key Market Indicators Data:**\n";
      
      if (allData.keyMarketIndicators && allData.keyMarketIndicators.success) {
        const keyMarketIndicatorsData = allData.keyMarketIndicators;
        
        // Format major indices if available
        if (keyMarketIndicatorsData.majorIndices && keyMarketIndicatorsData.majorIndices.length > 0) {
          formattedText += "- Major Indices:\n";
          
          // Sort indices alphabetically by name
          const sortedIndices = [...keyMarketIndicatorsData.majorIndices].sort((a, b) => {
            return a.name.localeCompare(b.name);
          });
          
          // Add each index
          for (const index of sortedIndices) {
            const priceStr = (index.price !== undefined && index.price !== null) ? 
                           index.price.toLocaleString() : 
                           "N/A";
            
            const percentChangeStr = (index.percentChange !== undefined && index.percentChange !== null) ? 
                               `${index.percentChange >= 0 ? "+" : ""}${formatValue(index.percentChange)}%` : 
                               "N/A";
            
            formattedText += `  * ${index.name}: ${priceStr} (${percentChangeStr})\n`;
          }
          
          // Add timestamp
          const timestamp = keyMarketIndicatorsData.majorIndices[0].timestamp || keyMarketIndicatorsData.timestamp || new Date().toLocaleString();
          formattedText += `  * Last Updated: ${new Date(timestamp).toLocaleString()}\n`;
        }
        
        // Format sector performance if available
        if (keyMarketIndicatorsData.sectorPerformance && keyMarketIndicatorsData.sectorPerformance.length > 0) {
          formattedText += "- Sector Performance:\n";
          
          // Sort sectors by performance (descending)
          const sortedSectors = [...keyMarketIndicatorsData.sectorPerformance].sort((a, b) => {
            if (a.percentChange === undefined || a.percentChange === null) return 1;
            if (b.percentChange === undefined || b.percentChange === null) return -1;
            return b.percentChange - a.percentChange;
          });
          
          // Add each sector
          for (const sector of sortedSectors) {
            const percentChangeStr = (sector.percentChange !== undefined && sector.percentChange !== null) ? 
                               `${sector.percentChange >= 0 ? "+" : ""}${formatValue(sector.percentChange)}%` : 
                               "N/A";
            
            formattedText += `  * ${sector.name}: ${percentChangeStr}\n`;
          }
          
          // Add timestamp
          const timestamp = keyMarketIndicatorsData.sectorPerformance[0].timestamp || keyMarketIndicatorsData.timestamp || new Date().toLocaleString();
          formattedText += `  * Last Updated: ${new Date(timestamp).toLocaleString()}\n`;
        }
        
        // Format CNN Fear & Greed Index
        if (keyMarketIndicatorsData.fearAndGreedIndex && !keyMarketIndicatorsData.fearAndGreedIndex.error) {
          formattedText += `* CNN Fear & Greed Index:\n`;
          formattedText += `  * Current: ${keyMarketIndicatorsData.fearAndGreedIndex.currentValue} (${keyMarketIndicatorsData.fearAndGreedIndex.rating})\n`;
          formattedText += `  * Previous Close: ${keyMarketIndicatorsData.fearAndGreedIndex.previousValue || "N/A"}\n`;
          formattedText += `  * One Week Ago: ${keyMarketIndicatorsData.fearAndGreedIndex.oneWeekAgo || "N/A"}\n`;
          formattedText += `  * One Month Ago: ${keyMarketIndicatorsData.fearAndGreedIndex.oneMonthAgo || "N/A"}\n`;
          formattedText += `  * One Year Ago: ${keyMarketIndicatorsData.fearAndGreedIndex.oneYearAgo || "N/A"}\n`;
          formattedText += `  * Last Updated: ${new Date(keyMarketIndicatorsData.fearAndGreedIndex.timestamp || new Date()).toLocaleString()}\n`;
        } else {
          formattedText += `* CNN Fear & Greed Index: Data not available\n`;
        }
        
        // Format VIX if available
        if (keyMarketIndicatorsData.volatilityIndices && keyMarketIndicatorsData.volatilityIndices.length > 0) {
          formattedText += `* Volatility Indices:\n`;
          
          // Add each volatility index
          for (const index of keyMarketIndicatorsData.volatilityIndices) {
            const valueStr = (index.value !== undefined && index.value !== null) ? 
                          index.value.toLocaleString() : 
                          "N/A";
            
            const percentChangeStr = (index.percentChange !== undefined && index.percentChange !== null) ? 
                               `${index.percentChange >= 0 ? "+" : ""}${formatValue(index.percentChange)}%` : 
                               "N/A";
            
            formattedText += `  * ${index.name}: ${valueStr} (${percentChangeStr})\n`;
          }
          
          // Add timestamp
          const timestamp = keyMarketIndicatorsData.volatilityIndices[0].timestamp || keyMarketIndicatorsData.timestamp || new Date().toLocaleString();
          formattedText += `  * Last Updated: ${new Date(timestamp).toLocaleString()}\n`;
        } else {
          formattedText += `* Volatility Indices: Data not available\n`;
        }
        
        // --- Market Futures Section (OpenAI Prompt Version) ---
        // Fetch market futures only if after hours
        let marketFuturesData = null;
        try {
          marketFuturesData = fetchMarketFuturesIfAfterHours();
        } catch (e) {
          Logger.log('Error fetching market futures: ' + e);
        }
        if (marketFuturesData && marketFuturesData.consolidated && marketFuturesData.consolidated.length > 0) {
          formattedText += "**Market Futures:**\n";
          for (const fut of marketFuturesData.consolidated) {
            const lastStr = fut.last !== undefined ? fut.last : "N/A";
            const changeStr = fut.percentChange !== undefined ? `${fut.percentChange >= 0 ? "+" : ""}${parseFloat(fut.percentChange).toFixed(2)}%` : "N/A";
            // OMIT [Tradier] for OpenAI prompt, include other providers
            let providerStr = (fut.provider && fut.provider !== "Tradier") ? ` [${fut.provider}]` : "";
            formattedText += `  * ${fut.name} (${fut.symbol}): ${lastStr} (${changeStr})${providerStr}`;
            if (fut.source && fut.source.url) {
              formattedText += ` | Source: ${fut.source.url}`;
            }
            if (fut.lastUpdated) {
              formattedText += ` | Last Updated: ${new Date(fut.lastUpdated).toLocaleString()}`;
            }
            formattedText += "\n";
          }
          formattedText += "\n";
        }
        
        // if available, add S&P 500 analysis (text formatted)
        var sp500Data = SP500Analyzer();
        if (sp500Data) {
          formattedText += "**S&P 500 Analysis:**\n";
          formattedText += formatSP500AnalysisText(sp500Data);
          formattedText += "\n";
        }


        // Format upcoming economic events
        if (keyMarketIndicatorsData.upcomingEconomicEvents && keyMarketIndicatorsData.upcomingEconomicEvents.length > 0) {
          formattedText += `* Upcoming Economic Events:\n`;
          
          // Log the raw events data for debugging
          Logger.log("Raw upcoming economic events data:");
          Logger.log(JSON.stringify(keyMarketIndicatorsData.upcomingEconomicEvents, null, 2));
          
          // Sort events by date and time (ascending)
          const sortedEvents = [...keyMarketIndicatorsData.upcomingEconomicEvents].sort((a, b) => {
            // Create date objects including time
            const dateA = new Date(`${a.date} ${a.time}`);
            const dateB = new Date(`${b.date} ${b.time}`);
            return dateA - dateB;
          });
          
          // Log the sorted events for debugging
          Logger.log("Sorted upcoming economic events:");
          Logger.log(JSON.stringify(sortedEvents, null, 2));
          
          // Use all available events from FetchEconomicEvents.gs
          const eventsToShow = sortedEvents;
          
          // Log the events to show for debugging
          Logger.log(`Number of events to show: ${eventsToShow.length}`);
          for (const event of eventsToShow) {
            Logger.log(`Event: ${JSON.stringify(event)}`);
            // Format the event with all available information
            formattedText += `  * ${event.date} : ${event.period ? event.period + " " : ""}${event.event} [${event.source}] (${event.country})\n`;
            if (event.actual !== "N/A") formattedText += `    * Actual: ${event.actual}\n`;
            if (event.forecast !== "N/A") formattedText += `    * Forecast: ${event.forecast}\n`;
            if (event.previous !== "N/A") formattedText += `    * Previous: ${event.previous}\n`;
          }
          
          // Add timestamp
          const timestamp = keyMarketIndicatorsData.upcomingEconomicEvents[0].timestamp || keyMarketIndicatorsData.timestamp || new Date().toLocaleString();
          formattedText += `  * Last Updated: ${new Date(timestamp).toLocaleString()}\n`;
        } else {
          Logger.log("No upcoming economic events data available");
          if (keyMarketIndicatorsData.upcomingEconomicEvents) {
            Logger.log("Empty events array:");
            Logger.log(JSON.stringify(keyMarketIndicatorsData.upcomingEconomicEvents, null, 2));
          }
          formattedText += `* Upcoming Economic Events: Data not available\n`;
        }
      } else {
        formattedText += "- Error retrieving key market indicators data\n";
      }
      
      formattedText += "\n";
      
      // Format fundamental metrics
      if (allData.fundamentalMetrics && allData.fundamentalMetrics.success) {
        const fundamentalMetricsData = allData.fundamentalMetrics;
        // we need to filter out deprecated symbols 

        formattedText += formatFundamentalMetricsData(fundamentalMetricsData);
        
        // Add Top ETF Holdings section directly from SP500 data
        try {
          // Clear the SP500 cache first to ensure fresh data
          if (typeof clearSP500AnalyzerCache === 'function') {
            clearSP500AnalyzerCache();
            Logger.log("Cleared SP500 cache before fetching top holdings");
          }
          
          // Get top holdings directly using the improved function
          Logger.log("Attempting to get top ETF holdings");
          const topHoldings = getTopIndexHoldings();
          
          // If we have top holdings, add them to the prompt
          if (topHoldings && topHoldings.length > 0) {
            // Filter out any indices or deprecated symbols
            const cleanedHoldings = cleanAndReplaceSymbols(topHoldings);
            Logger.log(`Original holdings: ${topHoldings.length}, Cleaned holdings: ${cleanedHoldings.length}`);
            
            // Only add to prompt if we have valid holdings after cleaning
            if (cleanedHoldings.length > 0) {
              formattedText += `\n**Top ETF Holdings (${cleanedHoldings.length} unique symbols)**\n`;
              formattedText += `All unique top holdings: ${cleanedHoldings.join(', ')}\n\n`;
              Logger.log(`Added ${cleanedHoldings.length} top ETF holdings to the OpenAI prompt`);
            } else {
              Logger.log("No valid holdings remained after cleaning");
            }
          } else {
            // If getTopIndexHoldings() didn't return any holdings, try the direct approach
            Logger.log("No top holdings found from getTopIndexHoldings(), trying direct approach");
            
            // Directly call the Lambda function to get fresh data
            const props = PropertiesService.getScriptProperties();
            const url = props.getProperty('LAMBDA_SERVICE_URL');
            const apiKey = props.getProperty('LAMBDA_API_KEY');
            
            if (!url || !apiKey) {
              Logger.log('Missing LAMBDA_SERVICE_URL or LAMBDA_API_KEY in Script Properties');
            } else {
              const options = {
                method: 'post',
                headers: {
                  'x-api-key': apiKey
                },
                muteHttpExceptions: true
              };
              
              Logger.log("Making direct Lambda call to fetch ETF holdings");
              try {
                const response = UrlFetchApp.fetch(url, options);
                const responseCode = response.getResponseCode();
                Logger.log(`Lambda API response code: ${responseCode}`);
                
                if (responseCode === 200) {
                  const responseText = response.getContentText();
                  Logger.log(`Lambda API response length: ${responseText.length} characters`);
                  
                  const sp500Data = JSON.parse(responseText);
                  Logger.log("Successfully parsed Lambda response");
                  
                  // Extract ETF holdings using a similar approach to getTopIndexHoldings
                  let parsedData;
                  try {
                    // Parse the body if it's a string
                    if (sp500Data.body) {
                      parsedData = typeof sp500Data.body === 'string' ? JSON.parse(sp500Data.body) : sp500Data.body;
                    } else {
                      parsedData = sp500Data;
                    }
                    
                    // Find ETF holdings in the data structure
                    let etfHoldings = null;
                    if (parsedData.etfHoldings) {
                      etfHoldings = parsedData.etfHoldings;
                    } else if (parsedData.data && parsedData.data.etfHoldings) {
                      etfHoldings = parsedData.data.etfHoldings;
                    } else if (parsedData.sp500 && parsedData.sp500.etfHoldings) {
                      etfHoldings = parsedData.sp500.etfHoldings;
                    }
                    
                    // Parse etfHoldings if it's a string
                    if (etfHoldings && typeof etfHoldings === 'string') {
                      etfHoldings = JSON.parse(etfHoldings);
                    }
                    
                    // Process ETF holdings if found
                    if (etfHoldings && Array.isArray(etfHoldings) && etfHoldings.length > 0) {
                      // Extract unique symbols from all ETF holdings
                      const topSymbols = new Set();
                      
                      etfHoldings.forEach(etf => {
                        if (etf && etf.holdings && Array.isArray(etf.holdings)) {
                          // Get top 5 holdings from each ETF
                          etf.holdings.slice(0, 5).forEach(holding => {
                            const symbol = holding.symbol || holding.ticker;
                            if (symbol) {
                              topSymbols.add(symbol.trim());
                            }
                          });
                        }
                      });
                      
                      // Convert to array and clean symbols
                      const holdingsArray = Array.from(topSymbols);
                      const cleanedHoldings = cleanAndReplaceSymbols(holdingsArray);
                      
                      // Add to the prompt if we have valid holdings
                      if (cleanedHoldings.length > 0) {
                        formattedText += `\n**Top ETF Holdings (${cleanedHoldings.length} unique symbols)**\n`;
                        formattedText += `All unique top holdings: ${cleanedHoldings.join(', ')}\n\n`;
                        Logger.log(`Added ${cleanedHoldings.length} top ETF holdings to the OpenAI prompt via direct approach`);
                      } else {
                        Logger.log("No valid holdings found via direct approach after cleaning");
                      }
                    } else {
                      Logger.log("No ETF holdings found in the Lambda response");
                    }
                  } catch (parseError) {
                    Logger.log(`Error processing Lambda data for top holdings: ${parseError}`);
                  }
                } else {
                  Logger.log(`Lambda API request failed with code ${responseCode}`);
                }
              } catch (fetchError) {
                Logger.log(`Error fetching from Lambda API: ${fetchError}`);
              }
            }
          }
        } catch (sp500Error) {
          Logger.log(`Error retrieving SP500 data for top holdings: ${sp500Error}`);
        }
      } else {
        formattedText += "**Fundamental Metrics:**\n";
        formattedText += "- Error retrieving fundamental metrics data\n\n";
      }
      
      // Format macroeconomic factors
      if (allData.macroeconomicFactors && allData.macroeconomicFactors.success) {
        const macroData = allData.macroeconomicFactors;
        formattedText += formatMacroeconomicFactorsData(macroData);
      } else {
        formattedText += "**Macroeconomic Factors:**\n";
        formattedText += "- Error retrieving macroeconomic factors data\n\n";
      }
    } else {
      formattedText += "Error retrieving data: " + (allData ? allData.message : "Unknown error");
    }
    
    Logger.log("Data retrieval text generated successfully.");
    return formattedText;
  } catch (error) {
    Logger.log(`Error in generateDataRetrievalText: ${error}`);
    return `Error: ${error}`;
  }
}

/**
 * Retrieves all data needed for the trading analysis
 * @return {Object} All data needed for the trading analysis
 */
function retrieveAllData() {
  try {
    Logger.log("Retrieving all data for trading analysis...");
    
    // Get the current date
    const currentDate = new Date();
    
    // Retrieve market sentiment data
    const marketSentimentData = retrieveMarketSentiment();
    if (!marketSentimentData.success) {
      return {
        success: false,
        message: "Failed to retrieve market sentiment data",
        error: marketSentimentData.error
      };
    }
    
    // Retrieve key market indicators
    const keyMarketIndicatorsData = retrieveKeyMarketIndicators();
    if (!keyMarketIndicatorsData.success) {
      return {
        success: false,
        message: "Failed to retrieve key market indicators",
        error: keyMarketIndicatorsData.error
      };
    }
    
    // Retrieve fundamental metrics
    const defaultSymbols = ["SPY", "QQQ", "IWM", "DIA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"];
    const mentionedStocks = marketSentimentData.mentionedStocks || [];

    // Get deduplicated top index holdings (excluding major indices)
    const majorIndices = ["SPY", "QQQ", "IWM", "DIA"];
    const topIndexHoldings = getTopIndexHoldings();
    const filteredTopHoldings = topIndexHoldings.filter(symbol => !majorIndices.includes(symbol));

    // Merge all symbols needed for fundamental metrics
    const allSymbolsRaw = [...defaultSymbols, ...mentionedStocks, ...filteredTopHoldings];
    const cleanedSymbols = [...new Set(cleanAndReplaceSymbols(allSymbolsRaw))];
    const fundamentalMetricsData = retrieveFundamentalMetrics(cleanedSymbols);

    // Log the metrics for debugging
    Logger.log(`Fundamental metrics data: ${JSON.stringify(fundamentalMetricsData, null, 2)}`);
    
    if (!fundamentalMetricsData.success) {
      Logger.log(`Error retrieving fundamental metrics: ${fundamentalMetricsData.error}`);
      return {
        success: false,
        message: "Failed to retrieve fundamental metrics",
        error: fundamentalMetricsData.error
      };
    }
    
    // Retrieve macroeconomic factors
    const macroeconomicFactorsData = retrieveMacroeconomicFactors();
    if (!macroeconomicFactorsData.success) {
      return {
        success: false,
        message: "Failed to retrieve macroeconomic factors",
        error: macroeconomicFactorsData.error
      };
    }
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      marketSentiment: marketSentimentData,
      keyMarketIndicators: keyMarketIndicatorsData,
      fundamentalMetrics: fundamentalMetricsData,
      macroeconomicFactors: macroeconomicFactorsData
    };
  } catch (error) {
    Logger.log(`Error in retrieveAllData: ${error}`);
    return {
      success: false,
      message: `Error retrieving data: ${error.message}`,
      error: error
    };
  }
}

/**
 * Helper function to parse yield term to months
 * @param {string} term - The yield term (e.g., "3-month", "1-year")
 * @return {number} Number of months
 */
function parseTermToMonths(term) {
  if (!term) return 0;
  
  term = term.toLowerCase();
  
  // Handle common terms
  if (term.includes('month')) {
    const months = parseInt(term.replace(/[^\d]/g, ''));
    return months || 0;
  }
  
  if (term.includes('year')) {
    const years = parseInt(term.replace(/[^\d]/g, ''));
    return (years || 0) * 12;
  }
  
  // Handle specific terms
  if (term.includes('30-day')) return 1;
  if (term.includes('90-day')) return 3;
  if (term.includes('180-day')) return 6;
  
  return 0;
}

/**
 * Helper function to format a value with optional fixed decimals
 * @param {number|string} value - The value to format
 * @param {boolean} fixedDecimals - Whether to use fixed decimals
 * @param {number} decimals - Number of decimal places
 * @return {string} Formatted value
 */
function formatValue(value, fixedDecimals = false, decimals = 2) {
  if (value === undefined || value === null) {
    return "N/A";
  }
  
  if (typeof value === 'string' && !isNaN(value)) {
    value = parseFloat(value);
  }
  
  if (typeof value !== 'number') {
    return value.toString();
  }
  
  if (fixedDecimals) {
    return value.toFixed(decimals);
  }
  
  return value.toString();
}

/**
 * Formats macroeconomic factors data
 * @param {Object} macroData - Macroeconomic factors data
 * @return {string} Formatted macroeconomic factors data
 */
function formatMacroeconomicFactorsData(macroData) {
  try {
    Logger.log("Formatting macroeconomic factors data...");
    
    let formattedText = "**Macroeconomic Factors:**\n\n";
    
    // Format treasury yields
    if (macroData.treasuryYields) {
      formattedText += "**Treasury Yields:**\n";
      formattedText += `- 3-Month: ${formatValue(macroData.treasuryYields.threeMonth)}%\n`;
      formattedText += `- 1-Year: ${formatValue(macroData.treasuryYields.oneYear)}%\n`;
      formattedText += `- 2-Year: ${formatValue(macroData.treasuryYields.twoYear)}%\n`;
      formattedText += `- 5-Year: ${formatValue(macroData.treasuryYields.fiveYear)}%\n`;
      formattedText += `- 10-Year: ${formatValue(macroData.treasuryYields.tenYear)}%\n`;
      formattedText += `- 30-Year: ${formatValue(macroData.treasuryYields.thirtyYear)}%\n`;
      formattedText += `- Yield Curve: ${macroData.treasuryYields.yieldCurve || 'N/A'}\n`;
      formattedText += `- Source: ${macroData.treasuryYields.source || 'N/A'} (${macroData.treasuryYields.sourceUrl || 'N/A'})\n`;
      formattedText += `- Last Updated: ${formatValue(macroData.treasuryYields.timestamp) || 'N/A'}\n\n`;
    }
    
    // Format Fed policy
    if (macroData.fedPolicy && !macroData.fedPolicy.error) {
      formattedText += "**Federal Reserve Policy:**\n";
      Logger.log("Fed policy data: " + JSON.stringify(macroData.fedPolicy));
      formattedText += `- Current Rate: ${formatValue(macroData.fedPolicy.currentRate)}%\n`;
      formattedText += `- Next Meeting: ${formatValue(macroData.fedPolicy.nextMeeting.startDate) || 'N/A'}\n`;
      formattedText += `- Forward Guidance: ${formatValue(macroData.fedPolicy.forwardGuidance) || 'N/A'}\n`;
      formattedText += `- Source: ${formatValue(macroData.fedPolicy.source) || 'N/A'} (${formatValue(macroData.fedPolicy.sourceUrl) || 'N/A'})\n`;
      formattedText += `- Last Updated: ${formatValue(macroData.fedPolicy.timestamp) || 'N/A'}\n\n`;
    }
    
    // Format inflation data
    if (macroData.inflation) {
      formattedText += "**Inflation Data:**\n";
      formattedText += `- CPI Headline: ${formatValue(macroData.inflation.cpi.headline)}%\n`;
      formattedText += `- CPI Core: ${formatValue(macroData.inflation.cpi.core)}%\n`;
      formattedText += `- PCE Headline: ${formatValue(macroData.inflation.pce.headline)}%\n`;
      formattedText += `- PCE Core: ${formatValue(macroData.inflation.pce.core)}%\n`;
      
      // Add inflation expectations if available
      if (macroData.inflation.expectations) {
        formattedText += `\n**Inflation Expectations:**\n`;
        formattedText += `- 1-Year: ${formatValue(macroData.inflation.expectations.oneYear)}%\n`;
        formattedText += `- 5-Year: ${formatValue(macroData.inflation.expectations.fiveYear)}%\n`;
        formattedText += `- 10-Year: ${formatValue(macroData.inflation.expectations.tenYear)}%\n`;
        formattedText += `- Source: ${formatValue(macroData.inflation.expectations.source) || 'N/A'} (${formatValue(macroData.inflation.expectations.sourceUrl) || 'N/A'})\n`;
        formattedText += `- Last Updated: ${formatValue(macroData.inflation.expectations.timestamp) || 'N/A'}\n\n`;
      }
      
      formattedText += `- Source: ${formatValue(macroData.inflation.source) || 'N/A'} (${formatValue(macroData.inflation.sourceUrl) || 'N/A'})\n`;
      formattedText += `- Last Updated: ${formatValue(macroData.inflation.timestamp) || 'N/A'}\n\n`;
    }
    
    // Format geopolitical risks
    if (macroData.geopoliticalRisks && macroData.geopoliticalRisks.risks && Array.isArray(macroData.geopoliticalRisks.risks)) {
      formattedText += "**Geopolitical Risks:**\n";
      
      Logger.log(`Formatting ${macroData.geopoliticalRisks.risks.length} geopolitical risks`);
      
      // Sort risks by impact level (descending)
      const sortedRisks = [...macroData.geopoliticalRisks.risks].sort((a, b) => {
        if (a.impactLevel === undefined || a.impactLevel === null) return 1;
        if (b.impactLevel === undefined || b.impactLevel === null) return -1;
        
        // Handle numeric impact levels
        if (typeof a.impactLevel === 'number' && typeof b.impactLevel === 'number') {
          return b.impactLevel - a.impactLevel;
        }
        
        // Handle string impact levels that might contain numbers (e.g., "8/10")
        const aMatch = String(a.impactLevel).match(/(\d+)/);
        const bMatch = String(b.impactLevel).match(/(\d+)/);
        
        if (aMatch && bMatch) {
          return parseInt(bMatch[1]) - parseInt(aMatch[1]);
        }
        
        return 0;
      });
      
      for (const risk of sortedRisks) {
        formattedText += `* ${formatValue(risk.name) || 'Unknown Risk'}: ${formatValue(risk.description) || 'No description'}\n`;
        formattedText += `  * Region: ${formatValue(risk.region) || 'Unknown Region'}\n`;
        formattedText += `  * Impact Level: ${formatValue(risk.impactLevel) || 'Unknown'}\n`;
        formattedText += `  * Source: ${formatValue(risk.source) || 'N/A'} (${formatValue(risk.sourceUrl) || 'N/A'})\n`;
        formattedText += `  * Last Updated: ${formatValue(risk.lastUpdated || risk.timestamp) || 'N/A'}\n\n`;
      }
    }
    
    return formattedText;
  } catch (error) {
    Logger.log(`Error in formatMacroeconomicFactorsData: ${error}`);
    throw error;
  }
}

/**
 * Formats key market indicators data
 * @param {Object} data - Key market indicators data
 * @return {string} Formatted key market indicators data
 */
function formatKeyMarketIndicatorsData(data) {
  try {
    Logger.log("Formatting key market indicators data...");
    
    let formattedText = "**Key Market Indicators:**\n\n";
    
    // Format major indices
    if (data.majorIndices && Array.isArray(data.majorIndices)) {
      formattedText += "**Major Indices:**\n";
      for (const index of data.majorIndices) {
        formattedText += `- ${index.name}: ${formatValue(index.value)} (${formatValue(index.change)}%)\n`;
      }
      formattedText += `- Last Updated: ${formatValue(data.lastUpdated)}\n\n`;
    }
    
    // Format sector performance
    if (data.sectorPerformance && Array.isArray(data.sectorPerformance)) {
      formattedText += "**Sector Performance:**\n";
      for (const sector of data.sectorPerformance) {
        formattedText += `- ${sector.name}: ${formatValue(sector.value)}%\n`;
      }
      formattedText += `- Last Updated: ${formatValue(data.sectorPerformanceTimestamp)}\n\n`;
    }
    
    // Format volatility indices
    if (data.volatilityIndices && Array.isArray(data.volatilityIndices)) {
      formattedText += "**Volatility Indices:**\n";
      for (const index of data.volatilityIndices) {
        formattedText += `- ${index.name}: ${formatValue(index.value)} (${formatValue(index.change)}%)\n`;
      }
      formattedText += `- Last Updated: ${formatValue(data.volatilityIndicesTimestamp)}\n\n`;
    }
    
    // Format upcoming events
    if (data.upcomingEvents && Array.isArray(data.upcomingEvents)) {
      formattedText += "**Upcoming Economic Events:**\n";
      for (const event of data.upcomingEvents) {
        formattedText += `- ${formatValue(event.date)}: ${formatValue(event.event)} (Importance: ${formatValue(event.importance)})\n`;
      }
      formattedText += `- Last Updated: ${formatValue(data.upcomingEventsTimestamp)}\n\n`;
    }
    
    return formattedText;
  } catch (error) {
    Logger.log(`Error in formatKeyMarketIndicatorsData: ${error}`);
    throw error;
  }
}

/**
 * Formats a value
 * @param {number|string} value - The value to format
 * @param {number} decimals - Number of decimal places
 * @return {string} Formatted value
 */
function formatValue(value, decimals = 2) {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') {
    return value.toFixed(decimals);
  }
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  return String(value);
}

/**
 * Test function to output all stock data for debugging
 * This function retrieves fundamental metrics for a set of stocks and outputs them in a formatted way
 */
function testFundamentalMetricsOutput() {
  try {
    // Define the symbols to test
    const symbols = ["QQQ", "TSLA", "PG", "SPY"];
    
    // Retrieve fundamental metrics
    const metricsData = retrieveFundamentalMetrics(symbols);
    
    // Format the output
    let output = "## Stock Data for Debugging\n\n";
    
    // Format each symbol's data
    for (const symbol of symbols) {
      const metrics = metricsData.metrics[symbol];
      
      if (!metrics || metrics.error) {
        output += `* ${symbol}: Error retrieving data - ${metrics?.error || 'Unknown error'}\n\n`;
        continue;
      }
      
      output += `* ${symbol} (${metrics.company || 'N/A'}): $${formatValue(metrics.price, true)} (${metrics.priceChange >= 0 ? '+' : ''}${formatValue(metrics.priceChange, true)}, ${metrics.changesPercentage >= 0 ? '+' : ''}${formatValue(metrics.changesPercentage, true)}%)\n`;
      output += `  * Sector: ${metrics.sector || 'N/A'}\n`;
      output += `  * Industry: ${metrics.industry || 'N/A'}\n`;
      
      // Add market cap if available
      if (metrics.marketCap) {
        const formattedMarketCap = formatMarketCap(metrics.marketCap);
        output += `  * Market Cap: ${formattedMarketCap}\n`;
      }
      
      // Add volume
      const formattedVolume = formatVolume(metrics.volume);
      output += `  * Volume: ${formattedVolume}\n`;
      
      // Add metrics
      if (metrics.pegRatio !== null) output += `  * PEG Ratio: ${formatValue(metrics.pegRatio)}\n`;
      if (metrics.forwardPE !== null) output += `  * Forward P/E: ${formatValue(metrics.forwardPE)}\n`;
      if (metrics.priceToBook !== null) output += `  * Price/Book: ${formatValue(metrics.priceToBook)}\n`;
      if (metrics.priceToSales !== null) output += `  * Price/Sales: ${formatValue(metrics.priceToSales)}\n`;
      if (metrics.debtToEquity !== null) output += `  * Debt/Equity: ${formatValue(metrics.debtToEquity)}\n`;
      if (metrics.returnOnEquity !== null) output += `  * Return on Equity: ${formatValue(metrics.returnOnEquity)}%\n`;
      if (metrics.returnOnAssets !== null) output += `  * Return on Assets: ${formatValue(metrics.returnOnAssets)}%\n`;
      if (metrics.profitMargin !== null) output += `  * Profit Margin: ${formatValue(metrics.profitMargin)}%\n`;
      if (metrics.dividendYield !== null) output += `  * Dividend Yield: ${formatValue(metrics.dividendYield)}%\n`;
      if (metrics.beta !== null) output += `  * Beta: ${formatValue(metrics.beta)}\n`;
      if (metrics.summary !== null) output += `  * Summary: ${formatValue(metrics.summary)}\n`;
      if (metrics.lastUpdated !== null) output += `  * Last Updated: ${formatValue(metrics.lastUpdated)}\n`;
      
      output += "\n";
    }
    
    Logger.log(output);
    return output;
  } catch (error) {
    Logger.log(`Error in testFundamentalMetricsOutput: ${error}`);
    throw error;
  }
}

/**
 * Helper functions for formatting
 * @param {number} marketCap - Market capitalization
 * @return {string} Formatted market capitalization
 */
function formatMarketCap(marketCap) {
  if (!marketCap) return "N/A";
  if (marketCap >= 1e12) return "$" + (marketCap / 1e12).toFixed(2) + "T";
  if (marketCap >= 1e9) return "$" + (marketCap / 1e9).toFixed(2) + "B";
  if (marketCap >= 1e6) return "$" + (marketCap / 1e6).toFixed(2) + "M";
  return "$" + marketCap.toFixed(2);
}

/**
 * Helper functions for formatting
 * @param {number} volume - Trading volume
 * @return {string} Formatted trading volume
 */
function formatVolume(volume) {
  if (!volume) return "N/A";
  if (volume >= 1e9) return (volume / 1e9).toFixed(2) + "B";
  if (volume >= 1e6) return (volume / 1e6).toFixed(2) + "M";
  if (volume >= 1e3) return (volume / 1e3).toFixed(2) + "K";
  return volume.toString();
}

/**
 * Helper functions for formatting
 * @param {number|string} value - The value to format
 * @param {boolean} fixedDecimals - Whether to use fixed decimals
 * @param {number} decimals - Number of decimal places
 * @return {string} Formatted value
 */
function formatValue(value, fixedDecimals = false, decimals = 2) {
  if (value === undefined || value === null) {
    return "N/A";
  }
  
  if (typeof value === 'string' && !isNaN(value)) {
    value = parseFloat(value);
  }
  
  if (typeof value !== 'number') {
    return value.toString();
  }
  
  if (fixedDecimals) {
    return value.toFixed(decimals);
  }
  
  return value.toString();
}

function cleanAndReplaceSymbols(symbols) {
  const deprecatedSymbols = {
    'FB': 'META',  // Facebook/Meta Platforms
    'TWTR': 'X',   // Twitter/X
    'VIX': 'VIX.X', // CBOE Volatility Index
    'GOOG': 'GOOGL', // Google Class A shares
  };
  const deprecatedNamesLower = [
    'S&P 500',
    'S&P 400',
    'Russell 2000',
    'U.S. Treasuries',
    'NASDAQ'
  ].map(n => n.toLowerCase());

  // Replace deprecated symbols and filter out deprecated names
  return symbols
    .map(symbol => deprecatedSymbols[symbol] || symbol)
    .filter(symbol => !deprecatedNamesLower.includes(symbol.trim().toLowerCase()));
}

/**
 * Gets the top holdings from all ETFs in SP500Analyzer
 * @return {Array} Array of stock symbols representing top holdings across all ETFs
 */
function getTopIndexHoldings() {
  try {
    // Get SP500 analysis data
    const sp500Data = SP500Analyzer();
    Logger.log('SP500Analyzer returned data: ' + (sp500Data ? 'yes' : 'no'));
    
    // If no data, return empty array
    if (!sp500Data) {
      Logger.log('No SP500 data available for top holdings extraction');
      return [];
    }
    
    // Parse the body if it's a string
    let data;
    try {
      // Log the structure of sp500Data for debugging
      Logger.log('SP500 data structure: ' + JSON.stringify(sp500Data).substring(0, 200) + '...');
      
      // Handle different data structures
      if (sp500Data.body) {
        data = typeof sp500Data.body === 'string' ? JSON.parse(sp500Data.body) : sp500Data.body;
        Logger.log('Parsed data from sp500Data.body');
      } else {
        // If there's no body property, assume the data is directly in sp500Data
        data = sp500Data;
        Logger.log('Using sp500Data directly as data');
      }
      
      // Log the keys in the parsed data
      Logger.log('Parsed data keys: ' + (data ? Object.keys(data).join(', ') : 'none'));
    } catch (e) {
      Logger.log('Error parsing SP500 data: ' + e);
      return [];
    }
    
    // Check for ETF holdings in various possible locations in the data structure
    let etfHoldings = null;
    
    if (data.etfHoldings) {
      etfHoldings = data.etfHoldings;
      Logger.log('Found etfHoldings directly in data');
    } else if (data.data && data.data.etfHoldings) {
      etfHoldings = data.data.etfHoldings;
      Logger.log('Found etfHoldings in data.data');
    } else if (data.sp500 && data.sp500.etfHoldings) {
      etfHoldings = data.sp500.etfHoldings;
      Logger.log('Found etfHoldings in data.sp500');
    }
    
    // If etfHoldings is a string, try to parse it
    if (etfHoldings && typeof etfHoldings === 'string') {
      try {
        etfHoldings = JSON.parse(etfHoldings);
        Logger.log('Parsed etfHoldings from string');
      } catch (e) {
        Logger.log('Error parsing etfHoldings string: ' + e);
      }
    }
    
    // If no ETF holdings found, return empty array
    if (!etfHoldings || !Array.isArray(etfHoldings) || etfHoldings.length === 0) {
      Logger.log('No ETF holdings data available after parsing');
      return [];
    }
    
    Logger.log(`Found ${etfHoldings.length} ETFs with holdings data`);
    
    // Create a map to track symbols and their total weight across all ETFs
    const holdingsMap = new Map();
    
    // Process each ETF's holdings
    etfHoldings.forEach(etf => {
      if (!etf) return;
      
      // Log the ETF structure for debugging
      Logger.log(`Processing ETF: ${etf.symbol || 'unknown'} with ${etf.holdings && Array.isArray(etf.holdings) ? etf.holdings.length : 0} holdings`);
      
      if (etf.holdings && Array.isArray(etf.holdings)) {
        // Get top 5 holdings from each ETF
        etf.holdings.slice(0, 5).forEach(holding => {
          // Handle different holding structures
          const rawSymbol = holding.symbol || holding.ticker || (typeof holding === 'string' ? holding : null);
          if (!rawSymbol) {
            Logger.log('Skipping holding with no symbol: ' + JSON.stringify(holding).substring(0, 100));
            return;
          }
          
          // Trim whitespace and ensure it's a valid symbol
          const symbol = rawSymbol.trim();
          if (!symbol) return;
          
          // Clean the symbol using the existing function
          const cleanedSymbol = cleanAndReplaceSymbols([symbol])[0];
          if (!cleanedSymbol) return;
          
          // If symbol already exists in map, add to its weight
          if (holdingsMap.has(cleanedSymbol)) {
            holdingsMap.set(cleanedSymbol, holdingsMap.get(cleanedSymbol) + 1);
          } else {
            holdingsMap.set(cleanedSymbol, 1);
          }
        });
      }
    });
    
    Logger.log(`Collected ${holdingsMap.size} unique symbols from all ETFs`);
    
    // Convert map to array of symbols
    const topHoldings = Array.from(holdingsMap.entries())
      // Sort by frequency (descending)
      .sort((a, b) => b[1] - a[1])
      // Extract just the symbols
      .map(entry => entry[0]);
    
    // Make sure we're returning ALL unique holdings (no arbitrary limit)
    Logger.log(`Extracted ${topHoldings.length} top holdings from SP500Analyzer: ${topHoldings.join(', ')}`);
    return topHoldings;
  } catch (error) {
    Logger.log(`Error getting top index holdings: ${error}`);
    return [];
  }
}

/**
 * Formats fundamental metrics data
 * @param {Object} fundamentalMetricsData - Fundamental metrics data
 * @return {string} Formatted fundamental metrics data
 */
function formatFundamentalMetricsData(fundamentalMetricsData) {
  try {
    Logger.log("Formatting fundamental metrics data...");
    
    // Get the metrics object from the data
    const metricsObj = fundamentalMetricsData.metrics?.metrics;
    
    if (!metricsObj) {
      return "No fundamental metrics data available\n";
    }
    
    // Organize stocks into categories
    const majorIndices = ["SPY", "QQQ", "IWM", "DIA"];
    
    // Get top index holdings from SP500Analyzer
    const topIndexHoldings = getTopIndexHoldings();
    Logger.log(`Retrieved ${topIndexHoldings.length} top index holdings from SP500Analyzer`);
    Logger.log(`Top index holdings: ${topIndexHoldings.join(', ')}`);
    
    // Filter out any top holdings that are already in majorIndices
    const filteredTopHoldings = topIndexHoldings.filter(symbol => !majorIndices.includes(symbol));
    Logger.log(`After filtering out major indices, ${filteredTopHoldings.length} top holdings remain`);
    Logger.log(`Filtered top holdings: ${filteredTopHoldings.join(', ')}`);
    
    // Get the original ETF holdings data to show details
    const sp500Data = SP500Analyzer();
    let etfData;
    try {
      etfData = typeof sp500Data.body === 'string' ? JSON.parse(sp500Data.body) : sp500Data.body;
    } catch (e) {
      Logger.log(`Error parsing SP500 data: ${e}`);
      etfData = null;
    }
    
    // Get other stocks (not in majorIndices or topIndexHoldings)
    const otherStocks = Object.keys(metricsObj).filter(
      symbol =>
        !majorIndices.includes(symbol) &&
        !filteredTopHoldings.includes(symbol) &&
        cleanAndReplaceSymbols([symbol])[0] === symbol
    );
    
    // Helper function to format a single stock
    function formatStock(symbol, metrics) {
      if (!metrics || metrics.error) {
        return `* ${symbol}: Error retrieving data - ${metrics?.error || 'Unknown error'}\n\n`;
      }
      
      // Calculate percentage change if not available
      let priceChangePercent = "N/A";
      if (metrics.changesPercentage === null && metrics.priceChange !== null && metrics.price !== null) {
        priceChangePercent = `${(metrics.priceChange / (metrics.price + metrics.priceChange) * 100).toFixed(2)}%`;
      } else if (metrics.changesPercentage !== null) {
        priceChangePercent = `${metrics.changesPercentage >= 0 ? '+' : ''}${formatValue(metrics.changesPercentage, true)}%`;
      }
      
      // Format price change
      const priceChange = metrics.priceChange ? `${metrics.priceChange >= 0 ? '+' : ''}${formatValue(metrics.priceChange, true)}` : "N/A";
      
      // Create the stock object in the expected format
      const stock = {
        symbol: symbol,
        name: metrics.company || 'N/A',
        price: metrics.price || 0,
        priceChange: `${priceChange} (${priceChangePercent})`,
        marketCap: metrics.marketCap ? formatMarketCap(metrics.marketCap) : 'N/A',
        peRatio: metrics.peRatio !== null ? formatValue(metrics.peRatio) : 'N/A',
        pegRatio: metrics.pegRatio !== null ? formatValue(metrics.pegRatio) : 'N/A',
        forwardPE: metrics.forwardPE !== null ? formatValue(metrics.forwardPE) : 'N/A',
        priceToBook: metrics.priceToBook !== null ? formatValue(metrics.priceToBook) : 'N/A',
        priceToSales: metrics.priceToSales !== null ? formatValue(metrics.priceToSales) : 'N/A',
        debtToEquity: metrics.debtToEquity !== null ? formatValue(metrics.debtToEquity) : 'N/A',
        returnOnEquity: metrics.returnOnEquity !== null ? `${formatValue(metrics.returnOnEquity)}%` : 'N/A',
        returnOnAssets: metrics.returnOnAssets !== null ? `${formatValue(metrics.returnOnAssets)}%` : 'N/A',
        profitMargin: metrics.profitMargin !== null ? `${formatValue(metrics.profitMargin)}%` : 'N/A',
        dividendYield: metrics.dividendYield !== null ? `${formatValue(metrics.dividendYield)}%` : 'N/A',
        beta: metrics.beta !== null ? formatValue(metrics.beta) : 'N/A',
        summary: metrics.summary || 'N/A',
        lastUpdated: metrics.lastUpdated || new Date().toISOString()
      };
      
      return JSON.stringify(stock, null, 2);
    }

    // Format each category
    let formattedText = "**Fundamental Metrics:**\n\n";
    
    // Major Indices
    if (majorIndices.length > 0) {
      formattedText += "**Major Indices:**\n";
      majorIndices.forEach(symbol => {
        const metrics = metricsObj[symbol];
        formattedText += formatStock(symbol, metrics) + "\n\n";
      });
    }
    
    // Top Index Holdings
    if (filteredTopHoldings.length > 0) {
      formattedText += "**Top Index Holdings:**\n";
      filteredTopHoldings.forEach(symbol => {
        const metrics = metricsObj[symbol];
        formattedText += formatStock(symbol, metrics) + "\n\n";
      });
    }
    
    // Other Stocks
    if (otherStocks.length > 0) {
      formattedText += "**Other Stocks:**\n";
      otherStocks.forEach(symbol => {
        const metrics = metricsObj[symbol];
        formattedText += formatStock(symbol, metrics) + "\n\n";
      });
    }
    
    return formattedText;
  } catch (error) {
    Logger.log(`Error formatting fundamental metrics data: ${error}`);
    return "Error formatting fundamental metrics data\n";
  }
}

/**
 * Clears all caches used in the Market Pulse Daily application
 * This is useful for testing to ensure fresh data is retrieved
 * 
 * @return {Object} Result object with success flag and message
 */
function clearAllCaches() {
  try {
    Logger.log("Clearing all application caches...");
    const scriptCache = CacheService.getScriptCache();
    const documentCache = CacheService.getDocumentCache();
    const userCache = CacheService.getUserCache();
    
    // List of known cache keys used across the application
    const knownCacheKeys = [
      // SP500 Analysis cache keys
      'SP500_ANALYSIS',
      
      // Market Sentiment cache keys
      'MARKET_SENTIMENT_DATA',
      'ANALYST_COMMENTARY',
      
      // Key Market Indicators cache keys
      'KEY_MARKET_INDICATORS',
      'FEAR_GREED_INDEX',
      'MARKET_INDICES',
      'SECTOR_PERFORMANCE',
      'VOLATILITY_INDICES',
      'UPCOMING_ECONOMIC_EVENTS',
      
      // Fundamental Metrics cache keys
      'FUNDAMENTAL_METRICS',
      'STOCK_METRICS_',  // Prefix for stock-specific metrics
      
      // Macroeconomic Factors cache keys
      'TREASURY_YIELDS',
      'FED_POLICY',
      'INFLATION_DATA',
      'GEOPOLITICAL_RISKS',
      
      // Yahoo Finance data cache keys
      'YAHOO_FINANCE_',  // Prefix for stock-specific Yahoo data
      
      // OpenAI cache keys
      'OPENAI_ANALYSIS',
      'OPENAI_PROMPT'
    ];
    
    // Clear all known cache keys
    scriptCache.removeAll(knownCacheKeys);
    
    // Also try to clear document and user caches if they exist
    if (documentCache) documentCache.removeAll(knownCacheKeys);
    if (userCache) userCache.removeAll(knownCacheKeys);
    
    // Additionally clear SP500Analyzer cache specifically
    if (typeof flushSP500Cache === 'function') {
      flushSP500Cache();
      Logger.log("Flushed SP500 cache specifically");
    }
    
    // Clear any other module-specific caches
    if (typeof clearMarketSentimentCache === 'function') clearMarketSentimentCache();
    if (typeof clearKeyMarketIndicatorsCache === 'function') clearKeyMarketIndicatorsCache();
    if (typeof clearFundamentalMetricsCache === 'function') clearFundamentalMetricsCache();
    if (typeof clearMacroeconomicFactorsCache === 'function') clearMacroeconomicFactorsCache();
    
    Logger.log("All caches cleared successfully");
    
    return {
      success: true,
      message: "All application caches cleared successfully"
    };
  } catch (error) {
    Logger.log(`Error clearing caches: ${error}`);
    return {
      success: false,
      message: `Error clearing caches: ${error}`
    };
  }
}