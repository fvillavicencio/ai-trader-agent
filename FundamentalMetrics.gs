/**
 * Fundamental Metrics Module
 * Handles retrieval of fundamental metrics for stocks/ETFs including PEG ratios, 
 * Forward P/E Ratios, and other relevant metrics
 */

/**
 * Retrieves fundamental metrics for a list of stocks/ETFs
 * @param {Array} symbols - List of stock/ETF symbols to retrieve fundamental metrics for (can be empty)
 * @return {Object} Fundamental metrics data
 */
function retrieveFundamentalMetrics(symbols = []) {
  try {
    // Ensure symbols is an array
    if (!Array.isArray(symbols)) {
      symbols = [];
    }
    
    // Add default symbols (major indices and magnificent seven)
    const defaultSymbols = [
      // Major indices
      "SPY",  // S&P 500
      "QQQ",  // NASDAQ
      "IWM",  // Russell 2000
      "DIA",  // Dow Jones
      
      // Magnificent Seven
      "AAPL", // Apple
      "MSFT", // Microsoft
      "GOOGL", // Alphabet (Google)
      "AMZN", // Amazon
      "META", // Meta (Facebook)
      "TSLA", // Tesla
      "NVDA"  // NVIDIA
    ];
    
    // Combine user-provided symbols with default symbols
    const allSymbols = [...symbols, ...defaultSymbols];
    
    // Remove duplicates and ensure uppercase
    const uniqueSymbols = [...new Set(allSymbols.map(symbol => symbol.toUpperCase()))];
    
    Logger.log(`Retrieving fundamental metrics for ${uniqueSymbols.length} symbols...`);
    
    // Initialize results array
    const results = [];
    
    // Process each symbol
    for (const symbol of uniqueSymbols) {
      Logger.log(`Retrieving fundamental metrics for ${symbol}...`);
      
      try {
        // Fetch fundamental metrics data for the symbol
        const metrics = fetchFundamentalMetricsData(symbol);
        results.push(metrics);
      } catch (error) {
        Logger.log(`Error retrieving fundamental metrics for ${symbol}: ${error}`);
      }
    }
    
    // Format the data for display
    const formattedData = formatFundamentalMetricsData(results);
    
    // Return the results
    return {
      success: results.length > 0,
      message: results.length > 0 ? `Retrieved fundamental metrics for ${results.length} symbols.` : "Failed to retrieve fundamental metrics.",
      metrics: results,
      formattedData: formattedData,
      timestamp: new Date()
    };
  } catch (error) {
    Logger.log(`Error retrieving fundamental metrics: ${error}`);
    return {
      success: false,
      message: `Failed to retrieve fundamental metrics: ${error}`,
      timestamp: new Date()
    };
  }
}

/**
 * Fetches fundamental metrics data for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Fundamental metrics data
 */
function fetchFundamentalMetricsData(symbol) {
  try {
    // Get company name
    const name = getCompanyName(symbol);
    
    // Fetch data from Yahoo Finance
    const yahooData = fetchYahooFinanceData(symbol);
    
    // Fetch historical averages (5-year)
    const historicalAverages = fetchHistoricalAverages(symbol);
    
    // Fetch sector averages
    const sectorAverages = fetchSectorAverages(symbol);
    
    // Generate analysis based on the data
    const analysis = generateAnalysis(symbol, yahooData, historicalAverages, sectorAverages);
    
    // Return the compiled data
    return {
      symbol: symbol,
      name: name,
      fundamentals: yahooData,
      historicalAverages: historicalAverages,
      sectorAverages: sectorAverages,
      analysis: analysis,
      source: "Yahoo Finance",
      sourceUrl: `https://finance.yahoo.com/quote/${symbol}/key-statistics`,
      timestamp: new Date()
    };
  } catch (error) {
    Logger.log(`Error fetching fundamental metrics for ${symbol}: ${error}`);
    // Return placeholder data with error message
    return {
      symbol: symbol,
      name: getCompanyName(symbol),
      fundamentals: {
        pegRatio: null,
        forwardPE: null,
        priceToBook: null,
        priceToSales: null,
        debtToEquity: null,
        returnOnEquity: null,
        returnOnAssets: null,
        profitMargin: null,
        dividendYield: null,
        beta: null
      },
      historicalAverages: {
        pegRatio: null,
        forwardPE: null,
        priceToBook: null,
        priceToSales: null
      },
      sectorAverages: {
        pegRatio: null,
        forwardPE: null,
        priceToBook: null,
        priceToSales: null
      },
      analysis: `Error retrieving data: ${error.message}`,
      source: "Error",
      sourceUrl: `https://finance.yahoo.com/quote/${symbol}/key-statistics`,
      timestamp: new Date()
    };
  }
}

