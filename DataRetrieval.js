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
              // For backward compatibility
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
        
        // Format treasury yields data
        if (keyMarketIndicatorsData.treasuryYields && keyMarketIndicatorsData.treasuryYields.yields && keyMarketIndicatorsData.treasuryYields.yields.length > 0) {
          formattedText += `* Treasury Yields:\n`;
          
          // Sort yields by term (ascending)
          const sortedYields = [...keyMarketIndicatorsData.treasuryYields.yields].sort((a, b) => {
            const aMonths = parseTermToMonths(a.term);
            const bMonths = parseTermToMonths(b.term);
            return aMonths - bMonths;
          });
          
          // Add each yield
          for (const yield_ of sortedYields) {
            const yieldValue = yield_.yield !== undefined ? `${yield_.yield.toFixed(2)}%` : "N/A";
            const changeValue = yield_.change !== undefined ? 
                          `${yield_.change >= 0 ? "+" : ""}${yield_.change.toFixed(2)}%` : 
                          "N/A";
            
            formattedText += `  * ${yield_.term}: ${yieldValue} (${changeValue})\n`;
          }
          
          // Add timestamp
          const timestamp = keyMarketIndicatorsData.treasuryYields.timestamp || keyMarketIndicatorsData.timestamp || new Date().toLocaleString();
          formattedText += `  * Last Updated: ${new Date(timestamp).toLocaleString()}\n`;
        }
        
        // Format upcoming economic events
        if (keyMarketIndicatorsData.upcomingEconomicEvents && keyMarketIndicatorsData.upcomingEconomicEvents.length > 0) {
          formattedText += `* Upcoming Economic Events:\n`;
          
          // Sort events by date (ascending)
          const sortedEvents = [...keyMarketIndicatorsData.upcomingEconomicEvents].sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA - dateB;
          });
          
          // Add each event (limit to 5 to avoid too much text)
          const eventsToShow = sortedEvents.slice(0, 5);
          for (const event of eventsToShow) {
            formattedText += `  * ${event.date}: ${event.event}\n`;
          }
          
          // If there are more events, add a note
          if (sortedEvents.length > 5) {
            formattedText += `  * ...and ${sortedEvents.length - 5} more events\n`;
          }
          
          // Add timestamp
          const timestamp = keyMarketIndicatorsData.timestamp || new Date().toLocaleString();
          formattedText += `  * Last Updated: ${new Date(timestamp).toLocaleString()}\n`;
        } else {
          formattedText += `* Upcoming Economic Events: Data not available\n`;
        }
      } else {
        formattedText += "- Error retrieving key market indicators data\n";
      }
      
      formattedText += "\n";
      
      // Format fundamental metrics data
      formattedText += "**Fundamental Metrics Data:**\n";
      
      // Debug logging before checking success
      Logger.log(`DEBUG - Fundamental metrics before check: ${JSON.stringify(allData.fundamentalMetrics).substring(0, 200)}...`);
      
      // Check if we have fundamental metrics data
      if (allData.fundamentalMetrics && typeof allData.fundamentalMetrics === 'object') {
        // Process the actual data if it exists and is an array
        if (allData.fundamentalMetrics.data && Array.isArray(allData.fundamentalMetrics.data) && allData.fundamentalMetrics.data.length > 0) {
          const fundamentalMetricsData = allData.fundamentalMetrics;
          
          // Debug logging to see what's in the fundamental metrics data
          Logger.log(`DEBUG - Formatting fundamental metrics: ${JSON.stringify(fundamentalMetricsData).substring(0, 200)}...`);
          Logger.log(`DEBUG - Fundamental metrics structure: success=${fundamentalMetricsData.success}, data=${fundamentalMetricsData.data ? 'present' : 'missing'}, data length=${fundamentalMetricsData.data ? fundamentalMetricsData.data.length : 0}`);
          Logger.log(`DEBUG - Fundamental metrics data keys: ${Object.keys(fundamentalMetricsData)}`);
          
          // Sort the stocks - major indices first, then alphabetically
          const majorIndices = ["SPY", "QQQ", "IWM", "DIA"];
          const sortedStocks = [...fundamentalMetricsData.data].sort((a, b) => {
            const aSymbol = a.symbol || "";
            const bSymbol = b.symbol || "";
            
            // Put major indices first
            const aIsMajor = majorIndices.includes(aSymbol);
            const bIsMajor = majorIndices.includes(bSymbol);
            
            if (aIsMajor && !bIsMajor) return -1;
            if (!aIsMajor && bIsMajor) return 1;
            if (aIsMajor && bIsMajor) {
              return majorIndices.indexOf(aSymbol) - majorIndices.indexOf(bSymbol);
            }
            
            // Then sort alphabetically
            return aSymbol.localeCompare(bSymbol);
          });
          
          // Group stocks into categories
          const indices = sortedStocks.filter(stock => majorIndices.includes(stock.symbol));
          const magSeven = sortedStocks.filter(stock => ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"].includes(stock.symbol));
          const otherStocks = sortedStocks.filter(stock => 
            !majorIndices.includes(stock.symbol) && 
            !["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"].includes(stock.symbol)
          );
          
          // Format major indices
          if (indices.length > 0) {
            formattedText += "- Major Indices:\n";
            for (const stock of indices) {
              formattedText = formatStockMetrics(stock, formattedText);
            }
          }
          
          // Format Magnificent Seven
          if (magSeven.length > 0) {
            formattedText += "- Magnificent Seven:\n";
            for (const stock of magSeven) {
              formattedText = formatStockMetrics(stock, formattedText);
            }
          }
          
          // Format other stocks
          if (otherStocks.length > 0) {
            formattedText += "- Other Stocks:\n";
            for (const stock of otherStocks) {
              formattedText = formatStockMetrics(stock, formattedText);
            }
          }
          
          // Add timestamp
          formattedText += `- Last Updated: ${new Date(fundamentalMetricsData.timestamp || new Date()).toLocaleString()}\n`;
          
          // Add cache information
          if (fundamentalMetricsData.fromCache) {
            formattedText += `- Data retrieved from cache\n`;
          }
        } else {
          formattedText += "- No stock metrics data available\n";
        }
      } else {
        formattedText += "- Error: Fundamental metrics data not available\n";
      }
      
      formattedText += "\n";
      
      // Format macroeconomic factors data
      formattedText += "**Macroeconomic Factors Data:**\n";
      
      if (allData.macroeconomicFactors && allData.macroeconomicFactors.success) {
        const macroData = allData.macroeconomicFactors;
        
        // Format treasury yields if available
        if (macroData.treasuryYields && macroData.treasuryYields.yields) {
          formattedText += "- Treasury Yields:\n";
          
          // Check if we have the yields array (new structure) or direct properties (old structure)
          if (macroData.treasuryYields.yields && Array.isArray(macroData.treasuryYields.yields)) {
            // New structure: array of yield objects
            macroData.treasuryYields.yields.forEach(yieldObj => {
              if (yieldObj.yield !== undefined) {
                const yieldValue = typeof yieldObj.yield === 'number' ? formatValue(yieldObj.yield, 2) : yieldObj.yield;
                formattedText += `  * ${yieldObj.term} Treasury Yield: ${yieldValue}% `;
                
                // Add change information if available
                if (yieldObj.change !== undefined) {
                  const changeValue = typeof yieldObj.change === 'number' ? formatValue(yieldObj.change, 2) : yieldObj.change;
                  formattedText += `(Change: ${yieldObj.change >= 0 ? '+' : ''}${changeValue}%)\n`;
                } else {
                  formattedText += '\n';
                }
              }
            });
          } else {
            // Handle direct properties (old structure)
            // Map of property names to display names
            const yieldTerms = {
              threeMonth: "3-Month",
              sixMonth: "6-Month",
              oneYear: "1-Year",
              twoYear: "2-Year",
              fiveYear: "5-Year",
              tenYear: "10-Year",
              thirtyYear: "30-Year"
            };
            
            // Process each yield term
            Object.entries(yieldTerms).forEach(([propName, displayName]) => {
              if (macroData.treasuryYields[propName] !== undefined) {
                const yieldValue = typeof macroData.treasuryYields[propName] === 'number' ? 
                  formatValue(macroData.treasuryYields[propName], 2) : macroData.treasuryYields[propName];
                
                formattedText += `  * ${displayName} Treasury Yield: ${yieldValue}% `;
                
                // Add change information if available
                const changeProp = `${propName}Change`;
                if (macroData.treasuryYields[changeProp] !== undefined) {
                  const changeValue = typeof macroData.treasuryYields[changeProp] === 'number' ? 
                    formatValue(macroData.treasuryYields[changeProp], 2) : macroData.treasuryYields[changeProp];
                  
                  formattedText += `(Change: ${macroData.treasuryYields[changeProp] >= 0 ? '+' : ''}${changeValue}%)\n`;
                } else {
                  formattedText += '\n';
                }
              }
            });
          }
          
          // Add yield curve information if available
          if (macroData.treasuryYields.yieldCurve && macroData.treasuryYields.yieldCurve.status) {
            formattedText += `  * Yield Curve Status: ${macroData.treasuryYields.yieldCurve.status}\n`;
            
            if (macroData.treasuryYields.yieldCurve.analysis) {
              formattedText += `  * Analysis: ${macroData.treasuryYields.yieldCurve.analysis}\n`;
            }
          }
          
          // Add source and timestamp information
          if (macroData.treasuryYields.source) {
            formattedText += `  * Source: ${macroData.treasuryYields.source}`;
            if (macroData.treasuryYields.sourceUrl) {
              formattedText += ` (${macroData.treasuryYields.sourceUrl})`;
            }
            formattedText += "\n";
          }
          
          if (macroData.treasuryYields.lastUpdated) {
            formattedText += `  * Last Updated: ${new Date(macroData.treasuryYields.lastUpdated).toLocaleString()}\n`;
          }
        } else {
          formattedText += "- Treasury yields data not available\n";
        }
        
        // Format Fed policy if available
        if (macroData.fedPolicy) {
          formattedText += "- Federal Reserve Policy:\n";
          
          if (macroData.fedPolicy.currentRate) {
            if (typeof macroData.fedPolicy.currentRate === 'object' && macroData.fedPolicy.currentRate.rate !== undefined) {
              formattedText += `  * Current Federal Funds Rate: ${formatValue(macroData.fedPolicy.currentRate.rate, 2)}%`;
              if (macroData.fedPolicy.currentRate.range) {
                formattedText += ` (Range: ${macroData.fedPolicy.currentRate.range})`;
              }
              formattedText += "\n";
            } else if (typeof macroData.fedPolicy.currentRate === 'number') {
              formattedText += `  * Current Federal Funds Rate: ${formatValue(macroData.fedPolicy.currentRate, 2)}%\n`;
            }
          } else if (macroData.fedPolicy.federalFundsRate !== undefined) {
            // Legacy format support
            formattedText += `  * Current Federal Funds Rate: ${formatValue(macroData.fedPolicy.federalFundsRate, 2)}%\n`;
          }
          
          if (macroData.fedPolicy.lastMeeting) {
            formattedText += `  * Last FOMC Meeting: ${new Date(macroData.fedPolicy.lastMeeting.date).toLocaleDateString()}\n`;
            if (macroData.fedPolicy.lastMeeting.summary) {
              formattedText += `  * Summary: ${macroData.fedPolicy.lastMeeting.summary}\n`;
            }
            if (macroData.fedPolicy.lastMeeting.decision) {
              formattedText += `  * Decision: ${macroData.fedPolicy.lastMeeting.decision}\n`;
            }
          }
          
          if (macroData.fedPolicy.nextMeeting) {
            formattedText += `  * Next FOMC Meeting: ${new Date(macroData.fedPolicy.nextMeeting.date).toLocaleDateString()}\n`;
            if (macroData.fedPolicy.nextMeeting.probabilityOfNoChange !== undefined) {
              formattedText += `  * Probabilities: No Change (${formatValue(macroData.fedPolicy.nextMeeting.probabilityOfNoChange)}%), `;
              formattedText += `Hike (${formatValue(macroData.fedPolicy.nextMeeting.probabilityOfHike)}%), `;
              formattedText += `Cut (${formatValue(macroData.fedPolicy.nextMeeting.probabilityOfCut)}%)\n`;
            }
          }
          
          if (macroData.fedPolicy.forwardGuidance) {
            formattedText += `  * Forward Guidance: ${macroData.fedPolicy.forwardGuidance}\n`;
          }
          
          if (macroData.fedPolicy.commentary) {
            formattedText += `  * Commentary: ${macroData.fedPolicy.commentary}\n`;
          }
          
          if (macroData.fedPolicy.dotPlot && macroData.fedPolicy.dotPlot.summary) {
            formattedText += `  * Dot Plot Summary: ${macroData.fedPolicy.dotPlot.summary}\n`;
          }
          
          // Add source and timestamp
          if (macroData.fedPolicy.source) {
            formattedText += `  * Source: ${macroData.fedPolicy.source}`;
            if (macroData.fedPolicy.sourceUrl) {
              formattedText += ` (${macroData.fedPolicy.sourceUrl})`;
            }
            formattedText += "\n";
          }
          
          if (macroData.fedPolicy.lastUpdated) {
            formattedText += `  * Last Updated: ${new Date(macroData.fedPolicy.lastUpdated).toLocaleString()}\n`;
          }
        }
        
        // Format Inflation Data
        if (macroData.inflation && !macroData.inflation.error) {
          formattedText += "- Inflation:\n";
          
          // CPI data
          if (macroData.inflation.cpi) {
            const cpiYoY = formatValue(macroData.inflation.cpi.yearOverYearChange);
            const cpiCore = formatValue(macroData.inflation.cpi.coreRate);
            const cpiChange = macroData.inflation.cpi.change;
            
            formattedText += `  * CPI (Year-over-Year): ${cpiYoY}%`;
            if (cpiChange !== undefined) {
              formattedText += ` (${cpiChange >= 0 ? '+' : ''}${formatValue(cpiChange)}% from previous month)\n`;
            } else {
              formattedText += `\n`;
            }
            
            formattedText += `  * Core CPI (Year-over-Year): ${cpiCore}%\n`;
            
            if (macroData.inflation.cpi.lastUpdated) {
              formattedText += `  * CPI Last Updated: ${new Date(macroData.inflation.cpi.lastUpdated).toLocaleString()}\n`;
            }
            
            if (macroData.inflation.cpi.source) {
              formattedText += `  * CPI Source: ${macroData.inflation.cpi.source}`;
              if (macroData.inflation.cpi.sourceUrl) {
                formattedText += ` (${macroData.inflation.cpi.sourceUrl})`;
              }
              formattedText += `\n`;
            }
          } else {
            formattedText += "  * CPI data not available\n";
          }
          
          // PCE data
          if (macroData.inflation.pce) {
            const pceYoY = formatValue(macroData.inflation.pce.yearOverYearChange);
            const pceCore = formatValue(macroData.inflation.pce.coreRate);
            const pceChange = macroData.inflation.pce.change;
            
            formattedText += `  * PCE (Year-over-Year): ${pceYoY}%`;
            if (pceChange !== undefined) {
              formattedText += ` (${pceChange >= 0 ? '+' : ''}${formatValue(pceChange)}% from previous month)\n`;
            } else {
              formattedText += `\n`;
            }
            
            formattedText += `  * Core PCE (Year-over-Year): ${pceCore}%\n`;
            formattedText += `  * Note: PCE is the Federal Reserve's preferred inflation measure\n`;
            
            if (macroData.inflation.pce.lastUpdated) {
              formattedText += `  * PCE Last Updated: ${new Date(macroData.inflation.pce.lastUpdated).toLocaleString()}\n`;
            }
            
            if (macroData.inflation.pce.source) {
              formattedText += `  * PCE Source: ${macroData.inflation.pce.source}`;
              if (macroData.inflation.pce.sourceUrl) {
                formattedText += ` (${macroData.inflation.pce.sourceUrl})`;
              }
              formattedText += `\n`;
            }
          } else {
            formattedText += "  * PCE data not available\n";
          }
          
          // Inflation expectations
          if (macroData.inflation.expectations) {
            formattedText += `  * Inflation Expectations: 1-Year (${formatValue(macroData.inflation.expectations.oneYear)}%), 5-Year (${formatValue(macroData.inflation.expectations.fiveYear)}%), 10-Year (${formatValue(macroData.inflation.expectations.tenYear)}%)\n`;
            
            if (macroData.inflation.expectations.lastUpdated) {
              formattedText += `  * Expectations Last Updated: ${new Date(macroData.inflation.expectations.lastUpdated).toLocaleString()}\n`;
            }
            
            if (macroData.inflation.expectations.source) {
              formattedText += `  * Expectations Source: ${macroData.inflation.expectations.source}\n`;
            }
          } else {
            formattedText += "  * Inflation expectations data not available\n";
          }
          
          // Inflation analysis
          if (macroData.inflation.analysis) {
            formattedText += `\n**Inflation Analysis**:\n${macroData.inflation.analysis}\n\n`;
          }
          
          // Source and timestamp
          if (macroData.inflation.source && macroData.inflation.lastUpdated) {
            formattedText += `  * Overall Source: ${macroData.inflation.source}`;
            if (macroData.inflation.sourceUrl) {
              formattedText += ` (${macroData.inflation.sourceUrl})`;
            }
            formattedText += `\n  * Last Updated: ${new Date(macroData.inflation.lastUpdated).toLocaleString()}\n`;
          }
        } else if (macroData.inflation && macroData.inflation.error) {
          formattedText += `- Inflation Data: Error retrieving data (${macroData.inflation.message})\n`;
        } else {
          formattedText += "- Inflation data not available\n";
        }
        
        // Geopolitical Risks
        if (macroData.geopoliticalRisks && macroData.geopoliticalRisks.risks) {
          formattedText += "- Geopolitical Risks:\n";
          
          // Loop through each risk and display its details
          macroData.geopoliticalRisks.risks.forEach(risk => {
            formattedText += `  * ${risk.name}:\n`;
            formattedText += `    - Description: ${risk.description}\n`;
            
            if (risk.region) {
              formattedText += `    - Region: ${risk.region}\n`;
            }
            
            if (risk.impactLevel) {
              formattedText += `    - Impact Level: ${risk.impactLevel}\n`;
            }
            
            if (risk.marketImpact) {
              formattedText += `    - Market Impact: ${risk.marketImpact}\n`;
            }
            
            if (risk.source) {
              formattedText += `    - Source: ${risk.source}`;
              if (risk.url) {
                formattedText += ` (${risk.url})`;
              }
              formattedText += "\n";
            }
            
            formattedText += "\n";
          });
          
          // Source and timestamp
          if (macroData.geopoliticalRisks.source) {
            formattedText += `  * Source: ${macroData.geopoliticalRisks.source}`;
            if (macroData.geopoliticalRisks.sourceUrl) {
              formattedText += ` (${macroData.geopoliticalRisks.sourceUrl})`;
            }
            formattedText += "\n";
          }
          
          if (macroData.geopoliticalRisks.lastUpdated) {
            formattedText += `  * Last Updated: ${new Date(macroData.geopoliticalRisks.lastUpdated).toLocaleString()}\n`;
          }
        } else {
          formattedText += "- Geopolitical risks data not available\n";
        }
      } else {
        formattedText += "- No macroeconomic factors data available\n";
      }
    } else {
      formattedText += "Error retrieving data: " + (allData ? allData.message : "Unknown error");
    }
    
    // Log the formatted text
    Logger.log("Data retrieval text generated successfully.");
    
    return formattedText;
  } catch (error) {
    Logger.log(`Error in generateDataRetrievalText: ${error}`);
    return `Error: ${error}`;
  }
}

