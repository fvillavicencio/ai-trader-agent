/**
 * Market Pulse Daily - Handlebars Renderer
 * 
 * This file handles the rendering of Handlebars templates with the appropriate data
 * to generate beautiful, mobile-friendly HTML reports for Market Pulse Daily.
 */

// Import required libraries
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

/**
 * Register Handlebars helpers
 */
function registerHelpers() {
  // Format numbers with commas and optional decimal places
  Handlebars.registerHelper('formatNumber', function(value, decimals = 2) {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    try {
      return Number(value).toLocaleString('en-US', { 
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    } catch (e) {
      return value.toString();
    }
  });

  // Format percentages
  Handlebars.registerHelper('formatPercent', function(value) {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    try {
      // Convert decimal to percentage (e.g., 0.05 to 5%)
      const numValue = Number(value);
      return (numValue * 100).toFixed(2) + '%';
    } catch (e) {
      return value.toString();
    }
  });

  // Format currency
  Handlebars.registerHelper('formatCurrency', function(value) {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    try {
      return '$' + Number(value).toLocaleString('en-US', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } catch (e) {
      return '$' + value.toString();
    }
  });

  // Check if a string starts with a specific substring
  Handlebars.registerHelper('startsWith', function(str, prefix) {
    if (typeof str !== 'string') return false;
    return str.startsWith(prefix);
  });

  // Format date
  Handlebars.registerHelper('formatDate', function(value) {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });

  // Format event date parts (month, day, year, time)
  Handlebars.registerHelper('formatEventDate', function(value, part) {
    if (!value) return '';
    const date = new Date(value);
    
    switch(part) {
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'short' });
      case 'day':
        return date.getDate();
      case 'year':
        return date.getFullYear();
      case 'time':
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
      default:
        return date.toLocaleDateString('en-US');
    }
  });

  // Format year
  Handlebars.registerHelper('formatYear', function(value) {
    if (!value) return new Date().getFullYear();
    const date = new Date(value);
    return date.getFullYear();
  });

  // Get current year
  Handlebars.registerHelper('currentYear', function() {
    return new Date().getFullYear();
  });

  // Check if a value is positive
  Handlebars.registerHelper('isPositive', function(value) {
    return value > 0;
  });

  // Convert to lowercase
  Handlebars.registerHelper('toLowerCase', function(value) {
    if (!value) return '';
    return value.toLowerCase();
  });

  // Conditional helper
  Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
    return (arg1 === arg2) ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
  });

  // Each with index
  Handlebars.registerHelper('eachWithIndex', function(array, options) {
    let buffer = '';
    for (let i = 0; i < array.length; i++) {
      const item = array[i];
      item.index = i;
      buffer += options.fn(item);
    }
    return buffer;
  });

  // Truncate text
  Handlebars.registerHelper('truncate', function(text, length) {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  });

  // Format color based on value (for indicators)
  Handlebars.registerHelper('colorFromValue', function(value, thresholds) {
    if (value === undefined || value === null) return '';
    if (value > thresholds.high) return 'var(--success-color)';
    if (value < thresholds.low) return 'var(--danger-color)';
    return 'var(--warning-color)';
  });
  
  // Get color based on change value
  Handlebars.registerHelper('getChangeColor', function(value) {
    if (typeof value !== 'number' || !isFinite(value)) return '#757575';
    return value >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
  });
  
  // Get icon based on change value
  Handlebars.registerHelper('getChangeIcon', function(value) {
    if (typeof value !== 'number' || !isFinite(value)) return '';
    return value >= 0 ? '↑' : '↓';
  });
  
  // Get color based on risk level
  Handlebars.registerHelper('getRiskColor', function(level) {
    if (!level) return 'var(--light-text)';
    
    switch (level.toLowerCase()) {
      case 'high':
        return 'var(--danger-color)';
      case 'medium':
        return 'var(--warning-color)';
      case 'severe':
        return '#d32f2f'; // darker red
      case 'low':
        return 'var(--success-color)';
      default:
        return 'var(--light-text)';
    }
  });
  
  // Format metric value based on key
  Handlebars.registerHelper('formatMetric', function(key, value) {
    if (value === undefined || value === null || value === '' || 
        (typeof value === 'number' && !isFinite(value)) ||
        (typeof value === 'string' && ['n/a', 'na', 'nan', 'null', 'undefined', '-'].includes(value.trim().toLowerCase()))) {
      return 'N/A';
    }
    
    // Format based on metric type
    switch (key.toLowerCase()) {
      case 'marketcap':
        return formatMarketCap(value);
      case 'volume':
        return formatVolume(value);
      case 'dividendyield':
      case 'profitmargin':
      case 'returnonequity':
      case 'returnonassets':
        return typeof value === 'number' ? value.toFixed(2) + '%' : value;
      case 'open':
      case 'close':
      case 'dayhigh':
      case 'daylow':
      case 'fiftytwoweekhigh':
      case 'fiftytwoweeklow':
        return typeof value === 'number' ? '$' + value.toFixed(2) : value;
      default:
        return typeof value === 'number' ? value.toFixed(2) : value;
    }
  });
  
  // Get first item in array
  Handlebars.registerHelper('first', function(array) {
    if (!array || !array.length) return null;
    return array[0];
  });

  // String contains helper
  Handlebars.registerHelper('stringContains', function(str, substring) {
    if (!str || !substring) return false;
    return str.toLowerCase().includes(substring.toLowerCase());
  });

  // Conditional helper
  Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
    return (arg1 === arg2) ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
  });

  // Each with index
  Handlebars.registerHelper('eachWithIndex', function(array, options) {
    let buffer = '';
    for (let i = 0; i < array.length; i++) {
      const item = array[i];
      item.index = i;
      buffer += options.fn(item);
    }
    return buffer;
  });

  // Truncate text
  Handlebars.registerHelper('truncate', function(text, length) {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  });

  // Format color based on value (for indicators)
  Handlebars.registerHelper('colorFromValue', function(value, thresholds) {
    if (value === undefined || value === null) return '';
    if (value > thresholds.high) return 'var(--success-color)';
    if (value < thresholds.low) return 'var(--danger-color)';
    return 'var(--warning-color)';
  });
  
  // Get color based on change value
  Handlebars.registerHelper('getChangeColor', function(value) {
    if (typeof value !== 'number' || !isFinite(value)) return '#757575';
    return value >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
  });
  
  // Get icon based on change value
  Handlebars.registerHelper('getChangeIcon', function(value) {
    if (typeof value !== 'number' || !isFinite(value)) return '';
    return value >= 0 ? '↑' : '↓';
  });
  
  // Get color based on risk level
  Handlebars.registerHelper('getRiskColor', function(level) {
    if (!level) return 'var(--light-text)';
    
    switch (level.toLowerCase()) {
      case 'high':
        return 'var(--danger-color)';
      case 'medium':
        return 'var(--warning-color)';
      case 'severe':
        return '#d32f2f'; // darker red
      case 'low':
        return 'var(--success-color)';
      default:
        return 'var(--light-text)';
    }
  });
  
  // Format metric value based on key
  Handlebars.registerHelper('formatMetric', function(key, value) {
    if (value === undefined || value === null || value === '' || 
        (typeof value === 'number' && !isFinite(value)) ||
        (typeof value === 'string' && ['n/a', 'na', 'nan', 'null', 'undefined', '-'].includes(value.trim().toLowerCase()))) {
      return 'N/A';
    }
    
    // Format based on metric type
    switch (key.toLowerCase()) {
      case 'marketcap':
        return formatMarketCap(value);
      case 'volume':
        return formatVolume(value);
      case 'dividendyield':
      case 'profitmargin':
      case 'returnonequity':
      case 'returnonassets':
        return typeof value === 'number' ? value.toFixed(2) + '%' : value;
      case 'open':
      case 'close':
      case 'dayhigh':
      case 'daylow':
      case 'fiftytwoweekhigh':
      case 'fiftytwoweeklow':
        return typeof value === 'number' ? '$' + value.toFixed(2) : value;
      default:
        return typeof value === 'number' ? value.toFixed(2) : value;
    }
  });
  
  // Get first item in array
  Handlebars.registerHelper('first', function(array) {
    if (!array || !array.length) return null;
    return array[0];
  });

  // Lookup helper for accessing array elements by index
  Handlebars.registerHelper('lookup', function(obj, index) {
    if (!obj || !obj[index]) return '';
    return obj[index];
  });

  // Multiply helper for calculations
  Handlebars.registerHelper('multiply', function(a, b) {
    if (isNaN(a) || isNaN(b)) return 0;
    return Number(a) * Number(b);
  });

  // Percent change helper
  Handlebars.registerHelper('percentChange', function(newValue, oldValue) {
    if (isNaN(newValue) || isNaN(oldValue) || oldValue === 0) return 0;
    return (newValue - oldValue) / oldValue;
  });
}

