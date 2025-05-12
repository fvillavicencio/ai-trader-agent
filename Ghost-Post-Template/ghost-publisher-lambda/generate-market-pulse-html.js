/**
 * Generate Market Pulse HTML Report
 * 
 * This script invokes the Lambda function with market_pulse_data.json
 * and generates a complete HTML report.
 */

const { handler } = require('./index');
const fs = require('fs');
const path = require('path');

// Format date for display
const getFormattedDate = () => {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Main function
async function generateMarketPulseHtml() {
  try {
    console.log(`Generating Market Pulse HTML report for ${getFormattedDate()}...`);
    
    // Read the market_pulse_data.json file
    console.log('Reading market_pulse_data.json...');
    const jsonDataPath = path.resolve(__dirname, '../market_pulse_data.json');
    const jsonData = JSON.parse(fs.readFileSync(jsonDataPath, 'utf8'));
    
    // Create the event object for the Lambda function
    const event = {
      testMode: true,
      jsonData,
      ghostUrl: 'https://market-pulse-daily.ghost.io',
      ghostApiKey: '67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c',
      newsletterId: '67f427c5744a72000854ee8f'
    };
    
    console.log('Invoking Lambda function...');
    
    // Invoke the Lambda handler
    await new Promise((resolve, reject) => {
      handler(event, {}, (err, result) => {
        if (err) {
          console.error('Error invoking Lambda function:', err);
          reject(err);
        } else {
          console.log('Lambda function executed successfully');
          resolve(result);
        }
      });
    });
    
    // The HTML file is saved directly by the Lambda function
    console.log('\nHTML report generation complete!');
    console.log('The HTML file has been saved to the project root directory.');
    console.log('You can find it with the name pattern: market-pulse-YYYY-MM-DD-*.html');
    
    // Find the generated HTML file
    const files = fs.readdirSync(path.resolve(__dirname, '..'))
      .filter(file => file.startsWith('market-pulse-') && file.endsWith('.html'))
      .map(file => ({
        name: file,
        path: path.join(__dirname, '..', file),
        time: fs.statSync(path.join(__dirname, '..', file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    if (files.length > 0) {
      const latestFile = files[0];
      console.log(`\nLatest HTML report: ${latestFile.name}`);
      console.log(`View in browser: file://${latestFile.path}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error generating HTML report:', error);
    return false;
  }
}

// Run the function
generateMarketPulseHtml()
  .then(success => {
    if (success) {
      console.log('\nProcess completed successfully.');
    } else {
      console.error('\nProcess failed.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\nUnexpected error:', error);
    process.exit(1);
  });
