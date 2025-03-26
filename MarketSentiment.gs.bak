/**
 * Market Sentiment Module
 * Handles all market sentiment data retrieval from analysts and sentiment indicators
 */

/**
 * Retrieves market sentiment from prominent analysts and sources
 * @return {Object} Market sentiment data from various analysts and sources
 */
function retrieveMarketSentiment() {
  try {
    Logger.log("Retrieving market sentiment data...");
    
    // Define the analysts to track with their RSS feeds and websites
    const analysts = [
      {
        name: "Dan Nathan",
        role: "CNBC Fast Money Contributor",
        rssFeeds: [
          "https://riskreversal.com/feed/"
        ],
        websites: [
          "https://riskreversal.com/",
          "https://www.cnbc.com/dan-nathan/"
        ],
        twitterHandle: "RiskReversal"
      },
      {
        name: "Josh Brown",
        role: "CEO of Ritholtz Wealth Management, CNBC Contributor",
        rssFeeds: [
          // "https://www.downtownjoshbrown.com/feed/", // Removed due to XML parsing issues
          "https://rss.beehiiv.com/feeds/gywEQVO1Za.xml"
        ],
        websites: [
          "https://www.downtownjoshbrown.com/",
          "https://www.cnbc.com/joshua-brown/",
          "https://ritholtzwealth.com/blog/"
        ],
        twitterHandle: "ReformedBroker"
      },
      {
        name: "Steve Weiss",
        role: "CNBC Halftime Report Contributor",
        rssFeeds: [],
        websites: [
          "https://www.cnbc.com/steve-weiss/",
          "https://www.cnbc.com/halftime/"
        ],
        twitterHandle: ""
      },
      {
        name: "Joe Terranova",
        role: "Chief Market Strategist at Virtus Investment Partners, CNBC Contributor",
        rssFeeds: [],
        websites: [
          "https://www.virtus.com/our-team/joseph-m-terranova",
          "https://www.cnbc.com/joe-terranova/",
          "https://www.cnbc.com/halftime/"
        ],
        twitterHandle: "JoeTerranova"
      },
      {
        name: "Dan Niles",
        role: "Founder and Portfolio Manager of the Satori Fund",
        rssFeeds: [],
        websites: [
          "https://www.cnbc.com/video/2025/03/19/dan-niles-on-nvidia-and-other-tech-stocks.html",
          "https://www.cnbc.com/dan-niles/"
        ],
        twitterHandle: ""
      },
      {
        name: "Mohamed El-Erian",
        role: "President of Queens' College, Cambridge and Chief Economic Advisor at Allianz",
        rssFeeds: [
          "https://www.project-syndicate.org/columnist/mohamed-a-el-erian.rss"
        ],
        websites: [
          "https://www.ft.com/mohamed-el-erian",
          "https://www.project-syndicate.org/columnist/mohamed-a-el-erian",
          "https://www.bloomberg.com/opinion/authors/ABD3QKHYnuo/mohamed-a-el-erian"
        ],
        twitterHandle: "elerianm"
      }
    ];
    
    // Define the sentiment indicators to track with verified working URLs
    const sentimentSources = [
      { 
        name: "AAII Investor Sentiment Survey",
        url: "https://www.aaii.com/sentimentsurvey"
      },
      { 
        name: "CBOE Put/Call Ratio",
        url: "https://www.cboe.com/us/options/market_statistics/daily/"
      },
      { 
        name: "Investors Intelligence Bull/Bear Ratio",
        url: "https://www.investorsintelligence.com/x/default.html"
      },
      { 
        name: "Citi Panic/Euphoria Model",
        url: "https://www.citivelocity.com/t/r/eppublic/1rNx"
      },
      { 
        name: "JPMorgan Market Risk Sentiment",
        url: "https://www.jpmorgan.com/insights/research/market-outlook"
      },
      { 
        name: "Morgan Stanley Risk Indicator",
        url: "https://www.morganstanley.com/ideas/thoughts-on-the-market"
      },
      { 
        name: "Credit Suisse Risk Appetite Index",
        url: "https://www.credit-suisse.com/about-us/en/reports-research/studies-publications.html"
      }
    ];
    
    // Initialize results object with simplified structure
    const results = {
      timestamp: new Date(),
      analysts: [],
      sentimentIndicators: []
    };
    
    // Fetch analyst content data with improved extraction
    for (const analyst of analysts) {
      try {
        Logger.log(`Fetching data for analyst: ${analyst.name}`);
        
        // First try to get content from RSS feeds if available
        let analystData = null;
        if (analyst.rssFeeds && analyst.rssFeeds.length > 0) {
          Logger.log(`Trying RSS feeds for ${analyst.name}...`);
          analystData = fetchAnalystRSSContent(analyst);
        }
        
        // If no RSS content was found, try the websites
        if (!analystData || !analystData.content) {
          Logger.log(`No RSS content found for ${analyst.name}, trying websites...`);
          analystData = fetchAnalystWebsiteContent(analyst);
        }
        
        // If still no content, try Twitter if handle is available
        if ((!analystData || !analystData.content || analystData.content.includes("Error:")) && analyst.twitterHandle) {
          Logger.log(`No content found from websites for ${analyst.name}, trying Twitter...`);
          analystData = fetchTwitterContent(analyst);
        }
        
        // If still no content, try Google Search as a last resort
        if (!analystData || !analystData.content || analystData.content.includes("Error:")) {
          Logger.log(`No content found from sources for ${analyst.name}, trying Google Search...`);
          analystData = searchForAnalystContent(analyst);
        }
        
        // Extract stock symbols if content was found
        let mentionedSymbols = [];
        if (analystData && analystData.content && !analystData.content.includes("Error:")) {
          mentionedSymbols = extractStockSymbols(analystData.content);
        }
        
        // Add the analyst data to results
        results.analysts.push({
          name: analyst.name,
          role: analyst.role,
          content: analystData.content,
          lastUpdated: analystData.lastUpdated,
          source: analystData.source,
          mentionedSymbols: mentionedSymbols
        });
      } catch (error) {
        Logger.log(`Error fetching data for analyst ${analyst.name}: ${error}`);
        // Add the analyst with error information
        results.analysts.push({
          name: analyst.name,
          role: analyst.role,
          content: `Error: ${error.message}`,
          lastUpdated: new Date(),
          source: "Error",
          mentionedSymbols: []
        });
      }
    }
    
    // Fetch sentiment indicator data with improved parsing
    for (const source of sentimentSources) {
      try {
        const indicatorData = fetchSentimentIndicatorContent(source);
        results.sentimentIndicators.push({
          name: source.name,
          url: source.url,
          reading: indicatorData.reading,
          content: indicatorData.content,
          lastUpdated: indicatorData.lastUpdated,
          source: indicatorData.source
        });
      } catch (error) {
        Logger.log(`Error fetching data for sentiment source ${source.name}: ${error}`);
        // Add the indicator with error information
        results.sentimentIndicators.push({
          name: source.name,
          url: source.url,
          reading: "Error retrieving data",
          content: `Error: ${error.message}`,
          lastUpdated: new Date(),
          source: source.name
        });
      }
    }
    
    // Log the results
    Logger.log(`Market sentiment data retrieved with ${results.analysts.length} analysts and ${results.sentimentIndicators.length} sentiment indicators.`);
    
    return results;
  } catch (error) {
    Logger.log(`Error retrieving market sentiment: ${error}`);
    throw new Error(`Failed to retrieve market sentiment: ${error.message}`);
  }
}

/**
 * Function to extract stock and ETF symbols from content
 * @param {string} content - The content to extract symbols from
 * @return {Array} Array of stock/ETF symbols found in the content
 */