/**
 * Load a template from the templates directory
 * @param {string} templateName - Name of the template file without extension
 * @returns {string} - Template content
 */
function loadTemplate(templateName) {
  const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
  return fs.readFileSync(templatePath, 'utf8');
}

/**
 * Register all partials from the templates directory
 */
function registerPartials() {
  const templatesDir = path.join(__dirname, 'templates');
  const files = fs.readdirSync(templatesDir);
  
  files.forEach(file => {
    if (file.endsWith('.hbs')) {
      const partialName = path.basename(file, '.hbs');
      const partialContent = fs.readFileSync(path.join(templatesDir, file), 'utf8');
      Handlebars.registerPartial(partialName, partialContent);
    }
  });
  
  // Register styles.css as a partial
  const stylesPath = path.join(__dirname, 'styles.css');
  const stylesContent = fs.readFileSync(stylesPath, 'utf8');
  Handlebars.registerPartial('styles', stylesContent);
}

/**
 * Render a template with data
 * @param {string} templateName - Name of the template file without extension
 * @param {Object} data - Data to render the template with
 * @returns {string} - Rendered HTML
 */
function renderTemplate(templateName, data) {
  registerHelpers();
  registerPartials();
  
  const template = loadTemplate(templateName);
  const compiledTemplate = Handlebars.compile(template);
  
  return compiledTemplate(data);
}

