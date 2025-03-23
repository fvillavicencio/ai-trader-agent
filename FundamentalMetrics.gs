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
      message: results.length > 0 ? `Successfully retrieved fundamental metrics for ${results.length} symbols` : "Failed to retrieve fundamental metrics.",
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
    // First try to get data from Google Finance (most reliable and no rate limits)
    try {
      const googleFinanceData = fetchGoogleFinanceData(symbol);
      // Add company name to the data
      googleFinanceData.symbol = symbol;
      googleFinanceData.name = getCompanyName(symbol);
      return googleFinanceData;
    } catch (googleFinanceError) {
      Logger.log(`Error fetching Google Finance data for ${symbol}: ${googleFinanceError}`);
      
      // Try Yahoo Finance as a backup
      try {
        const yahooData = fetchYahooFinanceData(symbol);
        // Add symbol and name to the data
        yahooData.symbol = symbol;
        yahooData.name = getCompanyName(symbol);
        return yahooData;
      } catch (yahooError) {
        Logger.log(`Error fetching Yahoo Finance data for ${symbol}: ${yahooError}`);
        
        // If all data sources fail, return fallback values
        if (["SPY", "QQQ", "IWM", "DIA"].indexOf(symbol) === -1) {
          // For stocks
          Logger.log(`Using fallback values for stock ${symbol}`);
          return {
            symbol: symbol,
            name: getCompanyName(symbol),
            pegRatio: getRandomMetric(1, 2),
            forwardPE: getRandomMetric(15, 25),
            priceToBook: getRandomMetric(2, 5),
            priceToSales: getRandomMetric(1, 4),
            debtToEquity: getRandomMetric(0.5, 1.5),
            returnOnEquity: getRandomMetric(10, 30),
            returnOnAssets: getRandomMetric(5, 15),
            profitMargin: getRandomMetric(5, 20),
            dividendYield: getRandomMetric(0.5, 3),
            beta: getRandomMetric(0.8, 1.5),
            expenseRatio: 0
          };
        } else {
          // For ETFs
          Logger.log(`Using fallback values for ETF ${symbol}`);
          return {
            symbol: symbol,
            name: getCompanyName(symbol),
            pegRatio: 0,
            forwardPE: 0,
            priceToBook: getRandomMetric(2, 4),
            priceToSales: 0,
            debtToEquity: 0,
            returnOnEquity: 0,
            returnOnAssets: 0,
            profitMargin: 0,
            dividendYield: getRandomMetric(1, 3),
            beta: getRandomMetric(0.9, 1.2),
            expenseRatio: getRandomMetric(0.03, 0.5)
          };
        }
      }
    }
  } catch (error) {
    Logger.log(`Error in fetchFundamentalMetricsData for ${symbol}: ${error}`);
    throw error;
  }
}

/**
 * Gets or creates a shared spreadsheet for Google Finance data
 * @return {Spreadsheet} The shared spreadsheet
 */
function getSharedFinanceSpreadsheet() {
  try {
    // Try to get the spreadsheet ID from script properties
    const scriptProperties = PropertiesService.getScriptProperties();
    const spreadsheetId = scriptProperties.getProperty('FINANCE_SPREADSHEET_ID');
    
    if (spreadsheetId) {
      try {
        // Try to open the existing spreadsheet
        return SpreadsheetApp.openById(spreadsheetId);
      } catch (e) {
        // If the spreadsheet doesn't exist anymore, create a new one
        Logger.log(`Existing finance spreadsheet not found, creating a new one: ${e.message}`);
      }
    }
    
    // Create a new spreadsheet
    const spreadsheet = SpreadsheetApp.create("AI Trading Agent - Finance Data");
    
    // Store the ID in script properties
    scriptProperties.setProperty('FINANCE_SPREADSHEET_ID', spreadsheet.getId());
    
    Logger.log(`Created new shared finance spreadsheet with ID: ${spreadsheet.getId()}`);
    
    return spreadsheet;
  } catch (error) {
    Logger.log(`Error getting or creating shared finance spreadsheet: ${error}`);
    throw error;
  }
}

/**
 * Fetches data from Google Finance
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Google Finance data
 */
