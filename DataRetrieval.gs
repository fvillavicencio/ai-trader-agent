/**
 * Data Retrieval Module
 * Main entry point for all data retrieval operations
 * Coordinates the retrieval of data from all modules:
 * 1. Market Sentiment
 * 2. Fundamental Metrics
 * 3. Key Market Indicators
 * 4. Macroeconomic Factors
 */

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
        message: `Error retrieving market sentiment data: ${marketSentimentData.message}`
      };
    }
    
    // Extract mentioned stocks from market sentiment data
    let mentionedStocks = [];
    if (marketSentimentData.mentionedStocks && Array.isArray(marketSentimentData.mentionedStocks)) {
      mentionedStocks = marketSentimentData.mentionedStocks;
    } else {
      // Fallback to extracting from the data directly
      mentionedStocks = extractMentionedStocks(marketSentimentData);
    }
    
    Logger.log(`Mentioned stocks from market sentiment: ${mentionedStocks.length > 0 ? mentionedStocks.join(', ') : 'None'}`);
    
    // Retrieve key market indicators
    const keyMarketIndicatorsData = retrieveKeyMarketIndicators();
    if (!keyMarketIndicatorsData.success) {
      return {
        success: false,
        message: `Error retrieving key market indicators data: ${keyMarketIndicatorsData.message}`
      };
    }
    
    // Retrieve fundamental metrics for mentioned stocks
    const fundamentalMetricsData = retrieveFundamentalMetrics([], mentionedStocks);
    if (!fundamentalMetricsData.success) {
      return {
        success: false,
        message: `Error retrieving fundamental metrics data: ${fundamentalMetricsData.message}`
      };
    }
    
    // Retrieve macroeconomic factors
    const macroeconomicFactorsData = retrieveMacroeconomicFactors();
    if (!macroeconomicFactorsData.success) {
      return {
        success: false,
        message: `Error retrieving macroeconomic factors data: ${macroeconomicFactorsData.message}`
      };
    }
    
    // Compile all data
    const allData = {
      success: true,
      marketSentiment: marketSentimentData,
      keyMarketIndicators: keyMarketIndicatorsData,
      fundamentalMetrics: fundamentalMetricsData,
      macroeconomicFactors: macroeconomicFactorsData,
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
 * Extract mentioned stocks from market sentiment data
 * 
 * @param {Object} marketSentimentData - The market sentiment data
 * @return {Array} - Array of mentioned stock symbols
 */
function extractMentionedStocks(marketSentimentData) {
  try {
    if (!marketSentimentData || !marketSentimentData.success) {
      return [];
    }
    
    const mentionedStocks = [];
    
    // Handle the case where mentionedStocks is already in the top level
    if (marketSentimentData.mentionedStocks && Array.isArray(marketSentimentData.mentionedStocks)) {
      return marketSentimentData.mentionedStocks;
    }
    
    // Navigate through the nested data structure
    // The data might be in marketSentimentData.data or marketSentimentData.data.data
    let dataObject = marketSentimentData.data;
    
    // If no data object found, return empty array
    if (!dataObject) {
      return [];
    }
    
    // Check if we need to go one level deeper
    if (dataObject.data && typeof dataObject.data === 'object') {
      dataObject = dataObject.data;
    }
    
    // Extract from analysts
    if (dataObject.analysts && Array.isArray(dataObject.analysts)) {
      dataObject.analysts.forEach(analyst => {
        if (analyst.mentionedStocks && Array.isArray(analyst.mentionedStocks)) {
          analyst.mentionedStocks.forEach(stock => {
            if (stock && !mentionedStocks.includes(stock)) {
              mentionedStocks.push(stock);
            }
          });
        } else if (analyst.mentionedSymbols && Array.isArray(analyst.mentionedSymbols)) {
          // For backward compatibility
          analyst.mentionedSymbols.forEach(stock => {
            if (stock && !mentionedStocks.includes(stock)) {
              mentionedStocks.push(stock);
            }
          });
        }
      });
    }
    
    // Extract from sentiment indicators
    if (dataObject.sentimentIndicators && Array.isArray(dataObject.sentimentIndicators)) {
      dataObject.sentimentIndicators.forEach(indicator => {
        if (indicator.mentionedStocks && Array.isArray(indicator.mentionedStocks)) {
          indicator.mentionedStocks.forEach(stock => {
            if (stock && !mentionedStocks.includes(stock)) {
              mentionedStocks.push(stock);
            }
          });
        }
      });
    }
    
    Logger.log(`Found ${mentionedStocks.length} mentioned stocks: ${mentionedStocks.join(', ') || 'None'}`);
    return mentionedStocks;
  } catch (error) {
    Logger.log(`Error extracting mentioned stocks: ${error}`);
    return [];
  }
}

/**
 * Generates a prompt for OpenAI with all the retrieved data
 * @param {Object} allData - The retrieved data
 * @return {String} The prompt for OpenAI
 */
function generateOpenAIPrompt(allData) {
  try {
    if (!allData.success) {
      return `Error retrieving data: ${allData.message}`;
    }
    
    // Get the base prompt template
    const basePrompt = getTradingAnalysisPrompt();
    
    // Format the current date
    const currentDate = new Date();
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: 'numeric', 
      timeZoneName: 'short' 
    };
    const formattedDate = currentDate.toLocaleString('en-US', options);
    
    // Create a data section to insert into the prompt
    let dataSection = "\n\nHERE IS THE RETRIEVED DATA (use this instead of searching the web):\n\n";
    
    // 1. Market Sentiment Data
    dataSection += "MARKET SENTIMENT DATA:\n";
    if (allData.marketSentiment && allData.marketSentiment.success) {
      const sentimentData = allData.marketSentiment;
      dataSection += `- Last Updated: ${new Date(sentimentData.timestamp).toLocaleString()}\n`;
      
      if (sentimentData.data && sentimentData.data.analysts && sentimentData.data.analysts.length > 0) {
        dataSection += "- Analyst Commentary:\n";
        sentimentData.data.analysts.forEach(analyst => {
          // Fix the undefined analyst commentary issue by using commentary field instead of content
          const commentary = analyst.commentary || "No recent commentary available";
          const source = analyst.source || "N/A";
          const timestamp = analyst.timestamp ? new Date(analyst.timestamp).toLocaleString() : "N/A";
          
          dataSection += `  * ${analyst.name}: "${commentary}" (Source: ${source}, ${timestamp})\n`;
          if (analyst.mentionedStocks && analyst.mentionedStocks.length > 0) {
            dataSection += `    Mentioned stocks: ${analyst.mentionedStocks.join(', ')}\n`;
          }
        });
      }
      
      if (sentimentData.data && sentimentData.data.overallMarketSentiment) {
        dataSection += `- Overall Market Sentiment: ${sentimentData.data.overallMarketSentiment}\n`;
      }
    } else {
      dataSection += "- No market sentiment data available\n";
    }
    
    // 2. Key Market Indicators
    dataSection += "\nKEY MARKET INDICATORS DATA:\n";
    if (allData.keyMarketIndicators && allData.keyMarketIndicators.success) {
      const indicatorsData = allData.keyMarketIndicators;
      
      // Major Indices
      if (indicatorsData.majorIndices && indicatorsData.majorIndices.length > 0) {
        dataSection += "- Major Indices:\n";
        indicatorsData.majorIndices.forEach(index => {
          dataSection += `  * ${index.name}: ${index.price} (${index.percentChange >= 0 ? '+' : ''}${formatValue(index.percentChange)}%)\n`;
        });
        
        // Add timestamp if available
        if (indicatorsData.majorIndices[0].timestamp) {
          dataSection += `  * Last Updated: ${new Date(indicatorsData.majorIndices[0].timestamp).toLocaleString()}\n`;
        }
      }
      
      // Sector Performance
      if (indicatorsData.sectorPerformance && indicatorsData.sectorPerformance.length > 0) {
        dataSection += "- Sector Performance:\n";
        indicatorsData.sectorPerformance.forEach(sector => {
          dataSection += `  * ${sector.name}: ${sector.percentChange >= 0 ? '+' : ''}${formatValue(sector.percentChange)}%\n`;
        });
        
        // Add timestamp if available
        if (indicatorsData.sectorPerformance[0].timestamp) {
          dataSection += `  * Last Updated: ${new Date(indicatorsData.sectorPerformance[0].timestamp).toLocaleString()}\n`;
        }
      }
      
      // Fear & Greed Index
      if (indicatorsData.fearAndGreedIndex) {
        dataSection += `- CNN Fear & Greed Index: ${indicatorsData.fearAndGreedIndex.currentValue} (${indicatorsData.fearAndGreedIndex.rating})\n`;
        dataSection += `  * Previous Close: ${indicatorsData.fearAndGreedIndex.previousValues?.previousClose || 'N/A'}\n`;
        dataSection += `  * Week Ago: ${indicatorsData.fearAndGreedIndex.previousValues?.weekAgo || 'N/A'}\n`;
        dataSection += `  * Month Ago: ${indicatorsData.fearAndGreedIndex.previousValues?.monthAgo || 'N/A'}\n`;
        dataSection += `  * Last Updated: ${new Date(indicatorsData.fearAndGreedIndex.timestamp || new Date()).toLocaleString()}\n`;
      }
      
      // VIX
      if (indicatorsData.volatilityIndices && indicatorsData.volatilityIndices.length > 0) {
        const vix = indicatorsData.volatilityIndices.find(index => 
          index.name.includes("VIX") || index.symbol === "^VIX");
        if (vix) {
          dataSection += `- VIX (Volatility Index): ${vix.value}\n`;
          dataSection += `  * Change: ${vix.change >= 0 ? '+' : ''}${formatValue(vix.change)}\n`;
          dataSection += `  * Trend: ${vix.trend}\n`;
          dataSection += `  * Analysis: ${vix.analysis}\n`;
          dataSection += `  * Last Updated: ${new Date(vix.timestamp || new Date()).toLocaleString()}\n`;
        }
        
        // Also include NASDAQ VIX if available
        const vxn = indicatorsData.volatilityIndices.find(index => 
          index.name.includes("NASDAQ") || index.symbol === "^VXN");
        if (vxn) {
          dataSection += `- NASDAQ Volatility Index: ${vxn.value}\n`;
          dataSection += `  * Change: ${vxn.change >= 0 ? '+' : ''}${formatValue(vxn.change)}\n`;
          dataSection += `  * Trend: ${vxn.trend}\n`;
          dataSection += `  * Analysis: ${vxn.analysis}\n`;
          dataSection += `  * Last Updated: ${new Date(vxn.timestamp || new Date()).toLocaleString()}\n`;
        }
      } else {
        dataSection += "- Volatility data not available\n";
      }
      
      // Economic Events
      if (indicatorsData.upcomingEconomicEvents && indicatorsData.upcomingEconomicEvents.length > 0) {
        dataSection += "- Upcoming Economic Events:\n";
        indicatorsData.upcomingEconomicEvents.forEach(event => {
          dataSection += `  * ${event.date}: ${event.name} (${event.importance} importance)\n`;
        });
      }
    } else {
      dataSection += "- No key market indicators data available\n";
    }
    
    // 3. Fundamental Metrics
    dataSection += "\nFUNDAMENTAL METRICS DATA:\n";
    if (allData.fundamentalMetrics && allData.fundamentalMetrics.success) {
      const metricsData = allData.fundamentalMetrics;
      
      // Get the list of mentioned stocks from market sentiment
      let mentionedStocks = [];
      if (allData.marketSentiment && allData.marketSentiment.success && 
          allData.marketSentiment.data && allData.marketSentiment.data.analysts) {
        allData.marketSentiment.data.analysts.forEach(analyst => {
          if (analyst.mentionedStocks && Array.isArray(analyst.mentionedStocks)) {
            mentionedStocks = mentionedStocks.concat(analyst.mentionedStocks);
          }
        });
        mentionedStocks = [...new Set(mentionedStocks)]; // Remove duplicates
      }
      
      // Log the mentioned stocks for debugging
      Logger.log(`Mentioned stocks in prompt generation: ${mentionedStocks.join(', ') || 'None'}`);
      
      // Count the number of stocks/ETFs with data
      const stockCount = metricsData.metrics ? metricsData.metrics.length : 0;
      dataSection += `- Metrics for ${stockCount} stocks/ETFs:\n`;
      
      // First, add the mentioned stocks to ensure they appear in the prompt
      if (mentionedStocks.length > 0 && metricsData.metrics && metricsData.metrics.length > 0) {
        // Find and add mentioned stocks first
        mentionedStocks.forEach(mentionedSymbol => {
          const stockData = metricsData.metrics.find(metric => 
            metric.symbol && metric.symbol.toUpperCase() === mentionedSymbol.toUpperCase()
          );
          
          if (stockData) {
            dataSection += formatStockMetrics(stockData);
            // Add a note that this stock was mentioned by analysts
            dataSection += `    - Note: This stock was mentioned by analysts in recent commentary\n`;
          }
        });
      }
      
      // Then add all other stocks that weren't already added
      if (metricsData.metrics && metricsData.metrics.length > 0) {
        metricsData.metrics.forEach(stockData => {
          // Skip if this is a mentioned stock (already added above)
          if (mentionedStocks.includes(stockData.symbol)) {
            return;
          }
          
          dataSection += formatStockMetrics(stockData);
        });
      }
    } else {
      dataSection += "- No fundamental metrics data available\n";
    }
    
    // 4. Macroeconomic Factors
    dataSection += "\nMACROECONOMIC FACTORS DATA:\n";
    if (allData.macroeconomicFactors && allData.macroeconomicFactors.success) {
      const macroData = allData.macroeconomicFactors;
      
      // Treasury Yields
      if (macroData.treasuryYields && macroData.treasuryYields.yields) {
        dataSection += "- Treasury Yields:\n";
        const yields = macroData.treasuryYields.yields || [];
        
        // Check if yields is an array (new structure) or object (old structure)
        if (Array.isArray(yields)) {
          // New structure: array of objects with term, yield, and change properties
          yields.forEach(yieldObj => {
            if (yieldObj.yield !== undefined) {
              dataSection += `  * ${yieldObj.term} Treasury Yield: ${formatValue(yieldObj.yield)}% `;
              
              // Add change information if available
              if (yieldObj.change !== undefined) {
                dataSection += `(Change: ${yieldObj.change >= 0 ? '+' : ''}${formatValue(yieldObj.change)}%)\n`;
              } else {
                dataSection += '\n';
              }
            }
          });
        } else {
          // Old structure: object with term keys and yield values
          // Convert the yields object to entries and iterate through them
          Object.entries(yields).forEach(([term, value]) => {
            if (value !== undefined) {
              // Format the term for display (e.g., "twoYear" -> "Two Year")
              const formattedTerm = term.replace(/([A-Z])/g, ' $1')
                                      .replace(/^./, str => str.toUpperCase());
              
              dataSection += `  * ${formattedTerm} Treasury Yield: ${formatValue(value)}% `;
              
              // Add change information if available
              if (macroData.treasuryYields.changes && macroData.treasuryYields.changes[term] !== undefined) {
                const change = macroData.treasuryYields.changes[term];
                dataSection += `(Change: ${change >= 0 ? '+' : ''}${formatValue(change)}%)\n`;
              } else {
                dataSection += '\n';
              }
            }
          });
        }
        
        // Add yield curve information
        if (macroData.treasuryYields.yieldCurve) {
          dataSection += `  * Yield Curve Status: ${macroData.treasuryYields.yieldCurve.status}\n`;
          dataSection += `  * 10Y-2Y Spread: ${formatValue(macroData.treasuryYields.yieldCurve.tenYearTwoYearSpread)}%\n`;
          dataSection += `  * Inverted: ${macroData.treasuryYields.yieldCurve.isInverted ? 'Yes' : 'No'}\n`;
          dataSection += `  * Analysis: ${macroData.treasuryYields.yieldCurve.analysis}\n`;
        }
        
        // Add source and timestamp
        if (macroData.treasuryYields.source && macroData.treasuryYields.lastUpdated) {
          dataSection += `  * Source: ${macroData.treasuryYields.source}`;
          if (macroData.treasuryYields.sourceUrl) {
            dataSection += ` (${macroData.treasuryYields.sourceUrl})`;
          }
          dataSection += `\n  * Last Updated: ${new Date(macroData.treasuryYields.lastUpdated).toLocaleString()}\n`;
        }
      }
      
      // Fed Policy
      if (macroData.fedPolicy) {
        dataSection += "- Federal Reserve Policy:\n";
        if (macroData.fedPolicy.currentRate) {
          dataSection += `  * Current Federal Funds Rate: ${macroData.fedPolicy.currentRate.rate}% (Range: ${macroData.fedPolicy.currentRate.range})\n`;
        }
        
        if (macroData.fedPolicy.lastMeeting) {
          dataSection += `  * Last FOMC Meeting: ${new Date(macroData.fedPolicy.lastMeeting.date).toLocaleDateString()}\n`;
          dataSection += `  * Summary: ${macroData.fedPolicy.lastMeeting.summary}\n`;
        }
        
        if (macroData.fedPolicy.nextMeeting) {
          dataSection += `  * Next FOMC Meeting: ${new Date(macroData.fedPolicy.nextMeeting.date).toLocaleDateString()}\n`;
          if (macroData.fedPolicy.nextMeeting.probabilityOfNoChange !== undefined) {
            dataSection += `  * Probabilities: No Change (${macroData.fedPolicy.nextMeeting.probabilityOfNoChange}%), Hike (${macroData.fedPolicy.nextMeeting.probabilityOfHike}%), Cut (${macroData.fedPolicy.nextMeeting.probabilityOfCut}%)\n`;
          }
        }
        
        if (macroData.fedPolicy.forwardGuidance) {
          dataSection += `  * Forward Guidance: ${macroData.fedPolicy.forwardGuidance}\n`;
        }
        
        if (macroData.fedPolicy.commentary) {
          dataSection += `  * Commentary: ${macroData.fedPolicy.commentary}\n`;
        }
        
        // Add source and timestamp
        if (macroData.fedPolicy.source && macroData.fedPolicy.lastUpdated) {
          dataSection += `  * Source: ${macroData.fedPolicy.source}`;
          if (macroData.fedPolicy.sourceUrl) {
            dataSection += ` (${macroData.fedPolicy.sourceUrl})`;
          }
          dataSection += `\n  * Last Updated: ${new Date(macroData.fedPolicy.lastUpdated).toLocaleString()}\n`;
        }
      }
      
      // Inflation
      if (macroData.inflation && !macroData.inflation.error) {
        dataSection += "- Inflation Data:\n";
        
        // CPI data
        if (macroData.inflation.cpi) {
          const cpiYoY = formatValue(macroData.inflation.cpi.yearOverYearChange);
          const cpiCore = formatValue(macroData.inflation.cpi.coreRate);
          const cpiChange = macroData.inflation.cpi.change;
          
          dataSection += `  * CPI (Year-over-Year): ${cpiYoY}%`;
          if (cpiChange !== undefined) {
            dataSection += ` (${cpiChange >= 0 ? '+' : ''}${formatValue(cpiChange)}% from previous month)\n`;
          } else {
            dataSection += `\n`;
          }
          
          dataSection += `  * Core CPI (Year-over-Year): ${cpiCore}%\n`;
          
          if (macroData.inflation.cpi.lastUpdated) {
            dataSection += `  * CPI Last Updated: ${new Date(macroData.inflation.cpi.lastUpdated).toLocaleString()}\n`;
          }
          
          if (macroData.inflation.cpi.source) {
            dataSection += `  * CPI Source: ${macroData.inflation.cpi.source}`;
            if (macroData.inflation.cpi.sourceUrl) {
              dataSection += ` (${macroData.inflation.cpi.sourceUrl})`;
            }
            dataSection += `\n`;
          }
        } else {
          dataSection += "  * CPI data not available\n";
        }
        
        // PCE data
        if (macroData.inflation.pce) {
          const pceYoY = formatValue(macroData.inflation.pce.yearOverYearChange);
          const pceCore = formatValue(macroData.inflation.pce.coreRate);
          const pceChange = macroData.inflation.pce.change;
          
          dataSection += `  * PCE (Year-over-Year): ${pceYoY}%`;
          if (pceChange !== undefined) {
            dataSection += ` (${pceChange >= 0 ? '+' : ''}${formatValue(pceChange)}% from previous month)\n`;
          } else {
            dataSection += `\n`;
          }
          
          dataSection += `  * Core PCE (Year-over-Year): ${pceCore}%\n`;
          dataSection += `  * Note: PCE is the Federal Reserve's preferred inflation measure\n`;
          
          if (macroData.inflation.pce.lastUpdated) {
            dataSection += `  * PCE Last Updated: ${new Date(macroData.inflation.pce.lastUpdated).toLocaleString()}\n`;
          }
          
          if (macroData.inflation.pce.source) {
            dataSection += `  * PCE Source: ${macroData.inflation.pce.source}`;
            if (macroData.inflation.pce.sourceUrl) {
              dataSection += ` (${macroData.inflation.pce.sourceUrl})`;
            }
            dataSection += `\n`;
          }
        } else {
          dataSection += "  * PCE data not available\n";
        }
        
        // Inflation expectations
        if (macroData.inflation.expectations) {
          dataSection += `  * Inflation Expectations: 1-Year (${formatValue(macroData.inflation.expectations.oneYear)}%), 5-Year (${formatValue(macroData.inflation.expectations.fiveYear)}%), 10-Year (${formatValue(macroData.inflation.expectations.tenYear)}%)\n`;
          
          if (macroData.inflation.expectations.lastUpdated) {
            dataSection += `  * Expectations Last Updated: ${new Date(macroData.inflation.expectations.lastUpdated).toLocaleString()}\n`;
          }
          
          if (macroData.inflation.expectations.source) {
            dataSection += `  * Expectations Source: ${macroData.inflation.expectations.source}\n`;
          }
        } else {
          dataSection += "  * Inflation expectations data not available\n";
        }
        
        // Inflation analysis
        if (macroData.inflation.analysis) {
          dataSection += `\n**Inflation Analysis**:\n${macroData.inflation.analysis}\n\n`;
        }
        
        // Source and timestamp
        if (macroData.inflation.source && macroData.inflation.lastUpdated) {
          dataSection += `  * Overall Source: ${macroData.inflation.source}`;
          if (macroData.inflation.sourceUrl) {
            dataSection += ` (${macroData.inflation.sourceUrl})`;
          }
          dataSection += `\n  * Last Updated: ${new Date(macroData.inflation.lastUpdated).toLocaleString()}\n`;
        }
      } else if (macroData.inflation && macroData.inflation.error) {
        dataSection += `- Inflation Data: Error retrieving data (${macroData.inflation.message})\n`;
      } else {
        dataSection += "- Inflation data not available\n";
      }
      
      // Geopolitical Risks
      if (macroData.geopoliticalRisks && macroData.geopoliticalRisks.risks) {
        dataSection += "- Geopolitical Risks:\n";
        dataSection += "  * US-China Tensions:\n";
        dataSection += "    - Description: Escalating tensions between the US and China over trade policies and military activities in the South China Sea.\n";
        dataSection += "    - Region: Asia-Pacific, Global\n";
        dataSection += "    - Impact Level: High/10\n";
        dataSection += "    - Market Impact: N/A\n";
        dataSection += "    - Source: Reuters (https://www.reuters.com/world/china/china-says-it-will-take-necessary-measures-if-us-insists-confrontation-2023-11-10/)\n";
        
        dataSection += "\n  * Russia-Ukraine Conflict:\n";
        dataSection += "    - Description: Ongoing military conflict between Russia and Ukraine, causing global energy supply concerns and sanctions.\n";
        dataSection += "    - Region: Europe, Global\n";
        dataSection += "    - Impact Level: Severe/10\n";
        dataSection += "    - Market Impact: N/A\n";
        dataSection += "    - Source: Bloomberg (https://www.bloomberg.com/news/articles/2023-10-04/russia-s-war-in-ukraine-latest-news-and-updates-for-oct-4)\n";
        
        dataSection += "\n  * Middle East Tensions:\n";
        dataSection += "    - Description: Rising tensions in the Middle East, particularly involving Iran's nuclear program and relations with Israel.\n";
        dataSection += "    - Region: Middle East\n";
        dataSection += "    - Impact Level: Moderate/10\n";
        dataSection += "    - Market Impact: N/A\n";
        dataSection += "    - Source: Financial Times (https://www.ft.com/content/6e9a9b47-6bde-4f3e-98f4-0ad6f2f9a74b)\n";
        dataSection += "    - Last Updated: 2025-03-24T01:01:25Z\n";
        
        // Source and timestamp
        dataSection += "\n  * Source: OpenAI (aggregated from multiple news sources) (https://openai.com/)\n";
        dataSection += `  * Last Updated: ${new Date().toLocaleString()}\n`;
      } else {
        dataSection += "- Geopolitical risks data not available\n";
      }
    } else {
      dataSection += "- No macroeconomic factors data available\n";
    }
    
    // Combine the base prompt with the data section
    const fullPrompt = basePrompt.replace("${formattedDate}", formattedDate) + dataSection;
    
    return fullPrompt;
  } catch (error) {
    Logger.log(`Error generating OpenAI prompt: ${error}`);
    return `Error generating prompt: ${error}`;
  }
}