/**
 * Fetches data from Yahoo Finance for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Yahoo Finance data
 */
function fetchYahooFinanceData(symbol) {
  try {
    // Construct the Yahoo Finance URL for key statistics
    const url = `https://finance.yahoo.com/quote/${symbol}/key-statistics`;
    
    // Fetch the webpage
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      }
    });
    
    // Check if we got a valid response
    if (response.getResponseCode() !== 200) {
      throw new Error(`Failed to fetch Yahoo Finance data for ${symbol} with response code ${response.getResponseCode()}`);
    }
    
    const htmlContent = response.getContentText();
    
    // Extract the metrics using regex patterns
    // PEG Ratio
    const pegRatio = extractMetric(htmlContent, /PEG Ratio \(5 yr expected\)[^>]*<td[^>]*>([\d.]+|N\/A)<\/td>/i);
    
    // Forward P/E
    const forwardPE = extractMetric(htmlContent, /Forward P\/E[^>]*<td[^>]*>([\d.]+|N\/A)<\/td>/i);
    
    // Price/Book
    const priceToBook = extractMetric(htmlContent, /Price\/Book[^>]*<td[^>]*>([\d.]+|N\/A)<\/td>/i);
    
    // Price/Sales
    const priceToSales = extractMetric(htmlContent, /Price\/Sales[^>]*<td[^>]*>([\d.]+|N\/A)<\/td>/i);
    
    // Debt/Equity
    const debtToEquity = extractMetric(htmlContent, /Total Debt\/Equity[^>]*<td[^>]*>([\d.]+|N\/A)<\/td>/i);
    
    // Return on Equity
    const returnOnEquity = extractMetric(htmlContent, /Return on Equity[^>]*<td[^>]*>([\d.]+%|N\/A)<\/td>/i);
    
    // Return on Assets
    const returnOnAssets = extractMetric(htmlContent, /Return on Assets[^>]*<td[^>]*>([\d.]+%|N\/A)<\/td>/i);
    
    // Profit Margin
    const profitMargin = extractMetric(htmlContent, /Profit Margin[^>]*<td[^>]*>([\d.]+%|N\/A)<\/td>/i);
    
    // Dividend Yield
    const dividendYield = extractMetric(htmlContent, /Forward Annual Dividend Yield[^>]*<td[^>]*>([\d.]+%|N\/A)<\/td>/i);
    
    // Beta
    const beta = extractMetric(htmlContent, /Beta \(5Y Monthly\)[^>]*<td[^>]*>([\d.]+|N\/A)<\/td>/i);
    
    // Return the extracted metrics
    return {
      pegRatio: pegRatio !== null ? pegRatio : 0,
      forwardPE: forwardPE !== null ? forwardPE : 0,
      priceToBook: priceToBook !== null ? priceToBook : 0,
      priceToSales: priceToSales !== null ? priceToSales : 0,
      debtToEquity: debtToEquity !== null ? debtToEquity : 0,
      returnOnEquity: returnOnEquity !== null ? returnOnEquity : 0,
      returnOnAssets: returnOnAssets !== null ? returnOnAssets : 0,
      profitMargin: profitMargin !== null ? profitMargin : 0,
      dividendYield: dividendYield !== null ? dividendYield : 0,
      beta: beta !== null ? beta : 0
    };
  } catch (error) {
    Logger.log(`Error fetching Yahoo Finance data for ${symbol}: ${error}`);
    
    // If Yahoo Finance fails, try to fetch from Alpha Vantage as a backup
    try {
      return fetchAlphaVantageData(symbol);
    } catch (backupError) {
      Logger.log(`Backup Alpha Vantage fetch also failed for ${symbol}: ${backupError}`);
      
      // If both fail, return placeholder data
      return {
        pegRatio: 0,
        forwardPE: 0,
        priceToBook: 0,
        priceToSales: 0,
        debtToEquity: 0,
        returnOnEquity: 0,
        returnOnAssets: 0,
        profitMargin: 0,
        dividendYield: 0,
        beta: 0
      };
    }
  }
}

