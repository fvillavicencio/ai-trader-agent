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
