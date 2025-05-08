// Add logging function
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

const fs = require('fs');
const Handlebars = require('handlebars');
const path = require('path');

// Register Handlebars helpers
Handlebars.registerHelper('gt', function(a, b) {
  return a > b;
});

Handlebars.registerHelper('lt', function(a, b) {
  return a < b;
});

Handlebars.registerHelper('currentYear', function() {
  return new Date().getFullYear();
});

Handlebars.registerHelper('formatDate', function(date) {
  if (!date) return '';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(date).toLocaleDateString('en-US', options);
});

Handlebars.registerHelper('formatTime', function(time) {
  if (!time) return '';
  return time;
});

Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

Handlebars.registerHelper('neq', function(a, b) {
  return a !== b;
});

Handlebars.registerHelper('and', function() {
  return Array.prototype.every.call(arguments, Boolean);
});

Handlebars.registerHelper('or', function() {
  return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
});

Handlebars.registerHelper('gte', function(a, b) {
  return a >= b;
});

Handlebars.registerHelper('lte', function(a, b) {
  return a <= b;
});

Handlebars.registerHelper('stringContains', function(str, substring) {
  if (typeof str !== 'string') return false;
  return str.includes(substring);
});

Handlebars.registerHelper('formatNumber', function(num, precision) {
  if (num === undefined || num === null || num === '' || num === 'N/A') {
    return 'N/A';
  }
  return Number(num).toFixed(precision || 0);
});

Handlebars.registerHelper('formatPercentage', function(num) {
  if (num === undefined || num === null || num === '' || num === 'N/A') {
    return 'N/A';
  }
  
  // If the value already contains a % symbol, return it as is
  if (typeof num === 'string' && num.includes('%')) {
    return num;
  }
  
  // Otherwise, format the number with 2 decimal places and add a % symbol
  return Number(num).toFixed(2) + '%';
});

Handlebars.registerHelper('ifCond', function(v1, operator, v2, options) {
  switch (operator) {
    case '==': return (v1 == v2) ? options.fn(this) : options.inverse(this);
    case '===': return (v1 === v2) ? options.fn(this) : options.inverse(this);
    case '!=': return (v1 != v2) ? options.fn(this) : options.inverse(this);
    case '!==': return (v1 !== v2) ? options.fn(this) : options.inverse(this);
    case '<': return (v1 < v2) ? options.fn(this) : options.inverse(this);
    case '<=': return (v1 <= v2) ? options.fn(this) : options.inverse(this);
    case '>': return (v1 > v2) ? options.fn(this) : options.inverse(this);
    case '>=': return (v1 >= v2) ? options.fn(this) : options.inverse(this);
    case '&&': return (v1 && v2) ? options.fn(this) : options.inverse(this);
    case '||': return (v1 || v2) ? options.fn(this) : options.inverse(this);
    default: return options.inverse(this);
  }
});

// Check if a string starts with a specific substring
Handlebars.registerHelper('startsWith', function(str, prefix) {
  if (typeof str !== 'string') return false;
  return str.startsWith(prefix);
});

// Helper function to load source information from full-sample-data.json
function loadSourceInfo(targetObj, section, sourceInfo) {
  if (!sourceInfo) {
    log(`No source info provided for ${section}`, 'WARNING');
    return;
  }

  log(`Adding missing ${section} source information`, 'TRANSFORM');
  
  // Map the source info to the expected property names in the template
  if (section === 'sectorPerformance') {
    targetObj.sectorSource = sourceInfo.source;
    targetObj.sectorSourceUrl = sourceInfo.sourceUrl;
    targetObj.sectorAsOf = sourceInfo.asOf;
  } else if (section === 'marketFutures') {
    targetObj.futuresSource = sourceInfo.source;
    targetObj.futuresSourceUrl = sourceInfo.sourceUrl;
    targetObj.futuresAsOf = sourceInfo.asOf;
  } else if (section === 'volatilityIndices') {
    targetObj.volatilitySource = sourceInfo.source;
    targetObj.volatilitySourceUrl = sourceInfo.sourceUrl;
    targetObj.volatilityAsOf = sourceInfo.asOf;
  } else {
    // For other sections, use the section name as prefix
    targetObj[`${section}Source`] = sourceInfo.source;
    targetObj[`${section}SourceUrl`] = sourceInfo.sourceUrl;
    targetObj[`${section}AsOf`] = sourceInfo.asOf;
  }
}

// Helper function to format metric values appropriately
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

// Helper function to get display name for metrics
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

// Helper function to format numbers
function formatNumber(value) {
  if (value === null || value === undefined || value === '' || isNaN(value)) {
    return 'N/A';
  }
  return Number(value).toFixed(2);
}

// Helper function to get color based on inflation period
function getInflationColor(period) {
  const colors = {
    '1-Year': '#e53935',
    '2-Year': '#fb8c00',
    '5-Year': '#ffeb3b',
    '10-Year': '#7cb342'
  };
  return colors[period] || '#2196F3';
}

// Helper function to get color based on risk level
function getRiskLevelColor(riskLevel) {
  if (!riskLevel) return '#757575';
  
  switch(riskLevel.toLowerCase()) {
    case 'high':
      return '#f44336';
    case 'medium':
      return '#ff9800';
    case 'low':
      return '#4caf50';
    default:
      return '#757575';
  }
}

// Helper function to get Fear & Greed description
function getFearGreedDescription(classification, value) {
  switch (classification) {
    case "Extreme Fear":
      return "Investors are in a state of extreme fear, potentially signaling a buying opportunity as markets may be oversold.";
    case "Fear":
      return "Market sentiment is fearful, suggesting caution but possible value opportunities in quality stocks.";
    case "Neutral":
      return "Market sentiment is balanced, with investors neither overly optimistic nor pessimistic about current conditions.";
    case "Greed":
      return "Investors are showing signs of greed, indicating potential market optimism but also raising concerns about overvaluation.";
    case "Extreme Greed":
      return "Markets are showing signs of extreme greed, potentially indicating a market top and suggesting caution for new investments.";
    default:
      return `Current market sentiment is at ${value}, indicating ${classification.toLowerCase()} among investors.`;
  }
}

