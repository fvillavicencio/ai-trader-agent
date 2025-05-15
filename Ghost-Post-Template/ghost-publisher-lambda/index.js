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
const axios = require('axios');

// Configure retry settings
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // Start with 2 second delay
const RETRY_STATUS_CODES = [429, 500, 502, 503, 504]; // Status codes to retry on

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
 * @param {object} data - The data object containing market information
 * @returns {string} - The generated title
 */
const generateEngagingTitle = (data) => {
  // Import the catchy titles database
  const { getRandomCatchyTitle, bullishTitles, bearishTitles, neutralTitles, volatilityTitles } = require('./src/utils/catchy-titles');
  
  // Determine market sentiment based on data
  let sentiment = 'neutral'; // Default to neutral
  let justificationText = '';
  let vixHigh = false;
  let fearGreedValue = 0;
  
  // Extract justification text if available
  if (data && data.justification && data.justification.text) {
    justificationText = data.justification.text.toLowerCase();
  }
  
  // Check for volatility indicators
  if (data && data.keyMarketIndicators && 
      data.keyMarketIndicators.volatilityIndices && 
      data.keyMarketIndicators.volatilityIndices.vix) {
    const vixValue = parseFloat(data.keyMarketIndicators.volatilityIndices.vix.value);
    if (vixValue > 25) {
      vixHigh = true;
    }
  }
  
  // Check Fear & Greed Index if available
  if (data && data.keyMarketIndicators && 
      data.keyMarketIndicators.fearAndGreedIndex && 
      data.keyMarketIndicators.fearAndGreedIndex.value) {
    fearGreedValue = parseInt(data.keyMarketIndicators.fearAndGreedIndex.value, 10);
  }
  
  // Determine base sentiment from decision
  if (data && data.decision) {
    const action = data.decision.action || '';
    
    // Map the OpenAI decision values to our sentiment categories
    if (action.includes('Buy Now')) {
      sentiment = 'bullish';
    } else if (action.includes('Position for Long-Term')) {
      // Long-term positioning can be bullish but more measured
      sentiment = justificationText.includes('caution') ? 'neutral' : 'bullish';
    } else if (action.includes('Sell Now')) {
      sentiment = 'bearish';
    } else if (action.includes('Sell Calls')) {
      // Selling calls is typically bearish or expecting flat markets
      sentiment = 'bearish';
    } else if (action.includes('Hold – Awaiting Stronger Signal')) {
      sentiment = 'neutral';
    } else if (action.includes('Buy and Hedge')) {
      // This is cautiously bullish - check justification for tone
      sentiment = justificationText.includes('risk') || justificationText.includes('caution') ? 'neutral' : 'bullish';
    } else if (action.includes('Deploy Hedges')) {
      // Deploying hedges suggests concern - lean bearish unless justification is optimistic
      sentiment = justificationText.includes('optimis') ? 'neutral' : 'bearish';
    }
  }
  
  // Further refine sentiment based on justification text and market indicators
  if (justificationText) {
    // Check for strongly bearish language
    if (justificationText.includes('overvaluation') || 
        justificationText.includes('correction') || 
        justificationText.includes('downside risk') ||
        justificationText.includes('bearish')) {
      // Strengthen bearish sentiment or shift neutral to bearish
      if (sentiment === 'neutral') sentiment = 'bearish';
    }
    
    // Check for strongly bullish language
    if (justificationText.includes('undervalued') || 
        justificationText.includes('strong growth') || 
        justificationText.includes('upside potential') ||
        justificationText.includes('bullish')) {
      // Strengthen bullish sentiment or shift neutral to bullish
      if (sentiment === 'neutral') sentiment = 'bullish';
    }
    
    // Check for mixed/conflicting signals
    if (justificationText.includes('mixed signals') || 
        justificationText.includes('conflicting') || 
        (justificationText.includes('bullish') && justificationText.includes('bearish'))) {
      sentiment = 'neutral';
    }
  }
  
  // Override with volatility sentiment if VIX is high and justification mentions volatility
  if (vixHigh && justificationText.includes('volatil')) {
    sentiment = 'volatile';
  }
  
  // Fear & Greed Index can further refine sentiment
  if (fearGreedValue > 0) {
    if (fearGreedValue <= 25 && sentiment !== 'volatile') {
      // Extreme fear - likely bearish unless justification suggests otherwise
      if (!justificationText.includes('buying opportunity')) {
        sentiment = 'bearish';
      }
    } else if (fearGreedValue >= 75 && sentiment !== 'volatile') {
      // Extreme greed - could be time for caution
      if (justificationText.includes('overvalued') || justificationText.includes('caution')) {
        sentiment = 'bearish';
      }
    }
  }
  
  // Get a catchy title based on sentiment
  const catchyTitle = getRandomCatchyTitle(sentiment);
  
  // Map specific titles to coherent emojis
  const titleToEmojiMap = {
    // Bullish titles
    "Greed Is Good": "💰",
    "Blue Horseshoe Loves This Market": "💙",
    "Money Never Sleeps": "💵",
    "Lunch Is For Wimps": "🥪",
    "Absolutely Vertical": "📈",
    "Rookie Numbers": "🔢",
    "Buy The Dip": "📉➡️📈",
    "The Show Goes On": "🎭",
    "Tuxedo Time": "🤵",
    "I'm Jacked! Jacked To The Tits!": "💪",
    "Opportunity Of A Lifetime": "✨",
    "It's Time To Get Rich": "💎",
    "The Upside Looks Tasty": "😋",
    "Be First, Be Smarter": "🥇",
    "There's Money To Be Made": "💸",
    "The Music Is Still Playing": "🎵",
    "Looking Good, Billy Ray!": "👍",
    "Feeling Good, Louis!": "🤩",
    "Buy Low, Sell High": "📊",
    "Act As If": "🎬",
    "Everybody Wants The Dream": "💭",
    "Bulls On Parade": "🐂",
    "Green Across The Board": "🟢",
    "Full Steam Ahead": "🚂",
    "Riding The Bull": "🏇",
    "To The Moon": "🌕",
    "Cash Is Flowing": "💦",
    "Diamond Hands": "💎",
    "FOMO Activated": "😱",
    "Printer Goes Brrr": "🖨️",
    "Tendies For Dinner": "🍗",
    "Champagne Problems": "🍾",
    "The Trend Is Your Friend": "📈",
    "Catching The Wave": "🏄",
    "The Bulls Are Running": "🐂",
    "Rocket Emoji Time": "🚀",
    
    // Bearish titles
    "Downward Is Visible": "📉",
    "The Correction Is Coming": "⚠️",
    "The Party's Over": "🎉➡️😴",
    "It's Time To Get Short": "📏",
    "The Bubble Has Popped": "💥",
    "The House Of Cards": "🃏",
    "Dogshit Wrapped In Catshit": "💩",
    "Sell It All Today": "🏃",
    "The Music Stopped": "🔇",
    "There Are Three Ways To Make Money": "3️⃣",
    "Be First, Be Smarter, Or Cheat": "🥇",
    "The Dominoes Are Falling": "🀄",
    "The Worst Is Yet To Come": "⛈️",
    "Batten Down The Hatches": "⚓",
    "Bears In Control": "🐻",
    "Red Wedding": "🔴",
    "Blood In The Streets": "🩸",
    "Catching Falling Knives": "🔪",
    "The Sky Is Falling": "☁️",
    "Dead Cat Bounce": "🐱",
    "Abandon Ship": "🚢",
    "Sell The Rip": "📈➡️📉",
    "Paper Hands Time": "📄",
    "Winter Is Coming": "❄️",
    "The Bears Are Hungry": "🐻",
    "The Bubble Has Burst": "🫧",
    "The Tide Is Going Out": "🌊",
    "Exit Stage Left": "🚪",
    
    // Neutral titles
    "Patience, Grasshopper": "🦗",
    "The Details Are Fuzzy": "🔍",
    "Just Wait": "⏳",
    "Truth Is Like Poetry": "📜",
    "Nobody Knows": "🤷",
    "It's All Just The Same Thing": "🔄",
    "Funny Money": "💰",
    "The Gray Area": "⚪",
    "Proceed With Caution": "⚠️",
    "The Jury Is Still Out": "⚖️",
    "Stuck In The Middle": "↔️",
    "The Waiting Game": "⏱️",
    "Neither Bull Nor Bear": "🐂🐻",
    "Watching From The Sidelines": "👀",
    "The Fog Of Markets": "🌫️",
    "Steady As She Goes": "🚢",
    "The Calm Before The Storm": "🌤️",
    "Mixed Signals": "📶",
    "Tug Of War": "🔄",
    "The Plot Thickens": "📚",
    "Walking The Tightrope": "🎪",
    "The Crossroads": "🚦",
    "Holding Pattern": "✈️",
    "Time Will Tell": "⏰",
    "Wait And See": "👁️",
    
    // Volatility titles
    "Turbulence Ahead": "✈️",
    "Fasten Your Seatbelts": "🔒",
    "Wild Ride": "🎢",
    "It's Time To Get Weird": "🤪",
    "The Casino Is Open": "🎰",
    "Rollercoaster Day": "🎢",
    "Market Whiplash": "💥",
    "Chaos Reigns": "🌪️",
    "The Perfect Storm": "⛈️",
    "Lightning In A Bottle": "⚡",
    "The Pendulum Swings": "🔄",
    "Buckle Up": "🔒",
    "Brace For Impact": "💥",
    "The Vix Fix": "📊",
    "Fear And Greed": "😨💰",
    "Expect The Unexpected": "🎁",
    "The Only Constant Is Change": "🔄",
    "The New Normal": "🆕",
    "The Wild West": "🤠",
    "The Twilight Zone": "🌗"
  };
  
  // Get the specific emoji for this title, or use a default based on sentiment
  let emoji = titleToEmojiMap[catchyTitle];
  
  // If no specific emoji is mapped, use a default based on sentiment
  if (!emoji) {
    const defaultEmojis = {
      'bullish': "📈",
      'bearish': "📉",
      'neutral': "⚖️",
      'volatile': "🎢"
    };
    emoji = defaultEmojis[sentiment];
  }
  
  // Return just the title and emoji without date/time
  return `${catchyTitle} ${emoji}`;
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
async function fetchAllMembers(api) {
  let allMembers = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    try {
      // Use retry logic for fetching members
      const response = await retryWithExponentialBackoff(async () => {
        try {
          const result = await api.members.browse({
            limit: 100,
            page: page,
            include: 'email,status,tiers'
          });
          console.log(`Successfully fetched members page ${page}`);
          return result;
        } catch (error) {
          console.error(`Error fetching members page ${page}: ${error.message}`);
          if (error.response) {
            console.error(`Response status: ${error.response.status}`);
          }
          throw error; // Re-throw for retry mechanism
        }
      });
      
      if (response.length === 0) {
        hasMore = false;
      } else {
        allMembers = allMembers.concat(response);
        page++;
      }
    } catch (error) {
      console.error(`Failed to fetch members after retries: ${error.message}`);
      // Don't fail the entire function if we can't fetch more members
      // Just return what we have so far
      hasMore = false;
    }
  }
  
  console.log(`Total members fetched: ${allMembers.length}`);
  return allMembers;
}

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
 * Retry function for API calls with exponential backoff
 * @param {Function} fn - The function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in ms
 * @param {Array} retryStatusCodes - HTTP status codes to retry on
 * @returns {Promise} - The result of the function call
 */
