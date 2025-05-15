/**
 * Simple Mobiledoc Generator
 * Creates a basic mobiledoc structure with minimal data requirements
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
  mobiledoc.cards.push(['html', { html }]);
  mobiledoc.sections.push([10, mobiledoc.cards.length - 1]);
};

const addDivider = (mobiledoc) => {
  mobiledoc.cards.push(['hr', {}]);
  mobiledoc.sections.push([10, mobiledoc.cards.length - 1]);
};

/**
 * Add custom CSS to the mobiledoc
 */
const addCustomCSS = (mobiledoc) => {
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
      }
      
      h1, h2, h3, h4, h5, h6 {
        color: #1a365d;
        margin-top: 0;
        margin-bottom: 1rem;
      }
      
      p {
        margin-bottom: 1rem;
        line-height: 1.6;
      }
    </style>
  `;
  
  addHTML(mobiledoc, customCss);
};

/**
 * Add title to the mobiledoc
 */
const addTitle = (mobiledoc, data) => {
  const title = data?.reportMetadata?.title || 'Market Pulse Daily Report';
  const date = data?.reportMetadata?.date || new Date().toLocaleDateString();
  
  addHeading(mobiledoc, title, 1);
  
  if (data?.reportMetadata) {
    addParagraph(mobiledoc, `Market sentiment shifts to caution as volatility rises.`);
  }
};

/**
 * Add market sentiment section
 */
const addMarketSentiment = (mobiledoc) => {
  addHeading(mobiledoc, 'Market Sentiment', 2);
  addParagraph(mobiledoc, 'Overall sentiment: Neutral. The market sentiment is bearish with analysts expressing caution due to inflation concerns and economic slowdowns.');
};

/**
 * Add market indicators section
 */
const addMarketIndicators = (mobiledoc) => {
  addHeading(mobiledoc, 'Market Indicators', 2);
  addParagraph(mobiledoc, 'S&P 500: N/A, Dow Jones: N/A, NASDAQ: N/A');
};

/**
 * Add disclaimer to the mobiledoc
 */
const addDisclaimer = (mobiledoc) => {
  const disclaimerHtml = `
    <div style="margin-top: 2rem; padding: 1rem; background-color: #f8f9fa; border-radius: 4px; font-size: 0.9rem; color: #64748b;">
      <p style="margin: 0;">Disclaimer: This report is for informational purposes only and does not constitute financial advice.</p>
    </div>
  `;
  
  addHTML(mobiledoc, disclaimerHtml);
};

/**
 * Generate a simple mobiledoc from minimal data
 */
const generateMobiledoc = (data) => {
  try {
    console.log('Generating simple mobiledoc with data:', JSON.stringify(data, null, 2));
    
    // Create a new mobiledoc structure
    const mobiledoc = createMobiledoc();
    
    // Add basic content
    addCustomCSS(mobiledoc);
    addTitle(mobiledoc, data);
    addMarketSentiment(mobiledoc);
    addMarketIndicators(mobiledoc);
    addDisclaimer(mobiledoc);
    
    return mobiledoc;
  } catch (error) {
    console.error('Error generating simple mobiledoc:', error);
    throw error;
  }
};

module.exports = {
  generateMobiledoc,
  createMobiledoc,
  addHeading,
  addParagraph,
  addHTML,
  addDivider
};