// Helper function to get Fear & Greed color
function getFearGreedColor(value) {
  if (value <= 25) return "#e53935"; // Extreme Fear - Red
  if (value <= 45) return "#fb8c00"; // Fear - Orange
  if (value <= 55) return "#ffeb3b"; // Neutral - Yellow
  if (value <= 75) return "#7cb342"; // Greed - Light Green
  return "#43a047"; // Extreme Greed - Green
}

// Read the assembled template
const templateSource = fs.readFileSync(path.join(__dirname, 'assembled-template.html'), 'utf8');
const template = Handlebars.compile(templateSource);

// Read the sample data
const inputFile = process.argv[2] || 'full-sample-data.json';
const sampleData = JSON.parse(fs.readFileSync(path.join(__dirname, inputFile), 'utf8'));
log('Sample data loaded successfully', 'INFO');

// Ensure marketSentiment exists and map decision/justification from top level if needed
if (!sampleData.marketSentiment) {
  sampleData.marketSentiment = {};
}

// Map decision data from top level to marketSentiment if it exists
if (sampleData.decision) {
  sampleData.marketSentiment.decision = sampleData.decision.text || sampleData.decision;
  sampleData.marketSentiment.summary = sampleData.decision.summary || '';
  sampleData.marketSentiment.color = sampleData.decision.color || '';
  sampleData.marketSentiment.icon = sampleData.decision.icon || '';
}

// Map justification from top level to marketSentiment if it exists
if (sampleData.justification) {
  sampleData.marketSentiment.justification = sampleData.justification;
}