/**
 * Helper function to format stock metrics
 * @param {Object} stock - Stock data
 * @param {String} formattedText - Formatted text to append to
 * @return {String} - Updated formatted text
 */
function formatStockMetrics(stock, formattedText) {
  const symbol = stock.symbol || "Unknown";
  const name = stock.name || "Unknown";
  
  formattedText += `  * ${symbol} (${name}):\n`;
  
  // Format price and price change if available
  if (stock.price !== undefined && stock.price !== null) {
    const priceStr = formatValue(stock.price, true);
    let changeStr = "";
    
    if (stock.priceChange !== undefined && stock.priceChange !== null) {
      const priceChangeStr = formatValue(stock.priceChange, true);
      changeStr += `${stock.priceChange >= 0 ? '+' : ''}${priceChangeStr}`;
    }
    
    if (stock.percentChange !== undefined && stock.percentChange !== null) {
      const percentChangeStr = formatValue(stock.percentChange, true);
      changeStr += `${changeStr ? ', ' : ''}${stock.percentChange >= 0 ? '+' : ''}${percentChangeStr}%`;
    }
    
    formattedText += `    - Price: $${priceStr}${changeStr ? ` (${changeStr})` : ''}\n`;
  }

  // Format volume and market cap if available
  if (stock.volume !== undefined && stock.volume !== null) {
    const volumeStr = formatValue(stock.volume, true);
    formattedText += `    - Volume: ${volumeStr}\n`;
  }

  if (stock.marketCap !== undefined && stock.marketCap !== null) {
    const marketCapStr = formatValue(stock.marketCap / 1e9, true, 1);
    formattedText += `    - Market Cap: $${marketCapStr}B\n`;
  }

  // Format industry and sector if available
  if (stock.industry !== undefined && stock.industry !== null) {
    formattedText += `    - Industry: ${stock.industry}\n`;
  }

  if (stock.sector !== undefined && stock.sector !== null) {
    formattedText += `    - Sector: ${stock.sector}\n`;
  }
  
  // Format other metrics
  const metrics = [
    { name: "PEG Ratio", value: stock.pegRatio },
    { name: "Forward P/E", value: stock.forwardPE },
    { name: "Price/Book", value: stock.priceToBook },
    { name: "Price/Sales", value: stock.priceToSales },
    { name: "Debt/Equity", value: stock.debtToEquity },
    { name: "Return on Equity", value: stock.returnOnEquity, suffix: "%" },
    { name: "Return on Assets", value: stock.returnOnAssets, suffix: "%" },
    { name: "Profit Margin", value: stock.profitMargin, suffix: "%" },
    { name: "Dividend Yield", value: stock.dividendYield, suffix: "%" },
    { name: "Beta", value: stock.beta }
  ];
  
  metrics.forEach(metric => {
    if (metric.value !== undefined && metric.value !== null) {
      const formattedValue = formatValue(metric.value, true);
      const suffix = metric.suffix || "";
      formattedText += `    - ${metric.name}: ${formattedValue}${suffix}\n`;
    }
  });

  return formattedText;
}

