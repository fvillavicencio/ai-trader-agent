require('dotenv').config();
const axios = require('axios');

/**
 * Calls Google Custom Search API to retrieve fresh news data for a given query.
 * @param {string} query - The search query.
 * @returns {Promise<Array>} An array of search result items.
 */
async function getCustomSearchData(query) {
  const customSearchApiKey = process.env.CUSTOM_SEARCH_API_KEY;
  const searchEngineId = process.env.CUSTOM_SEARCH_ENGINE_ID;
  const customSearchEndpoint = 'https://www.googleapis.com/customsearch/v1';

  try {
    // First 10 results
    const response1 = await axios.get(customSearchEndpoint, {
      params: {
        key: customSearchApiKey,
        cx: searchEngineId,
        q: query,
        dateRestrict: 'd7',  // Restrict results to last 7 days
        num: 10,
        start: 1
      }
    });
    // Next 10 results
    const response2 = await axios.get(customSearchEndpoint, {
      params: {
        key: customSearchApiKey,
        cx: searchEngineId,
        q: query,
        dateRestrict: 'd7',
        num: 10,
        start: 11
      }
    });
    return [...(response1.data.items || []), ...(response2.data.items || [])];
  } catch (error) {
    console.error('Error calling Custom Search API:', error.response ? error.response.data : error.message);
    return [];
  }
}

/**
 * Retrieve recent news/commentary for a list of analysts.
 * @param {Array<string>} analystNames
 * @param {string} [extraKeywords]
 * @returns {Promise<Array>} Array of { analyst, results: [{title, snippet, url, date}] }
 */
async function getAnalystInsights(analystNames, extraKeywords = '') {
  const allResults = [];
  for (const name of analystNames) {
    const query = `${name} ${extraKeywords} market commentary 2025`;
    const items = await getCustomSearchData(query);
    allResults.push({
      analyst: name,
      results: (items || []).map(item => ({
        title: item.title,
        snippet: item.snippet,
        url: item.link,
        date: item.pagemap && item.pagemap.metatags && item.pagemap.metatags[0] && item.pagemap.metatags[0]['article:published_time'] ? item.pagemap.metatags[0]['article:published_time'] : null
      }))
    });
  }
  return allResults;
}

/**
 * Test function for analyst insights retrieval.
 * Logs and returns the results for sample analysts.
 */
async function testAnalystInsightsSearch() {
  const analystNames = [
    'Dan Niles',
    'Mohamed El-Erian',
    'Tom Lee',
    'Cathie Wood',
    'Mike Wilson'
  ];
  const extraKeywords = 'stock market outlook';
  const insights = await getAnalystInsights(analystNames, extraKeywords);
  console.log('\nAnalyst Insights Search Results:');
  insights.forEach(entry => {
    console.log(`\nAnalyst: ${entry.analyst}`);
    if (entry.results.length === 0) {
      console.log('  No recent results found.');
    } else {
      entry.results.forEach((result, idx) => {
        console.log(`  Result ${idx + 1}:`);
        console.log(`    Title: ${result.title}`);
        console.log(`    Snippet: ${result.snippet}`);
        console.log(`    URL: ${result.url}`);
        if (result.date) console.log(`    Date: ${result.date}`);
      });
    }
  });
  return insights;
}

// Run the test if this script is executed directly
if (require.main === module) {
  testAnalystInsightsSearch().catch(err => {
    console.error('Test run failed:', err);
  });
}

module.exports = { getAnalystInsights, testAnalystInsightsSearch };
