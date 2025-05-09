/**
 * Test script for the new S&P 500 Market Snapshot design
 */

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', function(date) {
  if (!date) return '';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(date).toLocaleDateString('en-US', options);
});

Handlebars.registerHelper('toLowerCase', function(str) {
  return str ? str.toLowerCase() : '';
});

Handlebars.registerHelper('stringContains', function(str, contains) {
  return str && contains ? str.includes(contains) : false;
});

Handlebars.registerHelper('getChangeColor', function(value) {
  if (!value && value !== 0) return '';
  return parseFloat(value) >= 0 ? 'positive' : 'negative';
});

Handlebars.registerHelper('getChangeIcon', function(value) {
  if (!value && value !== 0) return '';
  return parseFloat(value) >= 0 ? '↑' : '↓';
});

Handlebars.registerHelper('formatChange', function(value) {
  if (!value && value !== 0) return '';
  const numValue = parseFloat(value);
  const prefix = numValue >= 0 ? '+' : '';
  return prefix + numValue.toFixed(2);
});

Handlebars.registerHelper('gt', function(a, b) {
  return a > b;
});

Handlebars.registerHelper('lt', function(a, b) {
  return a < b;
});

Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

Handlebars.registerHelper('neq', function(a, b) {
  return a !== b;
});

Handlebars.registerHelper('formatNumber', function(value) {
  if (value === undefined || value === null) return '';
  return parseFloat(value).toLocaleString('en-US');
});

Handlebars.registerHelper('formatPercent', function(value) {
  if (value === undefined || value === null) return '';
  return parseFloat(value).toFixed(2) + '%';
});

Handlebars.registerHelper('currentYear', function() {
  return new Date().getFullYear();
});

Handlebars.registerHelper('first', function(array) {
  return array && array.length > 0 ? array[0] : null;
});

Handlebars.registerHelper('startsWith', function(str, prefix) {
  return str && prefix && str.toString().startsWith(prefix.toString());
});

Handlebars.registerHelper('or', function() {
  for (let i = 0; i < arguments.length - 1; i++) {
    if (arguments[i]) return arguments[i];
  }
  return '';
});

Handlebars.registerHelper('json', function(context) {
  return JSON.stringify(context);
});

Handlebars.registerHelper('getRiskColor', function(risk) {
  if (!risk) return 'neutral';
  
  const riskLower = risk.toLowerCase();
  if (riskLower.includes('high') || riskLower.includes('severe')) {
    return 'high-risk';
  } else if (riskLower.includes('moderate')) {
    return 'moderate-risk';
  } else if (riskLower.includes('low')) {
    return 'low-risk';
  }
  return 'neutral';
});

Handlebars.registerHelper('getFearGreedColor', function(value) {
  if (!value && value !== 0) return '';
  const num = parseInt(value, 10);
  
  if (num <= 25) return 'extreme-fear';
  if (num <= 40) return 'fear';
  if (num <= 60) return 'neutral';
  if (num <= 75) return 'greed';
  return 'extreme-greed';
});

Handlebars.registerHelper('formatMetricValue', function(key, value) {
  if (value === undefined || value === null) return 'N/A';
  
  // Format based on metric type
  if (key === 'price' || key === 'targetPrice') {
    return '$' + parseFloat(value).toFixed(2);
  } else if (key.toLowerCase().includes('ratio') || key === 'beta') {
    return parseFloat(value).toFixed(2);
  } else if (key.toLowerCase().includes('percent') || key === 'roe') {
    return parseFloat(value).toFixed(2) + '%';
  }
  
  return value;
});

Handlebars.registerHelper('formatMetric', function(metric) {
  if (metric === undefined || metric === null) return 'N/A';
  
  // Check if it's a string that starts with $ (already formatted)
  if (typeof metric === 'string' && metric.startsWith('$')) {
    return metric;
  }
  
  // Try to parse as a number
  const num = parseFloat(metric);
  if (isNaN(num)) return metric;
  
  // Format based on the value
  if (num >= 1000000000) {
    return '$' + (num / 1000000000).toFixed(2) + 'B';
  } else if (num >= 1000000) {
    return '$' + (num / 1000000).toFixed(2) + 'M';
  } else if (num >= 1000) {
    return '$' + (num / 1000).toFixed(2) + 'K';
  } else {
    return '$' + num.toFixed(2);
  }
});

Handlebars.registerHelper('formatMetricCard', function(metric) {
  if (metric === undefined || metric === null) return 'N/A';
  return metric;
});

