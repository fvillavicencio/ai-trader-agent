import os

def restore_facade():
    # Read the current content of Utils_Main.gs
    with open('Utils_Main.gs', 'r') as main_file:
        content = main_file.read()
    
    # Find the import section
    import_section = content.split('// Export all functions directly')[0]
    
    # Create the new facade file
    new_content = import_section + '''
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
'''
    
    # Write the new content
    with open('Utils_Main.gs', 'w') as main_file:
        main_file.write(new_content)

restore_facade()