/**
 * Format market cap value with appropriate suffix (T, B, M)
 * @param {Number} value - The market cap value
 * @return {String} Formatted market cap
 */
function formatMarketCap(value) {
  if (typeof value !== 'number' || !isFinite(value)) return 'N/A';
  
  if (value >= 1e12) {
    return '$' + (value / 1e12).toFixed(2) + 'T';
  } else if (value >= 1e9) {
    return '$' + (value / 1e9).toFixed(2) + 'B';
  } else if (value >= 1e6) {
    return '$' + (value / 1e6).toFixed(2) + 'M';
  } else {
    return '$' + value.toFixed(2);
  }
}

/**
 * Format volume value with appropriate suffix (B, M, K)
 * @param {Number} value - The volume value
 * @return {String} Formatted volume
 */
function formatVolume(value) {
  if (typeof value !== 'number' || !isFinite(value)) return 'N/A';
  
  if (value >= 1e9) {
    return (value / 1e9).toFixed(2) + 'B';
  } else if (value >= 1e6) {
    return (value / 1e6).toFixed(2) + 'M';
  } else if (value >= 1e3) {
    return (value / 1e3).toFixed(2) + 'K';
  } else {
    return value.toFixed(0);
  }
}

/**
 * Format metric value based on key
 * @param {String} key - The key of the metric
 * @param {Number} value - The value of the metric
 * @return {String} Formatted metric value
 */
