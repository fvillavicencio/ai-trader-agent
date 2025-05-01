/**
 * Geopolitical Risks Module
 * Generates the Geopolitical Risks section of the Ghost post
 */

const { addHeading, addHTML, addDivider } = require('../utils/mobiledoc-helpers');

/**
 * Get the background color based on the overall geopolitical risk level
 * @param {string} riskLevel - The overall risk level
 * @returns {string} - The background color code
 */
const getBackgroundColor = (riskLevel) => {
  if (!riskLevel) return '#1a365d'; // Default dark blue
  
  const level = riskLevel.toLowerCase();
  if (level.includes('severe')) return '#800020'; // Burgundy for Severe
  if (level.includes('high')) return '#c53030'; // Red for High
  if (level.includes('medium') || level.includes('moderate')) return '#dd6b20'; // Orange for Medium
  if (level.includes('low')) return '#2f855a'; // Green for Low
  
  return '#1a365d'; // Default dark blue
};

/**
 * Get the risk level color based on the impact level
 * @param {string} impactLevel - The impact level of the risk
 * @returns {string} - The color code
 */
const getRiskLevelColor = (impactLevel) => {
  if (!impactLevel) return '#f44336'; // Default red
  
  const level = impactLevel.toLowerCase();
  if (level.includes('severe')) return '#800020'; // Burgundy for Severe
  if (level.includes('high')) return '#f44336'; // Red for High
  if (level.includes('medium') || level.includes('moderate')) return '#ff9800'; // Orange for Medium
  if (level.includes('low')) return '#4caf50'; // Green for Low
  
  return '#f44336'; // Default red
};

/**
 * Adds the Geopolitical Risks section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing geopolitical risks information
 */
const addGeopoliticalRisks = (mobiledoc, data) => {
  // Check if geopolitical risks data exists in the expected location
  const geopoliticalData = data.macroeconomicFactors?.geopoliticalRisks;
  
  if (!geopoliticalData) {
    return;
  }
  
  // Extract data
  const risks = geopoliticalData.risks || [];
  const globalOverview = geopoliticalData.global || 'Geopolitical risks are impacting market stability.';
  const source = geopoliticalData.source || 'Global Risk Assessment';
  const sourceUrl = geopoliticalData.sourceUrl || '#';
  const lastUpdated = geopoliticalData.lastUpdated || '';
  
  // Determine overall risk level from the risks array
  let overallRiskLevel = 'High'; // Default
  if (risks.length > 0) {
    // Count risk levels
    const riskLevels = risks.map(risk => risk.impactLevel || '');
    if (riskLevels.some(level => level.toLowerCase().includes('severe'))) {
      overallRiskLevel = 'Severe';
    } else if (riskLevels.every(level => level.toLowerCase().includes('low'))) {
      overallRiskLevel = 'Low';
    } else if (riskLevels.every(level => level.toLowerCase().includes('medium') || level.toLowerCase().includes('moderate'))) {
      overallRiskLevel = 'Moderate';
    }
  }
  
  // Get background color based on overall risk level
  const bgColor = getBackgroundColor(overallRiskLevel);
  
  // Create the HTML for the section
  const geopoliticalRisksHtml = `
    <div class="market-pulse-section geopolitical-risks-container" style="margin: 0; padding: 0; margin-top: 20px;">
      <div class="collapsible-section" data-section="geopolitical-risks">
        <div class="collapsible-header" style="background-color: ${bgColor}; padding: 15px; border-radius: 8px; display: flex; flex-direction: column; align-items: flex-start;">
          <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <h2 style="margin: 0; font-size: 1.5rem; font-weight: bold; color: white;">Geopolitical Risks</h2>
            <div class="collapsible-icon" style="font-size: 14px; color: white;">▼</div>
          </div>
          <div style="margin-top: 10px; line-height: 1.5; color: white; font-size: 1rem; font-weight: normal; text-align: center; width: 100%;">
            ${globalOverview}
          </div>
        </div>
        
        <div class="collapsible-content">
          <!-- Global Overview -->
          <div style="margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #ff9800;">
            <div style="font-weight: bold; margin-bottom: 5px;">Global Overview</div>
            <div style="color: #333;">${globalOverview}</div>
          </div>
          
          <!-- Risk Items -->
          ${risks.map(risk => {
            const riskColor = getRiskLevelColor(risk.impactLevel);
            return `
              <div style="display: flex; margin-top: 15px; margin-bottom: 15px;">
                <div style="flex: 1; background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-right: 10px;">
                  <div style="font-weight: bold; margin-bottom: 5px;">${risk.name}</div>
                  <div style="color: #555; margin-bottom: 5px;">${risk.description}</div>
                  <div style="font-size: 10px; color: #757575;">
                    Region: ${risk.region} • Source: ${risk.source}
                  </div>
                </div>
                <div style="width: 80px; text-align: center; background-color: ${riskColor}; color: white; border-radius: 6px; padding: 8px 0; display: flex; align-items: center; justify-content: center;">
                  <div style="font-size: 14px; font-weight: bold; line-height: 1.2;">${risk.impactLevel}</div>
                </div>
              </div>
            `;
          }).join('')}
          
          <!-- Source Attribution -->
          <div style="font-size: 0.8rem; color: #718096; margin-top: 15px; text-align: right;">
            Source: <a href="${sourceUrl}" target="_blank" style="color: #3182ce; text-decoration: none;">${source}</a>${lastUpdated ? ` as of ${lastUpdated}` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, geopoliticalRisksHtml);
};

module.exports = { addGeopoliticalRisks };
