/**
 * Generate the market sentiment section matching the exact style from the image
 * @param {Object} analysis - Analysis data
 * @returns {String} Market sentiment section HTML
 */
function generateMarketSentimentSection(analysis) {
  // Get sentiment data, handling both sentiment and marketSentiment fields
  const sentimentData = analysis.analysis.marketSentiment || analysis.analysis.sentiment || {};
  const overallSentiment = sentimentData.overall || 'Neutral';
  const analysts = sentimentData.analysts || [];
  
  // Generate overall sentiment header
  const overallSentimentHtml = `
    <div style="background-color: #f8f9fa; padding: 12px; margin-bottom: 15px; border-radius: 4px;">
      <div style="font-weight: bold; display: inline;">Overall Market Sentiment:</div>
      <div style="display: inline; margin-left: 5px;">${overallSentiment}</div>
    </div>
  `;
  
  // Generate analysts HTML
  let analystsHtml = '';
  if (analysts.length > 0) {
    analystsHtml = analysts.map(analyst => {
      const symbols = analyst.mentionedSymbols || [];
      
      // Generate mentioned symbols with blue background
      const symbolsHtml = symbols.length > 0 
        ? `<div style="margin-top: 8px;">
            <div style="margin-bottom: 3px;">Mentioned:</div>
            ${symbols.map(symbol => 
              `<span style="display: inline-block; background-color: #e3f2fd; color: #0d47a1; padding: 2px 8px; border-radius: 4px; margin-right: 5px; font-size: 12px;">${symbol}</span>`
            ).join('')}
          </div>`
        : '';
      
      // Generate source with proper styling
      const source = analyst.source 
        ? `<div style="margin-top: 8px; font-size: 12px; color: #666;">Source: <span style="color: #2196f3;">${analyst.source}</span></div>`
        : '';
      
      return `
        <div style="padding: 15px 0; border-top: 1px solid #e0e0e0;">
          <div style="font-weight: bold; color: #2196f3; margin-bottom: 8px;">${analyst.analyst}</div>
          <div style="font-style: italic; margin-bottom: 5px;">"${analyst.comment}"</div>
          ${symbolsHtml}
          ${source}
        </div>
      `;
    }).join('');
  } else {
    analystsHtml = `
      <div style="padding: 15px; background-color: #f5f5f5; border-radius: 6px; text-align: center; color: #757575;">
        No analyst commentary available
      </div>
    `;
  }
  
  // Generate source information
  const sourceInfo = sentimentData.source 
    ? `<div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
         Source: ${sentimentData.source} | Last Updated: ${sentimentData.lastUpdated || 'N/A'}
       </div>`
    : '';
  
  return `
  <div class="section" style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">Market Sentiment</h2>
    ${overallSentimentHtml}
    ${analystsHtml}
    ${sourceInfo}
  </div>
  `;
}

module.exports = { generateMarketSentimentSection };
