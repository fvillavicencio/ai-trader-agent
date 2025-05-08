/**
 * Email template generator for Market Pulse Daily
 */

// Import section generators
const {
  generateHeader,
  generateFooter,
  generateDecisionSection,
  generateMarketSentimentSection,
  generateMarketIndicatorsSection,
  generateFundamentalMetricsSection,
  generateMacroeconomicFactorsSection,
  generateNextAnalysisSection
} = require('./emailSections');

/**
 * Generate the complete HTML email
 * @param {Object} analysis - The analysis data
 * @param {String} analysisTime - The analysis time
 * @param {String} nextAnalysisTime - The next analysis time
 * @returns {String} The complete HTML email
 */
function generateCompleteHtmlEmail(analysis, analysisTime, nextAnalysisTime) {
  // Format the dates for display
  const formattedAnalysisTime = formatDateTime(analysisTime);
  const formattedNextAnalysisTime = formatDateTime(nextAnalysisTime);
  
  // Generate each section of the email
  const headerHtml = generateHeader(analysis);
  const decisionHtml = generateDecisionSection(analysis);
  const marketSentimentHtml = generateMarketSentimentSection(analysis);
  const marketIndicatorsHtml = generateMarketIndicatorsSection(analysis);
  const fundamentalMetricsHtml = generateFundamentalMetricsSection(analysis);
  const macroeconomicFactorsHtml = generateMacroeconomicFactorsSection(analysis);
  const nextAnalysisHtml = generateNextAnalysisSection(formattedAnalysisTime, formattedNextAnalysisTime);
  const footerHtml = generateFooter();
  
  // Combine all sections into a complete email
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Market Pulse Daily</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f0f2f5; color: #333333;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #f0f2f5;">
      <!-- Header -->
      ${headerHtml}
      
      <!-- Main Content -->
      <div style="padding: 20px;">
        <!-- Decision Section -->
        ${decisionHtml}
        
        <!-- Market Sentiment Section -->
        ${marketSentimentHtml}
        
        <!-- Market Indicators Section -->
        ${marketIndicatorsHtml}
        
        <!-- Fundamental Metrics Section -->
        ${fundamentalMetricsHtml}
        
        <!-- Macroeconomic Factors Section -->
        ${macroeconomicFactorsHtml}
        
        <!-- Next Analysis Section -->
        ${nextAnalysisHtml}
      </div>
      
      <!-- Footer -->
      ${footerHtml}
    </div>
  </body>
  </html>`;
}

/**
 * Format a date/time string for display
 * @param {String} dateTimeString - The date/time string to format
 * @returns {String} The formatted date/time string
 */
function formatDateTime(dateTimeString) {
  try {
    const date = new Date(dateTimeString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return dateTimeString; // Return the original string if invalid
    }
    
    // Format options
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    };
    
    return date.toLocaleString('en-US', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateTimeString; // Return the original string if there's an error
  }
}

/**
 * Get the next scheduled analysis time based on the current time
 * @param {Date} currentTime - The current time
 * @returns {Date} The next scheduled analysis time
 */
function getNextScheduledAnalysisTime(currentTime = new Date()) {
  // Clone the current time to avoid modifying the original
  const now = new Date(currentTime);
  
  // Get the current day of the week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  // Create a new date object for the next analysis time
  const nextAnalysisTime = new Date(now);
  
  // If it's a weekend (Saturday or Sunday), schedule for Monday at 8:50 AM ET
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // Calculate days until Monday
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 2;
    
    // Set the date to next Monday
    nextAnalysisTime.setDate(now.getDate() + daysUntilMonday);
    
    // Set the time to 8:50 AM ET
    nextAnalysisTime.setHours(8, 50, 0, 0);
  } 
  // If it's a weekday
  else {
    // If it's before 8:50 AM ET, schedule for today at 8:50 AM ET
    if (hours < 8 || (hours === 8 && minutes < 50)) {
      nextAnalysisTime.setHours(8, 50, 0, 0);
    } 
    // If it's between 8:50 AM ET and 6:00 PM ET, schedule for today at 6:00 PM ET
    else if (hours < 18) {
      nextAnalysisTime.setHours(18, 0, 0, 0);
    } 
    // If it's after 6:00 PM ET, schedule for tomorrow
    else {
      // If it's Friday after 6:00 PM ET, schedule for Monday at 8:50 AM ET
      if (dayOfWeek === 5) {
        nextAnalysisTime.setDate(now.getDate() + 3);
        nextAnalysisTime.setHours(8, 50, 0, 0);
      } 
      // Otherwise, schedule for tomorrow at 8:50 AM ET
      else {
        nextAnalysisTime.setDate(now.getDate() + 1);
        nextAnalysisTime.setHours(8, 50, 0, 0);
      }
    }
  }
  
  return nextAnalysisTime;
}

module.exports = {
  generateCompleteHtmlEmail,
  getNextScheduledAnalysisTime
};
