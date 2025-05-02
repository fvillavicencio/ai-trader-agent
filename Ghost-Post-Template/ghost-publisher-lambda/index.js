/**
 * Ghost Publisher Lambda Function
 * 
 * This Lambda function:
 * 1. Publishes an article to Ghost CMS
 * 2. Returns the URL of the published article
 * 3. Returns member email addresses grouped by categories
 */

const GhostAdminAPI = require('@tryghost/admin-api');
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
 * Generate an engaging title for the post
 * @returns {string} - The generated title
 */
const generateEngagingTitle = () => {
  const titles = [
    'Market Whisper',
    'Market Pulse',
    'Market Insights',
    'Market Navigator',
    'Market Rhythms'
  ];
  
  const randomIndex = Math.floor(Math.random() * titles.length);
  const title = titles[randomIndex];
  
  // Get current date and time in ET
  const now = new Date();
  const options = {
    timeZone: 'America/New_York',
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const dateTimeET = formatter.format(now);
  
  return `${title} - ${dateTimeET}`;
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
  
  // Add heading
  addHeading(mobiledoc, 'Justification', 2);
  
  // Add justification text
  if (typeof data.justification === 'string') {
    addParagraph(mobiledoc, data.justification);
  } else if (Array.isArray(data.justification)) {
    data.justification.forEach(paragraph => {
      addParagraph(mobiledoc, paragraph);
    });
  } else if (typeof data.justification === 'object' && data.justification.text) {
    if (Array.isArray(data.justification.text)) {
      data.justification.text.forEach(paragraph => {
        addParagraph(mobiledoc, paragraph);
      });
    } else {
      addParagraph(mobiledoc, data.justification.text);
    }
  }
};

/**
 * Add disclaimer to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing disclaimer information
 */
const addDisclaimer = (mobiledoc, data) => {
  const disclaimer = data.disclaimer || 'This content is for informational purposes only and should not be considered financial advice. Always do your own research before making investment decisions.';
  
  const disclaimerHtml = `
    <div style="margin-top: 2rem; padding: 1rem; background-color: #f8f9fa; border-radius: 8px; font-size: 0.9rem; color: #718096;">
      <strong>Disclaimer:</strong> ${disclaimer}
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
  const footerText = data.footer?.text || 'Market Pulse Daily';
  const footerLink = data.footer?.link || '#';
  
  const footerHtml = `
    <div style="margin-top: 2rem; padding: 1rem; background-color: #1a365d; border-radius: 8px; text-align: center;">
      <a href="${footerLink}" style="color: white; text-decoration: none; font-weight: bold;">
        ${footerText}
      </a>
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
 * Generate the mobiledoc structure for the Ghost post
 * @param {object} data - The data object containing the report information
 * @returns {object} - The mobiledoc object
 */
const generateMobiledoc = (data) => {
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
};

/**
 * Fetch all members from the Ghost CMS
 * @param {object} api - The Ghost Admin API client
 * @returns {array} - Array of member objects
 */
const fetchAllMembers = async (api) => {
  let allMembers = [];
  let page = 1;
  let hasMorePages = true;
  
  while (hasMorePages) {
    const response = await api.members.browse({
      limit: 100,
      page: page,
      include: 'email'
    });
    
    if (response.length === 0) {
      hasMorePages = false;
    } else {
      allMembers = allMembers.concat(response);
      page++;
    }
  }
  
  return allMembers;
};

/**
 * Categorize members by status (paid, free, comped)
 * @param {array} members - Array of member objects
 * @returns {object} - Object with categorized member arrays
 */
const categorizeMembersByStatus = (members) => {
  const categorized = {
    all: members.map(member => member.email),
    paid: [],
    free: [],
    comped: []
  };
  
  members.forEach(member => {
    if (member.status === 'paid') {
      categorized.paid.push(member.email);
    } else if (member.status === 'comped') {
      categorized.comped.push(member.email);
    } else {
      categorized.free.push(member.email);
    }
  });
  
  return categorized;
};

/**
 * Lambda handler function
 * @param {object} event - The Lambda event object
 * @param {object} context - The Lambda context object
 * @returns {object} - The Lambda response object
 */
exports.handler = async (event, context) => {
    try {
        console.log('Event received:', JSON.stringify(event));
        
        // Initialize the Ghost Admin API client
        const api = new GhostAdminAPI({
            url: process.env.GHOST_URL,
            key: process.env.GHOST_API_KEY,
            version: 'v5.0'
        });
        
        // Generate a title for the post
        const title = generateEngagingTitle();
        console.log('Generated title:', title);
        
        // Parse the JSON data from the event
        const data = typeof event.body === 'string' ? JSON.parse(event.body) :
                    (event.body || (typeof event === 'string' ? JSON.parse(event) : event));
        console.log('Parsed data:', JSON.stringify(data, null, 2));
        
        // Generate the mobiledoc structure
        const mobiledoc = generateMobiledoc(data);
        console.log('Generated mobiledoc structure');
        
        // Create the post in Ghost
        const post = await api.posts.add({
            title: title,
            mobiledoc: JSON.stringify(mobiledoc),
            status: 'published',
            featured: false,
            newsletter: {
                id: process.env.GHOST_NEWSLETTER_ID
            }
        });
        
        console.log('Post created successfully!');
        console.log('Post URL:', `${process.env.GHOST_URL}/${post.slug}`);
        console.log('Post ID:', post.id);
        
        // Fetch all members and categorize them
        const members = await fetchAllMembers(api);
        const categorizedMembers = categorizeMembersByStatus(members);
        console.log('Fetched and categorized members');
        console.log('Total members:', categorizedMembers.all.length);
        console.log('Paid members:', categorizedMembers.paid.length);
        console.log('Free members:', categorizedMembers.free.length);
        console.log('Comped members:', categorizedMembers.comped.length);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Post created successfully',
                postUrl: `${process.env.GHOST_URL}/${post.slug}`,
                postId: post.id,
                members: categorizedMembers
            })
        };
    } catch (error) {
        console.error('Error:', error);
        console.error('Error details:', error.details);
        console.error('Error stack:', error.stack);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message,
                details: error.details,
                stack: error.stack
            })
        };
    }
};
