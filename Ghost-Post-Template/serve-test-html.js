/**
 * Simple HTTP server to view the generated HTML files
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Directory containing the test HTML files
const testDir = path.join(__dirname, 'test-output');
// Directory containing the title images
const imagesDir = path.join(__dirname, 'title-images');

// Create server
const server = http.createServer((req, res) => {
  // Parse the URL
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;
  
  // Normalize pathname
  pathname = pathname === '/' ? '/index.html' : pathname;
  
  // Determine content type based on file extension
  const ext = path.extname(pathname);
  let contentType = 'text/html';
  
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      contentType = 'image/jpeg';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.js':
      contentType = 'text/javascript';
      break;
  }
  
  // If requesting the index page, show links to all HTML files
  if (pathname === '/index.html') {
    try {
      const files = fs.readdirSync(testDir)
        .filter(file => file.endsWith('.html'))
        .map(file => {
          const sentiment = file.split('-')[0];
          return `<li><a href="/${file}">${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} Title Test</a></li>`;
        })
        .join('\n');
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Market Pulse Daily - Title Image Tests</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              color: #1a365d;
            }
            ul {
              list-style-type: none;
              padding: 0;
            }
            li {
              margin: 10px 0;
              padding: 10px;
              background-color: #f0f4f8;
              border-radius: 5px;
            }
            a {
              color: #2c5282;
              text-decoration: none;
              font-weight: bold;
            }
            a:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <h1>Market Pulse Daily - Title Image Tests</h1>
          <p>Click on a test to view the HTML with title image:</p>
          <ul>
            ${files}
          </ul>
        </body>
        </html>
      `;
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(html);
      return;
    } catch (error) {
      console.error('Error generating index:', error);
      res.writeHead(500);
      res.end('Internal Server Error');
      return;
    }
  }
  
  // Determine the file path
  let filePath;
  if (pathname.startsWith('/bullish/') || 
      pathname.startsWith('/bearish/') || 
      pathname.startsWith('/neutral/') || 
      pathname.startsWith('/volatile/')) {
    // This is an image path
    filePath = path.join(imagesDir, pathname);
  } else {
    // This is an HTML file or other resource
    filePath = path.join(testDir, pathname.substring(1));
  }
  
  // Read the file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found
        console.error(`File not found: ${filePath}`);
        res.writeHead(404);
        res.end('File Not Found');
      } else {
        // Server error
        console.error(`Server error: ${err}`);
        res.writeHead(500);
        res.end('Internal Server Error');
      }
      return;
    }
    
    // Serve the file
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

// Start the server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log('Press Ctrl+C to stop the server');
});
