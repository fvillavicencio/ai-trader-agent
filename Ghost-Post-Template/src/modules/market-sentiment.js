/**
 * Market Sentiment Module
 * Generates the Market Sentiment section of the Ghost post
 */

const { addHeading, addHTML, addDivider } = require('../utils/mobiledoc-helpers');

/**
 * Determines the appropriate color for a sentiment value
 * @param {string} sentiment - The sentiment text
 * @returns {string} - The hex color code
 */
const getSentimentColor = (sentiment) => {
  if (!sentiment) return '#718096'; // Default gray
  
  const sentimentLower = sentiment.toLowerCase();
  
  if (sentimentLower.includes('bullish') || sentimentLower.includes('positive')) {
    return '#48bb78'; // Green
  } else if (sentimentLower.includes('bearish') || sentimentLower.includes('negative')) {
    return '#e53e3e'; // Red
  } else if (sentimentLower.includes('neutral')) {
    return '#718096'; // Gray
  } else {
    return '#4299e1'; // Blue (default)
  }
};

/**
 * Determines the appropriate CSS class for a sentiment value
 * @param {string} sentiment - The sentiment text
 * @returns {string} - The CSS class name
 */
const getSentimentClass = (sentiment) => {
  if (!sentiment) return 'neutral';
  
  const sentimentLower = sentiment.toLowerCase();
  
  if (sentimentLower.includes('bullish') || sentimentLower.includes('positive')) {
    return 'positive';
  } else if (sentimentLower.includes('bearish') || sentimentLower.includes('negative')) {
    return 'negative';
  } else {
    return 'neutral';
  }
};

/**
 * Adds the Market Sentiment section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing market sentiment information
 */
const addMarketSentiment = (mobiledoc, data) => {
  if (!data.marketSentiment) return;

  addHeading(mobiledoc, 'Market Sentiment', 2);

  // Add overall sentiment in a collapsible section
  const sentimentColor = getSentimentColor(data.marketSentiment.overall);
  const sentimentClass = getSentimentClass(data.marketSentiment.overall);
  const html = `
    <div class="market-pulse-section sentiment-container collapsible-section" data-section="market-sentiment">
      <div class="collapsible-header">
        <div class="collapsible-title">Market Sentiment: <span style="color: ${sentimentColor};">${data.marketSentiment.overall || 'N/A'}</span></div>
        <div class="collapsible-icon">▼</div>
      </div>
      <div class="collapsible-content">
        ${data.marketSentiment.summary ? `
          <div style="margin-bottom: 15px; line-height: 1.5;">
            ${data.marketSentiment.summary}
          </div>
        ` : ''}
  `;

  addHTML(mobiledoc, html);

  // Add analyst commentary
  if (data.marketSentiment.analysts && data.marketSentiment.analysts.length > 0) {
    const analystsHtml = `
      <div class="analyst-commentary">
        ${data.marketSentiment.analysts.map(analyst => {
          const mentionedSymbols = analyst.mentionedSymbols && analyst.mentionedSymbols.length > 0
            ? `<div style="margin-top: 5px;"><strong>Mentioned:</strong> ${analyst.mentionedSymbols.join(', ')}</div>`
            : '';

          return `
            <div class="market-pulse-card ${sentimentClass}">
              <div style="font-weight: bold; margin-bottom: 5px; color: #2c5282;">${analyst.name || 'Analyst'}:</div>
              <div style="line-height: 1.5;">
                ${analyst.comment || ''}
                ${mentionedSymbols}
              </div>
              <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
                Source: ${analyst.source || 'Financial News Source'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    addHTML(mobiledoc, analystsHtml);
  }

  // Add source information
  if (data.marketSentiment.source || data.marketSentiment.lastUpdated) {
    const sourceDate = data.marketSentiment.lastUpdated ?
      new Date(data.marketSentiment.lastUpdated).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';

    const sourceHtml = `
        <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
          ${data.marketSentiment.source ? `Source: <a href="${data.marketSentiment.sourceUrl || '#'}" target="_blank">${data.marketSentiment.source}</a>` : ''}
          ${sourceDate ? `<br>Last Updated: ${sourceDate}` : ''}
        </div>
      </div>
    </div>
  `;

    addHTML(mobiledoc, sourceHtml);
  } else {
    // Close the divs if no source information
    addHTML(mobiledoc, `
        </div>
      </div>
    `);
  }
  
  addDivider(mobiledoc);
};

module.exports = { addMarketSentiment };
