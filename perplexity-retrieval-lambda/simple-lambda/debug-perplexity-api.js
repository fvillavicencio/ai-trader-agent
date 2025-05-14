// Script to debug Perplexity API connection
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Check if PERPLEXITY_API_KEY is available in environment variables
const apiKey = process.env.PERPLEXITY_API_KEY || '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';

if (!apiKey) {
  console.error('Error: PERPLEXITY_API_KEY not available');
  process.exit(1);
}

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Simple test prompt
const testPrompt = `
What are the 3 most significant geopolitical events from the past week that are impacting financial markets?
Please format your response as a valid JSON array with the following structure:
[
  {
    "headline": "Brief headline of the event",
    "date": "YYYY-MM-DD",
    "description": "Brief description of the event",
    "region": "Affected region",
    "source": "Source name",
    "url": "URL to article"
  }
]
`;

// Function to call Perplexity API
async function callPerplexityAPI(prompt, apiKey, temperature = 0.0) {
  try {
    console.log('Calling Perplexity API...');
    console.log('API Key (first 5 chars):', apiKey.substring(0, 5) + '...');
    
    // Log request details for debugging
    const requestData = {
      model: 'sonar-medium-online',
      messages: [
        {
          role: 'system',
          content: 'You are a geopolitical and financial markets expert. Provide factual, data-driven analysis based on real events and their market impacts.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: temperature,
      max_tokens: 2000,
      stream: false
    };
    
    console.log('Request URL:', 'https://api.perplexity.ai/chat/completions');
    console.log('Request model:', requestData.model);
    
    const response = await axios({
      method: 'post',
      url: 'https://api.perplexity.ai/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: requestData,
      timeout: 30000 // 30 second timeout
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', JSON.stringify(response.headers));
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message.content;
      console.log('Received response from Perplexity API');
      console.log('Response content (first 100 chars):', content.substring(0, 100) + '...');
      return content;
    } else {
      console.error('Invalid response format:', JSON.stringify(response.data));
      throw new Error('Invalid response format from Perplexity API');
    }
  } catch (error) {
    console.error('Error calling Perplexity API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data));
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    throw error;
  }
}

// Main function
async function testPerplexityAPI() {
  try {
    console.log('Starting Perplexity API test...');
    const startTime = Date.now();
    
    const content = await callPerplexityAPI(testPrompt, apiKey, 0.1);
    
    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000;
    
    console.log(`API call completed in ${executionTime.toFixed(2)} seconds`);
    
    // Try to parse the response as JSON
    let jsonData;
    try {
      // First try direct parsing
      jsonData = JSON.parse(content);
      console.log('Successfully parsed response as JSON directly');
    } catch (error) {
      console.log('Direct JSON parsing failed, trying to extract from response...');
      
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          console.log('Found JSON in code block, attempting to parse...');
          jsonData = JSON.parse(jsonMatch[1]);
          console.log('Successfully parsed JSON from code block');
        } catch (codeBlockError) {
          console.error('Failed to parse JSON from code block:', codeBlockError);
        }
      }
      
      // If code block extraction failed, try to find any JSON-like structure
      if (!jsonData) {
        const jsonArrayMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonArrayMatch) {
          try {
            console.log('Found JSON array structure, attempting to parse...');
            jsonData = JSON.parse(jsonArrayMatch[0]);
            console.log('Successfully parsed JSON from array match');
          } catch (arrayMatchError) {
            console.error('Failed to parse JSON from array match:', arrayMatchError);
          }
        }
      }
    }
    
    // Save the raw response
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const rawOutputFile = path.join(outputDir, `perplexity-raw-${timestamp}.txt`);
    fs.writeFileSync(rawOutputFile, content);
    console.log(`Saved raw response to: ${rawOutputFile}`);
    
    // If we have JSON data, save it as well
    if (jsonData) {
      const formattedJson = JSON.stringify(jsonData, null, 2);
      const jsonOutputFile = path.join(outputDir, `perplexity-json-${timestamp}.json`);
      fs.writeFileSync(jsonOutputFile, formattedJson);
      console.log(`Saved parsed JSON to: ${jsonOutputFile}`);
      console.log('JSON data sample:', JSON.stringify(jsonData).substring(0, 200) + '...');
    } else {
      console.log('Could not parse response as JSON. Check the raw response file.');
    }
    
    console.log('Test completed successfully.');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testPerplexityAPI();