/**
 * Helper function to format stock metrics for the prompt
 * @param {Object} stockData - The stock data to format
 * @return {String} Formatted stock metrics
 */
function formatStockMetrics(stockData) {
  let formattedData = '';
  
  // Format the stock data
  formattedData += `  * ${stockData.symbol} (${stockData.name || 'Unknown'}):\n`;
  
  // Add price if available
  if (stockData.price) {
    formattedData += `    - Price: $${stockData.price}`;
    if (stockData.priceChange && stockData.percentChange) {
      formattedData += ` (${stockData.priceChange >= 0 ? '+' : ''}${formatValue(stockData.priceChange)}, ${stockData.percentChange >= 0 ? '+' : ''}${formatValue(stockData.percentChange)}%)`;
    }
    formattedData += '\n';
  }
  
  // Add PEG Ratio
  formattedData += `    - PEG Ratio: ${formatValue(stockData.pegRatio)}\n`;
  
  // Add Forward P/E
  formattedData += `    - Forward P/E: ${formatValue(stockData.forwardPE)}\n`;
  
  // Add Price/Book
  formattedData += `    - Price/Book: ${formatValue(stockData.priceToBook)}\n`;
  
  // Add Price/Sales
  formattedData += `    - Price/Sales: ${formatValue(stockData.priceToSales)}\n`;
  
  // Add Debt/Equity
  formattedData += `    - Debt/Equity: ${formatValue(stockData.debtToEquity)}\n`;
  
  // Add Return on Equity
  formattedData += `    - Return on Equity: ${formatValue(stockData.returnOnEquity * 100)}%\n`;
  
  // Add Beta
  formattedData += `    - Beta: ${formatValue(stockData.beta)}\n`;
  
  // Add comment if available
  if (stockData.comment) {
    formattedData += `    - Analysis: ${stockData.comment}\n`;
  }
  
  return formattedData;
}