// Fix data structure to match template expectations
if (sampleData.marketIndicators && sampleData.marketIndicators.fearGreedIndex && !sampleData.marketIndicators.fearGreed) {
  log('Converting fearGreedIndex to fearGreed format', 'TRANSFORM');
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

// Fix more naming and structure mismatches
if (sampleData.marketIndicators) {
  // Move economic events to the top level
  if (sampleData.marketIndicators.economicEvents && !sampleData.economicEvents) {
    log('Moving economic events to top level', 'TRANSFORM');
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
  if (sampleData.marketIndicators.sp500 && sampleData.marketIndicators.sp500.etfHoldings && !sampleData.marketIndicators.topHoldings) {
    log('Converting etfHoldings to topHoldings format', 'TRANSFORM');
    sampleData.marketIndicators.topHoldings = sampleData.marketIndicators.sp500.etfHoldings.map(etf => {
      const newEtf = { ...etf };
      
      // Add source information if missing
      if (!newEtf.source) {
        log(`Adding missing source info to ETF holding: ${newEtf.symbol}`, 'TRANSFORM');
        try {
          // Try to load source info from full-sample-data.json
          const fullSampleData = JSON.parse(fs.readFileSync(path.join(__dirname, inputFile), 'utf8'));
          if (fullSampleData.etfHoldings) {
            const matchingEtf = fullSampleData.etfHoldings.find(e => e.symbol === newEtf.symbol);
            if (matchingEtf && matchingEtf.source) {
              newEtf.source = matchingEtf.source;
              newEtf.sourceUrl = matchingEtf.sourceUrl;
              newEtf.asOf = matchingEtf.asOf;
            }
          }
        } catch (error) {
          log(`Could not load ETF source info from ${inputFile}: ${error.message}`, 'WARNING');
        }
      }
      
      return newEtf;
    });
    
    // Remove the original etfHoldings property
    delete sampleData.marketIndicators.sp500.etfHoldings;
  }
}

// Move macroeconomic factors to top level
if (sampleData.macroeconomicFactors) {
  // Copy to top level
  sampleData.macroeconomicFactors = { ...sampleData.macroeconomicFactors };
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

  // Process magnificent seven
  if (sampleData.fundamentalMetrics.magnificentSeven) {
    transformedFundamentalMetrics.magnificentSeven = sampleData.fundamentalMetrics.magnificentSeven.map(stock => {
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

  // Process other stocks
  if (sampleData.fundamentalMetrics.otherStocks) {
    transformedFundamentalMetrics.otherStocks = sampleData.fundamentalMetrics.otherStocks.map(stock => {
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

  // Replace the original fundamentalMetrics with our transformed version
  sampleData.fundamentalMetrics = transformedFundamentalMetrics;
}

// Process fundamentalMetrics to ensure proper format for display
if (sampleData.fundamentalMetrics) {
  // Process each category of stocks
  ['majorIndices', 'magnificentSeven', 'otherStocks'].forEach(category => {
    if (sampleData.fundamentalMetrics[category] && Array.isArray(sampleData.fundamentalMetrics[category])) {
      // Process each stock in the category
      sampleData.fundamentalMetrics[category].forEach(stock => {
        // Ensure metrics is an array of objects with name and value properties
        if (stock.metrics && Array.isArray(stock.metrics)) {
          // Check if metrics are already properly formatted
          const allProperlyFormatted = stock.metrics.every(metric => 
            typeof metric === 'object' && 
            metric !== null && 
            typeof metric.name === 'string' && 
            typeof metric.value !== 'undefined' &&
            !metric.value.name // Ensure value is not an object with name property
          );
          
          if (!allProperlyFormatted) {
            // Convert metrics to proper format if needed
            const newMetrics = [];
            
            stock.metrics.forEach(metric => {
              if (typeof metric === 'object' && metric !== null) {
                if (typeof metric.name === 'string' && typeof metric.value !== 'undefined') {
                  // Check if value is an object with name/value properties
                  if (typeof metric.value === 'object' && metric.value !== null && metric.value.name && metric.value.value) {
                    newMetrics.push({
                      name: metric.value.name,
                      value: String(metric.value.value)
                    });
                  } else {
                    // Already in correct format, just ensure value is a string
                    newMetrics.push({
                      name: metric.name,
                      value: String(metric.value)
                    });
                  }
                } else {
                  // Convert object to name/value pair
                  const entries = Object.entries(metric);
                  if (entries.length > 0) {
                    newMetrics.push({
                      name: String(entries[0][0]),
                      value: String(entries[0][1])
                    });
                  }
                }
              } else if (typeof metric !== 'undefined') {
                // Fallback for invalid metrics
                newMetrics.push({ name: "Unknown", value: String(metric) });
              }
            });
            
            stock.metrics = newMetrics;
          }
        } else if (stock.metrics && typeof stock.metrics === 'object' && !Array.isArray(stock.metrics)) {
          // Convert object metrics to array of name/value pairs
          const newMetrics = [];
          Object.entries(stock.metrics).forEach(([key, value]) => {
            newMetrics.push({
              name: key,
              value: typeof value === 'undefined' ? '' : String(value)
            });
          });
          stock.metrics = newMetrics;
        } else {
          // Ensure metrics exists as an empty array if not present
          stock.metrics = [];
        }
        
        // Debug log to check the metrics structure
        if (stock.metrics) {
          log(`Processed metrics for ${stock.symbol}: ${JSON.stringify(stock.metrics)}`, 'DEBUG');
        }
      });
    }
  });
}

// Add fundamental metrics data if it doesn't exist
if (!sampleData.fundamentalMetrics) {
  log('Adding missing fundamentalMetrics', 'TRANSFORM');
  try {
    // Try to load fundamental metrics from the input file
    const fullSampleData = JSON.parse(fs.readFileSync(path.join(__dirname, inputFile), 'utf8'));
    if (fullSampleData.fundamentalMetrics) {
      log(`Using fundamentalMetrics from ${inputFile}`, 'TRANSFORM');
      sampleData.fundamentalMetrics = fullSampleData.fundamentalMetrics;
    } else {
      log(`No fundamentalMetrics found in ${inputFile}`, 'WARNING');
      sampleData.fundamentalMetrics = {
        majorIndices: [],
        magnificentSeven: [],
        otherStocks: []
      };
    }
  } catch (error) {
    log(`Could not load fundamentalMetrics from ${inputFile}: ${error.message}`, 'WARNING');
    sampleData.fundamentalMetrics = {
      majorIndices: [],
      magnificentSeven: [],
      otherStocks: []
    };
  }
}

// Make sure fundamentalMetrics is included in the output
if (sampleData.fundamentalMetrics) {
  // Ensure the fundamentalMetrics section is properly structured for the template
  if (!sampleData.fundamentalMetrics.majorIndices) {
    sampleData.fundamentalMetrics.majorIndices = [];
  }
  if (!sampleData.fundamentalMetrics.magnificentSeven) {
    sampleData.fundamentalMetrics.magnificentSeven = [];
  }
  if (!sampleData.fundamentalMetrics.otherStocks) {
    sampleData.fundamentalMetrics.otherStocks = [];
  }
  
  // Process metrics for each stock to ensure they're in the correct format
  ['majorIndices', 'magnificentSeven', 'otherStocks'].forEach(category => {
    if (sampleData.fundamentalMetrics[category] && Array.isArray(sampleData.fundamentalMetrics[category])) {
      sampleData.fundamentalMetrics[category] = sampleData.fundamentalMetrics[category].map(stock => {
        // If metrics is an array of objects with name/value pairs, keep it as is
        if (stock.metrics && Array.isArray(stock.metrics) && stock.metrics.length > 0 && 
            typeof stock.metrics[0] === 'object' && stock.metrics[0].name && stock.metrics[0].value) {
          // Already in the correct format
          return stock;
        } 
        // If metrics is an object, convert it to an array of name/value pairs
        else if (stock.metrics && typeof stock.metrics === 'object' && !Array.isArray(stock.metrics)) {
          const formattedMetrics = [];
          Object.entries(stock.metrics).forEach(([key, value]) => {
            formattedMetrics.push({
              name: key,
              value: value.toString()
            });
          });
          return {
            ...stock,
            metrics: formattedMetrics
          };
        }
        // If no metrics, create an empty array
        else {
          return {
            ...stock,
            metrics: []
          };
        }
      });
    }
  });
}

// Add geopolitical risks directly
// Check if we need to extract geopolitical risks from macroeconomicFactors
log('Checking for geopolitical risks data', 'TRANSFORM');

// First check if the data is already in the macroeconomicFactors section of the current data
if (sampleData.macroeconomicFactors && sampleData.macroeconomicFactors.geopoliticalRisks) {
  log('Found geopoliticalRisks in macroeconomicFactors of current data', 'TRANSFORM');
  // Extract it to the top level for the template
  sampleData.geopoliticalRisks = sampleData.macroeconomicFactors.geopoliticalRisks;
  
  // Map the risks array to the items array expected by the template
  if (sampleData.geopoliticalRisks.risks && Array.isArray(sampleData.geopoliticalRisks.risks)) {
    log(`Processing ${sampleData.geopoliticalRisks.risks.length} geopolitical risks items`, 'TRANSFORM');
    sampleData.geopoliticalRisks.items = sampleData.geopoliticalRisks.risks.map(risk => {
      return {
        title: risk.name,
        description: risk.description,
        region: risk.region,
        source: risk.source,
        sourceUrl: risk.sourceUrl,
        impactLevel: risk.impactLevel
      };
    });
  }
  
  // Set the overview from global description if available
  if (sampleData.geopoliticalRisks.global && !sampleData.geopoliticalRisks.overview) {
    sampleData.geopoliticalRisks.overview = `Global geopolitical risk level is currently ${sampleData.geopoliticalRisks.global}.`;
  }
}

// If we still don't have geopolitical risks at the top level, try to find it elsewhere
if (!sampleData.geopoliticalRisks) {
  log('Adding missing geopoliticalRisks', 'TRANSFORM');
  try {
    // Try to load geopolitical risks from macroeconomicFactors in full-sample-data.json
    const fullSampleData = JSON.parse(fs.readFileSync(path.join(__dirname, inputFile), 'utf8'));
    if (fullSampleData.macroeconomicFactors && fullSampleData.macroeconomicFactors.geopoliticalRisks) {
      log('Using geopoliticalRisks from macroeconomicFactors in full-sample-data.json', 'TRANSFORM');
      sampleData.geopoliticalRisks = fullSampleData.macroeconomicFactors.geopoliticalRisks;
      
      // Map the risks array to the items array expected by the template
      if (sampleData.geopoliticalRisks.risks && Array.isArray(sampleData.geopoliticalRisks.risks)) {
        log(`Processing ${sampleData.geopoliticalRisks.risks.length} geopolitical risks items from sample data`, 'TRANSFORM');
        sampleData.geopoliticalRisks.items = sampleData.geopoliticalRisks.risks.map(risk => {
          return {
            title: risk.name,
            description: risk.description,
            region: risk.region,
            source: risk.source,
            sourceUrl: risk.sourceUrl,
            impactLevel: risk.impactLevel
          };
        });
      }
      
      // Set the overview from global description if available
      if (sampleData.geopoliticalRisks.global && !sampleData.geopoliticalRisks.overview) {
        sampleData.geopoliticalRisks.overview = `Global geopolitical risk level is currently ${sampleData.geopoliticalRisks.global}.`;
      }
    } else {
      log('No geopoliticalRisks found in macroeconomicFactors in full-sample-data.json', 'WARNING');
      sampleData.geopoliticalRisks = {
        overview: null,
        items: [],
        source: null,
        sourceUrl: null,
        asOf: null
      };
    }
  } catch (error) {
    log('Could not load geopoliticalRisks from full-sample-data.json: ' + error.message, 'WARNING');
    sampleData.geopoliticalRisks = {
      overview: null,
      items: [],
      source: null,
      sourceUrl: null,
      asOf: null
    };
  }
}

// Add macroeconomic factors with treasury yields
if (!sampleData.macroeconomicFactors) {
  log('Adding missing macroeconomicFactors', 'TRANSFORM');
  
  // Try to load from full-sample-data.json first
  try {
    const fullSampleData = JSON.parse(fs.readFileSync(path.join(__dirname, inputFile), 'utf8'));
    if (fullSampleData.macroeconomicFactors) {
      log('Using macroeconomicFactors from full-sample-data.json', 'TRANSFORM');
      sampleData.macroeconomicFactors = fullSampleData.macroeconomicFactors;
    } else {
      throw new Error('No macroeconomicFactors in full-sample-data.json');
    }
  } catch (error) {
    log('Could not load macroeconomicFactors from full-sample-data.json: ' + error.message, 'WARNING');
    // Fallback to default values
    sampleData.macroeconomicFactors = {
      treasuryYields: {
        yields: [],
        source: null,
        sourceUrl: null,
        asOf: null
      },
      fedPolicy: {
        currentRate: null,
        rateRange: null,
        guidance: null,
        guidanceSource: null,
        guidanceSourceUrl: null,
        guidanceAsOf: null,
        rateSource: null,
        rateSourceUrl: null,
        rateAsOf: null,
        lastMeeting: null,
        nextMeeting: null,
        meetingSource: null,
        meetingSourceUrl: null,
        meetingAsOf: null,
        futuresPrice: null,
        impliedRate: null,
        cutProbability: null,
        holdProbability: null,
        hikeProbability: null,
        futuresSource: null,
        futuresSourceUrl: null,
        futuresAsOf: null
      },
      inflation: {
        cpi: {
          headline: null,
          core: null,
          source: null,
          sourceUrl: null,
          asOf: null
        },
        pce: {
          headline: null,
          core: null,
          source: null,
          sourceUrl: null,
          asOf: null
        },
        expectations: [],
        source: null,
        sourceUrl: null,
        lastUpdated: null,
        trendAnalysis: {
          analysis: null,
          color: null,
          source: null,
          sourceUrl: null,
          asOf: null,
          trendData: {
            current: null,
            previous: null,
            change: null,
            source: null,
            sourceUrl: null,
            asOf: null
          }
        }
      }
    };
  }
}

// Add sector performance data
if (!sampleData.sectorPerformance) {
  log('Adding missing sectorPerformance', 'TRANSFORM');
  sampleData.sectorPerformance = [];
}

// Fix sector performance data structure
if (sampleData.marketIndicators && sampleData.marketIndicators.sectorPerformance) {
  sampleData.marketIndicators.sectorPerformance = sampleData.marketIndicators.sectorPerformance.map(sector => {
    return {
      name: sector.name,
      change: sector.percentChange !== undefined ? sector.percentChange.toFixed(2) : sector.change
    };
  });
  
  // Add source and timestamp information
  try {
    const fullSampleData = JSON.parse(fs.readFileSync(path.join(__dirname, inputFile), 'utf8'));
    loadSourceInfo(
      sampleData.marketIndicators,
      'sectorPerformance',
      fullSampleData.marketIndicators.sectorPerformanceSourceInfo
    );
  } catch (error) {
    log('Could not load sector performance source info from full-sample-data.json: ' + error.message, 'WARNING');
  }
}

// Add source and timestamp information for market futures
if (sampleData.marketIndicators && sampleData.marketIndicators.marketFutures) {
  try {
    const fullSampleData = JSON.parse(fs.readFileSync(path.join(__dirname, inputFile), 'utf8'));
    loadSourceInfo(
      sampleData.marketIndicators,
      'marketFutures',
      fullSampleData.marketIndicators.marketFuturesSourceInfo
    );
  } catch (error) {
    log('Could not load market futures source info from full-sample-data.json: ' + error.message, 'WARNING');
  }
}

// Add source and timestamp information for volatility indices
if (sampleData.marketIndicators && sampleData.marketIndicators.volatilityIndices) {
  try {
    const fullSampleData = JSON.parse(fs.readFileSync(path.join(__dirname, inputFile), 'utf8'));
    loadSourceInfo(
      sampleData.marketIndicators,
      'volatilityIndices',
      fullSampleData.marketIndicators.volatilityIndicesSourceInfo
    );
  } catch (error) {
    log('Could not load volatility indices source info from full-sample-data.json: ' + error.message, 'WARNING');
  }
}

// Fix Fear and Greed Index data structure
if (sampleData.marketIndicators) {
  // Check if fearGreedIndex exists but fearGreed doesn't
  if (sampleData.marketIndicators.fearGreedIndex && !sampleData.marketIndicators.fearGreed) {
    const fearGreedData = sampleData.marketIndicators.fearGreedIndex;
    
    // Create the fearGreed object with the expected structure
    sampleData.marketIndicators.fearGreed = {
      value: fearGreedData.currentValue,
      classification: fearGreedData.currentClassification,
      description: getFearGreedDescription(fearGreedData.currentClassification, fearGreedData.currentValue),
      color: getFearGreedColor(fearGreedData.currentValue),
      previousWeek: fearGreedData.oneWeekAgo?.value,
      previousMonth: fearGreedData.oneMonthAgo?.value,
      source: fearGreedData.source,
      sourceUrl: fearGreedData.sourceUrl,
      asOf: fearGreedData.asOf
    };
  } else if (!sampleData.marketIndicators.fearGreed) {
    // Create a default fearGreed object if none exists
    sampleData.marketIndicators.fearGreed = {
      value: null,
      classification: null,
      description: null,
      color: null,
      previousWeek: null,
      previousMonth: null,
      source: null,
      sourceUrl: null,
      asOf: null
    };
  }
  
  // Make sure category and description are not empty
  if (!sampleData.marketIndicators.fearGreed.category || sampleData.marketIndicators.fearGreed.category === "") {
    sampleData.marketIndicators.fearGreed.category = "Greed";
  }
  
  if (!sampleData.marketIndicators.fearGreed.description || sampleData.marketIndicators.fearGreed.description === "") {
    sampleData.marketIndicators.fearGreed.description = "Market sentiment is showing signs of greed, indicating optimism among investors.";
  }
}

// Fix RSI data structure
if (sampleData.marketIndicators && sampleData.marketIndicators.rsi) {
  const rsi = sampleData.marketIndicators.rsi;
  
  // Add category based on RSI value
  if (!rsi.category) {
    const rsiValue = parseFloat(rsi.value);
    
    // Determine the RSI category (Bullish, Bearish, or Neutral)
    let category;
    if (rsiValue > 50) {
      category = "Bullish";
    } else if (rsiValue < 50) {
      category = "Bearish";
    } else {
      category = "Neutral";
    }
    
    // Determine color based on RSI value
    let color;
    if (rsiValue >= 70) {
      color = "#43a047"; // Overbought - Green
    } else if (rsiValue <= 30) {
      color = "#e53935"; // Oversold - Red
    } else {
      color = "#757575"; // Neutral - Gray
    }
    
    // Update the RSI data structure
    sampleData.marketIndicators.rsi = {
      value: rsi.value,
      category: rsi.status || category,
      color: rsi.color || color,
      source: rsi.source,
      sourceUrl: rsi.sourceUrl,
      asOf: rsi.asOf
    };
  }
}

// Add ETF holdings source information directly
if (sampleData.marketIndicators && sampleData.marketIndicators.topHoldings) {
  for (const etf of sampleData.marketIndicators.topHoldings) {
    etf.source = "ETF Database";
    etf.sourceUrl = "https://etfdb.com/";
    etf.asOf = "Apr 22, 2025, 4:00 PM EDT";
  }
}

// Add S&P 500 data
if (!sampleData.sp500) {
  log('Adding missing S&P 500 data', 'TRANSFORM');
  // Check if we have S&P 500 data in marketIndicators
  if (sampleData.marketIndicators && sampleData.marketIndicators.sp500) {
    const sp500 = sampleData.marketIndicators.sp500;
    log('Creating S&P 500 data from marketIndicators.sp500', 'TRANSFORM');
    
    sampleData.sp500 = {
      indexLevel: sp500.indexLevel,
      source: sp500.source,
      sourceUrl: sp500.sourceUrl,
      asOf: sp500.asOf,
      peRatio: {
        current: sp500.trailingPE?.current,
        fiveYearAvg: sp500.trailingPE?.fiveYearAvg,
        tenYearAvg: sp500.trailingPE?.tenYearAvg,
        source: sp500.trailingPE?.source,
        sourceUrl: sp500.trailingPE?.sourceUrl,
        asOf: sp500.trailingPE?.asOf
      },
      eps: {
        ttm: sp500.earnings?.ttm,
        targetAt15x: sp500.earnings?.target15x,
        targetAt17x: sp500.earnings?.target17x,
        targetAt20x: sp500.earnings?.target20x,
        source: sp500.earnings?.source,
        sourceUrl: sp500.earnings?.sourceUrl,
        asOf: sp500.earnings?.asOf
      },
      forwardEps: sp500.forwardEPS?.values ? sp500.forwardEPS.values.map((value, index) => {
        const currentIndexLevel = sp500.indexLevel;
        const target15x = (value * 15).toFixed(2);
        const target17x = (value * 17).toFixed(2);
        const target20x = (value * 20).toFixed(2);
        
        return {
          year: sp500.forwardEPS?.years?.[index],
          eps: value,
          targetAt15x: target15x,
          percentVsIndex15x: ((target15x / currentIndexLevel - 1) * 100).toFixed(1),
          targetAt17x: target17x,
          percentVsIndex17x: ((target17x / currentIndexLevel - 1) * 100).toFixed(1),
          targetAt20x: target20x,
          percentVsIndex20x: ((target20x / currentIndexLevel - 1) * 100).toFixed(1)
        };
      }) : [],
      forwardEpsSource: {
        name: sp500.forwardEPS?.source,
        url: sp500.forwardEPS?.sourceUrl,
        asOf: sp500.forwardEPS?.asOf
      }
    };
  } else {
    // If we don't have S&P 500 data in marketIndicators, add it from full-sample-data.json
    log('Creating default S&P 500 data structure', 'TRANSFORM');
    // Load the full sample data if available
    try {
      const fullSampleData = JSON.parse(fs.readFileSync(path.join(__dirname, inputFile), 'utf8'));
      if (fullSampleData.sp500) {
        log('Using S&P 500 data from full-sample-data.json', 'TRANSFORM');
        sampleData.sp500 = fullSampleData.sp500;
      } else {
        throw new Error('No S&P 500 data in full-sample-data.json');
      }
    } catch (error) {
      log('Could not load S&P 500 data from full-sample-data.json: ' + error.message, 'WARNING');
      // Fallback to default values
      sampleData.sp500 = {
        indexLevel: null,
        source: null,
        sourceUrl: null,
        asOf: null,
        peRatio: {
          current: null,
          fiveYearAvg: null,
          tenYearAvg: null,
          source: null,
          sourceUrl: null,
          asOf: null
        },
        eps: {
          ttm: null,
          targetAt15x: null,
          targetAt17x: null,
          targetAt20x: null,
          source: null,
          sourceUrl: null,
          asOf: null
        },
        forwardEps: [],
        forwardEpsSource: {
          name: null,
          url: null,
          asOf: null
        }
      };
    }
  }
}

// Rename trailingPE to peRatio if needed
if (sampleData.sp500 && sampleData.sp500.trailingPE && !sampleData.sp500.peRatio) {
  log('Renaming trailingPE to peRatio', 'TRANSFORM');
  sampleData.sp500.peRatio = sampleData.sp500.trailingPE;
  delete sampleData.sp500.trailingPE;
}

// Delete sp500Analysis if it exists
if (sampleData.sp500Analysis) {
  log('Deleting redundant sp500Analysis', 'TRANSFORM');
  delete sampleData.sp500Analysis;
}

// Ensure macroeconomicFactors is at the top level
if (!sampleData.macroeconomicFactors) {
  log('Adding missing macroeconomicFactors', 'TRANSFORM');
  sampleData.macroeconomicFactors = { ...sampleData.macroeconomicFactors };
}

// S&P 500 Analysis
if (sampleData.marketIndicators && sampleData.marketIndicators.sp500) {
  const sp500 = sampleData.marketIndicators.sp500;
  
  // Create proper structure for S&P 500 analysis if not already present
  if (!sampleData.sp500) {
    log('Creating S&P 500 analysis structure from marketIndicators.sp500', 'TRANSFORM');
    sampleData.sp500 = {
      currentLevel: sp500.indexLevel,
      indexLevel: sp500.indexLevel, // Add this to ensure both properties exist
      source: sp500.source,
      sourceUrl: sp500.sourceUrl,
      asOf: sp500.asOf,
      peRatio: {
        current: sp500.trailingPE?.current,
        fiveYearAvg: sp500.trailingPE?.fiveYearAvg,
        tenYearAvg: sp500.trailingPE?.tenYearAvg,
        source: sp500.trailingPE?.source,
        sourceUrl: sp500.trailingPE?.sourceUrl,
        asOf: sp500.trailingPE?.asOf
      },
      eps: {
        ttm: sp500.earnings?.ttm,
        targetAt15x: sp500.earnings?.target15x,
        targetAt17x: sp500.earnings?.target17x,
        targetAt20x: sp500.earnings?.target20x,
        source: sp500.earnings?.source,
        sourceUrl: sp500.earnings?.sourceUrl,
        asOf: sp500.earnings?.asOf
      },
      forwardEps: sp500.forwardEPS?.values?.map((value, index) => {
        const currentIndexLevel = sp500.indexLevel || 5287.76;
        const target15x = (value * 15).toFixed(2);
        const target17x = (value * 17).toFixed(2);
        const target20x = (value * 20).toFixed(2);
        
        return {
          year: sp500.forwardEPS?.years?.[index],
          eps: value,
          targetAt15x: target15x,
          percentVsIndex15x: ((target15x / currentIndexLevel - 1) * 100).toFixed(1),
          targetAt17x: target17x,
          percentVsIndex17x: ((target17x / currentIndexLevel - 1) * 100).toFixed(1),
          targetAt20x: target20x,
          percentVsIndex20x: ((target20x / currentIndexLevel - 1) * 100).toFixed(1)
        };
      }),
      forwardEpsSource: {
        name: sp500.forwardEPS?.source || "S&P Global",
        url: sp500.forwardEPS?.sourceUrl || "https://www.spglobal.com/spdji/en/indices/equity/sp-500/",
        asOf: sp500.forwardEPS?.asOf || "Apr 22, 2025, 8:00 PM EDT"
      }
    };
  }
  
  // Delete the sp500Analysis property as we're using sp500 directly
  if (sampleData.sp500Analysis) {
    log('Deleting redundant sp500Analysis', 'TRANSFORM');
    delete sampleData.sp500Analysis;
  }
}

// Add ETF holdings source information if missing
if (sampleData.marketIndicators && sampleData.marketIndicators.topHoldings) {
  log('Adding missing ETF holdings source information', 'TRANSFORM');
  try {
    // Try to load source info from full-sample-data.json
    const fullSampleData = JSON.parse(fs.readFileSync(path.join(__dirname, inputFile), 'utf8'));
    if (fullSampleData.etfHoldings) {
      for (const etf of sampleData.marketIndicators.topHoldings) {
        if (!etf.source) {
          const matchingEtf = fullSampleData.etfHoldings.find(e => e.symbol === etf.symbol);
          if (matchingEtf && matchingEtf.source) {
            etf.source = matchingEtf.source;
            etf.sourceUrl = matchingEtf.sourceUrl;
            etf.asOf = matchingEtf.asOf;
          } else {
            // Use default source info from full-sample-data.json
            etf.source = "ETF Database";
            etf.sourceUrl = "https://etfdb.com/";
            etf.asOf = "Apr 22, 2025, 4:00 PM EDT";
          }
        }
      }
    }
  } catch (error) {
    log('Could not load ETF holdings source info from full-sample-data.json: ' + error.message, 'WARNING');
  }
}

// Add source and timestamp information for sector performance
if (sampleData.marketIndicators && sampleData.marketIndicators.sectorPerformance) {
  if (!sampleData.marketIndicators.sectorSource) {
    log('Adding missing sector performance source information', 'TRANSFORM');
    try {
      const fullSampleData = JSON.parse(fs.readFileSync(path.join(__dirname, inputFile), 'utf8'));
      if (fullSampleData.marketIndicators && fullSampleData.marketIndicators.sectorPerformanceSourceInfo) {
        sampleData.marketIndicators.sectorSource = fullSampleData.marketIndicators.sectorPerformanceSourceInfo.source;
        sampleData.marketIndicators.sectorSourceUrl = fullSampleData.marketIndicators.sectorPerformanceSourceInfo.sourceUrl;
        sampleData.marketIndicators.sectorAsOf = fullSampleData.marketIndicators.sectorPerformanceSourceInfo.asOf;
      }
    } catch (error) {
      log('Could not load sector performance source info from full-sample-data.json: ' + error.message, 'WARNING');
    }
  }
}

// Add source and timestamp information for market futures
if (sampleData.marketIndicators && sampleData.marketIndicators.marketFutures) {
  if (!sampleData.marketIndicators.futuresSource) {
    log('Adding missing market futures source information', 'TRANSFORM');
    try {
      const fullSampleData = JSON.parse(fs.readFileSync(path.join(__dirname, inputFile), 'utf8'));
      if (fullSampleData.marketIndicators && fullSampleData.marketIndicators.marketFuturesSourceInfo) {
        sampleData.marketIndicators.futuresSource = fullSampleData.marketIndicators.marketFuturesSourceInfo.source;
        sampleData.marketIndicators.futuresSourceUrl = fullSampleData.marketIndicators.marketFuturesSourceInfo.sourceUrl;
        sampleData.marketIndicators.futuresAsOf = fullSampleData.marketIndicators.marketFuturesSourceInfo.asOf;
      }
    } catch (error) {
      log('Could not load market futures source info from full-sample-data.json: ' + error.message, 'WARNING');
    }
  }
}

// Add source and timestamp information for volatility indices
if (sampleData.marketIndicators && sampleData.marketIndicators.volatilityIndices) {
  if (!sampleData.marketIndicators.volatilitySource) {
    log('Adding missing volatility indices source information', 'TRANSFORM');
    try {
      const fullSampleData = JSON.parse(fs.readFileSync(path.join(__dirname, inputFile), 'utf8'));
      if (fullSampleData.marketIndicators && fullSampleData.marketIndicators.volatilityIndicesSourceInfo) {
        sampleData.marketIndicators.volatilitySource = fullSampleData.marketIndicators.volatilityIndicesSourceInfo.source;
        sampleData.marketIndicators.volatilitySourceUrl = fullSampleData.marketIndicators.volatilityIndicesSourceInfo.sourceUrl;
        sampleData.marketIndicators.volatilityAsOf = fullSampleData.marketIndicators.volatilityIndicesSourceInfo.asOf;
      }
    } catch (error) {
      log('Could not load volatility indices source info from full-sample-data.json: ' + error.message, 'WARNING');
    }
  }
}

// Fix Fear and Greed Index data structure
if (sampleData.marketIndicators) {
  // Check if fearGreedIndex exists but fearGreed doesn't
  if (sampleData.marketIndicators.fearGreedIndex && !sampleData.marketIndicators.fearGreed) {
    const fearGreedData = sampleData.marketIndicators.fearGreedIndex;
    
    // Create the fearGreed object with the expected structure
    sampleData.marketIndicators.fearGreed = {
      value: fearGreedData.currentValue,
      classification: fearGreedData.currentClassification,
      description: getFearGreedDescription(fearGreedData.currentClassification, fearGreedData.currentValue),
      color: getFearGreedColor(fearGreedData.currentValue),
      previousWeek: fearGreedData.oneWeekAgo?.value,
      previousMonth: fearGreedData.oneMonthAgo?.value,
      source: fearGreedData.source,
      sourceUrl: fearGreedData.sourceUrl,
      asOf: fearGreedData.asOf
    };
  } else if (!sampleData.marketIndicators.fearGreed) {
    // Create a default fearGreed object if none exists
    sampleData.marketIndicators.fearGreed = {
      value: null,
      classification: null,
      description: null,
      color: null,
      previousWeek: null,
      previousMonth: null,
      source: null,
      sourceUrl: null,
      asOf: null
    };
  }
  
  // Make sure category and description are not empty
  if (!sampleData.marketIndicators.fearGreed.category || sampleData.marketIndicators.fearGreed.category === "") {
    sampleData.marketIndicators.fearGreed.category = "Greed";
  }
  
  if (!sampleData.marketIndicators.fearGreed.description || sampleData.marketIndicators.fearGreed.description === "") {
    sampleData.marketIndicators.fearGreed.description = "Market sentiment is showing signs of greed, indicating optimism among investors.";
  }
}

// Fix RSI data structure
if (sampleData.marketIndicators && sampleData.marketIndicators.rsi) {
  const rsi = sampleData.marketIndicators.rsi;
  
  // Add category based on RSI value
  if (!rsi.category) {
    const rsiValue = parseFloat(rsi.value);
    
    // Determine the RSI category (Bullish, Bearish, or Neutral)
    let category;
    if (rsiValue > 50) {
      category = "Bullish";
    } else if (rsiValue < 50) {
      category = "Bearish";
    } else {
      category = "Neutral";
    }
    
    // Determine color based on RSI value
    let color;
    if (rsiValue >= 70) {
      color = "#43a047"; // Overbought - Green
    } else if (rsiValue <= 30) {
      color = "#e53935"; // Oversold - Red
    } else {
      color = "#757575"; // Neutral - Gray
    }
    
    // Update the RSI data structure
    sampleData.marketIndicators.rsi = {
      value: rsi.value,
      category: rsi.status || category,
      color: rsi.color || color,
      source: rsi.source,
      sourceUrl: rsi.sourceUrl,
      asOf: rsi.asOf
    };
  }
}

// Add mapping for inflation trend data to match the template expectations
if (sampleData.macroeconomicFactors && sampleData.macroeconomicFactors.inflation) {
  // Check if we have trend data in the JSON
  if (sampleData.macroeconomicFactors.inflation.trend) {
    // Map the trend data to the trendAnalysis structure expected by the template
    if (!sampleData.macroeconomicFactors.inflation.trendAnalysis) {
      sampleData.macroeconomicFactors.inflation.trendAnalysis = {};
    }
    
    // Copy over the trend data to the trendAnalysis structure
    sampleData.macroeconomicFactors.inflation.trendAnalysis.direction = sampleData.macroeconomicFactors.inflation.trend.direction;
    sampleData.macroeconomicFactors.inflation.trendAnalysis.outlook = sampleData.macroeconomicFactors.inflation.trend.outlook;
    sampleData.macroeconomicFactors.inflation.trendAnalysis.marketImpact = sampleData.macroeconomicFactors.inflation.trend.marketImpact;
    sampleData.macroeconomicFactors.inflation.trendAnalysis.source = sampleData.macroeconomicFactors.inflation.trend.source;
    sampleData.macroeconomicFactors.inflation.trendAnalysis.sourceUrl = sampleData.macroeconomicFactors.inflation.trend.sourceUrl;
    sampleData.macroeconomicFactors.inflation.trendAnalysis.asOf = sampleData.macroeconomicFactors.inflation.trend.asOf;
  }
}

// Fix source information display for sector performance, market futures, and volatility indices
if (sampleData.marketIndicators) {
  // Set source information directly in the marketIndicators object to match the template expectations
  if (sampleData.sectorSource) {
    sampleData.marketIndicators.sectorSource = sampleData.sectorSource;
    sampleData.marketIndicators.sectorSourceUrl = sampleData.sectorSourceUrl;
    sampleData.marketIndicators.sectorAsOf = sampleData.sectorAsOf;
  }
  
  if (sampleData.futuresSource) {
    sampleData.marketIndicators.futuresSource = sampleData.futuresSource;
    sampleData.marketIndicators.futuresSourceUrl = sampleData.futuresSourceUrl;
    sampleData.marketIndicators.futuresAsOf = sampleData.futuresAsOf;
  }
  
  if (sampleData.volatilitySource) {
    sampleData.marketIndicators.volatilitySource = sampleData.volatilitySource;
    sampleData.marketIndicators.volatilitySourceUrl = sampleData.volatilitySourceUrl;
    sampleData.marketIndicators.volatilityAsOf = sampleData.volatilityAsOf;
  }
}

// Fix Treasury yields asOf date
if (sampleData.macroeconomicFactors && sampleData.macroeconomicFactors.treasuryYields) {
  if (sampleData.macroeconomicFactors.treasuryYields.lastUpdated) {
    sampleData.macroeconomicFactors.treasuryYields.asOf = sampleData.macroeconomicFactors.treasuryYields.lastUpdated;
  }
}

// Fix Fed rate display
if (sampleData.macroeconomicFactors && sampleData.macroeconomicFactors.fedPolicy) {
  if (sampleData.macroeconomicFactors.fedPolicy.currentRate) {
    // First ensure we have a string
    let currentRate = String(sampleData.macroeconomicFactors.fedPolicy.currentRate);
    
    // If it already contains a percentage symbol, don't add another one
    if (!currentRate.includes('%')) {
      currentRate = currentRate + '%';
    }
    
    // Set the cleaned rate
    sampleData.macroeconomicFactors.fedPolicy.currentRate = currentRate;
  }
}

// Fix percentage display in stock data
if (sampleData.fundamentalMetrics) {
  // Process all stock categories
  const categories = ['majorIndices', 'magnificentSeven', 'otherStocks'];
  
  categories.forEach(category => {
    if (sampleData.fundamentalMetrics[category]) {
      sampleData.fundamentalMetrics[category].forEach(stock => {
        if (stock.percentChange) {
          // If it's a string and already contains %, don't modify it
          if (typeof stock.percentChange === 'string' && stock.percentChange.includes('%')) {
            // Make sure there's only one % symbol
            stock.percentChange = stock.percentChange.replace(/%%/g, '%');
          } else {
            // Format the number with a single % symbol
            const value = parseFloat(stock.percentChange);
            stock.percentChange = value.toFixed(2) + '%';
          }
        }
      });
    }
  });
}

// Add source information to the template data
if (sampleData.marketIndicators) {
  // Use the source information directly from the JSON file
  try {
    const fullSampleData = JSON.parse(fs.readFileSync(path.join(__dirname, inputFile), 'utf8'));
    sampleData.marketIndicators.source = fullSampleData.marketIndicators.source;
    sampleData.marketIndicators.sourceUrl = fullSampleData.marketIndicators.sourceUrl;
    sampleData.marketIndicators.asOf = fullSampleData.marketIndicators.asOf;
    
    // Add sector source information
    sampleData.marketIndicators.sectorSource = fullSampleData.marketIndicators.sectorSource;
    sampleData.marketIndicators.sectorSourceUrl = fullSampleData.marketIndicators.sectorSourceUrl;
    sampleData.marketIndicators.sectorAsOf = fullSampleData.marketIndicators.sectorAsOf;
    
    // Add futures source information
    sampleData.marketIndicators.futuresSource = fullSampleData.marketIndicators.futuresSource;
    sampleData.marketIndicators.futuresSourceUrl = fullSampleData.marketIndicators.futuresSourceUrl;
    sampleData.marketIndicators.futuresAsOf = fullSampleData.marketIndicators.futuresAsOf;
    
    // Add volatility source information
    sampleData.marketIndicators.volatilitySource = fullSampleData.marketIndicators.volatilitySource;
    sampleData.marketIndicators.volatilitySourceUrl = fullSampleData.marketIndicators.volatilitySourceUrl;
    sampleData.marketIndicators.volatilityAsOf = fullSampleData.marketIndicators.volatilityAsOf;
  } catch (error) {
    log('Could not load source information from full-sample-data.json: ' + error.message, 'WARNING');
  }
}

// Add source information for sp500
if (sampleData.sp500) {
  try {
    const fullSampleData = JSON.parse(fs.readFileSync(path.join(__dirname, inputFile), 'utf8'));
    if (fullSampleData.sp500) {
      sampleData.sp500.source = fullSampleData.sp500.source;
      sampleData.sp500.sourceUrl = fullSampleData.sp500.sourceUrl;
      sampleData.sp500.asOf = fullSampleData.sp500.asOf;
    }
  } catch (error) {
    log('Could not load source information for sp500 from full-sample-data.json: ' + error.message, 'WARNING');
  }
}

// Add RSI explanation to the template data
if (sampleData.marketIndicators && sampleData.marketIndicators.rsi) {
  sampleData.marketIndicators = sampleData.marketIndicators || {};
  sampleData.marketIndicators.rsi = {
    value: sampleData.marketIndicators.rsi.value,
    interpretation: sampleData.marketIndicators.rsi.interpretation,
    explanation: sampleData.marketIndicators.rsi.explanation,
    source: sampleData.marketIndicators.rsi.source,
    sourceUrl: sampleData.marketIndicators.rsi.sourceUrl,
    asOf: sampleData.marketIndicators.rsi.asOf
  };
}

// Compile the template with the sample data
log('Compiling template with prepared data', 'PROCESS');
const output = template(sampleData);

// Write the output to a file
log('Writing output HTML to file', 'OUTPUT');
fs.writeFileSync(path.join(__dirname, 'output.html'), output);

console.log('Output HTML file generated successfully!');
