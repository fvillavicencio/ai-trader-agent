/**
 * Generates the complete HTML email template for trading analysis
 * 
 * @param {String} analysisTime - Formatted analysis time
 * @param {String} sentimentHtml - HTML for sentiment section
 * @param {String} marketIndicatorsHtml - HTML for market indicators section
 * @param {String} fundamentalMetricsHtml - HTML for fundamental metrics section
 * @param {String} macroeconomicFactorsHtml - HTML for macroeconomic factors section
 * @param {String} geopoliticalRisksHtml - HTML for geopolitical risks section
 * @param {Object} analysisResult - The complete analysis result object
 * @param {Boolean} isTest - Whether this is a test email
 * @return {String} Complete HTML email template
 */
function generateHTML(
  analysisTime,
  sentimentHtml,
  marketIndicatorsHtml,
  fundamentalMetricsHtml,
  macroeconomicFactorsHtml,
  geopoliticalRisksHtml,
  analysisResult,
  isTest
) {
  try {
    // Retrieve newsletter name from Script Properties, defaulting to 'Market Pulse Daily'
    let newsletterName = 'Market Pulse Daily';
    let props;
    try {
      props = PropertiesService.getScriptProperties();
      const propName = props.getProperty('NEWSLETTER_NAME');
      if (propName && propName.trim() !== '') {
        newsletterName = propName.trim();
      }
    } catch (e) {
      // fallback to default
    }
    // Extract data from analysis result
    const analysis = analysisResult.analysis || {};
    const decision = (analysisResult.decision || 'Watch for Better Price Action').toString();
    const justification = analysisResult.justification || '';
    const summary = analysisResult.summary || '';
    const timestamp = analysisResult.timestamp || new Date().toISOString();

    // Decision color/icon logic (from GenerateHTML.gs)
    let decisionColor = '#757575'; // Default gray
    let decisionIcon = '⚠️'; // Default warning icon
    if (decision.toLowerCase().includes('buy')) {
      decisionColor = '#4caf50'; // Green
      decisionIcon = '&#8593;'; // Up arrow
    } else if (decision.toLowerCase().includes('sell')) {
      decisionColor = '#f44336'; // Red
      decisionIcon = '&#8595;'; // Down arrow
    } else if (decision.toLowerCase().includes('hold')) {
      decisionColor = '#ff9800'; // Orange
      decisionIcon = '&#8594;'; // Right arrow
    } else if (decision.toLowerCase().includes('watch')) {
      decisionColor = '#FFA500'; // Orange/Amber
      decisionIcon = '⚠️';
    }

    // --- Start full HTML document ---
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${newsletterName} - ${isTest ? 'Test' : 'Analysis'}</title>
      <style>
        :root {
          --base-font-size: 14px;
          --spacing-base: 1rem;
          --spacing-small: 0.5rem;
        }
        body {
          font-size: var(--base-font-size);
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 1040px;
          margin: 0 auto;
          padding: var(--spacing-base);
          width: 100%;
          box-sizing: border-box;
        }
        .section, .card, .stock-card, .indices-table, .sector-table, .futures-table, .volatility-table, .events-table, .yields-table {
          width: 100%;
          box-sizing: border-box;
          padding: var(--spacing-base);
          margin-bottom: var(--spacing-base);
        }
        .label-col {
          flex: 0 1 auto;
          min-width: 0;
          font-weight: bold;
        }
        .row, .flex-row {
          display: flex;
          flex-direction: row;
          gap: var(--spacing-base);
        }
        .stock-cards-container {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-base);
        }
        .stock-card {
          flex: 1 1 48%;
          min-width: 260px;
          max-width: 48%;
        }
        .decision-banner {
          font-size: 1rem;
        }
        .card-title, .title {
          font-size: 1.2rem;
        }
        .small-text {
          font-size: 0.85rem;
        }
        @media (max-width: 800px)  { :root { --base-font-size: 12px; } }
        @media (min-width: 1200px) { :root { --base-font-size: 16px; } }
        @media (max-width: 600px) {
          .index-card > div {font-size: 1.05rem !important; text-align: left !important;}
          .container { padding: var(--spacing-small) !important; }
          .section, .card, .indices-table, .sector-table, .futures-table, .volatility-table, .events-table, .yields-table { padding: var(--spacing-small) !important; margin-bottom: var(--spacing-small) !important; }
          .footer, .decision-banner { font-size: 0.7rem !important; }
          .flex-row, .row { flex-direction: column !important; gap: var(--spacing-small) !important; }
          .label-col { width: 100% !important; min-width: 0 !important; }
          .stock-cards-container { flex-direction: column !important; gap: var(--spacing-small) !important; }
          .stock-card { min-width: 0 !important; max-width: 100% !important; width: 100% !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1 class="title">${newsletterName} - ${isTest ? 'Test Analysis' : 'Analysis'}</h1>
          <div class="subtitle">As of ${analysisTime}</div>
          ${isTest ? '<div style="color: #f44336; font-weight: bold;">TEST EMAIL - NOT ACTUAL TRADING ADVICE</div>' : ''}
        </div>
        <!-- Decision Box -->
        <div class="decision-banner" style="background-color: #FFF8E1; border-left: 5px solid ${decisionColor}; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem 1rem; border-radius: 1rem; margin: 1.5rem 0;">
          <div class="decision-text" style="color: ${decisionColor}; font-weight: bold; text-align: center; font-size: clamp(2rem, 6vw, 3.5rem); line-height: 1.1; display: flex; align-items: center; justify-content: center; width: 100%;" id="decision">
            <span style="margin-right: 10px;">${decisionIcon}</span>${decision}
          </div>
          <div style="font-size: 16px; color: #555; margin-top: 8px; text-align: center;" id="decision-summary">${summary || 'No summary available.'}</div>
        </div>
        <!-- Justification Section -->
        <div class="section">
          <h2>Justification</h2>
          <div style="line-height: 1.6; color: #444; font-size: 1.1em;" id="justification-section">${justification || 'No justification provided.'}</div>
        </div>
        ${sentimentHtml}
        ${marketIndicatorsHtml}
        ${fundamentalMetricsHtml}
        ${macroeconomicFactorsHtml}
        ${geopoliticalRisksHtml}
        <div class="footer" style="background-color: #1a365d;">
          <div style="font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 10px;">${isTest ? 'This is a test email. ' : ''}${newsletterName} - Actionable Trading Insights</div>
          <div style="font-size: 12px; color: rgba(255,255,255,0.9); margin-bottom: 20px;">&copy; ${new Date().getFullYear()} ${newsletterName}. All rights reserved.</div>
          <div class="disclaimer" style="color: rgba(255,255,255,0.9);">
            Disclaimer: The information provided in this report is for general informational purposes only. It is not intended to serve as financial, investment, or trading advice. The data presented may not be accurate, complete, or current, and should not be relied upon as the sole basis for making any trading or investment decisions. Neither the publisher nor any of its affiliates assumes any liability for any losses or damages arising from the use or misinterpretation of this information.
          </div>
        </div>
      </div>
    </body>
    </html>`;
    Logger.log('Generated HTML:\n' + html);
    return html;
  } catch (error) {
    Logger.log('Error in generateHTML: ' + error);
    throw error;
  }
}

/**
 * Generates the complete HTML email template for trading analysis
 * 
 * @param {Object} analysisResult - The complete analysis result object
 * @param {Boolean} isTest - Whether this is a test email
 * @return {String} Complete HTML email template
 */
function generateEmailTemplate(analysisResult, isTest = false) {
  try {
    // Retrieve newsletter name from Script Properties, defaulting to 'Market Pulse Daily'
    let newsletterName = 'Market Pulse Daily';
    try {
      const props = PropertiesService.getScriptProperties();
      const propName = props.getProperty('NEWSLETTER_NAME');
      if (propName && propName.trim() !== '') {
        newsletterName = propName.trim();
      }
    } catch (e) {
      // fallback to default
    }
    // Compose email subject
    const emailSubject = `${newsletterName} - ${analysisResult.decision}`;
    
    // Extract data from analysis result
    const analysis = analysisResult.analysis || {};
    const analysisTime = analysisResult.timestamp ? new Date(analysisResult.timestamp) : new Date();
    const formattedAnalysisTime = formatDate(analysisTime);
    
    // Generate the sentiment section HTML
    const sentimentHtml = generateMarketSentimentSection(analysis);
    // Generate the market indicators section HTML
    const marketIndicatorsHtml = generateMarketIndicatorsSection(analysis);
    // Generate the fundamental metrics section HTML
    const fundamentalMetricsHtml = generateFundamentalMetricsSection(analysis);
    // Generate the macroeconomic factors section HTML
    const macroeconomicFactorsHtml = generateMacroeconomicFactorsSection(analysis);
    // Generate the geopolitical risks section HTML
    const geopoliticalRisksHtml = generateGeopoliticalRisksSection(analysis);
    return generateHTML(formattedAnalysisTime, sentimentHtml, marketIndicatorsHtml, fundamentalMetricsHtml, macroeconomicFactorsHtml, geopoliticalRisksHtml, analysisResult, isTest);
  } catch (error) {
    Logger.log('Error in generateEmailTemplate: ' + error.toString());
    throw error;
  }
}