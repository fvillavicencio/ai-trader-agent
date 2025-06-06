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
  if (!riskLevel || typeof riskLevel !== 'string') return '#1a365d'; // Default dark blue
  
  const level = riskLevel.toLowerCase();
  if (level.includes('severe')) return '#800020'; // Burgundy for Severe
  if (level.includes('high')) return '#c53030'; // Red for High
  if (level.includes('medium') || level.includes('moderate')) return '#dd6b20'; // Orange for Medium
  if (level.includes('low')) return '#2f855a'; // Green for Low
  
  return '#1a365d'; // Default dark blue
};

/**
 * Converts a numeric impact level (1-10) to a descriptive string
 * @param {number|string} impactLevel - The impact level (1-10 or already a string)
 * @returns {string} - The descriptive impact level (Severe, High, Medium, Low)
 */
const convertImpactLevelToString = (impactLevel) => {
  // If it's already a string that matches one of our levels, return it
  if (typeof impactLevel === 'string') {
    const level = impactLevel.toLowerCase();
    if (level.includes('severe')) return 'Severe';
    if (level.includes('high')) return 'High';
    if (level.includes('medium') || level.includes('moderate')) return 'Medium';
    if (level.includes('low')) return 'Low';
  }
  
  // Convert numeric value to string format
  const impact = parseFloat(impactLevel) || 5;
  if (impact >= 8) return 'Severe';
  if (impact >= 6) return 'High';
  if (impact >= 4) return 'Medium';
  return 'Low';
};

/**
 * Get the risk level color based on the impact level
 * @param {string} impactLevel - The impact level of the risk
 * @returns {string} - The color code
 */
const getRiskLevelColor = (impactLevel) => {
  if (!impactLevel) return '#f44336'; // Default red
  
  const level = typeof impactLevel === 'string' ? impactLevel.toLowerCase() : '';
  if (level.includes('severe')) return '#800020'; // Burgundy for Severe
  if (level.includes('high')) return '#f44336'; // Red for High
  if (level.includes('medium') || level.includes('moderate')) return '#ff9800'; // Orange for Medium
  if (level.includes('low')) return '#4caf50'; // Green for Low
  
  // If it's a number, convert it and get the color
  if (!isNaN(parseFloat(impactLevel))) {
    const stringLevel = convertImpactLevelToString(impactLevel);
    return getRiskLevelColor(stringLevel);
  }
  
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
    const riskLevels = risks.map(risk => {
      const impactLevel = risk.impactLevel || '';
      return typeof impactLevel === 'string' ? impactLevel : String(impactLevel);
    });
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
            <div style="margin: 0; font-size: 2rem; font-weight: bold; color: white;">Geopolitical Risks</div>
            <div class="collapsible-icon" style="font-size: 14px; color: white;">▼</div>
          </div>
          <div style="margin-top: 10px; line-height: 1.5; color: white; font-size: 1.2rem; font-weight: normal; text-align: center; width: 100%;">
            ${globalOverview}
          </div>
        </div>
        
        <div class="collapsible-content" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out;">
          <!-- Risk Items -->
          ${risks.map(risk => {
            // Convert impact level to string if it's a number
            const displayImpactLevel = convertImpactLevelToString(risk.impactLevel);
            const riskColor = getRiskLevelColor(displayImpactLevel);
            return `
              <div style="display: flex; margin-top: 15px; margin-bottom: 15px;">
                <div style="flex: 1; background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-right: 10px;">
                  <div style="font-weight: bold; margin-bottom: 5px;">${risk.name}</div>
                  <div style="color: #555; margin-bottom: 5px;">${risk.description}</div>
                  <div style="font-size: 10px; color: #757575;">
                    Region: ${risk.region} • Source: <a href="${risk.url || risk.sourceUrl || '#'}" target="_blank" style="color: #3182ce; text-decoration: none;">${risk.source}</a>
                  </div>
                </div>
                <div style="width: 80px; text-align: center; background-color: ${riskColor}; color: white; border-radius: 6px; padding: 8px 0; display: flex; align-items: center; justify-content: center;">
                  <div style="font-size: 14px; font-weight: bold; line-height: 1.2;">${displayImpactLevel}</div>
                </div>
              </div>
            `;
          }).join('')}
          
          <!-- Source Attribution -->
          <div style="font-size: 0.8rem; color: #718096; margin-top: 15px; text-align: right;">
            ${lastUpdated ? `As of ${lastUpdated}` : ''}
          </div>
        </div>
      </div>
    </div>
    
    <script>
      // Add click event to toggle collapsible sections
      document.addEventListener('DOMContentLoaded', function() {
        const headers = document.querySelectorAll('.collapsible-header');
        headers.forEach(header => {
          header.addEventListener('click', function() {
            const content = this.nextElementSibling;
            const icon = this.querySelector('.collapsible-icon');
            
            // Toggle display
            if (content.style.maxHeight === '0px' || content.style.maxHeight === '') {
              content.style.maxHeight = '1000px';
              icon.style.transform = 'rotate(180deg)';
            } else {
              content.style.maxHeight = '0px';
              icon.style.transform = 'rotate(0deg)';
            }
          });
        });
      });
    </script>
  `;
  
  addHTML(mobiledoc, geopoliticalRisksHtml);
};

module.exports = { addGeopoliticalRisks };
