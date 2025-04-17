// scripts/test-polygon-news.js
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.POLYGON_API_KEY;
const BASE_URL = 'https://api.polygon.io/v2/reference/news';

const analysts = [
  "Dan Nathan", "Josh Brown", "Steve Weiss", "Joe Terranova",
  "Dan Niles", "Mohamed El-Erian"
];

async function searchNewsForAnalyst(analyst) {
  try {
    const url = `${BASE_URL}?apiKey=${API_KEY}&query=${encodeURIComponent(analyst)}`;
    const { data } = await axios.get(url);
    return { analyst, results: data.results || [] };
  } catch (err) {
    return { analyst, error: err.response?.data || err.message };
  }
}

(async () => {
  for (const analyst of analysts) {
    const res = await searchNewsForAnalyst(analyst);
    if (res.error) {
      console.error(`Error for ${analyst}:`, res.error);
    } else {
      console.log(`\nNews for ${analyst}:`);
      if (res.results.length === 0) {
        console.log('  No news found.');
      } else {
        res.results.forEach((item, idx) => {
          console.log(`  [${idx+1}] ${item.title} (${item.published_utc})`);
          if (item.author) console.log(`      Author: ${item.author}`);
          if (item.article_url) console.log(`      URL: ${item.article_url}`);
        });
      }
    }
  }
})();
