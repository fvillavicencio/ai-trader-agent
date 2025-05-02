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
  const now = new Date();
  
  // Format time and date
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
  
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  const time = formatter.format(now);
  const date = dateFormatter.format(now);
  
  // List of market phrases to choose from
  const marketPhrases = [
    "Market Currents", "Market Pulse", "Market Whisper", "Market Musings", "Market Rhythms",
    "Market Beats", "Market Insights", "Market Signals", "Market Watch", "Market Movements"
  ];
  
  // List of emojis to choose from
  const emojis = ["📊", "📈", "📉", "💰", "🔍", "🎯", "💡", "⚡", "💫", "🌟"];
  
  // Randomly select a phrase and emoji
  const phrase = marketPhrases[Math.floor(Math.random() * marketPhrases.length)];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  
  // Return the formatted title
  return `${phrase} ${emoji} - ${date} ${time} ET`;
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
  try {
    const members = [];
    let page = 1;
    let hasMore = true;
    
    // Fetch all members using pagination
    while (hasMore) {
      const response = await api.members.browse({
        limit: 100,
        page: page,
        include: 'email'
      });
      
      if (response.length === 0) {
        hasMore = false;
      } else {
        members.push(...response);
        page++;
      }
    }
    
    return members;
  } catch (error) {
    console.error('Error fetching members:', error);
    return [];
  }
};

/**
 * Categorize members by status (paid, free, comped)
 * @param {array} members - Array of member objects
 * @returns {object} - Object with categorized member arrays
 */
const categorizeMembersByStatus = (members) => {
  const result = {
    all: [],
    paid: [],
    free: [],
    comped: []
  };
  
  members.forEach(member => {
    // Add to all members
    if (member.email) {
      result.all.push(member.email);
      
      // Categorize by status
      if (member.status === 'paid') {
        result.paid.push(member.email);
      } else if (member.status === 'comped') {
        result.comped.push(member.email);
      } else {
        result.free.push(member.email);
      }
    }
  });
  
  return result;
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
            url: process.env.GHOST_URL || event.ghostUrl,
            key: process.env.GHOST_API_KEY || event.ghostApiKey,
            version: 'v5.0'
        });
        
        // Generate a title for the post
        const title = generateEngagingTitle();
        console.log('Generated title:', title);
        
        // Parse the JSON data from the event
        let data;
        
        // Handle different input formats
        if (event.jsonData) {
            // Direct JSON data provided in the event
            data = event.jsonData;
        } else if (event.body) {
            // API Gateway format
            const parsedBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
            data = parsedBody.jsonData || parsedBody;
        } else if (typeof event === 'string') {
            // String format
            const parsedEvent = JSON.parse(event);
            data = parsedEvent.jsonData || parsedEvent;
        } else {
            // Default to the event itself
            data = event.jsonData || event;
        }
        
        console.log('Processing data for mobiledoc generation');
        
        // Generate the mobiledoc structure
        const mobiledoc = generateMobiledoc(data);
        console.log('Generated mobiledoc structure');
        
        // Determine if content should be premium based on time of day
        const isPremium = () => {
            // Get current time in ET
            const now = new Date();
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/New_York',
                hour: 'numeric',
                minute: 'numeric',
                hour12: false
            });
            
            const timeString = formatter.format(now);
            const [hour, minute] = timeString.split(':').map(num => parseInt(num, 10));
            
            // Premium content is published before 4:30 PM ET
            return hour < 16 || (hour === 16 && minute < 30);
        };
        
        const premium = isPremium();
        const visibility = premium ? 'paid' : 'members';
        
        console.log(`Content type: ${premium ? 'Premium (Paid members only)' : 'Standard (All members)'}`);
        console.log(`Visibility: ${visibility}`);
        
        // Standard tags for Market Pulse Daily posts
        const tags = [
            { name: 'Market Insights' },
            { name: 'Daily Update' },
            { name: 'Market Pulse' }
        ];
        
        // Create the post in Ghost
        const post = await api.posts.add({
            title: title,
            mobiledoc: JSON.stringify(mobiledoc),
            status: 'published',
            featured: false,
            tags: tags,
            visibility: visibility,
            excerpt: data.decision ? data.decision.summary : 'Market analysis and trading insights',
            newsletter: {
                id: process.env.GHOST_NEWSLETTER_ID || event.newsletterId
            }
        });
        
        console.log('Post created successfully!');
        console.log('Post URL:', `${process.env.GHOST_URL || event.ghostUrl}/${post.slug}`);
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
                postUrl: `${process.env.GHOST_URL || event.ghostUrl}/${post.slug}`,
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
