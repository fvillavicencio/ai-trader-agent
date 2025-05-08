/**
 * Market Pulse Daily - Ghost Publisher
 * 
 * This script provides a user-friendly interface for publishing
 * the Market Pulse Daily report to Ghost.io using the Admin API.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt user for input
const prompt = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Create temporary .env file
const createTempEnvFile = (ghostUrl, ghostApiKey, featureImageUrl = null) => {
  try {
    let envContent = `GHOST_URL="${ghostUrl}"\nGHOST_API_KEY="${ghostApiKey}"`;
    
    if (featureImageUrl) {
      envContent += `\nFEATURE_IMAGE_URL="${featureImageUrl}"`;
    }
    
    const envPath = path.join(__dirname, 'src', '.env');
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('\n✅ Temporary .env file created successfully.');
    return envPath;
  } catch (error) {
    console.error('❌ Error creating temporary .env file:', error);
    process.exit(1);
  }
};

// Clean up temporary .env file
const cleanupTempEnvFile = (envPath) => {
  try {
    if (fs.existsSync(envPath)) {
      fs.unlinkSync(envPath);
      console.log('✅ Temporary .env file cleaned up successfully.');
    }
  } catch (error) {
    console.error('⚠️ Error cleaning up temporary .env file:', error);
  }
};

// Generate Ghost post
const generateGhostPost = () => {
  try {
    console.log('\n🔄 Generating Ghost post from market_pulse_data.json...');
    execSync('node generate-ghost-post.js', { stdio: 'inherit' });
    console.log('✅ Ghost post generated successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error generating Ghost post:', error);
    return false;
  }
};

// Publish to Ghost
const publishToGhost = () => {
  try {
    console.log('\n🔄 Publishing to Ghost...');
    execSync('node publish-to-ghost.js', { stdio: 'inherit' });
    console.log('✅ Market Pulse Daily report published successfully to Ghost!');
    return true;
  } catch (error) {
    console.error('❌ Error publishing to Ghost:', error);
    return false;
  }
};

// Main function
const main = async () => {
  console.log('\n🌟 Market Pulse Daily - Ghost Publisher 🌟');
  console.log('===========================================');
  console.log('This tool will help you publish your Market Pulse Daily report to Ghost.\n');
  
  // Check if market_pulse_data.json exists
  const dataPath = path.join(__dirname, 'market_pulse_data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Error: market_pulse_data.json not found. Please make sure the file exists.');
    process.exit(1);
  }
  
  // Get Ghost credentials from user
  const ghostUrl = await prompt('Enter your Ghost blog URL (e.g., https://your-blog.ghost.io): ');
  const ghostApiKey = await prompt('Enter your Ghost Admin API key: ');
  const useFeatureImage = (await prompt('Do you want to use a feature image? (y/n): ')).toLowerCase() === 'y';
  
  let featureImageUrl = null;
  if (useFeatureImage) {
    featureImageUrl = await prompt('Enter the URL of the feature image: ');
  }
  
  let envPath = null;
  
  try {
    // Create temporary .env file
    envPath = createTempEnvFile(ghostUrl, ghostApiKey, featureImageUrl);
    
    // Generate Ghost post
    const generateSuccess = generateGhostPost();
    if (!generateSuccess) {
      console.error('❌ Failed to generate Ghost post. Aborting.');
      process.exit(1);
    }
    
    // Confirm publishing
    const confirmPublish = await prompt('\nReady to publish to Ghost. Continue? (y/n): ');
    if (confirmPublish.toLowerCase() !== 'y') {
      console.log('Publishing cancelled by user.');
      process.exit(0);
    }
    
    // Publish to Ghost
    const publishSuccess = publishToGhost();
    if (!publishSuccess) {
      console.error('❌ Failed to publish to Ghost.');
      process.exit(1);
    }
    
    console.log('\n🎉 All done! Your Market Pulse Daily report has been published to Ghost.');
  } catch (error) {
    console.error('❌ Error publishing Market Pulse Daily report:', error);
    process.exit(1);
  } finally {
    // Clean up temporary .env file
    if (envPath) {
      cleanupTempEnvFile(envPath);
    }
    
    // Close readline interface
    rl.close();
  }
};

// Run the main function
main();