function formatMetric(key, value) {
  if (value === undefined || value === null || value === '' || 
      (typeof value === 'number' && !isFinite(value)) ||
      (typeof value === 'string' && ['n/a', 'na', 'nan', 'null', 'undefined', '-'].includes(value.trim().toLowerCase()))) {
    return 'N/A';
  }
  
  // Format based on metric type
  switch (key.toLowerCase()) {
    case 'marketcap':
      return formatMarketCap(value);
    case 'volume':
      return formatVolume(value);
    case 'dividendyield':
    case 'profitmargin':
    case 'returnonequity':
    case 'returnonassets':
      return typeof value === 'number' ? value.toFixed(2) + '%' : value;
    case 'open':
    case 'close':
    case 'dayhigh':
    case 'daylow':
    case 'fiftytwoweekhigh':
    case 'fiftytwoweeklow':
      return typeof value === 'number' ? '$' + value.toFixed(2) : value;
    default:
      return typeof value === 'number' ? value.toFixed(2) : value;
  }
}

/**
 * Get first item in array
 * @param {Array} array - The array to get the first item from
 * @return {*} First item in the array
 */
function first(array) {
  if (!array || !array.length) return null;
  return array[0];
}

/**
 * Get color based on change value
 * @param {Number} value - The change value
 * @return {String} Color based on the change value
 */
function getChangeColor(value) {
  if (typeof value !== 'number' || !isFinite(value)) return '#757575';
  return value >= 0 ? '#4caf50' : '#f44336';
}

/**
 * Get icon based on change value
 * @param {Number} value - The change value
 * @return {String} Icon based on the change value
 */
function getChangeIcon(value) {
  if (typeof value !== 'number' || !isFinite(value)) return '';
  return value >= 0 ? '&#8593;' : '&#8595;';
}

/**
 * Get color based on risk level
 * @param {String} level - The risk level
 * @return {String} Color based on the risk level
 */
function getRiskColor(level) {
  if (!level) return '#757575';
  
  switch (level.toLowerCase()) {
    case 'high':
      return '#f44336'; // red
    case 'medium':
      return '#ff9800'; // orange
    case 'severe':
      return '#d32f2f'; // darker red
    case 'low':
      return '#4caf50'; // green
    default:
      return '#757575'; // gray
  }
}

/**
 * Generate HTML from a JSON data object
 * @param {Object} data - The data to generate HTML from
 * @return {String} The generated HTML
 */
function generateHTML(data) {
  return renderTemplate('main', data);
}

/**
 * Generate HTML from a JSON file
 * @param {String} jsonFilePath - The path to the JSON file
 * @return {String} The generated HTML
 */
function generateHTMLFromFile(jsonFilePath) {
  // Read the JSON file
  const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
  
  // Generate HTML from the data
  return generateHTML(jsonData);
}

/**
 * Save HTML to a file
 * @param {String} html - The HTML to save
 * @param {String} outputPath - The path to save the HTML to
 */
function saveHTML(html, outputPath) {
  fs.writeFileSync(outputPath, html);
  console.log(`HTML saved to ${outputPath}`);
}

// Export functions
module.exports = {
  registerHelpers,
  loadTemplate,
  registerPartials,
  renderTemplate,
  formatMarketCap,
  formatVolume,
  formatMetric,
  first,
  getChangeColor,
  getChangeIcon,
  getRiskColor,
  generateHTML,
  generateHTMLFromFile,
  saveHTML
};

// If this file is run directly, generate HTML from the sample data
if (require.main === module) {
  const jsonFilePath = process.argv[2] || path.join(__dirname, '..', 'sample.json');
  const outputPath = process.argv[3] || path.join(__dirname, 'output.html');
  
  try {
    console.log(`Generating HTML from ${jsonFilePath}...`);
    const html = generateHTMLFromFile(jsonFilePath);
    saveHTML(html, outputPath);
    console.log('Done!');
  } catch (error) {
    console.error('Error generating HTML:', error);
  }
}
