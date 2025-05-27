/**
 * Preferred email template generator for Market Pulse Daily
 * Based on the style from Trading_Analysis_Market_Pulse_Daily_Watch_for_Better_Price_Action_2025-03-24_11-22-54.html
 */

const fs = require('fs');
const path = require('path');

/**
 * Format a date for display
 * @param {String|Date} dateInput - Date to format
 * @returns {String} Formatted date
 */
function formatDate(dateInput) {
  const date = new Date(dateInput);
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit', 
    timeZoneName: 'short' 
  };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Generate the CSS styles for the email
 * @returns {String} CSS styles
 */
function generateStyles() {
  return `
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 650px;
      margin: 0 auto;
      padding: 25px;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    .header {
      text-align: center;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 2px solid #f0f0f0;
    }
    .header h1 {
      margin: 0;
      color: #2c3e50;
      font-size: 28px;
    }
    .header p {
      color: #7f8c8d;
      margin: 5px 0 0;
    }
    .decision-box {
      padding: 20px;
      margin: 25px 0;
      border-radius: 8px;
      text-align: center;
      background-color: #FFF8E1;
      border-left: 5px solid #FFA500;
      box-shadow: 0 3px 6px rgba(0,0,0,0.1);
    }
    .decision {
      font-size: 28px;
      font-weight: bold;
      color: #FF8C00;
      margin: 0 0 10px;
    }
    .summary {
      font-size: 16px;
      color: #555;
      margin: 0;
    }
    .section {
      margin: 30px 0;
    }
    .section-title {
      font-size: 20px;
      color: #2c3e50;
      margin: 0 0 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #ecf0f1;
    }
    .justification {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 6px;
      font-size: 15px;
      color: #555;
      line-height: 1.6;
    }
    .footer {
      margin-top: 40px;
      padding: 15px;
      text-align: center;
      background-color: #1a365d;
      color: #fff;
      border-radius: 6px;
    }
    .footer p {
      margin: 5px 0;
      font-size: 14px;
    }
    .footer a {
      color: #fff;
      text-decoration: none;
    }
    .next-analysis {
      background-color: #e8f5e9;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      text-align: center;
      color: #2e7d32;
    }
  `;
}

/**
 * Generate the header section
 * @param {Date} analysisTime - Analysis time
 * @returns {String} Header HTML
 */
function generateHeader(analysisTime) {
  const formattedDate = formatDate(analysisTime);
  return `
  <div class="header">
    <h1>Market Pulse Daily</h1>
    <p>Generated on ${formattedDate}</p>
  </div>
  `;
}

/**
 * Generate the decision section
 * @param {Object} analysis - Analysis data
 * @returns {String} Decision section HTML
 */
function generateDecisionSection(analysis) {
  return `
  <div class="decision-box">
    <div class="decision">${analysis.decision}</div>
    <p class="summary">${analysis.summary}</p>
  </div>
  `;
}

/**
 * Generate the next analysis section
 * @param {Date} nextAnalysisTime - Next analysis time
 * @returns {String} Next analysis section HTML
 */
function generateNextAnalysisSection(nextAnalysisTime) {
  const formattedNextDate = formatDate(nextAnalysisTime);
  return `
  <div class="next-analysis">
    <p>Next analysis scheduled for: ${formattedNextDate}</p>
  </div>
  `;
}

/**
 * Generate the footer section
 * @returns {String} Footer HTML
 */
function generateFooter() {
  const year = new Date().getFullYear();
  return `
  <div class="footer">
    <p>Market Pulse Daily - Professional Trading Insights</p>
    <p>&copy; ${year} Market Pulse Daily</p>
  </div>
  `;
}

module.exports = {
  formatDate,
  generateStyles,
  generateHeader,
  generateDecisionSection,
  generateNextAnalysisSection,
  generateFooter
};
