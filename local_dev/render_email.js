/**
 * Local script to render the JSON output from OpenAI into a beautiful HTML email
 */

const fs = require('fs');
const path = require('path');
const { generateCompleteHtmlEmail, getNextScheduledAnalysisTime } = require('./emailTemplate');

// Sample JSON payload (this would come from OpenAI in production)
const expandedAnalysisJson = {
  "decision": "HOLD - Monitor Market Conditions",
  "summary": "Current market conditions suggest a cautious approach. While the S&P 500 shows resilience, mixed signals from economic indicators and heightened volatility warrant a hold position. Investors should monitor upcoming economic data releases and Fed communications closely before making new positions.",
  "justification": "The market is currently navigating a complex environment with mixed signals. The S&P 500 remains above key support levels, but the VIX has risen to 17.2, indicating increased uncertainty. Treasury yields show a partially inverted curve (2Y: 4.72%, 10Y: 4.28%), suggesting economic concerns. Recent inflation data (CPI: 3.2%, Core PCE: 2.8%) remains above the Fed's 2% target, complicating the path to rate cuts. Analyst sentiment is neutral to slightly bearish, with concerns about valuation levels and potential economic slowdown. Given these factors, maintaining current positions while avoiding new risk exposure is prudent until clearer directional signals emerge.",
  "analysis": {
    "sentiment": {
      "overall": "Neutral with Cautious Bias",
      "analysts": [
        {
          "analyst": "Jane Smith, CFA",
          "comment": "Market valuations remain stretched despite recent volatility. I'm concerned about the sustainability of the rally without substantial earnings growth.",
          "mentionedSymbols": ["SPY", "QQQ"],
          "source": "Market Insights Weekly"
        },
        {
          "analyst": "Michael Wong",
          "comment": "Technical indicators suggest we're approaching resistance levels. The risk-reward ratio doesn't favor new long positions at current levels.",
          "mentionedSymbols": ["SPY", "IWM"],
          "source": "Technical Analysis Today"
        },
        {
          "analyst": "Sarah Johnson",
          "comment": "Defensive sectors are showing relative strength, which typically precedes broader market caution. Consider rotating to quality and dividend stocks.",
          "mentionedSymbols": ["XLU", "XLP", "SPLV"],
          "source": "Sector Rotation Report"
        }
      ],
      "source": "Market Pulse Analysis",
      "sourceUrl": "https://www.marketpulseanalysis.com",
      "lastUpdated": "2023-09-15T14:30:00Z"
    },
    "marketIndicators": {
      "fearAndGreedIndex": {
        "value": 42,
        "interpretation": "Fear",
        "trend": "Declining from last week's neutral reading of 55, indicating growing investor concern.",
        "source": "CNN Business",
        "sourceUrl": "https://www.cnn.com/markets/fear-and-greed",
        "lastUpdated": "2023-09-15T16:00:00Z"
      },
      "vix": {
        "value": 17.2,
        "interpretation": "Elevated",
        "trend": "Rising from 15.8 last week, showing increasing market anxiety.",
        "source": "CBOE",
        "sourceUrl": "https://www.cboe.com/tradable_products/vix/",
        "lastUpdated": "2023-09-15T16:30:00Z"
      },
      "upcomingEvents": [
        {
          "event": "FOMC Meeting",
          "date": "2023-09-20",
          "importance": "High",
          "potentialImpact": "High volatility expected as markets assess Fed's stance on inflation and future rate path."
        },
        {
          "event": "Retail Sales Data",
          "date": "2023-09-18",
          "importance": "Medium",
          "potentialImpact": "Could influence market direction by providing insights into consumer spending strength."
        },
        {
          "event": "Initial Jobless Claims",
          "date": "2023-09-21",
          "importance": "Medium",
          "potentialImpact": "Continued low claims would support market, while rising claims could trigger concerns."
        }
      ],
      "source": "Economic Calendar Pro",
      "sourceUrl": "https://www.economiccalendarpro.com",
      "lastUpdated": "2023-09-15T12:00:00Z"
    },
    "fundamentalMetrics": {
      "stocks": [
        {
          "symbol": "AAPL",
          "name": "Apple Inc.",
          "price": "$178.72",
          "priceChange": "-0.8%",
          "pe": "29.4",
          "marketCap": "$2.81T",
          "comment": "Trading near all-time highs despite concerns about consumer spending and China market challenges.",
          "source": "Financial Data Services",
          "sourceUrl": "https://www.financialdataservices.com",
          "lastUpdated": "2023-09-15T16:00:00Z"
        },
        {
          "symbol": "MSFT",
          "name": "Microsoft Corporation",
          "price": "$331.16",
          "priceChange": "+0.3%",
          "pe": "33.8",
          "marketCap": "$2.46T",
          "comment": "Showing relative strength driven by cloud growth and AI initiatives.",
          "source": "Financial Data Services",
          "sourceUrl": "https://www.financialdataservices.com",
          "lastUpdated": "2023-09-15T16:00:00Z"
        },
        {
          "symbol": "NVDA",
          "name": "NVIDIA Corporation",
          "price": "$425.03",
          "priceChange": "-1.2%",
          "pe": "102.7",
          "marketCap": "$1.05T",
          "comment": "Experiencing profit-taking after strong run-up, but AI demand remains robust.",
          "source": "Financial Data Services",
          "sourceUrl": "https://www.financialdataservices.com",
          "lastUpdated": "2023-09-15T16:00:00Z"
        },
        {
          "symbol": "JPM",
          "name": "JPMorgan Chase & Co.",
          "price": "$148.25",
          "priceChange": "+0.5%",
          "pe": "11.2",
          "marketCap": "$429.8B",
          "comment": "Outperforming other financials due to strong trading revenue and stable net interest income.",
          "source": "Financial Data Services",
          "sourceUrl": "https://www.financialdataservices.com",
          "lastUpdated": "2023-09-15T16:00:00Z"
        }
      ],
      "source": "Market Data Analytics",
      "sourceUrl": "https://www.marketdataanalytics.com",
      "lastUpdated": "2023-09-15T16:00:00Z"
    },
    "macroeconomicFactors": {
      "treasuryYields": {
        "threeMonth": "5.32%",
        "oneYear": "5.03%",
        "twoYear": "4.72%",
        "tenYear": "4.28%",
        "thirtyYear": "4.40%",
        "yieldCurve": "Partially Inverted",
        "implications": "The inverted yield curve between 2Y and 10Y yields continues to signal recession concerns, though the steepening between 10Y and 30Y suggests some long-term economic optimism. The high short-term rates reflect the Fed's current restrictive policy stance.",
        "source": "U.S. Treasury",
        "sourceUrl": "https://www.treasury.gov/resource-center/data-chart-center/interest-rates/",
        "lastUpdated": "2023-09-15T16:00:00Z"
      },
      "fedPolicy": {
        "federalFundsRate": "5.25-5.50",
        "forwardGuidance": "Recent Fed communications suggest rates will remain higher for longer than previously anticipated, with potential for one more hike in 2023. Market expectations for rate cuts in early 2024 may be premature based on persistent inflation data.",
        "source": "Federal Reserve",
        "sourceUrl": "https://www.federalreserve.gov/monetarypolicy.htm",
        "lastUpdated": "2023-09-14T18:00:00Z"
      },
      "inflation": {
        "cpi": {
          "headline": "3.2",
          "core": "4.7"
        },
        "pce": {
          "headline": "3.0",
          "core": "2.8"
        },
        "trend": "Inflation has moderated from peak levels but remains stubbornly above the Fed's 2% target. Recent data shows a slight uptick in headline CPI, raising concerns about inflation persistence.",
        "outlook": "Inflation is expected to continue its gradual decline but may take longer than initially projected to reach the Fed's target. Shelter costs and services inflation remain particularly sticky.",
        "marketImpact": "Persistent inflation reduces the likelihood of near-term Fed rate cuts, potentially pressuring growth stocks and extending the higher-for-longer interest rate environment.",
        "source": "Bureau of Labor Statistics & Bureau of Economic Analysis",
        "sourceUrl": "https://www.bls.gov/cpi/",
        "lastUpdated": "2023-09-13T12:30:00Z"
      },
      "geopoliticalRisks": {
        "global": "Geopolitical tensions remain elevated with multiple hotspots contributing to market uncertainty.",
        "regions": [
          {
            "region": "Eastern Europe",
            "risks": [
              {
                "description": "Ongoing conflict affecting energy markets and supply chains",
                "impactLevel": "Moderate"
              }
            ]
          },
          {
            "region": "Middle East",
            "risks": [
              {
                "description": "Tensions potentially affecting oil supply and prices",
                "impactLevel": "Low to Moderate"
              }
            ]
          },
          {
            "region": "US-China Relations",
            "risks": [
              {
                "description": "Trade and technology restrictions impacting global supply chains",
                "impactLevel": "Moderate"
              }
            ]
          }
        ],
        "source": "Global Risk Monitor",
        "sourceUrl": "https://www.globalriskmonitor.org",
        "lastUpdated": "2023-09-14T09:00:00Z"
      }
    }
  },
  "source": "Market Pulse Daily Analysis",
  "sourceUrl": "https://www.marketpulsedaily.com",
  "timestamp": "2023-09-15T17:00:00Z"
};

// Get current time and calculate next scheduled analysis time
const currentTime = new Date();
const nextScheduledTime = getNextScheduledAnalysisTime(currentTime);

// Generate the HTML email
const htmlEmail = generateCompleteHtmlEmail(
  expandedAnalysisJson,
  expandedAnalysisJson.timestamp || currentTime.toISOString(),
  nextScheduledTime.toISOString()
);

// Write the HTML to a file
const outputPath = path.join(__dirname, 'market_pulse_daily.html');
fs.writeFileSync(outputPath, htmlEmail);

console.log(`HTML email generated successfully and saved to: ${outputPath}`);
console.log(`Current time: ${currentTime.toLocaleString()}`);
console.log(`Next scheduled analysis time: ${nextScheduledTime.toLocaleString()}`);

// Open the HTML file in the default browser (uncomment to enable)
// const { exec } = require('child_process');
// exec(`open ${outputPath}`);
