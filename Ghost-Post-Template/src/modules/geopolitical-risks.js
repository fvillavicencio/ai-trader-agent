/**
 * Geopolitical Risks Module
 * Generates the Geopolitical Risks section of the Ghost post
 */

const { addHeading, addHTML, addDivider } = require('../utils/mobiledoc-helpers');

/**
 * Adds the Geopolitical Risks section to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing geopolitical risks information
 */
const addGeopoliticalRisks = (mobiledoc, data) => {
  if (!data.geopoliticalRisks) return;
  
  addHeading(mobiledoc, 'Geopolitical Risks', 2);
  
  const geopoliticalRisksHtml = `
    <div class="market-pulse-section geopolitical-risks-container">
      <!-- Global Overview -->
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
        <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 5px;">Global Overview</div>
        <div>${data.geopoliticalRisks.overview || 'Global geopolitical risk level is currently High geopolitical tensions with potential market impacts.'}</div>
      </div>
      
      <!-- Individual Risk Items -->
      ${data.geopoliticalRisks.risks ? data.geopoliticalRisks.risks.map(risk => {
        // Determine risk color based on severity
        let riskColor = '#f87171'; // Default High (red)
        if (risk.severity === 'Severe') {
          riskColor = '#9f1239'; // Burgundy for Severe
        } else if (risk.severity === 'Medium') {
          riskColor = '#f59e0b'; // Orange for Medium
        } else if (risk.severity === 'Low') {
          riskColor = '#10b981'; // Green for Low
        }
        
        return `
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="flex: 1;">
              <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 10px;">${risk.title}</div>
              <div style="margin-bottom: 10px;">${risk.description}</div>
              <div style="color: #64748b; font-size: 0.9rem;">
                Region: ${risk.region} • Source: <a href="${risk.sourceUrl || '#'}" target="_blank">${risk.source}</a>
              </div>
            </div>
            <div style="background-color: ${riskColor}; color: white; padding: 15px; border-radius: 8px; min-width: 100px; text-align: center; font-weight: bold; margin-left: 15px;">
              ${risk.severity}
            </div>
          </div>
        `;
      }).join('') : ''}
      
      <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: right;">
        Source: <a href="${data.geopoliticalRisks.sourceUrl || '#'}" target="_blank">${data.geopoliticalRisks.source || 'Global Risk Assessment'}</a>
        ${data.geopoliticalRisks.asOf ? `<br>As of: ${data.geopoliticalRisks.asOf}` : ''}
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, geopoliticalRisksHtml);
  addDivider(mobiledoc);
};

module.exports = { addGeopoliticalRisks };
