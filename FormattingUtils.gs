/**
 * Utility functions for formatting data in Market Pulse Daily
 * This is a simplified version of Utils.gs that only contains essential formatting functions
 */

/**
 * Helper function to format dates consistently
 * @param {Date} date - The date to format
 * @return {String} Formatted date
 */
function formatDate(date) {
  if (!date) return 'N/A';
  
  try {
    // Handle string dates
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    
    const props = PropertiesService.getScriptProperties();
    const timeZone = props.getProperty('TIME_ZONE') || 'America/New_York';
    return Utilities.formatDate(date, timeZone, "MMM d, yyyy");
  } catch (error) {
    Logger.log("Error in formatDate: " + error);
    return 'N/A';
  }
}

/**
 * Helper function to format values safely
 * @param {Number} value - The value to format
 * @param {Number} decimals - Number of decimal places (default: 2)
 * @return {String} Formatted value
 */
function formatValue(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  
  try {
    // Convert to number if it's a string
    if (typeof value === 'string') {
      value = parseFloat(value);
    }
    
    // Format the number with the specified number of decimal places
    return value.toFixed(decimals);
  } catch (error) {
    Logger.log("Error in formatValue: " + error);
    return 'N/A';
  }
}

/**
 * Format a market cap or large number as $X.XXB, $X.XXM, etc.
 * @param {Number} value
 * @return {String}
 */
function formatMarketCap(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  
  try {
    // Convert to number if it's a string
    if (typeof value === 'string') {
      value = parseFloat(value);
    }
    
    if (value >= 1e12) {
      return '$' + (value / 1e12).toFixed(2) + 'T';
    } else if (value >= 1e9) {
      return '$' + (value / 1e9).toFixed(2) + 'B';
    } else if (value >= 1e6) {
      return '$' + (value / 1e6).toFixed(2) + 'M';
    } else {
      return '$' + value.toFixed(2);
    }
  } catch (error) {
    Logger.log("Error in formatMarketCap: " + error);
    return 'N/A';
  }
}
