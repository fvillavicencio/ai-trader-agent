/**
 * Main Utils file that imports and exports all utility functions
 */

// Import all utility files
include('CoreUtils');
include('EmailUtils');
include('AnalysisUtils');
include('SectionUtils/FundamentalMetrics');
include('SectionUtils/MacroeconomicFactors');
include('SectionUtils/MarketIndicators');
include('SectionUtils/MarketSentiment');
include('SectionUtils/GeopoliticalRisks');
include('DataUtils');

// Export all functions directly
Object.assign(this, {
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
});
