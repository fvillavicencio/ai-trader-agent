/**
 * Bootstrap DynamoDB with Historical Fear and Greed Index Data
 * 
 * This script reads historical Fear and Greed Index data from a CSV file
 * and uploads it to an AWS DynamoDB table.
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const AWS = require('aws-sdk');
const { DateTime } = require('luxon');

// Configuration
const CONFIG = {
  csvFilePath: path.join(__dirname, 'historical_data.csv'),
  tableName: process.env.DYNAMODB_TABLE_NAME || 'fear_greed_index',
  region: process.env.AWS_REGION || 'us-east-1',
  batchSize: 25 // DynamoDB allows max 25 items per batch write
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
 * Read and parse CSV file
 * @return {Array} Array of data objects from CSV
 */
function readCsvData() {
  try {
    const fileContent = fs.readFileSync(CONFIG.csvFilePath, 'utf8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`Read ${records.length} records from CSV file`);
    return records;
  } catch (error) {
    console.error(`Error reading CSV file: ${error.message}`);
    throw error;
  }
}

/**
 * Transform CSV records to DynamoDB items
 * @param {Array} records - CSV records
 * @return {Array} Array of DynamoDB items
 */
function transformRecords(records) {
  return records.map(record => {
    // Parse timestamp_ms as number
    const timestamp = parseInt(record.timestamp_ms, 10);
    
    // Parse score as number
    const score = parseFloat(record.score);
    
    // Format date string (if not present in the record)
    const date = record.date || DateTime.fromMillis(timestamp).toFormat('yyyy-MM-dd');
    
    return {
      timestamp_ms: timestamp,
      date: date,
      score: score,
      rating: record.rating,
      year: parseInt(date.split('-')[0], 10),
      month: parseInt(date.split('-')[1], 10),
      day: parseInt(date.split('-')[2], 10)
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
 * @param {Array} items - Items to write
 * @return {Promise} Promise that resolves when all batches are written
 */
async function writeToDynamoDB(items) {
  // Split items into chunks of batchSize
  const chunks = chunkArray(items, CONFIG.batchSize);
  console.log(`Writing ${items.length} items to DynamoDB in ${chunks.length} batches`);
  
  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing batch ${i + 1}/${chunks.length} (${chunk.length} items)`);
    
    // Create batch write request
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
      console.log(`Successfully wrote batch ${i + 1}`);
    } catch (error) {
      console.error(`Error writing batch ${i + 1}: ${error.message}`);
      throw error;
    }
    
    // Add a small delay between batches to avoid throttling
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Check if DynamoDB table exists
 * @return {Promise<boolean>} Promise that resolves to true if table exists
 */
async function checkTableExists() {
  const dynamoDBClient = new AWS.DynamoDB();
  
  try {
    const data = await dynamoDBClient.describeTable({ TableName: CONFIG.tableName }).promise();
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
 * Create DynamoDB table
 * @return {Promise} Promise that resolves when table is created
 */
async function createTable() {
  const dynamoDBClient = new AWS.DynamoDB();
  
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
  
  try {
    await dynamoDBClient.createTable(params).promise();
    console.log(`Table ${CONFIG.tableName} created successfully`);
    
    // Wait for table to become active
    console.log('Waiting for table to become active...');
    await dynamoDBClient.waitFor('tableExists', { TableName: CONFIG.tableName }).promise();
    console.log('Table is now active');
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
    console.log('Starting DynamoDB bootstrap process');
    
    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('AWS credentials not found. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
      process.exit(1);
    }
    
    // Check if table exists, create if it doesn't
    const tableExists = await checkTableExists();
    if (!tableExists) {
      await createTable();
    }
    
    // Read and parse CSV data
    const records = readCsvData();
    
    // Transform records to DynamoDB items
    const items = transformRecords(records);
    
    // Write items to DynamoDB
    await writeToDynamoDB(items);
    
    console.log('Bootstrap process completed successfully');
  } catch (error) {
    console.error(`Bootstrap process failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main();
