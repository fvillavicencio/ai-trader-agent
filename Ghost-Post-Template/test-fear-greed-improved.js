/**
 * Test script for the improved Fear and Greed Chart
 * 
 * This script fetches data from DynamoDB and generates an interactive
 * chart identical to the original fear-greed-chart.html
 */

require('dotenv').config({ path: './src/.env' });
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');

// Configure AWS
function configureAWS() {
  AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-2', // Using us-east-2 to match the query script
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  });
}

/**
 * Determines the Fear and Greed category from a numeric value
 * @param {number} value - The Fear and Greed Index value (0-100)
 * @returns {string} - The corresponding category
 */
function getCategoryFromValue(value) {
  if (value <= 25) return 'Extreme Fear';
  if (value <= 45) return 'Fear';
  if (value <= 55) return 'Neutral';
  if (value <= 75) return 'Greed';
  return 'Extreme Greed';
}

/**
 * Retrieves Fear and Greed Index data from DynamoDB for the last 36 months
 * @returns {Promise<Array>} Array of fear and greed index data points
 */
async function retrieveFearAndGreedData() {
  configureAWS();
  
  // Create DynamoDB client
  const dynamoDB = new AWS.DynamoDB.DocumentClient();
  
  // We'll retrieve all data without date filtering
  const endDate = DateTime.now();
  console.log('Retrieving all available data from DynamoDB');
  
  // Scan parameters for DynamoDB - use maximum limit to get all data
  const params = {
    TableName: process.env.DYNAMODB_TABLE_NAME || 'fear_greed_index'
    // No limit specified to retrieve all available data
  };
  
  try {
    // Scan DynamoDB
    const result = await dynamoDB.scan(params).promise();
    console.log(`Retrieved ${result.Items.length} items from DynamoDB`);
    
    // Use all retrieved items
    let filteredItems = result.Items;
    
    // Transform the data to the format needed for the chart
    const transformedData = filteredItems.map(item => {
      // Determine the date - either from timestamp_ms or from date field
      const itemDate = item.timestamp_ms 
        ? DateTime.fromMillis(item.timestamp_ms).toISODate()
        : (item.date || DateTime.now().toISODate());
      
      // Parse value and ensure it's a valid number
      let value = parseInt(item.value, 10);
      if (isNaN(value)) {
        // If value is NaN, use a default value based on classification
        switch(item.classification?.toLowerCase()) {
          case 'extreme fear': value = 15; break;
          case 'fear': value = 35; break;
          case 'neutral': value = 50; break;
          case 'greed': value = 65; break;
          case 'extreme greed': value = 85; break;
          default: value = 50; // Default to neutral
        }
      }
      
      return {
        date: itemDate,
        value: value,
        classification: item.classification || getCategoryFromValue(value)
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
 * Generates an HTML file with the interactive Fear and Greed chart
 * @param {Array} data - The fear and greed index data
 */
async function generateImprovedChart(data) {
  try {
    // Read the template file
    const templatePath = path.join(__dirname, 'fear-greed-chart-template.html');
    let templateContent = fs.readFileSync(templatePath, 'utf8');
    
    // Get the current value (most recent data point)
    const currentValue = data[data.length - 1];
    
    // Make sure the value is a number
    if (isNaN(currentValue.value)) {
      console.warn('Current value is NaN, fixing to a default value');
      // Use a value based on classification if available
      switch(currentValue.classification?.toLowerCase()) {
        case 'extreme fear': currentValue.value = 15; break;
        case 'fear': currentValue.value = 35; break;
        case 'neutral': currentValue.value = 50; break;
        case 'greed': currentValue.value = 65; break;
        case 'extreme greed': currentValue.value = 85; break;
        default: currentValue.value = 50; // Default to neutral
      }
    }
    
    // Format the data for the chart
    const chartData = JSON.stringify(data.map(item => ({
      timestamp: new Date(item.date).getTime(),
      score: item.value,
      rating: item.classification
    })));
    
    console.log('Sample data point:', data[0]);
    console.log('Sample transformed data point:', {
      timestamp: new Date(data[0].date).getTime(),
      score: data[0].value,
      rating: data[0].classification
    });
    
    // Create a simplified CSV format for the chart to use
    let csvData = 'timestamp,score,rating\n';
    data.forEach(item => {
      const timestamp = new Date(item.date).getTime();
      csvData += `${timestamp},${item.value},${item.classification}\n`;
    });
    
    // Create a data URL for the CSV
    const dataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvData)}`;
    
    // Replace the CSV fetch in the template with our data URL
    templateContent = templateContent.replace(
      /const response = await fetch\('historical_data.csv'\);/,
      `const response = await fetch('${dataUrl}');`
    );
    
    // Update the current value and last updated date
    templateContent = templateContent.replace(
      /<div id="currentValueDisplay" class="current-value">--<\/div>/,
      `<div id="currentValueDisplay" class="current-value">${currentValue.value}</div>`
    );
    
    templateContent = templateContent.replace(
      /<div id="currentRatingDisplay" class="current-rating">--<\/div>/,
      `<div id="currentRatingDisplay" class="current-rating" style="background-color: ${getRatingColor(currentValue.classification)}; color: #ffffff;">${currentValue.classification}</div>`
    );
    
    const lastUpdated = DateTime.fromISO(currentValue.date).toFormat('MMM d, yyyy');
    templateContent = templateContent.replace(
      /<span id="lastUpdated">Loading...<\/span>/,
      `<span id="lastUpdated">${lastUpdated}</span>`
    );
    
    // Add console logs to help debug
    templateContent = templateContent.replace(
      /window.addEventListener\('load', initializeApp\);/,
      `window.addEventListener('load', function() {
          console.log('Window loaded, initializing app...');
          initializeApp();
        });
        console.log('Script loaded, waiting for window load event...');`
    );
    
    // Write the modified template to a new file
    const outputPath = path.join(__dirname, 'fear-greed-improved-test.html');
    fs.writeFileSync(outputPath, templateContent);
    
    console.log(`Interactive chart generated at: ${outputPath}`);
    console.log(`Current Fear & Greed value: ${currentValue.value} (${currentValue.classification})`);
    console.log(`Last updated: ${lastUpdated}`);
    
    return outputPath;
  } catch (error) {
    console.error('Error generating improved chart:', error);
    throw error;
  }
}

/**
 * Get the background color for a rating
 * @param {string} rating - The fear and greed rating
 * @returns {string} - The color code
 */
function getRatingColor(rating) {
  switch(rating) {
    case 'Extreme Fear': return '#e74c3c';
    case 'Fear': return '#f39c12';
    case 'Neutral': return '#3498db';
    case 'Greed': return '#2ecc71';
    case 'Extreme Greed': return '#27ae60';
    default: return '#3498db';
  }
}

// Main function
async function main() {
  try {
    console.log('Starting Fear and Greed Chart test...');
    
    // Retrieve data from DynamoDB
    const data = await retrieveFearAndGreedData();
    
    // Generate the improved chart
    const chartPath = await generateImprovedChart(data);
    
    console.log('Test completed successfully!');
    console.log(`Open this file in your browser to view the chart: ${chartPath}`);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the main function
main();
