# Market Pulse Daily - Handlebars Implementation

This directory contains a complete Handlebars implementation for generating beautiful, responsive HTML reports for Market Pulse Daily (formerly AI Trading Analysis).

## Overview

This implementation uses Handlebars templates to generate HTML reports that are:
- Mobile-friendly and responsive
- Aesthetically pleasing with modern design
- Modular and maintainable
- Easy to extend with new components

## Directory Structure

```
market-pulse-handlebars/v2/
├── README.md               # This documentation
├── schema.json             # JSON schema defining the data structure
├── render.js               # JavaScript for rendering templates
├── styles.css              # CSS styles for the report
├── sample-data.json        # Sample data for testing
└── templates/              # Handlebars templates
    ├── main.hbs            # Main template that includes all partials
    ├── decision.hbs        # Trading decision section
    ├── justification.hbs   # Decision justification section
    ├── market-sentiment.hbs # Market sentiment analysis
    ├── market-indicators.hbs # Key market indicators
    ├── sp500-analysis.hbs  # S&P 500 analysis section
    ├── fear-greed-index.hbs # Fear & Greed Index visualization
    ├── rsi-analysis.hbs    # RSI analysis with gauge
    ├── economic-events.hbs # Upcoming economic events
    ├── fundamental-metrics.hbs # Stock metrics
    ├── macroeconomic-factors.hbs # Macro factors
    └── stock-card.hbs      # Partial for stock cards
```

## Components

### 1. Main Template (`main.hbs`)
The main template serves as the container for all other components. It includes:
- HTML document structure
- Header with logo and timestamp
- Footer with branding and disclaimer
- Includes all partial templates

### 2. Decision Section (`decision.hbs`)
Displays the trading decision (Buy, Sell, Hold) with appropriate styling.

### 3. Justification Section (`justification.hbs`)
Shows the detailed justification for the trading decision.

### 4. Market Sentiment (`market-sentiment.hbs`)
Displays overall market sentiment and analyst commentary.

### 5. Market Indicators (`market-indicators.hbs`)
Shows key market indicators including major indices and sector performance.

### 6. S&P 500 Analysis (`sp500-analysis.hbs`)
Provides detailed analysis of the S&P 500 index, including:
- Current index level
- Trailing P/E ratio compared to historical averages
- Earnings per share (trailing 12 months)
- Forward EPS estimates and implied index values
- Top 5 weighted stocks in major indices

### 7. Fear & Greed Index (`fear-greed-index.hbs`)
Visual representation of the CNN Fear & Greed Index with:
- Current value and interpretation
- Interactive gauge showing where the market stands
- Historical comparison (one week ago, one month ago)

### 8. RSI Analysis (`rsi-analysis.hbs`)
Relative Strength Index analysis with:
- Current RSI value and status (oversold, neutral, overbought)
- Visual gauge showing the current position
- Explanation of what the current RSI means for the market

### 9. Economic Events (`economic-events.hbs`)
Lists upcoming economic events that may impact the market, including:
- Date of the event
- Event name
- Importance level (high, medium, low) with color coding

### 10. Fundamental Metrics (`fundamental-metrics.hbs`)
Displays fundamental metrics for different categories of stocks:
- Major indices (SPY, DIA, QQQ, IWM)
- Magnificent Seven stocks (AAPL, MSFT, AMZN, NVDA, GOOGL, META, TSLA)
- Other notable stocks
- Uses the `stock-card.hbs` partial to display each stock

### 11. Macroeconomic Factors (`macroeconomic-factors.hbs`)
Shows macroeconomic data that impacts the market:
- Treasury yields and yield curve status
- Federal Reserve policy and rate expectations
- Inflation metrics (CPI, PCE)
- Geopolitical risks

### 12. Stock Card Partial (`stock-card.hbs`)
A reusable partial template for displaying stock information in a card format.

### 13. Market Sentiment
- Overall market sentiment (Bullish, Bearish, Neutral)
- Trading decision recommendation
- Justification for the recommendation
- Analyst commentary with mentioned symbols

### 14. Market Indicators
- Major indices performance (S&P 500, Dow Jones, Nasdaq, Russell 2000)
- Sector performance
- Volatility indices (VIX, etc.)
- Market futures (S&P 500, Nasdaq, Dow Jones, Russell 2000)

### 15. S&P 500 Analysis
- Current index level
- Trailing P/E ratios
- Forward P/E ratios
- Earnings data (current and projected)
- Top holdings and their performance

