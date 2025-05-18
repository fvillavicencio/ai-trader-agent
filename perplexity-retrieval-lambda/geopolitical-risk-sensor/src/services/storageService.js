/**
 * Storage Service for Geopolitical Risk Sensor
 * Handles persistence of geopolitical risks data
 */

const fs = require('fs');
const path = require('path');
const { createLogger } = require('../utils/logger');

const logger = createLogger('geopolitical-risk-sensor');
const DATA_DIR = path.join(__dirname, '../../data');
const RISKS_FILE = path.join(DATA_DIR, 'geopolitical_risks.json');

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
 * Load geopolitical risks from storage
 * @returns {Promise<Array>} - Array of geopolitical risk objects
 */
async function loadRisks() {
  try {
    if (!fs.existsSync(RISKS_FILE)) {
      logger.info('No risks file found, returning empty array');
      return [];
    }
    
    const data = await fs.promises.readFile(RISKS_FILE, 'utf8');
    const risks = JSON.parse(data);
    logger.info(`Loaded ${risks.length} risks from storage`);
    return risks;
  } catch (error) {
    logger.error(`Error loading risks from storage: ${error.message}`);
    return [];
  }
}

/**
 * Test the storage service functionality
 */
async function testStorageService() {
  logger.info('=== Testing Storage Service ===');
  
  // Load initial risks
  const initialRisks = await loadRisks();
  
  // Create test risks
  const testRisks = [
    {
      id: 'test-risk-1',
      name: 'Test Risk 1',
      description: 'This is a test risk for storage service testing',
      impactLevel: 5,
      timestamp: new Date().toISOString()
    },
    {
      id: 'test-risk-2',
      name: 'Test Risk 2',
      description: 'This is another test risk for storage service testing',
      impactLevel: 7,
      timestamp: new Date().toISOString()
    }
  ];
  
  // Save test risks
  await saveRisks(testRisks);
  
  // Load saved risks
  const savedRisks = await loadRisks();
  
  // Verify saved risks match test risks
  const success = savedRisks.length === testRisks.length;
  
  if (success) {
    logger.info('Storage Service test completed successfully');
  } else {
    logger.error('Storage Service test failed');
  }
  
  // Restore initial risks
  await saveRisks(initialRisks);
  
  return success;
}

module.exports = {
  saveRisks,
  loadRisks,
  testStorageService
};