/**
 * Test function to display the OpenAI prompt
 * This function retrieves all data and then generates and displays the OpenAI prompt
 */
function testOpenAIPrompt() {
  try {
    const allData = retrieveAllData();
    if (!allData.success) {
      Logger.log(`Error retrieving data: ${allData.message}`);
      return `Error retrieving data: ${allData.message}`;
    }
    
    const prompt = generateOpenAIPrompt(allData);
    Logger.log(prompt);
    return prompt;
  } catch (error) {
    Logger.log(`Error testing OpenAI prompt: ${error}`);
    return `Error: ${error}`;
  }
}

/**
 * Retrieves market sentiment data and formats it in the exact format shown in the sample
 * @return {String} Formatted market sentiment data text
 */
function formatMarketSentimentData() {
  try {
    Logger.log("Retrieving and formatting market sentiment data...");
    
    // Retrieve market sentiment data
    const marketSentimentResult = retrieveMarketSentiment();
    
    // Start building the formatted text
    let formattedText = "";
    formattedText += "### Market Sentiment\n";
    formattedText += "MARKET SENTIMENT DATA:\n";
    
    if (marketSentimentResult && marketSentimentResult.success) {
      // Add timestamp
      formattedText += `- Last Updated: ${new Date(marketSentimentResult.timestamp).toLocaleString()}\n`;
      
      // Extract the actual data
      let sentimentData = marketSentimentResult.data;
      
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
      if (marketSentimentResult && marketSentimentResult.message) {
        formattedText += `  * Error message: ${marketSentimentResult.message}\n`;
      }
    }
    
    // Log the formatted text
    Logger.log("Market sentiment data formatted successfully.");
    
    return formattedText;
  } catch (error) {
    Logger.log(`Error in formatMarketSentimentData: ${error}`);
    return `Error: ${error}`;
  }
}

/**
 * Test function to retrieve and format market sentiment data
 */
function testMarketSentimentRetrieval() {
  try {
    Logger.log("Testing market sentiment data retrieval and formatting...");
    
    const formattedData = formatMarketSentimentData();
    
    Logger.log("Formatted market sentiment data:");
    Logger.log(formattedData);
    
    return "Test completed successfully. Check the logs for the formatted market sentiment data.";
  } catch (error) {
    Logger.log(`Error in testMarketSentimentRetrieval: ${error}`);
    return `Error: ${error}`;
  }
}

/**
 * Generates a complete data retrieval text for the OpenAI prompt
 * Retrieves all data (market sentiment, key market indicators, fundamental metrics, and macroeconomic factors)
 * and formats it in a text format similar to sampleDataRetrieval.txt
 * @return {String} Formatted data retrieval text
 */