function extractStockSymbols(content) {
  try {
    // If content is empty or not a string, return empty array
    if (!content || typeof content !== 'string') {
      return [];
    }
    
    // Common ETFs to look for
    const commonETFs = [
      "SPY", "QQQ", "IWM", "DIA", "VTI", "VOO", "VEA", "VWO", "BND", "AGG", 
      "GLD", "SLV", "XLF", "XLE", "XLI", "XLK", "XLV", "XLP", "XLY", "XLU", 
      "XLB", "XLRE", "XLC", "XBI", "SMH", "ARKK", "ARKW", "ARKG", "ARKF", 
      "ARKX", "TLT", "IEF", "SHY", "HYG", "LQD", "TQQQ", "SQQQ", "UVXY", 
      "VXX", "VIXY", "SVXY", "EEM", "EFA", "FXI", "EWJ", "EWZ", "RSX", "EWW"
    ];
    
    // Major stocks to look for
    const majorStocks = [
      "AAPL", "MSFT", "AMZN", "GOOGL", "GOOG", "META", "TSLA", "NVDA", "BRK.A", 
      "BRK.B", "JPM", "JNJ", "V", "PG", "UNH", "HD", "MA", "BAC", "DIS", "ADBE", 
      "CRM", "NFLX", "PYPL", "INTC", "CSCO", "VZ", "T", "PFE", "MRK", "KO", 
      "PEP", "WMT", "CMCSA", "ABT", "TMO", "ACN", "AVGO", "TXN", "QCOM", "COST", 
      "NKE", "LLY", "MCD", "NEE", "AMD", "IBM", "GS", "MMM", "HON", "CVX", "XOM"
    ];
    
    // Combine all symbols to look for
    const allSymbols = [...commonETFs, ...majorStocks];
    
    // Initialize array to store found symbols
    const foundSymbols = [];
    
    // First look for ticker symbols with $ prefix (e.g., $AAPL)
    const tickerRegex = /\$([A-Z]{1,5}(\.[A-Z])?)(?=\s|$|[.,;:!?)])/g;
    let match;
    let contentCopy = content;
    while ((match = tickerRegex.exec(contentCopy)) !== null) {
      const symbol = match[1];
      if (!foundSymbols.includes(symbol)) {
        foundSymbols.push(symbol);
      }
    }
    
    // Then look for symbols without $ prefix but that match our list
    for (const symbol of allSymbols) {
      // Use word boundary to ensure we're matching whole words
      const symbolRegex = new RegExp(`\\b${symbol}\\b`, 'g');
      if (symbolRegex.test(content) && !foundSymbols.includes(symbol)) {
        foundSymbols.push(symbol);
      }
    }
    
    // Look for company names and map them to symbols
    const companyToSymbol = {
      "Apple": "AAPL",
      "Microsoft": "MSFT",
      "Amazon": "AMZN",
      "Google": "GOOGL",
      "Alphabet": "GOOGL",
      "Meta": "META",
      "Facebook": "META",
      "Tesla": "TSLA",
      "Nvidia": "NVDA",
      "Berkshire Hathaway": "BRK.B",
      "JPMorgan": "JPM",
      "Johnson & Johnson": "JNJ",
      "Visa": "V",
      "Procter & Gamble": "PG",
      "UnitedHealth": "UNH",
      "Home Depot": "HD",
      "Mastercard": "MA",
      "Bank of America": "BAC",
      "Disney": "DIS",
      "Adobe": "ADBE",
      "Salesforce": "CRM",
      "Netflix": "NFLX",
      "PayPal": "PYPL",
      "Intel": "INTC",
      "Cisco": "CSCO",
      "Verizon": "VZ",
      "AT&T": "T",
      "Pfizer": "PFE",
      "Merck": "MRK",
      "Coca-Cola": "KO",
      "PepsiCo": "PEP",
      "Walmart": "WMT",
      "Comcast": "CMCSA",
      "Abbott": "ABT",
      "Thermo Fisher": "TMO",
      "Accenture": "ACN",
      "Broadcom": "AVGO",
      "Texas Instruments": "TXN",
      "Qualcomm": "QCOM",
      "Costco": "COST",
      "Nike": "NKE",
      "Eli Lilly": "LLY",
      "McDonald's": "MCD",
      "NextEra Energy": "NEE",
      "AMD": "AMD",
      "IBM": "IBM",
      "Goldman Sachs": "GS",
      "3M": "MMM",
      "Honeywell": "HON",
      "Chevron": "CVX",
      "Exxon": "XOM",
      "ExxonMobil": "XOM"
    };
    
    for (const [company, symbol] of Object.entries(companyToSymbol)) {
      if (content.includes(company) && !foundSymbols.includes(symbol)) {
        foundSymbols.push(symbol);
      }
    }
    
    // Look for index mentions
    const indices = {
      "S&P 500": "SPX",
      "S&P500": "SPX",
      "S&P": "SPX",
      "Dow Jones": "DJI",
      "Dow": "DJI",
      "DJIA": "DJI",
      "Nasdaq": "IXIC",
      "Nasdaq Composite": "IXIC",
      "Russell 2000": "RUT",
      "Russell": "RUT",
      "VIX": "VIX",
      "Volatility Index": "VIX"
    };
    
    for (const [indexName, indexSymbol] of Object.entries(indices)) {
      const indexRegex = new RegExp(`\\b${indexName}\\b`, 'i');
      if (indexRegex.test(content) && !foundSymbols.includes(indexSymbol)) {
        foundSymbols.push(indexSymbol);
      }
    }
    
    return foundSymbols;
  } catch (error) {
    Logger.log(`Error extracting stock symbols: ${error}`);
    return [];
  }
}

/**
 * Function to extract publication date from HTML content
 * @param {string} htmlContent - The HTML content to extract date from
 * @param {string} sourceUrl - The URL of the source for context
 * @return {Date} The extracted publication date or current date if not found
 */
