/**
 * Process JSON to HTML Script
 * 
 * This script takes a JSON input file from Google Drive, processes it with the Lambda function,
 * and saves the output HTML to a specified file.
 * 
 * Usage: node process-json-to-html.js [input-json-file] [output-html-file]
 * If no arguments are provided, it uses default paths.
 */

const fs = require('fs');
const path = require('path');
const { handler } = require('../src/index');

// Default paths - update these to match your Google Drive exported JSON file
const DEFAULT_INPUT_PATH = path.join('/Users/frankvillavicencio/Documents/Development/Market Pulse Daily/full-json-dataset.json');
const DEFAULT_OUTPUT_PATH = path.join('/Users/frankvillavicencio/Documents/Development/Market Pulse Daily/MarketPulseDaily.html');

async function processWithLambda(inputPath, outputPath) {
  console.log(`Processing input file: ${inputPath}`);
  console.log(`Output will be saved to: ${outputPath}`);
  
  try {
    // Read and parse the input JSON file
    const inputData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    
    // Add isTest flag to get more detailed output
    inputData.isTest = true;
    
    // Call the Lambda handler with the input data
    console.log('Calling Lambda handler...');
    const result = await handler(inputData);
    
    // Log the result status
    console.log(`Status code: ${result.statusCode}`);
    
    // Parse the response body
    const responseBody = JSON.parse(result.body);
    
    // Save the HTML output to the specified file
    fs.writeFileSync(outputPath, responseBody.html);
    console.log(`HTML output saved to: ${outputPath}`);
    
    // Log any comments
    if (responseBody.comments && responseBody.comments.length > 0) {
      console.log('\nComments:');
      responseBody.comments.forEach(comment => console.log(`- ${comment}`));
    } else {
      console.log('\nNo comments returned.');
    }
    
    console.log('\nProcessing completed successfully!');
    return true;
  } catch (error) {
    console.error(`Error processing JSON to HTML: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const inputPath = args[0] || DEFAULT_INPUT_PATH;
const outputPath = args[1] || DEFAULT_OUTPUT_PATH;

// Process the file
processWithLambda(inputPath, outputPath)
  .then(success => {
    if (success) {
      console.log('HTML generation completed successfully.');
    } else {
      console.error('HTML generation failed.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