### 16. Fear & Greed Index
- Current Fear & Greed reading with visual gauge
- Historical comparison (previous day, week, month)
- Explanation of current market sentiment

### 17. RSI Analysis
- Current RSI reading with visual gauge
- Interpretation of RSI value
- Market path of least resistance

### 18. Macroeconomic Factors
- Treasury yields
- Fed policy and interest rates
- Inflation metrics (CPI, PCE)
- Inflation trend analysis
- GDP growth

### 19. Economic Events
- Upcoming economic events calendar
- Event importance indicators
- Previous, forecast, and actual values for events
- Time and date of events

### 20. Market Futures
- Futures contracts for major indices
- Current values and changes
- Percentage changes with visual indicators

## How to Use

### 1. Prepare Your Data
Format your data according to the schema defined in `schema.json`. You can use `sample-data.json` as a reference.

### 2. Render the Template
Use the `render.js` file to render the templates with your data:

```javascript
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const { registerHelpers, renderTemplate } = require('./render.js');

// Load your data
const data = JSON.parse(fs.readFileSync('your-data.json', 'utf8'));

// Render the template
const html = renderTemplate('main', data);

// Save the output
fs.writeFileSync('output.html', html);
```

### 3. Integration with Existing Code

To integrate this Handlebars implementation with the existing codebase:

1. Transform your analysis results into the JSON format defined in `schema.json`
2. Use the rendering engine to generate the HTML
3. Use the generated HTML in your email sending function

Example integration:

```javascript
function generateEmailTemplateWithHandlebars(analysisResult, isTest = false) {
  // Transform analysisResult into the required JSON format
  const data = transformAnalysisToJson(analysisResult, isTest);
  
  // Render the template
  const html = renderTemplate('main', data);
  
  return html;
}

function transformAnalysisToJson(analysisResult, isTest) {
  // Implementation to transform your analysis result into the required JSON format
  // ...
  
  return transformedData;
}
```

## Customization

### Adding New Components

1. Create a new `.hbs` file in the `templates` directory
2. Update `main.hbs` to include your new component
3. Update `schema.json` to include any new data requirements
4. Add appropriate styles to `styles.css`

### Modifying Styles

Edit the `styles.css` file to customize the appearance of the report. The CSS uses CSS variables for easy theming:

```css
:root {
  --primary-color: #1a365d;
  --secondary-color: #2563eb;
  --accent-color: #3b82f6;
  /* ... other variables ... */
}
```

## Testing

You can test the templates using the provided sample data:

```javascript
const { renderTemplate } = require('./render.js');
const sampleData = require('./sample-data.json');

const html = renderTemplate('main', sampleData);
console.log(html);
```

## Responsive Design

The templates are designed to be responsive and work well on both desktop and mobile devices. The responsive behavior is handled through CSS media queries in the `styles.css` file.

## Integration with Existing Codebase

To integrate this Handlebars implementation with the existing codebase, you'll need to:

1. Create a new function in your Google Apps Script project that transforms the analysis result into the JSON format expected by the Handlebars templates.
2. Use the Handlebars library to compile the templates and generate HTML.
3. Use the generated HTML in your email sending function.

### Example Integration Code

