/**
 * Market Pulse Daily - Ghost Post Generator
 * 
 * This script converts the Market Pulse Daily JSON data into Ghost Koenig blocks
 * for publishing to Ghost.io using the Admin API.
 */

const fs = require('fs');
const path = require('path');

// Load the JSON data
const loadData = () => {
  try {
    const dataPath = path.join(__dirname, 'full-dataset.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error loading data:', error);
    process.exit(1);
  }
};

// Generate Ghost Koenig blocks from the JSON data
const generateGhostPost = (data) => {
  // Initialize the mobiledoc structure required by Ghost
  const mobiledoc = {
    version: '0.3.1',
    atoms: [],
    cards: [],
    markups: [],
    sections: []
  };
  
  // Add the content to the mobiledoc
  addHeader(mobiledoc, data);
  addDecisionBanner(mobiledoc, data);
  addMarketSentiment(mobiledoc, data);
  addMarketIndicators(mobiledoc, data);
  addFundamentalMetrics(mobiledoc, data);
  addMacroeconomicFactors(mobiledoc, data);
  addDisclaimer(mobiledoc, data);
  
  return mobiledoc;
};

// Helper function to add a heading card
const addHeading = (mobiledoc, text, level = 2) => {
  mobiledoc.cards.push([
    'heading', 
    { 
      level: level, 
      text: text 
    }
  ]);
  mobiledoc.sections.push([10, mobiledoc.cards.length - 1]);
};

// Helper function to add a paragraph card
const addParagraph = (mobiledoc, text) => {
  mobiledoc.cards.push([
    'paragraph', 
    { 
      markdown: text 
    }
  ]);
  mobiledoc.sections.push([10, mobiledoc.cards.length - 1]);
};

// Helper function to add an HTML card
const addHTML = (mobiledoc, html) => {
  mobiledoc.cards.push([
    'html', 
    { 
      html: html 
    }
  ]);
  mobiledoc.sections.push([10, mobiledoc.cards.length - 1]);
};

// Helper function to add a divider card
const addDivider = (mobiledoc) => {
  mobiledoc.cards.push([
    'hr', 
    {}
  ]);
  mobiledoc.sections.push([10, mobiledoc.cards.length - 1]);
};

// Add the header section
const addHeader = (mobiledoc, data) => {
  // Add the title
  addHeading(mobiledoc, data.metadata.title, 1);
  
  // Add the date
  addParagraph(mobiledoc, `*${data.reportDateDisplay}*`);
  
  // Add a divider
  addDivider(mobiledoc);
};

