/**
 * Fear and Greed Index Chart Generator Lambda
 * 
 * This AWS Lambda function retrieves Fear and Greed Index data from DynamoDB
 * and generates an embeddable HTML chart for inclusion in the Market Pulse Daily newsletter.
 */

const AWS = require('aws-sdk');
const { DateTime } = require('luxon');

// Configure AWS SDK
const region = process.env.AWS_REGION || 'us-east-1';
const tableName = process.env.DYNAMODB_TABLE_NAME || 'fear_greed_index';

AWS.config.update({ region });

// Create DynamoDB client
const dynamoDB = new AWS.DynamoDB.DocumentClient();

/**
 * Get Fear and Greed Index data from DynamoDB
 * @param {number} days - Number of days of data to retrieve
 * @return {Promise<Array>} Promise that resolves to array of data points
 */
async function getFearAndGreedData(days = 90) {
  // Calculate start date (days ago from now)
  const startDate = DateTime.now().minus({ days }).toFormat('yyyy-MM-dd');
  
  // Query parameters
  const params = {
    TableName: tableName,
    IndexName: 'DateIndex',
    KeyConditionExpression: '#date >= :startDate',
    ExpressionAttributeNames: {
      '#date': 'date'
    },
    ExpressionAttributeValues: {
      ':startDate': startDate
    }
  };
  
  try {
    const data = await dynamoDB.query(params).promise();
    
    if (!data.Items || data.Items.length === 0) {
      console.log(`No data found since ${startDate}`);
      return [];
    }
    
    console.log(`Retrieved ${data.Items.length} data points from DynamoDB`);
    
    // Sort by timestamp (ascending)
    return data.Items.sort((a, b) => a.timestamp_ms - b.timestamp_ms);
  } catch (error) {
    console.error(`Error querying DynamoDB: ${error.message}`);
    throw error;
  }
}

/**
 * Generate HTML for the Fear and Greed Index chart
 * @param {Array} data - Array of data points
 * @param {Object} options - Chart options
 * @return {string} HTML content
 */
