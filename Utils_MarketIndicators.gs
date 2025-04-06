/**
 * Generates the market indicators section HTML
 * 
 * @param {Object} analysis - The analysis data
 * @return {String} HTML for the market indicators section
 */
function generateMarketIndicatorsSection(analysis) {
  try {
    if (!analysis.marketIndicators) {
      return `
        <div class="section">
          <h2>Market Indicators</h2>
          <p>No market indicators data available</p>
        </div>
      `;
    }

    return `
      <div class="section">
        <h2>Market Indicators</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 15px;">
          ${Object.entries(analysis.marketIndicators).map(([key, value]) => `
            <div style="flex: 1 1 calc(50% - 15px); min-width: 200px; padding: 15px; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-weight: 500; margin-bottom: 5px;">${key}</div>
              <div style="font-size: 18px; font-weight: bold;">${value}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (error) {
    Logger.log('Error in generateMarketIndicatorsSection: ' + error);
    return `
      <div class="section">
        <h2>Market Indicators</h2>
        <p>Error generating market indicators section: ${error}</p>
      </div>
    `;
  }
}
