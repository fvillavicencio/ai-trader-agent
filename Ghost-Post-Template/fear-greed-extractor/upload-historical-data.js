/**
 * Script to extract historical Fear and Greed Index data from a JSON file
 * and upload it to DynamoDB
 */

const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../src/.env') });

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Initialize DynamoDB client
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Constants
const CONFIG = {
  tableName: 'fear_greed_index',
  sourceFile: './historical-fear-and-greed-index-data.json',
  batchSize: 25 // DynamoDB allows max 25 items per batch write
};

/**
 * Check if the DynamoDB table exists
 * @return {Promise<boolean>} True if table exists, false otherwise
 */
async function checkTableExists() {
  try {
    const dynamoDBClient = new AWS.DynamoDB();
    await dynamoDBClient.describeTable({ TableName: CONFIG.tableName }).promise();
    console.log(`Table ${CONFIG.tableName} exists`);
    return true;
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      console.log(`Table ${CONFIG.tableName} does not exist`);
      return false;
    }
    console.error(`Error checking if table exists: ${error.message}`);
    throw error;
  }
}

/**
 * Create the DynamoDB table
 */
async function createTable() {
  try {
    const dynamoDBClient = new AWS.DynamoDB();
    
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
    
    await dynamoDBClient.createTable(params).promise();
    console.log(`Created table ${CONFIG.tableName}`);
    
    // Wait for table to be created
    console.log('Waiting for table to be active...');
    await dynamoDBClient.waitFor('tableExists', { TableName: CONFIG.tableName }).promise();
    console.log('Table is now active');
    
    return true;
  } catch (error) {
    console.error(`Error creating table: ${error.message}`);
    throw error;
  }
}

/**
 * Read and parse the historical data JSON file
 * @return {Array} Array of historical data points
 */
function readHistoricalData() {
  try {
    const rawData = fs.readFileSync(CONFIG.sourceFile, 'utf8');
    const jsonData = JSON.parse(rawData);
    
    // Extract the historical data points from the fear_and_greed_historical.data array
    if (jsonData.fear_and_greed_historical && jsonData.fear_and_greed_historical.data) {
      const historicalData = jsonData.fear_and_greed_historical.data;
      console.log(`Extracted ${historicalData.length} historical data points from JSON file`);
      return historicalData;
    } else {
      throw new Error('Could not find fear_and_greed_historical.data in the JSON file');
    }
  } catch (error) {
    console.error(`Error reading historical data: ${error.message}`);
    throw error;
  }
}

/**
 * Transform data points to DynamoDB format
 * @param {Array} dataPoints - Array of historical data points
 * @return {Array} Array of items formatted for DynamoDB
 */
function transformToDynamoDBItems(dataPoints) {
  return dataPoints.map(point => {
    // Convert timestamp to date string (YYYY-MM-DD)
    const date = new Date(point.x);
    const dateString = date.toISOString().split('T')[0];
    
    return {
      date: dateString,
      timestamp_ms: point.x,
      score: point.y,
      rating: point.rating,
      created_at: new Date().toISOString()
    };
  });
}

/**
 * Write items to DynamoDB in batches
 * @param {Array} items - Array of items to write to DynamoDB
 * @return {Promise<Object>} Result with success and error counts
 */
async function writeToDynamoDB(items) {
  let successCount = 0;
  let errorCount = 0;
  
  // Split items into batches of 25 (DynamoDB limit)
  const batches = [];
  for (let i = 0; i < items.length; i += CONFIG.batchSize) {
    batches.push(items.slice(i, i + CONFIG.batchSize));
  }
  
  console.log(`Writing ${items.length} items to DynamoDB in ${batches.length} batches`);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} items)`);
    
    const params = {
      RequestItems: {
        [CONFIG.tableName]: batch.map(item => ({
          PutRequest: {
            Item: item
          }
        }))
      }
    };
    
    try {
      await dynamoDB.batchWrite(params).promise();
      console.log(`Batch ${i + 1} written successfully`);
      successCount += batch.length;
    } catch (error) {
      console.error(`Error writing batch ${i + 1}: ${error.message}`);
      errorCount += batch.length;
    }
  }
  
  console.log(`DynamoDB update complete: ${successCount} items written, ${errorCount} errors`);
  
  return {
    successCount,
    errorCount
  };
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
    
    // Read historical data from JSON file
    const historicalData = readHistoricalData();
    
    // Transform data for DynamoDB
    const dynamoDBItems = transformToDynamoDBItems(historicalData);
    
    // Write to DynamoDB
    const result = await writeToDynamoDB(dynamoDBItems);
    
    console.log('Process complete');
    console.log(`Total data points: ${historicalData.length}`);
    console.log(`Successfully written to DynamoDB: ${result.successCount}`);
    console.log(`Errors: ${result.errorCount}`);
    
    // Find earliest and latest dates
    const dates = dynamoDBItems.map(item => new Date(item.timestamp_ms));
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    const latest = new Date(Math.max(...dates.map(d => d.getTime())));
    
    console.log(`Date range in data: ${earliest.toISOString()} to ${latest.toISOString()}`);
    console.log(`That's approximately ${Math.round((latest - earliest) / (1000 * 60 * 60 * 24))} days of data`);
    
  } catch (error) {
    console.error(`Error in main process: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();
