/**
 * CloudWatch Log Checker for Geopolitical Risk Lambda
 * 
 * This script fetches and analyzes CloudWatch logs for the geopolitical-risk-analyzer Lambda function
 * to help diagnose issues with the asynchronous processing.
 */

require('dotenv').config();
const { CloudWatchLogsClient, DescribeLogStreamsCommand, GetLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');
const fs = require('fs');
const path = require('path');

// Configuration
const REGION = 'us-east-2'; // AWS region where the Lambda function is deployed
const LOG_GROUP_NAME = '/aws/lambda/geopolitical-risk-analyzer'; // CloudWatch log group for the Lambda
const OUTPUT_FILE = path.join(__dirname, 'lambda-logs.txt');
const MAX_LOG_STREAMS = 3; // Number of most recent log streams to check

// Initialize the CloudWatch Logs client
const logsClient = new CloudWatchLogsClient({ 
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * Get the most recent log streams for the Lambda function
 * @returns {Promise<Array>} - Array of log stream objects
 */
async function getRecentLogStreams() {
  try {
    console.log(`Fetching recent log streams for ${LOG_GROUP_NAME}...`);
    
    const command = new DescribeLogStreamsCommand({
      logGroupName: LOG_GROUP_NAME,
      orderBy: 'LastEventTime',
      descending: true,
      limit: MAX_LOG_STREAMS
    });
    
    const response = await logsClient.send(command);
    
    if (!response.logStreams || response.logStreams.length === 0) {
      console.log('No log streams found');
      return [];
    }
    
    console.log(`Found ${response.logStreams.length} recent log streams`);
    return response.logStreams;
  } catch (error) {
    console.error('Error fetching log streams:', error.message);
    throw error;
  }
}

/**
 * Get log events from a specific log stream
 * @param {string} logStreamName - Name of the log stream
 * @returns {Promise<Array>} - Array of log event objects
 */
async function getLogEvents(logStreamName) {
  try {
    console.log(`Fetching log events from stream: ${logStreamName}`);
    
    const command = new GetLogEventsCommand({
      logGroupName: LOG_GROUP_NAME,
      logStreamName: logStreamName,
      startFromHead: true,
      limit: 10000 // Get a large number of log events
    });
    
    const response = await logsClient.send(command);
    
    if (!response.events || response.events.length === 0) {
      console.log('No log events found in this stream');
      return [];
    }
    
    console.log(`Found ${response.events.length} log events`);
    return response.events;
  } catch (error) {
    console.error(`Error fetching log events from stream ${logStreamName}:`, error.message);
    return [];
  }
}

/**
 * Analyze log events to find errors and issues
 * @param {Array} events - Array of log event objects
 * @returns {Object} - Analysis results
 */
function analyzeLogEvents(events) {
  const analysis = {
    totalEvents: events.length,
    errors: [],
    timeouts: [],
    openaiCalls: [],
    processingSteps: [],
    otherImportant: []
  };
  
  for (const event of events) {
    const message = event.message;
    const timestamp = new Date(event.timestamp).toISOString();
    
    // Check for errors
    if (message.includes('ERROR') || message.includes('Error') || message.includes('error')) {
      analysis.errors.push({ timestamp, message });
    }
    
    // Check for timeouts
    if (message.includes('timeout') || message.includes('Timeout') || message.includes('timed out')) {
      analysis.timeouts.push({ timestamp, message });
    }
    
    // Check for OpenAI API calls
    if (message.includes('OpenAI API') || message.includes('gpt-4')) {
      analysis.openaiCalls.push({ timestamp, message });
    }
    
    // Check for processing steps
    if (message.includes('processing') || message.includes('Processing') || message.includes('analyzing') || message.includes('Analyzing')) {
      analysis.processingSteps.push({ timestamp, message });
    }
    
    // Check for other important information
    if (message.includes('CRITICAL') || message.includes('WARNING') || message.includes('WARN') || message.includes('Important')) {
      analysis.otherImportant.push({ timestamp, message });
    }
  }
  
  return analysis;
}

/**
 * Format analysis results for output
 * @param {Object} analysis - Analysis results
 * @returns {string} - Formatted output
 */
function formatAnalysis(analysis) {
  let output = '=== LAMBDA FUNCTION LOG ANALYSIS ===\n\n';
  
  output += `Total Log Events: ${analysis.totalEvents}\n\n`;
  
  output += '=== ERRORS ===\n';
  if (analysis.errors.length === 0) {
    output += 'No errors found in logs.\n';
  } else {
    output += `Found ${analysis.errors.length} errors:\n`;
    analysis.errors.forEach((error, index) => {
      output += `\n[${error.timestamp}] ${error.message}`;
    });
  }
  
  output += '\n\n=== TIMEOUTS ===\n';
  if (analysis.timeouts.length === 0) {
    output += 'No timeouts found in logs.\n';
  } else {
    output += `Found ${analysis.timeouts.length} timeouts:\n`;
    analysis.timeouts.forEach((timeout, index) => {
      output += `\n[${timeout.timestamp}] ${timeout.message}`;
    });
  }
  
  output += '\n\n=== OPENAI API CALLS ===\n';
  if (analysis.openaiCalls.length === 0) {
    output += 'No OpenAI API calls found in logs.\n';
  } else {
    output += `Found ${analysis.openaiCalls.length} OpenAI API calls:\n`;
    analysis.openaiCalls.forEach((call, index) => {
      output += `\n[${call.timestamp}] ${call.message}`;
    });
  }
  
  output += '\n\n=== PROCESSING STEPS ===\n';
  if (analysis.processingSteps.length === 0) {
    output += 'No processing steps found in logs.\n';
  } else {
    output += `Found ${analysis.processingSteps.length} processing steps:\n`;
    analysis.processingSteps.forEach((step, index) => {
      output += `\n[${step.timestamp}] ${step.message}`;
    });
  }
  
  output += '\n\n=== OTHER IMPORTANT INFORMATION ===\n';
  if (analysis.otherImportant.length === 0) {
    output += 'No other important information found in logs.\n';
  } else {
    output += `Found ${analysis.otherImportant.length} important items:\n`;
    analysis.otherImportant.forEach((item, index) => {
      output += `\n[${item.timestamp}] ${item.message}`;
    });
  }
  
  return output;
}

/**
 * Main function
 */
async function main() {
  try {
    // Get recent log streams
    const logStreams = await getRecentLogStreams();
    
    if (logStreams.length === 0) {
      console.error('No log streams found. Cannot analyze logs.');
      process.exit(1);
    }
    
    let allEvents = [];
    
    // Get log events from each stream
    for (const stream of logStreams) {
      const events = await getLogEvents(stream.logStreamName);
      allEvents = allEvents.concat(events);
    }
    
    if (allEvents.length === 0) {
      console.error('No log events found in any stream. Cannot analyze logs.');
      process.exit(1);
    }
    
    // Sort events by timestamp
    allEvents.sort((a, b) => a.timestamp - b.timestamp);
    
    // Analyze log events
    const analysis = analyzeLogEvents(allEvents);
    
    // Format analysis results
    const formattedAnalysis = formatAnalysis(analysis);
    
    // Save to file
    fs.writeFileSync(OUTPUT_FILE, formattedAnalysis);
    console.log(`Analysis saved to ${OUTPUT_FILE}`);
    
    // Output raw logs for reference
    const rawLogsFile = path.join(__dirname, 'lambda-logs-raw.txt');
    fs.writeFileSync(rawLogsFile, allEvents.map(e => `[${new Date(e.timestamp).toISOString()}] ${e.message}`).join(''));
    console.log(`Raw logs saved to ${rawLogsFile}`);
    
    // Print summary to console
    console.log('\n=== ANALYSIS SUMMARY ===');
    console.log(`Total Log Events: ${analysis.totalEvents}`);
    console.log(`Errors: ${analysis.errors.length}`);
    console.log(`Timeouts: ${analysis.timeouts.length}`);
    console.log(`OpenAI API Calls: ${analysis.openaiCalls.length}`);
    console.log(`Processing Steps: ${analysis.processingSteps.length}`);
    console.log(`Other Important Items: ${analysis.otherImportant.length}`);
    
    if (analysis.errors.length > 0) {
      console.log('\nMost recent error:');
      const lastError = analysis.errors[analysis.errors.length - 1];
      console.log(`[${lastError.timestamp}] ${lastError.message}`);
    }
    
    console.log('\nAnalysis completed successfully!');
  } catch (error) {
    console.error('Analysis failed:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();
