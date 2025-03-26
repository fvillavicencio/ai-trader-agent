/**
 * Data Retrieval Module
 * Main entry point for all data retrieval operations
 * Coordinates the retrieval of data from all modules:
 * 1. Market Sentiment
 * 2. Key Market Indicators
 * 3. Fundamental Metrics for Stocks/ETFs
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
    
    // Step 1: Retrieve market sentiment data
    Logger.log("Step 1: Retrieving market sentiment data...");
    const marketSentiment = retrieveMarketSentiment();
    
    // Extract any stock symbols mentioned in the market sentiment data
    let mentionedStocks = [];
    if (marketSentiment && marketSentiment.analysts) {
      // Extract stock symbols from analyst comments
      marketSentiment.analysts.forEach(analyst => {
        if (analyst.mentionedSymbols && Array.isArray(analyst.mentionedSymbols)) {
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
    
    // Step 3: Retrieve fundamental metrics for mentioned stocks
    Logger.log(`Step 3: Retrieving fundamental metrics for ${mentionedStocks.length} stocks...`);
    const fundamentalMetrics = retrieveFundamentalMetrics(mentionedStocks);
    
    // Step 4: Retrieve macroeconomic factors
    Logger.log("Step 4: Retrieving macroeconomic factors...");
    const macroeconomicFactors = retrieveMacroeconomicFactors();
    
    // Compile all data
    const allData = {
      success: true,
      marketSentiment: marketSentiment,
      keyMarketIndicators: keyMarketIndicators,
      fundamentalMetrics: fundamentalMetrics,
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
 * Generates a prompt for Perplexity with all the retrieved data
 * @param {Object} allData - The retrieved data
 * @return {String} The prompt for Perplexity
 */
