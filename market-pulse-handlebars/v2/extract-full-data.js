// Copy of generate-output.js but saves data to JSON instead of generating HTML
const fs = require('fs');
const path = require('path');

// Read the sample data
const sampleData = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample-data.json'), 'utf8'));

// Fix data structure to match template expectations
if (sampleData.marketIndicators && sampleData.marketIndicators.fearGreedIndex) {
  // Rename fearGreedIndex to fearGreed to match the template
  sampleData.marketIndicators.fearGreed = {
    value: sampleData.marketIndicators.fearGreedIndex.currentValue,
    classification: sampleData.marketIndicators.fearGreedIndex.currentClassification,
    color: getFearGreedColor(sampleData.marketIndicators.fearGreedIndex.currentValue),
    source: sampleData.marketIndicators.fearGreedIndex.source,
    sourceUrl: sampleData.marketIndicators.fearGreedIndex.sourceUrl,
    asOf: sampleData.marketIndicators.fearGreedIndex.asOf
  };
}

// Apply all the data transformations from generate-output.js
// (Copy all the data manipulation code from generate-output.js here)
// ...

// Move economic events to the top level
if (sampleData.marketIndicators && sampleData.marketIndicators.economicEvents) {
  sampleData.economicEvents = sampleData.marketIndicators.economicEvents.map(event => {
    return {
      date: event.date,
      time: event.time,
      name: event.event,
      source: event.source,
      forecast: event.forecast,
      previous: event.previous
    };
  });
}

// Fix top holdings (etfHoldings -> topHoldings)
if (sampleData.marketIndicators && sampleData.marketIndicators.sp500 && sampleData.marketIndicators.sp500.etfHoldings) {
  sampleData.marketIndicators.topHoldings = sampleData.marketIndicators.sp500.etfHoldings;
  
  // Add source and timestamp information to each ETF holding
  if (sampleData.marketIndicators.topHoldings && Array.isArray(sampleData.marketIndicators.topHoldings)) {
    sampleData.marketIndicators.topHoldings = sampleData.marketIndicators.topHoldings.map(holding => {
      return {
        ...holding,
        source: "ETF Database",
        sourceUrl: "https://etfdb.com/",
        asOf: "Apr 22, 2025, 4:00 PM EDT"
      };
    });
  }
}

