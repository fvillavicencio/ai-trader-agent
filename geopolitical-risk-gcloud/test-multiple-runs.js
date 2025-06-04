/**
 * Test Multiple Runs for Google Cloud Function
 * 
 * This script runs the geopolitical risk API multiple times with a delay between runs,
 * saves the output of each run, and calculates execution statistics.
 * 
 * It will run 5 times with 45-minute intervals between runs.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { promisify } = require('util');

// Create output directory if it doesn't exist
const OUTPUT_DIR = path.join(__dirname, 'comparison-results');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Configuration
const NUM_RUNS = 1; // Single run per execution
const DELAY_MINUTES = 45; // 45 minute delay between test runs
const PROVIDERS = ['both']; // Using 'both' provider for all runs

// For multiple executions with spacing
const TOTAL_EXECUTIONS = 5; // Run the script 5 times
const CURRENT_EXECUTION = parseInt(process.env.CURRENT_EXECUTION || '1', 10); // Track current execution

// API Configuration
const API_ENDPOINT = process.env.API_ENDPOINT || 'https://us-central1-geopolitical-risk-analysis.cloudfunctions.net/geopoliticalRiskAPI';
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error('ERROR: API_KEY environment variable is required');
  process.exit(1);
}

// Utility to wait for a specified time
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Random provider selection
function getRandomProvider() {
  const providers = ['perplexity', 'openai'];
  const randomIndex = Math.floor(Math.random() * providers.length);
  return providers[randomIndex];
}

// Get provider description for logging and filenames
function getProviderDescription(provider) {
  switch(provider) {
    case 'perplexity': return 'Perplexity';
    case 'openai': return 'OpenAI';
    case 'both': return 'Parallel-Both';
    case 'random': return 'Random';
    default: return provider || 'unknown';
  }
}

// Extract all URLs from a result
function extractUrls(result) {
  const urls = [];
  
  if (result && result.risks && Array.isArray(result.risks)) {
    result.risks.forEach(risk => {
      if (risk.sources && Array.isArray(risk.sources)) {
        risk.sources.forEach(source => {
          if (source.url && typeof source.url === 'string') {
            urls.push({
              riskName: risk.title,
              sourceName: source.name,
              url: source.url
            });
          }
        });
      }
    });
  }
  
  return urls;
}

// Check for InsightSentry source names
function checkInsightSentrySources(result) {
  const insightSentrySources = [];
  
  if (result && result.risks && Array.isArray(result.risks)) {
    result.risks.forEach(risk => {
      if (risk.sources && Array.isArray(risk.sources)) {
        risk.sources.forEach(source => {
          if (source.name && source.name.toLowerCase() === 'insightsentry') {
            insightSentrySources.push({
              riskName: risk.title,
              sourceName: source.name,
              url: source.url || 'No URL'
            });
          }
        });
      }
    });
  }
  
  return insightSentrySources;
}

// Check for sources without URLs
function checkSourcesWithoutUrls(result) {
  const sourcesWithoutUrls = [];
  
  if (result && result.risks && Array.isArray(result.risks)) {
    result.risks.forEach(risk => {
      if (risk.sources && Array.isArray(risk.sources)) {
        risk.sources.forEach(source => {
          if (!source.url || source.url.trim() === '') {
            sourcesWithoutUrls.push({
              riskName: risk.title,
              sourceName: source.name || 'Unnamed source'
            });
          }
        });
      }
    });
  }
  
  return sourcesWithoutUrls;
}

// Count sources by retrieval channel
function countSourcesByChannel(result) {
  const channelCounts = {};
  
  if (result && result.risks && Array.isArray(result.risks)) {
    result.risks.forEach(risk => {
      if (risk.sources && Array.isArray(risk.sources)) {
        risk.sources.forEach(source => {
          const channel = source.retrievalChannel || 'unknown';
          channelCounts[channel] = (channelCounts[channel] || 0) + 1;
        });
      }
    });
  }
  
  return channelCounts;
}

// Run a single test
async function runTest(runIndex, provider) {
  // Determine the actual provider used (random or specified)
  let actualProvider = provider;
  let providerDisplay = getProviderDescription(provider);
  
  if (provider === 'random') {
    actualProvider = getRandomProvider();
    providerDisplay = getProviderDescription(actualProvider);
    console.log(`Randomly selected provider: ${providerDisplay}`);
  }
  
  console.log(`\n========== Starting Run ${runIndex + 1} with provider: ${providerDisplay} ==========`);
  const startTime = Date.now();
  
  try {
    // Call the API with the specified provider
    const url = `${API_ENDPOINT}?provider=${actualProvider}`;
    
    // Make the API request with the API key in the header
    const response = await axios.get(url, {
      headers: {
        'X-API-Key': API_KEY
      }
    });
    
    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000; // in seconds
    
    console.log(`Run ${runIndex + 1} completed in ${executionTime.toFixed(2)} seconds`);
    
    // Parse the result
    const parsedResult = response.data;
    
    // Extract the provider from the result if available, otherwise use our actualProvider
    const resultProvider = parsedResult.provider || actualProvider || 'unknown';
    console.log(`Provider used in analysis: ${resultProvider}`);
    
    // Extract and validate URLs
    const urls = extractUrls(parsedResult);
    console.log(`Found ${urls.length} URLs in the response`);
    
    // Check for InsightSentry sources
    const insightSentrySources = checkInsightSentrySources(parsedResult);
    if (insightSentrySources.length > 0) {
      console.log(`WARNING: Found ${insightSentrySources.length} sources named 'InsightSentry'`);
      insightSentrySources.forEach(source => {
        console.log(`- [${source.riskName}] ${source.sourceName}: ${source.url}`);
      });
    } else {
      console.log('No sources named InsightSentry found - Good!');
    }
    
    // Check for sources without URLs
    const sourcesWithoutUrls = checkSourcesWithoutUrls(parsedResult);
    if (sourcesWithoutUrls.length > 0) {
      console.log(`WARNING: Found ${sourcesWithoutUrls.length} sources without URLs`);
      sourcesWithoutUrls.forEach(source => {
        console.log(`- [${source.riskName}] ${source.sourceName}`);
      });
    }
    
    // Count sources by channel
    const channelCounts = countSourcesByChannel(parsedResult);
    console.log('Source counts by retrieval channel:');
    Object.entries(channelCounts).forEach(([channel, count]) => {
      console.log(`- ${channel}: ${count}`);
    });
    
    // Save the result to a file
    const timestamp = Date.now();
    // Use the provider description function to ensure consistent naming
    const providerForFilename = getProviderDescription(resultProvider || actualProvider || 'unknown');
    const filename = `run_${runIndex + 1}_${providerForFilename}_${timestamp}.json`;
    const outputPath = path.join(OUTPUT_DIR, filename);
    
    const outputData = {
      provider: resultProvider || actualProvider,
      executionTime,
      timestamp,
      result: parsedResult,
      urls,
      insightSentrySources,
      sourcesWithoutUrls,
      channelCounts
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`Results saved to ${outputPath}`);
    
    return {
      provider: resultProvider,
      executionTime,
      urls: urls.length,
      insightSentrySources: insightSentrySources.length,
      sourcesWithoutUrls: sourcesWithoutUrls.length,
      channelCounts
    };
  } catch (error) {
    console.error(`Error in run ${runIndex + 1}:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
    return {
      provider,
      executionTime: (Date.now() - startTime) / 1000,
      error: error.message
    };
  }
}

// Run all tests
async function runTests() {
  console.log(`Starting ${NUM_RUNS} test runs with ${DELAY_MINUTES} minute delay between runs`);
  console.log(`Output will be saved to ${OUTPUT_DIR}`);
  
  const results = [];
  
  for (let i = 0; i < NUM_RUNS; i++) {
    // Select provider
    const provider = PROVIDERS[i] === 'random' ? getRandomProvider() : PROVIDERS[i];
    
    // Run the test
    const result = await runTest(i, provider);
    results.push(result);
    
    // Wait between runs (except after the last run)
    if (i < NUM_RUNS - 1) {
      console.log(`Waiting ${DELAY_MINUTES} minutes before next run...`);
      await wait(DELAY_MINUTES * 60 * 1000);
    }
  }
  
  // Calculate summary statistics
  const executionTimes = results.map(r => r.executionTime).filter(t => !isNaN(t));
  const avgExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
  const maxExecutionTime = Math.max(...executionTimes);
  
  // Count total URLs
  const totalUrls = results.reduce((sum, r) => sum + (r.urls || 0), 0);
  
  // Count InsightSentry sources
  const totalInsightSentrySources = results.reduce((sum, r) => sum + (r.insightSentrySources || 0), 0);
  
  // Count sources without URLs
  const totalSourcesWithoutUrls = results.reduce((sum, r) => sum + (r.sourcesWithoutUrls || 0), 0);
  
  // Aggregate channel counts
  const aggregatedChannelCounts = {};
  results.forEach(r => {
    if (r.channelCounts) {
      Object.entries(r.channelCounts).forEach(([channel, count]) => {
        aggregatedChannelCounts[channel] = (aggregatedChannelCounts[channel] || 0) + count;
      });
    }
  });
  
  // Print summary
  console.log('\n========== Test Summary ==========');
  console.log(`Total runs: ${results.length}`);
  console.log(`Average execution time: ${avgExecutionTime.toFixed(2)} seconds`);
  console.log(`Maximum execution time: ${maxExecutionTime.toFixed(2)} seconds`);
  console.log(`Total URLs: ${totalUrls}`);
  console.log(`InsightSentry sources: ${totalInsightSentrySources}`);
  console.log(`Sources without URLs: ${totalSourcesWithoutUrls}`);
  
  console.log('\nSource counts by retrieval channel:');
  Object.entries(aggregatedChannelCounts).forEach(([channel, count]) => {
    console.log(`- ${channel}: ${count}`);
  });
  
  // Save summary to file
  const summaryPath = path.join(OUTPUT_DIR, `summary_${Date.now()}.json`);
  const summaryData = {
    totalRuns: results.length,
    avgExecutionTime,
    maxExecutionTime,
    totalUrls,
    totalInsightSentrySources,
    totalSourcesWithoutUrls,
    aggregatedChannelCounts,
    runDetails: results
  };
  
  fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
  console.log(`\nSummary saved to ${summaryPath}`);
}

// Function to schedule the next run
async function scheduleNextRun() {
  if (CURRENT_EXECUTION < TOTAL_EXECUTIONS) {
    console.log(`\n${colors.bright}${colors.magenta}========== Execution ${CURRENT_EXECUTION} of ${TOTAL_EXECUTIONS} complete ===========${colors.reset}`);
    console.log(`${colors.yellow}Waiting ${DELAY_MINUTES} minutes before next execution...${colors.reset}`);
    console.log(`${colors.yellow}Next execution (#${CURRENT_EXECUTION + 1}) scheduled for: ${new Date(Date.now() + DELAY_MINUTES * 60 * 1000).toLocaleTimeString()}${colors.reset}`);
    
    // Create command to run the next execution
    // Properly quote the path to handle spaces
    const scriptPath = JSON.stringify(process.argv[1]); // This adds quotes and escapes special characters
    const nextCommand = `CURRENT_EXECUTION=${CURRENT_EXECUTION + 1} node ${scriptPath} ${process.argv.slice(2).join(' ')}`;
    
    // Schedule the next run
    setTimeout(() => {
      console.log(`${colors.green}Starting execution #${CURRENT_EXECUTION + 1}...${colors.reset}`);
      
      // Use spawn instead of exec for better handling of paths with spaces
      const { spawn } = require('child_process');
      const env = { ...process.env, CURRENT_EXECUTION: (CURRENT_EXECUTION + 1).toString() };
      
      // Run the next execution as a new process
      // Use a shell script to handle paths with spaces
      const fs = require('fs');
      const os = require('os');
      const tempScriptPath = path.join(os.tmpdir(), `run_test_${Date.now()}.sh`);
      
      // Create a shell script with the correct command
      const scriptContent = `#!/bin/bash
node "${process.argv[1]}" ${process.argv.slice(2).join(' ')}`;
      fs.writeFileSync(tempScriptPath, scriptContent);
      fs.chmodSync(tempScriptPath, '755');
      
      // Run the shell script
      const child = spawn(tempScriptPath, [], {
        env,
        stdio: 'inherit',
        shell: true
      });
      
      // Clean up the temp script when done
      child.on('exit', () => {
        try {
          fs.unlinkSync(tempScriptPath);
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
      
      child.on('error', (error) => {
        console.error(`${colors.red}Error in next execution:${colors.reset}`, error);
        process.exit(1);
      });
      
      // Exit this process when the child is started
      process.exit(0);
    }, DELAY_MINUTES * 60 * 1000);
  } else {
    console.log(`\n${colors.bright}${colors.magenta}========== All ${TOTAL_EXECUTIONS} executions complete ===========${colors.reset}`);
    process.exit(0);
  }
}

// Run the tests
console.log(`${colors.bright}${colors.magenta}========== Starting Execution ${CURRENT_EXECUTION} of ${TOTAL_EXECUTIONS} ===========${colors.reset}`);
runTests()
  .then(() => {
    return scheduleNextRun();
  })
  .catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
