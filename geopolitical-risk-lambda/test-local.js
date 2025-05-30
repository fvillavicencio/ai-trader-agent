/**
 * Test script to run the Lambda function locally
 */
require('dotenv').config();
const { handler } = require('./index');

async function testRetrieveOperation() {
  console.log('Testing retrieve operation...');
  const event = {
    operation: 'retrieve'
  };
  
  const result = await handler(event);
  console.log('Retrieve operation result:', JSON.stringify(result, null, 2));
}

async function testRefreshOperation() {
  console.log('Testing refresh operation...');
  const event = {
    operation: 'refresh'
  };
  
  const result = await handler(event);
  console.log('Refresh operation result:', JSON.stringify(result, null, 2));
}

async function runTests() {
  try {
    // Test the refresh operation first
    await testRefreshOperation();
    
    // Then test the retrieve operation (which should use the cache)
    await testRetrieveOperation();
    
    // Test retrieve again to verify caching
    console.log('\nTesting caching (should be fast)...');
    await testRetrieveOperation();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();
