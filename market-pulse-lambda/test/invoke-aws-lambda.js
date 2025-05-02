/**
 * Script to invoke the AWS Lambda function with the full-sample-data.json
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Load the sample data
const sampleDataPath = path.resolve(__dirname, '..', '..', 'market-pulse-handlebars', 'v2', 'full-sample-data.json');
const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));

// Add isTest flag
sampleData.isTest = true;

// Save the input data to a temporary file
const inputFilePath = path.resolve(__dirname, 'lambda-input.json');
fs.writeFileSync(inputFilePath, JSON.stringify(sampleData, null, 2));

// Output file path
const outputFilePath = path.resolve(__dirname, 'aws-lambda-output.json');

// Function name
const functionName = 'MarketPulseDaily';

console.log(`Invoking AWS Lambda function ${functionName} with sample data...`);

// Invoke the Lambda function - escape the file paths to handle spaces
const command = `aws lambda invoke --function-name ${functionName} --payload fileb://"${inputFilePath}" "${outputFilePath}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error invoking Lambda function: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  
  console.log(`Lambda function invoked successfully: ${stdout}`);
  
  // Read the output
  try {
    const lambdaOutput = JSON.parse(fs.readFileSync(outputFilePath, 'utf8'));
    
    // Parse the response body
    const responseBody = JSON.parse(lambdaOutput.body);
    
    // Save the HTML output to a file
    const htmlOutputPath = path.resolve(__dirname, 'aws-lambda-output.html');
    fs.writeFileSync(htmlOutputPath, responseBody.html);
    console.log(`HTML output saved to: ${htmlOutputPath}`);
    
    // Log any comments
    if (responseBody.comments && responseBody.comments.length > 0) {
      console.log('\nComments:');
      responseBody.comments.forEach(comment => console.log(`- ${comment}`));
    } else {
      console.log('\nNo comments returned.');
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error(`Error processing Lambda output: ${error.message}`);
  }
});
