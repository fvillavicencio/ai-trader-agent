/**
 * Geopolitical Risk Sensor - Main Entry Point
 * This service monitors and analyzes geopolitical events to identify risks
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createLogger } = require('./utils/logger');
const balancedRetrieval = require('./balanced-retrieval');

const logger = createLogger('geopolitical-risk-sensor');

// Define file paths
const DATA_DIR = path.join(__dirname, '../data');
const RISKS_FILE = path.join(DATA_DIR, 'geopolitical_risks.json');
const ANALYZED_RISKS_FILE = path.join(DATA_DIR, 'geopolitical_risks_analyzed.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Calculate the geopolitical risk index based on risk impact levels
 * @param {Array} risks - Array of geopolitical risks
 * @returns {number} - Risk index (0-100)
 */
function calculateGeopoliticalRiskIndex(risks) {
  if (!risks || risks.length === 0) {
    return 0;
  }
  
  // Calculate average impact level
  let totalImpact = 0;
  let count = 0;
  
  risks.forEach(risk => {
    // Convert string impact levels to numeric values
    let impactValue = 0;
    
    if (typeof risk.impactLevel === 'number') {
      impactValue = risk.impactLevel;
    } else if (typeof risk.impactLevel === 'string') {
      // Convert string impact levels to numbers
      const impactMap = {
        'Low': 3,
        'Medium': 5,
        'High': 8,
        'Critical': 10
      };
      impactValue = impactMap[risk.impactLevel] || 5; // Default to medium if not found
    }
    
    totalImpact += impactValue;
    count++;
  });
  
  // Scale to 0-100
  return Math.min(Math.round((totalImpact / count) * 10), 100);
}

/**
 * Load risks from the JSON file
 * @returns {Promise<Array>} - Array of risks
 */
async function loadRisks() {
  try {
    if (!fs.existsSync(RISKS_FILE)) {
      logger.info(`Risks file not found at ${RISKS_FILE}, returning empty array`);
      return [];
    }
    
    const data = await fs.promises.readFile(RISKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Error loading risks: ${error.message}`);
    return [];
  }
}

/**
 * Save risks to the JSON file
 * @param {Array} risks - Array of risks to save
 * @returns {Promise<boolean>} - Success status
 */
async function saveRisks(risks) {
  try {
    await fs.promises.writeFile(RISKS_FILE, JSON.stringify(risks, null, 2));
    logger.info(`Saved ${risks.length} risks to ${RISKS_FILE}`);
    return true;
  } catch (error) {
    logger.error(`Error saving risks: ${error.message}`);
    return false;
  }
}

/**
 * Save analyzed risks to the JSON file
 * @param {Object} analysis - Analysis results to save
 * @returns {Promise<boolean>} - Success status
 */
async function saveAnalyzedRisks(analysis) {
  try {
    await fs.promises.writeFile(ANALYZED_RISKS_FILE, JSON.stringify(analysis, null, 2));
    logger.info(`Saved analyzed risks to ${ANALYZED_RISKS_FILE}`);
    return true;
  } catch (error) {
    logger.error(`Error saving analyzed risks: ${error.message}`);
    return false;
  }
}

/**
 * Run a full scan for geopolitical risks
 * @returns {Promise<Array>} - Array of identified geopolitical risks
 */
async function runFullScan() {
  try {
    logger.info('Starting full scan for geopolitical risks');
    
    // Load current risks from storage
    const currentRisks = await loadRisks();
    
    // Since balanced-retrieval.js doesn't export functions, we'll use our own implementation
    // to fetch events from various sources
    const { spawn } = require('child_process');
    
    // Run the balanced-retrieval.js script as a separate process
    logger.info('Running balanced-retrieval.js to collect events...');
    const balancedRetrievalProcess = spawn('node', ['src/balanced-retrieval.js'], {
      cwd: path.join(__dirname, '..')
    });
    
    // Wait for the process to complete
    await new Promise((resolve, reject) => {
      balancedRetrievalProcess.on('close', (code) => {
        if (code === 0) {
          logger.info('Balanced retrieval process completed successfully');
          resolve();
        } else {
          logger.error(`Balanced retrieval process exited with code ${code}`);
          reject(new Error(`Balanced retrieval process exited with code ${code}`));
        }
      });
    });
    
    // Load the risks generated by the balanced-retrieval.js script
    const newRisks = await loadRisks();
    logger.info(`Loaded ${newRisks.length} risks from balanced retrieval`);
    
    return newRisks;
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
    const risks = await loadRisks();
    
    // Calculate geopolitical risk index (average of impact levels)
    const geopoliticalRiskIndex = calculateGeopoliticalRiskIndex(risks);
    
    // Create assessment object
    const assessment = {
      geopoliticalRiskIndex,
      global: "The global geopolitical landscape is marked by heightened tensions in multiple regions, with ongoing conflicts and trade disputes creating significant uncertainty for international relations and markets.",
      risks,
      timestamp: new Date().toISOString()
    };
    
    // Save the analyzed risks
    await saveAnalyzedRisks(assessment);
    
    return assessment;
  } catch (error) {
    logger.error(`Error getting current risk assessment: ${error.message}`);
    return {
      geopoliticalRiskIndex: 0,
      global: "",
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
    logger.info(`Running Geopolitical Risk Sensor${testMode ? ' in test mode' : ''}`);
    
    // Run a full scan to update the risk database
    await runFullScan();
    
    // Get the current risk assessment
    const assessment = await getCurrentRiskAssessment();
    
    logger.info('Geopolitical Risk Sensor completed successfully');
    return assessment;
  } catch (error) {
    logger.error(`Error running sensor: ${error.message}`);
    return {
      geopoliticalRiskIndex: 0,
      global: "",
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
    logger.info(`Global Overview: ${assessment.global}`);
    logger.info(`Identified ${assessment.risks.length} geopolitical risks`);
    
    // Return success
    return true;
  } catch (error) {
    logger.error(`Error in main function: ${error.message}`);
    return false;
  }
}

// Export functions for use in other modules
module.exports = {
  runSensor,
  runFullScan,
  getCurrentRiskAssessment,
  loadRisks,
  saveRisks
};

// Run as standalone script if invoked directly
if (require.main === module) {
  main()
    .then(() => {
      logger.info('Geopolitical Risk Sensor completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error(`Fatal error: ${error.message}`);
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