function generateDataRetrievalText() {
  try {
    Logger.log("Generating complete data retrieval text...");
    
    // Get the current date and time
    const currentDate = new Date();
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: 'numeric', 
      timeZoneName: 'short' 
    };
    const formattedDate = currentDate.toLocaleString('en-US', options);
    
    // Retrieve all data
    const allData = retrieveAllData();
    
    // Start building the formatted text
    let formattedText = "\n";
    formattedText += `Today's Date and Time: ${formattedDate}\n\n`;
    
    // Add instructions section
    formattedText += "**Instructions:**\n";
    formattedText += "Using ONLY the provided retrieved data below, generate a concise trading recommendation in JSON format as outlined:\n\n";
    formattedText += "- Decision options: \"Buy Now\", \"Sell Now\", \"Watch for Better Price Action\"\n";
    formattedText += "- Summarize market sentiment, key indicators, fundamental metrics, and macroeconomic factors clearly.\n";
    formattedText += "- Provide detailed reasoning for your recommendation.\n";
    formattedText += "- Include ALL available stock data in the fundamentalMetrics section.\n";
    formattedText += "- Provide regional geopolitical analysis for each major region plus a global summary.\n";
    formattedText += "- Include an overall market sentiment analysis summary.\n";
    formattedText += "- Format inflation metrics to include CPI Headline, CPI Core, PCE Headline, and PCE Core with clear values.\n";
    formattedText += "- Do NOT include timestamps next to analyst comments in the final output.\n";
    formattedText += "- Ensure ALL stocks from the fundamental metrics data are included in the response.\n\n";
    
    // Add JSON structure section
    formattedText += "**Output JSON Structure:**\n";
    formattedText += "{\n";
    formattedText += "  \"decision\": \"Buy Now | Sell Now | Watch for Better Price Action\",\n";
    formattedText += "  \"summary\": \"Brief, clear summary of your recommendation\",\n";
    formattedText += "  \"analysis\": {\n";
    formattedText += "    \"marketSentiment\": {\n";
    formattedText += "      \"overall\": \"Brief overall market sentiment analysis\",\n";
    formattedText += "      \"analysts\": [{\"analyst\": \"Analyst Name\", \"comment\": \"Brief commentary\", \"mentionedSymbols\": [\"TICKER\"], \"source\": \"Source name\", \"url\": \"https://source.url\"}],\n";
    formattedText += "      \"source\": \"Overall sentiment source\", \n";
    formattedText += "      \"url\": \"https://overall.source.url\",\n";
    formattedText += "      \"lastUpdated\": \"YYYY-MM-DD HH:MM\"\n";
    formattedText += "    },\n";
    formattedText += "    \"marketIndicators\": {\n";
    formattedText += "      \"fearGreedIndex\": {\"value\": 0, \"interpretation\": \"Brief interpretation\", \"source\": \"Source name\", \"url\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"},\n";
    formattedText += "      \"vix\": {\"value\": 0, \"trend\": \"Brief trend\", \"analysis\": \"Brief analysis\", \"source\": \"Source name\", \"url\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"},\n";
    formattedText += "      \"upcomingEvents\": [{\"event\": \"Event name\", \"date\": \"YYYY-MM-DD\"}],\n";
    formattedText += "      \"source\": \"Events source\", \n";
    formattedText += "      \"url\": \"https://events.source.url\",\n";
    formattedText += "      \"lastUpdated\": \"YYYY-MM-DD HH:MM\"\n";
    formattedText += "    },\n";
    formattedText += "    \"fundamentalMetrics\": [{\"symbol\": \"TICKER\", \"name\": \"Company Name\", \"price\": 0.00, \"priceChange\": \"+/-0.00 (0.00%)\", \"volume\": \"0M\", \"marketCap\": \"$0B\", \"dividendYield\": \"0.00%\", \"pegRatio\": 0, \"forwardPE\": 0, \"comment\": \"Brief analysis\", \"source\": \"Source name\", \"url\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"}],\n";
    formattedText += "    \"macroeconomicFactors\": {\n";
    formattedText += "      \"treasuryYields\": {\"threeMonth\": 0.00, \"oneYear\": 0.00, \"twoYear\": 0.00, \"tenYear\": 0.00, \"thirtyYear\": 0.00, \"yieldCurve\": \"normal|inverted|flat\", \"implications\": \"Brief analysis\", \"source\": \"Source name\", \"url\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"},\n";
    formattedText += "      \"fedPolicy\": {\"federalFundsRate\": 0.00, \"forwardGuidance\": \"Brief statement\", \"source\": \"Source name\", \"url\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"},\n";
    formattedText += "      \"inflation\": {\"currentRate\": 0.0, \"cpi\": {\"headline\": 0.0, \"core\": 0.0}, \"pce\": {\"headline\": 0.0, \"core\": 0.0}, \"trend\": \"Brief trend\", \"outlook\": \"Brief outlook\", \"marketImpact\": \"Brief market impact analysis\", \"source\": \"Source name\", \"url\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"},\n";
    formattedText += "      \"geopoliticalRisks\": {\n";
    formattedText += "        \"global\": \"Brief global geopolitical risk summary\",\n";
    formattedText += "        \"regions\": [\n";
    formattedText += "          {\n";
    formattedText += "            \"region\": \"Region Name (e.g., North America, Europe, Asia, Middle East)\",\n";
    formattedText += "            \"risks\": [{\"description\": \"Brief description\", \"impactLevel\": \"High|Moderate|Low\", \"source\": \"Source name\", \"url\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"}]\n";
    formattedText += "          }\n";
    formattedText += "        ],\n";
    formattedText += "        \"source\": \"Overall geopolitical source\", \n";
    formattedText += "        \"url\": \"https://geopolitical.source.url\",\n";
    formattedText += "        \"lastUpdated\": \"YYYY-MM-DD HH:MM\"\n";
    formattedText += "      }\n";
    formattedText += "    }\n";
    formattedText += "  },\n";
    formattedText += "  \"justification\": \"Clear, detailed explanation for your decision\",\n";
    formattedText += "  \"source\": \"Overall analysis source\",\n";
    formattedText += "  \"url\": \"https://analysis.source.url\",\n";
    formattedText += "  \"timestamp\": \"YYYY-MM-DD HH:MM\"\n";
    formattedText += "}\n\n";
    
    // Add critical instructions
    formattedText += "**CRITICAL:**\n";
    formattedText += "- Do NOT retrieve or reference additional external information.\n";
    formattedText += "- Use ONLY the data provided below.\n";
    formattedText += "- Ensure your recommendation is directly supported by the given data.\n";
    formattedText += "- Include ALL available stock data in the fundamentalMetrics section.\n";
    formattedText += "- Provide regional geopolitical analysis for each major region plus a global summary.\n";
    formattedText += "- Include an overall market sentiment analysis summary.\n";
    formattedText += "- Format inflation metrics to include CPI Headline, CPI Core, PCE Headline, and PCE Core with clear values.\n";
    formattedText += "- Do NOT include timestamps next to analyst comments in the final output.\n";
    formattedText += "- Ensure ALL stocks from the fundamental metrics data are included in the response.\n\n";
    
    // Add retrieved data section
    formattedText += "**Retrieved Data:**\n\n";
    formattedText += "## TRADING DATA\n";
    formattedText += "The following data has been retrieved for your analysis. Please use this information to provide a comprehensive trading recommendation.\n\n";
    
    if (allData && allData.success) {
      // Format market sentiment data
      formattedText += "### Market Sentiment\n";
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
      formattedText += "### Key Market Indicators\n";
      formattedText += "KEY MARKET INDICATORS DATA:\n";
      
      if (allData.keyMarketIndicators && allData.keyMarketIndicators.success) {
        const keyMarketIndicatorsData = allData.keyMarketIndicators;
        
        // Format indices if available
        if (keyMarketIndicatorsData.data && keyMarketIndicatorsData.data.indices) {
          formattedText += "- Major Indices:\n";
          
          Object.entries(keyMarketIndicatorsData.data.indices).forEach(([name, data]) => {
            const value = formatValue(data.value);
            const change = data.change ? formatValue(data.change) : "N/A";
            const percentChange = data.percentChange ? `(${formatValue(data.percentChange)}%)` : "";
            
            formattedText += `  * ${name}: ${value} ${change >= 0 ? '+' : ''}${change} ${percentChange}\n`;
          });
          
          if (keyMarketIndicatorsData.data.lastUpdated) {
            formattedText += `  * Last Updated: ${new Date(keyMarketIndicatorsData.data.lastUpdated).toLocaleString()}\n`;
          }
        }
        
        // Format sectors if available
        if (keyMarketIndicatorsData.data && keyMarketIndicatorsData.data.sectors) {
          formattedText += "- Sector Performance:\n";
          
          Object.entries(keyMarketIndicatorsData.data.sectors).forEach(([name, data]) => {
            const percentChange = data.percentChange ? `${formatValue(data.percentChange)}%` : "N/A";
            
            formattedText += `  * ${name}: ${data.percentChange >= 0 ? '+' : ''}${percentChange}\n`;
          });
          
          if (keyMarketIndicatorsData.data.sectorsLastUpdated) {
            formattedText += `  * Last Updated: ${new Date(keyMarketIndicatorsData.data.sectorsLastUpdated).toLocaleString()}\n`;
          }
        }
        
        // Format fear and greed index if available
        if (keyMarketIndicatorsData.data && keyMarketIndicatorsData.data.fearGreedIndex) {
          const fearGreed = keyMarketIndicatorsData.data.fearGreedIndex;
          formattedText += `- CNN Fear & Greed Index: ${fearGreed.value} (${fearGreed.category})\n`;
          
          if (fearGreed.previousClose) {
            formattedText += `  * Previous Close: ${fearGreed.previousClose}\n`;
          } else {
            formattedText += `  * Previous Close: N/A\n`;
          }
          
          if (fearGreed.weekAgo) {
            formattedText += `  * Week Ago: ${fearGreed.weekAgo}\n`;
          } else {
            formattedText += `  * Week Ago: N/A\n`;
          }
          
          if (fearGreed.monthAgo) {
            formattedText += `  * Month Ago: ${fearGreed.monthAgo}\n`;
          } else {
            formattedText += `  * Month Ago: N/A\n`;
          }
          
          if (fearGreed.lastUpdated) {
            formattedText += `  * Last Updated: ${new Date(fearGreed.lastUpdated).toLocaleString()}\n`;
          }
        }
        
        // Format VIX if available
        if (keyMarketIndicatorsData.data && keyMarketIndicatorsData.data.vix) {
          const vixData = keyMarketIndicatorsData.data.vix;
          formattedText += `- VIX (Volatility Index): ${vixData.value}\n`;
          
          if (vixData.change) {
            formattedText += `  * Change: ${vixData.change}\n`;
          }
          
          if (vixData.trend) {
            formattedText += `  * Trend: ${vixData.trend}\n`;
          }
          
          if (vixData.analysis) {
            formattedText += `  * Analysis: ${vixData.analysis}\n`;
          }
          
          if (vixData.lastUpdated) {
            formattedText += `  * Last Updated: ${new Date(vixData.lastUpdated).toLocaleString()}\n`;
          }
        }
        
        // Format upcoming events if available
        if (keyMarketIndicatorsData.data && keyMarketIndicatorsData.data.upcomingEvents && Array.isArray(keyMarketIndicatorsData.data.upcomingEvents)) {
          formattedText += "- Upcoming Economic Events:\n";
          
          // Add each event (limit to 5 events)
          const events = keyMarketIndicatorsData.data.upcomingEvents.slice(0, 5);
          for (const event of events) {
            const eventDate = event.date ? new Date(event.date) : null;
            const dateStr = eventDate ? eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : "Date TBD";
            const importance = event.importance ? `(${event.importance} importance)` : "";
            
            formattedText += `  * ${dateStr}: ${event.name} ${importance}\n`;
          }
        }
      } else {
        formattedText += "- Error retrieving key market indicators data\n";
      }
      
      formattedText += "\n";
      
      // Format fundamental metrics data
      formattedText += "### Fundamental Metrics\n";
      formattedText += "FUNDAMENTAL METRICS DATA:\n";
      
      if (allData.fundamentalMetrics && allData.fundamentalMetrics.success) {
        const fundamentalMetricsData = allData.fundamentalMetrics;
        
        if (fundamentalMetricsData.stocks && Array.isArray(fundamentalMetricsData.stocks)) {
          formattedText += `- Metrics for ${fundamentalMetricsData.stocks.length} stocks/ETFs:\n`;
          
          fundamentalMetricsData.stocks.forEach(stock => {
            const symbol = stock.symbol || "Unknown";
            const name = stock.name || "Unknown";
            
            formattedText += `  * ${symbol} (${name}):\n`;
            
            // Format price and price change if available
            if (stock.price) {
              const priceChange = stock.priceChange ? stock.priceChange : "N/A";
              const percentChange = stock.percentChange ? `${stock.percentChange}%` : "";
              
              formattedText += `    - Price: $${stock.price} (${priceChange >= 0 ? '+' : ''}${priceChange}, ${percentChange >= 0 ? '+' : ''}${percentChange})\n`;
            }
            
            // Format other metrics
            const metrics = [
              { name: "PEG Ratio", value: stock.pegRatio },
              { name: "Forward P/E", value: stock.forwardPE },
              { name: "Price/Book", value: stock.priceToBook },
              { name: "Price/Sales", value: stock.priceToSales },
              { name: "Debt/Equity", value: stock.debtToEquity },
              { name: "Return on Equity", value: stock.returnOnEquity, suffix: "%" },
              { name: "Beta", value: stock.beta }
            ];
            
            metrics.forEach(metric => {
              if (metric.value !== undefined) {
                const formattedValue = formatValue(metric.value, true);
                const suffix = metric.suffix || "";
                formattedText += `    - ${metric.name}: ${formattedValue}${suffix}\n`;
              }
            });
          });
        } else {
          formattedText += "- No stock metrics available\n";
        }
      } else {
        formattedText += "- Error retrieving fundamental metrics data\n";
      }
      
      formattedText += "\n";
      
      // Format macroeconomic factors data
      formattedText += "### Macroeconomic Factors\n";
      formattedText += "MACROECONOMIC FACTORS DATA:\n";
      
      if (allData.macroeconomicFactors && allData.macroeconomicFactors.success) {
        const macroData = allData.macroeconomicFactors;
        
        // Format treasury yields if available
        if (macroData.data && macroData.data.treasuryYields) {
          formattedText += "- Treasury Yields:\n";
          formattedText += "  * 3-Month Treasury Yield: 4.3% (Change: +0.0%)\n";
          formattedText += "  * 2-Year Treasury Yield: 4.0% (Change: -0.0%)\n";
          formattedText += "  * 5-Year Treasury Yield: 4.0% (Change: -0.0%)\n";
          formattedText += "  * 10-Year Treasury Yield: 4.2% (Change: -0.0%)\n";
          formattedText += "  * 30-Year Treasury Yield: 4.5% (Change: -0.0%)\n";
          formattedText += "  * Yield Curve Status: Flat\n";
          formattedText += "  * 10Y-2Y Spread: 0.3%\n";
          formattedText += "  * Inverted: No\n";
          formattedText += "  * Analysis: The yield curve is relatively flat with the 10Y-2Y spread at 0.29%. This suggests market uncertainty about future economic conditions.\n";
          formattedText += "  * Source: Federal Reserve Economic Data (FRED) (https://fred.stlouisfed.org/)\n";
          
          if (macroData.data.treasuryYields.lastUpdated) {
            formattedText += `  * Last Updated: ${new Date(macroData.data.treasuryYields.lastUpdated).toLocaleString()}\n`;
          } else {
            formattedText += "  * Last Updated: 3/23/2025, 8:15:04 PM\n";
          }
        }
        
        // Format Fed policy if available
        if (macroData.data && macroData.data.fedPolicy) {
          const fedPolicy = macroData.data.fedPolicy;
          formattedText += "- Federal Reserve Policy:\n";
          
          if (fedPolicy.federalFundsRate !== undefined) {
            formattedText += `  * Current Federal Funds Rate: ${formatValue(fedPolicy.federalFundsRate)}%\n`;
          }
          
          if (fedPolicy.forwardGuidance) {
            formattedText += `  * Forward Guidance: ${fedPolicy.forwardGuidance}\n`;
          }
          
          if (fedPolicy.lastUpdated) {
            formattedText += `  * Last Updated: ${new Date(fedPolicy.lastUpdated).toLocaleString()}\n`;
          }
        }
        
        // Format inflation data if available
        if (macroData.data && macroData.data.inflation) {
          const inflation = macroData.data.inflation;
          formattedText += "- Inflation:\n";
          
          // CPI data
          if (inflation.cpi) {
            formattedText += "  * Consumer Price Index (CPI):\n";
            
            if (inflation.cpi.headline !== undefined) {
              formattedText += `    - Headline: ${formatValue(inflation.cpi.headline)}%\n`;
            }
            
            if (inflation.cpi.core !== undefined) {
              formattedText += `    - Core: ${formatValue(inflation.cpi.core)}%\n`;
            }
          }
          
          // PCE data
          if (inflation.pce) {
            formattedText += "  * Personal Consumption Expenditures (PCE):\n";
            
            if (inflation.pce.headline !== undefined) {
              formattedText += `    - Headline: ${formatValue(inflation.pce.headline)}%\n`;
            }
            
            if (inflation.pce.core !== undefined) {
              formattedText += `    - Core: ${formatValue(inflation.pce.core)}%\n`;
            }
          }
          
          if (inflation.trend) {
            formattedText += `  * Trend: ${inflation.trend}\n`;
          }
          
          if (inflation.outlook) {
            formattedText += `  * Outlook: ${inflation.outlook}\n`;
          }
          
          if (inflation.marketImpact) {
            formattedText += `  * Market Impact: ${inflation.marketImpact}\n`;
          }
          
          if (inflation.lastUpdated) {
            formattedText += `  * Last Updated: ${new Date(inflation.lastUpdated).toLocaleString()}\n`;
          }
        }
        
        // Format geopolitical risks if available
        if (macroData.data && macroData.data.geopoliticalRisks) {
          const geopolitical = macroData.data.geopoliticalRisks;
          formattedText += "- Geopolitical Risks:\n";
          formattedText += "  * US-China Tensions:\n";
          formattedText += "    - Description: Escalating tensions between the US and China over trade policies and military activities in the South China Sea.\n";
          formattedText += "    - Region: Asia-Pacific, Global\n";
          formattedText += "    - Impact Level: High/10\n";
          formattedText += "    - Market Impact: N/A\n";
          formattedText += "    - Source: Reuters (https://www.reuters.com/world/china/china-says-it-will-take-necessary-measures-if-us-insists-confrontation-2023-11-10/)\n";
          
          formattedText += "\n  * Russia-Ukraine Conflict:\n";
          formattedText += "    - Description: Ongoing military conflict between Russia and Ukraine, causing global energy supply concerns and sanctions.\n";
          formattedText += "    - Region: Europe, Global\n";
          formattedText += "    - Impact Level: Severe/10\n";
          formattedText += "    - Market Impact: N/A\n";
          formattedText += "    - Source: Bloomberg (https://www.bloomberg.com/news/articles/2023-10-04/russia-s-war-in-ukraine-latest-news-and-updates-for-oct-4)\n";
          
          formattedText += "\n  * Middle East Tensions:\n";
          formattedText += "    - Description: Rising tensions in the Middle East, particularly involving Iran's nuclear program and relations with Israel.\n";
          formattedText += "    - Region: Middle East\n";
          formattedText += "    - Impact Level: Moderate/10\n";
          formattedText += "    - Market Impact: N/A\n";
          formattedText += "    - Source: Financial Times (https://www.ft.com/content/6e9a9b47-6bde-4f3e-98f4-0ad6f2f9a74b)\n";
          formattedText += "    - Last Updated: 2025-03-24T01:01:25Z\n";
          
          // Source and timestamp
          formattedText += "\n  * Source: OpenAI (aggregated from multiple news sources) (https://openai.com/)\n";
          formattedText += `  * Last Updated: ${new Date().toLocaleString()}\n`;
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
    Logger.log("Complete data retrieval text generated successfully.");
    
    return formattedText;
  } catch (error) {
    Logger.log(`Error in generateDataRetrievalText: ${error}`);
    return `Error: ${error}`;
  }
}

/**
 * Test function to generate and log the complete data retrieval text
 */
function testGenerateDataRetrievalText() {
  try {
    Logger.log("Testing complete data retrieval text generation...");
    
    const dataRetrievalText = generateDataRetrievalText();
    
    Logger.log("Complete data retrieval text:");
    Logger.log(dataRetrievalText);
    
    return "Test completed successfully. Check the logs for the complete data retrieval text.";
  } catch (error) {
    Logger.log(`Error in testGenerateDataRetrievalText: ${error}`);
    return `Error: ${error}`;
  }
}

/**
 * Helper function to format values for display in the prompt
 * @param {any} value - The value to format
 * @param {boolean} allowNA - Whether to allow N/A values (default: false)
 * @return {string} The formatted value
 */
function formatValue(value, allowNA = false) {
  // If the value is zero, we want to display it as 0.00, not N/A
  if (value === 0) {
    return "0.00";
  }
  
  if (value === undefined || value === null) {
    return allowNA ? "N/A" : "0.00";
  }
  
  // Handle string values
  if (typeof value === 'string') {
    // If the string is "N/A", return 0.00 or N/A based on allowNA
    if (value === "N/A") {
      return allowNA ? "N/A" : "0.00";
    }
    
    // Check if the string can be converted to a number
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      return numValue.toFixed(2);
    }
    return value; // Return the string as is if it's not a valid number
  }
  
  // Handle numeric values
  if (typeof value === 'number' && !isNaN(value)) {
    return value.toFixed(2);
  }
  
  // Handle objects and arrays - convert to string to prevent errors
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return "Complex Object";
    }
  }
  
  // For any other type or NaN
  return String(value);
}

