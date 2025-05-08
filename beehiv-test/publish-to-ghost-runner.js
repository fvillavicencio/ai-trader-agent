/**
 * Market Pulse Daily - Ghost Publisher Runner
 * 
 * This script handles the end-to-end process of generating and publishing 
 * the Market Pulse Daily report to Ghost.io using the Admin API.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create temporary .env file
const createTempEnvFile = (ghostUrl, ghostApiKey) => {
  try {
    const envContent = `GHOST_URL="${ghostUrl}"\nGHOST_API_KEY="${ghostApiKey}"`;
    const envPath = path.join(__dirname, 'src', '.env');
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('Temporary .env file created successfully.');
    return envPath;
  } catch (error) {
    console.error('Error creating temporary .env file:', error);
    process.exit(1);
  }
};

// Clean up temporary .env file
const cleanupTempEnvFile = (envPath) => {
  try {
    if (fs.existsSync(envPath)) {
      fs.unlinkSync(envPath);
      console.log('Temporary .env file cleaned up successfully.');
    }
  } catch (error) {
    console.error('Error cleaning up temporary .env file:', error);
  }
};

// Main function
const main = async () => {
  // Get Ghost credentials from command line arguments
  const ghostUrl = process.argv[2];
  const ghostApiKey = process.argv[3];
  
  if (!ghostUrl || !ghostApiKey) {
    console.error('Error: Ghost URL and API key are required.');
    console.log('Usage: node publish-to-ghost-runner.js <ghost_url> <ghost_api_key>');
    process.exit(1);
  }
  
  let envPath = null;
  
  try {
    // Create temporary .env file
    envPath = createTempEnvFile(ghostUrl, ghostApiKey);
    
    // Generate Ghost post
    console.log('Generating Ghost post...');
    execSync('node generate-ghost-post.js', { stdio: 'inherit' });
    
    // Publish to Ghost
    console.log('Publishing to Ghost...');
    execSync('node publish-to-ghost.js', { stdio: 'inherit' });
    
    console.log('Market Pulse Daily report published successfully!');
  } catch (error) {
    console.error('Error publishing Market Pulse Daily report:', error);
    process.exit(1);
  } finally {
    // Clean up temporary .env file
    if (envPath) {
      cleanupTempEnvFile(envPath);
    }
  }
};

// Run the main function
main();
