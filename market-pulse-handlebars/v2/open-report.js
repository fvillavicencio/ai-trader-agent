const { exec } = require('child_process');
const path = require('path');

// Get the absolute path to the output.html file
const outputPath = path.join(__dirname, 'output.html');

// Open the file in the default browser
console.log(`Opening ${outputPath} in your default browser...`);

// Use the appropriate command based on the platform
const command = process.platform === 'darwin' 
  ? `open "${outputPath}"` 
  : process.platform === 'win32' 
    ? `start "" "${outputPath}"` 
    : `xdg-open "${outputPath}"`;

exec(command, (error) => {
  if (error) {
    console.error(`Error opening file: ${error.message}`);
    return;
  }
  console.log('File opened successfully!');
});