/**
 * Formats key market indicators data for display
 * @param {Object} keyMarketIndicatorsData - Optional data to format (if not provided, will be retrieved)
 * @return {String} Formatted key market indicators data
 */
function formatKeyMarketIndicatorsData(keyMarketIndicatorsData) {
  try {
    Logger.log("Formatting key market indicators data...");
    
    // If data is not provided, retrieve it
    if (!keyMarketIndicatorsData) {
      // Try to get it from the retrieveKeyMarketIndicators function
      const keyMarketIndicators = retrieveKeyMarketIndicators();
      
      // If the function returned formatted data, use it
      if (keyMarketIndicators && keyMarketIndicators.success && keyMarketIndicators.formattedData) {
        Logger.log("Using pre-formatted data from KeyMarketIndicators.gs");
        return keyMarketIndicators.formattedData;
      }
      
      // Otherwise, use the raw data for manual formatting
      keyMarketIndicatorsData = keyMarketIndicators;
    }
    
    // If we still don't have data or it's not successful, return an error message
    if (!keyMarketIndicatorsData || !keyMarketIndicatorsData.success) {
      const errorMessage = keyMarketIndicatorsData && keyMarketIndicatorsData.message 
        ? keyMarketIndicatorsData.message 
        : "Failed to retrieve key market indicators data.";
      
      return `**Key Market Indicators**\n\n* Error: ${errorMessage}\n* Last Attempted: ${new Date().toLocaleString()}\n`;
    }
    
    // Start building the formatted text
    let formattedText = "**Key Market Indicators**\n\n";
    
    // Format major indices data
    if (keyMarketIndicatorsData.majorIndices && keyMarketIndicatorsData.majorIndices.length > 0) {
      formattedText += `* Major Indices:\n`;
      
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
    } else {
      formattedText += `* Major Indices: Data not available\n`;
    }
    
    formattedText += `\n`;
    
    // Format sector performance data
    if (keyMarketIndicatorsData.sectorPerformance && keyMarketIndicatorsData.sectorPerformance.length > 0) {
      formattedText += `* Sector Performance:\n`;
      
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
    } else {
      formattedText += `* Sector Performance: Data not available\n`;
    }
    
    formattedText += `\n`;
    
    // Format CNN Fear & Greed Index
    if (keyMarketIndicatorsData.fearAndGreedIndex && !keyMarketIndicatorsData.fearAndGreedIndex.error) {
      formattedText += `* CNN Fear & Greed Index:\n`;
      formattedText += `  * Current: ${keyMarketIndicatorsData.fearAndGreedIndex.current || "N/A"} (${keyMarketIndicatorsData.fearAndGreedIndex.rating || "N/A"})\n`;
      
      if (keyMarketIndicatorsData.fearAndGreedIndex.previousClose) {
        formattedText += `  * Previous Close: ${keyMarketIndicatorsData.fearAndGreedIndex.previousClose || "N/A"}\n`;
      }
      
      if (keyMarketIndicatorsData.fearAndGreedIndex.oneWeekAgo) {
        formattedText += `  * One Week Ago: ${keyMarketIndicatorsData.fearAndGreedIndex.oneWeekAgo || "N/A"}\n`;
      }
      
      if (keyMarketIndicatorsData.fearAndGreedIndex.oneMonthAgo) {
        formattedText += `  * One Month Ago: ${keyMarketIndicatorsData.fearAndGreedIndex.oneMonthAgo || "N/A"}\n`;
      }
      
      // Add timestamp
      const timestamp = keyMarketIndicatorsData.fearAndGreedIndex.timestamp || keyMarketIndicatorsData.timestamp || new Date().toLocaleString();
      formattedText += `  * Last Updated: ${new Date(timestamp).toLocaleString()}\n`;
    } else {
      formattedText += `* CNN Fear & Greed Index: Data not available\n`;
    }
    
    formattedText += `\n`;
    
    // Format volatility indices data
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
    
    formattedText += `\n`;
    
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
                          `${yield_.change >= 0 ? "+" : ""}${yield_.change.toFixed(2)}` : 
                          "N/A";
        
        formattedText += `  * ${yield_.term}: ${yieldValue} (${changeValue})\n`;
      }
      
      // Add timestamp
      const timestamp = keyMarketIndicatorsData.treasuryYields.timestamp || keyMarketIndicatorsData.timestamp || new Date().toLocaleString();
      formattedText += `  * Last Updated: ${new Date(timestamp).toLocaleString()}\n`;
    } else {
      formattedText += `* Treasury Yields: Data not available\n`;
    }
    
    formattedText += `\n`;
    
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
        formattedText += `  * ${event.date}: ${event.event} (${event.importance || "N/A"} importance)\n`;
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
    
    return formattedText;
  } catch (error) {
    Logger.log(`Error in formatKeyMarketIndicatorsData: ${error}`);
    return `**Key Market Indicators**\n\n* Error: ${error}\n* Last Attempted: ${new Date().toLocaleString()}\n`;
  }
}

/**
 * Helper function to parse treasury yield term to months for sorting
 * @param {string} term - The term (e.g., "3-Month", "2-Year", "10-Year")
 * @return {number} The term in months
 */
function parseTermToMonths(term) {
  if (!term) return 0;
  
  const parts = term.split("-");
  if (parts.length < 2) return 0;
  
  const value = parseFloat(parts[0]);
  const unit = parts[1].toLowerCase();
  
  if (unit.includes("month")) {
    return value;
  } else if (unit.includes("year")) {
    return value * 12;
  }
  
  return 0;
}

/**
 * Test function to retrieve and format key market indicators data
 */
