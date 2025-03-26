/**
 * Simple HTTP server to serve HTML files and favicon
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  
  // Handle root path
  let filePath = req.url === '/' 
    ? path.join(__dirname, 'market_pulse_daily_original_style.html')
    : path.join(__dirname, req.url);
  
  // Get file extension
  const extname = path.extname(filePath);
  let contentType = MIME_TYPES[extname] || 'text/plain';
  
  // Read the file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found
        console.log(`File not found: ${filePath}`);
        
        // If favicon.ico is requested but not found in the requested path,
        // try to serve it from the root directory
        if (req.url === '/favicon.ico') {
          fs.readFile(path.join(__dirname, 'favicon.ico'), (err, content) => {
            if (err) {
              res.writeHead(404);
              res.end('File not found');
              return;
            }
            
            res.writeHead(200, { 'Content-Type': 'image/x-icon' });
            res.end(content, 'utf-8');
          });
          return;
        }
        
        res.writeHead(404);
        res.end('File not found');
      } else {
        // Server error
        console.log(`Server error: ${err.code}`);
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`View original style: http://localhost:${PORT}/`);
  console.log(`View preferred style: http://localhost:${PORT}/market_pulse_daily_preferred.html`);
});
