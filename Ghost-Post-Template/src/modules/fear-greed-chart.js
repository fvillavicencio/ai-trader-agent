/**
 * Fear and Greed Chart Module
 * 
 * This module connects to DynamoDB to retrieve historical Fear and Greed Index data,
 * validates the dataset's completeness, and generates an interactive chart.
 * 
 * The chart is identical in format and interaction to the existing fear-greed-chart.html
 * and is inserted into the report below the current Fear and Greed chart.
 */

const AWS = require('aws-sdk');
const { DateTime } = require('luxon');
const { addHTML } = require('../utils/mobiledoc-helpers');

/**
 * Determines the Fear and Greed category from a numeric value
 * @param {number} value - The Fear and Greed Index value (0-100)
 * @returns {string} - The corresponding category
 */
function getCategoryFromValue(value) {
  if (value <= 25) return 'Extreme Fear';
  if (value <= 40) return 'Fear';
  if (value <= 60) return 'Neutral';
  if (value <= 75) return 'Greed';
  return 'Extreme Greed';
}

// Configure AWS
function configureAWS() {
  AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  });
}

/**
 * Retrieves Fear and Greed Index data from DynamoDB for the last 36 months
 * @returns {Promise<Array>} Array of fear and greed index data points
 */
async function retrieveFearAndGreedData() {
  configureAWS();
  
  // Create DynamoDB client
  const dynamoDB = new AWS.DynamoDB.DocumentClient();
  
  // Calculate date range (36 months back from today)
  const endDate = DateTime.now();
  const startDate = DateTime.now().minus({ months: 36 });
  
  // Convert to timestamp in milliseconds for filtering
  const endTimestamp = endDate.toMillis();
  const startTimestamp = startDate.toMillis();
  
  console.log(`Retrieving data from ${startDate.toISODate()} to ${endDate.toISODate()}`);
  console.log(`Using timestamps from ${startTimestamp} to ${endTimestamp}`);
  
  // Scan parameters for DynamoDB
  const params = {
    TableName: process.env.DYNAMODB_TABLE_NAME || 'fear_greed_index',
    Limit: 1100 // Approximately 36 months of daily data (3 years * 365 days)
  };
  
  try {
    // Scan DynamoDB
    const result = await dynamoDB.scan(params).promise();
    console.log(`Retrieved ${result.Items.length} items from DynamoDB`);
    
    // Filter items by timestamp if available, otherwise use all data
    let filteredItems = result.Items;
    
    if (filteredItems.length > 0 && filteredItems[0].timestamp_ms) {
      filteredItems = filteredItems.filter(item => {
        return item.timestamp_ms >= startTimestamp && item.timestamp_ms <= endTimestamp;
      });
      console.log(`Filtered to ${filteredItems.length} items within the date range`);
    }
    
    // Transform the data to the format needed for the chart
    const transformedData = filteredItems.map(item => {
      // Determine the date - either from timestamp_ms or from date field
      const itemDate = item.timestamp_ms 
        ? DateTime.fromMillis(item.timestamp_ms).toISODate()
        : (item.date || DateTime.now().toISODate());
      
      return {
        date: itemDate,
        value: parseInt(item.value, 10),
        classification: item.classification || getCategoryFromValue(item.value)
      };
    });
    
    // Sort by date ascending
    transformedData.sort((a, b) => a.date.localeCompare(b.date));
    
    console.log(`Transformed ${transformedData.length} items for the chart`);
    if (transformedData.length > 0) {
      console.log(`Date range: ${transformedData[0].date} to ${transformedData[transformedData.length - 1].date}`);
    }
    
    return transformedData;
  } catch (error) {
    console.error('Error retrieving Fear and Greed data from DynamoDB:', error);
    throw error;
  }
}

/**
 * Validates that the dataset spans exactly 36 months and is complete
 * @param {Array} data - The fear and greed index data
 * @returns {boolean} - Whether the dataset is valid
 */
