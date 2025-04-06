/**
 * Main Utils file that imports and exports all utility functions
 */

// Import all utility files
var CoreUtils = CoreUtils;
var EmailUtils = EmailUtils;
var AnalysisUtils = AnalysisUtils;
var FundamentalMetrics = SectionUtils.FundamentalMetrics;
var MacroeconomicFactors = SectionUtils.MacroeconomicFactors;
var MarketIndicators = SectionUtils.MarketIndicators;
var MarketSentiment = SectionUtils.MarketSentiment;
var GeopoliticalRisks = SectionUtils.GeopoliticalRisks;
var DataUtils = DataUtils;

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
