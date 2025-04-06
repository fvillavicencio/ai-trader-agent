/**
 * Enhanced version of cleanAnalysisResult function with improved JSON parsing
 * @param {String} content - The content from OpenAI
 * @return {Object} The cleaned analysis result
 */
function enhancedCleanAnalysisResult(content) {
  try {
    // First attempt: Try to parse the content as JSON directly
    try {
      return JSON.parse(content);
    } catch (jsonError) {
      Logger.log(`Initial JSON parsing failed: ${jsonError}`);
      
      // Second attempt: Try to extract JSON from the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (extractError) {
          Logger.log(`Extracted JSON parsing failed: ${extractError}`);
          
          // Third attempt: Try to fix common JSON syntax errors
          let fixedJson = jsonMatch[0];
          
          // Fix 1: Remove trailing commas before closing brackets or braces
          fixedJson = fixedJson.replace(/,([\s]*[\]}])/g, '$1');
          
          // Fix 2: Add missing quotes around property names
          fixedJson = fixedJson.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
          
          // Fix 3: Ensure string values have proper quotes
          fixedJson = fixedJson.replace(/:(\s*)([a-zA-Z0-9_]+)([,}])/g, ':"$2"$3');
          
          // Fix 4: Handle unescaped quotes in strings
          fixedJson = fixedJson.replace(/"([^\"]*?)\\?"([^\"]*?)"/g, '"$1\\"$2"');
          
          // Fix 5: Handle line breaks in strings
          fixedJson = fixedJson.replace(/"\s*\n\s*"/g, ' ');
          
          // Fix 6: Replace single quotes with double quotes
          fixedJson = fixedJson.replace(/'([^']*?)'/g, '"$1"');
          
          try {
            Logger.log("Attempting to parse fixed JSON");
            return JSON.parse(fixedJson);
          } catch (fixError) {
            Logger.log(`Fixed JSON parsing failed: ${fixError}`);
            return { error: "Failed to parse JSON", content: content };
          }
        }
      }
      return { error: "No valid JSON found", content: content };
    }
  } catch (error) {
    Logger.log("Error in enhancedCleanAnalysisResult: " + error);
    return { error: "Unexpected error", content: content };
  }
}

/**
 * Test function to verify the enhanced JSON parsing
 */
function testEnhancedJsonParsing() {
  const testCases = [
    // Valid JSON
    { input: '{"key": "value"}', expected: { key: "value" } },
    
    // Missing quotes around key
    { input: '{key: "value"}', expected: { key: "value" } },
    
    // Missing quotes around value
    { input: '{"key": value}', expected: { key: "value" } },
    
    // Trailing comma
    { input: '{"key": "value",}', expected: { key: "value" } },
    
    // Single quotes
    { input: "{'key': 'value'}", expected: { key: "value" } },
    
    // Line breaks
    { input: '{"key": "value\nline2"}', expected: { key: "value line2" } },
    
    // Invalid JSON
    { input: '{"key": "value"}', expected: { error: "Failed to parse JSON", content: "{key: value}" } }
  ];

  let passed = 0;
  let failed = 0;

  testCases.forEach(test => {
    const result = enhancedCleanAnalysisResult(test.input);
    const success = JSON.stringify(result) === JSON.stringify(test.expected);
    
    if (success) {
      passed++;
    } else {
      failed++;
      Logger.log(`Test failed for input: ${test.input}`);
      Logger.log(`Expected: ${JSON.stringify(test.expected)}`);
      Logger.log(`Got: ${JSON.stringify(result)}`);
    }
  });

  Logger.log(`Test results: Passed: ${passed}, Failed: ${failed}`);
  return { passed, failed };
}

/**
 * Helper function to format dates consistently
 * @param {Date} date - The date to format
 * @return {String} Formatted date
 */
function formatDate(date) {
  if (!date) return 'N/A';
  
  const options = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  };
  
  return date.toLocaleDateString('en-US', options);
}

/**
 * Helper function to format values safely
 * @param {Number} value - The value to format
 * @param {Number} decimals - Number of decimal places (default: 2)
 * @return {String} Formatted value
 */
function formatValue(value, decimals = 2) {
  if (value === undefined || value === null) return 'N/A';
  if (typeof value !== 'number') return value.toString();
  
  return value.toFixed(decimals);
}

/**
 * Helper function to format numbers with suffixes (T, B, M, K)
 * @param {Number} value - The value to format
 * @param {String} suffix - Additional suffix to append
 * @return {String} Formatted number with appropriate suffix
 */
function formatNumberWithSuffix(value, suffix = '') {
  if (value === undefined || value === null) return 'N/A';
  
  if (typeof value !== 'number') return value.toString();
  
  if (value >= 1e12) {
    return (value / 1e12).toFixed(2) + 'T' + suffix;
  } else if (value >= 1e9) {
    return (value / 1e9).toFixed(2) + 'B' + suffix;
  } else if (value >= 1e6) {
    return (value / 1e6).toFixed(2) + 'M' + suffix;
  } else if (value >= 1e3) {
    return (value / 1e3).toFixed(2) + 'K' + suffix;
  }
  
  return value.toFixed(2) + suffix;
}

/**
 * Saves the given content to Google Drive
 * 
 * @param {String} filename - The filename to use for the saved file
 * @param {String} content - The content to save
 * @return {String} The URL of the saved file
 */
function saveToGoogleDrive(filename, content) {
  try {
    const folderId = '1234567890abcdef'; // Replace with your folder ID
    const folder = DriveApp.getFolderById(folderId);
    const file = folder.createFile(filename, content);
    const url = file.getUrl();
    return url;
  } catch (error) {
    Logger.log('Error saving to Google Drive: ' + error);
    return null;
  }
}
