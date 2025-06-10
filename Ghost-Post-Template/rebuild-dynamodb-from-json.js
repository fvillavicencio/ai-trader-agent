/**
 * Script to wipe and rebuild the Fear and Greed Index DynamoDB table
 * using the historical JSON data file
 */

const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../src/.env') });

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-2', // Using us-east-2 to match the query script
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Initialize DynamoDB clients
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const dynamoDBClient = new AWS.DynamoDB();

// Constants
const CONFIG = {
  tableName: process.env.DYNAMODB_TABLE_NAME || 'fear_greed_index',
  sourceFile: path.resolve(__dirname, 'historical-fear-and-greed-index-data.json'),
  batchSize: 25 // DynamoDB allows max 25 items per batch write
};

/**
 * Delete the existing DynamoDB table
 */
async function deleteTable() {
  try {
    console.log(`Deleting table ${CONFIG.tableName}...`);
    await dynamoDBClient.deleteTable({ TableName: CONFIG.tableName }).promise();
    console.log(`Table ${CONFIG.tableName} deletion initiated`);
    
    // Wait for table to be deleted
    console.log('Waiting for table to be deleted...');
    await dynamoDBClient.waitFor('tableNotExists', { TableName: CONFIG.tableName }).promise();
    console.log('Table has been deleted');
    
    return true;
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      console.log(`Table ${CONFIG.tableName} does not exist, no need to delete`);
      return true;
    }
    console.error(`Error deleting table: ${error.message}`);
    throw error;
  }
}

/**
 * Create the DynamoDB table
 */
async function createTable() {
  try {
    const params = {
      TableName: CONFIG.tableName,
      KeySchema: [
        { AttributeName: 'timestamp_ms', KeyType: 'HASH' } // Partition key
      ],
      AttributeDefinitions: [
        { AttributeName: 'timestamp_ms', AttributeType: 'N' },
        { AttributeName: 'date', AttributeType: 'S' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'DateIndex',
          KeySchema: [
            { AttributeName: 'date', KeyType: 'HASH' }
          ],
          Projection: {
            ProjectionType: 'ALL'
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    };
    
    console.log(`Creating table ${CONFIG.tableName}...`);
    await dynamoDBClient.createTable(params).promise();
    console.log(`Table ${CONFIG.tableName} creation initiated`);
    
    // Wait for table to be created
    console.log('Waiting for table to become active...');
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
    console.log(`Reading historical data from ${CONFIG.sourceFile}`);
    const rawData = fs.readFileSync(CONFIG.sourceFile, 'utf8');
    const jsonData = JSON.parse(rawData);
    
    // Extract the historical data points from the fear_and_greed_historical.data array
    if (jsonData.fear_and_greed_historical && jsonData.fear_and_greed_historical.data) {
      const historicalData = jsonData.fear_and_greed_historical.data;
      console.log(`Extracted ${historicalData.length} historical data points from JSON file`);
      
      // Also include the current fear and greed data if available
      if (jsonData.fear_and_greed) {
        const currentData = {
          x: jsonData.fear_and_greed_historical.timestamp,
          y: jsonData.fear_and_greed.score,
          rating: jsonData.fear_and_greed.rating
        };
        historicalData.push(currentData);
        console.log('Added current fear and greed data point');
      }
      
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
  // First, deduplicate by timestamp to avoid key conflicts
  const uniqueDataPoints = [];
  const seenTimestamps = new Set();
  
  for (const point of dataPoints) {
    if (!seenTimestamps.has(point.x)) {
      seenTimestamps.add(point.x);
      uniqueDataPoints.push(point);
    } else {
      console.log(`Skipping duplicate timestamp: ${point.x} (${new Date(point.x).toISOString()})`);
    }
  }
  
  console.log(`Removed ${dataPoints.length - uniqueDataPoints.length} duplicate timestamps`);
  
  return uniqueDataPoints.map(point => {
    // Convert timestamp to date string (YYYY-MM-DD)
    const date = new Date(point.x);
    const dateString = date.toISOString().split('T')[0];
    
    // Ensure y value is a number
    let score = parseFloat(point.y);
    if (isNaN(score)) {
      // If score is NaN, use a default value based on rating
      switch(point.rating?.toLowerCase()) {
        case 'extreme fear': score = 15; break;
        case 'fear': score = 35; break;
        case 'neutral': score = 50; break;
        case 'greed': score = 65; break;
        case 'extreme greed': score = 85; break;
        default: score = 50; // Default to neutral
      }
    }
    
    return {
      date: dateString,
      timestamp_ms: point.x,
      score: score, // Using 'score' to match the field name expected by query scripts
      rating: point.rating, // Using 'rating' to match the field name expected by query scripts
      value: score, // Keep 'value' for backward compatibility
      classification: point.rating, // Keep 'classification' for backward compatibility
      created_at: new Date().toISOString()
    };
  });
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
 * Write items to DynamoDB in batches
 * @param {Array} items - Array of items to write to DynamoDB
 * @return {Promise<Object>} Result with success and error counts
 */
async function writeToDynamoDB(items) {
  let successCount = 0;
  let errorCount = 0;
  
  // Split items into batches
  const batches = chunkArray(items, CONFIG.batchSize);
  
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
      
      // Add a small delay between batches to avoid throttling
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
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
    console.log('Starting DynamoDB rebuild process');
    
    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('AWS credentials not found. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
      process.exit(1);
    }
    
    // Delete existing table
    await deleteTable();
    
    // Create new table
    await createTable();
    
    // Read historical data from JSON file
    const historicalData = readHistoricalData();
    
    // Transform data for DynamoDB
    const dynamoDBItems = transformToDynamoDBItems(historicalData);
    
    // Write to DynamoDB
    const result = await writeToDynamoDB(dynamoDBItems);
    
    console.log('Process complete');
    console.log(`Total data points: ${historicalData.length}`);
    console.log(`Successfully written: ${result.successCount}`);
    console.log(`Errors: ${result.errorCount}`);
    
    if (result.errorCount > 0) {
      console.warn('WARNING: Some items were not written to DynamoDB');
    } else {
      console.log('SUCCESS: All items were written to DynamoDB');
    }
  } catch (error) {
    console.error(`Rebuild process failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();
