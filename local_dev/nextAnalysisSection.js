/**
 * Next Analysis Section Generator
 */

/**
 * Generate the next analysis section
 * @param {String} formattedAnalysisTime - The formatted analysis time
 * @param {String} formattedNextAnalysisTime - The formatted next analysis time
 * @returns {String} HTML for the next analysis section
 */
function generateNextAnalysisSection(formattedAnalysisTime, formattedNextAnalysisTime) {
  return `
  <div style="margin-bottom: 20px; padding: 15px; background-color: #f5f7fa; border-radius: 8px; text-align: center;">
    <div style="font-size: 14px; color: #666; margin-bottom: 5px;">This analysis was generated on:</div>
    <div style="font-size: 16px; font-weight: 500; color: #2c3e50; margin-bottom: 15px;">${formattedAnalysisTime}</div>
    
    <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Next analysis scheduled for:</div>
    <div style="font-size: 16px; font-weight: 500; color: #1a365d;">${formattedNextAnalysisTime}</div>
  </div>`;
}

module.exports = generateNextAnalysisSection;