function extractPublicationDate(htmlContent, sourceUrl) {
  try {
    // Default to current date if we can't extract a date
    let pubDate = new Date();
    
    // Check for JSON-LD metadata which often contains publication date
    const jsonLdRegex = /<script type="application\/ld\+json">(.*?)<\/script>/gs;
    let jsonLdMatch;
    
    while ((jsonLdMatch = jsonLdRegex.exec(htmlContent)) !== null) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        
        // Check for datePublished in various JSON-LD formats
        if (jsonLd.datePublished) {
          return new Date(jsonLd.datePublished);
        } else if (jsonLd.dateModified) {
          return new Date(jsonLd.dateModified);
        } else if (jsonLd.mainEntity && jsonLd.mainEntity.datePublished) {
          return new Date(jsonLd.mainEntity.datePublished);
        } else if (jsonLd["@graph"]) {
          // Handle @graph structure
          for (const item of jsonLd["@graph"]) {
            if (item.datePublished) {
              return new Date(item.datePublished);
            } else if (item.dateModified) {
              return new Date(item.dateModified);
            }
          }
        }
      } catch (jsonError) {
        Logger.log(`Error parsing JSON-LD: ${jsonError}`);
      }
    }
    
    // Check for meta tags with publication date
    const metaDateRegex = /<meta[^>]*(?:property|name)=["'](?:article:published_time|pubdate|publishdate|date|DC.date.issued|article:modified_time|og:updated_time|lastmod)["'][^>]*content=["']([^"']*)["'][^>]*>/i;
    const metaDateMatch = htmlContent.match(metaDateRegex);
    
    if (metaDateMatch && metaDateMatch[1]) {
      try {
        return new Date(metaDateMatch[1]);
      } catch (dateError) {
        Logger.log(`Error parsing meta date: ${dateError}`);
      }
    }
    
    // Check for time tags with datetime attribute
    const timeTagRegex = /<time[^>]*datetime=["']([^"']*)["'][^>]*>/i;
    const timeTagMatch = htmlContent.match(timeTagRegex);
    
    if (timeTagMatch && timeTagMatch[1]) {
      try {
        return new Date(timeTagMatch[1]);
      } catch (dateError) {
        Logger.log(`Error parsing time tag date: ${dateError}`);
      }
    }
    
    // Source-specific extraction patterns
    if (sourceUrl.includes("cnbc.com")) {
      // CNBC-specific date extraction
      const cnbcDateRegex = /"datePublished":"([^"]*)"/;
      const cnbcDateMatch = htmlContent.match(cnbcDateRegex);
      
      if (cnbcDateMatch && cnbcDateMatch[1]) {
        try {
          return new Date(cnbcDateMatch[1]);
        } catch (dateError) {
          Logger.log(`Error parsing CNBC date: ${dateError}`);
        }
      }
      
      // Alternative CNBC pattern
      const cnbcAltDateRegex = /<span class="PublishedDate-([^"]*)"[^>]*>([^<]*)<\/span>/;
      const cnbcAltDateMatch = htmlContent.match(cnbcAltDateRegex);
      
      if (cnbcAltDateMatch && cnbcAltDateMatch[2]) {
        try {
          return new Date(cnbcAltDateMatch[2]);
        } catch (dateError) {
          Logger.log(`Error parsing CNBC alt date: ${dateError}`);
        }
      }
    } else if (sourceUrl.includes("bloomberg.com")) {
      // Bloomberg-specific date extraction
      const bloombergDateRegex = /"published_at":"([^"]*)"/;
      const bloombergDateMatch = htmlContent.match(bloombergDateRegex);
      
      if (bloombergDateMatch && bloombergDateMatch[1]) {
        try {
          return new Date(bloombergDateMatch[1]);
        } catch (dateError) {
          Logger.log(`Error parsing Bloomberg date: ${dateError}`);
        }
      }
    } else if (sourceUrl.includes("ft.com")) {
      // Financial Times-specific date extraction
      const ftDateRegex = /"datePublished":"([^"]*)"/;
      const ftDateMatch = htmlContent.match(ftDateRegex);
      
      if (ftDateMatch && ftDateMatch[1]) {
        try {
          return new Date(ftDateMatch[1]);
        } catch (dateError) {
          Logger.log(`Error parsing FT date: ${dateError}`);
        }
      }
    } else if (sourceUrl.includes("wsj.com")) {
      // Wall Street Journal-specific date extraction
      const wsjDateRegex = /"datePublished":"([^"]*)"/;
      const wsjDateMatch = htmlContent.match(wsjDateRegex);
      
      if (wsjDateMatch && wsjDateMatch[1]) {
        try {
          return new Date(wsjDateMatch[1]);
        } catch (dateError) {
          Logger.log(`Error parsing WSJ date: ${dateError}`);
        }
      }
      
      // Alternative WSJ pattern
      const wsjAltDateRegex = /<div[^>]*class="[^"]*timestamp[^"]*"[^>]*>([^<]*)<\/div>/i;
      const wsjAltDateMatch = htmlContent.match(wsjAltDateRegex);
      
      if (wsjAltDateMatch && wsjAltDateMatch[1]) {
        try {
          // WSJ timestamps often include "Updated" or "Published" prefixes
          const dateStr = wsjAltDateMatch[1].replace(/^(?:Updated|Published):\s*/i, '').trim();
          return new Date(dateStr);
        } catch (dateError) {
          Logger.log(`Error parsing WSJ alt date: ${dateError}`);
        }
      }
    } else if (sourceUrl.includes("marketwatch.com")) {
      // MarketWatch-specific date extraction
      const mwDateRegex = /<time[^>]*datetime="([^"]*)"[^>]*>/i;
      const mwDateMatch = htmlContent.match(mwDateRegex);
      
      if (mwDateMatch && mwDateMatch[1]) {
        try {
          return new Date(mwDateMatch[1]);
        } catch (dateError) {
          Logger.log(`Error parsing MarketWatch date: ${dateError}`);
        }
      }
      
      // Alternative MarketWatch pattern
      const mwAltDateRegex = /"datePublished":"([^"]*)"/;
      const mwAltDateMatch = htmlContent.match(mwAltDateRegex);
      
      if (mwAltDateMatch && mwAltDateMatch[1]) {
        try {
          return new Date(mwAltDateMatch[1]);
        } catch (dateError) {
          Logger.log(`Error parsing MarketWatch alt date: ${dateError}`);
        }
      }
    } else if (sourceUrl.includes("seekingalpha.com")) {
      // Seeking Alpha-specific date extraction
      const saDateRegex = /"publishOn":"([^"]*)"/;
      const saDateMatch = htmlContent.match(saDateRegex);
      
      if (saDateMatch && saDateMatch[1]) {
        try {
          return new Date(saDateMatch[1]);
        } catch (dateError) {
          Logger.log(`Error parsing Seeking Alpha date: ${dateError}`);
        }
      }
      
      // Alternative Seeking Alpha pattern
      const saAltDateRegex = /<time[^>]*>([^<]*)<\/time>/i;
      const saAltDateMatch = htmlContent.match(saAltDateRegex);
      
      if (saAltDateMatch && saAltDateMatch[1]) {
        try {
          return new Date(saAltDateMatch[1]);
        } catch (dateError) {
          Logger.log(`Error parsing Seeking Alpha alt date: ${dateError}`);
        }
      }
    } else if (sourceUrl.includes("fool.com")) {
      // Motley Fool-specific date extraction
      const foolDateRegex = /<span[^>]*class="[^"]*publication-date[^"]*"[^>]*>([^<]*)<\/span>/i;
      const foolDateMatch = htmlContent.match(foolDateRegex);
      
      if (foolDateMatch && foolDateMatch[1]) {
        try {
          return new Date(foolDateMatch[1]);
        } catch (dateError) {
          Logger.log(`Error parsing Motley Fool date: ${dateError}`);
        }
      }
    } else if (sourceUrl.includes("barrons.com")) {
      // Barron's-specific date extraction
      const barronDateRegex = /"datePublished":"([^"]*)"/;
      const barronDateMatch = htmlContent.match(barronDateRegex);
      
      if (barronDateMatch && barronDateMatch[1]) {
        try {
          return new Date(barronDateMatch[1]);
        } catch (dateError) {
          Logger.log(`Error parsing Barron's date: ${dateError}`);
        }
      }
    } else if (sourceUrl.includes("investors.com") || sourceUrl.includes("ibd.com")) {
      // Investor's Business Daily-specific date extraction
      const ibdDateRegex = /<time[^>]*datetime="([^"]*)"[^>]*>/i;
      const ibdDateMatch = htmlContent.match(ibdDateRegex);
      
      if (ibdDateMatch && ibdDateMatch[1]) {
        try {
          return new Date(ibdDateMatch[1]);
        } catch (dateError) {
          Logger.log(`Error parsing IBD date: ${dateError}`);
        }
      }
    } else if (sourceUrl.includes("twitter.com") || sourceUrl.includes("nitter.net")) {
      // Twitter/Nitter-specific date extraction
      const twitterDateRegex = /<span[^>]*class="[^"]*tweet-date[^"]*"[^>]*><a[^>]*>([^<]*)<\/a><\/span>/i;
      const twitterDateMatch = htmlContent.match(twitterDateRegex);
      
      if (twitterDateMatch && twitterDateMatch[1]) {
        try {
          return new Date(twitterDateMatch[1]);
        } catch (dateError) {
          // Twitter dates are often in a relative format (e.g., "2h ago")
          // Try to parse relative dates
          const relativeDate = twitterDateMatch[1].trim();
          const now = new Date();
          
          if (relativeDate.includes("h ago")) {
            const hours = parseInt(relativeDate);
            if (!isNaN(hours)) {
              now.setHours(now.getHours() - hours);
              return now;
            }
          } else if (relativeDate.includes("m ago")) {
            const minutes = parseInt(relativeDate);
            if (!isNaN(minutes)) {
              now.setMinutes(now.getMinutes() - minutes);
              return now;
            }
          } else if (relativeDate.includes("d ago")) {
            const days = parseInt(relativeDate);
            if (!isNaN(days)) {
              now.setDate(now.getDate() - days);
              return now;
            }
          }
          
          Logger.log(`Error parsing Twitter date: ${dateError}`);
        }
      }
    } else if (sourceUrl.includes("rss") || sourceUrl.includes("feed")) {
      // RSS feed-specific date extraction
      const rssDateRegex = /<pubDate>([^<]*)<\/pubDate>/i;
      const rssDateMatch = htmlContent.match(rssDateRegex);
      
      if (rssDateMatch && rssDateMatch[1]) {
        try {
          return new Date(rssDateMatch[1]);
        } catch (dateError) {
          Logger.log(`Error parsing RSS date: ${dateError}`);
        }
      }
    }
    
    // Generic date extraction for other sources
    // Look for common date patterns in the HTML
    const datePatterns = [
      // ISO format: 2023-01-15T14:30:00Z
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/,
      // Common US format: January 15, 2023
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/,
      // Common UK format: 15 January 2023
      /\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/,
      // Numeric format: MM/DD/YYYY or DD/MM/YYYY
      /\d{1,2}\/\d{1,2}\/\d{4}/
    ];
    
    for (const pattern of datePatterns) {
      const match = htmlContent.match(pattern);
      if (match) {
        try {
          return new Date(match[0]);
        } catch (dateError) {
          Logger.log(`Error parsing generic date pattern: ${dateError}`);
        }
      }
    }
    
    // If we couldn't extract a date, return the current date
    return pubDate;
  } catch (error) {
    Logger.log(`Error in extractPublicationDate: ${error}`);
    return new Date();
  }
}