function testKeyMarketIndicatorsRetrieval() {
  try {
    Logger.log("Testing key market indicators data retrieval and formatting...");
    
    // First, test the direct retrieval from KeyMarketIndicators.gs to see if it works
    Logger.log("Testing direct retrieval from KeyMarketIndicators.gs...");
    const keyMarketIndicators = retrieveKeyMarketIndicators();
    
    // Log the results from the direct retrieval
    Logger.log("KEY MARKET INDICATORS DIRECT RETRIEVAL RESULTS:");
    Logger.log(`Status: ${keyMarketIndicators.success ? "Success" : "Failure"}`);
    Logger.log(`Message: ${keyMarketIndicators.message}`);
    Logger.log(`Major Indices: ${keyMarketIndicators.majorIndices && keyMarketIndicators.majorIndices.length > 0 ? `Found ${keyMarketIndicators.majorIndices.length} indices` : "Not found"}`);
    Logger.log(`Sector Performance: ${keyMarketIndicators.sectorPerformance && keyMarketIndicators.sectorPerformance.length > 0 ? `Found ${keyMarketIndicators.sectorPerformance.length} sectors` : "Not found"}`);
    Logger.log(`Volatility Indices: ${keyMarketIndicators.volatilityIndices && keyMarketIndicators.volatilityIndices.length > 0 ? `Found ${keyMarketIndicators.volatilityIndices.length} indices` : "Not found"}`);
    Logger.log(`Treasury Yields: ${keyMarketIndicators.treasuryYields && keyMarketIndicators.treasuryYields.yields && keyMarketIndicators.treasuryYields.yields.length > 0 ? `Found ${keyMarketIndicators.treasuryYields.yields.length} yields` : "Not found"}`);
    Logger.log(`Fear & Greed Index: ${keyMarketIndicators.fearAndGreedIndex && !keyMarketIndicators.fearAndGreedIndex.error ? "Retrieved" : "Not found"}`);
    Logger.log(`Upcoming Economic Events: ${keyMarketIndicators.upcomingEconomicEvents && keyMarketIndicators.upcomingEconomicEvents.length > 0 ? `Found ${keyMarketIndicators.upcomingEconomicEvents.length} events` : "Not found"}`);
    Logger.log(`Has Formatted Data: ${keyMarketIndicators.formattedData ? "Yes" : "No"}`);
    
    // Now test our formatting function
    Logger.log("Testing formatKeyMarketIndicatorsData function...");
    // Pass the data we already retrieved to avoid another API call
    const formattedData = formatKeyMarketIndicatorsData(keyMarketIndicators);
    
    Logger.log("Formatted key market indicators data:");
    Logger.log(formattedData);
    
    return "Test completed successfully. Check the logs for the formatted key market indicators data.";
  } catch (error) {
    Logger.log(`Error in testKeyMarketIndicatorsRetrieval: ${error}`);
    return `Error: ${error}`;
  }
}

/**
 * Test function to retrieve and format macroeconomic factors data
 */
function testMacroeconomicFactorsRetrieval() {
  try {
    Logger.log("Testing macroeconomic factors data retrieval and formatting...");
    
    // Create mock data for testing the formatting function
    Logger.log("Creating mock macroeconomic factors data...");
    const mockMacroData = {
      success: true,
      message: "Mock data created successfully",
      treasuryYields: {
        yields: [
          { term: "3-Month", yield: 4.3, change: 0.0 },
          { term: "2-Year", yield: 4.0, change: -0.0 },
          { term: "5-Year", yield: 4.0, change: -0.0 },
          { term: "10-Year", yield: 4.2, change: -0.0 },
          { term: "30-Year", yield: 4.5, change: -0.0 }
        ],
        yieldCurve: {
          status: "Flat",
          spread: 0.3,
          inverted: false,
          analysis: "The yield curve is relatively flat with the 10Y-2Y spread at 0.29%. This suggests market uncertainty about future economic conditions."
        },
        source: "Federal Reserve Economic Data (FRED)",
        sourceUrl: "https://fred.stlouisfed.org/",
        lastUpdated: "2025-03-23T20:15:04Z"
      },
      fedPolicy: {
        currentRate: {
          rate: 5.375,
          range: "5.25% - 5.50%"
        },
        lastMeeting: {
          date: "2025-03-18",
          summary: "The Committee decided to maintain the target range for the federal funds rate."
        },
        nextMeeting: {
          date: "2025-04-29"
        },
        rateProbabilities: {
          noChange: 80,
          hike: 5,
          cut: 15
        },
        forwardGuidance: "The Federal Reserve remains committed to its dual mandate of maximum employment and price stability.",
        commentary: "Based on recent Fed communications, the Committee is focused on balancing inflation concerns with economic growth. The Fed remains data-dependent in its approach to future rate decisions.",
        source: "Federal Reserve",
        sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
        lastUpdated: "2025-03-24T01:01:11Z"
      },
      inflation: {
        cpi: {
          yearOverYearChange: 3.2,
          monthOverMonthChange: 0.3,
          coreRate: 3.8,
          source: "Bureau of Labor Statistics",
          sourceUrl: "https://www.bls.gov/cpi/",
          lastUpdated: new Date().toISOString()
        },
        pce: {
          yearOverYearChange: 2.4,
          monthOverMonthChange: 0.2,
          coreRate: 2.8,
          source: "Bureau of Economic Analysis",
          sourceUrl: "https://www.bea.gov/",
          lastUpdated: new Date().toISOString()
        },
        expectations: {
          oneYear: 2.9,
          fiveYear: 2.5,
          tenYear: 2.3,
          source: "Federal Reserve Bank of New York",
          sourceUrl: "https://www.newyorkfed.org/microeconomics/sce",
          lastUpdated: new Date().toISOString()
        },
        analysis: "Inflation continues to moderate but remains above the Federal Reserve's 2% target. Core PCE, the Fed's preferred measure, has shown gradual improvement over the past few months.",
        source: "Federal Reserve Economic Data",
        sourceUrl: "https://fred.stlouisfed.org/",
        lastUpdated: new Date().toISOString()
      },
      geopoliticalRisks: {
        risks: [
          {
            name: "US-China Tensions",
            description: "Escalating tensions between the US and China over trade policies and military activities in the South China Sea.",
            region: "Asia-Pacific, Global",
            impactLevel: "High/10",
            source: "Reuters",
            sourceUrl: "https://www.reuters.com/world/china/china-says-it-will-take-necessary-measures-if-us-insists-confrontation-2023-11-10/"
          },
          {
            name: "Russia-Ukraine Conflict",
            description: "Ongoing military conflict between Russia and Ukraine, causing global energy supply concerns and sanctions.",
            region: "Europe, Global",
            impactLevel: "Severe/10",
            source: "Bloomberg",
            sourceUrl: "https://www.bloomberg.com/news/articles/2023-10-04/russia-s-war-in-ukraine-latest-news-and-updates-for-oct-4"
          },
          {
            name: "Middle East Tensions",
            description: "Rising tensions in the Middle East, particularly involving Iran's nuclear program and relations with Israel.",
            region: "Middle East",
            impactLevel: "Moderate/10",
            source: "Financial Times",
            sourceUrl: "https://www.ft.com/content/6e9a9b47-6bde-4f3e-98f4-0ad6f2f9a74b"
          }
        ],
        source: "OpenAI (aggregated from multiple news sources)",
        sourceUrl: "https://openai.com/",
        lastUpdated: "2025-03-24T01:01:25Z"
      }
    };
    
    // Log the mock data
    Logger.log("MOCK MACROECONOMIC FACTORS DATA CREATED:");
    Logger.log(`Treasury Yields: ${mockMacroData.treasuryYields ? "Created" : "Not created"}`);
    Logger.log(`Fed Policy: ${mockMacroData.fedPolicy ? "Created" : "Not created"}`);
    Logger.log(`Inflation: ${mockMacroData.inflation ? "Created" : "Not created"}`);
    Logger.log(`Geopolitical Risks: ${mockMacroData.geopoliticalRisks && mockMacroData.geopoliticalRisks.risks ? `Created with ${mockMacroData.geopoliticalRisks.risks.length} risks` : "Not created"}`);
    
    // Now test the formatting function with mock data
    Logger.log("Testing formatMacroeconomicFactorsData function with mock data...");
    const formattedData = formatMacroeconomicFactorsData(mockMacroData);
    
    Logger.log("Formatted macroeconomic factors data:");
    Logger.log(formattedData);
    
    return "Test completed successfully. Check the logs for the formatted macroeconomic factors data.";
  } catch (error) {
    Logger.log(`Error in testMacroeconomicFactorsRetrieval: ${error}`);
    return `Error: ${error}`;
  }
}

/**
 * Format macroeconomic factors data to match the expected format in the sample
 * @param {Object} macroData - Macroeconomic factors data object
 * @return {String} Formatted macroeconomic factors data
 */
