/**
 * Market Pulse Daily - Ghost Post Generator for Lambda
 * Generates a Ghost post from JSON data using a modular approach
 */

// Helper functions for mobiledoc creation
const createMobiledoc = () => {
  return {
    version: '0.3.1',
    atoms: [],
    cards: [],
    markups: [],
    sections: []
  };
};

const addHeading = (mobiledoc, text, level = 1) => {
  mobiledoc.sections.push([1, `h${level}`, [[0, [], 0, text]]]);
};

const addParagraph = (mobiledoc, text) => {
  mobiledoc.sections.push([1, 'p', [[0, [], 0, text]]]);
};

const addHTML = (mobiledoc, html) => {
  mobiledoc.cards.push(['html', { cardName: 'html', html }]);
  mobiledoc.sections.push([10, mobiledoc.cards.length - 1]);
};

const addDivider = (mobiledoc) => {
  mobiledoc.cards.push(['hr', {}]);
  mobiledoc.sections.push([10, mobiledoc.cards.length - 1]);
};

/**
 * Add custom CSS to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing styling information
 */
const addCustomCSS = (mobiledoc, data) => {
  const customCss = `
    <style>
      .market-pulse-section {
        margin-bottom: 2rem;
      }
      
      .market-pulse-card {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        padding: 1.25rem;
        margin-bottom: 1rem;
        border: none;
      }
      
      .decision-banner {
        background-color: #f59e0b;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 1.5rem 1rem;
        border-radius: 1rem;
        margin: 1.5rem 0;
      }
      
      .decision-text {
        color: white;
        font-weight: bold;
        text-align: center;
        font-size: clamp(1.6rem, 5vw, 2.8rem);
        line-height: 1.1;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
      }
      
      .collapsible-header {
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 10px;
      }
      
      .collapsible-content {
        overflow: hidden;
        transition: max-height 0.3s ease-out;
        max-height: 0;
      }
      
      .collapsible-content.active {
        max-height: 2000px; /* Large enough to fit content */
      }
      
      .collapsible-icon {
        font-size: 14px;
        transition: transform 0.3s ease;
        color: white;
      }
      
      .collapsible-icon.active {
        transform: rotate(180deg);
      }
      
      /* Section-specific colors */
      .market-sentiment-container .collapsible-header {
        background-color: #1a365d;
      }
      
      .market-indicators-container .collapsible-header {
        background-color: #2c5282;
      }
      
      .fundamental-metrics-container .collapsible-header {
        background-color: #2b6cb0;
      }
      
      .macroeconomic-factors-container .collapsible-header {
        background-color: #3182ce;
      }
      
      .geopolitical-risks-container .collapsible-header {
        background-color: #805ad5;
      }
    </style>
  `;
  
  addHTML(mobiledoc, customCss);
};

/**
 * Add wrapper start to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 */
const addWrapperStart = (mobiledoc) => {
  const wrapperStart = `
    <div class="market-pulse-container">
  `;
  
  addHTML(mobiledoc, wrapperStart);
};

/**
 * Add wrapper end to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 */
const addWrapperEnd = (mobiledoc) => {
  const wrapperEnd = `
    </div>
  `;
  
  addHTML(mobiledoc, wrapperEnd);
};

/**
 * Add title to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing title information
 */
