/**
 * Geopolitical Risk Sensor - Main Entry Point
 * This service monitors and analyzes geopolitical events to identify risks
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createLogger } = require('./utils/logger');

// Import services
const perplexityService = require('./services/perplexityService');
const sensorService = require('./services/sensorService');
const storageService = require('./services/storageService');
const rssService = require('./services/rssService');
const zeihanService = require('./services/zeihanService');
const insightSentryService = require('./services/insightSentryService');
const combinedRetrievalService = require('./services/combinedRetrievalService');
const enhancedRapidAPIService = require('./services/enhancedRapidAPIService');

const logger = createLogger('geopolitical-risk-sensor');

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Initialize the geopolitical risk sensor
 * @returns {Promise<boolean>} - Success status
 */
async function initializeSensor() {
  try {
    logger.info('Initializing Geopolitical Risk Sensor');
    
    // Create necessary directories and files
    const currentRisks = await storageService.loadRisks();
    logger.info(`Loaded ${currentRisks.length} existing risks from storage`);
    
    return true;
  } catch (error) {
    logger.error(`Error initializing sensor: ${error.message}`);
    return false;
  }
}

/**
 * Run a full scan for geopolitical risks
 * @returns {Promise<Array>} - Array of identified geopolitical risks
 */
async function runFullScan() {
  try {
    logger.info('Starting full geopolitical risk scan');
    
    // Get current risks from storage
    logger.info('Loading current risks from storage');
    const currentRisks = await storageService.loadRisks();
    
    // Collect events from various sources
    let events = [];
    
    // Set a maximum of 50 events from each service for a total of 100 max events
    const MAX_EVENTS_PER_SERVICE = 50;
    const TOTAL_MAX_EVENTS = 100;
    
    // Use the new combined retrieval service as the primary source
    logger.info(`Collecting events using the combined retrieval service (max ${MAX_EVENTS_PER_SERVICE})`);
    const combinedEvents = await combinedRetrievalService.getRecentEvents({
      newsApiKey: process.env.NEWS_API_KEY,
      includeRSS: true,
      includeGoogleNews: true,
      includeNewsAPI: !!process.env.NEWS_API_KEY,
      includeScraping: true,
      maxTotalEvents: MAX_EVENTS_PER_SERVICE
    });
    events.push(...combinedEvents);
    
    // Use the enhanced RapidAPI service for additional premium sources
    logger.info(`Collecting events using the enhanced RapidAPI service (max ${MAX_EVENTS_PER_SERVICE})`);
    const enhancedRapidAPIEvents = await enhancedRapidAPIService.getRecentEvents({
      maxTotalEvents: MAX_EVENTS_PER_SERVICE
    });
    events.push(...enhancedRapidAPIEvents);
    logger.info(`Retrieved ${enhancedRapidAPIEvents.length} events from enhanced RapidAPI service`);
    
    // Ensure we don't exceed the total maximum events
    if (events.length > TOTAL_MAX_EVENTS) {
      logger.info(`Limiting total events from ${events.length} to ${TOTAL_MAX_EVENTS}`);
      events = sensorService.deduplicateEvents(events).slice(0, TOTAL_MAX_EVENTS);
    }
    
    // Fallback to individual services if combined retrieval returns no events
    if (events.length === 0) {
      logger.info('Combined retrieval returned no events, falling back to individual services');
      
      // 1. Get events from RSS feeds
      const rssEvents = await rssService.getRecentEvents();
      events.push(...rssEvents);
      
      // 2. Get events from Zeihan analysis if Google API key is available
      if (process.env.GOOGLE_API_KEY) {
        const zeihanEvents = await zeihanService.getRecentEvents(process.env.GOOGLE_API_KEY);
        events.push(...zeihanEvents);
      }
      
      // 3. Get events from RapidAPI news if RapidAPI key is available
      if (process.env.RAPIDAPI_KEY) {
        const insightEvents = await insightSentryService.getRecentEvents(process.env.RAPIDAPI_KEY);
        events.push(...insightEvents);
      }
    }
    
    // 4. Analyze events using Perplexity API
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    if (!perplexityApiKey) {
      logger.error('Perplexity API key not provided');
      return currentRisks;
    }
    
    // Filter and deduplicate events
    const uniqueEvents = sensorService.deduplicateEvents(events);
    logger.info(`Collected ${uniqueEvents.length} unique events for analysis`);
    
    // Analyze events to identify geopolitical risks
    const newRisks = await perplexityService.analyzeEventsForRisks(uniqueEvents, perplexityApiKey);
    
    // Merge with existing risks, removing duplicates
    const mergedRisks = sensorService.mergeRisks(currentRisks, newRisks);
    
    // Save updated risks to storage
    await storageService.saveRisks(mergedRisks);
    
    logger.info(`Full scan completed: identified ${newRisks.length} new risks, total ${mergedRisks.length} risks`);
    return mergedRisks;
  } catch (error) {
    logger.error(`Error running full scan: ${error.message}`);
    return [];
  }
}

