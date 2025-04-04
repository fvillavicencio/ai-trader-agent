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
