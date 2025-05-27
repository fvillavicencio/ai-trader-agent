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
  
  const sentiment = data.marketSentiment;
  
  const html = `
    <div class="market-pulse-section market-sentiment-container" style="margin: 0; padding: 0; margin-bottom: 20px;">
      <div class="collapsible-section" data-section="market-sentiment">
        <div class="collapsible-header" style="background-color: #1a365d; padding: 15px; border-radius: 8px; display: flex; flex-direction: column; align-items: flex-start;">
          <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <div style="margin: 0; font-size: 2rem; color: white;">Market Sentiment</div>
            <div class="collapsible-icon" style="font-size: 14px; color: white;">▼</div>
          </div>
          <div style="margin-top: 10px; line-height: 1.5; color: white; font-size: 1.2rem; font-weight: normal; text-align: center; width: 100%;">
            ${sentiment.overall || 'No sentiment data available'}
          </div>
        </div>
        <div class="collapsible-content" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out;">
  `;

  addHTML(mobiledoc, html);

  // Add analyst commentary
  if (data.marketSentiment.analysts && data.marketSentiment.analysts.length > 0) {
    const analystsHtml = `
      <div class="analyst-commentary" style="margin-top: 15px;">
        ${data.marketSentiment.analysts.map(analyst => {
          const mentionedSymbols = analyst.mentionedSymbols && analyst.mentionedSymbols.length > 0
            ? `<div style="margin-top: 5px;"><strong>Mentioned:</strong> ${analyst.mentionedSymbols.map(symbol => 
                `<span style="display: inline-block; background-color: #e6f7ff; padding: 2px 6px; border-radius: 4px; margin-right: 5px; font-size: 0.9em;">${symbol}</span>`
              ).join(' ')}</div>`
            : '';

          return `
            <div class="market-pulse-card" style="background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04); padding: 1.5rem; margin-bottom: 1.5rem; border: none;">
              <div style="font-weight: bold; margin-bottom: 5px; color: #2c5282;">${analyst.name || 'Analyst'}</div>
              <div style="line-height: 1.5;">
                ${analyst.comment || ''}
                ${mentionedSymbols}
              </div>
              <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
                Source: ${analyst.source ? `<a href="#" style="color: #3182ce; text-decoration: none;">${analyst.source}</a>` : 'Financial News Source'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    addHTML(mobiledoc, analystsHtml);
  }

  // Add last updated information if available
  if (data.marketSentiment.lastUpdated) {
    const sourceDate = data.marketSentiment.lastUpdated ?
      new Date(data.marketSentiment.lastUpdated).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';

    const dateHtml = `
        <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
          ${sourceDate ? `As of ${sourceDate}` : ''}
        </div>
        </div>
      </div>
    </div>
  `;

    addHTML(mobiledoc, dateHtml);
  } else {
    // Close the divs if no source information
    addHTML(mobiledoc, `
          </div>
        </div>
      </div>
      
      <script>
        // Add click event to toggle collapsible sections
        document.addEventListener('DOMContentLoaded', function() {
          const headers = document.querySelectorAll('.collapsible-header');
          headers.forEach(header => {
            header.addEventListener('click', function() {
              const content = this.nextElementSibling;
              const icon = this.querySelector('.collapsible-icon');
              
              // Toggle display
              if (content.style.maxHeight === '0px' || content.style.maxHeight === '') {
                content.style.maxHeight = '1000px';
                icon.style.transform = 'rotate(180deg)';
              } else {
                content.style.maxHeight = '0px';
                icon.style.transform = 'rotate(0deg)';
              }
            });
          });
        });
      </script>
    `);
  }
};

module.exports = { addMarketSentiment };
