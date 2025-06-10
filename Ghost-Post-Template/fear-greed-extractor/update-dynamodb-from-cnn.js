/**
 * Update DynamoDB with All Historical Fear and Greed Index Data from CNN API
 * 
 * This script fetches all available historical Fear and Greed Index data from CNN's API
 * and updates the AWS DynamoDB table with this data.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const { DateTime } = require('luxon');
require('dotenv').config();

// Configuration
const CONFIG = {
  tableName: process.env.DYNAMODB_TABLE_NAME || 'fear_greed_index',
  region: process.env.AWS_REGION || 'us-east-1',
  batchSize: 25, // DynamoDB allows max 25 items per batch write
  outputJsonFile: path.join(__dirname, 'cnn_historical_data.json'),
  outputCsvFile: path.join(__dirname, 'cnn_historical_data.csv')
};

// Configure AWS SDK
AWS.config.update({
  region: CONFIG.region,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Create DynamoDB client
const dynamoDB = new AWS.DynamoDB.DocumentClient();

/**
 * Fetches the CNN Fear & Greed Index data
 * @param {Date} startDate - Optional start date to attempt to retrieve data from
 * @return {Promise<Object>} Raw Fear & Greed Index data
 */
async function fetchFearAndGreedIndexData(startDate = null) {
  try {
    console.log("Fetching data from CNN Fear & Greed Index API...");
    
    // Base API URL
    let apiUrl = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";
    
    // If a start date is provided, attempt to add it as a parameter
    // Note: The CNN API may or may not support this parameter, but we'll try
    if (startDate) {
      const startTimestamp = startDate.getTime();
      console.log(`Attempting to retrieve data from ${startDate.toISOString()} onwards`);
      apiUrl += `?startDate=${startTimestamp}`;
    }
    
    console.log(`Requesting from: ${apiUrl}`);
    
    // Enhanced options with more complete headers
    const options = {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://www.cnn.com/markets/fear-and-greed',
        'Origin': 'https://www.cnn.com'
      }
    };
    
    const response = await axios.get(apiUrl, options);
    
    if (response.status === 200 && response.data) {
      console.log(`Successfully retrieved Fear & Greed Index data from CNN API`);
      console.log(`Current score: ${response.data.fear_and_greed?.score}`);
      
      if (response.data.fear_and_greed_historical?.data?.length) {
        console.log(`Retrieved ${response.data.fear_and_greed_historical.data.length} historical data points`);
      }
      
      return response.data;
    }
    
    throw new Error(`CNN API failed with response code ${response.status}`);
  } catch (error) {
    console.error(`Error retrieving Fear & Greed Index from CNN API: ${error.message}`);
    throw error;
  }
}

/**
 * Get the rating based on the score
 * @param {number} score - The fear and greed score
 * @return {string} The rating (extreme fear, fear, neutral, greed, extreme greed)
 */
function getRating(score) {
  if (score <= 25) return 'extreme fear';
  if (score <= 40) return 'fear';
  if (score <= 60) return 'neutral';
  if (score <= 75) return 'greed';
  return 'extreme greed';
}

/**
 * Extract all historical data points from the raw CNN data
 * @param {Object} data - The raw CNN data
 * @return {Array} Array of all historical data points
 */
function extractHistoricalDataPoints(data) {
  if (!data || !data.fear_and_greed_historical || !data.fear_and_greed_historical.data) {
    console.error('Invalid data format');
    return [];
  }
  
  const result = [];
  
  // Add today's data point
  const today = DateTime.now();
  result.push({
    date: today.toFormat('yyyy-MM-dd'),
    timestamp_ms: today.toMillis(),
    score: data.fear_and_greed.score,
    rating: getRating(data.fear_and_greed.score)
  });
  
  // Extract all historical data
  data.fear_and_greed_historical.data.forEach(item => {
    if (item.x && item.y !== undefined) {
      const date = DateTime.fromMillis(item.x);
      result.push({
        date: date.toFormat('yyyy-MM-dd'),
        timestamp_ms: item.x,
        score: item.y,
        rating: item.rating || getRating(item.y)
      });
    }
  });
  
  return result;
}

/**
 * Save data to JSON file
 * @param {Array} data - The data to save
 * @param {string} filename - The filename to save to
 */
function saveToJsonFile(data, filename) {
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`Data saved to ${filename}`);
}

/**
 * Save data to CSV file
 * @param {Array} data - The data to save
 * @param {string} filename - The filename to save to
 */
function saveToCsvFile(data, filename) {
  // Create CSV header
  let csv = 'date,timestamp_ms,score,rating\n';
  
  // Add data rows
  data.forEach(item => {
    csv += `${item.date},${item.timestamp_ms},${item.score},${item.rating}\n`;
  });
  
  fs.writeFileSync(filename, csv);
  console.log(`Data saved to ${filename}`);
}

/**
 * Split array into chunks of specified size
 * @param {Array} array - Array to split
 * @param {number} chunkSize - Size of each chunk
 * @return {Array} Array of chunks
 */
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Transform data points to DynamoDB items
 * @param {Array} dataPoints - Data points
 * @return {Array} Array of DynamoDB items
 */
