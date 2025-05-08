/**
 * Market Pulse Daily - Beehiv Publisher Runner
 * 
 * This script handles the end-to-end process of generating and publishing 
 * the Market Pulse Daily report to Beehiv using their API.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create temporary .env file
const createTempEnvFile = (beehivApiUrl, beehivApiKey, beehivPublicationId, featureImageUrl) => {
  try {
    let envContent = `BEEHIV_API_URL="${beehivApiUrl}"\nBEEHIV_API_KEY="${beehivApiKey}"\nBEEHIV_PUBLICATION_ID="${beehivPublicationId}"`;
    
    if (featureImageUrl) {
      envContent += `\nFEATURE_IMAGE_URL="${featureImageUrl}"`;
    }
    
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
  // Get Beehiv credentials from command line arguments
  const beehivApiUrl = process.argv[2] || 'https://api.beehiiv.com/v2';
  const beehivApiKey = process.argv[3];
  const beehivPublicationId = process.argv[4];
  const featureImageUrl = process.argv[5] || null;
  
  if (!beehivApiKey || !beehivPublicationId) {
    console.error('Error: Beehiv API key and Publication ID are required.');
    console.log('Usage: node publish-to-beehiv-runner.js <beehiv_api_url> <beehiv_api_key> <beehiv_publication_id> [feature_image_url]');
    console.log('Note: beehiv_api_url defaults to https://api.beehiiv.com/v2 if not provided');
    process.exit(1);
  }
  
  let envPath = null;
  
  try {
    // Create temporary .env file
    envPath = createTempEnvFile(beehivApiUrl, beehivApiKey, beehivPublicationId, featureImageUrl);
    
    // Generate Ghost post (we'll reuse this for Beehiv as it generates the HTML we need)
    console.log('Generating post content...');
    execSync('node generate-ghost-post.js', { stdio: 'inherit' });
    
    // Publish to Beehiv
    console.log('Publishing to Beehiv...');
    execSync('node publish-to-beehiv.js', { stdio: 'inherit' });
    
    console.log('Market Pulse Daily report published successfully to Beehiv!');
  } catch (error) {
    console.error('Error publishing Market Pulse Daily report to Beehiv:', error);
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