const addTitle = (mobiledoc, data) => {
  // Add the date from reportDateFormatted or calculate from reportDate
  let formattedDate = '';
  if (data.reportDateFormatted) {
    formattedDate = data.reportDateFormatted;
  } else if (data.reportDate) {
    const date = new Date(data.reportDate);
    formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  const dateHtml = `
    <div style="text-align: center; margin-bottom: 20px; color: #718096;">
      ${formattedDate}
    </div>
  `;
  
  addHTML(mobiledoc, dateHtml);
  
  // Add Gordon Gekko image
  const gekkoImageHtml = `
    <div style="text-align: center; margin: 20px 0 30px 0;">
      <img src="http://www.deoveritas.com/blog/wp-content/uploads/gekko-1.jpg" alt="Gordon Gekko" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
      <p style="font-style: italic; color: #718096; margin-top: 10px; font-size: 0.9rem;">"Greed, for lack of a better word, is good." - Gordon Gekko</p>
    </div>
  `;
  
  addHTML(mobiledoc, gekkoImageHtml);
};

/**
 * Add the decision banner section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing decision information
 */
const addDecisionBanner = (mobiledoc, data) => {
  if (!data.decision) return;
  
  // Get decision text and color from data
  let decisionValue = '';
  let decisionIcon = '';
  let decisionSummary = '';
  let decisionBgColor = '#f59e0b'; // Default amber/orange for all decisions
  
  if (typeof data.decision === 'string') {
    decisionValue = data.decision;
  } else if (typeof data.decision === 'object') {
    // Handle different decision object structures
    if (data.decision.text) {
      decisionValue = data.decision.text;
    } else if (data.decision.value) {
      decisionValue = data.decision.value;
    }
    
    // Get icon if available or determine based on decision text
    if (data.decision.icon) {
      decisionIcon = data.decision.icon;
    } else {
      const decisionLower = decisionValue.toLowerCase();
      if (decisionLower.includes('buy') || decisionLower.includes('bullish')) {
        decisionIcon = '↑';
      } else if (decisionLower.includes('sell') || decisionLower.includes('bearish')) {
        decisionIcon = '↓';
      } else if (decisionLower.includes('hold')) {
        decisionIcon = '→';
      } else {
        decisionIcon = '⚠️';
      }
    }
    
    // Get summary if available
    if (data.decision.summary) {
      decisionSummary = data.decision.summary;
    }
    
    // Use color from decision object if available, otherwise keep default orange
    if (data.decision.color) {
      decisionBgColor = data.decision.color;
    }
  }
  
  // Use the decision color from the data or our default amber/orange
  const decisionBannerHtml = `
    <div class="decision-banner" style="background-color: ${decisionBgColor};">
      <div class="decision-text" id="decision">
        ${decisionIcon ? `<span style="margin-right: 10px;">${decisionIcon}</span>` : ''}
        ${decisionValue}
      </div>
      ${decisionSummary ? `<div style="font-size: 16px; color: white; margin-top: 8px; text-align: center;">${decisionSummary}</div>` : ''}
    </div>
  `;
  
  addHTML(mobiledoc, decisionBannerHtml);
};

/**
 * Add the justification section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing justification information
 */
const addJustification = (mobiledoc, data) => {
  if (!data.justification) return;
  
  let justificationText = '';
  
  if (typeof data.justification === 'string') {
    justificationText = data.justification;
  } else if (typeof data.justification === 'object' && data.justification.text) {
    justificationText = data.justification.text;
  }
  
  if (!justificationText) return;
  
  const justificationHtml = `
    <div class="market-pulse-section">
      <h2 style="font-weight: bold; background-color: white; padding: 10px; border-radius: 4px;">Justification</h2>
      <div class="market-pulse-card">
        <div style="white-space: pre-line;">${justificationText}</div>
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, justificationHtml);
};

/**
 * Add market sentiment section to the mobiledoc
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
  if (sentiment.analysts && sentiment.analysts.length > 0) {
    const analystsHtml = `
      <div class="analyst-commentary" style="margin-top: 15px;">
        ${sentiment.analysts.map(analyst => {
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

  // Add sentiment indicators
  if (sentiment.indicators && Object.keys(sentiment.indicators).length > 0) {
    const indicators = sentiment.indicators;
    
    const indicatorsHtml = `
      <div class="market-pulse-card" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); padding: 1.5rem; margin-bottom: 1rem; border: none;">
        <h3 style="margin: 0 0 1rem 0; color: #2c5282; font-size: 1.5rem;">Sentiment Indicators</h3>
        
        <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
          ${indicators.fearGreedIndex ? `
            <div style="flex: 1; min-width: 250px; background-color: #f8f9fa; border-radius: 8px; padding: 1rem;">
              <div style="font-weight: bold; margin-bottom: 0.5rem; color: #4a5568;">Fear & Greed Index</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: ${getSentimentColor(indicators.fearGreedIndex.rating)};">
                ${indicators.fearGreedIndex.value} - ${indicators.fearGreedIndex.rating}
              </div>
              ${indicators.fearGreedIndex.change ? `
                <div style="font-size: 0.9rem; color: #718096;">
                  ${indicators.fearGreedIndex.change > 0 ? '+' : ''}${indicators.fearGreedIndex.change} from yesterday
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          ${indicators.putCallRatio ? `
            <div style="flex: 1; min-width: 250px; background-color: #f8f9fa; border-radius: 8px; padding: 1rem;">
              <div style="font-weight: bold; margin-bottom: 0.5rem; color: #4a5568;">Put/Call Ratio</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: #2c5282;">
                ${indicators.putCallRatio.value}
              </div>
              <div style="font-size: 0.9rem; color: #718096;">
                ${indicators.putCallRatio.interpretation || 'No interpretation available'}
              </div>
            </div>
          ` : ''}
        </div>
        
        ${indicators.source ? `
          <div style="font-size: 0.8rem; color: #718096; margin-top: 1rem; text-align: right;">
            Source: ${indicators.source}
            ${indicators.lastUpdated ? `as of ${indicators.lastUpdated}` : ''}
          </div>
        ` : ''}
      </div>
    `;

    addHTML(mobiledoc, indicatorsHtml);
  }

  // Add source information
  if (sentiment.source) {
    const sourceHtml = `
      <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
        Source: ${sentiment.source}
        ${sentiment.lastUpdated ? `as of ${sentiment.lastUpdated}` : ''}
      </div>
    `;

    addHTML(mobiledoc, sourceHtml);
  }

  // Close the collapsible content and section
  const closingHtml = `
        </div>
      </div>
    </div>
  `;

  addHTML(mobiledoc, closingHtml);
};

/**
 * Add market indicators section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing market indicators information
 */
const addMarketIndicators = (mobiledoc, data) => {
  if (!data.marketIndicators) return;
  
  const indicators = data.marketIndicators;
  
  const html = `
    <div class="market-pulse-section market-indicators-container" style="margin: 0; padding: 0; margin-bottom: 20px;">
      <div class="collapsible-section" data-section="market-indicators">
        <div class="collapsible-header" style="background-color: #2c5282; padding: 15px; border-radius: 8px; display: flex; flex-direction: column; align-items: flex-start;">
          <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <div style="margin: 0; font-size: 2rem; color: white;">Key Market Indicators</div>
            <div class="collapsible-icon" style="font-size: 14px; color: white;">▼</div>
          </div>
          <div style="margin-top: 10px; line-height: 1.5; color: white; font-size: 1.2rem; font-weight: normal; text-align: center; width: 100%;">
            ${indicators.summary || 'Major indices, sectors, and key technical indicators'}
          </div>
        </div>
        <div class="collapsible-content" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out;">
  `;

  addHTML(mobiledoc, html);

  // Add Major Indices
  if (indicators.majorIndices && indicators.majorIndices.length > 0) {
    const indicesHtml = `
      <div class="market-pulse-card" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); padding: 1.5rem; margin-bottom: 1rem; border: none;">
        <h3 style="margin: 0 0 1rem 0; color: #2c5282; font-size: 1.5rem;">Major Indices</h3>
        
        <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
          ${indicators.majorIndices.map(index => {
            // Determine color based on change
            const changeValue = parseFloat(index.change);
            const changeColor = !isNaN(changeValue) ? 
              (changeValue > 0 ? '#48bb78' : changeValue < 0 ? '#e53e3e' : '#718096') : 
              '#718096';
            
            const changePrefix = !isNaN(changeValue) && changeValue > 0 ? '+' : '';
            
            return `
              <div style="flex: 1; min-width: 250px; background-color: #f8f9fa; border-radius: 8px; padding: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <div style="font-weight: bold; color: #2c5282;">${index.name}</div>
                  <div style="font-size: 0.9rem; color: #718096;">${index.symbol}</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <div style="font-size: 1.5rem; font-weight: bold; color: #2c5282;">${index.price}</div>
                  <div style="font-size: 1.1rem; font-weight: bold; color: ${changeColor};">
                    ${changePrefix}${index.change} (${changePrefix}${index.changePercent})
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        ${indicators.majorIndicesSource ? `
          <div style="font-size: 0.8rem; color: #718096; margin-top: 1rem; text-align: right;">
            Source: ${indicators.majorIndicesSource}
            ${indicators.majorIndicesLastUpdated ? `as of ${indicators.majorIndicesLastUpdated}` : ''}
          </div>
        ` : ''}
      </div>
    `;

    addHTML(mobiledoc, indicesHtml);
  }

  // Add Sector Performance
  if (indicators.sectorPerformance && indicators.sectorPerformance.length > 0) {
    const sectorsHtml = `
      <div class="market-pulse-card" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); padding: 1.5rem; margin-bottom: 1rem; border: none;">
        <h3 style="margin: 0 0 1rem 0; color: #2c5282; font-size: 1.5rem;">Sector Performance</h3>
        
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
          ${indicators.sectorPerformance.map(sector => {
            // Determine color based on change
            const changeValue = parseFloat(sector.change);
            const changeColor = !isNaN(changeValue) ? 
              (changeValue > 0 ? '#48bb78' : changeValue < 0 ? '#e53e3e' : '#718096') : 
              '#718096';
            
            const changePrefix = !isNaN(changeValue) && changeValue > 0 ? '+' : '';
            
            return `
              <div style="flex: 1; min-width: 150px; background-color: #f8f9fa; border-radius: 8px; padding: 0.8rem; text-align: center;">
                <div style="font-weight: bold; margin-bottom: 0.3rem; color: #4a5568;">${sector.name}</div>
                <div style="font-size: 1.1rem; font-weight: bold; color: ${changeColor};">
                  ${changePrefix}${sector.change}%
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        ${indicators.sectorPerformanceSource ? `
          <div style="font-size: 0.8rem; color: #718096; margin-top: 1rem; text-align: right;">
            Source: ${indicators.sectorPerformanceSource}
            ${indicators.sectorPerformanceLastUpdated ? `as of ${indicators.sectorPerformanceLastUpdated}` : ''}
          </div>
        ` : ''}
      </div>
    `;

    addHTML(mobiledoc, sectorsHtml);
  }

  // Add Futures
  if (indicators.futures && indicators.futures.length > 0) {
    const futuresHtml = `
      <div class="market-pulse-card" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); padding: 1.5rem; margin-bottom: 1rem; border: none;">
        <h3 style="margin: 0 0 1rem 0; color: #2c5282; font-size: 1.5rem;">Futures</h3>
        
        <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
          ${indicators.futures.map(future => {
            // Determine color based on change
            const changeValue = parseFloat(future.change);
            const changeColor = !isNaN(changeValue) ? 
              (changeValue > 0 ? '#48bb78' : changeValue < 0 ? '#e53e3e' : '#718096') : 
              '#718096';
            
            const changePrefix = !isNaN(changeValue) && changeValue > 0 ? '+' : '';
            
            return `
              <div style="flex: 1; min-width: 250px; background-color: #f8f9fa; border-radius: 8px; padding: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <div style="font-weight: bold; color: #2c5282;">${future.name}</div>
                  <div style="font-size: 0.9rem; color: #718096;">${future.symbol}</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <div style="font-size: 1.5rem; font-weight: bold; color: #2c5282;">${future.price}</div>
                  <div style="font-size: 1.1rem; font-weight: bold; color: ${changeColor};">
                    ${changePrefix}${future.change} (${changePrefix}${future.changePercent})
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        ${indicators.futuresSource ? `
          <div style="font-size: 0.8rem; color: #718096; margin-top: 1rem; text-align: right;">
            Source: ${indicators.futuresSource}
            ${indicators.futuresLastUpdated ? `as of ${indicators.futuresLastUpdated}` : ''}
          </div>
        ` : ''}
      </div>
    `;

    addHTML(mobiledoc, futuresHtml);
  }

  // Add Technical Indicators
  if (indicators.technicalIndicators) {
    const technicalHtml = `
      <div class="market-pulse-card" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); padding: 1.5rem; margin-bottom: 1rem; border: none;">
        <h3 style="margin: 0 0 1rem 0; color: #2c5282; font-size: 1.5rem;">Technical Indicators</h3>
        
        <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
          ${indicators.technicalIndicators.vix ? `
            <div style="flex: 1; min-width: 250px; background-color: #f8f9fa; border-radius: 8px; padding: 1rem;">
              <div style="font-weight: bold; margin-bottom: 0.5rem; color: #4a5568;">VIX (Volatility Index)</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: #2c5282;">
                ${indicators.technicalIndicators.vix.value}
              </div>
              ${indicators.technicalIndicators.vix.change ? `
                <div style="font-size: 0.9rem; color: ${parseFloat(indicators.technicalIndicators.vix.change) > 0 ? '#e53e3e' : '#48bb78'};">
                  ${parseFloat(indicators.technicalIndicators.vix.change) > 0 ? '+' : ''}${indicators.technicalIndicators.vix.change}
                  (${parseFloat(indicators.technicalIndicators.vix.changePercent) > 0 ? '+' : ''}${indicators.technicalIndicators.vix.changePercent})
                </div>
              ` : ''}
              ${indicators.technicalIndicators.vix.interpretation ? `
                <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #4a5568;">
                  ${indicators.technicalIndicators.vix.interpretation}
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          ${indicators.technicalIndicators.rsi ? `
            <div style="flex: 1; min-width: 250px; background-color: #f8f9fa; border-radius: 8px; padding: 1rem;">
              <div style="font-weight: bold; margin-bottom: 0.5rem; color: #4a5568;">RSI (Relative Strength Index)</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: #2c5282;">
                ${indicators.technicalIndicators.rsi.value}
              </div>
              ${indicators.technicalIndicators.rsi.interpretation ? `
                <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #4a5568;">
                  ${indicators.technicalIndicators.rsi.interpretation}
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
        
        ${indicators.technicalIndicatorsSource ? `
          <div style="font-size: 0.8rem; color: #718096; margin-top: 1rem; text-align: right;">
            Source: ${indicators.technicalIndicatorsSource}
            ${indicators.technicalIndicatorsLastUpdated ? `as of ${indicators.technicalIndicatorsLastUpdated}` : ''}
          </div>
        ` : ''}
      </div>
    `;

    addHTML(mobiledoc, technicalHtml);
  }

  // Add source information if not already included in each section
  if (indicators.source) {
    const sourceHtml = `
      <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
        Source: ${indicators.source}
        ${indicators.lastUpdated ? `as of ${indicators.lastUpdated}` : ''}
      </div>
    `;

    addHTML(mobiledoc, sourceHtml);
  }

  // Close the collapsible content and section
  const closingHtml = `
        </div>
      </div>
    </div>
  `;

  addHTML(mobiledoc, closingHtml);
};

/**
 * Add fundamental metrics section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing fundamental metrics information
 */
const addFundamentalMetrics = (mobiledoc, data) => {
  if (!data.fundamentalMetrics) return;
  
  const metrics = data.fundamentalMetrics;
  
  const html = `
    <div class="market-pulse-section fundamental-metrics-container" style="margin: 0; padding: 0; margin-bottom: 20px;">
      <div class="collapsible-section" data-section="fundamental-metrics">
        <div class="collapsible-header" style="background-color: #2b6cb0; padding: 15px; border-radius: 8px; display: flex; flex-direction: column; align-items: flex-start;">
          <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <div style="margin: 0; font-size: 2rem; color: white;">Fundamental Metrics</div>
            <div class="collapsible-icon" style="font-size: 14px; color: white;">▼</div>
          </div>
          <div style="margin-top: 10px; line-height: 1.5; color: white; font-size: 1.2rem; font-weight: normal; text-align: center; width: 100%;">
            ${metrics.summary || 'S&P 500 valuation metrics and top holdings'}
          </div>
        </div>
        <div class="collapsible-content" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out;">
  `;

  addHTML(mobiledoc, html);

  // Add S&P 500 Valuation Metrics
  if (metrics.sp500) {
    const sp500Html = `
      <div class="market-pulse-card" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); padding: 1.5rem; margin-bottom: 1rem; border: none;">
        <h3 style="margin: 0 0 1rem 0; color: #2c5282; font-size: 1.5rem;">S&P 500 Valuation</h3>
        
        <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
          ${metrics.sp500.peRatio ? `
            <div style="flex: 1; min-width: 250px; background-color: #f8f9fa; border-radius: 8px; padding: 1rem;">
              <div style="font-weight: bold; margin-bottom: 0.5rem; color: #4a5568;">P/E Ratio (TTM)</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: #2c5282;">
                ${metrics.sp500.peRatio}
              </div>
              ${metrics.sp500.peRatioAnalysis ? `
                <div style="margin-top: 0.5rem; line-height: 1.5; font-size: 0.9rem;">
                  ${metrics.sp500.peRatioAnalysis}
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          ${metrics.sp500.dividendYield ? `
            <div style="flex: 1; min-width: 250px; background-color: #f8f9fa; border-radius: 8px; padding: 1rem;">
              <div style="font-weight: bold; margin-bottom: 0.5rem; color: #4a5568;">Dividend Yield</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: #2c5282;">
                ${metrics.sp500.dividendYield}
              </div>
              ${metrics.sp500.dividendYieldAnalysis ? `
                <div style="margin-top: 0.5rem; line-height: 1.5; font-size: 0.9rem;">
                  ${metrics.sp500.dividendYieldAnalysis}
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
        
        <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
          ${metrics.sp500.earningsGrowth ? `
            <div style="flex: 1; min-width: 250px; background-color: #f8f9fa; border-radius: 8px; padding: 1rem;">
              <div style="font-weight: bold; margin-bottom: 0.5rem; color: #4a5568;">Earnings Growth (YoY)</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: #2c5282;">
                ${metrics.sp500.earningsGrowth}
              </div>
              ${metrics.sp500.earningsGrowthAnalysis ? `
                <div style="margin-top: 0.5rem; line-height: 1.5; font-size: 0.9rem;">
                  ${metrics.sp500.earningsGrowthAnalysis}
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          ${metrics.sp500.forwardPE ? `
            <div style="flex: 1; min-width: 250px; background-color: #f8f9fa; border-radius: 8px; padding: 1rem;">
              <div style="font-weight: bold; margin-bottom: 0.5rem; color: #4a5568;">Forward P/E</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: #2c5282;">
                ${metrics.sp500.forwardPE}
              </div>
              ${metrics.sp500.forwardPEAnalysis ? `
                <div style="margin-top: 0.5rem; line-height: 1.5; font-size: 0.9rem;">
                  ${metrics.sp500.forwardPEAnalysis}
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
        
        ${metrics.sp500.source ? `
          <div style="font-size: 0.8rem; color: #718096; margin-top: 1rem; text-align: right;">
            Source: ${metrics.sp500.source}
            ${metrics.sp500.lastUpdated ? `as of ${metrics.sp500.lastUpdated}` : ''}
          </div>
        ` : ''}
      </div>
    `;

    addHTML(mobiledoc, sp500Html);
  }

  // Add Forward EPS Projections
  if (metrics.forwardEps && metrics.forwardEps.length > 0) {
    const forwardEpsHtml = `
      <div class="market-pulse-card" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); padding: 1.5rem; margin-bottom: 1rem; border: none;">
        <h3 style="margin: 0 0 1rem 0; color: #2c5282; font-size: 1.5rem;">Forward EPS Projections</h3>
        
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
            <thead>
              <tr style="background-color: #f8f9fa; border-bottom: 2px solid #e2e8f0;">
                <th style="padding: 0.75rem; text-align: left; font-weight: bold; color: #4a5568;">Year</th>
                <th style="padding: 0.75rem; text-align: right; font-weight: bold; color: #4a5568;">EPS</th>
                <th style="padding: 0.75rem; text-align: right; font-weight: bold; color: #4a5568;">Target @ 15x</th>
                <th style="padding: 0.75rem; text-align: right; font-weight: bold; color: #4a5568;">Target @ 17x</th>
                <th style="padding: 0.75rem; text-align: right; font-weight: bold; color: #4a5568;">Target @ 20x</th>
              </tr>
            </thead>
            <tbody>
              ${metrics.forwardEps.map((eps, index) => `
                <tr style="border-bottom: 1px solid #e2e8f0; ${index % 2 === 0 ? 'background-color: #f8f9fa;' : ''}">
                  <td style="padding: 0.75rem; font-weight: bold; color: #2c5282;">${eps.year}</td>
                  <td style="padding: 0.75rem; text-align: right;">${eps.eps}</td>
                  <td style="padding: 0.75rem; text-align: right;">${eps.targetAt15x}</td>
                  <td style="padding: 0.75rem; text-align: right;">${eps.targetAt17x}</td>
                  <td style="padding: 0.75rem; text-align: right;">${eps.targetAt20x}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        ${metrics.forwardEpsSource ? `
          <div style="font-size: 0.8rem; color: #718096; margin-top: 1rem; text-align: right;">
            Source: ${metrics.forwardEpsSource.name || metrics.forwardEpsSource}
            ${metrics.forwardEpsSource.asOf ? `as of ${metrics.forwardEpsSource.asOf}` : ''}
          </div>
        ` : ''}
      </div>
    `;

    addHTML(mobiledoc, forwardEpsHtml);
  }

  // Add Top Holdings
  if (metrics.topHoldings && metrics.topHoldings.length > 0) {
    const topHoldingsHtml = `
      <div class="market-pulse-card" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); padding: 1.5rem; margin-bottom: 1rem; border: none;">
        <h3 style="margin: 0 0 1rem 0; color: #2c5282; font-size: 1.5rem;">Top Holdings</h3>
        
        ${metrics.topHoldings.map(index => `
          <div style="margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h4 style="margin: 0; color: #2c5282; font-size: 1.2rem;">${index.name}</h4>
              <div style="font-size: 0.9rem; color: #718096;">${index.symbol}</div>
            </div>
            
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; min-width: 500px;">
                <thead>
                  <tr style="background-color: #f8f9fa; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 0.5rem; text-align: left; font-weight: bold; color: #4a5568;">Symbol</th>
                    <th style="padding: 0.5rem; text-align: left; font-weight: bold; color: #4a5568;">Name</th>
                    <th style="padding: 0.5rem; text-align: right; font-weight: bold; color: #4a5568;">Weight (%)</th>
                  </tr>
                </thead>
                <tbody>
                  ${index.holdings.map((holding, i) => `
                    <tr style="border-bottom: 1px solid #e2e8f0; ${i % 2 === 0 ? 'background-color: #f8f9fa;' : ''}">
                      <td style="padding: 0.5rem; font-weight: bold; color: #2c5282;">${holding.symbol}</td>
                      <td style="padding: 0.5rem;">${holding.name}</td>
                      <td style="padding: 0.5rem; text-align: right;">${holding.weight}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            ${index.source ? `
              <div style="font-size: 0.8rem; color: #718096; margin-top: 0.5rem; text-align: right;">
                Source: ${index.source}
                ${index.asOf ? `as of ${index.asOf}` : ''}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;

    addHTML(mobiledoc, topHoldingsHtml);
  }

  // Add source information if not already included in each section
  if (metrics.source) {
    const sourceHtml = `
      <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
        Source: ${metrics.source}
        ${metrics.lastUpdated ? `as of ${metrics.lastUpdated}` : ''}
      </div>
    `;

    addHTML(mobiledoc, sourceHtml);
  }

  // Close the collapsible content and section
  const closingHtml = `
        </div>
      </div>
    </div>
  `;

  addHTML(mobiledoc, closingHtml);
};

/**
 * Add macroeconomic factors section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing macroeconomic factors information
 */
const addMacroeconomicFactors = (mobiledoc, data) => {
  if (!data.macroeconomicFactors) return;
  
  const macroeconomicFactors = data.macroeconomicFactors;
  
  const html = `
    <div class="market-pulse-section macroeconomic-factors-container" style="margin: 0; padding: 0; margin-bottom: 20px;">
      <div class="collapsible-section" data-section="macroeconomic-factors">
        <div class="collapsible-header" style="background-color: #3182ce; padding: 15px; border-radius: 8px; display: flex; flex-direction: column; align-items: flex-start;">
          <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <div style="margin: 0; font-size: 2rem; color: white;">Macroeconomic Factors</div>
            <div class="collapsible-icon" style="font-size: 14px; color: white;">▼</div>
          </div>
          <div style="margin-top: 10px; line-height: 1.5; color: white; font-size: 1.2rem; font-weight: normal; text-align: center; width: 100%;">
            ${macroeconomicFactors.summary || 'Key economic indicators and their market impact'}
          </div>
        </div>
        <div class="collapsible-content" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out;">
  `;

  addHTML(mobiledoc, html);

  // Add Federal Reserve section
  if (macroeconomicFactors.federalReserve) {
    const fedHtml = `
      <div class="market-pulse-card" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); padding: 1.5rem; margin-bottom: 1rem; border: none;">
        <h3 style="margin: 0 0 1rem 0; color: #2c5282; font-size: 1.5rem;">Federal Reserve</h3>
        
        <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
          <div style="flex: 1; min-width: 250px; background-color: #f8f9fa; border-radius: 8px; padding: 1rem;">
            <div style="font-weight: bold; margin-bottom: 0.5rem; color: #4a5568;">Current Fed Funds Rate</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #2c5282;">
              ${macroeconomicFactors.federalReserve.currentRate || 'N/A'}
            </div>
          </div>
          
          <div style="flex: 1; min-width: 250px; background-color: #f8f9fa; border-radius: 8px; padding: 1rem;">
            <div style="font-weight: bold; margin-bottom: 0.5rem; color: #4a5568;">Next Meeting</div>
            <div style="font-size: 1.2rem; color: #2c5282;">
              ${macroeconomicFactors.federalReserve.nextMeeting || 'N/A'}
            </div>
          </div>
        </div>
        
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
          <div style="font-weight: bold; margin-bottom: 0.5rem; color: #4a5568;">Market Expectations</div>
          <div style="line-height: 1.5;">
            ${macroeconomicFactors.federalReserve.marketExpectations || 'No data available'}
          </div>
        </div>
        
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 1rem;">
          <div style="font-weight: bold; margin-bottom: 0.5rem; color: #4a5568;">Recent Commentary</div>
          <div style="line-height: 1.5;">
            ${macroeconomicFactors.federalReserve.recentCommentary || 'No recent commentary available'}
          </div>
        </div>
        
        ${macroeconomicFactors.federalReserve.source ? `
          <div style="font-size: 0.8rem; color: #718096; margin-top: 1rem; text-align: right;">
            Source: ${macroeconomicFactors.federalReserve.source}
            ${macroeconomicFactors.federalReserve.lastUpdated ? `as of ${macroeconomicFactors.federalReserve.lastUpdated}` : ''}
          </div>
        ` : ''}
      </div>
    `;

    addHTML(mobiledoc, fedHtml);
  }

  // Add Treasury Yields section
  if (macroeconomicFactors.treasuryYields) {
    const yields = macroeconomicFactors.treasuryYields;
    
    // Check if we have current yields data
    const hasCurrentYields = yields.current && Array.isArray(yields.current) && yields.current.length > 0;
    
    // Check if we have yield curve data
    const hasYieldCurve = yields.yieldCurve && 
                          typeof yields.yieldCurve === 'object' && 
                          yields.yieldCurve.status && 
                          yields.yieldCurve.description;
    
    if (hasCurrentYields || hasYieldCurve) {
      const treasuryHtml = `
        <div class="market-pulse-card" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); padding: 1.5rem; margin-bottom: 1rem; border: none;">
          <h3 style="margin: 0 0 1rem 0; color: #2c5282; font-size: 1.5rem;">Treasury Yields</h3>
          
          ${hasCurrentYields ? `
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
              ${yields.current.map(yield => {
                // Determine color based on daily change
                let changeColor = '#718096'; // Default gray
                if (yield.dailyChange) {
                  const change = parseFloat(yield.dailyChange);
                  if (!isNaN(change)) {
                    if (change > 0) changeColor = '#e53e3e'; // Red for increase (bad for bonds)
                    else if (change < 0) changeColor = '#48bb78'; // Green for decrease
                  }
                }
                
                return `
                  <div style="flex: 1; min-width: 150px; background-color: #f8f9fa; border-radius: 8px; padding: 0.8rem; text-align: center;">
                    <div style="font-weight: bold; margin-bottom: 0.3rem; color: #4a5568;">${yield.maturity}</div>
                    <div style="font-size: 1.2rem; font-weight: bold; color: #2c5282;">${yield.rate}</div>
                    ${yield.dailyChange ? `
                      <div style="font-size: 0.9rem; color: ${changeColor};">
                        ${parseFloat(yield.dailyChange) > 0 ? '+' : ''}${yield.dailyChange}
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}
          
          ${hasYieldCurve ? `
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <div style="font-weight: bold; color: #4a5568;">Yield Curve Status</div>
                <div style="font-weight: bold; color: ${
                  yields.yieldCurve.status.toLowerCase().includes('inverted') ? '#e53e3e' : 
                  yields.yieldCurve.status.toLowerCase().includes('flat') ? '#f59e0b' : '#48bb78'
                };">
                  ${yields.yieldCurve.status}
                </div>
              </div>
              <div style="line-height: 1.5;">
                ${yields.yieldCurve.description}
              </div>
            </div>
          ` : ''}
          
          ${yields.source ? `
            <div style="font-size: 0.8rem; color: #718096; margin-top: 0.5rem; text-align: right;">
              Source: ${yields.source}
              ${yields.lastUpdated ? `as of ${yields.lastUpdated}` : ''}
            </div>
          ` : ''}
        </div>
      `;

      addHTML(mobiledoc, treasuryHtml);
    }
  }

  // Add Inflation section
  if (macroeconomicFactors.inflation) {
    const inflation = macroeconomicFactors.inflation;
    
    const inflationHtml = `
      <div class="market-pulse-card" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); padding: 1.5rem; margin-bottom: 1rem; border: none;">
        <h3 style="margin: 0 0 1rem 0; color: #2c5282; font-size: 1.5rem;">Inflation</h3>
        
        <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
          ${inflation.cpi ? `
            <div style="flex: 1; min-width: 250px; background-color: #f8f9fa; border-radius: 8px; padding: 1rem;">
              <div style="font-weight: bold; margin-bottom: 0.5rem; color: #4a5568;">Consumer Price Index (CPI)</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: #2c5282;">
                ${inflation.cpi.current || 'N/A'}
              </div>
              ${inflation.cpi.previous ? `
                <div style="font-size: 0.9rem; color: #718096;">
                  Previous: ${inflation.cpi.previous}
                </div>
              ` : ''}
              ${inflation.cpi.trend ? `
                <div style="margin-top: 0.5rem; line-height: 1.5;">
                  ${inflation.cpi.trend}
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          ${inflation.pce ? `
            <div style="flex: 1; min-width: 250px; background-color: #f8f9fa; border-radius: 8px; padding: 1rem;">
              <div style="font-weight: bold; margin-bottom: 0.5rem; color: #4a5568;">Personal Consumption Expenditures (PCE)</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: #2c5282;">
                ${inflation.pce.current || 'N/A'}
              </div>
              ${inflation.pce.previous ? `
                <div style="font-size: 0.9rem; color: #718096;">
                  Previous: ${inflation.pce.previous}
                </div>
              ` : ''}
              ${inflation.pce.trend ? `
                <div style="margin-top: 0.5rem; line-height: 1.5;">
                  ${inflation.pce.trend}
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
        
        ${inflation.outlook ? `
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 1rem;">
            <div style="font-weight: bold; margin-bottom: 0.5rem; color: #4a5568;">Inflation Outlook</div>
            <div style="line-height: 1.5;">
              ${inflation.outlook}
            </div>
          </div>
        ` : ''}
        
        ${inflation.source ? `
          <div style="font-size: 0.8rem; color: #718096; margin-top: 1rem; text-align: right;">
            Source: ${inflation.source}
            ${inflation.lastUpdated ? `as of ${inflation.lastUpdated}` : ''}
          </div>
        ` : ''}
      </div>
    `;

    addHTML(mobiledoc, inflationHtml);
  }

  // Add Economic Calendar section
  if (macroeconomicFactors.economicCalendar && Array.isArray(macroeconomicFactors.economicCalendar) && macroeconomicFactors.economicCalendar.length > 0) {
    const calendarHtml = `
      <div class="market-pulse-card" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); padding: 1.5rem; margin-bottom: 1rem; border: none;">
        <h3 style="margin: 0 0 1rem 0; color: #2c5282; font-size: 1.5rem;">Upcoming Economic Events</h3>
        
        <div style="display: flex; flex-direction: column; gap: 0.8rem;">
          ${macroeconomicFactors.economicCalendar.map(event => {
            // Determine importance color
            let importanceColor = '#718096'; // Default gray
            if (event.importance) {
              const importance = event.importance.toLowerCase();
              if (importance.includes('high')) {
                importanceColor = '#e53e3e'; // Red for high importance
              } else if (importance.includes('medium')) {
                importanceColor = '#f59e0b'; // Orange for medium importance
              } else if (importance.includes('low')) {
                importanceColor = '#48bb78'; // Green for low importance
              }
            }
            
            return `
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 1rem; border-left: 4px solid ${importanceColor};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <div style="font-weight: bold; color: #2c5282;">${event.date}</div>
                  <div style="font-size: 0.9rem; color: ${importanceColor}; font-weight: bold;">
                    ${event.importance || 'Importance Unknown'}
                  </div>
                </div>
                <div style="font-weight: bold; margin-bottom: 0.3rem;">${event.event}</div>
                ${event.description ? `<div style="line-height: 1.5;">${event.description}</div>` : ''}
                ${event.previousValue ? `
                  <div style="font-size: 0.9rem; color: #718096; margin-top: 0.5rem;">
                    Previous: ${event.previousValue}
                    ${event.forecast ? ` | Forecast: ${event.forecast}` : ''}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
        
        ${macroeconomicFactors.economicCalendarSource ? `
          <div style="font-size: 0.8rem; color: #718096; margin-top: 1rem; text-align: right;">
            Source: ${macroeconomicFactors.economicCalendarSource}
            ${macroeconomicFactors.economicCalendarLastUpdated ? `as of ${macroeconomicFactors.economicCalendarLastUpdated}` : ''}
          </div>
        ` : ''}
      </div>
    `;

    addHTML(mobiledoc, calendarHtml);
  }

  // Close the collapsible content and section
  const closingHtml = `
        </div>
      </div>
    </div>
  `;

  addHTML(mobiledoc, closingHtml);
};

/**
 * Add geopolitical risks section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing geopolitical risks information
 */
const addGeopoliticalRisks = (mobiledoc, data) => {
  if (!data.macroeconomicFactors || !data.macroeconomicFactors.geopoliticalRisks) return;
  
  const geopoliticalRisks = data.macroeconomicFactors.geopoliticalRisks;
  
  const html = `
    <div class="market-pulse-section geopolitical-risks-container" style="margin: 0; padding: 0; margin-bottom: 20px;">
      <div class="collapsible-section" data-section="geopolitical-risks">
        <div class="collapsible-header" style="background-color: #805ad5; padding: 15px; border-radius: 8px; display: flex; flex-direction: column; align-items: flex-start;">
          <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <div style="margin: 0; font-size: 2rem; color: white;">Geopolitical Risks</div>
            <div class="collapsible-icon" style="font-size: 14px; color: white;">▼</div>
          </div>
          <div style="margin-top: 10px; line-height: 1.5; color: white; font-size: 1.2rem; font-weight: normal; text-align: center; width: 100%;">
            ${geopoliticalRisks.global || 'Current global risks and their market impact'}
          </div>
        </div>
        <div class="collapsible-content" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out;">
  `;

  addHTML(mobiledoc, html);

  // Add Risks
  if (geopoliticalRisks.risks && Array.isArray(geopoliticalRisks.risks) && geopoliticalRisks.risks.length > 0) {
    const risksHtml = `
      <div class="market-pulse-card" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); padding: 1.5rem; margin-bottom: 1rem; border: none;">
        ${geopoliticalRisks.risks.map(risk => {
          // Determine impact color based on impact level
          let impactColor = '#718096'; // Default gray
          if (risk.impact) {
            const impactText = risk.impact.toLowerCase();
            if (impactText.includes('high') || impactText.includes('severe')) {
              impactColor = '#e53e3e'; // Red for high impact
            } else if (impactText.includes('medium') || impactText.includes('moderate')) {
              impactColor = '#f59e0b'; // Orange for medium impact
            } else if (impactText.includes('low')) {
              impactColor = '#48bb78'; // Green for low impact
            }
          }
          
          return `
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; border-left: 4px solid ${impactColor};">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <h3 style="margin: 0; color: #2c5282; font-size: 1.2rem;">${risk.name}</h3>
                <div style="font-size: 0.9rem; color: ${impactColor}; font-weight: bold;">
                  ${risk.impact || 'Impact Unknown'}
                </div>
              </div>
              <p style="margin: 0.5rem 0; line-height: 1.5;">${risk.description || ''}</p>
              ${risk.source ? `
                <div style="font-size: 0.8rem; color: #718096; margin-top: 0.5rem; text-align: right;">
                  Source: ${risk.source}
                  ${risk.sourceUrl ? `(<a href="${risk.sourceUrl}" target="_blank">link</a>)` : ''}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    addHTML(mobiledoc, risksHtml);
  }

  // Add source information
  if (geopoliticalRisks.source) {
    const sourceHtml = `
      <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
        Source: ${geopoliticalRisks.source}
        ${geopoliticalRisks.lastUpdated ? `as of ${geopoliticalRisks.lastUpdated}` : ''}
      </div>
    `;

    addHTML(mobiledoc, sourceHtml);
  }

  // Close the collapsible content and section
  const closingHtml = `
        </div>
      </div>
    </div>
  `;

  addHTML(mobiledoc, closingHtml);
};

/**
 * Add disclaimer to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing disclaimer information
 */
const addDisclaimer = (mobiledoc, data) => {
  const disclaimerText = data.disclaimer || 'This content is for informational purposes only and should not be considered investment advice. Always do your own research before making investment decisions.';
  
  const disclaimerHtml = `
    <div style="margin-top: 2rem; padding: 1rem; background-color: #f8f9fa; border-radius: 4px; font-size: 0.9rem; color: #64748b;">
      <p style="margin: 0;"><strong>Disclaimer:</strong> ${disclaimerText}</p>
    </div>
  `;
  
  addHTML(mobiledoc, disclaimerHtml);
};

/**
 * Add footer to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing footer information
 */
const addFooter = (mobiledoc, data) => {
  const currentYear = new Date().getFullYear();
  
  const footerHtml = `
    <div style="margin-top: 2rem; padding: 1rem; background-color: #1a365d; border-radius: 4px; text-align: center; color: white;">
      <p style="margin: 0;">Market Pulse Daily - Professional Trading Insights</p>
      <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">&copy; ${currentYear} Market Pulse Daily</p>
    </div>
  `;
  
  addHTML(mobiledoc, footerHtml);
};

/**
 * Add collapsible sections JavaScript to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 */
const addCollapsibleSectionsScript = (mobiledoc) => {
  const collapsibleScript = `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        // Add CSS for collapsible sections
        const style = document.createElement('style');
        style.textContent = \`
          .collapsible-header {
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            background-color: #f8fafc;
            border-radius: 8px;
            margin-bottom: 10px;
          }
          
          .collapsible-content {
            overflow: hidden;
            transition: max-height 0.3s ease-out;
            max-height: 0;
          }
          
          .collapsible-content.active {
            max-height: 2000px; /* Large enough to fit content */
          }
          
          .collapsible-icon {
            font-size: 14px;
            transition: transform 0.3s ease;
          }
          
          .collapsible-icon.active {
            transform: rotate(180deg);
          }
        \`;
        document.head.appendChild(style);
        
        // Initialize all collapsible sections
        const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
        
        collapsibleHeaders.forEach(header => {
          const content = header.nextElementSibling;
          const icon = header.querySelector('.collapsible-icon');
          
          // Ensure content starts collapsed
          content.classList.remove('active');
          content.style.maxHeight = '0px';
          icon.classList.remove('active');
          
          // Add click event
          header.addEventListener('click', function() {
            // Toggle content visibility
            content.classList.toggle('active');
            icon.classList.toggle('active');
            
            if (content.classList.contains('active')) {
              content.style.maxHeight = content.scrollHeight + 'px';
            } else {
              content.style.maxHeight = '0px';
            }
          });
        });
      });
    </script>
  `;
  
  addHTML(mobiledoc, collapsibleScript);
};

/**
 * Generate a Ghost post mobiledoc from JSON data
 * @param {object} data - The data object containing all the content
 * @returns {object} - The mobiledoc object
 */
const generateMobiledoc = (data) => {
  try {
    // Create a new mobiledoc structure
    const mobiledoc = createMobiledoc();
    
    // Add content to the mobiledoc
    addCustomCSS(mobiledoc, data);
    addWrapperStart(mobiledoc);
    addTitle(mobiledoc, data);
    addDecisionBanner(mobiledoc, data);
    addJustification(mobiledoc, data);
    
    // Add sections using the modular approach
    addMarketSentiment(mobiledoc, data);
    addMarketIndicators(mobiledoc, data);
    addFundamentalMetrics(mobiledoc, data);
    addMacroeconomicFactors(mobiledoc, data);
    addGeopoliticalRisks(mobiledoc, data);
    
    // Add disclaimer, footer and JavaScript
    addDisclaimer(mobiledoc, data);
    addFooter(mobiledoc, data);
    addCollapsibleSectionsScript(mobiledoc);
    addWrapperEnd(mobiledoc);
    
    return mobiledoc;
  } catch (error) {
    console.error('Error generating mobiledoc:', error);
    throw error;
  }
};

module.exports = {
  createMobiledoc,
  addHeading,
  addParagraph,
  addHTML,
  addDivider,
  addCustomCSS,
  addWrapperStart,
  addWrapperEnd,
  addTitle,
  addDecisionBanner,
  addJustification,
  addMarketSentiment,
  addMarketIndicators,
  addFundamentalMetrics,
  addMacroeconomicFactors,
  addGeopoliticalRisks,
  addDisclaimer,
  addFooter,
  addCollapsibleSectionsScript,
  generateMobiledoc
};
