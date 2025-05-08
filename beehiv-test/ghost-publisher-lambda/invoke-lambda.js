/**
 * Invoke Ghost Publisher Lambda Function
 * 
 * This script:
 * 1. Reads input from a JSON file
 * 2. Invokes the deployed Lambda function
 * 3. Displays the results
 */

const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS SDK
AWS.config.update({ region: process.env.AWS_REGION || 'us-east-2' });
const lambda = new AWS.Lambda();

// Parse command line arguments
const args = process.argv.slice(2);
const inputFile = args[0] || 'test-input.json';
const functionName = args[1] || 'GhostPublisherFunction';

async function invokeLambda() {
  try {
    console.log(`Reading input from ${inputFile}...`);
    
    // Read the input JSON file
    const inputPath = path.resolve(process.cwd(), inputFile);
    if (!fs.existsSync(inputPath)) {
      console.error(`Error: Input file ${inputPath} not found`);
      process.exit(1);
    }
    
    const inputData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    
    // If the input contains a path to a mobiledoc file, read that file
    if (inputData.mobiledocPath) {
      const mobiledocPath = path.resolve(process.cwd(), inputData.mobiledocPath);
      if (fs.existsSync(mobiledocPath)) {
        console.log(`Reading mobiledoc from ${mobiledocPath}...`);
        inputData.mobiledoc = fs.readFileSync(mobiledocPath, 'utf8');
        delete inputData.mobiledocPath;
      } else {
        console.error(`Warning: Mobiledoc file ${mobiledocPath} not found`);
      }
    }
    
    // If the input contains a path to a data file, read that file
    if (inputData.dataPath) {
      const dataPath = path.resolve(process.cwd(), inputData.dataPath);
      if (fs.existsSync(dataPath)) {
        console.log(`Reading data from ${dataPath}...`);
        inputData.data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        delete inputData.dataPath;
      } else {
        console.error(`Warning: Data file ${dataPath} not found`);
      }
    }
    
    console.log(`Invoking Lambda function: ${functionName}...`);
    
    // Prepare the payload
    const params = {
      FunctionName: functionName,
      Payload: JSON.stringify(inputData)
    };
    
    // Invoke the Lambda function
    const response = await lambda.invoke(params).promise();
    
    // Parse the response
    const result = JSON.parse(response.Payload);
    
    console.log('\nLambda function result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.statusCode === 200) {
      console.log('\n✅ Success!');
      console.log(`Post URL: ${result.body.postUrl}`);
      console.log(`Title: ${result.body.title}`);
      console.log(`\nMembers summary:`);
      console.log(`- Paid members: ${result.body.members.paid.length}`);
      console.log(`- Free members: ${result.body.members.free.length}`);
      console.log(`- Comped members: ${result.body.members.comped.length}`);
      
      // Save the result to a file
      const outputFile = `lambda-result-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
      console.log(`\nResult saved to ${outputFile}`);
    } else {
      console.log('\n❌ Error!');
      console.log(`Error message: ${result.body.error}`);
    }
  } catch (error) {
    console.error('Error invoking Lambda function:', error);
    process.exit(1);
  }
}

invokeLambda();
