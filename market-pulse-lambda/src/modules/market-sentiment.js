/**
 * Market Sentiment Module
 * 
 * This module handles the generation of the Market Sentiment section for the Market Pulse Daily report.
 */

const { extractTextFromMobiledoc } = require('../utils/mobiledoc-helpers');

/**
 * Generate the Market Sentiment section
 * @param {Object} data - The data object containing market sentiment information
 * @return {Object} HTML content for the Market Sentiment section
 */
function generateMarketSentiment(data) {
  try {
    if (!data || !data.marketSentiment) {
      console.log('No market sentiment data available');
      return '';
    }

    const sentiment = data.marketSentiment;
    
    // Extract the overall sentiment
    const overallSentiment = sentiment.overall || 'No overall sentiment available';
    
    // Process analysts if available
    let analystsHtml = '';
    if (sentiment.analysts && Array.isArray(sentiment.analysts) && sentiment.analysts.length > 0) {
      analystsHtml = `
        <div class="analysts-container">
          <h3>Analyst Commentary</h3>
          <div class="analysts-grid">
            ${sentiment.analysts.map(analyst => {
              const name = analyst.name || analyst.analyst || 'Unknown Analyst';
              const comment = analyst.comment || analyst.commentary || 'No commentary provided';
              const source = analyst.source || 'Unknown Source';
              const sourceUrl = analyst.sourceUrl || '#';
              const mentionedSymbols = analyst.mentionedSymbols || [];
              
              return `
                <div class="analyst-card">
                  <div class="analyst-name">${name}</div>
                  <div class="analyst-comment">"${comment}"</div>
                  ${mentionedSymbols.length > 0 ? 
                    `<div class="mentioned-symbols">Mentioned: ${mentionedSymbols.join(', ')}</div>` : 
                    ''}
                  <div class="analyst-source">Source: <a href="${sourceUrl}" target="_blank">${source}</a></div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
    
    // Format the source information
    const source = sentiment.source || 'Unknown Source';
    const sourceUrl = sentiment.sourceUrl || '#';
    const lastUpdated = sentiment.lastUpdated ? 
      new Date(sentiment.lastUpdated).toLocaleString('en-US', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        timeZoneName: 'short'
      }) : 
      'Unknown';
    
    // Assemble the complete HTML
    return `
      <div class="section market-sentiment">
        <h2>Market Sentiment</h2>
        
        <div class="sentiment-overview">
          <div class="sentiment-quote">
            <p>${overallSentiment}</p>
          </div>
        </div>
        
        ${analystsHtml}
        
        <div class="data-source">
          Source: ${sourceUrl ? `<a href="${sourceUrl}" target="_blank">${source}</a>` : source}
          <span class="last-updated">Last Updated: ${lastUpdated}</span>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error generating market sentiment section:', error);
    return '';
  }
}

module.exports = {
  generateMarketSentiment
};