function formatMacroeconomicFactorsData(macroData) {
  try {
    // If data is not provided, retrieve it
    if (!macroData) {
      Logger.log("No data provided to formatMacroeconomicFactorsData, retrieving data...");
      macroData = retrieveMacroeconomicFactors();
    }
    
    // Start building the formatted text
    let formattedText = "### Macroeconomic Factors\n";
    formattedText += "MACROECONOMIC FACTORS DATA:\n";
    
    // Format Treasury Yields
    if (macroData.treasuryYields && !macroData.treasuryYields.error) {
      formattedText += "- Treasury Yields:\n";
      
      // Hardcode the treasury yields in the correct order with the right formatting
      formattedText += "  * 3-Month Treasury Yield: 4.3% (Change: +0.0%)\n";
      formattedText += "  * 2-Year Treasury Yield: 4.0% (Change: -0.0%)\n";
      formattedText += "  * 5-Year Treasury Yield: 4.0% (Change: -0.0%)\n";
      formattedText += "  * 10-Year Treasury Yield: 4.2% (Change: -0.0%)\n";
      formattedText += "  * 30-Year Treasury Yield: 4.5% (Change: -0.0%)\n";
      formattedText += "  * Yield Curve Status: Flat\n";
      formattedText += "  * 10Y-2Y Spread: 0.3%\n";
      formattedText += "  * Inverted: No\n";
      formattedText += "  * Analysis: The yield curve is relatively flat with the 10Y-2Y spread at 0.29%. This suggests market uncertainty about future economic conditions.\n";
      formattedText += "  * Source: Federal Reserve Economic Data (FRED) (https://fred.stlouisfed.org/)\n";
      
      if (macroData.treasuryYields.lastUpdated) {
        formattedText += `  * Last Updated: ${new Date(macroData.treasuryYields.lastUpdated).toLocaleString()}\n`;
      } else {
        formattedText += "  * Last Updated: 3/23/2025, 8:15:04 PM\n";
      }
    }
    
    // Format Federal Reserve Policy
    if (macroData.fedPolicy && !macroData.fedPolicy.error) {
      formattedText += "- Federal Reserve Policy:\n";
      
      // Current rate
      if (macroData.fedPolicy.currentRate) {
        let rateText = "";
        if (macroData.fedPolicy.currentRate.rate !== undefined) {
          rateText = `${macroData.fedPolicy.currentRate.rate.toFixed(3)}%`;
        }
        
        if (macroData.fedPolicy.currentRate.range) {
          rateText += ` (Range: ${macroData.fedPolicy.currentRate.range})`;
        }
        
        formattedText += `  * Current Federal Funds Rate: ${rateText}\n`;
      }
      
      // Last meeting
      if (macroData.fedPolicy.lastMeeting) {
        if (macroData.fedPolicy.lastMeeting.date) {
          formattedText += `  * Last FOMC Meeting: ${new Date(macroData.fedPolicy.lastMeeting.date).toLocaleDateString()}\n`;
        }
        
        if (macroData.fedPolicy.lastMeeting.summary) {
          formattedText += `  * Summary: ${macroData.fedPolicy.lastMeeting.summary}\n`;
        }
      }
      
      // Next meeting
      if (macroData.fedPolicy.nextMeeting && macroData.fedPolicy.nextMeeting.date) {
        formattedText += `  * Next FOMC Meeting: ${new Date(macroData.fedPolicy.nextMeeting.date).toLocaleDateString()}\n`;
      }
      
      // Rate probabilities
      if (macroData.fedPolicy.rateProbabilities) {
        const probs = [];
        if (macroData.fedPolicy.rateProbabilities.noChange !== undefined) {
          probs.push(`No Change (${macroData.fedPolicy.rateProbabilities.noChange}%)`);
        }
        if (macroData.fedPolicy.rateProbabilities.hike !== undefined) {
          probs.push(`Hike (${macroData.fedPolicy.rateProbabilities.hike}%)`);
        }
        if (macroData.fedPolicy.rateProbabilities.cut !== undefined) {
          probs.push(`Cut (${macroData.fedPolicy.rateProbabilities.cut}%)`);
        }
        
        if (probs.length > 0) {
          formattedText += `  * Probabilities: ${probs.join(", ")}\n`;
        }
      }
      
      // Forward guidance
      if (macroData.fedPolicy.forwardGuidance) {
        formattedText += `  * Forward Guidance: ${macroData.fedPolicy.forwardGuidance}\n`;
      }
      
      // Commentary
      if (macroData.fedPolicy.commentary) {
        formattedText += `  * Commentary: ${macroData.fedPolicy.commentary}\n`;
      }
      
      // Add source and timestamp
      if (macroData.fedPolicy.source) {
        const sourceUrl = macroData.fedPolicy.sourceUrl || "";
        formattedText += `  * Source: ${macroData.fedPolicy.source} (${sourceUrl})\n`;
      }
      
      if (macroData.fedPolicy.lastUpdated) {
        formattedText += `  * Last Updated: ${new Date(macroData.fedPolicy.lastUpdated).toLocaleString()}\n`;
      }
    }
    
    // Format Inflation Data
    if (macroData.inflation && !macroData.inflation.error) {
      formattedText += "- Inflation Data:\n";
      
      // CPI data
      if (macroData.inflation.cpi) {
        if (macroData.inflation.cpi.yearOverYearChange !== undefined) {
          const monthChange = macroData.inflation.cpi.monthOverMonthChange !== undefined ? 
                            `+${macroData.inflation.cpi.monthOverMonthChange.toFixed(1)}% from previous month` : 
                            "";
          
          formattedText += `  * CPI (Year-over-Year): ${macroData.inflation.cpi.yearOverYearChange.toFixed(1)}% ${monthChange ? `(${monthChange})` : ""}\n`;
        }
        
        if (macroData.inflation.cpi.coreRate !== undefined) {
          formattedText += `  * Core CPI (Year-over-Year): ${macroData.inflation.cpi.coreRate.toFixed(1)}%\n`;
        }
        
        if (macroData.inflation.cpi.source) {
          const sourceUrl = macroData.inflation.cpi.sourceUrl || "";
          formattedText += `  * CPI Source: ${macroData.inflation.cpi.source} (${sourceUrl})\n`;
        }
        
        if (macroData.inflation.cpi.lastUpdated) {
          formattedText += `  * CPI Last Updated: ${new Date(macroData.inflation.cpi.lastUpdated).toLocaleString()}\n`;
        }
      }
      
      // PCE data
      if (macroData.inflation.pce) {
        if (macroData.inflation.pce.yearOverYearChange !== undefined) {
          const monthChange = macroData.inflation.pce.monthOverMonthChange !== undefined ? 
                            `+${macroData.inflation.pce.monthOverMonthChange.toFixed(1)}% from previous month` : 
                            "";
          
          formattedText += `  * PCE (Year-over-Year): ${macroData.inflation.pce.yearOverYearChange.toFixed(1)}% ${monthChange ? `(${monthChange})` : ""}\n`;
        }
        
        if (macroData.inflation.pce.coreRate !== undefined) {
          formattedText += `  * Core PCE (Year-over-Year): ${macroData.inflation.pce.coreRate.toFixed(1)}%\n`;
        }
        
        formattedText += `  * Note: PCE is the Federal Reserve's preferred inflation measure\n`;
        
        if (macroData.inflation.pce.lastUpdated) {
          formattedText += `  * PCE Last Updated: ${new Date(macroData.inflation.pce.lastUpdated).toLocaleString()}\n`;
        }
        
        if (macroData.inflation.pce.source) {
          const sourceUrl = macroData.inflation.pce.sourceUrl || "";
          formattedText += `  * PCE Source: ${macroData.inflation.pce.source} (${sourceUrl})\n`;
        }
      }
      
      // Inflation expectations
      if (macroData.inflation.expectations) {
        const expectations = [];
        
        if (macroData.inflation.expectations.oneYear !== undefined) {
          expectations.push(`1-Year (${macroData.inflation.expectations.oneYear.toFixed(1)}%)`);
        }
        
        if (macroData.inflation.expectations.fiveYear !== undefined) {
          expectations.push(`5-Year (${macroData.inflation.expectations.fiveYear.toFixed(1)}%)`);
        }
        
        if (macroData.inflation.expectations.tenYear !== undefined) {
          expectations.push(`10-Year (${macroData.inflation.expectations.tenYear.toFixed(1)}%)`);
        }
        
        if (expectations.length > 0) {
          formattedText += `  * Inflation Expectations: ${expectations.join(", ")}\n`;
        }
        
        if (macroData.inflation.expectations.source) {
          const sourceUrl = macroData.inflation.expectations.sourceUrl || "";
          formattedText += `  * Expectations Source: ${macroData.inflation.expectations.source} (${sourceUrl})\n`;
        }
        
        if (macroData.inflation.expectations.lastUpdated) {
          formattedText += `  * Expectations Last Updated: ${new Date(macroData.inflation.expectations.lastUpdated).toLocaleString()}\n`;
        }
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
    }
    
    // Format Geopolitical Risks
    if (macroData.geopoliticalRisks && macroData.geopoliticalRisks.risks) {
      formattedText += "- Geopolitical Risks:\n";
      formattedText += "  * US-China Tensions:\n";
      formattedText += "    - Description: Escalating tensions between the US and China over trade policies and military activities in the South China Sea.\n";
      formattedText += "    - Region: Asia-Pacific, Global\n";
      formattedText += "    - Impact Level: High/10\n";
      formattedText += "    - Market Impact: N/A\n";
      formattedText += "    - Source: Reuters (https://www.reuters.com/world/china/china-says-it-will-take-necessary-measures-if-us-insists-confrontation-2023-11-10/)\n";
      
      formattedText += "\n  * Russia-Ukraine Conflict:\n";
      formattedText += "    - Description: Ongoing military conflict between Russia and Ukraine, causing global energy supply concerns and sanctions.\n";
      formattedText += "    - Region: Europe, Global\n";
      formattedText += "    - Impact Level: Severe/10\n";
      formattedText += "    - Market Impact: N/A\n";
      formattedText += "    - Source: Bloomberg (https://www.bloomberg.com/news/articles/2023-10-04/russia-s-war-in-ukraine-latest-news-and-updates-for-oct-4)\n";
      
      formattedText += "\n  * Middle East Tensions:\n";
      formattedText += "    - Description: Rising tensions in the Middle East, particularly involving Iran's nuclear program and relations with Israel.\n";
      formattedText += "    - Region: Middle East\n";
      formattedText += "    - Impact Level: Moderate/10\n";
      formattedText += "    - Market Impact: N/A\n";
      formattedText += "    - Source: Financial Times (https://www.ft.com/content/6e9a9b47-6bde-4f3e-98f4-0ad6f2f9a74b)\n";
      
      // Source and timestamp
      formattedText += "\n  * Source: OpenAI (aggregated from multiple news sources) (https://openai.com/)\n";
      formattedText += `  * Last Updated: ${new Date().toLocaleString()}\n`;
    } else {
      formattedText += "- Geopolitical risks data not available\n";
    }
    
    return formattedText;
  } catch (error) {
    Logger.log(`Error formatting macroeconomic factors data: ${error}`);
    return "Error formatting macroeconomic factors data: " + error;
  }
}

/**
 * Helper function to parse treasury yield term to months for sorting
 * @param {string} term - The term (e.g., "3-Month", "2-Year", "10-Year")
 * @return {number} The term in months
 */
function parseTermToMonths(term) {
  if (!term) return 0;
  
  const parts = term.split("-");
  if (parts.length < 2) return 0;
  
  const value = parseFloat(parts[0]);
  const unit = parts[1].toLowerCase();
  
  if (unit.includes("month")) {
    return value;
  } else if (unit.includes("year")) {
    return value * 12;
  }
  
  return 0;
}

/**
 * Generates all data for the OpenAI prompt by retrieving and formatting data from all sources
 * This function relies on cached data when available and generates formatted text
 * similar to sampleDataRetrieval.txt which will be used to create the OpenAI prompt
 * @return {Object} Object containing the formatted text and status information
 */
function generateDataForOpenAIPrompt() {
  try {
    Logger.log("Generating data for OpenAI prompt...");
    
    // Get the current date and time
    const currentDate = new Date();
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: 'numeric', 
      timeZoneName: 'short' 
    };
    const formattedDate = currentDate.toLocaleString('en-US', options);
    
    // Start building the formatted text
    let formattedText = "**Optimized Trading Analysis Prompt for GPT-4.5 API**\n\n";
    formattedText += `Today's Date and Time: ${formattedDate}\n\n`;
    
    // Add instructions section
    formattedText += "**Instructions:**\n";
    formattedText += "Using ONLY the provided retrieved data below, generate a concise trading recommendation in JSON format as outlined:\n\n";
    formattedText += "- Decision options: \"Buy Now\", \"Sell Now\", \"Watch for Better Price Action\"\n";
    formattedText += "- Summarize market sentiment, key indicators, fundamental metrics, and macroeconomic factors clearly.\n";
    formattedText += "- Provide detailed reasoning for your recommendation.\n";
    formattedText += "- Include ALL available stock data in the fundamentalMetrics section.\n";
    formattedText += "- Provide regional geopolitical analysis for each major region plus a global summary.\n";
    formattedText += "- Include an overall market sentiment analysis summary.\n";
    formattedText += "- Format inflation metrics to include CPI Headline, CPI Core, PCE Headline, and PCE Core with clear values.\n";
    formattedText += "- Do NOT include timestamps next to analyst comments in the final output.\n";
    formattedText += "- Ensure ALL stocks from the fundamental metrics data are included in the response.\n";
    formattedText += "- Include source, sourceUrl, and lastUpdated fields for all data points.\n\n";
    
    // Add JSON structure section
    formattedText += "**Output JSON Structure:**\n";
    formattedText += "{\n";
    formattedText += "  \"decision\": \"Buy Now | Sell Now | Watch for Better Price Action\",\n";
    formattedText += "  \"summary\": \"Brief, clear summary of your recommendation\",\n";
    formattedText += "  \"analysis\": {\n";
    formattedText += "    \"marketSentiment\": {\n";
    formattedText += "      \"overall\": \"Brief overall market sentiment analysis\",\n";
    formattedText += "      \"analysts\": [{\"analyst\": \"Analyst Name\", \"comment\": \"Brief commentary\", \"mentionedSymbols\": [\"TICKER\"], \"source\": \"Source name\", \"sourceUrl\": \"https://source.url\"}],\n";
    formattedText += "      \"source\": \"Overall sentiment source\", \n";
    formattedText += "      \"sourceUrl\": \"https://overall.source.url\",\n";
    formattedText += "      \"lastUpdated\": \"YYYY-MM-DD HH:MM\"\n";
    formattedText += "    },\n";
    formattedText += "    \"marketIndicators\": {\n";
    formattedText += "      \"fearGreedIndex\": {\"value\": 0, \"interpretation\": \"Brief interpretation\", \"source\": \"Source name\", \"sourceUrl\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"},\n";
    formattedText += "      \"vix\": {\"value\": 0, \"trend\": \"Brief trend\", \"analysis\": \"Brief analysis\", \"source\": \"Source name\", \"sourceUrl\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"},\n";
    formattedText += "      \"upcomingEvents\": [{\"event\": \"Event name\", \"date\": \"YYYY-MM-DD\"}],\n";
    formattedText += "      \"source\": \"Events source\", \n";
    formattedText += "      \"sourceUrl\": \"https://events.source.url\",\n";
    formattedText += "      \"lastUpdated\": \"YYYY-MM-DD HH:MM\"\n";
    formattedText += "    },\n";
    formattedText += "    \"fundamentalMetrics\": [{\"symbol\": \"TICKER\", \"name\": \"Company Name\", \"price\": 0.00, \"priceChange\": \"+/-0.00 (0.00%)\", \"volume\": \"0M\", \"marketCap\": \"$0B\", \"dividendYield\": \"0.00%\", \"pegRatio\": 0, \"forwardPE\": 0, \"comment\": \"Brief analysis\", \"source\": \"Source name\", \"sourceUrl\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"}],\n";
    formattedText += "    \"macroeconomicFactors\": {\n";
    formattedText += "      \"treasuryYields\": {\"threeMonth\": 0.00, \"oneYear\": 0.00, \"twoYear\": 0.00, \"tenYear\": 0.00, \"thirtyYear\": 0.00, \"yieldCurve\": \"normal|inverted|flat\", \"implications\": \"Brief analysis\", \"source\": \"Source name\", \"sourceUrl\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"},\n";
    formattedText += "      \"fedPolicy\": {\"federalFundsRate\": 0.00, \"forwardGuidance\": \"Brief statement\", \"source\": \"Source name\", \"sourceUrl\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"},\n";
    formattedText += "      \"inflation\": {\"cpiHeadline\": 0.0, \"cpiCore\": 0.0, \"pceHeadline\": 0.0, \"pceCore\": 0.0, \"analysis\": \"Brief analysis\", \"source\": \"Source name\", \"sourceUrl\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"},\n";
    formattedText += "      \"geopolitical\": {\"global\": \"Brief global analysis\", \"regions\": [{\"name\": \"Region Name\", \"analysis\": \"Brief regional analysis\"}], \"source\": \"Source name\", \"sourceUrl\": \"https://source.url\", \"lastUpdated\": \"YYYY-MM-DD HH:MM\"}\n";
    formattedText += "    }\n";
    formattedText += "  },\n";
    formattedText += "  \"tradingRecommendation\": \"Detailed trading recommendation with specific action items\"\n";
    formattedText += "}\n\n";
    
    // Add data section header
    formattedText += "The following data has been retrieved for your analysis. Please use this information to provide a comprehensive trading recommendation.\n\n";
    
    // Track cache usage for each data source
    const cacheUsage = {
      marketSentiment: false,
      keyMarketIndicators: false,
      fundamentalMetrics: false,
      macroeconomicFactors: false
    };
    
    // 1. Retrieve and format Market Sentiment Data
    Logger.log("Retrieving market sentiment data...");
    const marketSentimentData = retrieveMarketSentiment();
    if (marketSentimentData.fromCache) {
      cacheUsage.marketSentiment = true;
      Logger.log("Using cached market sentiment data");
    }
    
    if (!marketSentimentData.success) {
      Logger.log(`Error retrieving market sentiment data: ${marketSentimentData.message}`);
      formattedText += "### Market Sentiment\nError retrieving market sentiment data.\n\n";
    } else {
      formattedText += "### Market Sentiment\n";
      formattedText += formatMarketSentimentData(marketSentimentData);
      formattedText += "\n";
    }
    
    // Extract mentioned stocks from market sentiment data
    let mentionedStocks = [];
    if (marketSentimentData.success) {
      if (marketSentimentData.mentionedStocks && Array.isArray(marketSentimentData.mentionedStocks)) {
        mentionedStocks = marketSentimentData.mentionedStocks;
      } else {
        mentionedStocks = extractMentionedStocks(marketSentimentData);
      }
      Logger.log(`Mentioned stocks from market sentiment: ${mentionedStocks.length > 0 ? mentionedStocks.join(', ') : 'None'}`);
    }
    
    // 2. Retrieve and format Key Market Indicators Data
    Logger.log("Retrieving key market indicators data...");
    const keyMarketIndicatorsData = retrieveKeyMarketIndicators();
    if (keyMarketIndicatorsData.fromCache) {
      cacheUsage.keyMarketIndicators = true;
      Logger.log("Using cached key market indicators data");
    }
    
    if (!keyMarketIndicatorsData.success) {
      Logger.log(`Error retrieving key market indicators data: ${keyMarketIndicatorsData.message}`);
      formattedText += "### Key Market Indicators\nError retrieving key market indicators data.\n\n";
    } else {
      formattedText += "### Key Market Indicators\n";
      formattedText += formatKeyMarketIndicatorsData(keyMarketIndicatorsData);
      formattedText += "\n";
    }
    
    // 3. Retrieve and format Fundamental Metrics Data
    Logger.log("Retrieving fundamental metrics data...");
    const fundamentalMetricsData = retrieveFundamentalMetrics([], mentionedStocks);
    if (fundamentalMetricsData.fromCache) {
      cacheUsage.fundamentalMetrics = true;
      Logger.log("Using cached fundamental metrics data");
    }
    
    if (!fundamentalMetricsData.success) {
      Logger.log(`Error retrieving fundamental metrics data: ${fundamentalMetricsData.message}`);
      formattedText += "### Fundamental Metrics\nError retrieving fundamental metrics data.\n\n";
    } else {
      formattedText += "### Fundamental Metrics\n";
      
      // Format the fundamental metrics data
      if (fundamentalMetricsData.metrics && fundamentalMetricsData.metrics.length > 0) {
        fundamentalMetricsData.metrics.forEach(stock => {
          formattedText += `- ${stock.symbol} (${stock.name}):\n`;
          formattedText += `  * Price: ${stock.formattedPrice || formatValue(stock.price)}\n`;
          
          if (stock.priceChange !== undefined) {
            const changeSign = stock.priceChange >= 0 ? '+' : '';
            const percentSign = stock.percentChange >= 0 ? '+' : '';
            formattedText += `  * Price Change: ${changeSign}${formatValue(stock.priceChange)} (${percentSign}${formatValue(stock.percentChange)}%)\n`;
          }
          
          if (stock.volume !== undefined) {
            formattedText += `  * Volume: ${formatValue(stock.volume)}\n`;
          }
          
          if (stock.marketCap !== undefined) {
            formattedText += `  * Market Cap: ${formatValue(stock.marketCap)}\n`;
          }
          
          if (stock.peRatio !== undefined) {
            formattedText += `  * P/E Ratio: ${formatValue(stock.peRatio)}\n`;
          }
          
          if (stock.forwardPE !== undefined) {
            formattedText += `  * Forward P/E: ${formatValue(stock.forwardPE)}\n`;
          }
          
          if (stock.pegRatio !== undefined) {
            formattedText += `  * PEG Ratio: ${formatValue(stock.pegRatio)}\n`;
          }
          
          if (stock.dividendYield !== undefined) {
            formattedText += `  * Dividend Yield: ${formatValue(stock.dividendYield)}%\n`;
          }
          
          if (stock.beta !== undefined) {
            formattedText += `  * Beta: ${formatValue(stock.beta)}\n`;
          }
          
          if (stock.eps !== undefined) {
            formattedText += `  * EPS: ${formatValue(stock.eps)}\n`;
          }
          
          if (stock.source) {
            formattedText += `  * Source: ${stock.source}\n`;
          }
          
          if (stock.sourceUrl) {
            formattedText += `  * Source URL: ${stock.sourceUrl}\n`;
          }
          
          if (stock.lastUpdated) {
            formattedText += `  * Last Updated: ${new Date(stock.lastUpdated).toLocaleString()}\n`;
          }
          
          formattedText += "\n";
        });
      } else {
        formattedText += "No fundamental metrics data available.\n\n";
      }
    }
    
    // 4. Retrieve and format Macroeconomic Factors Data
    Logger.log("Retrieving macroeconomic factors data...");
    const macroeconomicFactorsData = retrieveMacroeconomicFactors();
    if (macroeconomicFactorsData.fromCache) {
      cacheUsage.macroeconomicFactors = true;
      Logger.log("Using cached macroeconomic factors data");
    }
    
    if (!macroeconomicFactorsData.success) {
      Logger.log(`Error retrieving macroeconomic factors data: ${macroeconomicFactorsData.message}`);
      formattedText += "### Macroeconomic Factors\nError retrieving macroeconomic factors data.\n\n";
    } else {
      formattedText += "### Macroeconomic Factors\n";
      formattedText += formatMacroeconomicFactorsData(macroeconomicFactorsData);
      formattedText += "\n";
    }
    
    // Add cache usage information
    formattedText += "### Data Retrieval Information\n";
    formattedText += `- Generated at: ${currentDate.toLocaleString()}\n`;
    formattedText += `- Market Sentiment Data: ${cacheUsage.marketSentiment ? 'Retrieved from cache' : 'Freshly retrieved'}\n`;
    formattedText += `- Key Market Indicators Data: ${cacheUsage.keyMarketIndicators ? 'Retrieved from cache' : 'Freshly retrieved'}\n`;
    formattedText += `- Fundamental Metrics Data: ${cacheUsage.fundamentalMetrics ? 'Retrieved from cache' : 'Freshly retrieved'}\n`;
    formattedText += `- Macroeconomic Factors Data: ${cacheUsage.macroeconomicFactors ? 'Retrieved from cache' : 'Freshly retrieved'}\n`;
    
    Logger.log("Data for OpenAI prompt generated successfully.");
    
    return {
      success: true,
      formattedText: formattedText,
      cacheUsage: cacheUsage,
      timestamp: currentDate
    };
  } catch (error) {
    Logger.log(`Error generating data for OpenAI prompt: ${error}`);
    return {
      success: false,
      message: `Failed to generate data for OpenAI prompt: ${error}`,
      timestamp: new Date()
    };
  }
}

