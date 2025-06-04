/**
 * Local testing script for Geopolitical Risk Analysis functions
 */
require('dotenv').config();
const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Import the functions for local testing
const generatorPath = path.join(__dirname, 'functions/generator');
const apiPath = path.join(__dirname, 'functions/api');

console.log('Starting local test of Geopolitical Risk Analysis functions...');

// Create local output directory if it doesn't exist
const outputDir = path.join(__dirname, 'local-output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Mock Cloud Storage for local testing
class MockStorage {
  constructor() {
    this.files = {};
  }
  
  bucket() {
    return {
      file: (filename) => ({
        save: async (content) => {
          const filePath = path.join(outputDir, filename);
          fs.writeFileSync(filePath, content);
          console.log(`Saved file: ${filePath}`);
          this.files[filename] = content;
          return [true];
        },
        download: async () => {
          const filePath = path.join(outputDir, filename);
          if (fs.existsSync(filePath)) {
            return [fs.readFileSync(filePath)];
          }
          if (this.files[filename]) {
            return [this.files[filename]];
          }
          throw new Error(`File not found: ${filename}`);
        },
        exists: async () => {
          const filePath = path.join(outputDir, filename);
          return [fs.existsSync(filePath) || !!this.files[filename]];
        },
        getMetadata: async () => {
          return [{
            updated: new Date().toISOString(),
            timeCreated: new Date().toISOString(),
            name: filename
          }];
        }
      })
    };
  }
}

// Mock functions framework
global.process.env.FUNCTION_TARGET = 'generateGeopoliticalRiskAnalysis';
global.process.env.BUCKET_NAME = 'local-test-bucket';

// Mock the Cloud Storage in the generator function
jest.mock('@google-cloud/storage', () => {
  return { Storage: jest.fn().mockImplementation(() => new MockStorage()) };
});

// Test the generator function
async function testGeneratorFunction() {
  console.log('\n--- Testing Generator Function ---');
  
  try {
    // Create a mock request and response
    const req = {};
    const res = {
      status: (code) => {
        console.log(`Response status: ${code}`);
        return res;
      },
      send: (data) => {
        console.log('Generator function response:', data);
        return res;
      }
    };
    
    // Import the generator function
    const { generateGeopoliticalRiskAnalysis } = require('./functions/generator');
    
    // Call the function
    await generateGeopoliticalRiskAnalysis(req, res);
    
    console.log('Generator function test completed');
  } catch (error) {
    console.error('Error testing generator function:', error);
  }
}

// Test the API function
async function testApiFunction() {
  console.log('\n--- Testing API Function ---');
  
  try {
    // Create a mock request and response
    const req = { query: {} };
    const res = {
      set: (name, value) => res,
      status: (code) => {
        console.log(`Response status: ${code}`);
        return res;
      },
      send: (data) => {
        console.log('API function response:', data);
        return res;
      }
    };
    
    // Import the API function
    const { getGeopoliticalRiskAnalysis } = require('./functions/api');
    
    // Call the function
    await getGeopoliticalRiskAnalysis(req, res);
    
    console.log('API function test completed');
  } catch (error) {
    console.error('Error testing API function:', error);
  }
}

// Run the tests
async function runTests() {
  try {
    await testGeneratorFunction();
    await testApiFunction();
    
    console.log('\n✅ Local testing completed successfully!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

runTests().catch(console.error);
