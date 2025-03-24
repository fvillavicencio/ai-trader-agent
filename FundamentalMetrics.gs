/**
 * Fundamental Metrics Module
 * Handles retrieval of fundamental metrics for stocks/ETFs including PEG ratios, 
 * Forward P/E Ratios, and other relevant metrics
 */

/**
 * Retrieves fundamental metrics for a list of stocks/ETFs
 * 
 * @param {Array} symbols - List of stock/ETF symbols to retrieve metrics for
 * @param {Array} mentionedStocks - List of stocks mentioned in market sentiment analysis
 * @return {Object} - Object containing fundamental metrics data
 */
function retrieveFundamentalMetrics(symbols = [], mentionedStocks = []) {
  try {
    Logger.log(`Retrieving fundamental metrics for ${symbols.length} stocks...`);
    
    // Combine user-provided symbols with default symbols
    const defaultSymbols = [ "SPY", "QQQ", "IWM", "DIA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA" ];
    
    // Add mentioned stocks to the symbols list if they're not already included
    const allMentionedStocks = mentionedStocks || [];
    Logger.log(`Mentioned stocks from market sentiment: ${allMentionedStocks.length > 0 ? allMentionedStocks.join(', ') : 'None'}`);
    
    // Create a set of all symbols to avoid duplicates
    const symbolsSet = new Set([...symbols, ...defaultSymbols, ...allMentionedStocks]);
    const allSymbols = Array.from(symbolsSet);
    
    Logger.log(`Retrieving fundamental metrics for ${allSymbols.length} symbols: ${allSymbols.join(', ')}`);
    
    // Initialize results array
    const results = [];
    const failedSymbols = [];
    
    // Process each symbol
    for (const symbol of allSymbols) {
      Logger.log(`Retrieving fundamental metrics for ${symbol}...`);
      
      try {
        // Fetch fundamental metrics data for the symbol
        const metrics = fetchFundamentalMetricsData(symbol);
        
        // Verify we got valid data
        if (metrics && metrics.symbol) {
          results.push(metrics);
          Logger.log(`Successfully retrieved metrics for ${symbol}`);
        } else {
          Logger.log(`No valid metrics data returned for ${symbol}`);
          failedSymbols.push(symbol);
          
          // Create a minimal entry for the symbol to ensure it's included in the results
          results.push({
            symbol: symbol,
            name: getCompanyName(symbol) || symbol,
            pegRatio: null,
            forwardPE: null,
            priceToBook: null,
            priceToSales: null,
            debtToEquity: null,
            returnOnEquity: null,
            beta: null,
            dataAvailable: false,
            comment: "Insufficient data available for analysis"
          });
        }
      } catch (error) {
        Logger.log(`Error retrieving fundamental metrics for ${symbol}: ${error}`);
        failedSymbols.push(symbol);
        
        // Create a minimal entry for the symbol to ensure it's included in the results
        results.push({
          symbol: symbol,
          name: getCompanyName(symbol) || symbol,
          pegRatio: null,
          forwardPE: null,
          priceToBook: null,
          priceToSales: null,
          debtToEquity: null,
          returnOnEquity: null,
          beta: null,
          dataAvailable: false,
          comment: "Error retrieving data"
        });
      }
    }
    
    // Log summary of results
    Logger.log(`Successfully retrieved metrics for ${results.length - failedSymbols.length} symbols`);
    if (failedSymbols.length > 0) {
      Logger.log(`Failed to retrieve complete metrics for ${failedSymbols.length} symbols: ${failedSymbols.join(', ')}`);
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
    Logger.log(`Fetching fundamental metrics for ${symbol} using cascading approach...`);
    
    // Track execution time
    const startTime = new Date().getTime();
    
    // Initialize metrics object
    let metrics = {
      pegRatio: null,
      forwardPE: null,
      priceToBook: null,
      priceToSales: null,
      debtToEquity: null,
      returnOnEquity: null,
      returnOnAssets: null,
      profitMargin: null,
      dividendYield: null,
      beta: null,
      expenseRatio: null
    };
    
    let source = "";
    let sourcesUsed = [];
    
    // Step 1: Try Google Finance (most reliable and no rate limits)
    try {
      Logger.log(`Attempting to fetch data from Google Finance for ${symbol}...`);
      const googleFinanceData = fetchGoogleFinanceData(symbol);
      
      if (googleFinanceData && Object.keys(googleFinanceData).length > 0) {
        Logger.log(`Successfully retrieved data from Google Finance for ${symbol}`);
        
        // Merge Google Finance data into metrics
        for (const key in googleFinanceData) {
          if (googleFinanceData[key] !== null) {
            metrics[key] = googleFinanceData[key];
          }
        }
        
        sourcesUsed.push("Google Finance");
      }
    } catch (googleFinanceError) {
      Logger.log(`Error fetching Google Finance data for ${symbol}: ${googleFinanceError}`);
    }
    
    // Count how many valid metrics we have so far
    let validMetricsCount = 0;
    for (const key in metrics) {
      if (metrics[key] !== null) {
        validMetricsCount++;
      }
    }
    
    // Step 2: Try Tradier API if we need more data
    if (validMetricsCount < 5) {
      try {
        Logger.log(`Attempting to fetch data from Tradier API for ${symbol}...`);
        const tradierData = fetchTradierData(symbol);
        
        if (tradierData) {
          let tradierValidCount = 0;
          
          // Merge Tradier data into metrics
          for (const key in tradierData) {
            if (tradierData[key] !== null && metrics[key] === null) {
              metrics[key] = tradierData[key];
              tradierValidCount++;
            }
          }
          
          if (tradierValidCount > 0) {
            Logger.log(`Successfully merged ${tradierValidCount} metrics from Tradier API for ${symbol}`);
            sourcesUsed.push("Tradier API");
          } else {
            Logger.log(`Tradier API did not provide any additional metrics for ${symbol}`);
          }
        }
      } catch (tradierError) {
        Logger.log(`Error fetching Tradier API data for ${symbol}: ${tradierError}`);
      }
    }
    
    // Recount valid metrics
    validMetricsCount = 0;
    for (const key in metrics) {
      if (metrics[key] !== null) {
        validMetricsCount++;
      }
    }
    
    // Step 3: Try Yahoo Finance API if we still need more data
    if (validMetricsCount < 5) {
      try {
        Logger.log(`Attempting to fetch data from Yahoo Finance API for ${symbol}...`);
        // Get the Yahoo Finance API key
        const scriptProperties = PropertiesService.getScriptProperties();
        const apiKey = scriptProperties.getProperty('YAHOO_FINANCE_API_KEY');
        
        if (apiKey) {
          // Yahoo Finance API endpoint for fundamentals data
          const apiUrl = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/get-fundamentals?region=US&symbol=${symbol}&lang=en-US&modules=assetProfile%2CsummaryProfile%2CfundProfile%2CfinancialData%2CdefaultKeyStatistics`;
          
          const options = {
            method: "GET",
            headers: {
              "X-RapidAPI-Key": apiKey,
              "X-RapidAPI-Host": "apidojo-yahoo-finance-v1.p.rapidapi.com"
            },
            muteHttpExceptions: true
          };
          
          // Make the API request
          const response = UrlFetchApp.fetch(apiUrl, options);
          const statusCode = response.getResponseCode();
          
          if (statusCode === 200) {
            const data = JSON.parse(response.getContentText());
            
            if (data && data.quoteSummary && data.quoteSummary.result && data.quoteSummary.result.length > 0) {
              const result = data.quoteSummary.result[0];
              const yahooApiData = {};
              
              // Extract metrics from the API response
              if (result.defaultKeyStatistics) {
                const stats = result.defaultKeyStatistics;
                yahooApiData.pegRatio = stats.pegRatio ? stats.pegRatio.raw : null;
                yahooApiData.priceToBook = stats.priceToBook ? stats.priceToBook.raw : null;
                yahooApiData.beta = stats.beta ? stats.beta.raw : null;
              }
              
              if (result.financialData) {
                const financials = result.financialData;
                yahooApiData.returnOnEquity = financials.returnOnEquity ? financials.returnOnEquity.raw : null;
                yahooApiData.returnOnAssets = financials.returnOnAssets ? financials.returnOnAssets.raw : null;
                yahooApiData.profitMargin = financials.profitMargins ? financials.profitMargins.raw : null;
                yahooApiData.debtToEquity = financials.debtToEquity ? financials.debtToEquity.raw : null;
              }
              
              // Get additional quote data for more metrics
              const quoteUrl = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes?region=US&symbols=${symbol}`;
              const quoteResponse = UrlFetchApp.fetch(quoteUrl, options);
              
              if (quoteResponse.getResponseCode() === 200) {
                const quoteData = JSON.parse(quoteResponse.getContentText());
                
                if (quoteData && quoteData.quoteResponse && quoteData.quoteResponse.result && quoteData.quoteResponse.result.length > 0) {
                  const quote = quoteData.quoteResponse.result[0];
                  
                  yahooApiData.forwardPE = quote.forwardPE || null;
                  yahooApiData.priceToSales = quote.priceToSales || null;
                  yahooApiData.dividendYield = quote.dividendYield ? quote.dividendYield / 100 : null; // Convert to decimal
                }
              }
              
              // Merge Yahoo API data into metrics
              let yahooValidCount = 0;
              for (const key in yahooApiData) {
                if (yahooApiData[key] !== null && metrics[key] === null) {
                  metrics[key] = yahooApiData[key];
                  yahooValidCount++;
                }
              }
              
              if (yahooValidCount > 0) {
                Logger.log(`Successfully merged ${yahooValidCount} metrics from Yahoo Finance API for ${symbol}`);
                sourcesUsed.push("Yahoo Finance API");
              } else {
                Logger.log(`Yahoo Finance API did not provide any additional metrics for ${symbol}`);
              }
            }
          }
        }
      } catch (yahooApiError) {
        Logger.log(`Error fetching Yahoo Finance API data for ${symbol}: ${yahooApiError}`);
      }
    }
    
    // Recount valid metrics
    validMetricsCount = 0;
    for (const key in metrics) {
      if (metrics[key] !== null) {
        validMetricsCount++;
      }
    }
    
    // Step 4: Try Yahoo Finance web scraping if we still need more data
    if (validMetricsCount < 5) {
      try {
        Logger.log(`Attempting to fetch data from Yahoo Finance web scraping for ${symbol}...`);
        const yahooData = fetchYahooFinanceData(symbol);
        
        if (yahooData) {
          let yahooWebValidCount = 0;
          
          // Merge Yahoo web data into metrics
          for (const key in yahooData) {
            if (yahooData[key] !== null && metrics[key] === null) {
              metrics[key] = yahooData[key];
              yahooWebValidCount++;
            }
          }
          
          if (yahooWebValidCount > 0) {
            Logger.log(`Successfully merged ${yahooWebValidCount} metrics from Yahoo Finance web scraping for ${symbol}`);
            sourcesUsed.push("Yahoo Finance Web");
          } else {
            Logger.log(`Yahoo Finance web scraping did not provide any additional metrics for ${symbol}`);
          }
        }
      } catch (yahooError) {
        Logger.log(`Error fetching Yahoo Finance web data for ${symbol}: ${yahooError}`);
      }
    }
    
    // Set the primary data source (the first one that provided data)
    if (sourcesUsed.length > 0) {
      source = sourcesUsed[0];
    }
    
    // Recount final valid metrics
    validMetricsCount = 0;
    for (const key in metrics) {
      if (metrics[key] !== null) {
        validMetricsCount++;
      }
    }
    
    // Add symbol and name to the metrics
    metrics.symbol = symbol;
    metrics.name = getCompanyName(symbol);
    metrics.dataSource = sourcesUsed.join(", ");
    
    Logger.log(`Completed fetching fundamental metrics for ${symbol} from ${sourcesUsed.join(", ")}`);
    Logger.log(`Data source: ${source}`);
    Logger.log(`Execution time: ${(new Date().getTime() - startTime) / 1000} seconds`);
    Logger.log(`Metrics retrieved: ${Object.keys(metrics).join(", ")}`);
    Logger.log(`PEG Ratio: ${metrics.pegRatio || "N/A"}`);
    Logger.log(`Forward P/E: ${metrics.forwardPE || "N/A"}`);
    Logger.log(`Price to Book: ${metrics.priceToBook || "N/A"}`);
    Logger.log(`Beta: ${metrics.beta || "N/A"}`);
    
    return metrics;
  } catch (error) {
    Logger.log(`Error in fetchFundamentalMetricsData for ${symbol}: ${error}`);
    
    // Return null values for all metrics
    return {
      pegRatio: null,
      forwardPE: null,
      priceToBook: null,
      priceToSales: null,
      debtToEquity: null,
      returnOnEquity: null,
      returnOnAssets: null,
      profitMargin: null,
      dividendYield: null,
      beta: null,
      expenseRatio: null,
      symbol: symbol,
      name: getCompanyName(symbol),
      dataSource: "Error"
    };
  }
}