/**
 * Function to fetch content from RSS feeds for a specific analyst
 * @param {Object} analyst - The analyst to fetch RSS data for
 * @return {Object} Analyst data with content from RSS feeds
 */
function fetchAnalystRSSContent(analyst) {
  try {
    if (!analyst.rssFeeds || analyst.rssFeeds.length === 0) {
      return null;
    }
    
    Logger.log(`Fetching RSS feeds for ${analyst.name}...`);
    
    // Try each RSS feed
    for (const feedUrl of analyst.rssFeeds) {
      try {
        // Fetch the RSS feed
        const response = UrlFetchApp.fetch(feedUrl, {
          muteHttpExceptions: true,
          followRedirects: true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml'
          }
        });
        
        // Check if we got a valid response
        if (response.getResponseCode() === 200) {
          const xmlContent = response.getContentText();
          
          // Parse the XML content
          let document;
          try {
            document = XmlService.parse(xmlContent);
          } catch (xmlError) {
            Logger.log(`Error parsing XML for ${feedUrl}: ${xmlError}`);
            continue; // Try next feed if this one fails
          }
          
          const root = document.getRootElement();
          
          // Get the RSS namespace
          const namespace = root.getNamespace();
          
          // Find the channel element
          const channel = root.getChild('channel', namespace);
          
          if (!channel) {
            Logger.log(`No channel element found in RSS feed: ${feedUrl}`);
            continue;
          }
          
          // Get the items
          const items = channel.getChildren('item', namespace);
          
          if (items.length === 0) {
            Logger.log(`No items found in RSS feed: ${feedUrl}`);
            continue;
          }
          
          // Get the most recent item
          const latestItem = items[0];
          
          // Extract the title, description, and publication date
          const title = latestItem.getChild('title', namespace)?.getText() || '';
          const description = latestItem.getChild('description', namespace)?.getText() || '';
          const pubDateText = latestItem.getChild('pubDate', namespace)?.getText() || '';
          const link = latestItem.getChild('link', namespace)?.getText() || feedUrl;
          
          // Parse the publication date
          let pubDate = new Date();
          if (pubDateText) {
            try {
              pubDate = new Date(pubDateText);
            } catch (dateError) {
              Logger.log(`Error parsing publication date: ${dateError}`);
            }
          }
          
          // Check if the item is recent (within the last 24 hours)
          const now = new Date();
          const timeDiff = now.getTime() - pubDate.getTime();
          const hoursDiff = timeDiff / (1000 * 60 * 60);
          
          if (hoursDiff <= 24) {
            // Clean up the description by removing HTML tags
            const cleanDescription = description.replace(/<[^>]*>/g, ' ')
                                               .replace(/\s+/g, ' ')
                                               .replace(/&nbsp;/g, ' ')
                                               .replace(/&amp;/g, '&')
                                               .replace(/&lt;/g, '<')
                                               .replace(/&gt;/g, '>')
                                               .trim();
            
            return {
              content: `${title}: ${cleanDescription}`,
              source: link,
              lastUpdated: pubDate
            };
          } else {
            Logger.log(`RSS item for ${analyst.name} is older than 24 hours (${hoursDiff.toFixed(2)} hours old)`);
          }
        } else {
          Logger.log(`Failed to fetch RSS feed ${feedUrl} with response code ${response.getResponseCode()}`);
        }
      } catch (feedError) {
        Logger.log(`Error fetching RSS feed ${feedUrl}: ${feedError}`);
      }
    }
    
    // If we couldn't retrieve any data from any feed, return null
    return null;
  } catch (error) {
    Logger.log(`Error in fetchAnalystRSSContent for ${analyst.name}: ${error}`);
    return null;
  }
}

/**
 * Function to fetch content from websites for a specific analyst
 * @param {Object} analyst - The analyst to fetch website data for
 * @return {Object} Analyst data with content from websites
 */
