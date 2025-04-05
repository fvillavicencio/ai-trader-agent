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
          
          // Add each event (limit to 5 to avoid too much text)
          const eventsToShow = sortedEvents.slice(0, 5);
          
          // Log the events to show for debugging
          Logger.log(`Number of events to show: ${eventsToShow.length}`);
          for (const event of eventsToShow) {
            Logger.log(`Event: ${JSON.stringify(event)}`);
            // Format the event with all available information
            formattedText += `  * ${event.date} ${event.time}: ${event.event} (${event.country})\n`;
            formattedText += `    * Actual: ${event.actual}\n`;
            formattedText += `    * Forecast: ${event.forecast}\n`;
            formattedText += `    * Previous: ${event.previous}\n`;
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
        formattedText += formatFundamentalMetricsData(fundamentalMetricsData);
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
    const allSymbols = [...new Set([...defaultSymbols, ...mentionedStocks])];
    const fundamentalMetricsData = retrieveFundamentalMetrics(allSymbols);
    
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
  
  if (isNaN(value)) {
    return value.toString();
  }
  
  const numValue = parseFloat(value);
  if (fixedDecimals) {
    return numValue.toFixed(decimals);
  }
  
  return numValue.toString();
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
    if (macroData.fedPolicy) {
      formattedText += "**Federal Reserve Policy:**\n";
      formattedText += `- Current Rate: ${formatValue(macroData.fedPolicy.federalFundsRate)}%\n`;
      formattedText += `- Next Meeting: ${formatValue(macroData.fedPolicy.nextMeetingDate) || 'N/A'}\n`;
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
      formattedText += `- Source: ${formatValue(macroData.inflation.source) || 'N/A'} (${formatValue(macroData.inflation.sourceUrl) || 'N/A'})\n`;
      formattedText += `- Last Updated: ${formatValue(macroData.inflation.timestamp) || 'N/A'}\n\n`;
    }
    
    // Format geopolitical risks
    if (macroData.geopoliticalRisks && Array.isArray(macroData.geopoliticalRisks)) {
      formattedText += "**Geopolitical Risks:**\n";
      
      // Sort risks by impact level (descending)
      const sortedRisks = [...macroData.geopoliticalRisks].sort((a, b) => {
        if (a.impactLevel === undefined || a.impactLevel === null) return 1;
        if (b.impactLevel === undefined || b.impactLevel === null) return -1;
        return b.impactLevel - a.impactLevel;
      });
      
      for (const risk of sortedRisks) {
        formattedText += `* ${formatValue(risk.name) || 'Unknown Risk'}: ${formatValue(risk.description) || 'No description'}\n`;
        formattedText += `  * Region: ${formatValue(risk.region) || 'Unknown Region'}\n`;
        formattedText += `  * Impact Level: ${formatValue(risk.impactLevel) || 0}/10\n`;
        formattedText += `  * Source: ${formatValue(risk.source) || 'N/A'} (${formatValue(risk.sourceUrl) || 'N/A'})\n`;
        formattedText += `  * Last Updated: ${formatValue(risk.timestamp) || 'N/A'}\n\n`;
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
      if (metrics.beta !== null) output += `  * Beta: ${formatValue(metrics.beta)}\n`;
      
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
  
  if (isNaN(value)) {
    return value.toString();
  }
  
  if (fixedDecimals) {
    return parseFloat(value).toFixed(decimals);
  }
  
  return parseFloat(value).toString();
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
    const magnificentSeven = ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"];
    const otherStocks = Object.keys(metricsObj).filter(
      symbol => !majorIndices.includes(symbol) && !magnificentSeven.includes(symbol)
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
    
    // Magnificent Seven
    if (magnificentSeven.length > 0) {
      formattedText += "**Magnificent Seven:**\n";
      magnificentSeven.forEach(symbol => {
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