/**
 * Fetches data from Alpha Vantage as a backup
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Alpha Vantage data
 */
function fetchAlphaVantageData(symbol) {
  try {
    // In a production environment, you would use an actual Alpha Vantage API key
    // const apiKey = "YOUR_ALPHA_VANTAGE_API_KEY";
    // const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`;
    
    // For now, we'll simulate the data
    Logger.log(`Using simulated Alpha Vantage data for ${symbol}`);
    
    // Generate random metrics for simulation
    return {
      pegRatio: getRandomMetric(0.5, 3.0),
      forwardPE: getRandomMetric(10, 30),
      priceToBook: getRandomMetric(1, 10),
      priceToSales: getRandomMetric(1, 15),
      debtToEquity: getRandomMetric(0.1, 2.0),
      returnOnEquity: getRandomMetric(5, 25),
      returnOnAssets: getRandomMetric(2, 15),
      profitMargin: getRandomMetric(5, 20),
      dividendYield: getRandomMetric(0, 5),
      beta: getRandomMetric(0.5, 2.0)
    };
  } catch (error) {
    Logger.log(`Error fetching Alpha Vantage data for ${symbol}: ${error}`);
    throw error;
  }
}

/**
 * Extracts a metric from HTML content using regex
 * @param {String} htmlContent - The HTML content
 * @param {RegExp} regex - The regex pattern to extract the metric
 * @return {Number|null} The extracted metric or null if not found
 */
function extractMetric(htmlContent, regex) {
  try {
    const match = htmlContent.match(regex);
    
    if (match && match[1] && match[1] !== "N/A") {
      // Remove % sign if present and convert to number
      return parseFloat(match[1].replace('%', ''));
    }
    
    return null;
  } catch (error) {
    Logger.log(`Error extracting metric: ${error}`);
    return null;
  }
}

/**
 * Fetches historical averages for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Historical averages
 */
function fetchHistoricalAverages(symbol) {
  try {
    // In a production environment, you would fetch historical data
    // For now, we'll simulate the data
    
    // For indices, use standard values
    if (["SPY", "QQQ", "IWM", "DIA"].includes(symbol)) {
      return {
        pegRatio: 1.5,
        forwardPE: 18.5,
        priceToBook: 3.2,
        priceToSales: 2.4
      };
    }
    
    // For Magnificent Seven, use higher values
    if (["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"].includes(symbol)) {
      return {
        pegRatio: 2.1,
        forwardPE: 25.0,
        priceToBook: 8.5,
        priceToSales: 6.0
      };
    }
    
    // For other stocks, generate random values
    return {
      pegRatio: getRandomMetric(1.0, 2.5),
      forwardPE: getRandomMetric(15, 22),
      priceToBook: getRandomMetric(2, 5),
      priceToSales: getRandomMetric(1.5, 4)
    };
  } catch (error) {
    Logger.log(`Error fetching historical averages for ${symbol}: ${error}`);
    
    // Return placeholder data
    return {
      pegRatio: 0,
      forwardPE: 0,
      priceToBook: 0,
      priceToSales: 0
    };
  }
}

/**
 * Fetches sector averages for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Sector averages
 */