function validateDataset(data) {
  if (!data || data.length === 0) {
    console.error('No Fear and Greed data available');
    return false;
  }
  
  // Check date range
  const firstDate = DateTime.fromISO(data[0].date);
  const lastDate = DateTime.fromISO(data[data.length - 1].date);
  const diffMonths = lastDate.diff(firstDate, 'months').months;
  
  // Allow some flexibility in the exact number of months (35-37 months is acceptable)
  if (diffMonths < 35 || diffMonths > 37) {
    console.error(`Data does not span approximately 36 months. Actual span: ${diffMonths.toFixed(1)} months`);
    return false;
  }
  
  // Check for significant gaps in the data
  const dates = data.map(item => item.date);
  let previousDate = DateTime.fromISO(dates[0]);
  
  for (let i = 1; i < dates.length; i++) {
    const currentDate = DateTime.fromISO(dates[i]);
    const diffDays = currentDate.diff(previousDate, 'days').days;
    
    // Flag if there's a gap of more than 7 days (1 week)
    if (diffDays > 7) {
      console.warn(`Gap of ${diffDays.toFixed(1)} days found between ${previousDate.toISODate()} and ${currentDate.toISODate()}`);
    }
    
    previousDate = currentDate;
  }
  
  return true;
}

/**
 * Generates the HTML for the interactive Fear and Greed chart
 * @param {Array} data - The fear and greed index data
 * @param {Object} currentValue - The current fear and greed index value from lambda payload
 * @returns {string} - HTML for the chart
 */
