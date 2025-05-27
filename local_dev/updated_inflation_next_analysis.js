/**
 * Generate the inflation section matching the style from the images
 * @param {Object} inflation - Inflation data
 * @returns {String} Inflation section HTML
 */
function generateInflationSection(inflation) {
  if (!inflation || !inflation.cpi || !inflation.pce) {
    return '';
  }
  
  // CPI data
  const cpiHeadline = inflation.cpi.headline !== undefined ? `${inflation.cpi.headline}%` : 'N/A';
  const cpiCore = inflation.cpi.core !== undefined ? `${inflation.cpi.core}%` : 'N/A';
  
  // PCE data
  const pceHeadline = inflation.pce.headline !== undefined ? `${inflation.pce.headline}%` : 'N/A';
  const pceCore = inflation.pce.core !== undefined ? `${inflation.pce.core}%` : 'N/A';
  
  // Generate source information
  const sourceInfo = inflation.source 
    ? `<div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
         Source: ${inflation.source} | Last updated: ${inflation.lastUpdated || 'N/A'}
       </div>`
    : '';
  
  // Define colors
  const cpiColor = '#3498db';
  const pceColor = '#e67e22';
  
  // Generate inflation metrics HTML
  const inflationMetricsHtml = `
    <div style="margin-bottom: 20px;">
      <div style="font-weight: bold; margin-bottom: 10px;">Inflation Metrics</div>
      <div style="display: flex; margin-bottom: 15px;">
        <!-- CPI Card -->
        <div style="flex: 1; margin-right: 5px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; padding: 8px 0; font-weight: bold; background-color: ${cpiColor}; color: white;">CPI</div>
          <div style="padding: 10px; text-align: center; background-color: white; border: 1px solid ${cpiColor}; border-top: none; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
            <div style="display: flex; justify-content: space-around;">
              <div>
                <div style="color: #555; font-size: 13px; margin-bottom: 2px;">Headline</div>
                <div style="color: #2c3e50; font-weight: bold; font-size: 20px;">${cpiHeadline}</div>
              </div>
              <div>
                <div style="color: #555; font-size: 13px; margin-bottom: 2px;">Core</div>
                <div style="color: #2c3e50; font-weight: bold; font-size: 20px;">${cpiCore}</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- PCE Card -->
        <div style="flex: 1; margin-left: 5px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; padding: 8px 0; font-weight: bold; background-color: ${pceColor}; color: white;">PCE</div>
          <div style="padding: 10px; text-align: center; background-color: white; border: 1px solid ${pceColor}; border-top: none; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
            <div style="display: flex; justify-content: space-around;">
              <div>
                <div style="color: #555; font-size: 13px; margin-bottom: 2px;">Headline</div>
                <div style="color: #2c3e50; font-weight: bold; font-size: 20px;">${pceHeadline}</div>
              </div>
              <div>
                <div style="color: #555; font-size: 13px; margin-bottom: 2px;">Core</div>
                <div style="color: #2c3e50; font-weight: bold; font-size: 20px;">${pceCore}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${sourceInfo}
    </div>
  `;
  
  // Generate inflation trend analysis HTML
  const trendAnalysisHtml = generateInflationTrendAnalysis(inflation);
  
  return `
    <div>
      ${inflationMetricsHtml}
      ${trendAnalysisHtml}
    </div>
  `;
}

/**
 * Generate the next analysis section matching the style from image 3
 * @param {Date} nextAnalysisTime - Next analysis time
 * @returns {String} Next analysis section HTML
 */
function generateNextAnalysisSection(nextAnalysisTime) {
  // Format the next analysis time
  const options = { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  };
  
  const formattedDate = nextAnalysisTime.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  const formattedTime = nextAnalysisTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
    timeZoneName: 'short'
  });
  
  return `
    <div style="background-color: #f8f9fa; padding: 12px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #2196F3; text-align: center;">
      <div style="font-weight: bold; margin-bottom: 3px; font-size: 14px;">Next analysis scheduled for:</div>
      <div style="font-size: 13px;">${formattedDate} at ${formattedTime}</div>
    </div>
  `;
}

/**
 * Helper function to add percentage sign if not already present
 * @param {String} value - The value to check
 * @returns {String} Value with percentage sign
 */
function addPercentageIfNeeded(value) {
  if (!value) return 'N/A';
  
  // If value is already a string and contains %, return as is
  if (typeof value === 'string' && value.includes('%')) {
    return value;
  }
  
  // Otherwise add % sign
  return `${value}%`;
}

/**
 * Generate inflation trend analysis HTML
 * @param {Object} inflation - Inflation data
 * @returns {String} Inflation trend analysis HTML
 */
function generateInflationTrendAnalysis(inflation) {
  // Generate inflation trend analysis in the style from image 2
  const trendColor = '#4CAF50'; // Green color for the left border
  const trendHtml = `
    <div style="display: flex; margin-bottom: 15px;">
      <div style="flex: 1; background-color: #f1f8e9; padding: 15px; border-radius: 4px; margin-right: 10px; border-left: 4px solid ${trendColor};">
        <div style="font-weight: bold; color: ${trendColor}; margin-bottom: 5px;">Inflation Trend Analysis</div>
        <div style="color: #333;">${inflation.trend || 'Increasing'}</div>
      </div>
      
      <div style="flex: 1; padding: 15px; background-color: #f8f9fa; border-radius: 4px; margin-right: 10px;">
        <div style="font-weight: bold; margin-bottom: 5px;">Outlook</div>
        <div style="color: #555; font-size: 14px;">${inflation.outlook || 'Moderating toward the Fed\'s target, suggesting a balanced approach to monetary policy.'}</div>
      </div>
      
      <div style="flex: 1; padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
        <div style="font-weight: bold; margin-bottom: 5px;">Market Impact</div>
        <div style="color: #555; font-size: 14px;">${inflation.marketImpact || 'Inflation data may influence Fed\'s future rate decisions.'}</div>
      </div>
    </div>
  `;
  
  return trendHtml;
}

module.exports = {
  generateInflationSection,
  generateNextAnalysisSection
};
