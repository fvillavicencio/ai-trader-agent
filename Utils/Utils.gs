/**
 * Main Utils file that imports and exports all utility functions
 */

// Import Core Utilities
include('CoreUtils');

// Import Email Utilities
include('EmailUtils');

// Import Analysis Utilities
include('AnalysisUtils');

// Import Section Utilities
include('SectionUtils/FundamentalMetrics');
include('SectionUtils/MacroeconomicFactors');
include('SectionUtils/MarketIndicators');
include('SectionUtils/MarketSentiment');
include('SectionUtils/GeopoliticalRisks');

// Import Data Utilities
include('DataUtils');

// Export all functions
function getUtils() {
  return {
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
}

// Export individual functions for direct use
const utils = getUtils();
Object.assign(this, utils);
