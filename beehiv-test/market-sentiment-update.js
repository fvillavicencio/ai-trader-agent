// Add the market sentiment section
const addMarketSentiment = (mobiledoc, data) => {
  if (!data.marketSentiment) return;
  
  addHeading(mobiledoc, 'Market Sentiment');
  
  // Add overall sentiment
  const sentimentColor = getSentimentColor(data.marketSentiment.overall);
  const sentimentClass = getSentimentClass(data.marketSentiment.overall);
  const html = `
    <div class="market-pulse-section sentiment-container collapsible-section" data-section="market-sentiment">
      <div class="collapsible-header">
        <div class="collapsible-title">Overall Sentiment: <span style="color: ${sentimentColor};">${data.marketSentiment.overall}</span></div>
        <div class="collapsible-icon">▼</div>
      </div>
      <div class="collapsible-content">
        <div style="margin-bottom: 15px;">
          <div style="font-weight: bold; margin-bottom: 5px;">Overall Sentiment:</div>
          <div style="font-size: 1.2rem; font-weight: bold; color: ${sentimentColor};">
            ${data.marketSentiment.overall}
          </div>
        </div>
  `;
  
  addHTML(mobiledoc, html);
  
  // Add analyst commentary
  if (data.marketSentiment.analysts && data.marketSentiment.analysts.length > 0) {
    const analystsHtml = `
      <div class="analyst-commentary">
        <h3>Analyst Commentary</h3>
        ${data.marketSentiment.analysts.map(analyst => {
          const mentionedSymbols = analyst.mentionedSymbols && analyst.mentionedSymbols.length > 0 
            ? `<div style="margin-top: 5px;"><strong>Mentioned:</strong> ${analyst.mentionedSymbols.join(', ')}</div>` 
            : '';
          
          return `
            <div class="market-pulse-card ${sentimentClass}">
              <div style="font-weight: bold; margin-bottom: 5px; color: #2c5282;">${analyst.name}:</div>
              <div style="line-height: 1.5;">
                ${analyst.comment}
                ${mentionedSymbols}
              </div>
              <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
                Source: ${analyst.source}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    addHTML(mobiledoc, analystsHtml);
  }
  
  // Add source information
  if (data.marketSentiment.source) {
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
          Source: ${data.marketSentiment.source}
          ${sourceDate ? `<br>As of ${sourceDate}` : ''}
        </div>
      </div>
    </div>
    `;
    
    addHTML(mobiledoc, sourceHtml);
  } else {
    // Close the divs if there's no source information
    addHTML(mobiledoc, `
      </div>
    </div>
    `);
  }
};
