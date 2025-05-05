const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Sample data from the provided JSON
const sampleData = {
  "fearGreed": {
    "value": 58,
    "category": "Greed",
    "description": "The Fear and Greed Index is currently in a state of greed, indicating market optimism. This suggests investors may be becoming overconfident.",
    "oneWeekAgo": 36,
    "oneMonthAgo": 3,
    "previousDay": 42,
    "previousValue": 42,
    "color": "#ffeb3b",
    "source": "CNN Business (via RapidAPI)",
    "sourceUrl": "https://www.cnn.com/markets/fear-and-greed",
    "asOf": "May 5, 2025 at 1:42 PM EDT"
  }
};

// Function to generate the Fear & Greed chart
const generateFearGreedChart = (fgData) => {
  if (!fgData) return '';
  
  const current = fgData.value || 0;
  const previousClose = fgData.previousValue || fgData.previousDay || 0;
  const oneWeekAgo = fgData.oneWeekAgo || 0;
  const oneMonthAgo = fgData.oneMonthAgo || 0;
  
  // Determine the category based on the value
  const getCategory = (value) => {
    if (value <= 25) return 'Extreme Fear';
    if (value <= 40) return 'Fear';
    if (value <= 60) return 'Neutral';
    if (value <= 75) return 'Greed';
    return 'Extreme Greed';
  };
  
  // Consistent color function for both slider and data points
  const getColor = (value) => {
    if (value <= 25) return '#e53935'; // Red for extreme fear
    if (value <= 40) return '#fb8c00'; // Orange for Fear
    if (value <= 60) return '#ffeb3b'; // Yellow for Neutral
    if (value <= 75) return '#7cb342'; // Light green for Greed
    return '#43a047'; // Dark green for Extreme Greed
  };
  
  // Use category from data if available
  const fearGreedCategory = fgData.category || getCategory(current);
  const fearGreedColor = fgData.color || getColor(current);
  const formattedDate = fgData.asOf || new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short'
  });
  
  // Calculate proper Y-axis position based on value (0-100 scale)
  // Chart height is 130px
  const chartHeight = 130;
  const getYPosition = (value) => {
    // For a value of 0, we want y=chartHeight (bottom)
    // For a value of 100, we want y=0 (top)
    return chartHeight - (value * chartHeight / 100);
  };
  
  // Create data points array for easier handling
  const dataPoints = [
    { label: 'One Month Ago', value: oneMonthAgo, x: 10, isCurrent: false },
    { label: 'One Week Ago', value: oneWeekAgo, x: 35, isCurrent: false },
    { label: 'Previous Close', value: previousClose, x: 65, isCurrent: false },
    { label: 'Current', value: current, x: 90, isCurrent: true }
  ];
  
  // Create SVG path for the line connecting data points
  let pathD = '';
  dataPoints.forEach((point, index) => {
    const x = `${point.x}%`;
    const y = getYPosition(point.value);
    if (index === 0) {
      pathD += `M${x},${y}`;
    } else {
      pathD += ` L${x},${y}`;
    }
  });
  
  const chartHtml = `
    <div style="margin-top: 20px;">
      <!-- Slider visualization with thicker height and adjusted gradient -->
      <div style="position: relative; height: 8px; background: linear-gradient(to right, #e53935 0%, #fb8c00 20%, #ffeb3b 35%, #ffeb3b 65%, #7cb342 80%, #43a047 100%); border-radius: 5px; margin: 10px 0;">
        <!-- Thumb -->
        <div style="position: absolute; top: 50%; left: ${current}%; transform: translate(-50%, -50%); width: 12px; height: 12px; background-color: #fff; border: 2px solid #333; border-radius: 50%; z-index: 2;"></div>
      </div>
      
      <div style="display: flex; justify-content: space-between; font-size: 12px; color: #718096; margin-top: 5px;">
        <div>Extreme Fear</div>
        <div>Fear</div>
        <div>Neutral</div>
        <div>Greed</div>
        <div>Extreme Greed</div>
      </div>
      
      <div style="font-size: 0.9rem; color: #718096; margin-top: 15px; padding: 8px; background-color: rgba(0,0,0,0.03); border-radius: 4px; border-left: 3px solid ${fearGreedColor}; display: flex; flex-wrap: wrap; justify-content: flex-start; align-items: center; gap: 8px; overflow: hidden;">
        <span style="font-weight: bold; flex-shrink: 0;">${fearGreedCategory}:</span>
        ${fgData.description || 'The Fear and Greed Index is currently in a state of fear, indicating a moderate level of market anxiety. This may be a good time to consider buying opportunities.'}
      </div>
      
      <h4 style="margin-top: 20px; margin-bottom: 15px; font-size: 1rem; font-weight: bold; color: #2d3748;">Historical Trend</h4>
      
      <div style="position: relative; height: 180px; background-color: #fff; border-radius: 8px; padding: 20px 20px 40px 20px; margin-top: 15px; margin-bottom: 25px; display: flex; justify-content: center;">
        <!-- Background color bands (horizontal) with proper scale alignment -->
        <div style="position: absolute; top: 20px; left: 20px; right: 20px; bottom: 40px; height: ${chartHeight}px;">
          <!-- Extreme Greed: 75-100 -->
          <div style="position: absolute; top: 0; left: 0; right: 0; height: ${chartHeight * 25 / 100}px; background-color: rgba(67, 160, 71, 0.6);"></div>
          <!-- Greed: 60-75 -->
          <div style="position: absolute; top: ${chartHeight * 25 / 100}px; left: 0; right: 0; height: ${chartHeight * 15 / 100}px; background-color: rgba(124, 179, 66, 0.6);"></div>
          <!-- Neutral: 40-60 -->
          <div style="position: absolute; top: ${chartHeight * 40 / 100}px; left: 0; right: 0; height: ${chartHeight * 20 / 100}px; background-color: rgba(255, 235, 59, 0.6);"></div>
          <!-- Fear: 25-40 -->
          <div style="position: absolute; top: ${chartHeight * 60 / 100}px; left: 0; right: 0; height: ${chartHeight * 15 / 100}px; background-color: rgba(251, 140, 0, 0.6);"></div>
          <!-- Extreme Fear: 0-25 -->
          <div style="position: absolute; top: ${chartHeight * 75 / 100}px; left: 0; right: 0; height: ${chartHeight * 25 / 100}px; background-color: rgba(229, 57, 53, 0.6);"></div>
        </div>
        
        <!-- SVG Chart - aligned with background bands -->
        <svg width="calc(100% - 40px)" height="${chartHeight}" style="position: absolute; z-index: 2; left: 20px; top: 20px;">
          <!-- Straight black line connecting data points -->
          <path d="${pathD}" stroke="#000000" stroke-width="2" fill="none"></path>
          
          <!-- Data points with values -->
          ${dataPoints.map(point => `
            <!-- Vertical line from data point to x-axis -->
            <line x1="${point.x}%" y1="${getYPosition(point.value)}" x2="${point.x}%" y2="${chartHeight}" stroke="#000000" stroke-width="1" stroke-dasharray="2,2"></line>
            <circle cx="${point.x}%" cy="${getYPosition(point.value)}" r="${point.isCurrent ? 7 : 5}" fill="${getColor(point.value)}" stroke="#000000" stroke-width="2"></circle>
            <text x="${point.x}%" y="${getYPosition(point.value) - 10}" text-anchor="middle" font-size="10" ${point.isCurrent ? 'font-weight="bold"' : ''} fill="#4a5568">${point.value}</text>
          `).join('')}
        </svg>
        
        <!-- X-axis labels aligned with data points - all condensed to two lines -->
        <div style="position: absolute; bottom: 5px; left: 20px; right: 20px; display: flex; height: 25px;">
          ${dataPoints.map(point => `
            <div style="font-size: 0.65rem; color: #718096; width: 10%; text-align: center; position: absolute; left: ${point.x}%; transform: translateX(-50%); line-height: 1.2; ${point.isCurrent ? 'font-weight: bold;' : ''}">${point.label === 'One Month Ago' ? 'One<br>Month Ago' : point.label === 'One Week Ago' ? 'One<br>Week Ago' : point.label === 'Previous Close' ? 'Previous<br>Close' : point.label}</div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  
  const html = `
    <div class="market-pulse-section fear-greed-container" style="width: 100%; margin: 0; padding: 0; margin-bottom: 15px;">
      <div style="background-color: white; border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 5px;">
        <div style="font-size: 1.1rem; font-weight: bold; color: #4a5568;">Fear & Greed Index: <span style="color: ${fearGreedColor};">${current} (${fearGreedCategory})</span></div>
      </div>
      <div style="margin-top: 10px;">
        ${chartHtml}
        <div style="font-size: 0.8rem; color: #718096; margin-top: 15px; text-align: right;">
          Source: <a href="${fgData.sourceUrl || 'https://money.cnn.com/data/fear-and-greed/'}" target="_blank" style="color: #3182ce; text-decoration: none;">${fgData.source || 'CNN Business Fear & Greed Index'}</a> as of ${formattedDate}
        </div>
      </div>
    </div>
  `;
  
  return html;
};

// Generate the full HTML page
const generateHtml = (data) => {
  const fearGreedHtml = generateFearGreedChart(data.fearGreed);
  
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fear & Greed Chart Test</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.5;
        color: #333;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        background-color: #f5f5f5;
      }
      h1 {
        color: #2d3748;
        margin-bottom: 20px;
      }
    </style>
  </head>
  <body>
    <h1>Fear & Greed Chart Test</h1>
    ${fearGreedHtml}
  </body>
  </html>
  `;
};

// Generate HTML and write to file
const html = generateHtml(sampleData);
const outputPath = path.join(__dirname, 'fear-greed-test-output.html');

fs.writeFileSync(outputPath, html);
console.log(`Test output written to: ${outputPath}`);

// Open the file in the default browser
const openCommand = process.platform === 'darwin' 
  ? `open "${outputPath}"` 
  : process.platform === 'win32' 
    ? `start "" "${outputPath}"` 
    : `xdg-open "${outputPath}"`;

exec(openCommand, (error) => {
  if (error) {
    console.error(`Error opening file: ${error.message}`);
    return;
  }
  console.log('Opened in default browser');
});
