require('dotenv').config({ path: '../src/.env' });
const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function findDateRange() {
  try {
    // First, scan to get all items (this is inefficient for large tables but works for our purpose)
    console.log('Scanning DynamoDB table fear_greed_index...');
    
    const params = {
      TableName: 'fear_greed_index',
      ProjectionExpression: '#dateAttr',
      ExpressionAttributeNames: {
        '#dateAttr': 'date'
      }
    };
    
    let items = [];
    let scanResults = await dynamodb.scan(params).promise();
    items = items.concat(scanResults.Items);
    
    // Continue scanning if we have more items (pagination)
    while (scanResults.LastEvaluatedKey) {
      params.ExclusiveStartKey = scanResults.LastEvaluatedKey;
      scanResults = await dynamodb.scan(params).promise();
      items = items.concat(scanResults.Items);
      console.log(`Retrieved ${items.length} items so far...`);
    }
    
    console.log(`Total items in table: ${items.length}`);
    
    if (items.length === 0) {
      console.log('No items found in the table.');
      return;
    }
    
    // Convert string dates to Date objects for comparison
    const dates = items.map(item => new Date(item.date));
    
    // Find oldest and newest dates
    const oldestDate = new Date(Math.min(...dates));
    const newestDate = new Date(Math.max(...dates));
    
    console.log(`Oldest entry: ${oldestDate.toISOString().split('T')[0]}`);
    console.log(`Newest entry: ${newestDate.toISOString().split('T')[0]}`);
    console.log(`Date range spans ${Math.floor((newestDate - oldestDate) / (1000 * 60 * 60 * 24))} days`);
    
  } catch (error) {
    console.error('Error querying DynamoDB:', error);
  }
}

findDateRange();