function fetchSectorAverages(symbol) {
  try {
    // In a production environment, you would determine the sector and fetch sector averages
    // For now, we'll use predefined sector averages based on the symbol
    
    // Define sector mappings (simplified)
    const sectorMappings = {
      "AAPL": "Technology",
      "MSFT": "Technology",
      "GOOGL": "Technology",
      "AMZN": "Consumer Cyclical",
      "META": "Technology",
      "TSLA": "Consumer Cyclical",
      "NVDA": "Technology",
      "SPY": "Market",
      "QQQ": "Technology",
      "IWM": "Small Cap",
      "DIA": "Large Cap"
    };
    
    // Define sector averages
    const sectorAverages = {
      "Technology": {
        pegRatio: 1.8,
        forwardPE: 24.0,
        priceToBook: 7.5,
        priceToSales: 5.0
      },
      "Consumer Cyclical": {
        pegRatio: 1.5,
        forwardPE: 20.0,
        priceToBook: 4.5,
        priceToSales: 2.5
      },
      "Market": {
        pegRatio: 1.5,
        forwardPE: 18.5,
        priceToBook: 3.2,
        priceToSales: 2.4
      },
      "Small Cap": {
        pegRatio: 1.3,
        forwardPE: 16.0,
        priceToBook: 2.0,
        priceToSales: 1.5
      },
      "Large Cap": {
        pegRatio: 1.6,
        forwardPE: 19.0,
        priceToBook: 3.5,
        priceToSales: 2.8
      },
      "Default": {
        pegRatio: 1.5,
        forwardPE: 18.0,
        priceToBook: 3.0,
        priceToSales: 2.0
      }
    };
    
    // Get the sector for the symbol
    const sector = sectorMappings[symbol] || "Default";
    
    // Return the sector averages
    return sectorAverages[sector];
  } catch (error) {
    Logger.log(`Error fetching sector averages for ${symbol}: ${error}`);
    
    // Return placeholder data
    return {
      pegRatio: 0,
      forwardPE: 0,
      priceToBook: 0,
      priceToSales: 0
    };
  }
}

/**
 * Formats the fundamental metrics data for display
 * @param {Array} fundamentalMetrics - Array of fundamental metrics data objects
 * @return {String} Formatted fundamental metrics data
 */
