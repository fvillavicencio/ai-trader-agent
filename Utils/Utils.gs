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
