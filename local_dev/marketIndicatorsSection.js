/**
 * Market Indicators Section Generator
 */

/**
 * Generate the market indicators section
 * @param {Object} analysis - The analysis data
 * @returns {String} HTML for the market indicators section
 */
function generateMarketIndicatorsSection(analysis) {
  const marketIndicators = (analysis.analysis && analysis.analysis.marketIndicators) || {};
  
  // Fear & Greed Index
  const fearGreedIndex = marketIndicators.fearGreedIndex || {};
  const fearGreedValue = fearGreedIndex.value || 'N/A';
  const fearGreedInterpretation = fearGreedIndex.interpretation || 'N/A';
  
  // VIX
  const vix = marketIndicators.vix || {};
  const vixValue = vix.value || 'N/A';
  const vixTrend = vix.trend || 'N/A';
  const vixAnalysis = vix.analysis || 'N/A';
  
  // Upcoming Events
  const upcomingEvents = marketIndicators.upcomingEvents || [];
  
  // Source information
  const source = marketIndicators.source || 'N/A';
  const sourceUrl = marketIndicators.sourceUrl || '#';
  const lastUpdated = marketIndicators.lastUpdated || 'N/A';
  
  // Generate upcoming events HTML
  let eventsHtml = '<p>No upcoming events</p>';
  if (upcomingEvents.length > 0) {
    eventsHtml = `
    <div style="margin-top: 15px;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd; color: #2c3e50;">Date</th>
            <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd; color: #2c3e50;">Event</th>
          </tr>
        </thead>
        <tbody>
          ${upcomingEvents.map(event => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${event.date || 'N/A'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${event.event || 'N/A'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
  }
  
  return `
  <div style="margin-bottom: 20px; padding: 15px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.12);">
    <h2 style="margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 1px solid #eaeaea; color: #2c3e50; font-size: 18px;">Market Indicators</h2>
    
    <div style="display: flex; flex-wrap: wrap; gap: 15px;">
      <!-- Fear & Greed Index -->
      <div style="flex: 1; min-width: 250px; padding: 15px; background-color: #f5f7fa; border-radius: 6px;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #2c3e50;">Fear & Greed Index</h3>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="font-size: 24px; font-weight: bold; color: ${getFearGreedColor(fearGreedInterpretation)};">${fearGreedValue}</div>
          <div style="background-color: ${getFearGreedColor(fearGreedInterpretation)}; color: white; padding: 5px 10px; border-radius: 4px; font-size: 14px;">${fearGreedInterpretation}</div>
        </div>
      </div>
      
      <!-- VIX -->
      <div style="flex: 1; min-width: 250px; padding: 15px; background-color: #f5f7fa; border-radius: 6px;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #2c3e50;">VIX (Volatility Index)</h3>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
          <div style="font-size: 24px; font-weight: bold;">${vixValue}</div>
          <div style="font-size: 14px; color: ${getVixTrendColor(vixTrend)};">${vixTrend}</div>
        </div>
        <div style="font-size: 14px; color: #555;">${vixAnalysis}</div>
      </div>
    </div>
    
    <!-- Upcoming Events -->
    <div style="margin-top: 20px;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #2c3e50;">Upcoming Economic Events</h3>
      ${eventsHtml}
    </div>
    
    <div style="margin-top: 15px; font-size: 12px; color: #777777; text-align: right;">
      Source: <a href="${sourceUrl}" style="color: #3498db; text-decoration: none;">${source}</a> | Last Updated: ${lastUpdated}
    </div>
  </div>`;
}

/**
 * Get the color for a Fear & Greed interpretation
 * @param {String} interpretation - The Fear & Greed interpretation
 * @returns {String} The color for the interpretation
 */
function getFearGreedColor(interpretation) {
  const interpretationLower = (interpretation || '').toLowerCase();
  
  if (interpretationLower.includes('extreme fear')) {
    return '#d32f2f'; // Deep Red
  } else if (interpretationLower.includes('fear')) {
    return '#f44336'; // Red
  } else if (interpretationLower.includes('neutral')) {
    return '#ff9800'; // Orange/Amber
  } else if (interpretationLower.includes('greed')) {
    return '#4caf50'; // Green
  } else if (interpretationLower.includes('extreme greed')) {
    return '#2e7d32'; // Deep Green
  } else {
    return '#757575'; // Gray (default)
  }
}

/**
 * Get the color for a VIX trend
 * @param {String} trend - The VIX trend
 * @returns {String} The color for the trend
 */
function getVixTrendColor(trend) {
  const trendLower = (trend || '').toLowerCase();
  
  if (trendLower.includes('rising')) {
    return '#f44336'; // Red (rising volatility)
  } else if (trendLower.includes('falling')) {
    return '#4caf50'; // Green (falling volatility)
  } else if (trendLower.includes('stable') || trendLower.includes('unchanged')) {
    return '#ff9800'; // Orange/Amber (stable)
  } else {
    return '#757575'; // Gray (default)
  }
}

module.exports = generateMarketIndicatorsSection;
