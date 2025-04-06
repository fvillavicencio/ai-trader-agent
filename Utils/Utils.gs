/**
 * Main Utils file that imports and exports all utility functions
 */

// Import all utility files
var CoreUtils = include('CoreUtils');
var EmailUtils = include('EmailUtils');
var AnalysisUtils = include('AnalysisUtils');
var FundamentalMetrics = include('SectionUtils/FundamentalMetrics');
var MacroeconomicFactors = include('SectionUtils/MacroeconomicFactors');
var MarketIndicators = include('SectionUtils/MarketIndicators');
var MarketSentiment = include('SectionUtils/MarketSentiment');
var GeopoliticalRisks = include('SectionUtils/GeopoliticalRisks');
var DataUtils = include('DataUtils');

// Export all functions directly
Object.assign(this, {
  enhancedCleanAnalysisResult: CoreUtils.enhancedCleanAnalysisResult,
  testEnhancedJsonParsing: AnalysisUtils.testEnhancedJsonParsing,
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
