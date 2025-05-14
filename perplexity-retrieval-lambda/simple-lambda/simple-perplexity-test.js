// Simple script to test Perplexity API
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API Key
const apiKey = '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';

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Simple test function
async function testPerplexityAPI() {
  try {
    console.log('Testing Perplexity API with a simple query...');
    
    // Following the exact format from Perplexity documentation
    const response = await axios({
      method: 'post',
      url: 'https://api.perplexity.ai/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: {
        model: 'mistral-7b-instruct',  // Using a different model
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.'
          },
          {
            role: 'user',
            content: 'What are the top 3 geopolitical events affecting financial markets this week?'
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message.content;
      console.log('Received response:');
      console.log('-------------------');
      console.log(content);
      console.log('-------------------');
      
      // Save the response to a file
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      const outputFile = path.join(outputDir, `perplexity-simple-test-${timestamp}.txt`);
      fs.writeFileSync(outputFile, content);
      console.log(`Saved response to: ${outputFile}`);
    } else {
      console.log('Unexpected response format:', response.data);
    }
  } catch (error) {
    console.error('Error testing Perplexity API:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
  }
}

// Run the test
testPerplexityAPI();