// Fix fundamentalMetrics structure
if (sampleData.fundamentalMetrics) {
  // Create a properly structured fundamentalMetrics object
  const transformedFundamentalMetrics = {
    majorIndices: [],
    magnificentSeven: [],
    otherStocks: []
  };

  // Define category symbols
  const indicesSymbols = ['SPY', 'QQQ', 'DIA', 'IWM'];
  const magSevenSymbols = ['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'NVDA', 'TSLA'];

  // Process all stocks from the metrics data
  if (sampleData.fundamentalMetrics.majorIndices) {
    transformedFundamentalMetrics.majorIndices = sampleData.fundamentalMetrics.majorIndices.map(stock => {
      // Format metrics for display
      const formattedMetrics = [];
      if (stock.metrics) {
        // Convert metrics object to array of name/value pairs for the template
        Object.entries(stock.metrics).forEach(([key, value]) => {
          const metricName = getMetricDisplayName(key);
          const formattedValue = formatMetricValue(key, value);
          formattedMetrics.push({ name: metricName, value: formattedValue });
        });
      }

      return {
        symbol: stock.symbol,
        name: stock.name,
        price: formatNumber(stock.price),
        priceChange: formatNumber(stock.priceChange || 0),
        percentChange: formatNumber(stock.changesPercentage || 0),
        metrics: formattedMetrics
      };
    });
  }

  // Add macroeconomic factors with treasury yields
  if (!sampleData.macroeconomicFactors) {
    sampleData.macroeconomicFactors = {
      treasuryYields: {
        yields: [
          {
            maturity: "3-Month",
            rate: "5.28",
            change: 0.02
          },
          {
            maturity: "2-Year",
            rate: "4.97",
            change: 0.05
          },
          {
            maturity: "5-Year",
            rate: "4.63",
            change: 0.03
          },
          {
            maturity: "10-Year",
            rate: "4.62",
            change: 0.01
          },
          {
            maturity: "30-Year",
            rate: "4.73",
            change: -0.01
          }
        ],
        yieldCurve: {
          status: "Inverted (2Y/10Y)",
          description: "The yield curve remains inverted, with the 2-year yield 35 basis points higher than the 10-year yield. This inversion has historically been a recession indicator, though the timing can vary significantly.",
          color: "#f44336" // Red for inverted
        },
        source: "U.S. Department of the Treasury",
        sourceUrl: "https://home.treasury.gov/",
        asOf: "April 22, 2024 16:00 EST"
      },
      fedPolicy: {
        currentRate: "5.50",
        rateRange: "5.25% - 5.50%",
        guidance: "The Federal Reserve has indicated it expects to begin cutting rates later in 2024, with market participants anticipating 2-3 cuts by year-end. However, recent inflation data has raised questions about the timing of the first cut.",
        guidanceSource: "Federal Reserve",
        guidanceSourceUrl: "https://www.federalreserve.gov/",
        guidanceAsOf: "April 22, 2024",
        rateSource: "Federal Reserve",
        rateSourceUrl: "https://www.federalreserve.gov/",
        rateAsOf: "April 22, 2024",
        lastMeeting: "Previous: March 20, 2024",
        nextMeeting: "April 30 - May 1, 2024",
        meetingSource: "Federal Reserve",
        meetingSourceUrl: "https://www.federalreserve.gov/",
        meetingAsOf: "April 22, 2024",
        futuresPrice: "98.75",
        impliedRate: "5.25",
        cutProbability: 4.8,
        holdProbability: 95.2,
        hikeProbability: 0.0,
        futuresSource: "CME FedWatch Tool",
        futuresSourceUrl: "https://www.cmegroup.com/trading/interest-rates/countdown-to-fomc.html",
        futuresAsOf: "April 22, 2024"
      },
      inflation: {
        cpi: {
          headline: 3.5,
          core: 3.8,
          source: "Bureau of Labor Statistics",
          sourceUrl: "https://www.bls.gov/cpi/",
          asOf: "April 10, 2024"
        },
        pce: {
          headline: 2.5,
          core: 2.8,
          source: "Bureau of Economic Analysis",
          sourceUrl: "https://www.bea.gov/",
          asOf: "April 10, 2024"
        },
        expectations: [
          {
            period: "1-Year",
            value: 3.0,
            color: "#e53935",
            asOf: "April 10, 2024"
          },
          {
            period: "5-Year",
            value: 2.5,
            color: "#ffeb3b",
            asOf: "April 10, 2024"
          },
          {
            period: "10-Year",
            value: 2.3,
            color: "#7cb342",
            asOf: "April 10, 2024"
          }
        ],
        source: "St. Louis Fed (FRED API)",
        sourceUrl: "https://fred.stlouisfed.org/",
        lastUpdated: "Apr 22, 2025, 8:28 PM EDT",
        trendAnalysis: {
          analysis: "Inflation is above target, suggesting potential for tighter monetary policy. Continued inflation pressures may lead to higher interest rates, impacting growth stocks.",
          color: "#f44336", // Red for increasing
          source: "Bureau of Labor Statistics & Federal Reserve",
          sourceUrl: "https://www.bls.gov/cpi/",
          asOf: "April 10, 2024"
        },
        source: "Bureau of Labor Statistics & Federal Reserve",
        sourceUrl: "https://www.bls.gov/cpi/",
        asOf: "April 10, 2024"
      }
    };
  }

  // Add geopolitical risks
  if (!sampleData.geopoliticalRisks) {
    sampleData.geopoliticalRisks = {
      overview: "Heightened tensions in Eastern Europe and the Middle East are increasing market volatility.",
      risks: [
        {
          name: "Russia-Ukraine War Escalation",
          region: "Eastern Europe",
          impactLevel: "Severe",
          description: "The ongoing conflict between Russia and Ukraine continues to destabilize Eastern Europe, with recent escalations in military activity and sanctions intensifying.",
          color: "#d32f2f" // Red for severe risk
        },
        {
          name: "Israel-Hamas and Regional Middle East Tensions",
          region: "Middle East",
          impactLevel: "High",
          description: "Renewed hostilities between Israel and Hamas, along with broader regional tensions involving Iran and proxy groups, have raised concerns over energy security and shipping routes.",
          color: "#f44336" // Red for high risk
        },
        {
          name: "US-China Strategic and Economic Rivalry",
          region: "Global (US, China, Asia-Pacific)",
          impactLevel: "High",
          description: "Persistent tensions between the US and China over trade, technology, and security have resulted in new tariffs, export controls, and investment restrictions.",
          color: "#f44336" // Red for high risk
        }
      ],
      source: "S&P Global",
      sourceUrl: "https://www.spglobal.com/",
      asOf: "Apr 22, 2025, 8:29 PM EDT"
    };
  }

  // Write the full data to a JSON file
  fs.writeFileSync(path.join(__dirname, 'full-sample-data.json'), JSON.stringify(sampleData, null, 2));
  console.log('Full sample data extracted to full-sample-data.json');
}

// Helper functions
function formatMetricValue(key, value) {
  if (value === null || value === undefined || value === '' || value === 'N/A') {
    return 'N/A';
  }
  
  // Format based on metric type
  switch(key) {
    case 'pe':
    case 'forwardPE':
    case 'pegRatio':
      return Number(value).toFixed(1);
    case 'divYield':
    case 'beta':
      return Number(value).toFixed(2);
    default:
      return value;
  }
}

function getMetricDisplayName(key) {
  const metricLabels = {
    pe: 'P/E Ratio',
    forwardPE: 'Forward P/E',
    divYield: 'Dividend Yield',
    beta: 'Beta',
    pegRatio: 'PEG Ratio'
  };
  
  return metricLabels[key] || key;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '' || isNaN(value)) {
    return 'N/A';
  }
  return Number(value).toFixed(2);
}

function getFearGreedColor(value) {
  if (value <= 25) return "#e53935"; // Extreme Fear - Red
  if (value <= 45) return "#fb8c00"; // Fear - Orange
  if (value <= 55) return "#ffeb3b"; // Neutral - Yellow
  if (value <= 75) return "#7cb342"; // Greed - Light Green
  return "#43a047"; // Extreme Greed - Green
}
