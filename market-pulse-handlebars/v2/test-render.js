const fs = require('fs');
const path = require('path');
const { renderTemplate } = require('./render');

// Load sample data
const sampleData = require('./sample-data.json');

// Render the template
const html = renderTemplate('main', sampleData);

// Save the rendered HTML to a file
const outputPath = path.join(__dirname, 'output.html');
fs.writeFileSync(outputPath, html, 'utf8');

console.log(`Report generated successfully at: ${outputPath}`);