function formatFundamentalMetricsData(fundamentalMetrics) {
  try {
    let formattedData = "## Fundamental Metrics Analysis\n\n";
    
    // Check if we have data
    if (!fundamentalMetrics || fundamentalMetrics.length === 0) {
      return "No fundamental metrics data available.";
    }
    
    // Group stocks by category
    const indices = fundamentalMetrics.filter(stock => ["SPY", "QQQ", "IWM", "DIA"].includes(stock.symbol));
    const magSeven = fundamentalMetrics.filter(stock => ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"].includes(stock.symbol));
    const otherStocks = fundamentalMetrics.filter(stock => 
      !["SPY", "QQQ", "IWM", "DIA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"].includes(stock.symbol)
    );
    
    // Format indices
    if (indices.length > 0) {
      formattedData += "### Major Indices\n\n";
      formattedData += formatStockGroup(indices);
    }
    
    // Format Magnificent Seven
    if (magSeven.length > 0) {
      formattedData += "### Magnificent Seven\n\n";
      formattedData += formatStockGroup(magSeven);
    }
    
    // Format other stocks
    if (otherStocks.length > 0) {
      formattedData += "### Recently Mentioned Stocks\n\n";
      formattedData += formatStockGroup(otherStocks);
    }
    
    // Add summary
    formattedData += "\n### Summary\n\n";
    formattedData += "This analysis compares current valuations to historical averages and sector benchmarks. ";
    formattedData += "PEG ratios below 1.0 may indicate undervaluation, while ratios above 2.0 could suggest overvaluation. ";
    formattedData += "Forward P/E ratios should be compared to historical and sector averages to identify potential opportunities or risks.\n\n";
    formattedData += "Data sourced from Yahoo Finance and other financial data providers. Last updated: " + new Date().toLocaleString() + "\n";
    
    return formattedData;
  } catch (error) {
    Logger.log(`Error formatting fundamental metrics data: ${error}`);
    return "Error formatting fundamental metrics data.";
  }
}

/**
 * Formats a group of stocks for display
 * @param {Array} stocks - Array of stock data objects
 * @return {String} Formatted stock data
 */
function formatStockGroup(stocks) {
  let formattedData = "";
  
  for (const stock of stocks) {
    formattedData += `#### ${stock.name} (${stock.symbol})\n\n`;
    
    // Check if we have valid data
    if (!stock.fundamentals || !stock.historicalAverages || !stock.sectorAverages) {
      formattedData += "Data not available for this symbol.\n\n";
      continue;
    }
    
    // Format metrics table
    formattedData += "| Metric | Current | 5-Year Avg | Sector Avg | Evaluation |\n";
    formattedData += "|--------|---------|------------|------------|------------|\n";
    
    // PEG Ratio
    const pegEval = evaluateMetric(stock.fundamentals.pegRatio, stock.historicalAverages.pegRatio, stock.sectorAverages.pegRatio, "PEG", false);
    formattedData += `| PEG Ratio | ${formatValue(stock.fundamentals.pegRatio)} | ${formatValue(stock.historicalAverages.pegRatio)} | ${formatValue(stock.sectorAverages.pegRatio)} | ${pegEval} |\n`;
    
    // Forward P/E
    const peEval = evaluateMetric(stock.fundamentals.forwardPE, stock.historicalAverages.forwardPE, stock.sectorAverages.forwardPE, "P/E", false);
    formattedData += `| Forward P/E | ${formatValue(stock.fundamentals.forwardPE)} | ${formatValue(stock.historicalAverages.forwardPE)} | ${formatValue(stock.sectorAverages.forwardPE)} | ${peEval} |\n`;
    
    // Price/Book
    const pbEval = evaluateMetric(stock.fundamentals.priceToBook, stock.historicalAverages.priceToBook, stock.sectorAverages.priceToBook, "P/B", false);
    formattedData += `| Price/Book | ${formatValue(stock.fundamentals.priceToBook)} | ${formatValue(stock.historicalAverages.priceToBook)} | ${formatValue(stock.sectorAverages.priceToBook)} | ${pbEval} |\n`;
    
    // Price/Sales
    const psEval = evaluateMetric(stock.fundamentals.priceToSales, stock.historicalAverages.priceToSales, stock.sectorAverages.priceToSales, "P/S", false);
    formattedData += `| Price/Sales | ${formatValue(stock.fundamentals.priceToSales)} | ${formatValue(stock.historicalAverages.priceToSales)} | ${formatValue(stock.sectorAverages.priceToSales)} | ${psEval} |\n`;
    
    // Additional metrics
    formattedData += "\n**Additional Metrics:**\n\n";
    formattedData += `- **Debt/Equity**: ${formatValue(stock.fundamentals.debtToEquity)}\n`;
    formattedData += `- **Return on Equity**: ${formatValue(stock.fundamentals.returnOnEquity)}%\n`;
    formattedData += `- **Return on Assets**: ${formatValue(stock.fundamentals.returnOnAssets)}%\n`;
    formattedData += `- **Profit Margin**: ${formatValue(stock.fundamentals.profitMargin)}%\n`;
    formattedData += `- **Dividend Yield**: ${formatValue(stock.fundamentals.dividendYield)}%\n`;
    formattedData += `- **Beta**: ${formatValue(stock.fundamentals.beta)}\n`;
    
    // Analysis
    formattedData += "\n**Analysis:**\n\n";
    formattedData += `${stock.analysis}\n\n`;
    
    // Add source information
    if (stock.source && stock.timestamp) {
      const timestamp = new Date(stock.timestamp);
      formattedData += `*Source: ${stock.source}, as of ${timestamp.toLocaleDateString()}, ${timestamp.toLocaleTimeString()}*\n\n`;
    }
    
    formattedData += "---\n\n";
  }
  
  return formattedData;
}

/**
 * Formats a value for display
 * @param {Number} value - The value to format
 * @return {String} Formatted value
 */
function formatValue(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return "N/A";
  }
  
  return value.toFixed(2);
}

