/**
 * Email section generators for Market Pulse Daily
 */

/**
 * Generate the email header section
 * @param {Object} analysis - The analysis data
 * @returns {String} HTML for the header section
 */
function generateHeader(analysis) {
  const decision = analysis.decision || 'No Decision';
  
  // Determine decision color
  let decisionColor = '#757575'; // Default gray
  if (decision.toLowerCase().includes('buy')) {
    decisionColor = '#4caf50'; // Green
  } else if (decision.toLowerCase().includes('sell')) {
    decisionColor = '#f44336'; // Red
  } else if (decision.toLowerCase().includes('hold') || decision.toLowerCase().includes('watch')) {
    decisionColor = '#ff9800'; // Orange/Amber
  }
  
  return `
  <div style="background-color: #1a365d; padding: 20px; text-align: center; color: white;">
    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Market Pulse Daily</h1>
    <div style="margin-top: 15px; padding: 10px; background-color: ${decisionColor}; display: inline-block; border-radius: 5px;">
      <h2 style="margin: 0; font-size: 20px; font-weight: bold; color: white;">${decision}</h2>
    </div>
  </div>`;
}

/**
 * Generate the footer section
 * @returns {String} HTML for the footer section
 */
function generateFooter() {
  const currentYear = new Date().getFullYear();
  
  return `
  <div style="background-color: #1a365d; padding: 20px; text-align: center; color: white;">
    <p style="margin: 0; font-size: 14px;">Market Pulse Daily - Professional Trading Insights</p>
    <p style="margin: 5px 0 0 0; font-size: 12px;">${currentYear} Market Pulse Daily</p>
    <p style="margin: 10px 0 0 0; font-size: 11px; color: #aaaaaa;">
      This email contains information based on market data and analysis algorithms. 
      It is not financial advice. Always conduct your own research before making investment decisions.
    </p>
  </div>`;
}

/**
 * Generate the decision and summary section
 * @param {Object} analysis - The analysis data
 * @returns {String} HTML for the decision section
 */
function generateDecisionSection(analysis) {
  const summary = analysis.summary || 'No summary available';
  const justification = analysis.justification || 'No justification available';
  const source = analysis.source || 'N/A';
  const sourceUrl = analysis.sourceUrl || '#';
  const timestamp = analysis.timestamp || 'N/A';
  
  return `
  <div style="margin-bottom: 20px; padding: 15px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.12);">
    <h2 style="margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 1px solid #eaeaea; color: #2c3e50; font-size: 18px;">Summary</h2>
    <p style="margin: 0 0 15px 0; line-height: 1.5; font-size: 16px;">${summary}</p>
    <div style="padding: 15px; background-color: #f9f9f9; border-left: 4px solid #1a365d; margin-top: 15px;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #2c3e50;">Detailed Justification</h3>
      <p style="margin: 0; line-height: 1.5; font-size: 14px;">${justification}</p>
    </div>
    <div style="margin-top: 15px; font-size: 12px; color: #777777; text-align: right;">
      Source: <a href="${sourceUrl}" style="color: #3498db; text-decoration: none;">${source}</a> | Last Updated: ${timestamp}
    </div>
  </div>`;
}

/**
 * Generate the market sentiment section
 * @param {Object} analysis - The analysis data
 * @returns {String} HTML for the market sentiment section
 */
function generateMarketSentimentSection(analysis) {
  // Handle the case where sentiment is under analysis.sentiment (new format)
  // or directly under analysis (old format)
  const sentiment = (analysis.analysis && analysis.analysis.sentiment) || 
                    (analysis.analysis && analysis.analysis.marketSentiment) || 
                    { overall: 'N/A', analysts: [] };
  
  const overall = sentiment.overall || 'N/A';
  const analysts = sentiment.analysts || [];
  const source = sentiment.source || 'N/A';
  const sourceUrl = sentiment.sourceUrl || '#';
  const lastUpdated = sentiment.lastUpdated || 'N/A';
  
  // Generate analyst comments HTML
  let analystsHtml = '<p>No analyst comments available</p>';
  if (analysts.length > 0) {
    analystsHtml = `
    <div style="margin-top: 15px;">
      ${analysts.map(analyst => {
        const mentionedSymbols = analyst.mentionedSymbols || [];
        const symbolsHtml = mentionedSymbols.length > 0 
          ? `<div style="margin-top: 5px;"><span style="font-weight: 500;">Symbols:</span> ${mentionedSymbols.join(', ')}</div>` 
          : '';
        
        return `
        <div style="margin-bottom: 15px; padding: 12px; background-color: #f5f7fa; border-radius: 6px;">
          <div style="font-weight: 500; color: #2c3e50;">${analyst.analyst || 'Unknown Analyst'}</div>
          <div style="margin-top: 5px; font-style: italic;">"${analyst.comment || 'No comment'}"</div>
          ${symbolsHtml}
          <div style="margin-top: 5px; font-size: 11px; color: #7f8c8d; text-align: right;">Source: ${analyst.source || 'N/A'}</div>
        </div>`;
      }).join('')}
    </div>`;
  }
  
  return `
  <div style="margin-bottom: 20px; padding: 15px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.12);">
    <h2 style="margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 1px solid #eaeaea; color: #2c3e50; font-size: 18px;">Market Sentiment</h2>
    
    <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
      <div style="width: 120px; height: 120px; border-radius: 50%; background-color: #f5f7fa; display: flex; align-items: center; justify-content: center; border: 3px solid ${getSentimentColor(overall)};">
        <div style="text-align: center;">
          <div style="font-size: 18px; font-weight: bold; color: ${getSentimentColor(overall)};">${overall}</div>
        </div>
      </div>
    </div>
    
    <h3 style="margin: 20px 0 10px 0; font-size: 16px; color: #2c3e50;">Analyst Commentary</h3>
    ${analystsHtml}
    
    <div style="margin-top: 15px; font-size: 12px; color: #777777; text-align: right;">
      Source: <a href="${sourceUrl}" style="color: #3498db; text-decoration: none;">${source}</a> | Last Updated: ${lastUpdated}
    </div>
  </div>`;
}

/**
 * Get the color for a sentiment value
 * @param {String} sentiment - The sentiment value
 * @returns {String} The color for the sentiment
 */
function getSentimentColor(sentiment) {
  const sentimentLower = (sentiment || '').toLowerCase();
  
  if (sentimentLower.includes('bullish') || sentimentLower.includes('positive')) {
    return '#4caf50'; // Green
  } else if (sentimentLower.includes('bearish') || sentimentLower.includes('negative')) {
    return '#f44336'; // Red
  } else if (sentimentLower.includes('neutral')) {
    return '#ff9800'; // Orange/Amber
  } else {
    return '#757575'; // Gray (default)
  }
}

// Import the other section generators
const generateMarketIndicatorsSection = require('./marketIndicatorsSection');
const generateFundamentalMetricsSection = require('./fundamentalMetricsSection');
const generateMacroeconomicFactorsSection = require('./macroeconomicFactorsSection');
const generateNextAnalysisSection = require('./nextAnalysisSection');

// Export all section generators
module.exports = {
  generateHeader,
  generateFooter,
  generateDecisionSection,
  generateMarketSentimentSection,
  generateMarketIndicatorsSection,
  generateFundamentalMetricsSection,
  generateMacroeconomicFactorsSection,
  generateNextAnalysisSection
};
