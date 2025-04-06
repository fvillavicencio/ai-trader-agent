/**
 * Main Utils file that imports and exports all utility functions
 */

// Import Core Utilities
const { enhancedCleanAnalysisResult, testEnhancedJsonParsing, formatDate, formatValue, formatNumberWithSuffix, saveToGoogleDrive } = require('./CoreUtils');

// Import Email Utilities
const { formatHtmlEmailBodyWithAnalysis, generateEmailTemplate } = require('./EmailUtils');

// Import Analysis Utilities
const { generateMarketSentimentSection, generateMarketIndicatorsSection, generateGeopoliticalRisksSection } = require('./AnalysisUtils');

// Import Section Utilities
const generateFundamentalMetricsSection = require('./SectionUtils/FundamentalMetrics');
const generateMacroeconomicFactorsSection = require('./SectionUtils/MacroeconomicFactors');

// Import Data Utilities
const { retrieveMacroeconomicFactors, retrieveTreasuryYields, retrieveInflationData, retrieveFedPolicy } = require('./DataUtils');

// Export all functions
module.exports = {
  enhancedCleanAnalysisResult,
  testEnhancedJsonParsing,
  formatHtmlEmailBodyWithAnalysis,
  generateEmailTemplate,
  generateMarketSentimentSection,
  generateMarketIndicatorsSection,
  generateFundamentalMetricsSection,
  generateMacroeconomicFactorsSection,
  generateGeopoliticalRisksSection,
  formatDate,
  formatValue,
  formatNumberWithSuffix,
  saveToGoogleDrive,
  retrieveMacroeconomicFactors,
  retrieveTreasuryYields,
  retrieveInflationData,
  retrieveFedPolicy
};