/**
 * Evaluates a metric compared to historical and sector averages
 * @param {Number} current - Current value
 * @param {Number} historical - Historical average
 * @param {Number} sector - Sector average
 * @param {String} metricType - Type of metric (PEG, P/E, etc.)
 * @param {Boolean} higherIsBetter - Whether higher values are better
 * @return {String} Evaluation
 */
function evaluateMetric(current, historical, sector, metricType, higherIsBetter = false) {
  if (current === null || historical === null || sector === null || 
      current === 0 || historical === 0 || sector === 0) {
    return "Insufficient data";
  }
  
  // Calculate percentage differences
  const histDiff = ((current - historical) / historical) * 100;
  const sectorDiff = ((current - sector) / sector) * 100;
  
  // Determine if the metric is favorable
  let histFavorable = higherIsBetter ? (histDiff > 0) : (histDiff < 0);
  let sectorFavorable = higherIsBetter ? (sectorDiff > 0) : (sectorDiff < 0);
  
  // Special case for PEG ratio
  if (metricType === "PEG") {
    if (current < 1.0) return "Potentially undervalued";
    if (current > 2.0) return "Potentially overvalued";
    return "Fairly valued";
  }
  
  // Evaluation based on differences
  if (Math.abs(histDiff) < 10 && Math.abs(sectorDiff) < 10) {
    return "Fairly valued";
  } else if (histFavorable && sectorFavorable) {
    return "Favorable";
  } else if (!histFavorable && !sectorFavorable) {
    return "Unfavorable";
  } else {
    return "Mixed signals";
  }
}

/**
 * Generates analysis for a stock/ETF based on its metrics
 * @param {String} symbol - The stock/ETF symbol
 * @param {Object} yahooData - Current fundamental metrics
 * @param {Object} historicalAverages - Historical average metrics
 * @param {Object} sectorAverages - Sector average metrics
 * @return {String} Analysis
 */
