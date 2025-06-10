/**
 * Query DynamoDB for Fear and Greed Index data
 * 
 * This script fetches the oldest and latest entries from the Fear and Greed Index DynamoDB table
 */

const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS SDK
const region = process.env.AWS_REGION || 'us-east-2';
const tableName = process.env.DYNAMODB_TABLE_NAME || 'fear_greed_index';

AWS.config.update({ 
  region,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Create DynamoDB client
const dynamoDB = new AWS.DynamoDB.DocumentClient();

/**
 * Get the oldest entry in the Fear and Greed Index table
 */
async function getOldestEntry() {
  // First get all items and sort by timestamp
  const params = {
    TableName: tableName,
    ProjectionExpression: 'timestamp_ms, #date, score, rating',
    ExpressionAttributeNames: {
      '#date': 'date'
    }
  };
  
  try {
    console.log('Fetching oldest entry...');
    const data = await dynamoDB.scan(params).promise();
    
    if (!data.Items || data.Items.length === 0) {
      console.log('No entries found in the table');
      return null;
    }
    
    // Sort by timestamp (ascending)
    const sortedItems = data.Items.sort((a, b) => a.timestamp_ms - b.timestamp_ms);
    
    // Return the first item (oldest)
    return sortedItems[0];
  } catch (error) {
    console.error(`Error fetching oldest entry: ${error.message}`);
    throw error;
  }
}

/**
 * Get the latest entry in the Fear and Greed Index table
 */
async function getLatestEntry() {
  // First get all items and sort by timestamp
  const params = {
    TableName: tableName,
    ProjectionExpression: 'timestamp_ms, #date, score, rating',
    ExpressionAttributeNames: {
      '#date': 'date'
    }
  };
  
  try {
    console.log('Fetching latest entry...');
    const data = await dynamoDB.scan(params).promise();
    
    if (!data.Items || data.Items.length === 0) {
      console.log('No entries found in the table');
      return null;
    }
    
    // Sort by timestamp (descending)
    const sortedItems = data.Items.sort((a, b) => b.timestamp_ms - a.timestamp_ms);
    
    // Return the first item (newest)
    return sortedItems[0];
  } catch (error) {
    console.error(`Error fetching latest entry: ${error.message}`);
    throw error;
  }
}

/**
 * Format date from timestamp
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

/**
 * Main function
 */
/**
 * Get the total count of entries in the table
 */
async function getEntryCount() {
  const params = {
    TableName: tableName,
    Select: 'COUNT'
  };
  
  try {
    console.log('Counting entries...');
    const data = await dynamoDB.scan(params).promise();
    return data.Count;
  } catch (error) {
    console.error(`Error counting entries: ${error.message}`);
    throw error;
  }
}

async function main() {
  try {
    console.log(`Querying DynamoDB table: ${tableName} in region: ${region}`);
    
    const entryCount = await getEntryCount();
    console.log(`Total entries in table: ${entryCount}`);
    
    const oldestEntry = await getOldestEntry();
    const latestEntry = await getLatestEntry();
    
    console.log('\n=== OLDEST ENTRY ===');
    if (oldestEntry) {
      console.log(`Date: ${oldestEntry.date || formatDate(oldestEntry.timestamp_ms)}`);
      console.log(`Timestamp: ${oldestEntry.timestamp_ms} (${new Date(oldestEntry.timestamp_ms).toISOString()})`);
      console.log(`Score: ${oldestEntry.score}`);
      console.log(`Rating: ${oldestEntry.rating}`);
    } else {
      console.log('No oldest entry found');
    }
    
    console.log('\n=== LATEST ENTRY ===');
    if (latestEntry) {
      console.log(`Date: ${latestEntry.date || formatDate(latestEntry.timestamp_ms)}`);
      console.log(`Timestamp: ${latestEntry.timestamp_ms} (${new Date(latestEntry.timestamp_ms).toISOString()})`);
      console.log(`Score: ${latestEntry.score}`);
      console.log(`Rating: ${latestEntry.rating}`);
    } else {
      console.log('No latest entry found');
    }
    
    console.log('\n=== DATA RANGE ===');
    if (oldestEntry && latestEntry) {
      const daysDifference = Math.floor((latestEntry.timestamp_ms - oldestEntry.timestamp_ms) / (1000 * 60 * 60 * 24));
      console.log(`The database contains ${daysDifference} days of Fear and Greed Index data`);
      console.log(`Date range: ${oldestEntry.date} to ${latestEntry.date}`);
    }
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main();