// Add the decision banner section
const addDecisionBanner = (mobiledoc, data) => {
  if (!data.decision) return;
  
  const decisionIcon = getDecisionIcon(data.decision.text);
  const decisionColor = data.decision.color || '#f59e0b';
  
  const html = `
    <div style="background-color: ${decisionColor}; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
      <div style="font-size: 1.5rem; font-weight: bold; margin-bottom: 5px;">
        ${decisionIcon} ${data.decision.text}
      </div>
      <div style="font-size: 1.1rem;">
        ${data.decision.summary}
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, html);
  
  if (data.justification) {
    addParagraph(mobiledoc, data.justification);
  }
  
  addDivider(mobiledoc);
};

// Get the appropriate icon for the decision
const getDecisionIcon = (decision) => {
  if (decision.includes('Buy')) return '↑';
  if (decision.includes('Sell')) return '↓';
  if (decision.includes('Watch')) return '👀';
  if (decision.includes('Hedge')) return '🛡️';
  if (decision.includes('Position')) return '📈';
  return '⚠️';
};

// Add the market sentiment section
const addMarketSentiment = (mobiledoc, data) => {
  if (!data.marketSentiment) return;
  
  addHeading(mobiledoc, 'Market Sentiment');
  
  // Add overall sentiment
  const sentimentColor = getSentimentColor(data.marketSentiment.overall);
  const html = `
    <div style="margin-bottom: 15px;">
      <div style="font-weight: bold; margin-bottom: 5px;">Overall Sentiment:</div>
      <div style="font-size: 1.2rem; font-weight: bold; color: ${sentimentColor};">
        ${data.marketSentiment.overall}
      </div>
    </div>
  `;
  
  addHTML(mobiledoc, html);
  
  // Add analyst commentary
  if (data.marketSentiment.analysts && data.marketSentiment.analysts.length > 0) {
    addHeading(mobiledoc, 'Analyst Commentary', 3);
    
    data.marketSentiment.analysts.forEach(analyst => {
      const mentionedSymbols = analyst.mentionedSymbols && analyst.mentionedSymbols.length > 0 
        ? `<div style="margin-top: 5px;"><strong>Mentioned:</strong> ${analyst.mentionedSymbols.join(', ')}</div>` 
        : '';
      
      const analystHtml = `
        <div style="margin-bottom: 15px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="font-weight: bold; margin-bottom: 5px; color: #2c5282;">${analyst.name}:</div>
          <div style="line-height: 1.5;">
            ${analyst.comment}
            ${mentionedSymbols}
          </div>
          <div style="font-size: 0.8rem; color: #666; margin-top: 10px; text-align: right;">
            Source: ${analyst.source}
          </div>
        </div>
      `;
      
      addHTML(mobiledoc, analystHtml);
    });
  }
  
  // Add source information
  if (data.marketSentiment.source) {
    const sourceDate = new Date(data.marketSentiment.lastUpdated).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const sourceHtml = `
      <div style="font-size: 0.8rem; color: #666; margin-top: 10px; text-align: right;">
        Source: ${data.marketSentiment.source}<br>
        Last Updated: ${sourceDate}
      </div>
    `;
    
    addHTML(mobiledoc, sourceHtml);
  }
  
  addDivider(mobiledoc);
};

// Get the appropriate color for the sentiment
const getSentimentColor = (sentiment) => {
  if (sentiment === 'Bullish') return '#10b981';
  if (sentiment === 'Somewhat Bullish') return '#34d399';
  if (sentiment === 'Neutral') return '#6b7280';
  if (sentiment === 'Somewhat Bearish') return '#f97316';
  if (sentiment === 'Bearish') return '#ef4444';
  return '#6b7280';
};

// Add the market indicators section
const addMarketIndicators = (mobiledoc, data) => {
  if (!data.marketIndicators) return;
  
  addHeading(mobiledoc, 'Key Market Indicators');
  
  // Add Major Indices
  if (data.marketIndicators.majorIndices && data.marketIndicators.majorIndices.length > 0) {
    addHeading(mobiledoc, 'Major Indices', 3);
    
    const indicesHtml = `
      <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
        ${data.marketIndicators.majorIndices.map(index => {
          const changeColor = index.isPositive ? '#10b981' : '#ef4444';
          const changeIcon = index.isPositive ? '↑' : '↓';
          
          return `
            <div style="flex: 1; min-width: 200px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 5px;">${index.name}</div>
              <div style="font-size: 1.2rem; font-weight: bold; color: ${changeColor};">
                ${changeIcon} ${Math.abs(index.change).toFixed(2)}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    addHTML(mobiledoc, indicesHtml);
  }
  
  // Add Sector Performance
  if (data.marketIndicators.sectorPerformance && data.marketIndicators.sectorPerformance.length > 0) {
    addHeading(mobiledoc, 'Sector Performance', 3);
    
    const sectorsHtml = `
      <div style="margin-bottom: 20px;">
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0;">Sector</th>
                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">Change</th>
              </tr>
            </thead>
            <tbody>
              ${data.marketIndicators.sectorPerformance.map(sector => {
                const changeColor = sector.isPositive ? '#10b981' : '#ef4444';
                const changeSign = sector.isPositive ? '+' : '';
                const changeValue = typeof sector.change === 'number' ? sector.change.toFixed(2) : sector.change;
                
                return `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${sector.name}</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0; color: ${changeColor};">
                      ${changeSign}${changeValue}%
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    addHTML(mobiledoc, sectorsHtml);
  }
  
  // Add Fear & Greed Index
  if (data.marketIndicators.fearGreed) {
    addHeading(mobiledoc, 'Fear & Greed Index', 3);
    
    const fearGreed = data.marketIndicators.fearGreed;
    const fearGreedHtml = `
      <div style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div style="font-weight: bold; font-size: 1.1rem;">Current Value:</div>
          <div style="font-size: 1.2rem; font-weight: bold; color: ${fearGreed.color};">${fearGreed.value} - ${fearGreed.label}</div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <div style="height: 20px; background-color: #f1f5f9; border-radius: 10px; overflow: hidden; position: relative;">
            <div style="position: absolute; top: 0; left: 0; height: 100%; width: 100%; display: flex;">
              <div style="flex: 1; background-color: #ef4444; border-radius: 10px 0 0 10px;"></div>
              <div style="flex: 1; background-color: #f97316;"></div>
              <div style="flex: 1; background-color: #f59e0b;"></div>
              <div style="flex: 1; background-color: #10b981;"></div>
              <div style="flex: 1; background-color: #10b981; border-radius: 0 10px 10px 0;"></div>
            </div>
            <div style="position: absolute; top: 0; left: ${fearGreed.value}%; height: 100%; width: 4px; background-color: #000; transform: translateX(-50%);"></div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 0.8rem; color: #666;">
            <div>Extreme Fear</div>
            <div>Fear</div>
            <div>Neutral</div>
            <div>Greed</div>
            <div>Extreme Greed</div>
          </div>
        </div>
        
        <div style="font-size: 0.9rem; color: #333;">
          <div style="margin-bottom: 5px;"><strong>Previous Close:</strong> ${fearGreed.previousClose} - ${fearGreed.previousCloseLabel}</div>
          <div style="margin-bottom: 5px;"><strong>One Week Ago:</strong> ${fearGreed.oneWeekAgo} - ${fearGreed.oneWeekAgoLabel}</div>
          <div><strong>One Month Ago:</strong> ${fearGreed.oneMonthAgo} - ${fearGreed.oneMonthAgoLabel}</div>
        </div>
        
        <div style="font-size: 0.8rem; color: #666; margin-top: 10px; text-align: right;">
          Source: CNN Business Fear & Greed Index
        </div>
      </div>
    `;
    
    addHTML(mobiledoc, fearGreedHtml);
  }
  
  // Add Volatility Indices
  if (data.marketIndicators.volatilityIndices && data.marketIndicators.volatilityIndices.length > 0) {
    addHeading(mobiledoc, 'Volatility Indices', 3);
    
    const volatilityHtml = `
      <div style="margin-bottom: 20px;">
        ${data.marketIndicators.volatilityIndices.map(index => {
          const trendColor = index.trend === 'Rising' ? '#ef4444' : '#10b981';
          const trendIcon = index.trend === 'Rising' ? '↑' : '↓';
          
          return `
            <div style="margin-bottom: 15px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-weight: bold; margin-bottom: 5px;">${index.name}: <span style="color: ${trendColor};">${index.value} ${trendIcon}</span></div>
              <div style="font-size: 0.9rem; color: #333; margin-bottom: 5px;">
                <strong>Trend:</strong> <span style="color: ${trendColor};">${index.trend}</span>
              </div>
              <div style="font-size: 0.9rem; color: #333;">${index.analysis}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    addHTML(mobiledoc, volatilityHtml);
  }
  
  // Add Top Holdings (ETF Holdings)
  if (data.marketIndicators.topHoldings && data.marketIndicators.topHoldings.length > 0) {
    addHeading(mobiledoc, 'Top 5 Weighted Stocks in Major Indices', 3);
    
    const holdingsHtml = `
      <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
        ${data.marketIndicators.topHoldings.map(etf => {
          return `
            <div style="flex: 1 1 300px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 10px; color: #2c5282;">
                ${etf.name} (${etf.symbol})
              </div>
              <div>
                ${etf.holdings.map((holding, index) => {
                  return `
                    <div style="display: flex; justify-content: space-between; padding: 8px; background-color: ${index % 2 === 0 ? '#fff' : '#f1f5f9'}; border-radius: 4px; margin-bottom: 5px;">
                      <div style="font-weight: ${index === 0 ? 'bold' : 'normal'};">
                        <span style="color: #2563eb;">${holding.symbol}</span> ${holding.name}
                      </div>
                      <div>${holding.weight}%</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    addHTML(mobiledoc, holdingsHtml);
  }
  
  addDivider(mobiledoc);
};

// Add the fundamental metrics section
const addFundamentalMetrics = (mobiledoc, data) => {
  if (!data.fundamentalMetrics) return;
  
  addHeading(mobiledoc, 'Fundamental Metrics');
  
  // Helper function to format metrics
  const formatMetricValue = (key, value) => {
    if (value === null || value === undefined) return 'N/A';
    
    // Format based on metric type
    switch(key) {
      case 'marketCap':
        return formatMarketCap(value);
      case 'volume':
        return formatVolume(value);
      case 'pe':
      case 'forwardPE':
      case 'pegRatio':
        return value.toFixed(2);
      case 'priceToBook':
      case 'priceToSales':
      case 'debtToEquity':
      case 'returnOnEquity':
        return value.toFixed(2);
      case 'beta':
        return value.toFixed(2);
      case 'dividend':
      case 'dividendYield':
        return value.toFixed(2) + '%';
      default:
        return value.toString();
    }
  };
  
  // Format market cap with appropriate suffix
  const formatMarketCap = (value) => {
    if (value >= 1e12) {
      return (value / 1e12).toFixed(2) + 'T';
    } else if (value >= 1e9) {
      return (value / 1e9).toFixed(2) + 'B';
    } else if (value >= 1e6) {
      return (value / 1e6).toFixed(2) + 'M';
    } else {
      return value.toString();
    }
  };
  
  // Format volume with appropriate suffix
  const formatVolume = (value) => {
    if (value >= 1e9) {
      return (value / 1e9).toFixed(2) + 'B';
    } else if (value >= 1e6) {
      return (value / 1e6).toFixed(2) + 'M';
    } else if (value >= 1e3) {
      return (value / 1e3).toFixed(2) + 'K';
    } else {
      return value.toString();
    }
  };
  
  // Function to create a stock card
  const createStockCard = (stock) => {
    const changeColor = stock.priceChange >= 0 ? '#10b981' : '#ef4444';
    const changeIcon = stock.priceChange >= 0 ? '↑' : '↓';
    const changeSign = stock.priceChange >= 0 ? '+' : '';
    const percentChange = stock.percentChange || (stock.priceChange / (stock.price - stock.priceChange) * 100);
    
    return `
      <div style="flex: 1 1 calc(50% - 10px); min-width: 300px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 5px solid ${changeColor}; margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
          <div>
            <div style="font-weight: bold; font-size: 1.2rem; color: #2c5282;">${stock.symbol}</div>
            <div style="font-size: 0.9rem; color: #4a5568;">${stock.name}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold; font-size: 1.1rem;">$${stock.price.toFixed(2)}</div>
            <div style="color: ${changeColor}; font-weight: bold;">
              ${changeIcon} ${changeSign}${Math.abs(stock.priceChange).toFixed(2)} (${changeSign}${Math.abs(percentChange).toFixed(2)}%)
            </div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin-bottom: 10px;">
          ${Object.entries(stock.metrics || {}).map(([key, value]) => {
            if (value === null || value === undefined) return '';
            const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            return `
              <div>
                <div style="font-size: 0.8rem; color: #718096;">${formattedKey}</div>
                <div style="font-weight: bold;">${formatMetricValue(key, value)}</div>
              </div>
            `;
          }).join('')}
        </div>
        
        ${stock.analysis ? `
          <div style="margin-top: 10px; padding: 10px; background-color: #edf2f7; border-radius: 4px; font-size: 0.9rem;">
            <div style="font-weight: bold; margin-bottom: 5px;">Analysis:</div>
            <div>${stock.analysis}</div>
          </div>
        ` : ''}
        
        ${stock.recommendation ? `
          <div style="margin-top: 10px; display: inline-block; padding: 5px 10px; border-radius: 4px; font-weight: bold; font-size: 0.9rem; background-color: ${
            stock.recommendation === 'Buy' ? '#10b981' : 
            stock.recommendation === 'Sell' ? '#ef4444' : 
            stock.recommendation === 'Hold' ? '#f59e0b' : '#6b7280'
          }; color: white;">
            ${stock.recommendation}
          </div>
        ` : ''}
      </div>
    `;
  };
  
  // Add Major Indices
  if (data.fundamentalMetrics.majorIndices && data.fundamentalMetrics.majorIndices.length > 0) {
    addHeading(mobiledoc, 'Major Indices', 3);
    
    const indicesHtml = `
      <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
        ${data.fundamentalMetrics.majorIndices.map(stock => createStockCard(stock)).join('')}
      </div>
    `;
    
    addHTML(mobiledoc, indicesHtml);
  }
  
  // Add Magnificent Seven
  if (data.fundamentalMetrics.magnificentSeven && data.fundamentalMetrics.magnificentSeven.length > 0) {
    addHeading(mobiledoc, 'Magnificent Seven', 3);
    
    const magnificentSevenHtml = `
      <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
        ${data.fundamentalMetrics.magnificentSeven.map(stock => createStockCard(stock)).join('')}
      </div>
    `;
    
    addHTML(mobiledoc, magnificentSevenHtml);
  }
  
  // Add Other Stocks
  if (data.fundamentalMetrics.otherStocks && data.fundamentalMetrics.otherStocks.length > 0) {
    addHeading(mobiledoc, 'Other Stocks', 3);
    
    const otherStocksHtml = `
      <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
        ${data.fundamentalMetrics.otherStocks.map(stock => createStockCard(stock)).join('')}
      </div>
    `;
    
    addHTML(mobiledoc, otherStocksHtml);
  }
  
  // Add source information
  if (data.fundamentalMetrics.source) {
    const sourceDate = data.fundamentalMetrics.lastUpdated ? 
      new Date(data.fundamentalMetrics.lastUpdated).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';
    
    const sourceHtml = `
      <div style="font-size: 0.8rem; color: #666; margin-top: 10px; text-align: right;">
        Source: ${data.fundamentalMetrics.source}
        ${sourceDate ? `<br>Last Updated: ${sourceDate}` : ''}
      </div>
    `;
    
    addHTML(mobiledoc, sourceHtml);
  }
  
  addDivider(mobiledoc);
};

// Add the macroeconomic factors section
const addMacroeconomicFactors = (mobiledoc, data) => {
  if (!data.macroeconomicFactors) return;
  
  addHeading(mobiledoc, 'Macroeconomic Factors');
  
  // Add Treasury Yields
  if (data.macroeconomicFactors.treasuryYields) {
    addHeading(mobiledoc, 'Treasury Yields', 3);
    
    const treasuryYields = data.macroeconomicFactors.treasuryYields;
    const yieldCurveStatus = treasuryYields.yieldCurveStatus || 'Normal';
    const isInverted = treasuryYields.isInverted || false;
    
    const treasuryYieldsHtml = `
      <div style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
          ${Object.entries(treasuryYields.yields || {}).map(([key, value]) => {
            if (key === 'yieldCurveStatus' || key === 'isInverted' || key === 'analysis') return '';
            
            const label = key
              .replace('threeMonth', '3-Month')
              .replace('sixMonth', '6-Month')
              .replace('oneYear', '1-Year')
              .replace('twoYear', '2-Year')
              .replace('fiveYear', '5-Year')
              .replace('tenYear', '10-Year')
              .replace('thirtyYear', '30-Year')
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase());
            
            const change = treasuryYields.changes && treasuryYields.changes[key] 
              ? treasuryYields.changes[key] 
              : 0;
            
            const changeColor = change >= 0 ? '#10b981' : '#ef4444';
            const changeSign = change >= 0 ? '+' : '';
            const yieldValue = typeof value === 'number' ? value.toFixed(2) : value;
            const changeValue = typeof change === 'number' ? Math.abs(change).toFixed(2) : Math.abs(change);
            
            return `
              <div style="flex: 1 1 200px; padding: 10px; background-color: white; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div style="font-weight: bold; margin-bottom: 5px;">${label} Treasury Yield</div>
                <div style="font-size: 1.1rem; font-weight: bold;">${yieldValue}%</div>
                <div style="font-size: 0.9rem; color: ${changeColor};">
                  Change: ${changeSign}${changeValue}%
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div style="margin-bottom: 15px; padding: 10px; background-color: white; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
          <div style="font-weight: bold; margin-bottom: 5px;">Yield Curve Status</div>
          <div style="display: flex; flex-wrap: wrap; gap: 15px;">
            <div>
              <div style="font-size: 0.9rem; color: #718096;">Status</div>
              <div style="font-weight: bold;">${yieldCurveStatus}</div>
            </div>
            <div>
              <div style="font-size: 0.9rem; color: #718096;">10Y-2Y Spread</div>
              <div style="font-weight: bold;">
                ${treasuryYields.tenYearTwoYearSpread ? treasuryYields.tenYearTwoYearSpread.toFixed(2) + '%' : 'N/A'}
              </div>
            </div>
            <div>
              <div style="font-size: 0.9rem; color: #718096;">Inverted</div>
              <div style="font-weight: bold;">${isInverted ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>
        
        ${treasuryYields.analysis ? `
          <div style="font-size: 0.9rem; color: #333; line-height: 1.5;">
            ${treasuryYields.analysis}
          </div>
        ` : ''}
        
        <div style="font-size: 0.8rem; color: #666; margin-top: 10px; text-align: right;">
          Source: Federal Reserve Economic Data (FRED)
        </div>
      </div>
    `;
    
    addHTML(mobiledoc, treasuryYieldsHtml);
  }
  
  // Add Federal Reserve Policy
  if (data.macroeconomicFactors.federalReserve) {
    addHeading(mobiledoc, 'Federal Reserve Policy', 3);
    
    const fedPolicy = data.macroeconomicFactors.federalReserve;
    
    const fedPolicyHtml = `
      <div style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="margin-bottom: 15px;">
          <div style="font-weight: bold; margin-bottom: 5px;">Current Policy Rate</div>
          <div style="font-size: 1.2rem; font-weight: bold;">
            ${fedPolicy.currentRate ? fedPolicy.currentRate + '%' : 'N/A'}
          </div>
          <div style="font-size: 0.9rem; color: #718096;">
            Range: ${fedPolicy.rateRange || 'N/A'}
          </div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <div style="font-weight: bold; margin-bottom: 5px;">Forward Guidance</div>
          <div style="font-size: 0.9rem; color: #333; line-height: 1.5;">
            ${fedPolicy.forwardGuidance || 'No forward guidance available.'}
          </div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <div style="font-weight: bold; margin-bottom: 5px;">Meeting Schedule</div>
          <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            <div style="flex: 1;">
              <div style="font-size: 0.9rem; color: #718096;">Last Meeting</div>
              <div style="font-weight: bold;">${fedPolicy.lastMeeting || 'N/A'}</div>
            </div>
            <div style="flex: 1;">
              <div style="font-size: 0.9rem; color: #718096;">Next Meeting</div>
              <div style="font-weight: bold;">${fedPolicy.nextMeeting || 'N/A'}</div>
            </div>
          </div>
        </div>
        
        ${fedPolicy.forwardGuidanceSource ? `
          <div style="font-size: 0.8rem; color: #666; margin-top: 10px; text-align: right;">
            Source: ${fedPolicy.forwardGuidanceSource.name || 'Federal Reserve'}
            ${fedPolicy.forwardGuidanceSource.url ? `<br><a href="${fedPolicy.forwardGuidanceSource.url}" target="_blank" rel="noopener noreferrer">${fedPolicy.forwardGuidanceSource.url}</a>` : ''}
          </div>
        ` : ''}
      </div>
    `;
    
    addHTML(mobiledoc, fedPolicyHtml);
  }
  
  // Add Inflation Data
  if (data.macroeconomicFactors.inflation) {
    addHeading(mobiledoc, 'Inflation', 3);
    
    const inflation = data.macroeconomicFactors.inflation;
    
    const inflationHtml = `
      <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
        <!-- CPI Card -->
        ${inflation.cpi ? `
          <div style="flex: 1 1 300px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 10px; color: #2c5282;">Consumer Price Index (CPI)</div>
            
            <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 10px;">
              <div style="flex: 1; min-width: 120px;">
                <div style="font-size: 0.9rem; color: #718096;">Headline CPI</div>
                <div style="font-size: 1.2rem; font-weight: bold;">${inflation.cpi.headline ? inflation.cpi.headline.toFixed(1) + '%' : 'N/A'}</div>
              </div>
              
              <div style="flex: 1; min-width: 120px;">
                <div style="font-size: 0.9rem; color: #718096;">Core CPI</div>
                <div style="font-size: 1.2rem; font-weight: bold;">${inflation.cpi.core ? inflation.cpi.core.toFixed(1) + '%' : 'N/A'}</div>
              </div>
            </div>
            
            ${inflation.cpi.source ? `
              <div style="font-size: 0.8rem; color: #666; margin-top: 10px; text-align: right;">
                Source: ${inflation.cpi.source.name || 'Bureau of Labor Statistics'}
                ${inflation.cpi.lastUpdated ? `<br>Last Updated: ${new Date(inflation.cpi.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''}
              </div>
            ` : ''}
          </div>
        ` : ''}
        
        <!-- PCE Card -->
        ${inflation.pce ? `
          <div style="flex: 1 1 300px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 10px; color: #2c5282;">Personal Consumption Expenditures (PCE)</div>
            
            <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 10px;">
              <div style="flex: 1; min-width: 120px;">
                <div style="font-size: 0.9rem; color: #718096;">Headline PCE</div>
                <div style="font-size: 1.2rem; font-weight: bold;">${inflation.pce.headline ? inflation.pce.headline.toFixed(1) + '%' : 'N/A'}</div>
              </div>
              
              <div style="flex: 1; min-width: 120px;">
                <div style="font-size: 0.9rem; color: #718096;">Core PCE</div>
                <div style="font-size: 1.2rem; font-weight: bold;">${inflation.pce.core ? inflation.pce.core.toFixed(1) + '%' : 'N/A'}</div>
              </div>
            </div>
            
            ${inflation.pce.source ? `
              <div style="font-size: 0.8rem; color: #666; margin-top: 10px; text-align: right;">
                Source: ${inflation.pce.source.name || 'Bureau of Economic Analysis'}
                ${inflation.pce.lastUpdated ? `<br>Last Updated: ${new Date(inflation.pce.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''}
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
    
    addHTML(mobiledoc, inflationHtml);
  }
  
  // Add Geopolitical Risks
  if (data.macroeconomicFactors.geopoliticalRisks) {
    addHeading(mobiledoc, 'Geopolitical Risks', 3);
    
    const geopoliticalRisks = data.macroeconomicFactors.geopoliticalRisks;
    
    const geopoliticalRisksHtml = `
      <div style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="font-size: 0.9rem; color: #333; line-height: 1.5; margin-bottom: 15px;">
          ${geopoliticalRisks.global || 'No global geopolitical risk assessment available.'}
        </div>
        
        ${geopoliticalRisks.risks && geopoliticalRisks.risks.length > 0 ? `
          <div>
            ${geopoliticalRisks.risks.map(risk => {
              const impactColor = 
                risk.impactLevel === 'High' || risk.impactLevel >= 7 ? '#ef4444' :
                risk.impactLevel === 'Moderate' || (risk.impactLevel >= 4 && risk.impactLevel < 7) ? '#f59e0b' :
                '#10b981';
              
              return `
                <div style="margin-bottom: 15px; padding: 10px; background-color: white; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                  <div style="font-weight: bold; margin-bottom: 5px; color: #2c5282;">${risk.name}</div>
                  <div style="font-size: 0.9rem; color: #333; margin-bottom: 5px;">
                    ${risk.description || ''}
                  </div>
                  <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 10px;">
                    ${risk.region ? `
                      <div>
                        <div style="font-size: 0.8rem; color: #718096;">Region</div>
                        <div style="font-weight: bold;">${risk.region}</div>
                      </div>
                    ` : ''}
                    
                    <div>
                      <div style="font-size: 0.8rem; color: #718096;">Impact Level</div>
                      <div style="font-weight: bold; color: ${impactColor};">
                        ${typeof risk.impactLevel === 'string' ? risk.impactLevel : `${risk.impactLevel}/10`}
                      </div>
                    </div>
                  </div>
                  
                  ${risk.source ? `
                    <div style="font-size: 0.8rem; color: #666; margin-top: 10px; text-align: right;">
                      Source: ${risk.source}
                      ${risk.sourceUrl ? ` (<a href="${risk.sourceUrl}" target="_blank" rel="noopener noreferrer">${risk.sourceUrl}</a>)` : ''}
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
        
        ${geopoliticalRisks.source ? `
          <div style="font-size: 0.8rem; color: #666; margin-top: 10px; text-align: right;">
            Source: ${geopoliticalRisks.source}
            ${geopoliticalRisks.sourceUrl ? ` (<a href="${geopoliticalRisks.sourceUrl}" target="_blank" rel="noopener noreferrer">${geopoliticalRisks.sourceUrl}</a>)` : ''}
            ${geopoliticalRisks.lastUpdated ? `<br>Last Updated: ${new Date(geopoliticalRisks.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''}
          </div>
        ` : ''}
      </div>
    `;
    
    addHTML(mobiledoc, geopoliticalRisksHtml);
  }
  
  addDivider(mobiledoc);
};

// Add the disclaimer section
const addDisclaimer = (mobiledoc, data) => {
  const disclaimerHtml = `
    <div style="margin-top: 30px; padding: 15px; background-color: #e6f2ff; border-radius: 8px; font-size: 0.8rem; color: #666; line-height: 1.4;">
      <p><strong>Disclaimer:</strong> The information provided in this report is for informational purposes only and does not constitute investment advice. Market Pulse Daily does not guarantee the accuracy, completeness, or timeliness of the information provided. The content should not be construed as an offer to sell or the solicitation of an offer to buy any security. Market Pulse Daily is not responsible for any investment decisions made based on the information provided in this report.</p>
      <p>Past performance is not indicative of future results. Investing in securities involves risks, including the potential loss of principal. Market data and analysis are sourced from third parties believed to be reliable, but Market Pulse Daily makes no representations regarding the accuracy or completeness of such information.</p>
      <p>Market Pulse Daily may hold positions in securities mentioned in this report. Readers should conduct their own due diligence before making any investment decisions.</p>
    </div>
  `;
  
  addHTML(mobiledoc, disclaimerHtml);
};

// Main function
const main = () => {
  const data = loadData();
  const mobiledoc = generateGhostPost(data);
  
  // Output the mobiledoc as JSON
  const outputPath = path.join(__dirname, 'ghost-post.json');
  fs.writeFileSync(outputPath, JSON.stringify(mobiledoc, null, 2));
  
  console.log(`Ghost post generated successfully: ${outputPath}`);
};

// Run the main function
main();
