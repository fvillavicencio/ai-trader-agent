// Utility to convert Market Pulse JSON to Ghost Koenig JSON blocks
// Usage: const { marketPulseToKoenig } = require('./koenig-blocks');

function textBlock(text) {
  return {
    type: 'paragraph',
    content: [{ type: 'text', text }]
  };
}

function headingBlock(text, level = 2) {
  return {
    type: 'heading',
    level,
    content: [{ type: 'text', text }]
  };
}

function listBlock(items) {
  return {
    type: 'list',
    format: 'ul',
    items: items.map(item => [{ type: 'text', text: item }])
  };
}

// Main converter
function marketPulseToKoenig(mpJson) {
  const blocks = [];
  // Meta
  blocks.push(headingBlock(mpJson.meta.newsletterName || 'Market Pulse Daily', 1));
  blocks.push(textBlock(`Date: ${mpJson.meta.date}`));
  // Decision Summary
  blocks.push(headingBlock('Decision Summary'));
  blocks.push(textBlock(mpJson.decisionSummary.decision));
  blocks.push(textBlock(mpJson.decisionSummary.justification));
  // Market Sentiment
  blocks.push(headingBlock('Market Sentiment'));
  blocks.push(textBlock(mpJson.marketSentiment.summary));
  if (mpJson.marketSentiment.analystComments) {
    blocks.push(listBlock(mpJson.marketSentiment.analystComments.map(c => `${c.analyst}: ${c.comment}`)));
  }
  // Market Indicators
  blocks.push(headingBlock('Market Indicators'));
  if (mpJson.marketIndicators && mpJson.marketIndicators.majorIndices) {
    blocks.push(listBlock(mpJson.marketIndicators.majorIndices.map(i => `${i.name}: ${i.price} (${i.percentChange}%)`)));
  }
  // Market Futures
  if (mpJson.marketFutures && mpJson.marketFutures.consolidated) {
    blocks.push(headingBlock('Market Futures'));
    blocks.push(listBlock(mpJson.marketFutures.consolidated.map(f => `${f.name}: ${f.last} (${f.percentChange}%)`)));
  }
  // Fed Policy
  if (mpJson.fedPolicy) {
    blocks.push(headingBlock('Fed Policy'));
    blocks.push(textBlock(`Current Rate: ${mpJson.fedPolicy.currentRate.rate}%`));
    if (mpJson.fedPolicy.forwardGuidance) {
      blocks.push(textBlock(`Forward Guidance: ${mpJson.fedPolicy.forwardGuidance}`));
    }
  }
  // S&P 500 Analysis
  if (mpJson.sp500Analysis) {
    blocks.push(headingBlock('S&P 500 Analysis'));
    blocks.push(textBlock(`Index Level: ${mpJson.sp500Analysis.indexLevel}`));
    blocks.push(textBlock(`P/E Ratio: ${mpJson.sp500Analysis.peRatio}`));
    if (mpJson.sp500Analysis.topHoldings) {
      blocks.push(headingBlock('Top Holdings', 3));
      blocks.push(listBlock(mpJson.sp500Analysis.topHoldings.map(h => `${h.symbol} (${h.name}): ${h.price}`)));
    }
  }
  return blocks;
}

module.exports = { marketPulseToKoenig };