/**
 * Formats fundamental metrics data for output
 * @param {Array} mentionedStocks - Optional list of stocks mentioned in market sentiment
 * @return {String} Formatted fundamental metrics data
 */
function formatFundamentalMetricsOutput(mentionedStocks = []) {
  // Define the symbols to include
  const symbols = [
    // Major Indices
    "SPY", "QQQ", "IWM", "DIA",
    // Magnificent Seven
    "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA",
    // Other stocks
    "XOM", "CVX", "BA", "CAT", "PG"
  ];
  
  // Helper functions for formatting
  function formatMarketCap(marketCap) {
    if (!marketCap || isNaN(marketCap)) return "N/A";
    if (marketCap >= 1e12) return "$" + (marketCap / 1e12).toFixed(2) + "T";
    if (marketCap >= 1e9) return "$" + (marketCap / 1e9).toFixed(2) + "B";
    if (marketCap >= 1e6) return "$" + (marketCap / 1e6).toFixed(2) + "M";
    return "$" + marketCap.toFixed(2);
  }
  
  function formatVolume(volume) {
    if (!volume || isNaN(volume)) return "N/A";
    if (volume >= 1e9) return (volume / 1e9).toFixed(2) + "B";
    if (volume >= 1e6) return (volume / 1e6).toFixed(2) + "M";
    if (volume >= 1e3) return (volume / 1e3).toFixed(2) + "K";
    return volume.toString();
  }
  
  function formatValue(value, fixedDecimals = false, decimals = 2) {
    if (value === undefined || value === null || isNaN(value)) {
      return "N/A";
    }
    
    if (fixedDecimals) {
      return parseFloat(value).toFixed(decimals);
    }
    
    return parseFloat(value).toString();
  }
  
  function formatPriceData(stock) {
    Logger.log(`DEBUG - formatPriceData for ${stock.symbol}: price=${stock.price}, priceChange=${stock.priceChange}, percentChange=${stock.percentChange}`);
    
    if (!stock.price && stock.price !== 0) return "N/A";
    
    let priceStr = "$" + Number(stock.price).toFixed(2);
    if (stock.priceChange !== undefined && !isNaN(stock.priceChange)) {
      priceStr += ` (${stock.priceChange >= 0 ? '+' : ''}${Number(stock.priceChange).toFixed(2)}`;
      if (stock.percentChange !== undefined && !isNaN(stock.percentChange)) {
        priceStr += `, ${stock.percentChange >= 0 ? '+' : ''}${Number(stock.percentChange).toFixed(2)}%`;
      }
      priceStr += ")";
    }
    return priceStr;
  }
  
  // Get real data from FundamentalMetrics.gs
  const metricsResults = retrieveFundamentalMetrics(symbols, mentionedStocks);
  
  // Format the output
  let output = "## Stock Data\n\n";
  
  if (!metricsResults || !metricsResults.data || metricsResults.data.length === 0) {
    output += "No fundamental metrics data available.\n";
    return output;
  }
  
  const allStocks = metricsResults.data;
  
  // Create a map of symbol to company name for better handling of missing names
  const companyNames = {
    "SPY": "SPDR S&P 500 ETF Trust",
    "QQQ": "Invesco QQQ Trust",
    "IWM": "iShares Russell 2000 ETF",
    "DIA": "SPDR Dow Jones Industrial Average ETF Trust",
    "AAPL": "Apple Inc.",
    "MSFT": "Microsoft Corporation",
    "GOOGL": "Alphabet Inc.",
    "AMZN": "Amazon.com, Inc.",
    "META": "Meta Platforms Inc.",
    "TSLA": "Tesla, Inc.",
    "NVDA": "NVIDIA Corporation",
    "XOM": "Exxon Mobil Corporation",
    "CVX": "Chevron Corporation",
    "BA": "The Boeing Company",
    "CAT": "Caterpillar Inc.",
    "PG": "Procter & Gamble Company"
  };
  
  // Major Indices
  const majorIndices = allStocks.filter(stock => ["SPY", "QQQ", "IWM", "DIA"].includes(stock.symbol));
  if (majorIndices.length > 0) {
    output += "### Major Indices\n";
    majorIndices.forEach(stock => {
      // Get company name from map if not available in data
      const companyName = stock.name || companyNames[stock.symbol] || "Unknown";
      
      // Format the stock data
      output += `* ${stock.symbol} (${companyName}): ${formatPriceData(stock)}\n`;
      output += `  * Sector: ${stock.sector || "N/A"}\n`;
      output += `  * Industry: ${stock.industry || "N/A"}\n`;
      
      // Add volume
      const formattedVolume = formatVolume(stock.volume);
      output += `  * Volume: ${formattedVolume}\n`;
      
      // Add metrics
      if (stock.pegRatio !== null && !isNaN(stock.pegRatio)) output += `  * PEG Ratio: ${formatValue(stock.pegRatio)}\n`;
      if (stock.forwardPE !== null && !isNaN(stock.forwardPE)) output += `  * Forward P/E: ${formatValue(stock.forwardPE)}\n`;
      if (stock.priceToBook !== null && !isNaN(stock.priceToBook)) output += `  * Price/Book: ${formatValue(stock.priceToBook)}\n`;
      if (stock.priceToSales !== null && !isNaN(stock.priceToSales)) output += `  * Price/Sales: ${formatValue(stock.priceToSales)}\n`;
      if (stock.debtToEquity !== null && !isNaN(stock.debtToEquity)) output += `  * Debt/Equity: ${formatValue(stock.debtToEquity)}\n`;
      if (stock.returnOnEquity !== null && !isNaN(stock.returnOnEquity)) output += `  * Return on Equity: ${formatValue(stock.returnOnEquity)}%\n`;
      if (stock.beta !== null && !isNaN(stock.beta)) output += `  * Beta: ${formatValue(stock.beta)}\n`;
      
      output += "\n";
    });
  }
  
  // Magnificent Seven
  const magSeven = allStocks.filter(stock => ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"].includes(stock.symbol));
  if (magSeven.length > 0) {
    output += "### Magnificent Seven\n";
    magSeven.forEach(stock => {
      // Get company name from map if not available in data
      const companyName = stock.name || companyNames[stock.symbol] || "Unknown";
      
      // Format the stock data
      output += `* ${stock.symbol} (${companyName}): ${formatPriceData(stock)}\n`;
      output += `  * Sector: ${stock.sector || "N/A"}\n`;
      output += `  * Industry: ${stock.industry || "N/A"}\n`;
      
      // Add market cap
      const formattedMarketCap = formatMarketCap(stock.marketCap);
      output += `  * Market Cap: ${formattedMarketCap}\n`;
      
      // Add volume
      const formattedVolume = formatVolume(stock.volume);
      output += `  * Volume: ${formattedVolume}\n`;
      
      // Add metrics
      if (stock.pegRatio !== null && !isNaN(stock.pegRatio)) output += `  * PEG Ratio: ${formatValue(stock.pegRatio)}\n`;
      if (stock.forwardPE !== null && !isNaN(stock.forwardPE)) output += `  * Forward P/E: ${formatValue(stock.forwardPE)}\n`;
      if (stock.priceToBook !== null && !isNaN(stock.priceToBook)) output += `  * Price/Book: ${formatValue(stock.priceToBook)}\n`;
      if (stock.priceToSales !== null && !isNaN(stock.priceToSales)) output += `  * Price/Sales: ${formatValue(stock.priceToSales)}\n`;
      if (stock.debtToEquity !== null && !isNaN(stock.debtToEquity)) output += `  * Debt/Equity: ${formatValue(stock.debtToEquity)}\n`;
      if (stock.returnOnEquity !== null && !isNaN(stock.returnOnEquity)) output += `  * Return on Equity: ${formatValue(stock.returnOnEquity)}%\n`;
      if (stock.beta !== null && !isNaN(stock.beta)) output += `  * Beta: ${formatValue(stock.beta)}\n`;
      
      output += "\n";
    });
  }
  
  // Other Stocks
  const otherStocks = allStocks.filter(stock => ![
    "SPY", "QQQ", "IWM", "DIA", 
    "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"
  ].includes(stock.symbol));
  if (otherStocks.length > 0) {
    output += "### Other Stocks\n";
    otherStocks.forEach(stock => {
      // Get company name from map if not available in data
      const companyName = stock.name || companyNames[stock.symbol] || "Unknown";
      
      // Format the stock data
      output += `* ${stock.symbol} (${companyName}): ${formatPriceData(stock)}\n`;
      output += `  * Sector: ${stock.sector || "N/A"}\n`;
      output += `  * Industry: ${stock.industry || "N/A"}\n`;
      
      // Add market cap
      const formattedMarketCap = formatMarketCap(stock.marketCap);
      output += `  * Market Cap: ${formattedMarketCap}\n`;
      
      // Add volume
      const formattedVolume = formatVolume(stock.volume);
      output += `  * Volume: ${formattedVolume}\n`;
      
      // Add metrics
      if (stock.pegRatio !== null && !isNaN(stock.pegRatio)) output += `  * PEG Ratio: ${formatValue(stock.pegRatio)}\n`;
      if (stock.forwardPE !== null && !isNaN(stock.forwardPE)) output += `  * Forward P/E: ${formatValue(stock.forwardPE)}\n`;
      if (stock.priceToBook !== null && !isNaN(stock.priceToBook)) output += `  * Price/Book: ${formatValue(stock.priceToBook)}\n`;
      if (stock.priceToSales !== null && !isNaN(stock.priceToSales)) output += `  * Price/Sales: ${formatValue(stock.priceToSales)}\n`;
      if (stock.debtToEquity !== null && !isNaN(stock.debtToEquity)) output += `  * Debt/Equity: ${formatValue(stock.debtToEquity)}\n`;
      if (stock.returnOnEquity !== null && !isNaN(stock.returnOnEquity)) output += `  * Return on Equity: ${formatValue(stock.returnOnEquity)}%\n`;
      if (stock.beta !== null && !isNaN(stock.beta)) output += `  * Beta: ${formatValue(stock.beta)}\n`;
      
      output += "\n";
    });
  }
  
  // Log the output
  Logger.log(output);
  
  return output;
}

/**
 * Test function to output all stock data for debugging
 * This function retrieves fundamental metrics for a set of stocks and outputs them in a formatted way
 */
function testFundamentalMetricsOutput() {
  // Define the symbols to test
  const symbols = [
    // Major Indices
    "SPY", "QQQ", "IWM", "DIA",
    // Magnificent Seven
    "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA",
    // Other stocks
    "XOM", "CVX", "BA", "CAT", "PG", "KO", "TGT", "WMT"
  ];
  
  Logger.log("## Stock Data for Debugging\n");
  
  // Get mentioned stocks (if any)
  const mentionedStocks = [];
  Logger.log(`Mentioned stocks from market sentiment: ${mentionedStocks.length ? mentionedStocks.join(", ") : "None"}`);
  
  // Log all symbols we're retrieving data for
  Logger.log(`Retrieving fundamental metrics for ${symbols.length} symbols: ${symbols.join(", ")}`);
  
  // Get metrics for all symbols in a single call
  const startTime = new Date();
  const metrics = retrieveFundamentalMetrics(symbols, mentionedStocks);
  
  // Track cache performance
  const cacheHits = metrics.data.filter(d => d.fromCache).length;
  const cacheMisses = metrics.data.filter(d => !d.fromCache).length;
  
  // Process the results
  const allStocks = metrics.data.map(stock => ({
    ...stock,
    fromCache: stock.fromCache || false
  }));
  
  const totalDuration = (new Date() - startTime) / 1000;
  Logger.log(`Fundamental metrics retrieval completed in ${totalDuration.toFixed(3)} seconds`);
  Logger.log(`Cache performance: ${cacheHits} hits, ${cacheMisses} misses (${(cacheHits/(cacheHits+cacheMisses)*100).toFixed(0)}% hit rate)`);
  
  // Output formatted data
  let output = "## Stock Data for Debugging\n\n";
  
  // Helper functions for formatting
  function formatMarketCap(marketCap) {
    if (!marketCap || isNaN(marketCap)) return "N/A";
    if (marketCap >= 1e12) return `$${(marketCap/1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap/1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap/1e6).toFixed(2)}M`;
    return `$${marketCap.toFixed(2)}`;
  }
  
  function formatVolume(volume) {
    if (!volume || isNaN(volume)) return "N/A";
    if (volume >= 1e9) return `${(volume/1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${(volume/1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${(volume/1e3).toFixed(2)}K`;
    return volume.toString();
  }
  
  function formatValue(value) {
    if (!value || isNaN(value)) return "N/A";
    return value.toFixed(2);
  }
  
  function formatPriceChange(price, change, changePercent) {
    if (!price || isNaN(price)) return "N/A";
    let result = `$${formatValue(price)}`;
    if (change && !isNaN(change)) {
      const sign = change >= 0 ? "+" : "";
      result += ` (${sign}${formatValue(change)}`;
      if (changePercent && !isNaN(changePercent)) {
        result += `, ${sign}${formatValue(changePercent)}%`;
      }
      result += ")";
    }
    return result;
  }
  
  // Helper function to format all metrics
  function formatStockData(stock) {
    let data = '';
    data += `${stock.symbol} (${stock.name || 'Unknown'})\n`;
    data += `- Price: ${formatPriceChange(stock.price, stock.priceChange, stock.percentChange)}\n`;
    data += `- Market Cap: ${formatMarketCap(stock.marketCap)}\n`;
    data += `- Volume: ${formatVolume(stock.volume)}\n`;
    data += `- Beta: ${formatValue(stock.beta)}\n`;
    data += `- PEG Ratio: ${formatValue(stock.pegRatio)}\n`;
    data += `- Forward P/E: ${formatValue(stock.forwardPE)}\n`;
    data += `- Price/Book: ${formatValue(stock.priceToBook)}\n`;
    data += `- Price/Sales: ${formatValue(stock.priceToSales)}\n`;
    data += `- Debt/Equity: ${formatValue(stock.debtToEquity)}\n`;
    data += `- ROE: ${formatValue(stock.returnOnEquity)}\n`;
    data += `- Sector: ${stock.sector || "N/A"}\n`;
    data += `- Industry: ${stock.industry || "N/A"}\n`;
    data += `- Data Sources: ${stock.sources ? stock.sources.join(", ") : stock.dataSource || "N/A"}\n`;
    data += `- From Cache: ${stock.fromCache ? "Yes" : "No"}\n\n`;
    return data;
  }
  
  // Major Indices
  output += "### Major Indices\n";
  const indices = allStocks.filter(stock => ["SPY", "QQQ", "IWM", "DIA"].includes(stock.symbol));
  indices.forEach(stock => {
    output += formatStockData(stock);
  });
  
  // Magnificent Seven
  output += "### Magnificent Seven\n";
  const magSeven = allStocks.filter(stock => ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"].includes(stock.symbol));
  magSeven.forEach(stock => {
    output += formatStockData(stock);
  });
  
  // Other Stocks
  output += "### Other Stocks\n";
  const otherStocks = allStocks.filter(stock => !["SPY", "QQQ", "IWM", "DIA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"].includes(stock.symbol));
  otherStocks.forEach(stock => {
    output += formatStockData(stock);
  });
  
  Logger.log(output);
  return output;
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
    
    // Step 1: Retrieve market sentiment data
    Logger.log("Step 1: Retrieving market sentiment data...");
    const marketSentiment = retrieveMarketSentiment();
    
    // Extract any stock symbols mentioned in the market sentiment data
    let mentionedStocks = [];
    if (marketSentiment && marketSentiment.success && marketSentiment.data && marketSentiment.data.analysts) {
      // Extract stock symbols from analyst comments
      marketSentiment.data.analysts.forEach(analyst => {
        if (analyst.mentionedStocks && Array.isArray(analyst.mentionedStocks)) {
          mentionedStocks = mentionedStocks.concat(analyst.mentionedStocks);
        } else if (analyst.mentionedSymbols && Array.isArray(analyst.mentionedSymbols)) {
          // For backward compatibility
          mentionedStocks = mentionedStocks.concat(analyst.mentionedSymbols);
        }
      });
      
      // Remove duplicates
      mentionedStocks = [...new Set(mentionedStocks)];
      Logger.log(`Found ${mentionedStocks.length} mentioned stocks: ${mentionedStocks.join(', ')}`);
    }
    
    // Step 2: Retrieve key market indicators
    Logger.log("Step 2: Retrieving key market indicators...");
    const keyMarketIndicators = retrieveKeyMarketIndicators();
    
    // Step 3: Retrieve fundamental metrics for mentioned stocks and default symbols
    // Always include the Magnificent Seven and major indices
    const defaultSymbols = ["SPY", "QQQ", "IWM", "DIA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"];
    const allSymbols = [...new Set([...mentionedStocks, ...defaultSymbols])];
    
    Logger.log(`Step 3: Retrieving fundamental metrics for ${allSymbols.length} symbols...`);
    const fundamentalMetrics = retrieveFundamentalMetrics(allSymbols, mentionedStocks);
    
    // Ensure the fundamental metrics data is properly structured
    const processedMetrics = {
      success: fundamentalMetrics.success,
      message: fundamentalMetrics.message,
      data: fundamentalMetrics.data || [],
      timestamp: new Date(),
      fromCache: fundamentalMetrics.fromCache,
      executionTime: fundamentalMetrics.executionTime || 0,
      cachePerformance: {
        hits: fundamentalMetrics.cacheHits || 0,
        misses: fundamentalMetrics.cacheMisses || 0,
        hitRate: fundamentalMetrics.cacheHits > 0 ? ((fundamentalMetrics.cacheHits / (fundamentalMetrics.cacheHits + fundamentalMetrics.cacheMisses)) * 100).toFixed(1) + '%' : '0%'
      }
    };
    
    // Step 4: Retrieve macroeconomic factors
    Logger.log("Step 4: Retrieving macroeconomic factors...");
    const macroeconomicFactors = retrieveMacroeconomicFactors();
    
    // Compile all data
    const allData = {
      success: true,
      marketSentiment: marketSentiment,
      keyMarketIndicators: keyMarketIndicators,
      fundamentalMetrics: processedMetrics,
      macroeconomicFactors: macroeconomicFactors,
      timestamp: currentDate
    };
    
    Logger.log("All data retrieved successfully.");
    return allData;
  } catch (error) {
    Logger.log(`Error retrieving all data: ${error}`);
    return {
      success: false,
      error: true,
      message: `Failed to retrieve all data: ${error}`,
      timestamp: new Date()
    };
  }
}

/**
 * Retrieves market sentiment data from MarketSentiment.gs
 * @return {Object} Market sentiment data
 */
function retrieveMarketSentiment() {
  try {
    Logger.log("Retrieving market sentiment data...");
    return getMarketSentiment();
  } catch (error) {
    Logger.log(`Error retrieving market sentiment data: ${error}`);
    return {
      success: false,
      error: true,
      message: `Failed to retrieve market sentiment data: ${error}`,
      timestamp: new Date()
    };
  }
}

/**
 * Retrieves key market indicators data from KeyMarketIndicators.gs
 * @return {Object} Key market indicators data
 */
function retrieveKeyMarketIndicators() {
  try {
    Logger.log("Retrieving key market indicators data...");
    return getKeyMarketIndicators();
  } catch (error) {
    Logger.log(`Error retrieving key market indicators data: ${error}`);
    return {
      success: false,
      error: true,
      message: `Failed to retrieve key market indicators data: ${error}`,
      timestamp: new Date()
    };
  }
}

/**
 * Retrieves fundamental metrics data from FundamentalMetrics.gs
 * @param {Array} symbols - Array of stock symbols to retrieve data for
 * @param {Array} mentionedStocks - Optional list of stocks mentioned in market sentiment
 * @return {Object} Fundamental metrics data
 */
function retrieveFundamentalMetrics(symbols, mentionedStocks = []) {
  try {
    // Handle empty symbols array
    if (!symbols || !Array.isArray(symbols)) {
      symbols = [];
    }
    
    Logger.log(`Retrieving fundamental metrics data for ${symbols.length} symbols...`);
    
    // Call the function from FundamentalMetrics.gs with the same name
    const metrics = FundamentalMetrics.retrieveFundamentalMetrics(symbols, mentionedStocks);
    
    // Debug logging to see what's being returned
    Logger.log(`DEBUG - FundamentalMetrics returned: ${JSON.stringify(metrics).substring(0, 200)}...`);
    Logger.log(`DEBUG - FundamentalMetrics data structure: metrics=${metrics ? 'present' : 'missing'}, failedSymbols=${metrics.failedSymbols ? 'present' : 'missing'}`);
    Logger.log(`DEBUG - FundamentalMetrics data keys: ${Object.keys(metrics)}`);
    
    // Properly handle the response structure from FundamentalMetrics.gs
    return {
      success: metrics && metrics.data && metrics.data.length > 0,
      message: metrics && metrics.data && metrics.data.length > 0 ? 'Successfully retrieved fundamental metrics' : 'No valid metrics data available',
      data: metrics && metrics.data ? metrics.data : [],
      timestamp: new Date(),
      fromCache: metrics.cacheHits > 0,
      executionTime: metrics.executionTime || 0,
      cachePerformance: {
        hits: metrics.cacheHits || 0,
        misses: metrics.cacheMisses || 0,
        hitRate: metrics.cacheHits > 0 ? ((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(1) + '%' : '0%'
      }
    };
  } catch (error) {
    Logger.log(`Error retrieving fundamental metrics data: ${error}`);
    return {
      success: false,
      error: true,
      message: `Failed to retrieve fundamental metrics data: ${error}`,
      data: [],
      timestamp: new Date(),
      fromCache: false,
      executionTime: 0,
      cachePerformance: {
        hits: 0,
        misses: 0,
        hitRate: '0%'
      }
    };
  }
}

/**
 * Retrieves macroeconomic factors data from MacroeconomicFactors.gs
 * @return {Object} Macroeconomic factors data
 */
function retrieveMacroeconomicFactors() {
  try {
    Logger.log("Retrieving macroeconomic factors data...");
    return getMacroeconomicFactors();
  } catch (error) {
    Logger.log(`Error retrieving macroeconomic factors data: ${error}`);
    return {
      success: false,
      error: true,
      message: `Failed to retrieve macroeconomic factors data: ${error}`,
      timestamp: new Date()
    };
  }
}

/**
 * Helper function to format values for display
 * @param {number} value - The value to format
 * @param {boolean} fixedDecimals - Whether to use a fixed number of decimals
 * @param {number} decimals - Number of decimals to use if fixedDecimals is true
 * @return {string} The formatted value
 */
function formatValue(value, fixedDecimals = false, decimals = 2) {
  if (value === undefined || value === null || isNaN(value)) {
    return "N/A";
  }
  
  if (fixedDecimals) {
    return parseFloat(value).toFixed(decimals);
  }
  
  return parseFloat(value).toString();
}

/**
 * Helper function to parse a term like "3-Month" or "10-Year" to months
 * @param {string} term - The term to parse
 * @return {number} The number of months
 */
function parseTermToMonths(term) {
  if (!term) return 0;
  
  const parts = term.split('-');
  if (parts.length !== 2) return 0;
  
  const value = parseInt(parts[0], 10);
  if (isNaN(value)) return 0;
  
  const unit = parts[1].toLowerCase();
  
  if (unit.includes('month')) {
    return value;
  } else if (unit.includes('year')) {
    return value * 12;
  }
  
  return 0;
}
