/**
 * HTML Generator Utility
 * 
 * Converts mobiledoc structure to standalone HTML
 */

/**
 * Convert mobiledoc structure to standalone HTML
 * @param {object} mobiledoc - The mobiledoc object
 * @param {string} title - The title of the report
 * @returns {string} - Complete HTML document
 */
const mobiledocToHTML = (mobiledoc, title) => {
  // Extract the HTML content from the mobiledoc
  const htmlContent = [];
  
  // Add doctype and HTML structure
  htmlContent.push('<!DOCTYPE html>');
  htmlContent.push('<html lang="en">');
  htmlContent.push('<head>');
  htmlContent.push('  <meta charset="UTF-8">');
  htmlContent.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
  htmlContent.push(`  <title>${title || 'Market Pulse Daily Report'}</title>`);
  
  // Add Google Fonts
  htmlContent.push('  <link rel="preconnect" href="https://fonts.googleapis.com">');
  htmlContent.push('  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
  htmlContent.push('  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:wght@400;700&display=swap" rel="stylesheet">');
  
  // Add enhanced CSS styling
  htmlContent.push('  <style>');
  htmlContent.push('    :root {');
  htmlContent.push('      --primary-color: #1a365d;');
  htmlContent.push('      --secondary-color: #2c5282;');
  htmlContent.push('      --accent-color: #f59e0b;');
  htmlContent.push('      --text-color: #2d3748;');
  htmlContent.push('      --light-text: #718096;');
  htmlContent.push('      --background-color: #f7fafc;');
  htmlContent.push('      --card-background: #ffffff;');
  htmlContent.push('      --border-color: #e2e8f0;');
  htmlContent.push('      --success-color: #38a169;');
  htmlContent.push('      --warning-color: #dd6b20;');
  htmlContent.push('      --danger-color: #e53e3e;');
  htmlContent.push('    }');
  htmlContent.push('    ');
  htmlContent.push('    * {');
  htmlContent.push('      box-sizing: border-box;');
  htmlContent.push('      margin: 0;');
  htmlContent.push('      padding: 0;');
  htmlContent.push('    }');
  htmlContent.push('    ');
  htmlContent.push('    body {');
  htmlContent.push('      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;');
  htmlContent.push('      line-height: 1.6;');
  htmlContent.push('      color: var(--text-color);');
  htmlContent.push('      background-color: var(--background-color);');
  htmlContent.push('      padding: 0;');
  htmlContent.push('      margin: 0;');
  htmlContent.push('    }');
  htmlContent.push('    ');
  htmlContent.push('    .container {');
  htmlContent.push('      max-width: 1200px;');
  htmlContent.push('      margin: 0 auto;');
  htmlContent.push('      padding: 2rem 1.5rem;');
  htmlContent.push('    }');
  htmlContent.push('    ');
  htmlContent.push('    .header {');
  htmlContent.push('      text-align: center;');
  htmlContent.push('      margin-bottom: 2rem;');
  htmlContent.push('      padding-bottom: 1.5rem;');
  htmlContent.push('      border-bottom: 1px solid var(--border-color);');
  htmlContent.push('    }');
  htmlContent.push('    ');
  htmlContent.push('    .header h1 {');
  htmlContent.push('      font-family: "Merriweather", serif;');
  htmlContent.push('      font-size: 2.5rem;');
  htmlContent.push('      font-weight: 700;');
  htmlContent.push('      color: var(--primary-color);');
  htmlContent.push('      margin-bottom: 0.5rem;');
  htmlContent.push('      line-height: 1.2;');
  htmlContent.push('    }');
  htmlContent.push('    ');
  htmlContent.push('    .header .date {');
  htmlContent.push('      font-size: 1.1rem;');
  htmlContent.push('      color: var(--light-text);');
  htmlContent.push('    }');
  htmlContent.push('    ');
  htmlContent.push('    .market-pulse-section {');
  htmlContent.push('      margin-bottom: 2.5rem;');
  htmlContent.push('      border-radius: 10px;');
  htmlContent.push('      overflow: hidden;');
  htmlContent.push('      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);');
  htmlContent.push('    }');
  htmlContent.push('    ');
  htmlContent.push('    .market-pulse-card {');
  htmlContent.push('      background-color: var(--card-background);');
  htmlContent.push('      border-radius: 8px;');
  htmlContent.push('      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);');
  htmlContent.push('      padding: 1.5rem;');
  htmlContent.push('      margin-bottom: 1.5rem;');
  htmlContent.push('    }');
  htmlContent.push('    ');
  htmlContent.push('    .decision-banner {');
  htmlContent.push('      background-color: var(--accent-color);');
  htmlContent.push('      display: flex;');
  htmlContent.push('      flex-direction: column;');
  htmlContent.push('      align-items: center;');
  htmlContent.push('      justify-content: center;');
  htmlContent.push('      padding: 2rem 1.5rem;');
  htmlContent.push('      border-radius: 10px;');
  htmlContent.push('      margin: 2rem 0;');
  htmlContent.push('      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);');
  htmlContent.push('    }');
  htmlContent.push('    ');
  htmlContent.push('    .decision-text {');
  htmlContent.push('      color: white;');
  htmlContent.push('      font-weight: 700;');
  htmlContent.push('      text-align: center;');
  htmlContent.push('      font-size: clamp(1.8rem, 5vw, 3rem);');
  htmlContent.push('      line-height: 1.2;');
  htmlContent.push('      display: flex;');
  htmlContent.push('      align-items: center;');
  htmlContent.push('      justify-content: center;');
  htmlContent.push('      width: 100%;');
  htmlContent.push('    }');
  htmlContent.push('    ');
  htmlContent.push('    .collapsible-header {');
  htmlContent.push('      padding: 1.25rem;');
  htmlContent.push('      border-radius: 8px 8px 0 0;');
  htmlContent.push('      margin-bottom: 0;');
  htmlContent.push('    }');
  htmlContent.push('    ');
  htmlContent.push('    .collapsible-content {');
  htmlContent.push('      background-color: var(--card-background);');
  htmlContent.push('      padding: 1.5rem;');
  htmlContent.push('      border-radius: 0 0 8px 8px;');
  htmlContent.push('    }');
  htmlContent.push('    ');
  htmlContent.push('    h2, h3, h4, h5, h6 {');
  htmlContent.push('      font-family: "Inter", sans-serif;');
  htmlContent.push('      font-weight: 600;');
  htmlContent.push('      margin-bottom: 1rem;');
  htmlContent.push('      color: var(--primary-color);');
  htmlContent.push('    }');
  htmlContent.push('    ');
  htmlContent.push('    p {');
  htmlContent.push('      margin-bottom: 1rem;');
  htmlContent.push('    }');
  htmlContent.push('    ');
  htmlContent.push('    .disclaimer {');
  htmlContent.push('      font-size: 0.9rem;');
  htmlContent.push('      color: var(--light-text);');
  htmlContent.push('      padding: 1rem;');
  htmlContent.push('      background-color: #f8f9fa;');
  htmlContent.push('      border-radius: 8px;');
  htmlContent.push('      margin-top: 2rem;');
  htmlContent.push('    }');
  htmlContent.push('    ');
  htmlContent.push('    .footer {');
  htmlContent.push('      text-align: center;');
  htmlContent.push('      padding: 2rem 0;');
  htmlContent.push('      margin-top: 3rem;');
  htmlContent.push('      background-color: var(--primary-color);');
  htmlContent.push('      color: white;');
  htmlContent.push('    }');
  htmlContent.push('    ');
  htmlContent.push('    /* Responsive adjustments */');
  htmlContent.push('    @media (max-width: 768px) {');
  htmlContent.push('      .container {');
  htmlContent.push('        padding: 1.5rem 1rem;');
  htmlContent.push('      }');
  htmlContent.push('      .header h1 {');
  htmlContent.push('        font-size: 2rem;');
  htmlContent.push('      }');
  htmlContent.push('    }');
  htmlContent.push('  </style>');
  htmlContent.push('</head>');
  htmlContent.push('<body>');
  htmlContent.push('  <div class="container">');
  
  // Extract title and date from the title string
  const titleMatch = title.match(/(.*) - (.*)/);
  if (titleMatch) {
    htmlContent.push('    <header class="header">');
    htmlContent.push(`      <h1>${titleMatch[1]}</h1>`);
    htmlContent.push(`      <div class="date">${titleMatch[2]}</div>`);
    htmlContent.push('    </header>');
  } else {
    htmlContent.push('    <header class="header">');
    htmlContent.push(`      <h1>${title || 'Market Pulse Daily Report'}</h1>`);
    htmlContent.push('    </header>');
  }
  
  // Process mobiledoc sections
  mobiledoc.sections.forEach(section => {
    // Handle HTML cards (most of our content is in HTML cards)
    if (section[0] === 10) { // HTML card type
      const cardIndex = section[1];
      const card = mobiledoc.cards[cardIndex];
      if (card[0] === 'html' && card[1].html) {
        htmlContent.push(card[1].html);
      }
    }
    // Handle paragraph sections
    else if (section[0] === 1) { // Paragraph type
      const text = section[1] || '';
      htmlContent.push(`<p>${text}</p>`);
    }
    // Handle heading sections
    else if (section[0] === 3) { // Heading type
      const level = section[1];
      const text = section[2] || '';
      htmlContent.push(`<h${level}>${text}</h${level}>`);
    }
  });
  
  // Add footer
  htmlContent.push('    <footer class="footer">');
  htmlContent.push('      <div class="container">');
  htmlContent.push('        <p>Market Pulse Daily - Actionable Trading Insights</p>');
  htmlContent.push('        <p>&copy; 2025 Market Pulse Daily. All rights reserved.</p>');
  htmlContent.push('      </div>');
  htmlContent.push('    </footer>');
  
  htmlContent.push('  </div>'); // Close container div
  htmlContent.push('</body>');
  htmlContent.push('</html>');
  
  return htmlContent.join('\n');
};

/**
 * Generate standalone HTML from the data object
 * @param {object} data - The data object containing the report information
 * @param {object} mobiledoc - The mobiledoc object
 * @param {string} title - The title of the report
 * @returns {string} - Complete HTML document
 */
const generateStandaloneHTML = (data, mobiledoc, title) => {
  // Process the mobiledoc to generate HTML
  const html = mobiledocToHTML(mobiledoc, title);
  
  // Apply additional enhancements if needed based on data
  // This could include dynamic content not in the mobiledoc
  
  return html;
};

module.exports = {
  mobiledocToHTML,
  generateStandaloneHTML
};