async function retryWithExponentialBackoff(fn, maxRetries = MAX_RETRIES, initialDelay = RETRY_DELAY_MS, retryStatusCodes = RETRY_STATUS_CODES) {
    let retries = 0;
    let delay = initialDelay;
    
    while (true) {
        try {
            return await fn();
        } catch (error) {
            // Check if we should retry based on status code
            const statusCode = error.statusCode || (error.response && error.response.status);
            const shouldRetry = retries < maxRetries && 
                               (retryStatusCodes.includes(statusCode) || 
                                error.code === 'ECONNRESET' || 
                                error.code === 'ETIMEDOUT' ||
                                error.message.includes('timeout'));
            
            if (!shouldRetry) {
                throw error; // Don't retry, just throw the error
            }
            
            // Log retry attempt
            retries++;
            console.log(`API call failed with status ${statusCode}. Retrying (${retries}/${maxRetries}) in ${delay}ms...`);
            console.log(`Error details: ${error.message}`);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Exponential backoff with jitter
            delay = Math.min(delay * 2, 10000) * (0.8 + Math.random() * 0.4);
        }
    }
}

/**
 * Add financial image to the HTML content
 * @param {string} htmlContent - The HTML content to modify
 * @param {string} imageUrl - The URL of the image to add
 * @returns {string} - The modified HTML content with the image
 */