function fetchAnalystWebsiteContent(analyst) {
  try {
    if (!analyst.websites || analyst.websites.length === 0) {
      return null;
    }
    
    Logger.log(`Fetching websites for ${analyst.name}...`);
    
    // Try each website
    for (const websiteUrl of analyst.websites) {
      try {
        // Fetch the website
        const response = UrlFetchApp.fetch(websiteUrl, {
          muteHttpExceptions: true,
          followRedirects: true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
          }
        });
        
        // Check if we got a valid response
        if (response.getResponseCode() === 200) {
          const htmlContent = response.getContentText();
          
          // Extract the publication date from the HTML content
          const pubDate = extractPublicationDate(htmlContent, websiteUrl);
          
          // Special handling for RiskReversal (Dan Nathan)
          if (websiteUrl.includes("riskreversal.com")) {
            // Extract the latest article title and content
            const articleRegex = /<h2 class="entry-title">\s*<a href="([^"]*)"[^>]*>(.*?)<\/a>/s;
            const articleMatch = htmlContent.match(articleRegex);
            
            if (articleMatch) {
              const articleUrl = articleMatch[1];
              const articleTitle = articleMatch[2].replace(/<[^>]*>/g, '').trim();
              
              // Fetch the article content
              try {
                const articleResponse = UrlFetchApp.fetch(articleUrl, {
                  muteHttpExceptions: true,
                  followRedirects: true,
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
                  }
                });
                
                if (articleResponse.getResponseCode() === 200) {
                  const articleHtml = articleResponse.getContentText();
                  
                  // Extract the article publication date
                  const articlePubDate = extractPublicationDate(articleHtml, articleUrl);
                  
                  // Extract the article content
                  const contentRegex = /<div class="entry-content">(.*?)<\/div>/s;
                  const contentMatch = articleHtml.match(contentRegex);
                  
                  if (contentMatch) {
                    // Clean up the content by removing HTML tags and excessive whitespace
                    const cleanContent = contentMatch[1].replace(/<[^>]*>/g, ' ')
                                                       .replace(/\s+/g, ' ')
                                                       .replace(/&nbsp;/g, ' ')
                                                       .replace(/&amp;/g, '&')
                                                       .replace(/&lt;/g, '<')
                                                       .replace(/&gt;/g, '>')
                                                       .trim();
                    
                    // Extract the first paragraph or up to 200 characters
                    const firstParagraph = cleanContent.split('.')[0] + '.';
                    const snippet = firstParagraph.length > 200 ? firstParagraph.substring(0, 200) + '...' : firstParagraph;
                    
                    return {
                      content: `${articleTitle}: ${snippet}`,
                      source: articleUrl,
                      lastUpdated: articlePubDate
                    };
                  }
                }
              } catch (articleError) {
                Logger.log(`Error fetching article ${articleUrl}: ${articleError}`);
              }
              
              // If we couldn't extract the article content, try to get the meta description
              const metaDescriptionRegex = /<meta name="description" content="([^"]*)">/;
              const metaDescriptionMatch = htmlContent.match(metaDescriptionRegex);
              
              if (metaDescriptionMatch) {
                return {
                  content: metaDescriptionMatch[1],
                  source: websiteUrl,
                  lastUpdated: pubDate
                };
              }
            }
            
            // If we couldn't extract the article content, try to get the meta description
            const metaDescriptionRegex = /<meta name="description" content="([^"]*)">/;
            const metaDescriptionMatch = htmlContent.match(metaDescriptionRegex);
            
            if (metaDescriptionMatch) {
              return {
                content: metaDescriptionMatch[1],
                source: websiteUrl,
                lastUpdated: pubDate
              };
            }
          }
          
          // Special handling for CNBC
          if (websiteUrl.includes("cnbc.com")) {
            // Try to extract the headline and description
            const headlineRegex = /<h1[^>]*>(.*?)<\/h1>/s;
            const headlineMatch = htmlContent.match(headlineRegex);
            
            const descriptionRegex = /<p[^>]*class="[^"]*desc[^"]*"[^>]*>(.*?)<\/p>/s;
            const descriptionMatch = htmlContent.match(descriptionRegex);
            
            if (headlineMatch && descriptionMatch) {
              const headline = headlineMatch[1].replace(/<[^>]*>/g, '').trim();
              const description = descriptionMatch[1].replace(/<[^>]*>/g, '').trim();
              
              return {
                content: `${headline}: ${description}`,
                source: websiteUrl,
                lastUpdated: pubDate
              };
            } else if (headlineMatch) {
              const headline = headlineMatch[1].replace(/<[^>]*>/g, '').trim();
              
              // Try to find the first paragraph
              const paragraphRegex = /<p[^>]*>(.*?)<\/p>/s;
              const paragraphMatch = htmlContent.match(paragraphRegex);
              
              if (paragraphMatch) {
                const paragraph = paragraphMatch[1].replace(/<[^>]*>/g, '').trim();
                
                return {
                  content: `${headline}: ${paragraph}`,
                  source: websiteUrl,
                  lastUpdated: pubDate
                };
              }
              
              return {
                content: headline,
                source: websiteUrl,
                lastUpdated: pubDate
              };
            }
            
            // Try CNBC API for video content
            if (websiteUrl.includes("video")) {
              // Extract video ID from URL
              const videoIdRegex = /\/(\d+)\//;
              const videoIdMatch = websiteUrl.match(videoIdRegex);
              
              if (videoIdMatch) {
                const videoId = videoIdMatch[1];
                const apiUrl = `https://www.cnbc.com/id/${videoId}?&callback=videoMetaData`;
                
                try {
                  const apiResponse = UrlFetchApp.fetch(apiUrl, {
                    muteHttpExceptions: true,
                    followRedirects: true,
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
                    }
                  });
                  
                  if (apiResponse.getResponseCode() === 200) {
                    const apiContent = apiResponse.getContentText();
                    
                    // Extract JSON from JSONP response
                    const jsonRegex = /videoMetaData\((.*)\)/s;
                    const jsonMatch = apiContent.match(jsonRegex);
                    
                    if (jsonMatch) {
                      try {
                        const videoData = JSON.parse(jsonMatch[1]);
                        
                        if (videoData.headline && videoData.description) {
                          // Get the publication date from the API response
                          let videoPubDate = pubDate;
                          if (videoData.datePublished) {
                            try {
                              videoPubDate = new Date(videoData.datePublished);
                            } catch (e) {
                              Logger.log(`Error parsing video date: ${e}`);
                            }
                          }
                          
                          return {
                            content: `${videoData.headline}: ${videoData.description}`,
                            source: websiteUrl,
                            lastUpdated: videoPubDate
                          };
                        }
                      } catch (jsonError) {
                        Logger.log(`Error parsing CNBC API JSON: ${jsonError}`);
                      }
                    }
                  }
                } catch (apiError) {
                  Logger.log(`Error fetching CNBC API: ${apiError}`);
                }
              }
            }
          }
          
          // Special handling for Project Syndicate (Mohamed El-Erian)
          if (websiteUrl.includes("project-syndicate.org")) {
            // Extract the latest article title and content
            const articleRegex = /<h1[^>]*>(.*?)<\/h1>.*?<div class="article__text">(.*?)<\/div>/s;
            const articleMatch = htmlContent.match(articleRegex);
            
            if (articleMatch) {
              const articleTitle = articleMatch[1].replace(/<[^>]*>/g, '').trim();
              const articleContent = articleMatch[2].replace(/<[^>]*>/g, ' ')
                                                  .replace(/\s+/g, ' ')
                                                  .replace(/&nbsp;/g, ' ')
                                                  .replace(/&amp;/g, '&')
                                                  .replace(/&lt;/g, '<')
                                                  .replace(/&gt;/g, '>')
                                                  .trim();
              
              // Extract the first paragraph or up to 200 characters
              const firstParagraph = articleContent.split('.')[0] + '.';
              const snippet = firstParagraph.length > 200 ? firstParagraph.substring(0, 200) + '...' : firstParagraph;
              
              return {
                content: `${articleTitle}: ${snippet}`,
                source: websiteUrl,
                lastUpdated: pubDate
              };
            }
          }
          
          // Special handling for Financial Times (Mohamed El-Erian)
          if (websiteUrl.includes("ft.com")) {
            // Extract the headline and description
            const headlineRegex = /<h1[^>]*>(.*?)<\/h1>/s;
            const headlineMatch = htmlContent.match(headlineRegex);
            
            const descriptionRegex = /<p[^>]*class="[^"]*standfirst[^"]*"[^>]*>(.*?)<\/p>/s;
            const descriptionMatch = htmlContent.match(descriptionRegex);
            
            if (headlineMatch && descriptionMatch) {
              const headline = headlineMatch[1].replace(/<[^>]*>/g, '').trim();
              const description = descriptionMatch[1].replace(/<[^>]*>/g, '').trim();
              
              return {
                content: `${headline}: ${description}`,
                source: websiteUrl,
                lastUpdated: pubDate
              };
            }
          }
          
          // Special handling for Bloomberg (Mohamed El-Erian)
          if (websiteUrl.includes("bloomberg.com")) {
            // Extract the headline and description
            const headlineRegex = /<h1[^>]*>(.*?)<\/h1>/s;
            const headlineMatch = htmlContent.match(headlineRegex);
            
            const descriptionRegex = /<div[^>]*class="[^"]*subheadline[^"]*"[^>]*>(.*?)<\/div>/s;
            const descriptionMatch = htmlContent.match(descriptionRegex);
            
            if (headlineMatch && descriptionMatch) {
              const headline = headlineMatch[1].replace(/<[^>]*>/g, '').trim();
              const description = descriptionMatch[1].replace(/<[^>]*>/g, '').trim();
              
              return {
                content: `${headline}: ${description}`,
                source: websiteUrl,
                lastUpdated: pubDate
              };
            }
          }
          
          // General extraction for other websites
          // Try to extract the meta description
          const metaDescriptionRegex = /<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i;
          const metaDescriptionMatch = htmlContent.match(metaDescriptionRegex);
          
          if (metaDescriptionMatch) {
            return {
              content: metaDescriptionMatch[1],
              source: websiteUrl,
              lastUpdated: pubDate
            };
          }
          
          // Try to extract the title and first paragraph
          const titleRegex = /<title[^>]*>(.*?)<\/title>/s;
          const titleMatch = htmlContent.match(titleRegex);
          
          const paragraphRegex = /<p[^>]*>(.*?)<\/p>/s;
          const paragraphMatch = htmlContent.match(paragraphRegex);
          
          if (titleMatch && paragraphMatch) {
            const title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
            const paragraph = paragraphMatch[1].replace(/<[^>]*>/g, '').trim();
            
            return {
              content: `${title}: ${paragraph}`,
              source: websiteUrl,
              lastUpdated: pubDate
            };
          }
        } else {
          Logger.log(`Failed to fetch website ${websiteUrl} with response code ${response.getResponseCode()}`);
        }
      } catch (websiteError) {
        Logger.log(`Error fetching website ${websiteUrl}: ${websiteError}`);
      }
    }
    
    // If we couldn't retrieve any data from any website, return null
    return null;
  } catch (error) {
    Logger.log(`Error in fetchAnalystWebsiteContent for ${analyst.name}: ${error}`);
    return null;
  }
}

/**
 * Function to search for recent content from an analyst using Google Search
 * @param {Object} analyst - The analyst to search for
 * @return {Object} Analyst data with content from search results
 */