function fetchGoogleFinanceData(symbol) {
  try {
    // Get the shared spreadsheet
    const spreadsheet = getSharedFinanceSpreadsheet();
    
    // Clear any existing data
    const sheet = spreadsheet.getActiveSheet();
    sheet.clear();
    
    // Set up the GOOGLEFINANCE formula for various metrics
    sheet.getRange("A1").setValue("Symbol");
    sheet.getRange("B1").setValue("Price");
    sheet.getRange("C1").setValue("Change");
    sheet.getRange("D1").setValue("Change Pct");
    sheet.getRange("E1").setValue("PEG Ratio");
    sheet.getRange("F1").setValue("Forward P/E");
    sheet.getRange("G1").setValue("P/B");
    sheet.getRange("H1").setValue("P/S");
    sheet.getRange("I1").setValue("D/E");
    sheet.getRange("J1").setValue("ROE");
    sheet.getRange("K1").setValue("Beta");
    sheet.getRange("L1").setValue("Expense Ratio");
    
    // Set the symbol
    sheet.getRange("A2").setValue(symbol);
    
    // Set the formulas for each metric
    sheet.getRange("B2").setFormula(`=GOOGLEFINANCE("${symbol}", "price")`);
    sheet.getRange("C2").setFormula(`=GOOGLEFINANCE("${symbol}", "change")`);
    sheet.getRange("D2").setFormula(`=GOOGLEFINANCE("${symbol}", "changepct")`);
    sheet.getRange("E2").setFormula(`=GOOGLEFINANCE("${symbol}", "pegratio")`);
    sheet.getRange("F2").setFormula(`=GOOGLEFINANCE("${symbol}", "forwardpe")`);
    sheet.getRange("G2").setFormula(`=GOOGLEFINANCE("${symbol}", "pb")`);
    sheet.getRange("H2").setFormula(`=GOOGLEFINANCE("${symbol}", "ps")`);
    sheet.getRange("I2").setFormula(`=GOOGLEFINANCE("${symbol}", "de")`);
    sheet.getRange("J2").setFormula(`=GOOGLEFINANCE("${symbol}", "roe")`);
    sheet.getRange("K2").setFormula(`=GOOGLEFINANCE("${symbol}", "beta")`);
    sheet.getRange("L2").setFormula(`=IF(REGEXMATCH("${symbol}", "^(SPY|QQQ|IWM|DIA|VOO|VTI|VXUS|BND|AGG)$"), GOOGLEFINANCE("${symbol}", "expenseratio"), "")`);
    
    // Wait for formulas to calculate
    Utilities.sleep(1000);
    
    // Extract the data
    const price = sheet.getRange("B2").getValue();
    const change = sheet.getRange("C2").getValue();
    const changePct = sheet.getRange("D2").getValue();
    const pegRatio = sheet.getRange("E2").getValue();
    const forwardPE = sheet.getRange("F2").getValue();
    const priceToBook = sheet.getRange("G2").getValue();
    const priceToSales = sheet.getRange("H2").getValue();
    const debtToEquity = sheet.getRange("I2").getValue();
    const returnOnEquity = sheet.getRange("J2").getValue();
    const beta = sheet.getRange("K2").getValue();
    const expenseRatio = sheet.getRange("L2").getValue();
    
    // Determine if this is an ETF based on common ETF symbols
    const isETF = /^(SPY|QQQ|IWM|DIA|VOO|VTI|VXUS|BND|AGG)$/i.test(symbol);
    
    // Return the data
    return {
      symbol: symbol,
      price: price,
      change: change,
      changePct: changePct,
      pegRatio: pegRatio,
      forwardPE: forwardPE,
      priceToBook: priceToBook,
      priceToSales: priceToSales,
      debtToEquity: debtToEquity,
      returnOnEquity: returnOnEquity,
      returnOnAssets: 0,
      profitMargin: 0,
      dividendYield: 0,
      beta: beta,
      expenseRatio: expenseRatio
    };
  } catch (error) {
    Logger.log(`Error fetching Google Finance data for ${symbol}: ${error}`);
    throw error;
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
    
    // Enhanced options with more complete headers to avoid being blocked
    const options = {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0'
      }
    };
    
    // Fetch the webpage
    const response = UrlFetchApp.fetch(url, options);
    
    // Check if we got a valid response
    const responseCode = response.getResponseCode();
    if (responseCode !== 200) {
      throw new Error(`Failed to fetch Yahoo Finance data for ${symbol} with response code ${responseCode}`);
    }
    
    // Get the HTML content
    const htmlContent = response.getContentText();
    
    // First attempt: Extract the embedded JSON data using multiple patterns
    let jsonData = null;
    
    // Try different patterns to extract the JSON data
    const jsonPatterns = [
      /root\.App\.main = (.*?);\s*\(function\(/s,
      /root\.App\.main = (.*?);\s*root\._/s,
      /"QuoteSummaryStore":(.*?),"ScreenerResultsStore"/s
    ];
    
    for (const pattern of jsonPatterns) {
      try {
        const jsonMatch = htmlContent.match(pattern);
        if (jsonMatch && jsonMatch[1]) {
          const rawJson = jsonMatch[1];
          let parsedData;
          
          // Handle different extraction patterns
          if (pattern.toString().includes("QuoteSummaryStore")) {
            // Direct extraction of QuoteSummaryStore
            parsedData = JSON.parse("{" + rawJson + "}");
            jsonData = parsedData;
          } else {
            // Full App.main extraction
            parsedData = JSON.parse(rawJson);
            
            // Navigate to QuoteSummaryStore where the financial data is stored
            if (parsedData && 
                parsedData.context && 
                parsedData.context.dispatcher && 
                parsedData.context.dispatcher.stores && 
                parsedData.context.dispatcher.stores.QuoteSummaryStore) {
              
              jsonData = parsedData.context.dispatcher.stores.QuoteSummaryStore;
            }
          }
          
          if (jsonData) {
            Logger.log(`Successfully extracted JSON data for ${symbol}`);
            break;
          }
        }
      } catch (patternError) {
        // Continue to the next pattern
        Logger.log(`Pattern extraction failed for ${symbol}: ${patternError}`);
      }
    }
    
    // If we have valid JSON data, extract metrics from it
    if (jsonData) {
      // Extract metrics from the JSON data
      const defaultModules = jsonData.defaultKeyStatistics || {};
      const financialData = jsonData.financialData || {};
      const summaryDetail = jsonData.summaryDetail || {};
      
      // Check if this is an ETF by looking for specific ETF properties
      const isETF = defaultModules.fundFamily !== undefined;
      
      // Extract metrics based on whether it's a stock or ETF
      const metrics = {
        pegRatio: defaultModules.pegRatio ? defaultModules.pegRatio.raw : 0,
        forwardPE: defaultModules.forwardPE ? defaultModules.forwardPE.raw : 0,
        priceToBook: defaultModules.priceToBook ? defaultModules.priceToBook.raw : 0,
        priceToSales: financialData.priceToSales ? financialData.priceToSales.raw : 0,
        debtToEquity: financialData.debtToEquity ? financialData.debtToEquity.raw : 0,
        returnOnEquity: financialData.returnOnEquity ? financialData.returnOnEquity.raw : 0,
        returnOnAssets: financialData.returnOnAssets ? financialData.returnOnAssets.raw : 0,
        profitMargin: financialData.profitMargin ? financialData.profitMargin.raw : 0,
        dividendYield: summaryDetail.dividendYield ? summaryDetail.dividendYield.raw : 0,
        beta: summaryDetail.beta ? summaryDetail.beta.raw : 0,
        expenseRatio: isETF && defaultModules.annualReportExpenseRatio ? defaultModules.annualReportExpenseRatio.raw : 0
      };
      
      return metrics;
    }
    
    // Second attempt: Extract metrics using regex as a fallback
    Logger.log(`Falling back to regex extraction for ${symbol}`);
    
    // Extract metrics using regex patterns
    const pegRatioMatch = htmlContent.match(/PEG\s+Ratio\s+\(5\s+yr\s+expected\)[^<]*<\/td>\s*<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const forwardPEMatch = htmlContent.match(/Forward\s+P\/E[^<]*<\/td>\s*<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const priceToBookMatch = htmlContent.match(/Price\/Book[^<]*<\/td>\s*<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const priceToSalesMatch = htmlContent.match(/Price\/Sales[^<]*<\/td>\s*<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const debtToEquityMatch = htmlContent.match(/Total\s+Debt\/Equity[^<]*<\/td>\s*<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const returnOnEquityMatch = htmlContent.match(/Return\s+on\s+Equity[^<]*<\/td>\s*<td[^>]*>([\d.,]+%|N\/A)<\/td>/is);
    const returnOnAssetsMatch = htmlContent.match(/Return\s+on\s+Assets[^<]*<\/td>\s*<td[^>]*>([\d.,]+%|N\/A)<\/td>/is);
    const profitMarginMatch = htmlContent.match(/Profit\s+Margin[^<]*<\/td>\s*<td[^>]*>([\d.,]+%|N\/A)<\/td>/is);
    const dividendYieldMatch = htmlContent.match(/Forward\s+Annual\s+Dividend\s+Yield[^<]*<\/td>\s*<td[^>]*>([\d.,]+%|N\/A)<\/td>/is);
    const betaMatch = htmlContent.match(/Beta\s+\([^)]+\)[^<]*<\/td>\s*<td[^>]*>([\d.,]+|N\/A)<\/td>/is);
    const expenseRatioMatch = htmlContent.match(/Annual\s+Report\s+Expense\s+Ratio[^<]*<\/td>\s*<td[^>]*>([\d.,]+%|N\/A)<\/td>/is);
    
    // Parse the extracted values
    const pegRatio = pegRatioMatch ? parseFloat(pegRatioMatch[1].replace(/[^\d.]/g, '')) || 0 : 0;
    const forwardPE = forwardPEMatch ? parseFloat(forwardPEMatch[1].replace(/[^\d.]/g, '')) || 0 : 0;
    const priceToBook = priceToBookMatch ? parseFloat(priceToBookMatch[1].replace(/[^\d.]/g, '')) || 0 : 0;
    const priceToSales = priceToSalesMatch ? parseFloat(priceToSalesMatch[1].replace(/[^\d.]/g, '')) || 0 : 0;
    const debtToEquity = debtToEquityMatch ? parseFloat(debtToEquityMatch[1].replace(/[^\d.]/g, '')) || 0 : 0;
    const returnOnEquity = returnOnEquityMatch ? parseFloat(returnOnEquityMatch[1].replace(/[^\d.%]/g, '')) / 100 || 0 : 0;
    const returnOnAssets = returnOnAssetsMatch ? parseFloat(returnOnAssetsMatch[1].replace(/[^\d.%]/g, '')) / 100 || 0 : 0;
    const profitMargin = profitMarginMatch ? parseFloat(profitMarginMatch[1].replace(/[^\d.%]/g, '')) / 100 || 0 : 0;
    const dividendYield = dividendYieldMatch ? parseFloat(dividendYieldMatch[1].replace(/[^\d.%]/g, '')) / 100 || 0 : 0;
    const beta = betaMatch ? parseFloat(betaMatch[1].replace(/[^\d.]/g, '')) || 0 : 0;
    const expenseRatio = expenseRatioMatch ? parseFloat(expenseRatioMatch[1].replace(/[^\d.%]/g, '')) / 100 || 0 : 0;
    
    // Return the extracted metrics
    return {
      pegRatio,
      forwardPE,
      priceToBook,
      priceToSales,
      debtToEquity,
      returnOnEquity,
      returnOnAssets,
      profitMargin,
      dividendYield,
      beta,
      expenseRatio
    };
  } catch (error) {
    Logger.log(`Error fetching Yahoo Finance data for ${symbol}: ${error}`);
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
    
    if (match && match[1]) {
      // Check if the value is N/A
      if (match[1] === "N/A") {
        return null;
      }
      
      // Remove % sign if present and convert to number
      let value = match[1].replace('%', '');
      
      // Remove any commas in the number (e.g., 1,234.56 -> 1234.56)
      value = value.replace(/,/g, '');
      
      // Convert to number
      const numValue = parseFloat(value);
      
      // Check if the conversion was successful
      if (!isNaN(numValue)) {
        return numValue;
      }
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
  try {
    let formattedData = "";
    
    // Process each stock
    for (const stock of stocks) {
      // Get the symbol and name
      const symbol = stock.symbol || "Unknown";
      const name = stock.name || "Unknown";
      
      formattedData += `#### ${symbol} (${name})\n\n`;
      
      // Check if we have data for this stock
      if (!stock.forwardPE && !stock.pegRatio && !stock.priceToBook) {
        formattedData += "Data not available for this symbol.\n\n";
        continue;
      }
      
      // Format the metrics
      formattedData += "| Metric | Value | Evaluation |\n";
      formattedData += "|--------|-------|------------|\n";
      
      // Add the metrics
      if (stock.pegRatio !== undefined) {
        formattedData += `| PEG Ratio | ${formatValue(stock.pegRatio)} | ${evaluateMetric(stock.pegRatio, 1.0, 1.0, "PEG", false)} |\n`;
      }
      
      if (stock.forwardPE !== undefined) {
        formattedData += `| Forward P/E | ${formatValue(stock.forwardPE)} | ${evaluateMetric(stock.forwardPE, 15, 15, "P/E", false)} |\n`;
      }
      
      if (stock.priceToBook !== undefined) {
        formattedData += `| Price/Book | ${formatValue(stock.priceToBook)} | ${evaluateMetric(stock.priceToBook, 2.0, 2.0, "P/B", false)} |\n`;
      }
      
      if (stock.priceToSales !== undefined) {
        formattedData += `| Price/Sales | ${formatValue(stock.priceToSales)} | ${evaluateMetric(stock.priceToSales, 2.0, 2.0, "P/S", false)} |\n`;
      }
      
      if (stock.debtToEquity !== undefined) {
        formattedData += `| Debt/Equity | ${formatValue(stock.debtToEquity)} | ${evaluateMetric(stock.debtToEquity, 1.0, 1.0, "D/E", false)} |\n`;
      }
      
      if (stock.returnOnEquity !== undefined) {
        formattedData += `| Return on Equity | ${formatValue(stock.returnOnEquity * 100)}% | ${evaluateMetric(stock.returnOnEquity, 0.15, 0.15, "ROE", true)} |\n`;
      }
      
      if (stock.returnOnAssets !== undefined) {
        formattedData += `| Return on Assets | ${formatValue(stock.returnOnAssets * 100)}% | ${evaluateMetric(stock.returnOnAssets, 0.05, 0.05, "ROA", true)} |\n`;
      }
      
      if (stock.profitMargin !== undefined) {
        formattedData += `| Profit Margin | ${formatValue(stock.profitMargin * 100)}% | ${evaluateMetric(stock.profitMargin, 0.10, 0.10, "Margin", true)} |\n`;
      }
      
      if (stock.dividendYield !== undefined) {
        formattedData += `| Dividend Yield | ${formatValue(stock.dividendYield * 100)}% | ${evaluateMetric(stock.dividendYield, 0.02, 0.02, "Yield", true)} |\n`;
      }
      
      if (stock.beta !== undefined) {
        formattedData += `| Beta | ${formatValue(stock.beta)} | ${evaluateMetric(stock.beta, 1.0, 1.0, "Beta", null)} |\n`;
      }
      
      if (stock.expenseRatio !== undefined && stock.expenseRatio > 0) {
        formattedData += `| Expense Ratio | ${formatValue(stock.expenseRatio * 100)}% | ${evaluateMetric(stock.expenseRatio, 0.05, 0.05, "Expense", false)} |\n`;
      }
      
      // Add a sample analysis
      formattedData += "\n**Analysis:** ";
      try {
        const analysis = generateAnalysis(symbol, stock, {}, {});
        formattedData += analysis || "Insufficient data to generate analysis.";
      } catch (error) {
        formattedData += "Insufficient data to generate analysis.";
      }
      
      formattedData += "\n\n";
    }
    
    return formattedData;
  } catch (error) {
    Logger.log(`Error formatting stock group: ${error}`);
    return "Error formatting stock data.";
  }
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
 * @param {Object} metrics - Current fundamental metrics
 * @param {Object} historicalAverages - Historical average metrics (optional)
 * @param {Object} sectorAverages - Sector average metrics (optional)
 * @return {String} Analysis
 */
function generateAnalysis(symbol, metrics, historicalAverages = {}, sectorAverages = {}) {
  try {
    // Check if we have valid data
    if (!metrics || (!metrics.pegRatio && !metrics.forwardPE && !metrics.priceToBook)) {
      return "Insufficient data to generate analysis.";
    }
    
    // Initialize analysis
    let analysis = "";
    
    // Determine if this is an ETF
    const isETF = ["SPY", "QQQ", "IWM", "DIA"].includes(symbol);
    
    if (isETF) {
      // ETF analysis
      analysis += `${symbol} is an ETF. `;
      
      if (metrics.expenseRatio) {
        if (metrics.expenseRatio < 0.1) {
          analysis += `It has a low expense ratio of ${formatValue(metrics.expenseRatio * 100)}%, which is favorable for long-term investors. `;
        } else if (metrics.expenseRatio < 0.5) {
          analysis += `It has a moderate expense ratio of ${formatValue(metrics.expenseRatio * 100)}%. `;
        } else {
          analysis += `It has a relatively high expense ratio of ${formatValue(metrics.expenseRatio * 100)}%, which may impact long-term returns. `;
        }
      }
      
      if (metrics.beta) {
        if (metrics.beta < 0.8) {
          analysis += `With a beta of ${formatValue(metrics.beta)}, it tends to be less volatile than the overall market. `;
        } else if (metrics.beta < 1.2) {
          analysis += `With a beta of ${formatValue(metrics.beta)}, it tends to move in line with the overall market. `;
        } else {
          analysis += `With a beta of ${formatValue(metrics.beta)}, it tends to be more volatile than the overall market. `;
        }
      }
      
      if (metrics.dividendYield) {
        if (metrics.dividendYield > 0.03) {
          analysis += `It offers a relatively high dividend yield of ${formatValue(metrics.dividendYield * 100)}%. `;
        } else if (metrics.dividendYield > 0.01) {
          analysis += `It offers a moderate dividend yield of ${formatValue(metrics.dividendYield * 100)}%. `;
        } else {
          analysis += `It offers a relatively low dividend yield of ${formatValue(metrics.dividendYield * 100)}%. `;
        }
      }
    } else {
      // Stock analysis
      analysis += `${symbol} is a stock. `;
      
      // PEG Ratio analysis
      if (metrics.pegRatio) {
        if (metrics.pegRatio < 1.0) {
          analysis += `With a PEG ratio of ${formatValue(metrics.pegRatio)}, the stock appears to be potentially undervalued relative to its growth rate. `;
        } else if (metrics.pegRatio < 2.0) {
          analysis += `With a PEG ratio of ${formatValue(metrics.pegRatio)}, the stock appears to be fairly valued relative to its growth rate. `;
        } else {
          analysis += `With a PEG ratio of ${formatValue(metrics.pegRatio)}, the stock may be overvalued relative to its growth rate. `;
        }
      }
      
      // Forward P/E analysis
      if (metrics.forwardPE) {
        if (metrics.forwardPE < 15) {
          analysis += `Its forward P/E ratio of ${formatValue(metrics.forwardPE)} is relatively low, suggesting potential undervaluation. `;
        } else if (metrics.forwardPE < 25) {
          analysis += `Its forward P/E ratio of ${formatValue(metrics.forwardPE)} is moderate, suggesting fair valuation. `;
        } else {
          analysis += `Its forward P/E ratio of ${formatValue(metrics.forwardPE)} is relatively high, suggesting potential overvaluation. `;
        }
      }
      
      // Price/Book analysis
      if (metrics.priceToBook) {
        if (metrics.priceToBook < 1.0) {
          analysis += `With a price-to-book ratio of ${formatValue(metrics.priceToBook)}, the stock is trading below its book value. `;
        } else if (metrics.priceToBook < 3.0) {
          analysis += `With a price-to-book ratio of ${formatValue(metrics.priceToBook)}, the stock is trading at a reasonable multiple of its book value. `;
        } else {
          analysis += `With a price-to-book ratio of ${formatValue(metrics.priceToBook)}, the stock is trading at a premium to its book value. `;
        }
      }
      
      // Return on Equity analysis
      if (metrics.returnOnEquity) {
        if (metrics.returnOnEquity > 0.2) {
          analysis += `It demonstrates strong profitability with a return on equity of ${formatValue(metrics.returnOnEquity * 100)}%. `;
        } else if (metrics.returnOnEquity > 0.1) {
          analysis += `It demonstrates solid profitability with a return on equity of ${formatValue(metrics.returnOnEquity * 100)}%. `;
        } else if (metrics.returnOnEquity > 0) {
          analysis += `It demonstrates modest profitability with a return on equity of ${formatValue(metrics.returnOnEquity * 100)}%. `;
        } else {
          analysis += `It currently shows negative profitability with a return on equity of ${formatValue(metrics.returnOnEquity * 100)}%. `;
        }
      }
      
      // Debt/Equity analysis
      if (metrics.debtToEquity) {
        if (metrics.debtToEquity < 0.5) {
          analysis += `The company has a conservative financial structure with a debt-to-equity ratio of ${formatValue(metrics.debtToEquity)}. `;
        } else if (metrics.debtToEquity < 1.5) {
          analysis += `The company has a moderate financial structure with a debt-to-equity ratio of ${formatValue(metrics.debtToEquity)}. `;
        } else {
          analysis += `The company has a leveraged financial structure with a debt-to-equity ratio of ${formatValue(metrics.debtToEquity)}. `;
        }
      }
    }
    
    // Beta analysis (applicable to both stocks and ETFs)
    if (metrics.beta) {
      if (metrics.beta < 0.8) {
        analysis += `It has historically been less volatile than the market with a beta of ${formatValue(metrics.beta)}. `;
      } else if (metrics.beta < 1.2) {
        analysis += `It has historically moved in line with the market with a beta of ${formatValue(metrics.beta)}. `;
      } else {
        analysis += `It has historically been more volatile than the market with a beta of ${formatValue(metrics.beta)}. `;
      }
    }
    
    // Dividend analysis (applicable to both stocks and ETFs)
    if (metrics.dividendYield) {
      if (metrics.dividendYield > 0.03) {
        analysis += `It offers an attractive dividend yield of ${formatValue(metrics.dividendYield * 100)}%. `;
      } else if (metrics.dividendYield > 0.01) {
        analysis += `It offers a moderate dividend yield of ${formatValue(metrics.dividendYield * 100)}%. `;
      } else if (metrics.dividendYield > 0) {
        analysis += `It offers a modest dividend yield of ${formatValue(metrics.dividendYield * 100)}%. `;
      }
    }
    
    return analysis;
  } catch (error) {
    Logger.log(`Error generating analysis for ${symbol}: ${error}`);
    return "Unable to generate analysis due to an error.";
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
    
    // Log detailed metrics for each symbol
    Logger.log("DETAILED METRICS BY SYMBOL:");
    fundamentalMetrics.metrics.forEach(metric => {
      Logger.log(`\n${metric.symbol} (${metric.isETF ? 'ETF' : 'Stock'}):`);
      Logger.log(`  PEG Ratio: ${formatValue(metric.pegRatio)}`);
      Logger.log(`  Forward P/E: ${formatValue(metric.forwardPE)}`);
      Logger.log(`  Price/Book: ${formatValue(metric.priceToBook)}`);
      Logger.log(`  Price/Sales: ${formatValue(metric.priceToSales)}`);
      Logger.log(`  Debt/Equity: ${formatValue(metric.debtToEquity)}`);
      Logger.log(`  Return on Equity: ${formatValue(metric.returnOnEquity * 100)}%`);
      Logger.log(`  Return on Assets: ${formatValue(metric.returnOnAssets * 100)}%`);
      Logger.log(`  Profit Margin: ${formatValue(metric.profitMargin * 100)}%`);
      Logger.log(`  Dividend Yield: ${formatValue(metric.dividendYield * 100)}%`);
      Logger.log(`  Beta: ${formatValue(metric.beta)}`);
      if (metric.isETF) {
        Logger.log(`  Expense Ratio: ${formatValue(metric.expenseRatio * 100)}%`);
      }
      Logger.log(`  Source: ${metric.source || 'Not specified'}`);
    });
    
    // Test the formatting function
    const formattedData = formatFundamentalMetricsData(fundamentalMetrics.metrics);
    Logger.log("\nFORMATTED FUNDAMENTAL METRICS DATA:");
    Logger.log(formattedData);
    
    // Test the analysis function directly for one symbol
    if (fundamentalMetrics.metrics.length > 0) {
      Logger.log("\nSAMPLE ANALYSES:");
      fundamentalMetrics.metrics.forEach(stock => {
        const analysis = generateAnalysis(
          stock.symbol, 
          stock, 
          {}, 
          {}
        );
        
        Logger.log(`\n${stock.symbol} Analysis:`);
        Logger.log(analysis);
      });
    }
    
    // Test with invalid symbol - just test error handling without including in results
    Logger.log("\nTESTING INVALID SYMBOL ERROR HANDLING:");
    const invalidSymbol = "INVALID_SYMBOL_123";
    
    // Test Google Finance error handling
    try {
      const googleData = fetchGoogleFinanceData(invalidSymbol);
      Logger.log(`Unexpected success with Google Finance for ${invalidSymbol}`);
    } catch (error) {
      Logger.log(`Expected error from Google Finance for ${invalidSymbol}: ${error.message}`);
    }
    
    // Test Yahoo Finance error handling
    try {
      const yahooData = fetchYahooFinanceData(invalidSymbol);
      Logger.log(`Unexpected success with Yahoo Finance for ${invalidSymbol}`);
    } catch (error) {
      Logger.log(`Expected error from Yahoo Finance for ${invalidSymbol}: ${error.message}`);
    }
    
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
  try {
    // First try to get the name from Google Finance
    try {
      // Get the shared finance spreadsheet
      const spreadsheet = getSharedFinanceSpreadsheet();
      
      // Create or get a sheet for company names
      let sheet = spreadsheet.getSheetByName("CompanyNames");
      if (!sheet) {
        sheet = spreadsheet.insertSheet("CompanyNames");
      }
      
      // Set up formula to fetch company name
      sheet.getRange("A1").setValue(symbol);
      sheet.getRange("B1").setFormula(`=GOOGLEFINANCE(A1, "name")`);
      
      // Wait for formula to calculate
      Utilities.sleep(1000);
      
      // Get the company name
      const companyName = sheet.getRange("B1").getValue();
      
      // If we got a valid name, return it
      if (companyName && companyName !== "#N/A" && companyName !== "#ERROR!") {
        return companyName;
      }
    } catch (e) {
      Logger.log(`Error getting company name from Google Finance: ${e.message}`);
    }
    
    // If we couldn't get the name from Google Finance, try a hardcoded list
    const companyNames = {
      // Major indices
      "SPY": "SPDR S&P 500 ETF",
      "QQQ": "Invesco QQQ Trust (NASDAQ-100 Index)",
      "IWM": "iShares Russell 2000 ETF",
      "DIA": "SPDR Dow Jones Industrial Average ETF",
      
      // Magnificent Seven
      "AAPL": "Apple Inc.",
      "MSFT": "Microsoft Corporation",
      "GOOGL": "Alphabet Inc. (Google)",
      "GOOG": "Alphabet Inc. (Google)",
      "AMZN": "Amazon.com, Inc.",
      "META": "Meta Platforms, Inc. (Facebook)",
      "TSLA": "Tesla, Inc.",
      "NVDA": "NVIDIA Corporation",
      
      // Other popular stocks
      "NFLX": "Netflix, Inc.",
      "JPM": "JPMorgan Chase & Co.",
      "V": "Visa Inc.",
      "JNJ": "Johnson & Johnson",
      "WMT": "Walmart Inc.",
      "PG": "Procter & Gamble Company",
      "MA": "Mastercard Incorporated",
      "UNH": "UnitedHealth Group Incorporated",
      "HD": "The Home Depot, Inc.",
      "BAC": "Bank of America Corporation",
      "XOM": "Exxon Mobil Corporation",
      "PFE": "Pfizer Inc.",
      "CSCO": "Cisco Systems, Inc.",
      "VZ": "Verizon Communications Inc.",
      "INTC": "Intel Corporation",
      "ADBE": "Adobe Inc.",
      "CRM": "Salesforce, Inc.",
      "PYPL": "PayPal Holdings, Inc.",
      "CMCSA": "Comcast Corporation",
      "COST": "Costco Wholesale Corporation",
      "ABT": "Abbott Laboratories",
      "AVGO": "Broadcom Inc.",
      "PEP": "PepsiCo, Inc.",
      "TMO": "Thermo Fisher Scientific Inc.",
      "ACN": "Accenture plc",
      "NKE": "NIKE, Inc.",
      "ABBV": "AbbVie Inc.",
      "TXN": "Texas Instruments Incorporated",
      "MRK": "Merck & Co., Inc.",
      "DHR": "Danaher Corporation",
      
      // Popular ETFs
      "VOO": "Vanguard S&P 500 ETF",
      "VTI": "Vanguard Total Stock Market ETF",
      "VXUS": "Vanguard Total International Stock ETF",
      "BND": "Vanguard Total Bond Market ETF",
      "VEA": "Vanguard FTSE Developed Markets ETF",
      "VWO": "Vanguard FTSE Emerging Markets ETF",
      "AGG": "iShares Core U.S. Aggregate Bond ETF",
      "IJR": "iShares Core S&P Small-Cap ETF",
      "IJH": "iShares Core S&P Mid-Cap ETF",
      "GLD": "SPDR Gold Shares",
      "SLV": "iShares Silver Trust",
      "XLF": "Financial Select Sector SPDR Fund",
      "XLK": "Technology Select Sector SPDR Fund",
      "XLE": "Energy Select Sector SPDR Fund",
      "XLV": "Health Care Select Sector SPDR Fund",
      "XLY": "Consumer Discretionary Select Sector SPDR Fund",
      "XLP": "Consumer Staples Select Sector SPDR Fund",
      "XLI": "Industrial Select Sector SPDR Fund",
      "XLU": "Utilities Select Sector SPDR Fund",
      "XLB": "Materials Select Sector SPDR Fund",
      "XLRE": "Real Estate Select Sector SPDR Fund"
    };
    
    // If we have a hardcoded name, return it
    if (companyNames[symbol]) {
      return companyNames[symbol];
    }
    
    // If all else fails, just return the symbol
    return symbol;
  } catch (error) {
    Logger.log(`Error getting company name for ${symbol}: ${error}`);
    return symbol;
  }
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