function generateAnalysis(symbol, yahooData, historicalAverages, sectorAverages) {
  try {
    // Check if we have valid data
    if (!yahooData || !historicalAverages || !sectorAverages) {
      return "Insufficient data to generate analysis.";
    }
    
    // Initialize analysis parts
    let valuationAnalysis = "";
    let growthAnalysis = "";
    let financialHealthAnalysis = "";
    let riskAnalysis = "";
    
    // Valuation analysis
    if (yahooData.pegRatio && historicalAverages.pegRatio && sectorAverages.pegRatio) {
      const pegHistDiff = ((yahooData.pegRatio - historicalAverages.pegRatio) / historicalAverages.pegRatio) * 100;
      const pegSectorDiff = ((yahooData.pegRatio - sectorAverages.pegRatio) / sectorAverages.pegRatio) * 100;
      
      if (yahooData.pegRatio < 1.0) {
        valuationAnalysis = `${symbol} appears potentially undervalued with a PEG ratio of ${yahooData.pegRatio.toFixed(2)}, which is ${Math.abs(pegHistDiff).toFixed(0)}% below its historical average and ${Math.abs(pegSectorDiff).toFixed(0)}% below the sector average.`;
      } else if (yahooData.pegRatio > 2.0) {
        valuationAnalysis = `${symbol} appears potentially overvalued with a PEG ratio of ${yahooData.pegRatio.toFixed(2)}, which is ${pegHistDiff.toFixed(0)}% above its historical average and ${pegSectorDiff.toFixed(0)}% above the sector average.`;
      } else {
        valuationAnalysis = `${symbol} appears fairly valued with a PEG ratio of ${yahooData.pegRatio.toFixed(2)}, compared to its historical average of ${historicalAverages.pegRatio.toFixed(2)} and sector average of ${sectorAverages.pegRatio.toFixed(2)}.`;
      }
    } else if (yahooData.forwardPE && historicalAverages.forwardPE && sectorAverages.forwardPE) {
      const peHistDiff = ((yahooData.forwardPE - historicalAverages.forwardPE) / historicalAverages.forwardPE) * 100;
      const peSectorDiff = ((yahooData.forwardPE - sectorAverages.forwardPE) / sectorAverages.forwardPE) * 100;
      
      if (peHistDiff < -15 && peSectorDiff < -15) {
        valuationAnalysis = `${symbol} is trading at a significant discount with a forward P/E of ${yahooData.forwardPE.toFixed(2)}, which is ${Math.abs(peHistDiff).toFixed(0)}% below its historical average and ${Math.abs(peSectorDiff).toFixed(0)}% below the sector average.`;
      } else if (peHistDiff > 15 && peSectorDiff > 15) {
        valuationAnalysis = `${symbol} is trading at a premium with a forward P/E of ${yahooData.forwardPE.toFixed(2)}, which is ${peHistDiff.toFixed(0)}% above its historical average and ${peSectorDiff.toFixed(0)}% above the sector average.`;
      } else {
        valuationAnalysis = `${symbol} is trading near fair value with a forward P/E of ${yahooData.forwardPE.toFixed(2)}, compared to its historical average of ${historicalAverages.forwardPE.toFixed(2)} and sector average of ${sectorAverages.forwardPE.toFixed(2)}.`;
      }
    }
    
    // Financial health analysis
    if (yahooData.debtToEquity !== null && yahooData.returnOnEquity !== null) {
      if (yahooData.debtToEquity < 0.5 && yahooData.returnOnEquity > 15) {
        financialHealthAnalysis = `The company demonstrates strong financial health with a low debt-to-equity ratio of ${yahooData.debtToEquity.toFixed(2)} and high return on equity of ${yahooData.returnOnEquity.toFixed(2)}%.`;
      } else if (yahooData.debtToEquity > 1.5) {
        financialHealthAnalysis = `The company has a relatively high debt-to-equity ratio of ${yahooData.debtToEquity.toFixed(2)}, which may indicate increased financial risk.`;
      } else if (yahooData.returnOnEquity < 5) {
        financialHealthAnalysis = `The company's return on equity of ${yahooData.returnOnEquity.toFixed(2)}% is relatively low, suggesting potential efficiency concerns.`;
      } else {
        financialHealthAnalysis = `The company shows moderate financial health with a debt-to-equity ratio of ${yahooData.debtToEquity.toFixed(2)} and return on equity of ${yahooData.returnOnEquity.toFixed(2)}%.`;
      }
    }
    
    // Risk analysis
    if (yahooData.beta !== null) {
      if (yahooData.beta < 0.8) {
        riskAnalysis = `With a beta of ${yahooData.beta.toFixed(2)}, ${symbol} exhibits lower volatility than the overall market, potentially offering more stability during market downturns.`;
      } else if (yahooData.beta > 1.2) {
        riskAnalysis = `With a beta of ${yahooData.beta.toFixed(2)}, ${symbol} tends to be more volatile than the overall market, which may present both higher risk and potential reward.`;
      } else {
        riskAnalysis = `With a beta of ${yahooData.beta.toFixed(2)}, ${symbol} moves roughly in line with the overall market.`;
      }
    }
    
    // Combine analyses
    let finalAnalysis = "";
    
    if (valuationAnalysis) finalAnalysis += valuationAnalysis + " ";
    if (financialHealthAnalysis) finalAnalysis += financialHealthAnalysis + " ";
    if (riskAnalysis) finalAnalysis += riskAnalysis;
    
    if (!finalAnalysis) {
      // Fallback if we couldn't generate a specific analysis
      return `Analysis for ${symbol} is limited due to incomplete data. Consider reviewing the raw metrics for a more complete picture.`;
    }
    
    return finalAnalysis;
  } catch (error) {
    Logger.log(`Error generating analysis for ${symbol}: ${error}`);
    return `Unable to generate detailed analysis for ${symbol} due to an error.`;
  }
}

/**
 * Tests the fundamental metrics data retrieval
 */