function searchForAnalystContent(analyst) {
  try {
    // Try with 24-hour time range first
    Logger.log(`Searching for recent content from ${analyst.name}...`);
    const dayResults = searchForAnalystContentWithTimeRange(analyst, "d");
    
    // If we found content within 24 hours, return it
    if (dayResults && dayResults.content && !dayResults.content.includes("No recent content found")) {
      return dayResults;
    }
    
    // Otherwise, try with 1-week time range
    Logger.log(`No content found within 24 hours for ${analyst.name}, trying 1-week range...`);
    const weekResults = searchForAnalystContentWithTimeRange(analyst, "w");
    
    // If we found content within 1 week, return it
    if (weekResults && weekResults.content && !weekResults.content.includes("No recent content found")) {
      return weekResults;
    }
    
    // If still no results, try financial news sites
    Logger.log(`No content found within 1 week for ${analyst.name}, trying financial news sites...`);
    return getAnalystContentFromFinancialNews(analyst);
  } catch (error) {
    Logger.log(`Error searching for content for analyst ${analyst.name}: ${error}`);
    return {
      content: `Error searching for content: ${error.message}`,
      source: "Error",
      lastUpdated: new Date()
    };
  }
}

/**
 * Function to get analyst content from financial news sites as a fallback
 * @param {Object} analyst - The analyst to get content for
 * @return {Object} Analyst data with content from financial news
 */
function getAnalystContentFromFinancialNews(analyst) {
  try {
    // Define financial news sites to check
    const financialNewsSites = [
      {
        name: "MarketWatch",
        url: `https://www.marketwatch.com/search?q=${encodeURIComponent(analyst.name)}&ts=0&tab=All%20News`
      },
      {
        name: "Yahoo Finance",
        url: `https://finance.yahoo.com/search?q=${encodeURIComponent(analyst.name)}`
      },
      {
        name: "Bloomberg",
        url: `https://www.bloomberg.com/search?query=${encodeURIComponent(analyst.name)}`
      }
    ];
    
    // Try each financial news site
    for (const site of financialNewsSites) {
      try {
        const response = UrlFetchApp.fetch(site.url, {
          muteHttpExceptions: true,
          followRedirects: true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
          }
        });
        
        if (response.getResponseCode() === 200) {
          const htmlContent = response.getContentText();
          
          // Extract publication date
          const pubDate = extractPublicationDate(htmlContent, site.url);
          
          // MarketWatch-specific extraction
          if (site.name === "MarketWatch") {
            // Extract article titles and snippets
            const articleRegex = /<div class="[^"]*">\s*<a href="([^"]*)"[^>]*>(.*?)<\/a>.*?<div class="[^"]*">(.*?)<\/div>/gs;
            let articleMatch;
            while ((articleMatch = articleRegex.exec(htmlContent)) !== null && results.length < 3) {
              const url = articleMatch[1];
              const title = articleMatch[2].replace(/<[^>]*>/g, '').trim();
              const snippet = articleMatch[3].replace(/<[^>]*>/g, '').trim();
              
              if (title && snippet && (title.includes(analyst.name) || snippet.includes(analyst.name))) {
                // Try to get the article's publication date
                try {
                  const articleResponse = UrlFetchApp.fetch(url, {
                    muteHttpExceptions: true,
                    followRedirects: true,
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
                    }
                  });
                  
                  if (articleResponse.getResponseCode() === 200) {
                    const articleHtml = articleResponse.getContentText();
                    const articlePubDate = extractPublicationDate(articleHtml, url);
                    
                    return {
                      content: `${title}: ${snippet}`,
                      source: url,
                      lastUpdated: articlePubDate
                    };
                  }
                } catch (articleError) {
                  Logger.log(`Error fetching MarketWatch article: ${articleError}`);
                }
                
                // Fallback to the search page date
                return {
                  content: `${title}: ${snippet}`,
                  source: url,
                  lastUpdated: pubDate
                };
              }
            }
          }
          
          // Yahoo Finance-specific extraction
          if (site.name === "Yahoo Finance") {
            // Extract article titles and snippets
            const articleRegex = /<a href="([^"]*)"[^>]*>.*?<h3[^>]*>(.*?)<\/h3>.*?<div[^>]*>(.*?)<\/div>/gs;
            let articleMatch;
            while ((articleMatch = articleRegex.exec(htmlContent)) !== null && results.length < 3) {
              const url = articleMatch[1];
              const title = articleMatch[2].replace(/<[^>]*>/g, '').trim();
              const snippet = articleMatch[3].replace(/<[^>]*>/g, '').trim();
              
              if (title && snippet && (title.includes(analyst.name) || snippet.includes(analyst.name))) {
                // Try to get the article's publication date
                try {
                  const articleResponse = UrlFetchApp.fetch(url, {
                    muteHttpExceptions: true,
                    followRedirects: true,
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
                    }
                  });
                  
                  if (articleResponse.getResponseCode() === 200) {
                    const articleHtml = articleResponse.getContentText();
                    const articlePubDate = extractPublicationDate(articleHtml, url);
                    
                    return {
                      content: `${title}: ${snippet}`,
                      source: url,
                      lastUpdated: articlePubDate
                    };
                  }
                } catch (articleError) {
                  Logger.log(`Error fetching Yahoo Finance article: ${articleError}`);
                }
                
                // Fallback to the search page date
                return {
                  content: `${title}: ${snippet}`,
                  source: url,
                  lastUpdated: pubDate
                };
              }
            }
          }
          
          // Look for mentions of the analyst
          const analystRegex = new RegExp(`(([^.!?]*?${analyst.name}[^.!?]*?)[.!?])`, 'i');
          const analystMatch = htmlContent.match(analystRegex);
          
          if (analystMatch) {
            // Clean up the content by removing HTML tags and excessive whitespace
            const cleanContent = analystMatch[1].replace(/<[^>]*>/g, ' ')
                                                .replace(/\s+/g, ' ')
                                                .replace(/&nbsp;/g, ' ')
                                                .replace(/&amp;/g, '&')
                                                .replace(/&lt;/g, '<')
                                                .replace(/&gt;/g, '>')
                                                .trim();
            
            return {
              content: cleanContent,
              source: site.url,
              lastUpdated: pubDate
            };
          }
        }
      } catch (siteError) {
        Logger.log(`Error fetching from ${site.name} for analyst ${analyst.name}: ${siteError}`);
      }
    }
    
    // Try direct CNBC API for CNBC contributors
    if (analyst.role && analyst.role.includes("CNBC")) {
      try {
        const cnbcApiUrl = `https://www.cnbc.com/search/api/v1/search?q=${encodeURIComponent(analyst.name)}&type=news`;
        const response = UrlFetchApp.fetch(cnbcApiUrl, {
          muteHttpExceptions: true,
          followRedirects: true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
            'Accept': 'application/json'
          }
        });
        
        if (response.getResponseCode() === 200) {
          try {
            const jsonResponse = JSON.parse(response.getContentText());
            if (jsonResponse && jsonResponse.results && jsonResponse.results.length > 0) {
              const firstResult = jsonResponse.results[0];
              if (firstResult.title && firstResult.description) {
                // Try to parse the publication date from the API response
                let pubDate = new Date();
                if (firstResult.datePublished || firstResult.publishedDate) {
                  try {
                    pubDate = new Date(firstResult.datePublished || firstResult.publishedDate);
                  } catch (dateError) {
                    Logger.log(`Error parsing CNBC API date: ${dateError}`);
                  }
                }
                
                return {
                  content: `${firstResult.title}: ${firstResult.description}`,
                  source: firstResult.url || cnbcApiUrl,
                  lastUpdated: pubDate
                };
              }
            }
          } catch (jsonError) {
            Logger.log(`Error parsing CNBC API JSON for ${analyst.name}: ${jsonError}`);
          }
        }
      } catch (cnbcApiError) {
        Logger.log(`Error fetching from CNBC API for ${analyst.name}: ${cnbcApiError}`);
      }
      
      // Try CNBC direct article fetch for specific analysts
      try {
        let cnbcUrl = "";
        if (analyst.name === "Dan Niles") {
          cnbcUrl = "https://www.cnbc.com/video/2025/03/19/dan-niles-on-nvidia-and-other-tech-stocks.html";
        } else if (analyst.name === "Steve Weiss") {
          cnbcUrl = "https://www.cnbc.com/halftime/";
        } else if (analyst.name === "Joe Terranova") {
          cnbcUrl = "https://www.cnbc.com/halftime/";
        } else {
          cnbcUrl = `https://www.cnbc.com/${analyst.name.toLowerCase().replace(/ /g, "-")}/`;
        }
        
        const response = UrlFetchApp.fetch(cnbcUrl, {
          muteHttpExceptions: true,
          followRedirects: true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
          }
        });
        
        if (response.getResponseCode() === 200) {
          const htmlContent = response.getContentText();
          
          // Extract publication date
          const pubDate = extractPublicationDate(htmlContent, cnbcUrl);
          
          // Extract the headline and description
          const headlineRegex = /<h1[^>]*>(.*?)<\/h1>/s;
          const headlineMatch = htmlContent.match(headlineRegex);
          
          const descriptionRegex = /<p[^>]*class="[^"]*desc[^"]*"[^>]*>(.*?)<\/p>/s;
          const descriptionMatch = htmlContent.match(descriptionRegex);
          
          if (headlineMatch && descriptionMatch) {
            const headline = headlineMatch[1].replace(/<[^>]*>/g, '').trim();
            const description = descriptionMatch[1].replace(/<[^>]*>/g, '').trim();
            
            return {
              content: `${headline}: ${description}`,
              source: cnbcUrl,
              lastUpdated: pubDate
            };
          } else if (headlineMatch) {
            const headline = headlineMatch[1].replace(/<[^>]*>/g, '').trim();
            
            return {
              content: headline,
              source: cnbcUrl,
              lastUpdated: pubDate
            };
          }
          
          // Try to find any paragraph with the analyst's name
          const analystRegex = new RegExp(`<p[^>]*>([^<]*${analyst.name}[^<]*)<\/p>`, 'i');
          const analystMatch = htmlContent.match(analystRegex);
          
          if (analystMatch) {
            return {
              content: analystMatch[1].trim(),
              source: cnbcUrl,
              lastUpdated: pubDate
            };
          }
        }
      } catch (cnbcDirectError) {
        Logger.log(`Error fetching from CNBC direct for ${analyst.name}: ${cnbcDirectError}`);
      }
    }
    
    // If we still couldn't find anything, return a generic message
    return {
      content: `No recent content found for ${analyst.name}. Market commentary may be available in the future.`,
      source: "Financial News",
      lastUpdated: new Date()
    };
  } catch (error) {
    Logger.log(`Error in getAnalystContentFromFinancialNews for ${analyst.name}: ${error}`);
    return {
      content: `Error searching for content: ${error.message}`,
      source: "Error",
      lastUpdated: new Date()
    };
  }
}