/**
 * Get the current geopolitical risk assessment
 * @returns {Promise<Object>} - Geopolitical risk assessment
 */
async function getCurrentRiskAssessment() {
  try {
    // Load current risks from storage
    const risks = await storageService.loadRisks();
    
    // Generate risk assessment
    const assessment = sensorService.generateRiskAssessment(risks);
    
    return assessment;
  } catch (error) {
    logger.error(`Error getting current risk assessment: ${error.message}`);
    return {
      geopoliticalRiskIndex: 0,
      risks: [],
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Run the geopolitical risk sensor service
 * @param {boolean} testMode - Whether to run in test mode
 * @returns {Promise<Object>} - Geopolitical risk assessment
 */
async function runSensor(testMode = false) {
  try {
    // Initialize sensor
    await initializeSensor();
    
    if (testMode) {
      logger.info('Running in test mode');
      // Run storage service test
      await storageService.testStorageService();
      
      // Create test assessment
      return {
        geopoliticalRiskIndex: 50,
        risks: [
          {
            id: 'test-risk-1',
            name: 'Test Geopolitical Risk',
            description: 'This is a test risk for the geopolitical risk sensor',
            impactLevel: 5,
            timestamp: new Date().toISOString()
          }
        ],
        timestamp: new Date().toISOString(),
        testMode: true
      };
    }
    
    // Run full scan
    await runFullScan();
    
    // Get current assessment
    const assessment = await getCurrentRiskAssessment();
    
    return assessment;
  } catch (error) {
    logger.error(`Error running sensor: ${error.message}`);
    return {
      geopoliticalRiskIndex: 0,
      risks: [],
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Main function to run the geopolitical risk sensor
 */
async function main() {
  try {
    logger.info('Starting Geopolitical Risk Sensor');
    
    // Check if running in test mode
    const testMode = process.env.TEST_MODE === 'true';
    
    // Run the sensor
    const assessment = await runSensor(testMode);
    
    // Log the results
    logger.info(`Geopolitical Risk Index: ${assessment.geopoliticalRiskIndex}`);
    logger.info(`Identified ${assessment.risks.length} geopolitical risks`);
    
    // Output the assessment as JSON if requested
    if (process.env.OUTPUT_JSON === 'true') {
      console.log(JSON.stringify(assessment, null, 2));
    }
    
    // Set up hourly cycle if not in test mode
    if (!testMode && process.env.ENABLE_CYCLE === 'true') {
      logger.info('Setting up hourly cycle for geopolitical risk sensor');
      
      // Run every hour (3600000 ms)
      const interval = process.env.CYCLE_INTERVAL_MS ? parseInt(process.env.CYCLE_INTERVAL_MS) : 3600000;
      
      setInterval(async () => {
        logger.info('Running scheduled geopolitical risk sensor cycle');
        try {
          const updatedAssessment = await runSensor(false);
          logger.info(`Scheduled cycle completed. Geopolitical Risk Index: ${updatedAssessment.geopoliticalRiskIndex}`);
          logger.info(`Updated with ${updatedAssessment.risks.length} geopolitical risks`);
        } catch (error) {
          logger.error(`Error in scheduled cycle: ${error.message}`);
        }
      }, interval);
      
      logger.info(`Geopolitical risk sensor will run every ${interval/60000} minutes`);
    }
    
    return assessment;
  } catch (error) {
    logger.error(`Error running geopolitical risk sensor: ${error.message}`);
    throw error;
  }
}

// Run as standalone script if invoked directly
if (require.main === module) {
  main()
    .then(() => {
      logger.info('Geopolitical Risk Sensor completed successfully');
    })
    .catch(error => {
      logger.error(`Geopolitical Risk Sensor failed: ${error.message}`);
      process.exit(1);
    });
}

// Export for use as a module
module.exports = {
  main,
  runSensor,
  runFullScan,
  getCurrentRiskAssessment
};