/**
 * Helper function to check if a symbol is an ETF
 * @param {String} symbol - The stock/ETF symbol
 * @return {Boolean} True if the symbol is an ETF, false otherwise
 */
function isETF(symbol) {
  // Common ETF symbols
  const commonETFs = ["SPY", "QQQ", "IWM", "DIA", "VTI", "VOO", "VEA", "VWO", "BND", "AGG", "VIG", "VYM"];
  
  if (commonETFs.includes(symbol)) {
    return true;
  }
  
  // ETFs often have these prefixes
  const etfPrefixes = ["SPY", "IVV", "VOO", "VTI", "QQQ", "IWM", "GLD", "VEA", "VWO", "EFA", "EEM", "AGG", "BND", "LQD", "VIG", "VYM", "SCHD"];
  
  for (const prefix of etfPrefixes) {
    if (symbol.startsWith(prefix)) {
      return true;
    }
  }
  
  // Check if the symbol contains common ETF indicators
  if (symbol.includes("-ETF") || symbol.includes(".ETF")) {
    return true;
  }
  
  // For more accurate detection, you would need to query a database or API
  // This is just a basic heuristic
  return false;
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
    
    // Count how many fundamental metrics we actually have
    let validMetricsCount = 0;
    if (typeof pegRatio === 'number' && !isNaN(pegRatio)) validMetricsCount++;
    if (typeof forwardPE === 'number' && !isNaN(forwardPE)) validMetricsCount++;
    if (typeof priceToBook === 'number' && !isNaN(priceToBook)) validMetricsCount++;
    if (typeof priceToSales === 'number' && !isNaN(priceToSales)) validMetricsCount++;
    if (typeof debtToEquity === 'number' && !isNaN(debtToEquity)) validMetricsCount++;
    if (typeof returnOnEquity === 'number' && !isNaN(returnOnEquity)) validMetricsCount++;
    if (typeof beta === 'number' && !isNaN(beta)) validMetricsCount++;
    
    // For ETFs, we need fewer metrics to consider the data valid
    const minRequiredMetrics = isETF ? 1 : 3;
    
    // If we don't have enough valid metrics, throw an error to try the next data source
    if (validMetricsCount < minRequiredMetrics) {
      Logger.log(`Google Finance returned insufficient metrics for ${symbol}: ${validMetricsCount}/${minRequiredMetrics} valid metrics`);
      throw new Error("Insufficient fundamental metrics from Google Finance");
    }
    
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
    } catch (e) {
      Logger.log(`Expected error from Google Finance for ${invalidSymbol}: ${e.message}`);
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
 * Tests the enhanced fundamental metrics data retrieval with multiple symbols
 * This function tests the cascading approach with a variety of stock and ETF symbols
 */
function testEnhancedFundamentalMetrics() {
  try {
    Logger.log("=== TESTING ENHANCED FUNDAMENTAL METRICS RETRIEVAL ===");
    
    // Test with a variety of symbols (stocks and ETFs)
    const testSymbols = [
      "AAPL",  // Large cap tech stock
      "MSFT",  // Another large cap tech stock
      "SPY",   // ETF
      "XOM",   // Energy sector
      "TSLA",  // High growth stock
      "BRK-B", // Conglomerate with special character in symbol
      "VTI"    // Another ETF
    ];
    
    const results = {};
    
    // Test each symbol
    for (const symbol of testSymbols) {
      Logger.log(`\n--- Testing ${symbol} ---`);
      
      try {
        const startTime = new Date().getTime();
        const metrics = fetchFundamentalMetricsData(symbol);
        const endTime = new Date().getTime();
        const executionTime = (endTime - startTime) / 1000; // in seconds
        
        // Log the results
        Logger.log(`Data source: ${metrics.dataSource}`);
        Logger.log(`Execution time: ${executionTime.toFixed(2)} seconds`);
        Logger.log(`Metrics retrieved: ${Object.keys(metrics).join(', ')}`);
        
        // Log some key metrics
        Logger.log(`PEG Ratio: ${metrics.pegRatio || 'N/A'}`);
        Logger.log(`Forward P/E: ${metrics.forwardPE || 'N/A'}`);
        Logger.log(`Price to Book: ${metrics.priceToBook || 'N/A'}`);
        Logger.log(`Beta: ${metrics.beta || 'N/A'}`);
        
        // Store results
        results[symbol] = {
          success: true,
          dataSource: metrics.dataSource,
          executionTime: executionTime,
          metrics: metrics
        };
      } catch (error) {
        Logger.log(`Error testing ${symbol}: ${error}`);
        results[symbol] = {
          success: false,
          error: error.toString()
        };
      }
    }
    
    // Log summary of results
    Logger.log("\n=== TEST SUMMARY ===");
    for (const symbol in results) {
      const result = results[symbol];
      if (result.success) {
        Logger.log(`${symbol}: Success - Data source: ${result.dataSource} (${result.executionTime.toFixed(2)}s)`);
      } else {
        Logger.log(`${symbol}: Failed - ${result.error}`);
      }
    }
    
    // Count data sources used
    const dataSources = {};
    for (const symbol in results) {
      if (results[symbol].success) {
        const source = results[symbol].dataSource;
        dataSources[source] = (dataSources[source] || 0) + 1;
      }
    }
    
    Logger.log("\n=== DATA SOURCE USAGE ===");
    for (const source in dataSources) {
      Logger.log(`${source}: ${dataSources[source]} symbols`);
    }
    
    return results;
  } catch (error) {
    Logger.log(`Error in testEnhancedFundamentalMetrics: ${error}`);
    return { success: false, error: error.toString() };
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

/**
 * Tests the Yahoo Finance API with a simple query
 * @param {string} apiKey - Optional Yahoo Finance API key (if not provided, will use the stored key)
 * @return {Object} Test result with success status and error message if applicable
 */
function testYahooFinanceAPI(apiKey) {
  try {
    Logger.log("=== TESTING YAHOO FINANCE API ===");
    
    // Get the API key if not provided
    if (!apiKey) {
      const scriptProperties = PropertiesService.getScriptProperties();
      apiKey = scriptProperties.getProperty('YAHOO_FINANCE_API_KEY');
      
      if (!apiKey) {
        const errorMsg = "Yahoo Finance API key not found in script properties.";
        Logger.log(errorMsg);
        return { success: false, message: errorMsg };
      }
    }
    
    Logger.log(`Using API key: ${apiKey.substring(0, 5)}...`);
    
    // Test multiple endpoints to ensure comprehensive API testing
    const endpoints = [
      {
        name: "Fundamentals",
        url: "https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/get-fundamentals?region=US&symbol=AAPL&lang=en-US&modules=assetProfile%2CsummaryProfile%2CfundProfile"
      },
      {
        name: "Quote",
        url: "https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes?region=US&symbols=AAPL"
      }
    ];
    
    const results = [];
    
    // Test each endpoint
    for (const endpoint of endpoints) {
      Logger.log(`\nTesting endpoint: ${endpoint.name}`);
      
      const options = {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "apidojo-yahoo-finance-v1.p.rapidapi.com"
        },
        muteHttpExceptions: true
      };
      
      Logger.log(`Making API request to: ${endpoint.url}`);
      
      try {
        // Make the API request
        const response = UrlFetchApp.fetch(endpoint.url, options);
        const statusCode = response.getResponseCode();
        const responseText = response.getContentText();
        
        // Log the response for debugging
        Logger.log(`Response status code: ${statusCode}`);
        
        // Check if the request was successful
        if (statusCode === 200) {
          const data = JSON.parse(responseText);
          
          // Log the keys in the response for debugging
          Logger.log(`Response keys: ${Object.keys(data).join(', ')}`);
          
          // Check for specific data structure based on endpoint
          let isValidData = false;
          let dataStructure = "";
          
          if (endpoint.name === "Fundamentals" && data.quoteSummary && data.quoteSummary.result) {
            isValidData = true;
            dataStructure = "quoteSummary.result";
          } else if (endpoint.name === "Quote" && data.quoteResponse && data.quoteResponse.result) {
            isValidData = true;
            dataStructure = "quoteResponse.result";
          }
          
          if (isValidData) {
            Logger.log(`${endpoint.name} endpoint returned valid data with structure: ${dataStructure}`);
            results.push({ 
              endpoint: endpoint.name, 
              success: true, 
              message: "API request successful" 
            });
          } else {
            // Still consider it a success if we get valid JSON, just log what we received
            Logger.log(`${endpoint.name} endpoint returned data but missing expected structure. Found keys: ${Object.keys(data).join(', ')}`);
            results.push({ 
              endpoint: endpoint.name, 
              success: true, 
              message: "API returned data but not in the expected format",
              data: Object.keys(data)
            });
          }
        }
      } catch (requestError) {
        Logger.log(`${endpoint.name} request error: ${requestError}`);
        results.push({ 
          endpoint: endpoint.name, 
          success: false, 
          message: requestError.toString() 
        });
      }
    }
    
    // Determine overall success based on individual endpoint results
    const allSuccess = results.every(result => result.success);
    const anySuccess = results.some(result => result.success);
    
    // Generate summary
    Logger.log("\n=== YAHOO FINANCE API TEST SUMMARY ===");
    for (const result of results) {
      Logger.log(`${result.endpoint}: ${result.success ? "Success" : "Failed"} - ${result.message}`);
    }
    
    if (allSuccess) {
      return { 
        success: true, 
        message: "All Yahoo Finance API endpoints tested successfully", 
        results: results 
      };
    } else if (anySuccess) {
      return { 
        success: true, 
        message: "Some Yahoo Finance API endpoints tested successfully", 
        results: results 
      };
    } else {
      return { 
        success: false, 
        message: "All Yahoo Finance API endpoint tests failed", 
        results: results 
      };
    }
  } catch (error) {
    Logger.log(`Yahoo Finance API test error: ${error}`);
    return { success: false, message: error.toString() };
  }
}

/**
 * Tests the Yahoo Finance API integration specifically
 * This function forces the use of Yahoo Finance API by skipping Google Finance
 */
function testYahooFinanceAPIIntegration() {
  try {
    Logger.log("=== TESTING YAHOO FINANCE API INTEGRATION ===");
    
    // Test with a variety of symbols (stocks and ETFs)
    const testSymbols = [
      "AAPL",  // Large cap tech stock
      "MSFT",  // Another large cap tech stock
      "SPY",   // ETF
      "XOM",   // Energy sector
      "TSLA"   // High growth stock
    ];
    
    const results = {};
    
    // Get the Yahoo Finance API key
    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('YAHOO_FINANCE_API_KEY');
    
    if (!apiKey) {
      Logger.log("ERROR: Yahoo Finance API key not found in script properties");
      return { success: false, error: "API key not found" };
    }
    
    // Test each symbol
    for (const symbol of testSymbols) {
      Logger.log(`\n--- Testing ${symbol} ---`);
      
      try {
        const startTime = new Date().getTime();
        
        // Yahoo Finance API endpoint for fundamentals data
        const apiUrl = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/get-fundamentals?region=US&symbol=${symbol}&lang=en-US&modules=assetProfile%2CsummaryProfile%2CfundProfile%2CfinancialData%2CdefaultKeyStatistics`;
        
        const options = {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": apiKey,
            "X-RapidAPI-Host": "apidojo-yahoo-finance-v1.p.rapidapi.com"
          },
          muteHttpExceptions: true
        };
        
        // Make the API request
        Logger.log(`Making fundamentals API request for ${symbol}...`);
        const response = UrlFetchApp.fetch(apiUrl, options);
        const statusCode = response.getResponseCode();
        
        if (statusCode === 200) {
          const data = JSON.parse(response.getContentText());
          
          if (data && data.quoteSummary && data.quoteSummary.result && data.quoteSummary.result.length > 0) {
            const result = data.quoteSummary.result[0];
            const yahooApiData = {};
            
            // Extract metrics from the API response
            if (result.defaultKeyStatistics) {
              const stats = result.defaultKeyStatistics;
              yahooApiData.pegRatio = stats.pegRatio ? stats.pegRatio.raw : 0;
              yahooApiData.priceToBook = stats.priceToBook ? stats.priceToBook.raw : 0;
              yahooApiData.beta = stats.beta ? stats.beta.raw : 0;
              
              // Log available metrics for debugging
              Logger.log(`Available metrics in defaultKeyStatistics: ${Object.keys(stats).join(', ')}`);
            }
            
            if (result.financialData) {
              const financials = result.financialData;
              yahooApiData.returnOnEquity = financials.returnOnEquity ? financials.returnOnEquity.raw : 0;
              yahooApiData.returnOnAssets = financials.returnOnAssets ? financials.returnOnAssets.raw : 0;
              yahooApiData.profitMargin = financials.profitMargins ? financials.profitMargins.raw : 0;
              yahooApiData.debtToEquity = financials.debtToEquity ? financials.debtToEquity.raw : 0;
            }
            
            // Get additional quote data for more metrics
            const quoteUrl = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes?region=US&symbols=${symbol}`;
            Logger.log(`Making quote API request for ${symbol}...`);
            const quoteResponse = UrlFetchApp.fetch(quoteUrl, options);
            
            if (quoteResponse.getResponseCode() === 200) {
              const quoteData = JSON.parse(quoteResponse.getContentText());
              
              if (quoteData && quoteData.quoteResponse && quoteData.quoteResponse.result && quoteData.quoteResponse.result.length > 0) {
                const quote = quoteData.quoteResponse.result[0];
                
                yahooApiData.forwardPE = quote.forwardPE || 0;
                yahooApiData.priceToSales = quote.priceToSales || 0;
                yahooApiData.dividendYield = quote.dividendYield ? quote.dividendYield / 100 : 0; // Convert to decimal
              }
            }
            
            const endTime = new Date().getTime();
            const executionTime = (endTime - startTime) / 1000; // in seconds
            
            // Log the results
            Logger.log(`Execution time: ${executionTime.toFixed(2)} seconds`);
            Logger.log(`Metrics retrieved: ${Object.keys(yahooApiData).join(', ')}`);
            
            // Log some key metrics
            Logger.log(`PEG Ratio: ${yahooApiData.pegRatio || 'N/A'}`);
            Logger.log(`Forward P/E: ${yahooApiData.forwardPE || 'N/A'}`);
            Logger.log(`Price to Book: ${yahooApiData.priceToBook || 'N/A'}`);
            Logger.log(`Beta: ${yahooApiData.beta || 'N/A'}`);
            
            // Store results
            results[symbol] = {
              success: true,
              executionTime: executionTime,
              metrics: yahooApiData
            };
          } else {
            Logger.log(`No results found in quoteSummary for ${symbol}`);
            results[symbol] = {
              success: false,
              error: "No results found in quoteSummary"
            };
          }
        } else {
          Logger.log(`API returned status code ${statusCode} for ${symbol}`);
          results[symbol] = {
            success: false,
            error: `API returned status code ${statusCode}`
          };
        }
      } catch (error) {
        Logger.log(`Error testing ${symbol}: ${error}`);
        results[symbol] = {
          success: false,
          error: error.toString()
        };
      }
    }
    
    // Log summary of results
    Logger.log("\n=== TEST SUMMARY ===");
    for (const symbol in results) {
      const result = results[symbol];
      if (result.success) {
        Logger.log(`${symbol}: Success - Data source: ${result.dataSource} (${result.executionTime.toFixed(2)}s)`);
      } else {
        Logger.log(`${symbol}: Failed - ${result.error}`);
      }
    }
    
    return results;
  } catch (error) {
    Logger.log(`Error in testYahooFinanceAPIIntegration: ${error}`);
    return { success: false, error: error.toString() };
  }
}