function generateChartHtml(data, options = {}) {
  const {
    width = '100%',
    height = '400px',
    title = 'CNN Fear & Greed Index',
    showControls = true,
    defaultPeriod = '3m' // 3 months
  } = options;
  
  // Format data for Chart.js
  const chartData = {
    labels: data.map(item => item.date),
    datasets: [{
      label: 'Fear & Greed Index',
      data: data.map(item => item.score),
      borderColor: 'rgba(75, 192, 192, 1)',
      backgroundColor: data.map(item => {
        // Color based on rating
        if (item.rating === 'extreme fear') return 'rgba(255, 0, 0, 0.5)';
        if (item.rating === 'fear') return 'rgba(255, 165, 0, 0.5)';
        if (item.rating === 'neutral') return 'rgba(255, 255, 0, 0.5)';
        if (item.rating === 'greed') return 'rgba(144, 238, 144, 0.5)';
        return 'rgba(0, 128, 0, 0.5)'; // extreme greed
      }),
      borderWidth: 1,
      fill: true
    }]
  };
  
  // Current score and rating
  const currentData = data[data.length - 1] || { score: 'N/A', rating: 'N/A' };
  
  // Generate HTML
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/luxon@3.4.3/build/global/luxon.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-luxon@1.3.1/dist/chartjs-adapter-luxon.min.js"></script>
  <style>
    .fear-greed-container {
      width: ${width};
      max-width: 800px;
      margin: 0 auto;
      font-family: Arial, sans-serif;
    }
    .chart-container {
      position: relative;
      height: ${height};
      width: 100%;
    }
    .current-score {
      text-align: center;
      margin-bottom: 20px;
      font-size: 1.2em;
    }
    .score-value {
      font-size: 1.5em;
      font-weight: bold;
    }
    .rating-extreme-fear { color: #d32f2f; }
    .rating-fear { color: #ff9800; }
    .rating-neutral { color: #ffc107; }
    .rating-greed { color: #8bc34a; }
    .rating-extreme-greed { color: #4caf50; }
    .controls {
      display: ${showControls ? 'flex' : 'none'};
      justify-content: center;
      margin-top: 10px;
      gap: 10px;
    }
    .controls button {
      padding: 5px 10px;
      border: 1px solid #ccc;
      background: #f5f5f5;
      cursor: pointer;
      border-radius: 4px;
    }
    .controls button.active {
      background: #e0e0e0;
      font-weight: bold;
    }
    .chart-footer {
      text-align: center;
      margin-top: 10px;
      font-size: 0.8em;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="fear-greed-container">
    <div class="current-score">
      CNN Fear & Greed Index: 
      <span class="score-value rating-${currentData.rating.replace(' ', '-')}">${currentData.score}</span>
      <span class="rating-${currentData.rating.replace(' ', '-')}"> (${currentData.rating})</span>
    </div>
    <div class="chart-container">
      <canvas id="fearGreedChart"></canvas>
    </div>
    <div class="controls">
      <button data-period="1m">1M</button>
      <button data-period="3m" class="active">3M</button>
      <button data-period="6m">6M</button>
      <button data-period="1y">1Y</button>
      <button data-period="all">All</button>
    </div>
    <div class="chart-footer">
      Data source: CNN Fear & Greed Index | Updated: ${DateTime.now().toFormat('yyyy-MM-dd')}
    </div>
  </div>

  <script>
    // Chart data
    const chartData = ${JSON.stringify(chartData)};
    
    // Format date for display
    function formatDate(dateStr) {
      return luxon.DateTime.fromFormat(dateStr, 'yyyy-MM-dd').toFormat('MMM d, yyyy');
    }
    
    // Initialize chart
    let chart;
    
    function initChart() {
      const ctx = document.getElementById('fearGreedChart').getContext('2d');
      
      chart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'time',
              time: {
                unit: 'day',
                tooltipFormat: 'MMM d, yyyy',
                displayFormats: {
                  day: 'MMM d'
                }
              },
              title: {
                display: true,
                text: 'Date'
              }
            },
            y: {
              min: 0,
              max: 100,
              title: {
                display: true,
                text: 'Index Value'
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                title: function(context) {
                  const index = context[0].dataIndex;
                  return formatDate(chartData.labels[index]);
                },
                label: function(context) {
                  const index = context.dataIndex;
                  const score = chartData.datasets[0].data[index];
                  const rating = getRating(score);
                  return \`Score: \${score} (\${rating})\`;
                }
              }
            },
            annotation: {
              annotations: {
                extremeFear: {
                  type: 'line',
                  yMin: 0,
                  yMax: 25,
                  borderColor: 'rgba(255, 0, 0, 0.2)',
                  borderWidth: 0,
                  backgroundColor: 'rgba(255, 0, 0, 0.1)'
                },
                fear: {
                  type: 'line',
                  yMin: 25,
                  yMax: 40,
                  borderColor: 'rgba(255, 165, 0, 0.2)',
                  borderWidth: 0,
                  backgroundColor: 'rgba(255, 165, 0, 0.1)'
                },
                neutral: {
                  type: 'line',
                  yMin: 40,
                  yMax: 60,
                  borderColor: 'rgba(255, 255, 0, 0.2)',
                  borderWidth: 0,
                  backgroundColor: 'rgba(255, 255, 0, 0.1)'
                },
                greed: {
                  type: 'line',
                  yMin: 60,
                  yMax: 75,
                  borderColor: 'rgba(144, 238, 144, 0.2)',
                  borderWidth: 0,
                  backgroundColor: 'rgba(144, 238, 144, 0.1)'
                },
                extremeGreed: {
                  type: 'line',
                  yMin: 75,
                  yMax: 100,
                  borderColor: 'rgba(0, 128, 0, 0.2)',
                  borderWidth: 0,
                  backgroundColor: 'rgba(0, 128, 0, 0.1)'
                }
              }
            }
          }
        }
      });
    }
    
    // Get rating based on score
    function getRating(score) {
      if (score <= 25) return 'extreme fear';
      if (score <= 40) return 'fear';
      if (score <= 60) return 'neutral';
      if (score <= 75) return 'greed';
      return 'extreme greed';
    }
    
    // Filter data by period
    function filterByPeriod(period) {
      const now = luxon.DateTime.now();
      let startDate;
      
      switch(period) {
        case '1m':
          startDate = now.minus({ months: 1 });
          break;
        case '3m':
          startDate = now.minus({ months: 3 });
          break;
        case '6m':
          startDate = now.minus({ months: 6 });
          break;
        case '1y':
          startDate = now.minus({ years: 1 });
          break;
        default:
          // Show all data
          return;
      }
      
      const startDateStr = startDate.toFormat('yyyy-MM-dd');
      
      // Filter data
      const filteredLabels = [];
      const filteredData = [];
      const filteredColors = [];
      
      for (let i = 0; i < chartData.labels.length; i++) {
        if (chartData.labels[i] >= startDateStr) {
          filteredLabels.push(chartData.labels[i]);
          filteredData.push(chartData.datasets[0].data[i]);
          filteredColors.push(chartData.datasets[0].backgroundColor[i]);
        }
      }
      
      // Update chart
      chart.data.labels = filteredLabels;
      chart.data.datasets[0].data = filteredData;
      chart.data.datasets[0].backgroundColor = filteredColors;
      chart.update();
    }
    
    // Initialize chart when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
      initChart();
      
      // Set default period
      filterByPeriod('${defaultPeriod}');
      
      // Add event listeners to period buttons
      document.querySelectorAll('.controls button').forEach(button => {
        button.addEventListener('click', function() {
          // Remove active class from all buttons
          document.querySelectorAll('.controls button').forEach(btn => {
            btn.classList.remove('active');
          });
          
          // Add active class to clicked button
          this.classList.add('active');
          
          // Filter data by period
          filterByPeriod(this.dataset.period);
        });
      });
    });
  </script>
</body>
</html>
  `;
}

/**
 * Lambda handler function
 * @param {Object} event - Lambda event object
 * @param {Object} context - Lambda context object
 * @return {Promise<Object>} Promise that resolves to response object
 */
exports.handler = async (event, context) => {
  try {
    console.log('Fear and Greed Index Chart Generator Lambda invoked');
    console.log('Event:', JSON.stringify(event));
    
    // Parse options from event
    const options = event.options || {};
    const days = options.days || 90;
    const chartOptions = {
      width: options.width || '100%',
      height: options.height || '400px',
      title: options.title || 'CNN Fear & Greed Index',
      showControls: options.showControls !== false,
      defaultPeriod: options.defaultPeriod || '3m'
    };
    
    // Get data from DynamoDB
    const data = await getFearAndGreedData(days);
    
    if (data.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No data found' })
      };
    }
    
    // Generate chart HTML
    const html = generateChartHtml(data, chartOptions);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html'
      },
      body: html
    };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