```javascript
/**
 * Transforms analysis result into JSON format for Handlebars templates
 * 
 * @param {Object} analysisResult - The analysis result from OpenAI
 * @param {Boolean} isTest - Whether this is a test email
 * @return {Object} JSON data for Handlebars templates
 */
function transformAnalysisResultToJson(analysisResult, isTest = false) {
  // Get newsletter name
  let newsletterName = 'Market Pulse Daily';
  try {
    const props = PropertiesService.getScriptProperties();
    const propName = props.getProperty('NEWSLETTER_NAME');
    if (propName && propName.trim() !== '') {
      newsletterName = propName.trim();
    }
  } catch (e) {
    // fallback to default
  }
  
  // Calculate next scheduled time
  const nextScheduledTime = getNextScheduledAnalysisTime(new Date());
  
  // Extract data from analysis result
  const analysis = analysisResult.analysis || {};
  const decision = analysisResult.decision || 'Watch for Better Price Action';
  const justification = analysisResult.justification || '';
  const summary = analysisResult.summary || '';
  const timestamp = analysisResult.timestamp || new Date().toISOString();
  
  // Decision color/icon logic
  let decisionColor = '#757575'; // Default gray
  let decisionIcon = '⚠️'; // Default warning icon
  if (decision.toLowerCase().includes('buy')) {
    decisionColor = '#4caf50'; // Green
    decisionIcon = '&#8593;'; // Up arrow
  } else if (decision.toLowerCase().includes('sell')) {
    decisionColor = '#f44336'; // Red
    decisionIcon = '&#8595;'; // Down arrow
  } else if (decision.toLowerCase().includes('hold')) {
    decisionColor = '#ff9800'; // Orange
    decisionIcon = '&#8594;'; // Right arrow
  } else if (decision.toLowerCase().includes('watch')) {
    decisionColor = '#FFA500'; // Orange/Amber
    decisionIcon = '⚠️';
  }
  
  // Create JSON data for Handlebars templates
  return {
    metadata: {
      title: newsletterName,
      timestamp: formatDate(new Date(timestamp)),
      isTest: isTest,
      nextScheduledTime: formatDate(nextScheduledTime)
    },
    decision: {
      text: decision,
      summary: summary,
      color: decisionColor,
      icon: decisionIcon
    },
    justification: justification,
    marketSentiment: analysis.marketSentiment || analysis.sentiment || {},
    marketIndicators: analysis.marketIndicators || {},
    fundamentalMetrics: {
      majorIndices: [], // Transform from analysis.fundamentalMetrics
      magSeven: [],     // Transform from analysis.fundamentalMetrics
      otherStocks: []   // Transform from analysis.fundamentalMetrics
    },
    macroeconomicFactors: analysis.macroeconomicFactors || {}
  };
}

/**
 * Generates HTML using Handlebars templates
 * 
 * @param {Object} data - JSON data for Handlebars templates
 * @return {String} Generated HTML
 */
function generateHtmlWithHandlebars(data) {
  // Load Handlebars library
  const Handlebars = HtmlService.createHtmlOutputFromFile('handlebars.js').getContent();
  
  // Load templates
  const mainTemplate = HtmlService.createHtmlOutputFromFile('templates/main.hbs').getContent();
  const decisionTemplate = HtmlService.createHtmlOutputFromFile('templates/decision.hbs').getContent();
  // ... load other templates
  
  // Register partials
  Handlebars.registerPartial('decision', decisionTemplate);
  // ... register other partials
  
  // Register helpers
  Handlebars.registerHelper('formatNumber', function(value) {
    if (typeof value !== 'number' || !isFinite(value)) return 'N/A';
    return value.toFixed(2);
  });
  // ... register other helpers
  
  // Compile and render template
  const template = Handlebars.compile(mainTemplate);
  return template(data);
}

/**
 * Generates and sends email using Handlebars templates
 * 
 * @param {Object} analysisResult - The analysis result from OpenAI
 * @param {Boolean} isTest - Whether this is a test email
 * @return {Object} Result of the email sending operation
 */
function sendEmailWithHandlebars(analysisResult, isTest = false) {
  try {
    // Transform analysis result to JSON for Handlebars
    const data = transformAnalysisResultToJson(analysisResult, isTest);
    
    // Generate HTML using Handlebars
    const html = generateHtmlWithHandlebars(data);
    
    // Send email
    // ... existing email sending code
    
    return {
      success: true,
      message: "Email sent successfully"
    };
  } catch (error) {
    Logger.log('Error sending email with Handlebars: ' + error.toString());
    return {
      success: false,
      message: "Failed to send email",
      error: error.toString()
    };
  }
}
```

## Running Locally for Development

For local development and testing, you can use Node.js to render the templates:

1. Install dependencies:
   ```
   npm install handlebars
   ```

2. Run the render script:
   ```
   node render.js sample-data.json output.html
   ```

3. Open `output.html` in your browser to view the rendered template.

## Benefits of This Approach

1. **Separation of Concerns**: Clear separation between data, presentation, and logic
2. **Maintainability**: Easier to maintain and update templates
3. **Reusability**: Templates can be reused across different parts of the application
4. **Testability**: Templates can be tested independently of the application logic
5. **Scalability**: Easy to add new sections or modify existing ones without changing the core code

## Future Enhancements

1. Add more helper functions for formatting and conditional logic
2. Create additional templates for different types of reports
3. Implement a theme system for customizing the look and feel
4. Add support for different languages and localization
5. Integrate with a build system for optimizing CSS and JavaScript