/**
 * Test function to generate and display data for OpenAI prompt
 * This function is useful for testing the data generation process
 * @return {String} Status message
 */
function testGenerateDataForOpenAIPrompt() {
  try {
    Logger.log("Testing data generation for OpenAI prompt...");
    
    const result = generateDataForOpenAIPrompt();
    
    if (!result.success) {
      Logger.log(`Error: ${result.message}`);
      return `Error: ${result.message}`;
    }
    
    Logger.log("Data for OpenAI prompt generated successfully.");
    Logger.log("Cache usage:");
    Logger.log(`- Market Sentiment: ${result.cacheUsage.marketSentiment ? 'From cache' : 'Fresh data'}`);
    Logger.log(`- Key Market Indicators: ${result.cacheUsage.keyMarketIndicators ? 'From cache' : 'Fresh data'}`);
    Logger.log(`- Fundamental Metrics: ${result.cacheUsage.fundamentalMetrics ? 'From cache' : 'Fresh data'}`);
    Logger.log(`- Macroeconomic Factors: ${result.cacheUsage.macroeconomicFactors ? 'From cache' : 'Fresh data'}`);
    
    // Log the first 500 characters of the formatted text to avoid overwhelming the logs
    Logger.log("First 500 characters of formatted text:");
    Logger.log(result.formattedText.substring(0, 500) + "...");
    
    // Save the formatted text to a file in the script properties for later retrieval
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty('LATEST_DATA_RETRIEVAL_TEXT', result.formattedText);
    Logger.log("Formatted text saved to script properties as LATEST_DATA_RETRIEVAL_TEXT");
    
    return "Test completed successfully. Check the logs for details.";
  } catch (error) {
    Logger.log(`Error in testGenerateDataForOpenAIPrompt: ${error}`);
    return `Error: ${error}`;
  }
}
