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
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'market_pulse_data.json'), 'utf8'));
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
 * @param {object} data - The data object containing styling information
 */
const addCustomCSS = (mobiledoc, data) => {
  // Use a relative path for the CSS import to avoid hardcoding absolute paths
  const cssPath = './src/custom-styles.css';
  
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
      @import url('${cssPath}');
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
  // Add the title from metadata or use a sensible default based on existing data
  const title = data.metadata && data.metadata.title ? data.metadata.title : 'Market Pulse Daily';
  
  // We're not adding the title to the content anymore, as it will be set in the Ghost post metadata
  // This prevents duplicate titles in the published content
  
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
    // We're no longer determining color based on text - always use orange as default
  }
  
  // Use the decision color from the data or our default amber/orange
  const decisionBannerHtml = `
    <div class="decision-banner" style="background-color: ${decisionBgColor}; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem 1rem; border-radius: 1rem; margin: 1.5rem 0;">
      <div class="decision-text" id="decision" style="color: white; font-weight: bold; text-align: center; font-size: clamp(1.6rem, 5vw, 2.8rem); line-height: 1.1; display: flex; align-items: center; justify-content: center; width: 100%;">
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
  
  // Get justification text from data
  const justificationText = typeof data.justification === 'string' 
    ? data.justification 
    : (data.justification.text || '');
  
  if (!justificationText) return;
  
  const justificationHtml = `
    <div class="section">
      <h2 style="font-size: 1.8rem; margin-bottom: 1rem; color: #1a365d;">Justification</h2>
      <div style="line-height: 1.6; color: #444; font-size: 1.1em;">${justificationText}</div>
    </div>
  `;
  
  addHTML(mobiledoc, justificationHtml);
  addDivider(mobiledoc);
};

/**
 * Add disclaimer to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing disclaimer information
 */
const addDisclaimer = (mobiledoc, data) => {
  // Add a horizontal line before the disclaimer
  addDivider(mobiledoc);
  
  // Use the exact disclaimer format from the HTML template
  const disclaimerHtml = `
    <div style="margin-top: 15px; padding: 15px; background-color: #e6f2ff; border-radius: 8px; font-size: 11px; color: #666; line-height: 1.4;">
      <p><strong>Disclaimer:</strong> The information provided in this report is for informational purposes only and does not constitute investment advice. Market Pulse Daily does not guarantee the accuracy, completeness, or timeliness of the information provided. The content should not be construed as an offer to sell or the solicitation of an offer to buy any security. Market Pulse Daily is not responsible for any investment decisions made based on the information provided in this report.</p>
      <p>Past performance is not indicative of future results. Investing in securities involves risks, including the potential loss of principal. Market data and analysis are sourced from third parties believed to be reliable, but Market Pulse Daily makes no representations regarding the accuracy or completeness of such information.</p>
      <p>Market Pulse Daily may hold positions in securities mentioned in this report. Readers should conduct their own due diligence before making any investment decisions.</p>
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
  // Get the current year for the copyright
  const year = new Date().getFullYear();
  
  // Use the exact footer format from the HTML template
  const footerHtml = `
    <div style="margin-top: 15px; padding: 20px; background-color: #1a365d; color: white; text-align: center; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="font-weight: bold; margin-bottom: 10px;">Market Pulse Daily - Actionable Trading Insights</div>
      <div style="font-size: 12px; color: #e2e8f0;">&copy; ${year} Market Pulse Daily. All rights reserved.</div>
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
 * Main function to generate the Ghost post
 */
const generateGhostPost = () => {
  try {
    // Read the JSON data file
    const data = loadData();
    
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
    
    // Write the mobiledoc to a file
    fs.writeFileSync(path.join(__dirname, 'ghost-post.json'), JSON.stringify(mobiledoc, null, 2));
    console.log('Ghost post generated successfully!');
  } catch (error) {
    console.error('Error generating Ghost post:', error);
  }
};

// Execute the main function
generateGhostPost();
