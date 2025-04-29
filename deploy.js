#!/usr/bin/env node

/**
 * AI Trading Agent - Automatic Deployment Script
 * 
 * This script automates the deployment of the AI Trading Agent to Google Apps Script.
 * It uses clasp to push local files to Google Apps Script and keep them in sync.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PROJECT_NAME = 'AI Trading Agent';
const FILES_TO_DEPLOY = [
  'Code.gs',
  'Config.gs',
  'Email.gs',
  'Prompt.gs',
  'Setup.gs'
];

// Use the full path to clasp
const CLASP_PATH = '/Users/frankvillavicencio/.nvm/versions/node/v18.20.4/bin/clasp';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

/**
 * Main function to run the deployment
 */
async function main() {
  try {
    console.log(`${colors.bright}${colors.cyan}=== AI Trading Agent Deployment ====${colors.reset}\n`);
    
    // Check if clasp exists at the specified path
    checkClaspExists();
    
    // Check if user is logged in
    checkClaspLogin();
    
    // Check if .clasp.json exists (project already initialized)
    const isInitialized = fs.existsSync('.clasp.json');
    
    if (!isInitialized) {
      // Create new project
      createNewProject();
    } else {
      console.log(`${colors.yellow}Project already initialized. Using existing configuration.${colors.reset}\n`);
    }
    
    // Create appsscript.json if it doesn't exist
    createAppScriptManifest();
    
    // Push files to Google Apps Script
    pushFilesToGoogleAppsScript();
    
    // Open the project in browser
    openProjectInBrowser();
    
    console.log(`\n${colors.green}${colors.bright}Deployment completed successfully!${colors.reset}`);
    console.log(`\nNext steps:`);
    console.log(`1. Set your OpenAI API key in Script Properties`);
    console.log(`2. Run the setupTradingAgent function from Setup.gs`);
    console.log(`3. Check your email for the confirmation message`);
    
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Check if clasp exists at the specified path
 */
function checkClaspExists() {
  try {
    console.log('Checking clasp installation...');
    
    if (!fs.existsSync(CLASP_PATH)) {
      throw new Error(`Clasp not found at path: ${CLASP_PATH}`);
    }
    
    // Test if clasp is working
    execSync(`${CLASP_PATH} --version`, { stdio: 'pipe' });
    console.log(`${colors.green}✓ clasp is installed and accessible${colors.reset}\n`);
  } catch (error) {
    throw new Error(`clasp is not working properly: ${error.message}. Try reinstalling with: npm install -g @google/clasp`);
  }
}

/**
 * Check if user is logged in to clasp
 */
function checkClaspLogin() {
  try {
    console.log('Checking clasp login status...');
    execSync(`${CLASP_PATH} login --status`, { stdio: 'pipe' });
    console.log(`${colors.green}✓ You are logged in to clasp${colors.reset}\n`);
  } catch (error) {
    console.log(`${colors.yellow}You are not logged in to clasp. Initiating login process...${colors.reset}\n`);
    try {
      // Start the login process
      console.log('Please complete the login process in your browser when prompted.');
      execSync(`${CLASP_PATH} login`, { stdio: 'inherit' });
      console.log(`${colors.green}✓ Login successful${colors.reset}\n`);
    } catch (loginError) {
      throw new Error(`Failed to login: ${loginError.message}`);
    }
  }
}

/**
 * Create a new Google Apps Script project
 */
function createNewProject() {
  console.log(`Creating new Google Apps Script project: ${PROJECT_NAME}...`);
  
  try {
    // Create new standalone script project
    execSync(`${CLASP_PATH} create --title "${PROJECT_NAME}" --type standalone`, { stdio: 'inherit' });
    console.log(`${colors.green}✓ Project created successfully${colors.reset}\n`);
  } catch (error) {
    throw new Error(`Failed to create project: ${error.message}`);
  }
}

/**
 * Create appsscript.json manifest file
 */
function createAppScriptManifest() {
  const manifestPath = path.join(process.cwd(), 'appsscript.json');
  
  // Check if manifest already exists
  if (fs.existsSync(manifestPath)) {
    console.log(`${colors.yellow}appsscript.json already exists. Using existing file.${colors.reset}\n`);
    return;
  }
  
  console.log('Creating appsscript.json manifest...');
  
  // Create manifest content
  const manifest = {
    "timeZone": "America/New_York",
    "dependencies": {
      "enabledAdvancedServices": []
    },
    "exceptionLogging": "STACKDRIVER",
    "runtimeVersion": "V8"
  };
  
  // Write manifest file
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`${colors.green}✓ appsscript.json created${colors.reset}\n`);
}

/**
 * Push files to Google Apps Script
 */
function pushFilesToGoogleAppsScript() {
  console.log('Pushing files to Google Apps Script...');
  
  try {
    // Push all files
    execSync(`${CLASP_PATH} push -f`, { stdio: 'inherit' });
    console.log(`${colors.green}✓ Files pushed successfully${colors.reset}\n`);
  } catch (error) {
    throw new Error(`Failed to push files: ${error.message}`);
  }
}

/**
 * Open the project in browser
 */
function openProjectInBrowser() {
  console.log('Opening project in browser...');
  
  try {
    execSync(`${CLASP_PATH} open`, { stdio: 'inherit' });
  } catch (error) {
    console.log(`${colors.yellow}Could not automatically open the project. Please run '${CLASP_PATH} open' manually.${colors.reset}\n`);
  }
}

// Run the main function
main();