/**
 * Function to search for analyst content with a specific time range
 * @param {Object} analyst - The analyst to search for
 * @param {string} timeRange - Time range code (d=day, w=week, m=month)
 * @return {Object} Analyst data with content from search results
 */
function searchForAnalystContentWithTimeRange(analyst, timeRange) {
  try {
    Logger.log(`Searching for content from ${analyst.name} with time range: ${timeRange}...`);
    
    // Add a small delay before making Google Search requests to avoid rate limiting
    Utilities.sleep(1000);
    
    // Construct the search query
    const searchQuery = `${analyst.name} market analysis stock market`;
    
    // Use tbs=qdr:X where X is the time range
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=nws&tbs=qdr:${timeRange}`;
    
    // Fetch the search results
    const response = UrlFetchApp.fetch(searchUrl, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      }
    });
    
    // Handle rate limiting
    if (response.getResponseCode() === 429) {
      // If rate limited, try to get content from a financial news site instead
      return getAnalystContentFromFinancialNews(analyst);
    }
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`Failed to search for ${analyst.name} with response code ${response.getResponseCode()}`);
    }
    
    const htmlContent = response.getContentText();
    
    // Extract search results - first try the standard Google News format
    let resultRegex = /<div class="[^"]*">\s*<a href="([^"]*)"[^>]*>(.*?)<\/a>.*?<div class="[^"]*">(.*?)<\/div>/gs;
    let resultMatch;
    let results = [];
    
    while ((resultMatch = resultRegex.exec(htmlContent)) !== null && results.length < 3) {
      const url = resultMatch[1];
      const title = resultMatch[2].replace(/<[^>]*>/g, '').trim();
      const snippet = resultMatch[3].replace(/<[^>]*>/g, '').trim();
      
      if (title && snippet) {
        results.push({
          url: url,
          title: title,
          snippet: snippet
        });
      }
    }
    
    // If no results found with the first pattern, try an alternative pattern
    if (results.length === 0) {
      resultRegex = /<a href="([^"]*)"[^>]*>.*?<h3[^>]*>(.*?)<\/h3>.*?<div[^>]*>(.*?)<\/div>/gs;
      
      while ((resultMatch = resultRegex.exec(htmlContent)) !== null && results.length < 3) {
        const url = resultMatch[1];
        const title = resultMatch[2].replace(/<[^>]*>/g, '').trim();
        const snippet = resultMatch[3].replace(/<[^>]*>/g, '').trim();
        
        if (title && snippet) {
          results.push({
            url: url,
            title: title,
            snippet: snippet
          });
        }
      }
    }
    
    // If we found search results, use the first one
    if (results.length > 0) {
      const result = results[0];
      
      // Check if the result is recent (within the specified time range)
      // For day: within 24 hours, for week: within 7 days
      let isRecent = true;
      let pubDate = new Date();
      
      // Try to extract date from the result
      const dateRegex = /(\d+)\s+(hour|minute|second|day)s?\s+ago/i;
      const dateMatch = result.snippet.match(dateRegex);
      
      if (dateMatch) {
        const timeValue = parseInt(dateMatch[1]);
        const timeUnit = dateMatch[2].toLowerCase();
        
        // Calculate publication date based on time ago
        pubDate = new Date();
        if (timeUnit === "minute") {
          pubDate.setMinutes(pubDate.getMinutes() - timeValue);
        } else if (timeUnit === "hour") {
          pubDate.setHours(pubDate.getHours() - timeValue);
          if (timeRange === "d" && timeValue > 24) {
            isRecent = false;
          }
        } else if (timeUnit === "day") {
          pubDate.setDate(pubDate.getDate() - timeValue);
          if (timeRange === "d" && timeValue >= 1) {
            isRecent = false;
          }
        }
      }
      
      if (isRecent) {
        // Try to fetch the actual article to get a more accurate publication date
        try {
          const articleResponse = UrlFetchApp.fetch(result.url, {
            muteHttpExceptions: true,
            followRedirects: true,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
            }
          });
          
          if (articleResponse.getResponseCode() === 200) {
            const articleHtml = articleResponse.getContentText();
            const articlePubDate = extractPublicationDate(articleHtml, result.url);
            
            // Use the extracted publication date if available
            if (articlePubDate && articlePubDate.getTime() !== new Date().getTime()) {
              pubDate = articlePubDate;
            }
          }
        } catch (articleError) {
          Logger.log(`Error fetching article for timestamp: ${articleError}`);
        }
        
        return {
          content: `${result.title}: ${result.snippet}`,
          source: result.url,
          lastUpdated: pubDate
        };
      }
    }
    
    // If we still couldn't find anything, try financial news sites
    return getAnalystContentFromFinancialNews(analyst);
  } catch (error) {
    Logger.log(`Error in searchForAnalystContentWithTimeRange for ${analyst.name}: ${error}`);
    // If any error occurs, try to get content from financial news
    return getAnalystContentFromFinancialNews(analyst);
  }
}

/**
 * Function to fetch sentiment indicator content
 * @param {Object} source - The sentiment indicator source
 * @return {Object} Sentiment indicator data
 */
function fetchSentimentIndicatorContent(source) {
  try {
    // Fetch the sentiment indicator data
    const response = UrlFetchApp.fetch(source.url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      }
    });
    
    // Check if we got a valid response
    if (response.getResponseCode() === 200) {
      const htmlContent = response.getContentText();
      
      // Extract the publication date
      const pubDate = extractPublicationDate(htmlContent, source.url);
      
      // Extract the sentiment reading based on the source
      let reading = "Data available";
      let content = "";
      
      if (source.name === "AAII Investor Sentiment Survey") {
        // AAII-specific extraction
        reading = "Data available but not parsed";
        content = "AAII Investor Sentiment Survey data";
        
        // Try to extract the bullish and bearish percentages
        const bullishRegex = /Bullish:\s*([\d.]+)%/i;
        const bearishRegex = /Bearish:\s*([\d.]+)%/i;
        
        const bullishMatch = htmlContent.match(bullishRegex);
        const bearishMatch = htmlContent.match(bearishRegex);
        
        if (bullishMatch && bearishMatch) {
          const bullishPct = parseFloat(bullishMatch[1]);
          const bearishPct = parseFloat(bearishMatch[1]);
          
          reading = `Bullish: ${bullishPct}%, Bearish: ${bearishPct}%`;
          content = `The AAII Investor Sentiment Survey shows ${bullishPct}% of investors are bullish and ${bearishPct}% are bearish. This sentiment reading is a contrarian indicator - extreme bullishness often signals market tops, while extreme bearishness often signals market bottoms.`;
        }
      } else if (source.name === "CBOE Put/Call Ratio") {
        // CBOE-specific extraction
        reading = "Latest CBOE Put/Call Ratio";
        content = "The CBOE Put/Call Ratio is a measure of market sentiment derived from options trading. A ratio above 1.0 indicates bearish sentiment (more puts than calls), while a ratio below 1.0 indicates bullish sentiment (more calls than puts).";
        
        // Try to extract the put/call ratio
        const ratioRegex = /Total Put\/Call Ratio\s*([\d.]+)/i;
        const ratioMatch = htmlContent.match(ratioRegex);
        
        if (ratioMatch) {
          const ratio = parseFloat(ratioMatch[1]);
          
          reading = `Put/Call Ratio: ${ratio}`;
          
          if (ratio > 1.0) {
            content = `The current CBOE Put/Call Ratio is ${ratio}, indicating bearish sentiment (more puts than calls). This is often a contrarian indicator - extreme bearishness may signal a market bottom.`;
          } else {
            content = `The current CBOE Put/Call Ratio is ${ratio}, indicating bullish sentiment (more calls than puts). This is often a contrarian indicator - extreme bullishness may signal a market top.`;
          }
        }
      } else if (source.name === "Investors Intelligence Bull/Bear Ratio") {
        // Extract the meta description as a fallback
        const metaDescRegex = /<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i;
        const metaDescMatch = htmlContent.match(metaDescRegex);
        
        if (metaDescMatch) {
          content = metaDescMatch[1].trim();
        } else {
          // Extract the title as a fallback
          const titleRegex = /<title[^>]*>(.*?)<\/title>/i;
          const titleMatch = htmlContent.match(titleRegex);
          
          if (titleMatch) {
            content = titleMatch[1].trim();
          }
        }
      } else {
        // Generic extraction for other sentiment indicators
        // Extract the meta description
        const metaDescRegex = /<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i;
        const metaDescMatch = htmlContent.match(metaDescRegex);
        
        if (metaDescMatch) {
          content = metaDescMatch[1].trim();
        } else {
          // Extract the title as a fallback
          const titleRegex = /<title[^>]*>(.*?)<\/title>/i;
          const titleMatch = htmlContent.match(titleRegex);
          
          if (titleMatch) {
            content = titleMatch[1].trim();
          }
        }
      }
      
      return {
        reading: reading,
        content: content,
        source: source.name,
        lastUpdated: pubDate
      };
    } else {
      return {
        reading: `Error: ${response.getResponseCode()}`,
        content: `Failed to retrieve data with response code ${response.getResponseCode()}`,
        source: source.name,
        lastUpdated: new Date()
      };
    }
  } catch (error) {
    Logger.log(`Error fetching sentiment indicator ${source.name}: ${error}`);
    return {
      reading: "Error retrieving data",
      content: `Error: ${error.message}`,
      source: source.name,
      lastUpdated: new Date()
    };
  }
}

/**
 * Function to fetch content from Twitter for a specific analyst
 * @param {Object} analyst - The analyst to fetch Twitter data for
 * @return {Object} Analyst data with content from Twitter
 */
function fetchTwitterContent(analyst) {
  try {
    if (!analyst.twitterHandle || analyst.twitterHandle === "") {
      return null;
    }
    
    // Use Twitter API or scrape Twitter profile
    const twitterUrl = `https://nitter.net/${analyst.twitterHandle}`;
    
    // Fetch the Twitter content
    const response = UrlFetchApp.fetch(twitterUrl, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      }
    });
    
    // Check if we got a valid response
    if (response.getResponseCode() === 200) {
      const htmlContent = response.getContentText();
      
      // Extract the latest tweet
      const tweetRegex = /<div class="tweet-content[^"]*">(.*?)<\/div>/gs;
      const tweetMatch = tweetRegex.exec(htmlContent);
      
      if (tweetMatch) {
        const tweetContent = tweetMatch[1].replace(/<[^>]*>/g, ' ')
                                   .replace(/\s+/g, ' ')
                                   .replace(/&nbsp;/g, ' ')
                                   .replace(/&amp;/g, '&')
                                   .replace(/&lt;/g, '<')
                                   .replace(/&gt;/g, '>')
                                   .trim();
        
        // Extract the tweet timestamp
        const timestampRegex = /<span class="tweet-date[^"]*">.*?<a[^>]*>(.*?)<\/a>/s;
        const timestampMatch = htmlContent.match(timestampRegex);
        
        let tweetTimestamp = new Date();
        if (timestampMatch) {
          // Try to parse the timestamp
          try {
            tweetTimestamp = new Date(timestampMatch[1]);
          } catch (e) {
            // If parsing fails, use current date
            Logger.log(`Error parsing tweet timestamp: ${e}`);
          }
        }
        
        return {
          content: tweetContent,
          source: `https://twitter.com/${analyst.twitterHandle}`,
          lastUpdated: tweetTimestamp
        };
      }
    }
    
    // If we couldn't retrieve any data, return null to try other methods
    return null;
  } catch (error) {
    Logger.log(`Error in fetchTwitterContent for ${analyst.name}: ${error}`);
    return null;
  }
}