function generateChartHTML(data, currentValue) {
  // Make sure we have valid data
  if (!data || data.length === 0) {
    console.error('No Fear and Greed data available');
    return '';
  }
  
  // Get the latest data point
  const latestData = data[data.length - 1];
  
  // Extract current value information
  let value = currentValue?.value;
  if (isNaN(value)) {
    value = latestData?.value;
    if (isNaN(value)) {
      value = 50; // Default to neutral
    }
  }
  
  const classification = currentValue?.classification || getCategoryFromValue(value);
  
  // Format the current date
  const currentDate = DateTime.fromISO(latestData.date).toFormat('MMM d, yyyy');
  
  // Get the appropriate color for the current rating
  const getRatingBackgroundColor = (rating) => {
    switch(rating) {
      case 'Extreme Fear': return '#e74c3c';
      case 'Fear': return '#f39c12';
      case 'Neutral': return '#3498db';
      case 'Greed': return '#2ecc71';
      case 'Extreme Greed': return '#27ae60';
      default: return '#3498db';
    }
  };
  
  const getRatingTextColor = (rating) => {
    switch(rating) {
      case 'Extreme Fear': 
      case 'Fear': 
      case 'Extreme Greed': 
      case 'Greed':
      case 'Neutral': return '#ffffff';
      default: return '#ffffff';
    }
  };
  
  const ratingBgColor = getRatingBackgroundColor(classification);
  const ratingTextColor = getRatingTextColor(classification);
  // Convert data to JSON string for embedding in the HTML
  const chartData = JSON.stringify(data);
  
  // Return the HTML for the chart with the exact styling from the original
  return `
    <style>
      .fear-greed-container {
        font-family: 'Roboto', 'Segoe UI', Arial, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #ffffff;
        color: #202124;
        max-width: 900px;
        margin: 0 auto;
      }
      .header-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      .fg-title {
        font-size: 22px;
        font-weight: 500;
        color: #202124;
        margin: 0;
      }
      .header-right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }
      .current-value {
        font-size: 28px;
        font-weight: 500;
        color: #202124;
      }
      .current-rating {
        font-size: 14px;
        font-weight: 500;
        padding: 4px 8px;
        border-radius: 4px;
        margin-top: 4px;
      }
      .last-updated {
        font-size: 12px;
        color: #5f6368;
        margin-top: 4px;
      }
      .time-period-selector {
        display: flex;
        margin-bottom: 16px;
        border-bottom: 1px solid #e0e0e0;
      }
      .time-period-btn {
        background: none;
        border: none;
        padding: 8px 16px;
        font-size: 14px;
        font-weight: 500;
        color: #5f6368;
        cursor: pointer;
        position: relative;
      }
      .time-period-btn.active {
        color: #1a73e8;
      }
      .time-period-btn.active::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        width: 100%;
        height: 2px;
        background-color: #1a73e8;
      }
      .chart-container {
        height: 300px;
        margin-bottom: 16px;
        position: relative;
      }
      .legend {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 12px;
        margin-top: 16px;
      }
      .legend-item {
        display: flex;
        align-items: center;
        font-size: 12px;
        color: #5f6368;
      }
      .legend-color {
        width: 12px;
        height: 12px;
        margin-right: 4px;
        border-radius: 2px;
      }
    </style>
    
    <div class="fear-greed-container">
      <div class="header-info">
        <h2 class="fg-title">Fear and Greed Index</h2>
        <div class="header-right">
          <div id="currentValueDisplay" class="current-value">${value}</div>
          <div id="currentRatingDisplay" class="current-rating" style="background-color: ${ratingBgColor}; color: ${ratingTextColor}">${classification}</div>
          <div class="last-updated">Last updated: <span id="lastUpdated">${currentDate}</span></div>
        </div>
      </div>
      
      <div class="time-period-selector">
        <button class="time-period-btn" data-period="1W">1W</button>
        <button class="time-period-btn" data-period="1M">1M</button>
        <button class="time-period-btn" data-period="3M">3M</button>
        <button class="time-period-btn" data-period="YTD">YTD</button>
        <button class="time-period-btn" data-period="1Y">1Y</button>
        <button class="time-period-btn active" data-period="ALL">ALL</button>
      </div>
      
      <div class="chart-container">
        <canvas id="fearGreedChart"></canvas>
      </div>
      
      <div class="legend">
        <div class="legend-item">
          <div class="legend-color" style="background-color: rgba(231, 76, 60, 0.2);"></div>
          <span>Extreme Fear (0-25)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: rgba(243, 156, 18, 0.2);"></div>
          <span>Fear (25-45)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: rgba(52, 152, 219, 0.2);"></div>
          <span>Neutral (45-55)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: rgba(46, 204, 113, 0.2);"></div>
          <span>Greed (55-75)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: rgba(39, 174, 96, 0.2);"></div>
          <span>Extreme Greed (75-100)</span>
        </div>
      </div>
    </div>
      
      <script>
        // Load required libraries if not already loaded
        function loadScript(url, callback) {
          if (document.querySelector('script[src="' + url + '"]')) {
            if (callback) callback();
            return;
          }
          
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.src = url;
          script.onload = callback;
          document.head.appendChild(script);
        }
        
        // Load Chart.js and its dependencies in sequence
        loadScript('https://cdn.jsdelivr.net/npm/luxon@3.0.1/build/global/luxon.min.js', function() {
          loadScript('https://cdn.jsdelivr.net/npm/chart.js', function() {
            loadScript('https://cdn.jsdelivr.net/npm/chartjs-adapter-luxon@1.2.0/dist/chartjs-adapter-luxon.min.js', function() {
              loadScript('https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@2.1.0/dist/chartjs-plugin-annotation.min.js', function() {
                initFearGreedChart();
              });
            });
          });
        });
        
        function initFearGreedChart() {
          // Parse the data
          const chartData = ${chartData};
          const currentValue = ${value};
          
          // Get the canvas element
          const ctx = document.getElementById('fearGreedChart').getContext('2d');
          
          // Function to get background color based on the score
          function getBackgroundColor(score) {
            if (score >= 0 && score < 25) return 'rgba(231, 76, 60, 0.2)';  // Extreme Fear - Red
            if (score >= 25 && score < 45) return 'rgba(243, 156, 18, 0.2)'; // Fear - Orange
            if (score >= 45 && score < 55) return 'rgba(52, 152, 219, 0.2)'; // Neutral - Blue
            if (score >= 55 && score < 75) return 'rgba(46, 204, 113, 0.2)'; // Greed - Light Green
            return 'rgba(39, 174, 96, 0.2)';                                // Extreme Greed - Dark Green
          }
          
          // Function to get border color based on the score
          function getBorderColor(score) {
            if (score >= 0 && score < 25) return 'rgba(231, 76, 60, 1)';  // Extreme Fear - Red
            if (score >= 25 && score < 45) return 'rgba(243, 156, 18, 1)'; // Fear - Orange
            if (score >= 45 && score < 55) return 'rgba(52, 152, 219, 1)'; // Neutral - Blue
            if (score >= 55 && score < 75) return 'rgba(46, 204, 113, 1)'; // Greed - Light Green
            return 'rgba(39, 174, 96, 1)';                                // Extreme Greed - Dark Green
          }
          
          // Prepare data for Chart.js
          const labels = chartData.map(item => item.date);
          const values = chartData.map(item => item.value);
          const backgroundColors = values.map(getBackgroundColor);
          const borderColors = values.map(getBorderColor);
          
          // Create the chart
          const chart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [{
                label: 'Fear & Greed Index',
                data: values,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1,
                pointBackgroundColor: borderColors,
                pointBorderColor: '#fff',
                pointRadius: 3,
                pointHoverRadius: 5,
                fill: true,
                tension: 0.1
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  mode: 'index',
                  intersect: false,
                  callbacks: {
                    label: function(context) {
                      const value = context.raw;
                      let label = 'Fear & Greed Index: ' + value;
                      
                      // Add classification
                      if (value >= 0 && value < 25) label += ' (Extreme Fear)';
                      else if (value >= 25 && value < 45) label += ' (Fear)';
                      else if (value >= 45 && value < 55) label += ' (Neutral)';
                      else if (value >= 55 && value < 75) label += ' (Greed)';
                      else label += ' (Extreme Greed)';
                      
                      return label;
                    }
                  }
                },
                annotation: {
                  annotations: {
                    line1: {
                      type: 'line',
                      yMin: 25,
                      yMax: 25,
                      borderColor: 'rgba(243, 156, 18, 0.5)',
                      borderWidth: 1,
                      borderDash: [5, 5],
                      label: {
                        enabled: true,
                        content: 'Fear',
                        position: 'start',
                        backgroundColor: 'rgba(243, 156, 18, 0.7)'
                      }
                    },
                    line2: {
                      type: 'line',
                      yMin: 45,
                      yMax: 45,
                      borderColor: 'rgba(52, 152, 219, 0.5)',
                      borderWidth: 1,
                      borderDash: [5, 5],
                      label: {
                        enabled: true,
                        content: 'Neutral',
                        position: 'start',
                        backgroundColor: 'rgba(52, 152, 219, 0.7)'
                      }
                    },
                    line3: {
                      type: 'line',
                      yMin: 55,
                      yMax: 55,
                      borderColor: 'rgba(46, 204, 113, 0.5)',
                      borderWidth: 1,
                      borderDash: [5, 5],
                      label: {
                        enabled: true,
                        content: 'Greed',
                        position: 'start',
                        backgroundColor: 'rgba(46, 204, 113, 0.7)'
                      }
                    },
                    greedZone: {
                      type: 'box',
                      yMin: 55,
                      yMax: 75,
                      backgroundColor: 'rgba(46, 204, 113, 0.2)',
                      borderWidth: 0
                    },
                    extremeGreedZone: {
                      type: 'box',
                      yMin: 75,
                      yMax: 100,
                      backgroundColor: 'rgba(39, 174, 96, 0.2)',
                      borderWidth: 0
                    }
                  }
                }
              }
            }
          });
        }
        
        // Add event listeners to time period buttons
        document.querySelectorAll('.time-period-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            // Remove active class from all buttons
            document.querySelectorAll('.time-period-btn').forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get the selected period
            const period = this.dataset.period;
            const now = new Date();
            let startDate;
            
            // Calculate start date based on selected period
            switch(period) {
              case '1W':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
              case '1M':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                break;
              case '3M':
                startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                break;
              case 'YTD':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
              case '1Y':
                startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                break;
              case 'ALL':
              default:
                startDate = null;
                break;
            }
            
            // Update chart with new date range
            if (startDate) {
              chart.options.scales.x = chart.options.scales.x || {};
              chart.options.scales.x.min = startDate;
            } else {
              chart.options.scales.x = chart.options.scales.x || {};
              chart.options.scales.x.min = undefined;
            }
            
            chart.update();
          });
        });
      });
    </script>
  `;

  return `
    <div class="fear-greed-container">
      <div class="header-info">
        <h2 class="fg-title">Fear and Greed Index</h2>
        <div class="header-right">
          <div id="currentValueDisplay" class="current-value">${value}</div>
          <div id="currentRatingDisplay" class="current-rating" style="background-color: ${ratingBgColor}; color: ${ratingTextColor}">${classification}</div>
          <div class="last-updated">Last updated: <span id="lastUpdated">${currentDate}</span></div>
        </div>
      </div>
      
      <div class="time-period-selector">
        <button class="time-period-btn" data-period="1W">1W</button>
        <button class="time-period-btn" data-period="1M">1M</button>
        <button class="time-period-btn" data-period="3M">3M</button>
        <button class="time-period-btn" data-period="YTD">YTD</button>
        <button class="time-period-btn" data-period="1Y">1Y</button>
        <button class="time-period-btn active" data-period="ALL">ALL</button>
      </div>
      
      <div class="chart-container">
        <canvas id="fearGreedChart"></canvas>
      </div>
      
      <div class="legend">
        <div class="legend-item">
          <div class="legend-color" style="background-color: rgba(231, 76, 60, 0.2);"></div>
          <span>Extreme Fear (0-25)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: rgba(243, 156, 18, 0.2);"></div>
          <span>Fear (25-45)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: rgba(52, 152, 219, 0.2);"></div>
          <span>Neutral (45-55)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: rgba(46, 204, 113, 0.2);"></div>
          <span>Greed (55-75)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: rgba(39, 174, 96, 0.2);"></div>
          <span>Extreme Greed (75-100)</span>
        </div>
      </div>
      
      <script>
        // Load required libraries if not already loaded
        function loadScript(url, callback) {
          if (document.querySelector('script[src="' + url + '"]')) {
            if (callback) callback();
            return;
          }
          
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.src = url;
          script.onload = callback;
          document.head.appendChild(script);
        }
        
        // Load Chart.js and its dependencies in sequence
        loadScript('https://cdn.jsdelivr.net/npm/luxon@3.0.1/build/global/luxon.min.js', function() {
          loadScript('https://cdn.jsdelivr.net/npm/chart.js', function() {
            loadScript('https://cdn.jsdelivr.net/npm/chartjs-adapter-luxon@1.2.0/dist/chartjs-adapter-luxon.min.js', function() {
              loadScript('https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@2.1.0/dist/chartjs-plugin-annotation.min.js', function() {
                initFearGreedChart();
              });
            });
          });
        });
        
        function initFearGreedChart() {
          // Parse the data
          const chartData = ${chartData};
          const currentValue = ${value};
          
          // Get the canvas element
          const ctx = document.getElementById('fearGreedChart').getContext('2d');
          
          // Function to get background color based on the score
          function getBackgroundColor(score) {
            if (score >= 0 && score < 25) return 'rgba(231, 76, 60, 0.2)';  // Extreme Fear - Red
            if (score >= 25 && score < 45) return 'rgba(243, 156, 18, 0.2)'; // Fear - Orange
            if (score >= 45 && score < 55) return 'rgba(52, 152, 219, 0.2)'; // Neutral - Blue
            if (score >= 55 && score < 75) return 'rgba(46, 204, 113, 0.2)'; // Greed - Light Green
            return 'rgba(39, 174, 96, 0.2)';                                // Extreme Greed - Dark Green
          }
          
          // Function to get border color based on the score
          function getBorderColor(score) {
            if (score >= 0 && score < 25) return 'rgba(231, 76, 60, 1)';  // Extreme Fear - Red
            if (score >= 25 && score < 45) return 'rgba(243, 156, 18, 1)'; // Fear - Orange
            if (score >= 45 && score < 55) return 'rgba(52, 152, 219, 1)'; // Neutral - Blue
            if (score >= 55 && score < 75) return 'rgba(46, 204, 113, 1)'; // Greed - Light Green
            return 'rgba(39, 174, 96, 1)';                                // Extreme Greed - Dark Green
          }
          
          // Prepare data for Chart.js
          const labels = chartData.map(item => item.date);
          const values = chartData.map(item => item.value);
          const backgroundColors = values.map(getBackgroundColor);
          const borderColors = values.map(getBorderColor);
          
          // Create the chart
          const chart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [{
                label: 'Fear & Greed Index',
                data: values,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1,
                pointBackgroundColor: borderColors,
                pointBorderColor: '#fff',
                pointRadius: 3,
                pointHoverRadius: 5,
                fill: true,
                tension: 0.1
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: {
                  type: 'time',
                  time: {
                    unit: 'month',
                    displayFormats: {
                      month: 'MMM yyyy'
                    }
                  },
                  ticks: {
                    maxRotation: 45,
                    minRotation: 45
                  }
                },
                y: {
                  min: 0,
                  max: 100,
                  ticks: {
                    stepSize: 25
                  }
                }
              },
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  mode: 'index',
                  intersect: false,
                  callbacks: {
                    label: function(context) {
                      const value = context.raw;
                      let label = 'Fear & Greed Index: ' + value;
                      
                      // Add classification
                      if (value >= 0 && value < 25) label += ' (Extreme Fear)';
                      else if (value >= 25 && value < 45) label += ' (Fear)';
                      else if (value >= 45 && value < 55) label += ' (Neutral)';
                      else if (value >= 55 && value < 75) label += ' (Greed)';
                      else label += ' (Extreme Greed)';
                      
                      return label;
                    }
                  }
                },
                annotation: {
                  annotations: {
                    line1: {
                      type: 'line',
                      yMin: 25,
                      yMax: 25,
                      borderColor: 'rgba(243, 156, 18, 0.5)',
                      borderWidth: 1,
                      borderDash: [5, 5],
                      label: {
                        enabled: true,
                        content: 'Fear',
                        position: 'start',
                        backgroundColor: 'rgba(243, 156, 18, 0.7)'
                      }
                    },
                    line2: {
                      type: 'line',
                      yMin: 45,
                      yMax: 45,
                      borderColor: 'rgba(52, 152, 219, 0.5)',
                      borderWidth: 1,
                      borderDash: [5, 5],
                      label: {
                        enabled: true,
                        content: 'Neutral',
                        position: 'start',
                        backgroundColor: 'rgba(52, 152, 219, 0.7)'
                      }
                    },
                    line3: {
                      type: 'line',
                      yMin: 55,
                      yMax: 55,
                      borderColor: 'rgba(46, 204, 113, 0.5)',
                      borderWidth: 1,
                      borderDash: [5, 5],
                      label: {
                        enabled: true,
                        content: 'Greed',
                        position: 'start',
                        backgroundColor: 'rgba(46, 204, 113, 0.7)'
                      }
                    },
                    greedZone: {
                      type: 'box',
                      yMin: 55,
                      yMax: 75,
                      backgroundColor: 'rgba(46, 204, 113, 0.2)',
                      borderWidth: 0
                    },
                    extremeGreedZone: {
                      type: 'box',
                      yMin: 75,
                      yMax: 100,
                      backgroundColor: 'rgba(39, 174, 96, 0.2)',
                      borderWidth: 0
                    }
                  }
                }
              }
            }
          });
          
          // Add event listeners to time period buttons
          document.querySelectorAll('.time-period-btn').forEach(btn => {
            btn.addEventListener('click', function() {
              // Remove active class from all buttons
              document.querySelectorAll('.time-period-btn').forEach(b => b.classList.remove('active'));
              // Add active class to clicked button
              this.classList.add('active');
              
              // Get the selected period
              const period = this.dataset.period;
              const now = new Date();
              let startDate;
              
              // Calculate start date based on selected period
              switch(period) {
                case '1W':
                  startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                  break;
                case '1M':
                  startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                  break;
                case '3M':
                  startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                  break;
                case 'YTD':
                  startDate = new Date(now.getFullYear(), 0, 1);
                  break;
                case '1Y':
                  startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                  break;
                case 'ALL':
                default:
                  startDate = null;
                  break;
              }
              
              // Update chart with new date range
              if (startDate) {
                chart.options.scales.x = chart.options.scales.x || {};
                chart.options.scales.x.min = startDate;
              } else {
                chart.options.scales.x = chart.options.scales.x || {};
                chart.options.scales.x.min = undefined;
              }
              
              chart.update();
            });
          });
        }
      </script>
    </div>
  `;
};

/**
 * Adds the Fear and Greed Chart to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add content to
 * @param {object} data - The data object containing fear and greed information
 */
async function addFearGreedChart(mobiledoc, data) {
  if (!data.fearGreedIndex) {
    console.log('No Fear and Greed Index data available');
    return;
  }
  
  try {
    // Retrieve historical data from DynamoDB
    const historicalData = await retrieveFearAndGreedData();
    
    // Validate the dataset
    const isValid = validateDataset(historicalData);
    
    if (!isValid) {
      console.error('Fear and Greed Index dataset validation failed');
      return;
    }
    
    // Generate the chart HTML
    const chartHTML = generateChartHTML(historicalData, data.fearGreedIndex);
    
    // Add the chart HTML to the mobiledoc
    addHTML(mobiledoc, chartHTML);
    
    console.log('Fear and Greed Chart added successfully');
  } catch (error) {
    console.error('Error adding Fear and Greed Chart:', error);
  }
}

module.exports = { addFearGreedChart };