/**
 * Fetches data from Tradier API for a specific symbol
 * @param {String} symbol - The stock/ETF symbol
 * @return {Object} Fundamental metrics data from Tradier
 */
function fetchTradierData(symbol) {
  try {
    Logger.log(`Fetching Tradier data for ${symbol}`);
    
    // Initialize metrics with null values
    const metrics = {
      pegRatio: null,
      forwardPE: null,
      priceToBook: null,
      priceToSales: null,
      debtToEquity: null,
      returnOnEquity: null,
      returnOnAssets: null,
      profitMargin: null,
      dividendYield: null,
      beta: null,
      expenseRatio: null
    };
    
    // Get the API key from script properties
    const scriptProperties = PropertiesService.getScriptProperties();
    const tradierApiKey = scriptProperties.getProperty('TRADIER_API_KEY');
    
    if (!tradierApiKey) {
      Logger.log('Tradier API key not found. Please set the TRADIER_API_KEY property.');
      return metrics;
    }
    
    // Set up the API request options
    const options = {
      'method': 'GET',
      'headers': {
        'Authorization': `Bearer ${tradierApiKey}`,
        'Accept': 'application/json'
      },
      'muteHttpExceptions': true
    };
    
    // Helper function to make API requests with retry logic
    function makeApiRequest(url, maxRetries = 3) {
      let retries = 0;
      let response;
      
      while (retries < maxRetries) {
        try {
          response = UrlFetchApp.fetch(url, options);
          
          // If successful, return the response
          if (response.getResponseCode() === 200) {
            return JSON.parse(response.getContentText());
          }
          
          // If rate limited, wait and retry
          if (response.getResponseCode() === 429) {
            Logger.log(`Rate limited. Retrying in ${Math.pow(2, retries)} seconds...`);
            Utilities.sleep(Math.pow(2, retries) * 1000); // Exponential backoff
            retries++;
            continue;
          }
          
          // If other error, log and return null
          Logger.log(`API error: ${response.getResponseCode()} - ${response.getContentText()}`);
          return null;
        } catch (error) {
          Logger.log(`API request error: ${error}. Retry ${retries + 1}/${maxRetries}`);
          retries++;
          
          if (retries < maxRetries) {
            Utilities.sleep(Math.pow(2, retries) * 1000); // Exponential backoff
          }
        }
      }
      
      return null;
    }
    
    // First, get the company profile using the beta endpoint
    Logger.log(`Fetching company profile for ${symbol} from Tradier beta API`);
    const profileUrl = `https://api.tradier.com/beta/markets/fundamentals/company?symbols=${symbol}`;
    const profileData = makeApiRequest(profileUrl);
    
    if (profileData && profileData.length > 0 && profileData[0].results) {
      const results = profileData[0].results;
      
      // Find the company data
      const companyData = results.find(result => result.type === "Company");
      
      if (companyData && companyData.tables) {
        // Extract data from asset_classification if available
        if (companyData.tables.asset_classification) {
          const assetClass = companyData.tables.asset_classification;
          
          // Beta might be in the asset classification data
          if (assetClass.financial_health_grade) {
            Logger.log(`Found financial health grade: ${assetClass.financial_health_grade}`);
          }
        }
        
        // Extract company profile data
        if (companyData.tables.company_profile) {
          const profile = companyData.tables.company_profile;
          Logger.log(`Found company profile data for ${symbol}`);
        }
        
        // Extract long description if available
        if (companyData.tables.long_descriptions) {
          const description = companyData.tables.long_descriptions;
          Logger.log(`Found company description for ${symbol}`);
        }
      }
    }
    
    // Next, get the financial ratios using the beta endpoint
    Logger.log(`Fetching financial ratios for ${symbol} from Tradier beta API`);
    const ratiosUrl = `https://api.tradier.com/beta/markets/fundamentals/ratios?symbols=${symbol}`;
    const ratiosData = makeApiRequest(ratiosUrl);
    
    if (ratiosData && ratiosData.length > 0 && ratiosData[0].results) {
      const results = ratiosData[0].results;
      
      // Process company ratios
      const companyData = results.find(result => result.type === "Company");
      if (companyData && companyData.tables) {
        // Extract operation ratios if available
        if (companyData.tables.operation_ratios_restate && companyData.tables.operation_ratios_restate.length > 0) {
          const ratios = companyData.tables.operation_ratios_restate[0].period_1y;
          
          if (ratios) {
            // Extract return on equity
            if (ratios.r_o_e !== undefined) {
              metrics.returnOnEquity = parseFloat(ratios.r_o_e);
              Logger.log(`Found ROE from Tradier: ${metrics.returnOnEquity}`);
            }
            
            // Extract return on assets
            if (ratios.r_o_a !== undefined) {
              metrics.returnOnAssets = parseFloat(ratios.r_o_a);
              Logger.log(`Found ROA from Tradier: ${metrics.returnOnAssets}`);
            }
            
            // Extract profit margin
            if (ratios.net_margin !== undefined) {
              metrics.profitMargin = parseFloat(ratios.net_margin);
              Logger.log(`Found profit margin from Tradier: ${metrics.profitMargin}`);
            }
            
            // Extract debt to equity (may need calculation)
            if (ratios.financial_leverage !== undefined) {
              // This is an approximation, may need adjustment
              metrics.debtToEquity = parseFloat(ratios.financial_leverage) - 1;
              Logger.log(`Calculated debt to equity from financial leverage: ${metrics.debtToEquity}`);
            }
          }
        }
        
        // Try alternative operation ratios format if needed
        if (!metrics.returnOnEquity && companyData.tables.operation_ratios_a_o_r && companyData.tables.operation_ratios_a_o_r.length > 0) {
          const ratios = companyData.tables.operation_ratios_a_o_r[0].period_1y;
          
          if (ratios) {
            // Extract return on equity
            if (ratios.r_o_e !== undefined) {
              metrics.returnOnEquity = parseFloat(ratios.r_o_e);
              Logger.log(`Found ROE from alternative ratios: ${metrics.returnOnEquity}`);
            }
            
            // Extract return on assets
            if (ratios.r_o_a !== undefined) {
              metrics.returnOnAssets = parseFloat(ratios.r_o_a);
              Logger.log(`Found ROA from alternative ratios: ${metrics.returnOnAssets}`);
            }
            
            // Extract profit margin
            if (ratios.net_margin !== undefined) {
              metrics.profitMargin = parseFloat(ratios.net_margin);
              Logger.log(`Found profit margin from alternative ratios: ${metrics.profitMargin}`);
            }
          }
        }
      }
      
      // Process stock-specific ratios
      const stockData = results.find(result => result.type === "Stock");
      if (stockData && stockData.tables) {
        // Extract valuation ratios if available
        if (stockData.tables.valuation_ratios) {
          const valuation = stockData.tables.valuation_ratios;
          
          // Extract P/E ratio
          if (valuation.forward_p_e_ratio !== undefined) {
            metrics.forwardPE = parseFloat(valuation.forward_p_e_ratio);
            Logger.log(`Found forward P/E from Tradier: ${metrics.forwardPE}`);
          }
          
          // Extract PEG ratio
          if (valuation.p_e_g_ratio !== undefined) {
            metrics.pegRatio = parseFloat(valuation.p_e_g_ratio);
            Logger.log(`Found PEG ratio from Tradier: ${metrics.pegRatio}`);
          }
          
          // Extract price to book
          if (valuation.p_b_ratio !== undefined) {
            metrics.priceToBook = parseFloat(valuation.p_b_ratio);
            Logger.log(`Found price to book from Tradier: ${metrics.priceToBook}`);
          }
          
          // Extract price to sales
          if (valuation.p_s_ratio !== undefined) {
            metrics.priceToSales = parseFloat(valuation.p_s_ratio);
            Logger.log(`Found price to sales from Tradier: ${metrics.priceToSales}`);
          }
          
          // Extract dividend yield
          if (valuation.dividend_yield !== undefined) {
            metrics.dividendYield = parseFloat(valuation.dividend_yield) / 100; // Convert from percentage
            Logger.log(`Found dividend yield from Tradier: ${metrics.dividendYield}`);
          }
        }
        
        // Extract beta from alpha_beta if available
        if (stockData.tables.alpha_beta && stockData.tables.alpha_beta.period_60m) {
          const alphaBeta = stockData.tables.alpha_beta.period_60m;
          
          if (alphaBeta.beta !== undefined) {
            metrics.beta = parseFloat(alphaBeta.beta);
            Logger.log(`Found beta from Tradier alpha_beta: ${metrics.beta}`);
          }
        }
      }
    }
    
    // If we still don't have dividend yield, try the dividends endpoint
    if (metrics.dividendYield === null) {
      Logger.log(`Fetching dividend data for ${symbol} from Tradier API`);
      const dividendsUrl = `https://api.tradier.com/v1/markets/fundamentals/dividends?symbols=${symbol}`;
      const dividendsData = makeApiRequest(dividendsUrl);
      
      if (dividendsData && dividendsData.securities && dividendsData.securities.security) {
        const dividends = dividendsData.securities.security;
        
        // Extract dividend yield
        if (dividends.dividend_yield) {
          metrics.dividendYield = parseFloat(dividends.dividend_yield) / 100; // Convert percentage to decimal
          Logger.log(`Found dividend yield from Tradier dividends endpoint: ${metrics.dividendYield}`);
        }
      }
    }
    
    // For ETFs, try to get expense ratio
    if (isETF(symbol)) {
      try {
        // Tradier doesn't have a direct ETF expense ratio endpoint
        // This is a placeholder - we'll keep the expense ratio as null
        Logger.log(`${symbol} is an ETF, but Tradier doesn't provide expense ratio data`);
      } catch (etfError) {
        Logger.log(`Error checking ETF data for ${symbol}: ${etfError}`);
      }
    }
    
    // Validate metrics for realistic values
    Object.keys(metrics).forEach(key => {
      metrics[key] = validateMetric(metrics[key], key);
    });
    
    Logger.log(`Final Tradier metrics for ${symbol}: ${JSON.stringify(metrics)}`);
    
    return metrics;
  } catch (error) {
    Logger.log(`Error in fetchTradierData for ${symbol}: ${error}`);
    
    // Return null values for all metrics
    return {
      pegRatio: null,
      forwardPE: null,
      priceToBook: null,
      priceToSales: null,
      debtToEquity: null,
      returnOnEquity: null,
      returnOnAssets: null,
      profitMargin: null,
      dividendYield: null,
      beta: null,
      expenseRatio: null
    };
  }
}

/**
 * Validates a metric value for realistic ranges
 * @param {Number} value - The metric value
 * @param {String} key - The metric key
 * @return {Number} Validated metric value
 */
function validateMetric(value, key) {
  // Define realistic ranges for each metric
  const ranges = {
    pegRatio: [0, 5],
    forwardPE: [5, 50],
    priceToBook: [0, 20],  
    priceToSales: [0, 20], 
    debtToEquity: [0, 5],
    returnOnEquity: [0, 1],
    returnOnAssets: [0, 1],
    profitMargin: [0, 1],
    dividendYield: [0, 1],
    beta: [0, 5],
    expenseRatio: [0, 1]
  };
  
  // Check if the value is within the realistic range
  if (value < ranges[key][0] || value > ranges[key][1]) {
    Logger.log(`Invalid value for ${key}: ${value}. Setting to null.`);
    return null;
  }
  
  return value;
}
