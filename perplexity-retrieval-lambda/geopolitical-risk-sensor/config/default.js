/**
 * Default configuration for the Geopolitical Risk Sensor
 */

module.exports = {
  // Service configuration
  runInterval: 3600000, // 1 hour in milliseconds
  
  // Data storage
  dataDir: '../data',
  risksFile: 'geopolitical_risks_curated.json',
  
  // API configuration
  perplexity: {
    model: 'mixtral-8x7b-instruct',
    maxTokens: 4000,
    temperature: 0.1
  },
  
  openai: {
    model: 'gpt-4o',
    maxTokens: 4000,
    temperature: 0.3
  },
  
  // Risk analysis
  maxRisksToKeep: 20,
  maxEventsToAnalyze: 30,
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info'
};
