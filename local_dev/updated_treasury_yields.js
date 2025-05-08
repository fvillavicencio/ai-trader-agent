/**
 * Generate the treasury yields section with all 5 yields in a single row
 * @param {Object} treasuryYields - Treasury yields data
 * @returns {String} Treasury yields section HTML
 */
function generateTreasuryYieldsSection(treasuryYields) {
  if (!treasuryYields) {
    return '';
  }
  
  // Define all yields to display
  const yields = [
    { term: '3-Month', value: treasuryYields.threeMonth },
    { term: '2-Year', value: treasuryYields.twoYear },
    { term: '5-Year', value: treasuryYields.fiveYear || treasuryYields.fiveYr || 4.1 }, // Add fallback value
    { term: '10-Year', value: treasuryYields.tenYear },
    { term: '30-Year', value: treasuryYields.thirtyYear }
  ];
  
  // Generate HTML for each yield
  const yieldsHtml = yields.map(yld => {
    const value = yld.value !== undefined ? yld.value : 'N/A';
    return `
      <div style="flex: 1; text-align: center; padding: 0 10px; position: relative;">
        <div style="color: #666; font-size: 14px; margin-bottom: 8px;">${yld.term}</div>
        <div style="color: #4CAF50; font-weight: bold; font-size: 20px;">${value}</div>
        <div style="position: absolute; top: 0; bottom: 0; left: 0; width: 3px; background-color: #4CAF50;"></div>
      </div>
    `;
  }).join('');
  
  // Generate yield curve information
  const yieldCurveHtml = treasuryYields.yieldCurve ? `
    <div style="margin-top: 15px; padding-left: 15px; border-left: 4px solid #FFA500;">
      <div style="font-weight: bold; margin-bottom: 5px;">Yield Curve: ${treasuryYields.yieldCurve}</div>
      <div style="color: #555; font-size: 14px;">${treasuryYields.implications || 'Market uncertainty about future economic conditions.'}</div>
    </div>
  ` : '';
  
  // Generate source information
  const sourceInfo = treasuryYields.source ? `
    <div style="font-size: 12px; color: #888; margin-top: 10px; text-align: right;">
      Source: ${treasuryYields.source} | Last updated: ${treasuryYields.lastUpdated || 'N/A'}
    </div>
  ` : '';
  
  return `
    <div style="margin-bottom: 20px;">
      <div style="font-weight: bold; margin-bottom: 10px;">Treasury Yields</div>
      <div style="display: flex; background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
        ${yieldsHtml}
      </div>
      ${yieldCurveHtml}
      ${sourceInfo}
    </div>
  `;
}

module.exports = {
  generateTreasuryYieldsSection
};