function transformToDynamoDBItems(dataPoints) {
  return dataPoints.map(point => {
    // Parse timestamp_ms as number if it's a string
    const timestamp = typeof point.timestamp_ms === 'string' 
      ? parseInt(point.timestamp_ms, 10) 
      : point.timestamp_ms;
    
    // Parse score as number if it's a string
    const score = typeof point.score === 'string'
      ? parseFloat(point.score)
      : point.score;
    
    // Format date components
    const dateParts = point.date.split('-');
    
    return {
      timestamp_ms: timestamp,
      date: point.date,
      score: score,
      rating: point.rating,
      year: parseInt(dateParts[0], 10),
      month: parseInt(dateParts[1], 10),
      day: parseInt(dateParts[2], 10)
    };
  });
}

/**
 * Write items to DynamoDB in batches
 * @param {Array} items - Items to write
 * @return {Promise} Promise that resolves when all batches are written
 */
async function writeToDynamoDB(items) {
  // Split items into chunks of batchSize
  const chunks = chunkArray(items, CONFIG.batchSize);
  console.log(`Writing ${items.length} items to DynamoDB in ${chunks.length} batches`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing batch ${i + 1}/${chunks.length} (${chunk.length} items)`);
    
    // Prepare batch write request
    const params = {
      RequestItems: {
        [CONFIG.tableName]: chunk.map(item => ({
          PutRequest: {
            Item: item
          }
        }))
      }
    };
    
    try {
      await dynamoDB.batchWrite(params).promise();
      successCount += chunk.length;
      console.log(`Batch ${i + 1} written successfully`);
    } catch (error) {
      errorCount += chunk.length;
      console.error(`Error writing batch ${i + 1}: ${error.message}`);
    }
  }
  
  console.log(`DynamoDB update complete: ${successCount} items written, ${errorCount} errors`);
  return { successCount, errorCount };
}

/**
 * Check if DynamoDB table exists
 * @return {Promise<boolean>} Promise that resolves to true if table exists
 */
async function checkTableExists() {
  try {
    const dynamodbClient = new AWS.DynamoDB();
    const response = await dynamodbClient.describeTable({ TableName: CONFIG.tableName }).promise();
    console.log(`Table ${CONFIG.tableName} exists`);
    return true;
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      console.log(`Table ${CONFIG.tableName} does not exist`);
      return false;
    }
    throw error;
  }
}

/**
 * Create DynamoDB table
 * @return {Promise} Promise that resolves when table is created
 */
async function createTable() {
  const dynamodbClient = new AWS.DynamoDB();
  
  const params = {
    TableName: CONFIG.tableName,
    KeySchema: [
      { AttributeName: 'date', KeyType: 'HASH' } // Partition key
    ],
    AttributeDefinitions: [
      { AttributeName: 'date', AttributeType: 'S' }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  };
  
  try {
    console.log(`Creating table ${CONFIG.tableName}...`);
    await dynamodbClient.createTable(params).promise();
    
    // Wait for table to be created
    console.log('Waiting for table to be created...');
    await dynamodbClient.waitFor('tableExists', { TableName: CONFIG.tableName }).promise();
    
    console.log(`Table ${CONFIG.tableName} created successfully`);
  } catch (error) {
    console.error(`Error creating table: ${error.message}`);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Check if DynamoDB table exists, create if not
    const tableExists = await checkTableExists();
    if (!tableExists) {
      await createTable();
    }
    
    // Create a start date for when the CNN Fear & Greed Index began (Spring 2012)
    const indexStartDate = new Date('2012-04-01'); // April 1, 2012 as an approximate start date
    console.log(`Attempting to retrieve data from the beginning of the Fear & Greed Index (${indexStartDate.toDateString()})`);
    
    // Fetch data from CNN API with the start date
    const cnnData = await fetchFearAndGreedIndexData(indexStartDate);
    
    // Extract historical data points
    const historicalData = extractHistoricalDataPoints(cnnData);
    console.log(`Extracted ${historicalData.length} data points`);
    
    // Save data to files for backup
    saveToJsonFile(historicalData, CONFIG.outputJsonFile);
    saveToCsvFile(historicalData, CONFIG.outputCsvFile);
    
    // Transform data for DynamoDB
    const dynamoDBItems = transformToDynamoDBItems(historicalData);
    
    // Write to DynamoDB
    const result = await writeToDynamoDB(dynamoDBItems);
    
    console.log('Process complete');
    console.log(`Total data points: ${historicalData.length}`);
    console.log(`Successfully written to DynamoDB: ${result.successCount}`);
    console.log(`Errors: ${result.errorCount}`);
    
    // Find earliest and latest dates
    const dates = historicalData.map(item => new Date(item.timestamp_ms));
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    const latest = new Date(Math.max(...dates.map(d => d.getTime())));
    
    console.log(`Date range in data: ${earliest.toISOString()} to ${latest.toISOString()}`);
    console.log(`That's approximately ${Math.round((latest - earliest) / (1000 * 60 * 60 * 24))} days of data`);
    
    // Check if we got data from 2012
    if (earliest.getFullYear() > 2012) {
      console.log(`\nNOTE: The earliest data available from the CNN API is from ${earliest.toDateString()}.`);
      console.log(`This is more recent than the Fear & Greed Index launch in 2012.`);
      console.log(`The CNN free API appears to limit historical data to approximately ${Math.round((latest - earliest) / (1000 * 60 * 60 * 24 * 30))} months.`);
    }
    
  } catch (error) {
    console.error(`Error in main process: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main();
