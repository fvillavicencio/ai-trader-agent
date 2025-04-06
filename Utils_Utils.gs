/**
 * Main Utils file that imports and exports all utility functions
 */

// Import all utility files
var CoreUtils = include('CoreUtils');
var EmailUtils = include('Utils_EmailUtils');
var AnalysisUtils = include('Utils_AnalysisUtils');
var FundamentalMetrics = include('Utils_FundamentalMetrics');
var MacroeconomicFactors = include('Utils_MacroeconomicFactors');
var MarketIndicators = include('Utils_MarketIndicators');
var MarketSentiment = include('Utils_MarketSentiment');
var GeopoliticalRisks = include('Utils_GeopoliticalRisks');
var DataUtils = include('Utils_DataUtils');

// Export all functions directly
Object.assign(this, {
  enhancedCleanAnalysisResult: CoreUtils.enhancedCleanAnalysisResult,
  testEnhancedJsonParsing: CoreUtils.testEnhancedJsonParsing,
  formatHtmlEmailBodyWithAnalysis: EmailUtils.formatHtmlEmailBodyWithAnalysis,
  generateEmailTemplate: EmailUtils.generateEmailTemplate,
  generateMarketSentimentSection: MarketSentiment.generateMarketSentimentSection,
  generateMarketIndicatorsSection: MarketIndicators.generateMarketIndicatorsSection,
  generateFundamentalMetricsSection: FundamentalMetrics.generateFundamentalMetricsSection,
  generateMacroeconomicFactorsSection: MacroeconomicFactors.generateMacroeconomicFactorsSection,
  generateGeopoliticalRisksSection: GeopoliticalRisks.generateGeopoliticalRisksSection,
  formatDate: DataUtils.formatDate,
  formatValue: DataUtils.formatValue,
  formatNumberWithSuffix: DataUtils.formatNumberWithSuffix,
  saveToGoogleDrive: DataUtils.saveToGoogleDrive,
  retrieveMacroeconomicFactors: MacroeconomicFactors.retrieveMacroeconomicFactors,
  retrieveTreasuryYields: MacroeconomicFactors.retrieveTreasuryYields,
  retrieveInflationData: MacroeconomicFactors.retrieveInflationData,
  retrieveFedPolicy: MacroeconomicFactors.retrieveFedPolicy
});
