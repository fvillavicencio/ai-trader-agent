// Generate the HTML ::content
function generateHTML(formattedAnalysisTime, sentimentHtml, marketIndicatorsHtml, fundamentalMetricsHtml, macroeconomicFactorsHtml, geopoliticalRisksHtml, analysisResult) {
    // Extract data from analysis result
    const props = PropertiesService.getScriptProperties();
    const decision = analysisResult.decision || 'No Decision';
    const analysis = analysisResult.analysis || {};
    const analysisTime = analysisResult.timestamp ? new Date(analysisResult.timestamp) : new Date();
    
    // Define colors based on decision
    let decisionColor = '#757575'; // Default gray
    let decisionIcon = ''; // Default warning icon
    
    // Set colors and icon based on decision
    if (decision.toLowerCase().includes('buy')) {
      decisionColor = '#4caf50'; // Green
      decisionIcon = '&#8593;'; // Up arrow using HTML entity
    } else if (decision.toLowerCase().includes('sell')) {
      decisionColor = '#f44336'; // Red
      decisionIcon = '&#8595;'; // Down arrow using HTML entity
    } else if (decision.toLowerCase().includes('hold')) {
      decisionColor = '#ff9800'; // Orange
      decisionIcon = '&#8594;'; // Right arrow using HTML entity
    } else if (decision.toLowerCase().includes('watch')) {
      decisionColor = '#FFA500'; // Orange/Amber
      decisionIcon = '⚠️';
    }
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>${props.getProperty('NEWSLETTER_NAME')}</title>
      <style>
        /* Base styles */
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          background-color: #f5f7fa;
          color: #333;
          line-height: 1.5;
          margin: 0;
          padding: 0;
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          width: 100%;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding: 0 10px;
        }
        
        .logo {
          margin-bottom: 15px;
          max-width: 100%;
          height: auto;
        }
        
        .title {
          font-size: 24px;
          font-weight: bold;
          color: #2c3e50;
          margin: 0;
          line-height: 1.2;
        }
        
        .subtitle {
          font-size: 14px;
          color: #7f8c8d;
          margin: 5px 0 0;
          line-height: 1.4;
        }
        
        .decision-banner {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          text-align: center;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          width: 100%;
        }
        
        .decision-text {
          font-size: 28px;
          font-weight: bold;
          margin: 0;
          line-height: 1.2;
        }
        
        .section {
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          width: 100%;
        }
        
        .section h2 {
          color: #333;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
          margin-top: 0;
          margin-bottom: 15px;
          text-align: center;
          font-size: 18px;
          line-height: 1.3;
        }
        
        .stock-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 15px;
          width: 100%;
        }
        
        .stock-card {
          display: flex;
          flex-direction: column;
          background: #fff;
          border-radius: 6px;
          padding: 15px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          width: 100%;
        }
        
        .footer {
          text-align: center;
          font-size: 12px;
          color: #95a5a6;
          margin-top: 30px;
          padding: 10px;
          background-color: #1a365d;
          color: white;
        }
        
        .disclaimer {
          font-size: 11px;
          color: #95a5a6;
          margin-top: 10px;
          text-align: center;
          line-height: 1.4;
        }
        
        /* Enhanced styles for fundamental metrics section */
        .subsection {
          margin-bottom: 20px;
          width: 100%;
        }
        
        .stocks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 15px;
          margin-top: 15px;
          width: 100%;
        }
        
        /* Mobile-specific styles */
        @media (max-width: 600px) {
          .container {
            padding: 15px;
            width: 100%;
          }
          
          .stock-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          
          .stocks-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          
          .stock-card {
            padding: 12px;
          }
          
          .decision-banner {
            padding: 15px;
          }
          
          .decision-text {
            font-size: 24px;
          }
          
          .title {
            font-size: 20px;
          }
          
          .section {
            padding: 15px;
          }
          
          .section h2 {
            font-size: 16px;
          }
          
          .header {
            padding: 0 5px;
          }
        }
        
        /* Print styles */
        @media print {
          .container {
            max-width: 100%;
            width: 100%;
          }
          
          .section {
            box-shadow: none;
          }
          
          .decision-banner {
            box-shadow: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="margin: 0; color: #2c3e50; font-size: 28px;">${props.getProperty('NEWSLETTER_NAME')}</h1>
          <p style="color: #7f8c8d; margin: 5px 0 0;">As of ${formattedAnalysisTime}</p>
          ${isTest ? '<p style="color: #f44336; font-weight: bold;">TEST EMAIL - NOT ACTUAL TRADING ADVICE</p>' : ''}
        </div>
        
        <!-- Decision Box -->
        <div style="padding: 20px; margin: 25px 0; border-radius: 8px; text-align: center; background-color: #FFF8E1; border-left: 5px solid ${decisionColor}; box-shadow: 0 3px 6px rgba(0,0,0,0.1);">
          <div style="font-size: 28px; font-weight: bold; color: ${decisionColor}; margin: 0 0 10px;">
            <span style="margin-right: 10px;">${decisionIcon}</span>${decision}
          </div>
          <p style="font-size: 16px; color: #555; margin: 0;">${analysisResult.summary || 'No summary available.'}</p>
        </div>
        
        <!-- Justification Section -->
        <div class="section">
          <h2>Justification</h2>
          <div style="line-height: 1.6; color: #444; font-size: 13px;">${analysisResult.justification || 'No justification provided.'}</div>
        </div>
        
        ${sentimentHtml}
        ${marketIndicatorsHtml}
        ${fundamentalMetricsHtml}
        ${macroeconomicFactorsHtml}
        ${geopoliticalRisksHtml}
        
        <div class="footer">
          <div style="font-size: 14px; margin-bottom: 10px;">${props.getProperty('NEWSLETTER_NAME')} - Professional Trading Insights</div>
          <div style="font-size: 12px; margin-bottom: 20px;">&copy; ${new Date().getFullYear()} ${ props.getProperty('NEWSLETTER_NAME')}. All rights reserved.</div>
          <div class="disclaimer" style="font-size: 12px; color: rgba(255,255,255,0.9);">
            The information provided in this report is for general informational purposes only. It is not intended to serve as financial, investment, or trading advice. The data presented may not be accurate, complete, or current, and should not be relied upon as the sole basis for making any trading or investment decisions. Neither the publisher nor any of its affiliates assumes any liability for any losses or damages arising from the use or misinterpretation of this information.
          </div>
        </div>
      </div>
    </body>
    </html>`;
    return html;
  } catch (error) {
    Logger.log('Error in generateHTML: ' + error.toString());
    throw error;
  }
}