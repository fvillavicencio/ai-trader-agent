/**
 * Market Pulse Daily - Preview Server
 * 
 * This script creates a local server to preview the Ghost post with custom CSS
 * before publishing it to Ghost.io.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'src')));

// Route for previewing the Ghost post
app.get('/', (req, res) => {
  try {
    // Read the ghost-post.json file
    const ghostPostPath = path.join(__dirname, 'ghost-post.json');
    const ghostPost = JSON.parse(fs.readFileSync(ghostPostPath, 'utf8'));
    
    // Extract HTML content from the mobiledoc
    let htmlContent = '';
    ghostPost.cards.forEach((card, index) => {
      if (card[0] === 'html') {
        htmlContent += card[1].html;
      } else if (card[0] === 'paragraph') {
        htmlContent += `<p>${card[1].markdown}</p>`;
      } else if (card[0] === 'heading') {
        const level = card[1].level;
        htmlContent += `<h${level}>${card[1].text}</h${level}>`;
      } else if (card[0] === 'hr') {
        htmlContent += '<hr>';
      }
    });
    
    // Create a preview HTML page
    const previewHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Market Pulse Daily - Preview</title>
        <link rel="stylesheet" href="/custom-styles.css">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
          }
          
          .preview-container {
            background-color: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          }
          
          .preview-header {
            background-color: #2d3748;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .preview-header h1 {
            margin: 0;
            font-size: 1.2rem;
          }
          
          .preview-header a {
            color: white;
            text-decoration: none;
            padding: 5px 10px;
            background-color: #4a5568;
            border-radius: 4px;
            font-size: 0.9rem;
          }
          
          .preview-header a:hover {
            background-color: #718096;
          }
        </style>
      </head>
      <body>
        <div class="preview-header">
          <h1>Market Pulse Daily - Preview</h1>
          <div>
            <a href="/edit-css" target="_blank">Edit CSS</a>
            <a href="/regenerate" target="_blank">Regenerate</a>
          </div>
        </div>
        
        <div class="preview-container">
          ${htmlContent}
        </div>
        
        <script>
          // Add any JavaScript for interactive elements here
        </script>
      </body>
      </html>
    `;
    
    res.send(previewHtml);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Serve the demo file
app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'demo.html'));
});

// Route for editing the CSS
app.get('/edit-css', (req, res) => {
  const cssPath = path.join(__dirname, 'src', 'custom-styles.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  
  const editHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Edit CSS - Market Pulse Daily</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        
        .editor-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .editor-header {
          background-color: #2d3748;
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .editor-header h1 {
          margin: 0;
          font-size: 1.2rem;
        }
        
        textarea {
          width: 100%;
          height: 70vh;
          padding: 15px;
          font-family: monospace;
          font-size: 14px;
          border: 1px solid #ddd;
          border-radius: 4px;
          resize: vertical;
        }
        
        .button {
          background-color: #4a5568;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }
        
        .button:hover {
          background-color: #718096;
        }
        
        .button-primary {
          background-color: #3182ce;
        }
        
        .button-primary:hover {
          background-color: #2c5282;
        }
      </style>
    </head>
    <body>
      <div class="editor-container">
        <div class="editor-header">
          <h1>Edit CSS - Market Pulse Daily</h1>
          <a href="/" class="button">Back to Preview</a>
        </div>
        
        <form action="/save-css" method="post">
          <textarea name="css" id="css-editor">${cssContent}</textarea>
          <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
            <button type="submit" class="button button-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </body>
    </html>
  `;
  
  res.send(editHtml);
});

// Route for saving the CSS
app.use(express.urlencoded({ extended: true }));
app.post('/save-css', (req, res) => {
  try {
    const cssPath = path.join(__dirname, 'src', 'custom-styles.css');
    fs.writeFileSync(cssPath, req.body.css);
    res.redirect('/');
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Route for regenerating the Ghost post
app.get('/regenerate', (req, res) => {
  try {
    const { execSync } = require('child_process');
    execSync('node generate-ghost-post-new.js', { stdio: 'inherit' });
    res.redirect('/');
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Preview server running at http://localhost:${PORT}`);
});
