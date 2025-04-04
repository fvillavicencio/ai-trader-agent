# Stock Metrics Retriever

This Node.js script retrieves fundamental metrics for a set of target stocks/ETFs using multiple data sources:
- Google Finance
- Yahoo Finance
- FMP API
- Tradier API

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your API keys:
```bash
cp .env.example .env
```

3. Run the script:
```bash
node index.js
```

## Target Symbols

The script is configured to retrieve metrics for these symbols:
- SPY (S&P 500 ETF)
- QQQ (Nasdaq 100 ETF)
- NVDA (NVIDIA)
- TSLA (Tesla)

## Features

- Cascading data retrieval from multiple sources
- 30-minute caching of results
- Detailed logging of data sources used
- Error handling and fallback mechanisms
- Performance tracking

## Output

The script will display:
- Execution time for each symbol
- Data sources used
- Price and price change information
- Volume and market cap
- Key financial ratios (P/E, PEG, Price/Book, etc.)
- Industry and sector information
- Company name