function generatePerplexityPrompt(allData) {
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
      dataSection += `- Last Updated: ${new Date(sentimentData.lastUpdated).toLocaleString()}\n`;
      
      if (sentimentData.analysts && sentimentData.analysts.length > 0) {
        dataSection += "- Analyst Commentary:\n";
        sentimentData.analysts.forEach(analyst => {
          dataSection += `  * ${analyst.name}: "${analyst.comment}" (Source: ${analyst.source}, ${new Date(analyst.timestamp).toLocaleString()})\n`;
          if (analyst.mentionedSymbols && analyst.mentionedSymbols.length > 0) {
            dataSection += `    Mentioned stocks: ${analyst.mentionedSymbols.join(', ')}\n`;
          }
        });
      }
      
      if (sentimentData.overallSentiment) {
        dataSection += `- Overall Market Sentiment: ${sentimentData.overallSentiment}\n`;
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
          dataSection += `  * ${index.name}: ${index.price} (${index.percentChange >= 0 ? '+' : ''}${index.percentChange.toFixed(2)}%)\n`;
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
          dataSection += `  * ${sector.name}: ${sector.percentChange >= 0 ? '+' : ''}${sector.percentChange.toFixed(2)}%\n`;
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
        const vix = indicatorsData.volatilityIndices.find(index => index.name.includes("VIX") || index.symbol === "VIX");
        if (vix) {
          dataSection += `- VIX (Volatility Index): ${vix.value}\n`;
          dataSection += `  * Change: ${vix.change >= 0 ? '+' : ''}${vix.change.toFixed(2)}\n`;
          dataSection += `  * Last Updated: ${new Date(vix.timestamp || new Date()).toLocaleString()}\n`;
        }
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
      
      if (metricsData.metrics && metricsData.metrics.length > 0) {
        dataSection += `- Metrics for ${metricsData.metrics.length} stocks/ETFs:\n`;
        metricsData.metrics.forEach(metric => {
          dataSection += `  * ${metric.symbol} (${metric.name || 'Unknown'}):\n`;
          // Add price and price change information
          if (metric.price !== undefined) {
            dataSection += `    - Price: $${formatValue(metric.price)} `;
            if (metric.change !== undefined) {
              const changeSign = metric.change >= 0 ? '+' : '';
              dataSection += `(${changeSign}${formatValue(metric.change)}, ${changeSign}${formatValue(metric.changePct)}%)\n`;
            } else {
              dataSection += '\n';
            }
          }
          dataSection += `    - PEG Ratio: ${formatValue(metric.pegRatio)}\n`;
          dataSection += `    - Forward P/E: ${formatValue(metric.forwardPE)}\n`;
          dataSection += `    - Price/Book: ${formatValue(metric.priceToBook)}\n`;
          dataSection += `    - Price/Sales: ${formatValue(metric.priceToSales)}\n`;
          dataSection += `    - Debt/Equity: ${formatValue(metric.debtToEquity)}\n`;
          dataSection += `    - Return on Equity: ${formatValue(metric.returnOnEquity * 100)}%\n`;
          dataSection += `    - Beta: ${formatValue(metric.beta)}\n`;
          if (metric.isETF) {
            dataSection += `    - Expense Ratio: ${formatValue(metric.expenseRatio * 100)}%\n`;
          }
        });
      } else {
        dataSection += "- No stock/ETF metrics available\n";
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
        const yields = macroData.treasuryYields.yields || {};
        
        // Display all available yields
        // Convert the yields object to entries and iterate through them
        Object.entries(yields).forEach(([term, value]) => {
          if (value !== undefined) {
            // Format the term for display (e.g., "twoYear" -> "Two Year")
            const formattedTerm = term.replace(/([A-Z])/g, ' $1')
                                    .replace(/^./, str => str.toUpperCase());
            
            dataSection += `  * ${formattedTerm} Treasury Yield: ${value.toFixed(2)}% `;
            
            // Add change information if available
            if (macroData.treasuryYields.changes && macroData.treasuryYields.changes[term] !== undefined) {
              const change = macroData.treasuryYields.changes[term];
              dataSection += `(Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%)\n`;
            } else {
              dataSection += '\n';
            }
          }
        });
        
        // Add yield curve information
        if (macroData.treasuryYields.yieldCurve) {
          dataSection += `  * Yield Curve Status: ${macroData.treasuryYields.yieldCurve.status}\n`;
          dataSection += `  * 10Y-2Y Spread: ${macroData.treasuryYields.yieldCurve.tenYearTwoYearSpread.toFixed(2)}%\n`;
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
      if (macroData.inflation) {
        dataSection += "- Inflation Data:\n";
        
        // CPI data
        if (macroData.inflation.cpi) {
          dataSection += `  * CPI (Current): ${macroData.inflation.cpi.currentRate}%\n`;
          dataSection += `  * CPI (Year-over-Year): ${macroData.inflation.cpi.yearOverYearChange}%\n`;
          dataSection += `  * Core CPI: ${macroData.inflation.cpi.coreRate}%\n`;
          if (macroData.inflation.cpi.lastUpdated) {
            dataSection += `  * CPI Last Updated: ${new Date(macroData.inflation.cpi.lastUpdated).toLocaleString()}\n`;
          }
          if (macroData.inflation.cpi.source) {
            dataSection += `  * CPI Source: ${macroData.inflation.cpi.source}\n`;
          }
          if (macroData.inflation.cpi.isEstimate) {
            dataSection += `  * Note: CPI data is estimated due to retrieval issues\n`;
          }
        }
        
        // PPI data
        if (macroData.inflation.ppi) {
          dataSection += `  * PPI (Current): ${macroData.inflation.ppi.currentRate}%\n`;
          dataSection += `  * PPI (Year-over-Year): ${macroData.inflation.ppi.yearOverYearChange}%\n`;
          dataSection += `  * Core PPI: ${macroData.inflation.ppi.coreRate}%\n`;
          if (macroData.inflation.ppi.lastUpdated) {
            dataSection += `  * PPI Last Updated: ${new Date(macroData.inflation.ppi.lastUpdated).toLocaleString()}\n`;
          }
          if (macroData.inflation.ppi.source) {
            dataSection += `  * PPI Source: ${macroData.inflation.ppi.source}\n`;
          }
          if (macroData.inflation.ppi.isEstimate) {
            dataSection += `  * Note: PPI data is estimated due to retrieval issues\n`;
          }
        }
        
        // PCE data
        if (macroData.inflation.pce) {
          dataSection += `  * PCE (Current): ${macroData.inflation.pce.currentRate}%\n`;
          dataSection += `  * PCE (Year-over-Year): ${macroData.inflation.pce.yearOverYearChange}%\n`;
          dataSection += `  * Core PCE: ${macroData.inflation.pce.coreRate}%\n`;
          if (macroData.inflation.pce.lastUpdated) {
            dataSection += `  * PCE Last Updated: ${new Date(macroData.inflation.pce.lastUpdated).toLocaleString()}\n`;
          }
          if (macroData.inflation.pce.source) {
            dataSection += `  * PCE Source: ${macroData.inflation.pce.source}\n`;
          }
          dataSection += `  * Note: PCE is the Federal Reserve's preferred inflation measure\n`;
          if (macroData.inflation.pce.isEstimate) {
            dataSection += `  * Note: PCE data is estimated due to retrieval issues\n`;
          }
        }
        
        // Inflation expectations
        if (macroData.inflation.expectations) {
          dataSection += `  * Inflation Expectations: 1-Year (${macroData.inflation.expectations.oneYear}%), 5-Year (${macroData.inflation.expectations.fiveYear}%), 10-Year (${macroData.inflation.expectations.tenYear}%)\n`;
          if (macroData.inflation.expectations.lastUpdated) {
            dataSection += `  * Expectations Last Updated: ${new Date(macroData.inflation.expectations.lastUpdated).toLocaleString()}\n`;
          }
          if (macroData.inflation.expectations.source) {
            dataSection += `  * Expectations Source: ${macroData.inflation.expectations.source}\n`;
          }
          if (macroData.inflation.expectations.isEstimate) {
            dataSection += `  * Note: Inflation expectations data is estimated due to retrieval issues\n`;
          }
        }
        
        // Inflation analysis
        if (macroData.inflation.analysis) {
          dataSection += `\n**Inflation Analysis**:\n${macroData.inflation.analysis}\n`;
        }
        
        // Source and timestamp
        if (macroData.inflation.source && macroData.inflation.lastUpdated) {
          dataSection += `  * Source: ${macroData.inflation.source}`;
          if (macroData.inflation.sourceUrl) {
            dataSection += ` (${macroData.inflation.sourceUrl})`;
          }
          dataSection += `\n  * Last Updated: ${new Date(macroData.inflation.lastUpdated).toLocaleString()}\n`;
        }
      }
      
      // Geopolitical Risks
      if (macroData.geopoliticalRisks && macroData.geopoliticalRisks.risks) {
        dataSection += "- Geopolitical Risks:\n";
        macroData.geopoliticalRisks.risks.forEach(risk => {
          if (risk.type === 'Event') {
            dataSection += `  * ${risk.name}:\n`;
            dataSection += `    - Description: ${risk.description}\n`;
            dataSection += `    - Region: ${risk.region}\n`;
            dataSection += `    - Impact Level: ${risk.impactLevel}/10\n`;
            dataSection += `    - Source: ${risk.source} (${risk.url})\n`;
            if (risk.lastUpdated) {
              dataSection += `    - Last Updated: ${new Date(risk.lastUpdated).toLocaleString()}\n`;
            }
          } else if (risk.type === 'Index') {
            dataSection += `  * ${risk.name}:\n`;
            dataSection += `    - Value: ${risk.value}\n`;
            dataSection += `    - Change: ${risk.change > 0 ? '+' : ''}${risk.change}\n`;
            dataSection += `    - Interpretation: ${risk.interpretation}\n`;
            dataSection += `    - Source: ${risk.source} (${risk.url})\n`;
            if (risk.lastUpdated) {
              dataSection += `    - Last Updated: ${new Date(risk.lastUpdated).toLocaleString()}\n`;
            }
          }
        });
        
        // Overall analysis
        if (macroData.geopoliticalRisks.analysis) {
          dataSection += `  * Overall Analysis: ${macroData.geopoliticalRisks.analysis}\n`;
        }
        
        // Source and timestamp
        if (macroData.geopoliticalRisks.source && macroData.geopoliticalRisks.lastUpdated) {
          dataSection += `  * Source: ${macroData.geopoliticalRisks.source}`;
          if (macroData.geopoliticalRisks.sourceUrl) {
            dataSection += ` (${macroData.geopoliticalRisks.sourceUrl})`;
          }
          dataSection += `\n  * Last Updated: ${new Date(macroData.geopoliticalRisks.lastUpdated).toLocaleString()}\n`;
        }
      }
    } else {
      dataSection += "- No macroeconomic factors data available\n";
    }
    
    // Combine the base prompt with the data section
    const fullPrompt = basePrompt.replace("${formattedDate}", formattedDate) + dataSection;
    
    return fullPrompt;
  } catch (error) {
    Logger.log(`Error generating Perplexity prompt: ${error}`);
    return `Error generating prompt: ${error}`;
  }
}

/**
 * Test function to display the Perplexity prompt
 * This function retrieves all data and then generates and displays the Perplexity prompt
 */
function testPerplexityPrompt() {
  Logger.log("Retrieving all data and generating Perplexity prompt...");
  
  // Retrieve all data
  const allData = retrieveAllData();
  
  // Generate the Perplexity prompt
  const prompt = generatePerplexityPrompt(allData);
  
  // Log the prompt
  Logger.log("PERPLEXITY PROMPT:");
  Logger.log(prompt);
  
  return prompt;
}

/**
 * Helper function to format values for display
 * @param {number} value - The value to format
 * @return {string} The formatted value
 */
function formatValue(value) {
  if (value === undefined || value === null || isNaN(value)) {
    return "N/A";
  }
  return value.toFixed(2);
}
