/**
 * Macroeconomic Factors Section Generator
 */

/**
 * Generate the macroeconomic factors section
 * @param {Object} analysis - The analysis data
 * @returns {String} HTML for the macroeconomic factors section
 */
function generateMacroeconomicFactorsSection(analysis) {
  const macroFactors = (analysis.analysis && analysis.analysis.macroeconomicFactors) || {};
  
  // Treasury Yields
  const treasuryYields = macroFactors.treasuryYields || {};
  const threeMonth = treasuryYields.threeMonth || 'N/A';
  const oneYear = treasuryYields.oneYear || 'N/A';
  const twoYear = treasuryYields.twoYear || 'N/A';
  const tenYear = treasuryYields.tenYear || 'N/A';
  const thirtyYear = treasuryYields.thirtyYear || 'N/A';
  const yieldCurve = treasuryYields.yieldCurve || 'N/A';
  const yieldImplications = treasuryYields.implications || 'N/A';
  const treasurySource = treasuryYields.source || 'N/A';
  const treasurySourceUrl = treasuryYields.sourceUrl || '#';
  const treasuryLastUpdated = treasuryYields.lastUpdated || 'N/A';
  
  // Fed Policy
  const fedPolicy = macroFactors.fedPolicy || {};
  const fedRate = fedPolicy.federalFundsRate || 'N/A';
  const forwardGuidance = fedPolicy.forwardGuidance || 'N/A';
  const fedSource = fedPolicy.source || 'N/A';
  const fedSourceUrl = fedPolicy.sourceUrl || '#';
  const fedLastUpdated = fedPolicy.lastUpdated || 'N/A';
  
  // Inflation
  const inflation = macroFactors.inflation || {};
  const cpi = inflation.cpi || {};
  const pce = inflation.pce || {};
  const cpiHeadline = cpi.headline || 'N/A';
  const cpiCore = cpi.core || 'N/A';
  const pceHeadline = pce.headline || 'N/A';
  const pceCore = pce.core || 'N/A';
  const inflationTrend = inflation.trend || 'N/A';
  const inflationOutlook = inflation.outlook || 'N/A';
  const inflationMarketImpact = inflation.marketImpact || 'N/A';
  const inflationSource = inflation.source || 'N/A';
  const inflationSourceUrl = inflation.sourceUrl || '#';
  const inflationLastUpdated = inflation.lastUpdated || 'N/A';
  
  // Geopolitical Risks
  const geopoliticalRisks = macroFactors.geopoliticalRisks || {};
  const globalRisks = geopoliticalRisks.global || 'No significant geopolitical risks reported.';
  const regions = geopoliticalRisks.regions || [];
  const geoSource = geopoliticalRisks.source || 'N/A';
  const geoSourceUrl = geopoliticalRisks.sourceUrl || '#';
  const geoLastUpdated = geopoliticalRisks.lastUpdated || 'N/A';
  
  // Generate HTML for geopolitical risks
  let regionsHtml = '';
  if (regions.length > 0) {
    regionsHtml = regions.map(region => {
      const regionName = region.region || 'Unknown Region';
      const risks = region.risks || [];
      
      if (risks.length === 0) {
        return '';
      }
      
      return `
      <div style="margin-bottom: 15px;">
        <h4 style="margin: 0 0 10px 0; font-size: 15px; color: #2c3e50;">${regionName}</h4>
        ${risks.map(risk => {
          const description = risk.description || 'No description available';
          const impactLevel = risk.impactLevel || 'Unknown';
          const impactColor = getImpactLevelColor(impactLevel);
          
          return `
          <div style="margin-bottom: 10px; padding: 10px; background-color: #f9f9f9; border-left: 4px solid ${impactColor}; border-radius: 0 4px 4px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
              <div style="font-size: 14px;">${description}</div>
              <div style="background-color: ${impactColor}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${impactLevel}</div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
    }).join('');
  }
  
  return `
  <div style="margin-bottom: 20px; padding: 15px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.12);">
    <h2 style="margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 1px solid #eaeaea; color: #2c3e50; font-size: 18px;">Macroeconomic Factors</h2>
    
    <!-- Treasury Yields -->
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #2c3e50;">Treasury Yields</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
        <div style="flex: 1; min-width: 100px; padding: 10px; background-color: #f5f7fa; border-radius: 6px; text-align: center;">
          <div style="font-size: 12px; color: #666;">3-Month</div>
          <div style="font-size: 16px; font-weight: 500;">${threeMonth}</div>
        </div>
        <div style="flex: 1; min-width: 100px; padding: 10px; background-color: #f5f7fa; border-radius: 6px; text-align: center;">
          <div style="font-size: 12px; color: #666;">1-Year</div>
          <div style="font-size: 16px; font-weight: 500;">${oneYear}</div>
        </div>
        <div style="flex: 1; min-width: 100px; padding: 10px; background-color: #f5f7fa; border-radius: 6px; text-align: center;">
          <div style="font-size: 12px; color: #666;">2-Year</div>
          <div style="font-size: 16px; font-weight: 500;">${twoYear}</div>
        </div>
        <div style="flex: 1; min-width: 100px; padding: 10px; background-color: #f5f7fa; border-radius: 6px; text-align: center;">
          <div style="font-size: 12px; color: #666;">10-Year</div>
          <div style="font-size: 16px; font-weight: 500;">${tenYear}</div>
        </div>
        <div style="flex: 1; min-width: 100px; padding: 10px; background-color: #f5f7fa; border-radius: 6px; text-align: center;">
          <div style="font-size: 12px; color: #666;">30-Year</div>
          <div style="font-size: 16px; font-weight: 500;">${thirtyYear}</div>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <div style="font-weight: 500; color: #2c3e50;">Yield Curve:</div>
        <div>${yieldCurve}</div>
      </div>
      <div style="padding: 10px; background-color: #f9f9f9; border-radius: 6px; font-size: 14px; color: #555; line-height: 1.4;">
        ${yieldImplications}
      </div>
      <div style="margin-top: 5px; font-size: 11px; color: #999; text-align: right;">
        Source: <a href="${treasurySourceUrl}" style="color: #3498db; text-decoration: none;">${treasurySource}</a> | Last updated: ${treasuryLastUpdated}
      </div>
    </div>
    
    <!-- Fed Policy -->
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #2c3e50;">Federal Reserve Policy</h3>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <div style="font-weight: 500; color: #2c3e50;">Federal Funds Rate:</div>
        <div style="font-size: 16px; font-weight: 500;">${fedRate}%</div>
      </div>
      <div style="padding: 10px; background-color: #f9f9f9; border-radius: 6px; font-size: 14px; color: #555; line-height: 1.4;">
        ${forwardGuidance}
      </div>
      <div style="margin-top: 5px; font-size: 11px; color: #999; text-align: right;">
        Source: <a href="${fedSourceUrl}" style="color: #3498db; text-decoration: none;">${fedSource}</a> | Last updated: ${fedLastUpdated}
      </div>
    </div>
    
    <!-- Inflation -->
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #2c3e50;">Inflation Metrics</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 15px;">
        <!-- CPI Card -->
        <div style="flex: 1; min-width: 250px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="padding: 10px; background-color: #f5f7fa; border-bottom: 1px solid #e0e0e0; font-weight: 500; color: #2c3e50;">
            Consumer Price Index (CPI)
          </div>
          <div style="padding: 15px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <div style="color: #666;">Headline:</div>
              <div style="font-weight: 500;">${cpiHeadline}%</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div style="color: #666;">Core:</div>
              <div style="font-weight: 500;">${cpiCore}%</div>
            </div>
          </div>
        </div>
        
        <!-- PCE Card -->
        <div style="flex: 1; min-width: 250px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="padding: 10px; background-color: #f5f7fa; border-bottom: 1px solid #e0e0e0; font-weight: 500; color: #2c3e50;">
            Personal Consumption Expenditures (PCE)
          </div>
          <div style="padding: 15px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <div style="color: #666;">Headline:</div>
              <div style="font-weight: 500;">${pceHeadline}%</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div style="color: #666;">Core:</div>
              <div style="font-weight: 500;">${pceCore}%</div>
            </div>
          </div>
        </div>
      </div>
      
      <div style="margin-bottom: 10px;">
        <div style="font-weight: 500; color: #2c3e50; margin-bottom: 5px;">Trend:</div>
        <div style="font-size: 14px; color: #555;">${inflationTrend}</div>
      </div>
      
      <div style="margin-bottom: 10px;">
        <div style="font-weight: 500; color: #2c3e50; margin-bottom: 5px;">Outlook:</div>
        <div style="font-size: 14px; color: #555;">${inflationOutlook}</div>
      </div>
      
      <div style="margin-bottom: 10px;">
        <div style="font-weight: 500; color: #2c3e50; margin-bottom: 5px;">Market Impact:</div>
        <div style="font-size: 14px; color: #555;">${inflationMarketImpact}</div>
      </div>
      
      <div style="margin-top: 5px; font-size: 11px; color: #999; text-align: right;">
        Source: <a href="${inflationSourceUrl}" style="color: #3498db; text-decoration: none;">${inflationSource}</a> | Last updated: ${inflationLastUpdated}
      </div>
    </div>
    
    <!-- Geopolitical Risks -->
    <div>
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #2c3e50;">Geopolitical Risks</h3>
      
      <div style="padding: 10px; background-color: #f9f9f9; border-left: 4px solid #1a365d; border-radius: 0 4px 4px 0; margin-bottom: 15px;">
        <div style="font-size: 14px; color: #555; line-height: 1.4;">${globalRisks}</div>
      </div>
      
      ${regionsHtml}
      
      <div style="margin-top: 5px; font-size: 11px; color: #999; text-align: right;">
        Source: <a href="${geoSourceUrl}" style="color: #3498db; text-decoration: none;">${geoSource}</a> | Last updated: ${geoLastUpdated}
      </div>
    </div>
  </div>`;
}

/**
 * Get the color for an impact level
 * @param {String} impactLevel - The impact level
 * @returns {String} The color for the impact level
 */
function getImpactLevelColor(impactLevel) {
  const impactLower = (impactLevel || '').toLowerCase();
  
  if (impactLower.includes('severe') || impactLower.includes('high')) {
    return '#f44336'; // Red
  } else if (impactLower.includes('moderate') || impactLower.includes('medium')) {
    return '#ff9800'; // Orange/Amber
  } else if (impactLower.includes('low') || impactLower.includes('minimal')) {
    return '#4caf50'; // Green
  } else {
    return '#757575'; // Gray (default)
  }
}

module.exports = generateMacroeconomicFactorsSection;