const addFinancialImage = (htmlContent, imageUrl) => {
    // Create the image HTML with a quote
    const imageHtml = `
    <div style="text-align: center; margin: 20px 0 30px 0;">
      <img src="${imageUrl}" alt="Market Insights" style="max-width: 400px; width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
      <p style="font-style: italic; color: #718096; margin-top: 10px; font-size: 0.9rem;">"Greed, for lack of a better word, is good." - Gordon Gekko</p>
    </div>
    `;
    
    // Find the position after the header section
    const headerEndPos = htmlContent.indexOf('</header>');
    
    if (headerEndPos !== -1) {
        // Insert the image HTML after the header closing tag
        const modifiedHtml = [
            htmlContent.slice(0, headerEndPos + 9), // +9 to include the </header> tag
            imageHtml,
            htmlContent.slice(headerEndPos + 9)
        ].join('');
        
        return modifiedHtml;
    }
    
    // If header not found, return the original content
    return htmlContent;
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
        console.log('Context:', JSON.stringify(context));
        
        // Initialize the Ghost Admin API client
        const ghostUrl = process.env.GHOST_URL || event.ghostUrl;
        const ghostApiKey = process.env.GHOST_API_KEY || event.ghostApiKey;
        const newsletterId = process.env.GHOST_NEWSLETTER_ID || event.newsletterId;
        
        console.log('Ghost URL:', ghostUrl);
        console.log('Ghost API Key:', ghostApiKey ? 'Provided (masked)' : 'Not provided');
        console.log('Newsletter ID:', newsletterId);
        
        if (!ghostUrl || !ghostApiKey) {
            throw new Error('Missing required Ghost credentials. Please provide GHOST_URL and GHOST_API_KEY as environment variables or in the request payload.');
        }
        
        const api = new GhostAdminAPI({
            url: ghostUrl,
            key: ghostApiKey,
            version: 'v5.0'
        });
        
        // Parse the JSON data from the event
        let data;
        
        // Handle different input formats
        if (event.jsonData) {
            // Direct JSON data provided in the event
            data = event.jsonData;
            console.log('Using jsonData from event');
        } else if (event.body) {
            // API Gateway format
            console.log('Detected API Gateway format with body');
            let parsedBody;
            try {
                parsedBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
                console.log('Parsed body:', JSON.stringify(parsedBody).substring(0, 200) + '...');
            } catch (error) {
                console.error('Error parsing event.body:', error);
                throw new Error('Invalid JSON in event.body');
            }
            
            if (parsedBody.jsonData) {
                data = parsedBody.jsonData;
                console.log('Using jsonData from parsed body');
            } else {
                data = parsedBody;
                console.log('Using entire parsed body as data');
            }
        } else if (typeof event === 'string') {
            // String format
            console.log('Detected string event format');
            try {
                const parsedEvent = JSON.parse(event);
                data = parsedEvent.jsonData || parsedEvent;
                console.log('Using parsed string event data');
            } catch (error) {
                console.error('Error parsing string event:', error);
                throw new Error('Invalid JSON string in event');
            }
        } else {
            // Default to the event itself
            console.log('Using default event format');
            data = event;
        }
        
        // Validate the data structure
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format. Expected a JSON object.');
        }
        
        console.log('Data structure validation passed');
        console.log('Data keys:', Object.keys(data));
        
        // Check for required data sections
        if (!data.decision) {
            console.warn('Warning: Missing decision section in data');
        }
        
        // Generate a title for the post based on market data
        const title = generateEngagingTitle(data);
        console.log('Generated title:', title);
        
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
        
        // Get an appropriate image from S3 bucket based on title and sentiment
        const { initializeImageSelector, getS3ImageForTitle } = require('./src/utils/s3-image-selector');
        
        // Initialize the image selector
        await initializeImageSelector();
        
        // Extract sentiment from the decision data or default to neutral
        const sentiment = data.decision && data.decision.sentiment ? data.decision.sentiment : 'neutral';
        console.log(`Using sentiment "${sentiment}" for image selection`);
        
        // Select an image for the title based on sentiment
        console.log(`Selecting image for title: "${title}" with sentiment: ${sentiment}`);
        const s3ImageResult = getS3ImageForTitle(title, sentiment);
        console.log(`Selected image: ${s3ImageResult.url}`);
        console.log(`Image path: ${s3ImageResult.localPath}`);
        
        // Log the image metadata if available
        if (s3ImageResult && s3ImageResult.metadata) {
            console.log(`Image metadata: ${JSON.stringify(s3ImageResult.metadata)}`);
        }
        
        // Get the S3 image URL from the image selector result
        // The image selector now handles fallbacks internally with random selection
        let gekkoImageUrl = '';
        
        // Known working image URL to use as a last resort fallback - Gordon Gekko image
        const KNOWN_WORKING_IMAGE = 'https://market-pulse-daily-title-images.s3.us-east-2.amazonaws.com/bullish/greed_is_good/gordon_gekko_wall_street_businessman.jpg';
        
        if (s3ImageResult && s3ImageResult.url) {
            gekkoImageUrl = s3ImageResult.url;
            console.log(`Using dynamically selected image URL: ${gekkoImageUrl}`);
        } else {
            // If for some reason we still don't have an image, use a specific default image based on sentiment
            // Load default images from configuration file
            const fs = require('fs');
            const path = require('path');
            const baseS3Url = 'https://market-pulse-daily-title-images.s3.us-east-2.amazonaws.com';
            
            // Load default images from configuration file
            let defaultSentimentImages = {};
            try {
                const defaultImagesPath = path.resolve(__dirname, '../title-images/default-images.json');
                if (fs.existsSync(defaultImagesPath)) {
                    defaultSentimentImages = JSON.parse(fs.readFileSync(defaultImagesPath, 'utf8'));
                    console.log('Loaded default images from configuration file');
                } else {
                    console.warn('Default images configuration file not found');
                }
            } catch (error) {
                console.error('Error loading default images:', error);
            }
            
            // Use a specific image path based on sentiment, or default to a neutral image
            const imagePath = defaultSentimentImages[sentiment] || defaultSentimentImages['neutral'] || 'bearish/the_correction_is_coming/michael_burry_big_short.jpg';
            gekkoImageUrl = `${baseS3Url}/${imagePath}`;
            console.log(`Using fallback specific image: ${gekkoImageUrl}`);
        }
        
        // Final safety check - if the image URL is empty or invalid, use the known working image
        if (!gekkoImageUrl || gekkoImageUrl.trim() === '' || !gekkoImageUrl.startsWith('http')) {
            console.log(`Image URL invalid or empty, using known working image as final fallback`);
            gekkoImageUrl = KNOWN_WORKING_IMAGE;
        }
        
        console.log(`FINAL IMAGE URL being used for post: ${gekkoImageUrl}`);
            
        // Add image size constraints to the feature image for Ghost
        // Note: We're not modifying the URL directly as S3 doesn't support image transformations
        // The size constraint will be handled by Ghost's image processing
        
        // Create the post in Ghost
        const postData = {
            title: title,
            mobiledoc: JSON.stringify(mobiledoc),
            status: 'published',
            featured: false,
            feature_image: gekkoImageUrl,  // Add the feature image - this should be a valid S3 URL
            tags: tags,
            visibility: visibility,
            excerpt: data.decision ? data.decision.summary : 'Market analysis and trading insights',
            newsletter: {
                id: newsletterId
            }
        };
        
        console.log('Post data prepared:', JSON.stringify({
            ...postData,
            mobiledoc: '(mobiledoc content omitted for brevity)'
        }));
        
        // Create the post in Ghost with retry logic
        console.log('Attempting to create post in Ghost with retry logic...');
        const post = await retryWithExponentialBackoff(async () => {
            try {
                const result = await api.posts.add(postData);
                console.log('Post creation successful on attempt');
                return result;
            } catch (error) {
                console.error(`Post creation failed: ${error.message}`);
                if (error.response) {
                    console.error(`Response status: ${error.response.status}`);
                    console.error(`Response data: ${JSON.stringify(error.response.data || {})}`);
                }
                throw error; // Re-throw for retry mechanism
            }
        });
        
        console.log('Post created successfully!');
        console.log('Post URL:', `${ghostUrl}/${post.slug}`);
        console.log('Post ID:', post.id);
        
        // Fetch all members and categorize them
        const members = await fetchAllMembers(api);
        const categorizedMembers = categorizeMembersByStatus(members);
        console.log('Fetched and categorized members');
        console.log('Total members:', categorizedMembers.all.length);
        console.log('Paid members:', categorizedMembers.paid.length);
        console.log('Free members:', categorizedMembers.free.length);
        console.log('Comped members:', categorizedMembers.comped.length);
        
        // Generate standalone HTML
        const { generateStandaloneHTML } = require('./src/utils/html-generator');
        let html = generateStandaloneHTML(data, mobiledoc, title);
        
        // Add financial image to the HTML content
        console.log('Adding financial image to HTML content...');
        html = addFinancialImage(html, gekkoImageUrl);
        
        // Add a direct fix for the S&P 500 display format in the final HTML output
        console.log('Applying direct fix for S&P 500 display format...');
        
        // Log a sample of the HTML to help debug
        const htmlSample = html.substring(html.indexOf('S&P 500:') - 50, html.indexOf('S&P 500:') + 150);
        console.log('HTML sample around S&P 500:', htmlSample); 
        console.log('Generated standalone HTML version with financial image');
        
        // Log HTML preview for debugging
        console.log('HTML Preview (first 500 characters):');
        console.log(html.substring(0, 500) + '...');
        console.log('HTML length:', html.length, 'characters');
        
        // Save HTML to file directly
        try {
            const fs = require('fs');
            const path = require('path');
            const date = new Date().toISOString().slice(0, 10);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const htmlFilename = path.resolve(__dirname, `../market-pulse-${date}-${timestamp}.html`);
            fs.writeFileSync(htmlFilename, html, 'utf8');
            console.log(`HTML content saved to: ${htmlFilename}`);
        } catch (error) {
            console.error('Error saving HTML to file:', error.message);
        }
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            body: JSON.stringify({
                message: 'Post created successfully',
                postUrl: `${ghostUrl}/${post.slug}`,
                postId: post.id,
                members: categorizedMembers,
                html: html // Include the HTML in the response
            })
        };
    } catch (error) {
        console.error('Error:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Enhanced error logging
        if (error.details) {
            console.error('Error details:', JSON.stringify(error.details));
        }
        
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data || {}));
        }
        
        // Determine appropriate status code
        let statusCode = 500;
        if (error.statusCode) {
            statusCode = error.statusCode;
        } else if (error.response && error.response.status) {
            statusCode = error.response.status;
        }
        
        // Determine if this was a Ghost API error
        const isGhostApiError = error.message && (
            error.message.includes('Ghost') ||
            error.message.includes('api') ||
            (error.response && error.response.data && error.response.data.errors)
        );
        
        // Create detailed error response
        const errorResponse = {
            success: false,
            error: error.message,
            statusCode: statusCode,
            isGhostApiError: isGhostApiError,
            details: error.details || (error.response && error.response.data) || 'No additional details available',
            timestamp: new Date().toISOString(),
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        };
        
        return {
            statusCode: statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            body: JSON.stringify(errorResponse)
        };
    }
};
