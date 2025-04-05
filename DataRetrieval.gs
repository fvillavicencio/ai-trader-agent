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
  // Define the symbols to test
  const symbols = [
    // Major Indices
    "SPY", "QQQ", "IWM", "DIA",
    // Magnificent Seven
    "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA",
    // Other stocks
    "XOM", "CVX", "BA", "CAT", "PG", "KO", "TGT", "WMT"
  ];
  
  // Helper functions for formatting
  function formatMarketCap(marketCap) {
    if (!marketCap) return "N/A";
    if (marketCap >= 1e12) return "$" + (marketCap / 1e12).toFixed(2) + "T";
    if (marketCap >= 1e9) return "$" + (marketCap / 1e9).toFixed(2) + "B";
    if (marketCap >= 1e6) return "$" + (marketCap / 1e6).toFixed(2) + "M";
    return "$" + marketCap.toFixed(2);
  }
  
  function formatVolume(volume) {
    if (!volume) return "N/A";
    if (volume >= 1e9) return (volume / 1e9).toFixed(2) + "B";
    if (volume >= 1e6) return (volume / 1e6).toFixed(2) + "M";
    if (volume >= 1e3) return (volume / 1e3).toFixed(2) + "K";
    return volume.toString();
  }
  
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
  
  // Format the output
  let output = "## Stock Data for Debugging\n\n";
  
  // Major Indices
  output += "### Major Indices\n";
  ["SPY", "QQQ", "IWM", "DIA"].forEach(symbol => {
    // Create sample data for each symbol
    const sampleData = {
      symbol: symbol,
      // Use sample data directly
      price: symbol === "SPY" ? 480.75 : 
             symbol === "QQQ" ? 430.45 : 
             symbol === "IWM" ? 205.30 : 
             symbol === "DIA" ? 385.20 : 0,
      priceChange: symbol === "SPY" ? 1.62 : 
                  symbol === "QQQ" ? 2.15 : 
                  symbol === "IWM" ? -0.75 : 
                  symbol === "DIA" ? 0.95 : 0,
      changesPercentage: symbol === "SPY" ? 0.34 : 
                        symbol === "QQQ" ? 0.50 : 
                        symbol === "IWM" ? -0.36 : 
                        symbol === "DIA" ? 0.25 : 0,
      pegRatio: null,
      forwardPE: symbol === "SPY" ? 20.1 : 
                symbol === "QQQ" ? 25.6 : 
                symbol === "IWM" ? 18.9 : 
                symbol === "DIA" ? 19.5 : 0,
      priceToBook: symbol === "SPY" ? 4.2 : 
                  symbol === "QQQ" ? 6.8 : 
                  symbol === "IWM" ? 2.2 : 
                  symbol === "DIA" ? 4.0 : 0,
      priceToSales: symbol === "SPY" ? 2.8 : 
                   symbol === "QQQ" ? 4.5 : 
                   symbol === "IWM" ? 1.4 : 
                   symbol === "DIA" ? 2.5 : 0,
      debtToEquity: null,
      returnOnEquity: null,
      beta: symbol === "SPY" ? 1.0 : 
           symbol === "QQQ" ? 1.2 : 
           symbol === "IWM" ? 1.3 : 
           symbol === "DIA" ? 0.9 : 0,
      marketCap: null, // ETF doesn't have market cap
      volume: symbol === "SPY" ? 75000000 : 
             symbol === "QQQ" ? 45000000 : 
             symbol === "IWM" ? 25000000 : 
             symbol === "DIA" ? 3500000 : 0,
      industry: "Index ETF",
      sector: "Financial Services",
      company: symbol === "SPY" ? "SPDR S&P 500 ETF Trust" : 
              symbol === "QQQ" ? "Invesco QQQ Trust" : 
              symbol === "IWM" ? "iShares Russell 2000 ETF" : 
              symbol === "DIA" ? "SPDR Dow Jones Industrial Average ETF" : ""
    };
    
    // Format the stock data
    output += `* ${symbol} (${sampleData.company}): $${formatValue(sampleData.price, true)} (${sampleData.priceChange >= 0 ? '+' : ''}${formatValue(sampleData.priceChange, true)}, ${sampleData.changesPercentage >= 0 ? '+' : ''}${formatValue(sampleData.changesPercentage, true)}%)\n`;
    output += `  * Sector: ${sampleData.sector}\n`;
    output += `  * Industry: ${sampleData.industry}\n`;
    
    // Add market cap if available
    if (sampleData.marketCap) {
      const formattedMarketCap = formatMarketCap(sampleData.marketCap);
      output += `  * Market Cap: ${formattedMarketCap}\n`;
    }
    
    // Add volume
    const formattedVolume = formatVolume(sampleData.volume);
    output += `  * Volume: ${formattedVolume}\n`;
    
    // Add metrics
    if (sampleData.pegRatio !== null) output += `  * PEG Ratio: ${formatValue(sampleData.pegRatio)}\n`;
    if (sampleData.forwardPE !== null) output += `  * Forward P/E: ${formatValue(sampleData.forwardPE)}\n`;
    if (sampleData.priceToBook !== null) output += `  * Price/Book: ${formatValue(sampleData.priceToBook)}\n`;
    if (sampleData.priceToSales !== null) output += `  * Price/Sales: ${formatValue(sampleData.priceToSales)}\n`;
    if (sampleData.debtToEquity !== null) output += `  * Debt/Equity: ${formatValue(sampleData.debtToEquity)}\n`;
    if (sampleData.returnOnEquity !== null) output += `  * Return on Equity: ${formatValue(sampleData.returnOnEquity)}%\n`;
    if (sampleData.beta !== null) output += `  * Beta: ${formatValue(sampleData.beta)}\n`;
    
    output += "\n";
  });
  
  // Magnificent Seven
  output += "### Magnificent Seven\n";
  ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"].forEach(symbol => {
    // Create sample data for each symbol
    const sampleData = {
      symbol: symbol,
      price: symbol === "AAPL" ? 175.50 : 
             symbol === "MSFT" ? 410.30 : 
             symbol === "GOOGL" ? 142.75 : 
             symbol === "AMZN" ? 178.25 : 
             symbol === "META" ? 485.60 : 
             symbol === "TSLA" ? 175.30 : 
             symbol === "NVDA" ? 820.75 : 0,
      priceChange: symbol === "AAPL" ? 0.85 : 
                  symbol === "MSFT" ? 2.15 : 
                  symbol === "GOOGL" ? 0.65 : 
                  symbol === "AMZN" ? 1.20 : 
                  symbol === "META" ? 3.25 : 
                  symbol === "TSLA" ? -2.15 : 
                  symbol === "NVDA" ? 15.30 : 0,
      changesPercentage: symbol === "AAPL" ? 0.49 : 
                        symbol === "MSFT" ? 0.53 : 
                        symbol === "GOOGL" ? 0.46 : 
                        symbol === "AMZN" ? 0.68 : 
                        symbol === "META" ? 0.67 : 
                        symbol === "TSLA" ? -1.21 : 
                        symbol === "NVDA" ? 1.90 : 0,
      pegRatio: symbol === "AAPL" ? 2.8 : 
               symbol === "MSFT" ? 2.2 : 
               symbol === "GOOGL" ? 1.5 : 
               symbol === "AMZN" ? 1.8 : 
               symbol === "META" ? 1.1 : 
               symbol === "TSLA" ? 5.8 : 
               symbol === "NVDA" ? 0.9 : 0,
      forwardPE: symbol === "AAPL" ? 28.5 : 
                symbol === "MSFT" ? 32.1 : 
                symbol === "GOOGL" ? 21.8 : 
                symbol === "AMZN" ? 42.5 : 
                symbol === "META" ? 23.5 : 
                symbol === "TSLA" ? 62.3 : 
                symbol === "NVDA" ? 32.8 : 0,
      priceToBook: symbol === "AAPL" ? 35.2 : 
                  symbol === "MSFT" ? 12.8 : 
                  symbol === "GOOGL" ? 6.1 : 
                  symbol === "AMZN" ? 8.9 : 
                  symbol === "META" ? 6.8 : 
                  symbol === "TSLA" ? 12.5 : 
                  symbol === "NVDA" ? 38.5 : 0,
      priceToSales: symbol === "AAPL" ? 7.5 : 
                   symbol === "MSFT" ? 12.2 : 
                   symbol === "GOOGL" ? 5.8 : 
                   symbol === "AMZN" ? 2.7 : 
                   symbol === "META" ? 7.2 : 
                   symbol === "TSLA" ? 8.1 : 
                   symbol === "NVDA" ? 25.6 : 0,
      debtToEquity: symbol === "AAPL" ? 1.5 : 
                   symbol === "MSFT" ? 0.4 : 
                   symbol === "GOOGL" ? 0.1 : 
                   symbol === "AMZN" ? 0.6 : 
                   symbol === "META" ? 0.3 : 
                   symbol === "TSLA" ? 0.2 : 
                   symbol === "NVDA" ? 0.4 : 0,
      returnOnEquity: symbol === "AAPL" ? 160.0 : 
                     symbol === "MSFT" ? 42.5 : 
                     symbol === "GOOGL" ? 28.5 : 
                     symbol === "AMZN" ? 18.2 : 
                     symbol === "META" ? 25.6 : 
                     symbol === "TSLA" ? 15.8 : 
                     symbol === "NVDA" ? 62.5 : 0,
      beta: symbol === "AAPL" ? 1.3 : 
           symbol === "MSFT" ? 0.9 : 
           symbol === "GOOGL" ? 1.1 : 
           symbol === "AMZN" ? 1.2 : 
           symbol === "META" ? 1.4 : 
           symbol === "TSLA" ? 2.0 : 
           symbol === "NVDA" ? 1.7 : 0,
      marketCap: symbol === "AAPL" ? 2750000000000 : 
                symbol === "MSFT" ? 3050000000000 : 
                symbol === "GOOGL" ? 1800000000000 : 
                symbol === "AMZN" ? 1850000000000 : 
                symbol === "META" ? 1250000000000 : 
                symbol === "TSLA" ? 550000000000 : 
                symbol === "NVDA" ? 2020000000000 : 0,
      volume: symbol === "AAPL" ? 65000000 : 
             symbol === "MSFT" ? 25000000 : 
             symbol === "GOOGL" ? 30000000 : 
             symbol === "AMZN" ? 35000000 : 
             symbol === "META" ? 20000000 : 
             symbol === "TSLA" ? 125000000 : 
             symbol === "NVDA" ? 45000000 : 0,
      industry: symbol === "AAPL" ? "Consumer Electronics" : 
               symbol === "MSFT" ? "Software—Infrastructure" : 
               symbol === "GOOGL" ? "Internet Content & Information" : 
               symbol === "AMZN" ? "Internet Retail" : 
               symbol === "META" ? "Internet Content & Information" : 
               symbol === "TSLA" ? "Auto Manufacturers" : 
               symbol === "NVDA" ? "Semiconductors" : "",
      sector: symbol === "AAPL" ? "Technology" : 
             symbol === "MSFT" ? "Technology" : 
             symbol === "GOOGL" ? "Communication Services" : 
             symbol === "AMZN" ? "Consumer Cyclical" : 
             symbol === "META" ? "Communication Services" : 
             symbol === "TSLA" ? "Consumer Cyclical" : 
             symbol === "NVDA" ? "Technology" : "",
      company: symbol === "AAPL" ? "Apple Inc." : 
              symbol === "MSFT" ? "Microsoft Corporation" : 
              symbol === "GOOGL" ? "Alphabet Inc." : 
              symbol === "AMZN" ? "Amazon.com, Inc." : 
              symbol === "META" ? "Meta Platforms, Inc." : 
              symbol === "TSLA" ? "Tesla, Inc." : 
              symbol === "NVDA" ? "NVIDIA Corporation" : ""
    };
    
    // Format the stock data
    output += `* ${symbol} (${sampleData.company}): $${formatValue(sampleData.price, true)} (${sampleData.priceChange >= 0 ? '+' : ''}${formatValue(sampleData.priceChange, true)}, ${sampleData.changesPercentage >= 0 ? '+' : ''}${formatValue(sampleData.changesPercentage, true)}%)\n`;
    output += `  * Sector: ${sampleData.sector}\n`;
    output += `  * Industry: ${sampleData.industry}\n`;
    
    // Add market cap
    const formattedMarketCap = formatMarketCap(sampleData.marketCap);
    output += `  * Market Cap: ${formattedMarketCap}\n`;
    
    // Add volume
    const formattedVolume = formatVolume(sampleData.volume);
    output += `  * Volume: ${formattedVolume}\n`;
    
    // Add metrics
    if (sampleData.pegRatio !== null) output += `  * PEG Ratio: ${formatValue(sampleData.pegRatio)}\n`;
    if (sampleData.forwardPE !== null) output += `  * Forward P/E: ${formatValue(sampleData.forwardPE)}\n`;
    if (sampleData.priceToBook !== null) output += `  * Price/Book: ${formatValue(sampleData.priceToBook)}\n`;
    if (sampleData.priceToSales !== null) output += `  * Price/Sales: ${formatValue(sampleData.priceToSales)}\n`;
    if (sampleData.debtToEquity !== null) output += `  * Debt/Equity: ${formatValue(sampleData.debtToEquity)}\n`;
    if (sampleData.returnOnEquity !== null) output += `  * Return on Equity: ${formatValue(sampleData.returnOnEquity)}%\n`;
    if (sampleData.beta !== null) output += `  * Beta: ${formatValue(sampleData.beta)}\n`;
    
    output += "\n";
  });
  
  // Other stocks - just a few examples
  output += "### Other Stocks\n";
  ["XOM", "CVX", "BA", "CAT", "PG"].forEach(symbol => {
    // Create sample data for each symbol
    const sampleData = {
      symbol: symbol,
      price: symbol === "XOM" ? 115.25 : 
             symbol === "CVX" ? 155.80 : 
             symbol === "BA" ? 185.45 : 
             symbol === "CAT" ? 345.20 : 
             symbol === "PG" ? 165.30 : 0,
      priceChange: symbol === "XOM" ? -0.45 : 
                  symbol === "CVX" ? 0.35 : 
                  symbol === "BA" ? -1.25 : 
                  symbol === "CAT" ? 2.15 : 
                  symbol === "PG" ? 0.45 : 0,
      changesPercentage: symbol === "XOM" ? -0.39 : 
                        symbol === "CVX" ? 0.23 : 
                        symbol === "BA" ? -0.67 : 
                        symbol === "CAT" ? 0.63 : 
                        symbol === "PG" ? 0.27 : 0,
      pegRatio: symbol === "XOM" ? 1.2 : 
               symbol === "CVX" ? 1.4 : 
               symbol === "BA" ? null : 
               symbol === "CAT" ? 1.8 : 
               symbol === "PG" ? 3.2 : 0,
      forwardPE: symbol === "XOM" ? 12.5 : 
                symbol === "CVX" ? 13.2 : 
                symbol === "BA" ? 42.5 : 
                symbol === "CAT" ? 16.8 : 
                symbol === "PG" ? 24.5 : 0,
      priceToBook: symbol === "XOM" ? 2.1 : 
                  symbol === "CVX" ? 1.9 : 
                  symbol === "BA" ? 12.8 : 
                  symbol === "CAT" ? 8.2 : 
                  symbol === "PG" ? 7.8 : 0,
      priceToSales: symbol === "XOM" ? 1.2 : 
                   symbol === "CVX" ? 1.4 : 
                   symbol === "BA" ? 1.8 : 
                   symbol === "CAT" ? 2.3 : 
                   symbol === "PG" ? 4.8 : 0,
      debtToEquity: symbol === "XOM" ? 0.3 : 
                   symbol === "CVX" ? 0.2 : 
                   symbol === "BA" ? 5.2 : 
                   symbol === "CAT" ? 1.8 : 
                   symbol === "PG" ? 0.5 : 0,
      returnOnEquity: symbol === "XOM" ? 28.5 : 
                     symbol === "CVX" ? 22.1 : 
                     symbol === "BA" ? -45.2 : 
                     symbol === "CAT" ? 42.5 : 
                     symbol === "PG" ? 28.5 : 0,
      beta: symbol === "XOM" ? 1.1 : 
           symbol === "CVX" ? 1.0 : 
           symbol === "BA" ? 1.5 : 
           symbol === "CAT" ? 1.1 : 
           symbol === "PG" ? 0.4 : 0,
      marketCap: symbol === "XOM" ? 460000000000 : 
                symbol === "CVX" ? 290000000000 : 
                symbol === "BA" ? 112000000000 : 
                symbol === "CAT" ? 168000000000 : 
                symbol === "PG" ? 390000000000 : 0,
      volume: symbol === "XOM" ? 15000000 : 
             symbol === "CVX" ? 8000000 : 
             symbol === "BA" ? 7500000 : 
             symbol === "CAT" ? 3000000 : 
             symbol === "PG" ? 6000000 : 0,
      industry: symbol === "XOM" ? "Oil & Gas Integrated" : 
               symbol === "CVX" ? "Oil & Gas Integrated" : 
               symbol === "BA" ? "Aerospace & Defense" : 
               symbol === "CAT" ? "Farm & Heavy Construction Machinery" : 
               symbol === "PG" ? "Household & Personal Products" : "",
      sector: symbol === "XOM" ? "Energy" : 
             symbol === "CVX" ? "Energy" : 
             symbol === "BA" ? "Industrials" : 
             symbol === "CAT" ? "Industrials" : 
             symbol === "PG" ? "Consumer Defensive" : "",
      company: symbol === "XOM" ? "Exxon Mobil Corporation" : 
              symbol === "CVX" ? "Chevron Corporation" : 
              symbol === "BA" ? "The Boeing Company" : 
              symbol === "CAT" ? "Caterpillar Inc." : 
              symbol === "PG" ? "The Procter & Gamble Company" : ""
    };
    
    // Format the stock data
    output += `* ${symbol} (${sampleData.company}): $${formatValue(sampleData.price, true)} (${sampleData.priceChange >= 0 ? '+' : ''}${formatValue(sampleData.priceChange, true)}, ${sampleData.changesPercentage >= 0 ? '+' : ''}${formatValue(sampleData.changesPercentage, true)}%)\n`;
    output += `  * Sector: ${sampleData.sector}\n`;
    output += `  * Industry: ${sampleData.industry}\n`;
    
    // Add market cap
    const formattedMarketCap = formatMarketCap(sampleData.marketCap);
    output += `  * Market Cap: ${formattedMarketCap}\n`;
    
    // Add volume
    const formattedVolume = formatVolume(sampleData.volume);
    output += `  * Volume: ${formattedVolume}\n`;
    
    // Add metrics
    if (sampleData.pegRatio !== null) output += `  * PEG Ratio: ${formatValue(sampleData.pegRatio)}\n`;
    if (sampleData.forwardPE !== null) output += `  * Forward P/E: ${formatValue(sampleData.forwardPE)}\n`;
    if (sampleData.priceToBook !== null) output += `  * Price/Book: ${formatValue(sampleData.priceToBook)}\n`;
    if (sampleData.priceToSales !== null) output += `  * Price/Sales: ${formatValue(sampleData.priceToSales)}\n`;
    if (sampleData.debtToEquity !== null) output += `  * Debt/Equity: ${formatValue(sampleData.debtToEquity)}\n`;
    if (sampleData.returnOnEquity !== null) output += `  * Return on Equity: ${formatValue(sampleData.returnOnEquity)}%\n`;
    if (sampleData.beta !== null) output += `  * Beta: ${formatValue(sampleData.beta)}\n`;
    
    output += "\n";
  });
  
  // Log the output
  Logger.log(output);
  
  return output;
}
