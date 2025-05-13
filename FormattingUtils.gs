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
/**
 * Test function to verify that FormattingUtils.gs works correctly
 */
function testFormattingUtils() {
  // Test formatDate
  const now = new Date();
  const dateFormatted = formatDate(now);
  Logger.log("Current date formatted: " + dateFormatted);
  
  // Test with string date
  const stringDate = "2025-05-13T13:59:22";
  const stringDateFormatted = formatDate(stringDate);
  Logger.log("String date formatted: " + stringDateFormatted);
  
  // Test with invalid date
  const invalidDate = "not-a-date";
  const invalidDateFormatted = formatDate(invalidDate);
  Logger.log("Invalid date formatted: " + invalidDateFormatted);
  
  // Test formatValue
  const value = 123.4567;
  const valueFormatted = formatValue(value);
  Logger.log("Value formatted: " + valueFormatted);
  
  // Test with different decimal places
  const valueFormatted4 = formatValue(value, 4);
  Logger.log("Value formatted with 4 decimal places: " + valueFormatted4);
  
  // Test with string value
  const stringValue = "987.6543";
  const stringValueFormatted = formatValue(stringValue);
  Logger.log("String value formatted: " + stringValueFormatted);
  
  // Test formatMarketCap
  const billion = 1500000000;
  const billionFormatted = formatMarketCap(billion);
  Logger.log("Billion value formatted: " + billionFormatted);
  
  const million = 42000000;
  const millionFormatted = formatMarketCap(million);
  Logger.log("Million value formatted: " + millionFormatted);
  
  const trillion = 2500000000000;
  const trillionFormatted = formatMarketCap(trillion);
  Logger.log("Trillion value formatted: " + trillionFormatted);
  
  return "Tests completed. Check the logs for results.";
}
