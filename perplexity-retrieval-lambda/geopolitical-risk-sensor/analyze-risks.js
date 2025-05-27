/**
 * Geopolitical Risk Analysis Entry Point
 * 
 * This script serves as the entry point for analyzing geopolitical risks using OpenAI.
 * It imports and runs the OpenAI analysis script.
 */

// Import the OpenAI analysis module
const { analyzeGeopoliticalRisks } = require('./src/openai-analysis');

// Run the analysis with proper error handling
console.log('Starting geopolitical risk analysis...');
analyzeGeopoliticalRisks()
  .then(result => {
    console.log('Analysis completed successfully!');
  })
  .catch(error => {
    console.error('Error during analysis:', error);
    process.exit(1);
  });
