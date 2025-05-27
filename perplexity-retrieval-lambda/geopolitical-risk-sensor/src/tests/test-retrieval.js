/**
 * Test script for geopolitical risk retrieval
 * This script retrieves a limited set of data and displays the top 10 geopolitical risks
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const combinedRetrievalService = require('./src/services/combinedRetrievalService');
const { createLogger } = require('./src/utils/logger');

const logger = createLogger('test-retrieval');
const DATA_DIR = path.join(__dirname, 'data');
const RISKS_FILE = path.join(DATA_DIR, 'test_geopolitical_risks.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Save geopolitical risks to storage
 * @param {Array} risks - Array of geopolitical risk objects
 * @returns {Promise<boolean>} - Success status
 */
async function saveRisks(risks) {
  try {
    await fs.promises.writeFile(RISKS_FILE, JSON.stringify(risks, null, 2));
    logger.info(`Saved ${risks.length} risks to storage`);
    return true;
  } catch (error) {
    logger.error(`Error saving risks to storage: ${error.message}`);
    return false;
  }
}

/**
 * Retrieve geopolitical events from Google News only
 */
async function retrieveGoogleNewsOnly() {
  try {
    logger.info('Starting limited retrieval test (Google News only)');
    
    // Only retrieve from Google News with a strict limit
    const events = await combinedRetrievalService.fetchGoogleNewsRSS(20);
    
    // Convert events to risks format
    const risks = events.map((event, index) => ({
      id: `risk-${index + 1}`,
      name: event.title,
      description: event.description,
      source: event.source,
      publishedDate: event.publishedDate,
      impactLevel: Math.floor(Math.random() * 5) + 5, // Random impact level between 5-10
      regions: ['Global'],
      categories: ['geopolitical'],
      timestamp: new Date().toISOString()
    }));
    
    // Sort by impact level (descending) and then by date (most recent first)
    const sortedRisks = risks.sort((a, b) => {
      if (b.impactLevel !== a.impactLevel) {
        return b.impactLevel - a.impactLevel;
      }
      return new Date(b.publishedDate) - new Date(a.publishedDate);
    });
    
    // Take top 10
    const top10Risks = sortedRisks.slice(0, 10);
    
    // Save to file
    await saveRisks(top10Risks);
    
    // Display top 10 risks
    logger.info('Top 10 Geopolitical Risks:');
    top10Risks.forEach((risk, index) => {
      console.log(`\n${index + 1}. ${risk.name} (Impact: ${risk.impactLevel}/10)`);
      console.log(`   ${risk.description.substring(0, 150)}...`);
      console.log(`   Source: ${risk.source}`);
      console.log(`   Published: ${new Date(risk.publishedDate).toLocaleString()}`);
    });
    
    logger.info(`\nTest completed. Results saved to ${RISKS_FILE}`);
    
  } catch (error) {
    logger.error(`Error in test: ${error.message}`);
    console.error(error);
  }
}

// Run the test
retrieveGoogleNewsOnly();