/**
 * Tests the market sentiment data retrieval
 */
function testMarketSentiment() {
  try {
    Logger.log("Testing market sentiment data retrieval...");
    
    // Retrieve market sentiment data
    const marketSentimentData = retrieveMarketSentiment();
    
    // Log the results
    Logger.log("MARKET SENTIMENT DATA RESULTS:");
    Logger.log(`Analysts: Found ${marketSentimentData.analysts.length} analysts`);
    Logger.log(`Sentiment Indicators: Found ${marketSentimentData.sentimentIndicators.length} indicators`);
    
    // Log analyst content
    Logger.log("Analysts Content:");
    for (const analyst of marketSentimentData.analysts) {
      Logger.log(`- ${analyst.name} (${analyst.role})`);
      Logger.log(`  Content: ${analyst.content}`);
      Logger.log(`  Source: ${analyst.source}`);
      Logger.log(`  Last Updated: ${analyst.lastUpdated}`);
      
      // Log mentioned stock symbols if any
      if (analyst.mentionedSymbols && analyst.mentionedSymbols.length > 0) {
        Logger.log(`  Mentioned Symbols: ${analyst.mentionedSymbols.join(", ")}`);
      } else {
        Logger.log(`  Mentioned Symbols: None`);
      }
      
      Logger.log("");
    }
    
    // Log sentiment indicator content
    Logger.log("Sentiment Indicators Content:");
    for (const indicator of marketSentimentData.sentimentIndicators) {
      Logger.log(`- ${indicator.name}`);
      Logger.log(`  URL: ${indicator.url}`);
      Logger.log(`  Reading: ${indicator.reading}`);
      Logger.log(`  Content: ${indicator.content}`);
      Logger.log(`  Last Updated: ${indicator.lastUpdated}`);
      Logger.log("");
    }
    
    Logger.log("Market sentiment data retrieval test completed successfully.");
    
    return marketSentimentData;
  } catch (error) {
    Logger.log(`Error testing market sentiment data retrieval: ${error}`);
    return {
      error: true,
      message: `Failed to test market sentiment data retrieval: ${error}`
    };
  }
}
