/**
 * Market Pulse Daily - Ghost Post Generator
 * Generates a Ghost post from JSON data using a modular approach
 */

const fs = require('fs');
const path = require('path');

// Import modules
const { addMarketSentiment } = require('./src/modules/market-sentiment');
const { addMarketIndicators } = require('./src/modules/market-indicators');
const { addFundamentalMetrics } = require('./src/modules/fundamental-metrics');
const { addMacroeconomicFactors } = require('./src/modules/macroeconomic-factors');
const { addGeopoliticalRisks } = require('./src/modules/geopolitical-risks');

// Import utility functions
const { 
  addHeading, 
  addParagraph, 
  addHTML, 
  addDivider 
} = require('./src/utils/mobiledoc-helpers');

/**
 * Load data from the JSON file
 * @returns {object} - The parsed JSON data
 */
const loadData = () => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'full-dataset.json'), 'utf8'));
    return data;
  } catch (error) {
    console.error('Error loading data:', error);
    return {};
  }
};

/**
 * Create a new mobiledoc structure
 * @returns {object} - The mobiledoc object
 */
const createMobiledoc = () => {
  return {
    version: '0.3.1',
    atoms: [],
    cards: [],
    markups: [],
    sections: []
  };
};

/**
 * Add custom CSS to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
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
      
      /* Add any additional custom CSS here */
      @import url('/Users/frankvillavicencio/Documents/Development/Market Pulse Daily/Ghost-Post-Template/src/custom-styles.css');
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
  // Add the title
  addHeading(mobiledoc, data.title || 'Market Pulse Daily', 1);
  
  // Add the date
  const date = data.date ? new Date(data.date) : new Date();
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const dateHtml = `
    <div style="text-align: center; margin-bottom: 20px; color: #718096;">
      ${formattedDate}
    </div>
  `;
  
  addHTML(mobiledoc, dateHtml);
};

/**
 * Add the decision banner section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing decision information
 */
const addDecisionBanner = (mobiledoc, data) => {
  if (!data.decision) return;
  
  const decisionValue = typeof data.decision === 'string' ? data.decision : data.decision.value || 'Neutral';
  const decisionColor = decisionValue.toLowerCase() === 'bullish' ? '#10b981' : '#ef4444';
  
  const decisionBannerHtml = `
    <div class="market-pulse-section decision-banner">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px;">
        <div style="font-size: 1.2rem; font-weight: bold; color: ${decisionColor};">
          ${decisionValue}
        </div>
        <div>
          <p style="text-align: center; margin: 0; color: #718096; font-style: italic;">*As of ${data.asOf || 'April 29, 2025 at 5:04 PM EDT'}*</p>
        </div>
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, decisionBannerHtml);
  addDivider(mobiledoc);
};

/**
 * Add the disclaimer section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 */
const addDisclaimer = (mobiledoc) => {
  addHeading(mobiledoc, 'Disclaimer', 2);
  
  const disclaimerHtml = `
    <div class="market-pulse-section disclaimer">
      <p style="font-size: 0.9rem; color: #718096; line-height: 1.5;">
        The information provided in this report is for informational purposes only and does not constitute investment advice. 
        Market data and analysis are based on sources believed to be reliable, but we make no representation as to their accuracy or completeness. 
        Past performance is not indicative of future results. All investments involve risk, including the loss of principal.
      </p>
    </div>
  `;
  
  addHTML(mobiledoc, disclaimerHtml);
};

/**
 * Add collapsible sections JavaScript to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 */
const addCollapsibleSectionsScript = (mobiledoc) => {
  const collapsibleScript = `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
        
        collapsibleHeaders.forEach(header => {
          header.addEventListener('click', function() {
            const content = this.nextElementSibling;
            const icon = this.querySelector('.collapsible-icon');
            
            // Toggle content visibility
            if (content.style.maxHeight) {
              content.style.maxHeight = null;
              icon.textContent = '▼';
            } else {
              content.style.maxHeight = content.scrollHeight + 'px';
              icon.textContent = '▲';
            }
          });
        });
      });
    </script>
  `;
  
  addHTML(mobiledoc, collapsibleScript);
};

/**
 * Main function to generate the Ghost post
 */
const generateGhostPost = () => {
  try {
    // Read the JSON data file
    const data = loadData();
    
    // Create a new mobiledoc structure
    const mobiledoc = createMobiledoc();
    
    // Add content to the mobiledoc
    addCustomCSS(mobiledoc);
    addWrapperStart(mobiledoc);
    addTitle(mobiledoc, data);
    addDecisionBanner(mobiledoc, data);
    
    // Add sections using the modular approach
    addMarketSentiment(mobiledoc, data);
    addMarketIndicators(mobiledoc, data);
    addFundamentalMetrics(mobiledoc, data);
    addMacroeconomicFactors(mobiledoc, data);
    addGeopoliticalRisks(mobiledoc, data);
    
    // Add disclaimer and JavaScript
    addDisclaimer(mobiledoc);
    addCollapsibleSectionsScript(mobiledoc);
    addWrapperEnd(mobiledoc);
    
    // Write the mobiledoc to a file
    fs.writeFileSync(path.join(__dirname, 'ghost-post.json'), JSON.stringify(mobiledoc, null, 2));
    console.log('Ghost post generated successfully!');
  } catch (error) {
    console.error('Error generating Ghost post:', error);
  }
};

// Execute the main function
generateGhostPost();