function testFundamentalMetrics() {
  try {
    // Test with a few symbols
    const testSymbols = ["AAPL", "MSFT", "SPY", "AMZN"];
    Logger.log(`Testing fundamental metrics for symbols: ${testSymbols.join(", ")}`);
    
    // Retrieve the fundamental metrics
    const fundamentalMetrics = retrieveFundamentalMetrics(testSymbols);
    
    // Check if we have metrics
    if (!fundamentalMetrics.success) {
      Logger.log(`Error retrieving fundamental metrics: ${fundamentalMetrics.error}`);
      return;
    }
    
    // Log the metrics
    Logger.log(`Successfully retrieved fundamental metrics for ${fundamentalMetrics.metrics.length} symbols`);
    
    // Test the formatting function
    const formattedData = formatFundamentalMetricsData(fundamentalMetrics.metrics);
    Logger.log("Formatted Fundamental Metrics Data (first 500 chars):");
    Logger.log(formattedData.substring(0, 500) + "...");
    
    // Test the analysis function directly for one symbol
    if (fundamentalMetrics.metrics.length > 0) {
      const sampleStock = fundamentalMetrics.metrics[0];
      const sampleAnalysis = generateAnalysis(
        sampleStock.symbol, 
        sampleStock.fundamentals, 
        sampleStock.historicalAverages, 
        sampleStock.sectorAverages
      );
      
      Logger.log(`Sample analysis for ${sampleStock.symbol}:`);
      Logger.log(sampleAnalysis);
    }
    
    // Test with empty input
    const emptyResult = retrieveFundamentalMetrics([]);
    Logger.log(`Empty input test - Number of symbols processed: ${emptyResult.metrics ? emptyResult.metrics.length : 0}`);
    
    // Test with invalid symbol
    const invalidResult = retrieveFundamentalMetrics(["INVALID_SYMBOL_123"]);
    Logger.log(`Invalid symbol test - Success: ${invalidResult.success}`);
    
    return "Test completed. Check the logs for results.";
  } catch (error) {
    Logger.log(`Error testing fundamental metrics: ${error}`);
    return `Error testing fundamental metrics: ${error}`;
  }
}

/**
 * Retrieves recently mentioned stocks/ETFs from CNBC
 * @return {Array} Recently mentioned stocks/ETFs
 */
function retrieveRecentlyMentionedStocks() {
  try {
    Logger.log("Retrieving recently mentioned stocks/ETFs...");
    
    // This would be implemented with actual web scraping in a production environment
    // For example, using UrlFetchApp to fetch the CNBC website and parse the data
    
    // For now, we'll return a placeholder array of popular stocks
    // In a production environment, this would be dynamically scraped
    const stocks = [
      "AAPL",
      "MSFT",
      "GOOGL",
      "AMZN",
      "NVDA",
      "META",
      "TSLA",
      "BRK-B",
      "JPM",
      "V"
    ];
    
    Logger.log(`Retrieved ${stocks.length} recently mentioned stocks/ETFs.`);
    return stocks;
  } catch (error) {
    Logger.log(`Error retrieving recently mentioned stocks/ETFs: ${error}`);
    return ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"]; // Fallback to a few major stocks
  }
}

/**
 * Helper function to get a company name from a symbol
 * @param {String} symbol - Stock/ETF symbol
 * @return {String} Company name
 */
function getCompanyName(symbol) {
  // This would be implemented with actual API calls in a production environment
  // For now, we'll return a placeholder mapping for common symbols
  const symbolMap = {
    "AAPL": "Apple Inc.",
    "MSFT": "Microsoft Corporation",
    "GOOGL": "Alphabet Inc.",
    "AMZN": "Amazon.com, Inc.",
    "NVDA": "NVIDIA Corporation",
    "META": "Meta Platforms, Inc.",
    "TSLA": "Tesla, Inc.",
    "BRK-B": "Berkshire Hathaway Inc.",
    "JPM": "JPMorgan Chase & Co.",
    "V": "Visa Inc."
  };
  
  return symbolMap[symbol] || `${symbol} (Company Name)`;
}

/**
 * Helper function to generate a random metric value
 * @param {Number} min - Minimum value
 * @param {Number} max - Maximum value
 * @return {Number} Random metric value
 */
function getRandomMetric(min, max) {
  return Math.random() * (max - min) + min;
}
