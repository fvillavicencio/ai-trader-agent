/**
 * Script to generate a favicon for Market Pulse Daily
 */
const fs = require('fs');
const { createCanvas } = require('canvas');
const path = require('path');

// Create a canvas
const size = 32;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Draw a gradient background
const gradient = ctx.createLinearGradient(0, 0, size, size);
gradient.addColorStop(0, '#1a365d');  // Dark blue (matching footer)
gradient.addColorStop(1, '#3182ce');  // Lighter blue
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, size, size);

// Draw the "M" letter
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 24px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('M', size/2, size/2);

// Draw a small line chart-like symbol
ctx.strokeStyle = '#FFA500';  // Orange color
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(8, 22);
ctx.lineTo(14, 18);
ctx.lineTo(20, 22);
ctx.lineTo(26, 14);
ctx.stroke();

// Convert canvas to buffer
const buffer = canvas.toBuffer('image/png');

// Save as PNG first (for easier viewing)
fs.writeFileSync(path.join(__dirname, 'favicon.png'), buffer);
console.log('Favicon PNG created successfully');

// For ICO conversion, we'd typically use a package like 'png-to-ico'
// But for simplicity, we'll just copy the PNG and rename it to .ico
// In a production environment, use a proper ICO converter
fs.copyFileSync(
  path.join(__dirname, 'favicon.png'),
  path.join(__dirname, 'favicon.ico')
);
console.log('Favicon ICO created successfully (note: this is just a renamed PNG)');