Handlebars.registerHelper('formatYear', function(year) {
  if (!year) return '';
  return year.toString();
});

Handlebars.registerHelper('formatTime', function(time) {
  if (!time) return '';
  return time;
});

Handlebars.registerHelper('getMetricDisplayName', function(key) {
  const displayNames = {
    'pegRatio': 'PEG Ratio',
    'forwardPE': 'Forward P/E',
    'priceToBook': 'Price/Book',
    'priceToSales': 'Price/Sales',
    'debtToEquity': 'Debt/Equity',
    'roe': 'Return on Equity',
    'beta': 'Beta',
    'marketCap': 'Market Cap',
    'volume': 'Volume',
    'avgVolume': 'Avg Volume',
    'sector': 'Sector',
    'industry': 'Industry',
    'dividendYield': 'Dividend Yield',
    'eps': 'EPS',
    'targetPrice': 'Target Price'
  };
  
  return displayNames[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
});

// Load the main template and partials
function loadTemplates() {
  console.log('Loading templates...');
  
  // Load main template
  const mainTemplate = fs.readFileSync(
    path.join(__dirname, 'src/templates/main.hbs'),
    'utf8'
  );
  
  // Register partials
  const partialsDir = path.join(__dirname, 'src/templates');
  const partialFiles = fs.readdirSync(partialsDir).filter(file => 
    file !== 'main.hbs' && file.endsWith('.hbs')
  );
  
  partialFiles.forEach(file => {
    const partialName = file.replace('.hbs', '');
    const partialContent = fs.readFileSync(path.join(partialsDir, file), 'utf8');
    Handlebars.registerPartial(partialName, partialContent);
  });
  
  // Load CSS
  const styles = fs.readFileSync(path.join(__dirname, 'src/styles.css'), 'utf8');
  const customStyles = fs.readFileSync(path.join(__dirname, 'src/custom-styles.css'), 'utf8');
  Handlebars.registerPartial('styles', styles + '\n' + customStyles);
  
  return Handlebars.compile(mainTemplate);
}

// Load sample data
function loadSampleData() {
  console.log('Loading sample data...');
  const data = JSON.parse(fs.readFileSync(
    path.join(__dirname, 'full-dataset.json'),
    'utf8'
  ));
  
  // Map sp500 data to match the template expectations
  if (data.sp500) {
    // Create a new sp500 object with the structure expected by our template
    data.sp500 = {
      indexLevel: data.sp500.indexLevel,
      source: data.sp500.source?.name || '',
      sourceUrl: data.sp500.sourceUrl || data.sp500.source?.url || '',
      asOf: data.sp500.asOf || data.sp500.source?.asOf || '',
      trailingPE: {
        current: data.sp500.peRatio?.current,
        fiveYearAvg: data.sp500.peRatio?.fiveYearAvg,
        tenYearAvg: data.sp500.peRatio?.tenYearAvg,
        source: data.sp500.peRatio?.source,
        sourceUrl: data.sp500.peRatio?.sourceUrl,
        asOf: data.sp500.peRatio?.asOf
      },
      earnings: {
        ttm: data.sp500.eps?.ttm?.replace('$', '') || '',
        target15x: data.sp500.eps?.targetAt15x?.replace('$', '') || '',
        target17x: data.sp500.eps?.targetAt17x?.replace('$', '') || '',
        target20x: data.sp500.eps?.targetAt20x?.replace('$', '') || '',
        source: data.sp500.eps?.source,
        sourceUrl: data.sp500.eps?.sourceUrl,
        asOf: data.sp500.eps?.asOf
      },
      forwardEPS: {
        years: data.sp500.forwardEps?.map(item => item.year) || [],
        values: data.sp500.forwardEps?.map(item => item.eps.replace('$', '')) || [],
        source: data.sp500.forwardEpsSource?.name,
        sourceUrl: data.sp500.forwardEpsSource?.url,
        asOf: data.sp500.forwardEpsSource?.asOf
      }
    };
  }
  
  return data;
}

// Main function
function main() {
  try {
    const template = loadTemplates();
    const data = loadSampleData();
    
    console.log('Rendering template...');
    const html = template(data);
    
    // Save the output
    const outputPath = path.join(__dirname, 'sp500-snapshot-test.html');
    fs.writeFileSync(outputPath, html);
    console.log(`Output saved to ${outputPath}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
