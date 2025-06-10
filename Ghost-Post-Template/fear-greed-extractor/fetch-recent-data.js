/**
 * Fear and Greed Index Data Fetcher
 * 
 * This script fetches the latest Fear and Greed Index data from CNN
 * and logs the results for the past week.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');

// Configure axios for better logging
axios.interceptors.request.use(request => {
  console.log('Starting Request:', request.method, request.url);
  return request;
});

axios.interceptors.response.use(
  response => {
    console.log('Response Status:', response.status);
    return response;
  },
  error => {
    console.log('Response Error:', error.message);
    return Promise.reject(error);
  }
);

/**
 * Fetches the CNN Fear & Greed Index data
 * @return {Promise<Object>} Raw Fear & Greed Index data or null if unavailable
 */
async function fetchFearAndGreedIndexData() {
  try {
    // Try the direct API first
    const apiUrl = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";
    
    // Enhanced options with more complete headers to avoid "Invalid argument" errors
    const options = {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://www.cnn.com/markets/fear-and-greed',
        'Origin': 'https://www.cnn.com',
        'sec-ch-ua': '"Google Chrome";v="121", "Not A(Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site'
      }
    };
    
    console.log("Sending request to CNN Fear & Greed Index API...");
    const response = await axios.get(apiUrl, options);
    
    if (response.status === 200 && response.data) {
      console.log(`Successfully retrieved Fear & Greed Index data from CNN API: Score=${response.data.fear_and_greed?.score}`);
      return response.data;
    }
    
    console.log(`CNN API failed with response code ${response.status}`);
    
  } catch (error) {
    console.log(`Error retrieving Fear & Greed Index from CNN API: ${error.message}`);
    
    // Try alternative CNN Fear & Greed endpoint as fallback
    try {
      console.log("Trying alternative CNN Fear & Greed endpoint...");
      const alternativeUrl = "https://www.cnn.com/markets/fear-and-greed";
      const altResponse = await axios.get(alternativeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        }
      });
      
      if (altResponse.status === 200) {
        const htmlContent = altResponse.data;
        // Look for the fear and greed data in the HTML
        console.log('Searching for INITIAL_STATE in HTML response...');
        const dataMatch = htmlContent.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/);
        if (dataMatch && dataMatch[1]) {
          console.log('Found INITIAL_STATE match in HTML');
          try {
            const initialState = JSON.parse(dataMatch[1]);
            // Navigate through the state object to find fear and greed data
            if (initialState && initialState.marketData && initialState.marketData.fearAndGreed) {
              const fearAndGreed = initialState.marketData.fearAndGreed;
              console.log("Successfully extracted Fear & Greed data from CNN HTML");
              
              // Extract the current score
              const currentValue = fearAndGreed.score ? parseInt(fearAndGreed.score) : null;
              
              // Get previous values for trend analysis
              const previousValue = fearAndGreed.previousClose ? parseInt(fearAndGreed.previousClose) : null;
              const oneWeekAgo = fearAndGreed.oneWeekAgo ? parseInt(fearAndGreed.oneWeekAgo) : null;
              
              // Create the result object
              const result = {
                fear_and_greed: {
                  score: currentValue,
                  previous_close: previousValue,
                  previous_1_week: oneWeekAgo,
                  previous_1_month: fearAndGreed.oneMonthAgo,
                  previous_1_year: fearAndGreed.oneYearAgo,
                  rating_data: fearAndGreed.indicators
                }
              };
              
              return result;
            }
          } catch (parseError) {
            console.log(`Error parsing CNN HTML data: ${parseError}`);
          }
        }
      }
    } catch (altError) {
      console.log(`Error with alternative CNN endpoint: ${altError.message}`);
    }
  }
  
  return null;
}

/**
 * Get the rating based on the score
 * @param {number} score - The fear and greed score
 * @return {string} The rating (extreme fear, fear, neutral, greed, extreme greed)
 */
function getRating(score) {
  if (score <= 25) return 'extreme fear';
  if (score <= 40) return 'fear';
  if (score <= 60) return 'neutral';
  if (score <= 75) return 'greed';
  return 'extreme greed';
}

/**
 * Extract the daily data points from the raw CNN data
 * @param {Object} data - The raw CNN data
 * @return {Array} Array of daily data points
 */
function extractDailyDataPoints(data) {
  if (!data || !data.fear_and_greed || !data.fear_and_greed.score) {
    console.error('Invalid data format');
    return [];
  }
  
  const result = [];
  
  // Add today's data point
  const today = DateTime.now();
  result.push({
    date: today.toFormat('yyyy-MM-dd'),
    timestamp_ms: today.toMillis(),
    score: data.fear_and_greed.score,
    rating: getRating(data.fear_and_greed.score),
    previous_close: data.fear_and_greed.previous_close || null,
    previous_1_week: data.fear_and_greed.previous_1_week || null,
    previous_1_month: data.fear_and_greed.previous_1_month || null,
    previous_1_year: data.fear_and_greed.previous_1_year || null
  });
  
  // Extract historical data if available
  if (data.fear_and_greed_historical && Array.isArray(data.fear_and_greed_historical)) {
    // Get the last 7 days (or fewer if not available)
    const recentData = data.fear_and_greed_historical.slice(-7);
    
    recentData.forEach(item => {
      if (item.x && item.y) {
        const date = DateTime.fromMillis(item.x);
        result.push({
          date: date.toFormat('yyyy-MM-dd'),
          timestamp_ms: item.x,
          score: item.y,
          rating: getRating(item.y)
        });
      }
    });
  }
  
  return result;
}

/**
 * Save data to JSON file
 * @param {Array} data - The data to save
 * @param {string} filename - The filename to save to
 */
function saveToJsonFile(data, filename) {
  const filePath = path.join(__dirname, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Data saved to ${filePath}`);
}

/**
 * Save data to CSV file
 * @param {Array} data - The data to save
 * @param {string} filename - The filename to save to
 */
function saveToCsvFile(data, filename) {
  const filePath = path.join(__dirname, filename);
  
  // Create CSV header
  let csvContent = 'timestamp_ms,date,score,rating\n';
  
  // Add data rows
  data.forEach(item => {
    csvContent += `${item.timestamp_ms},${item.date},${item.score},${item.rating}\n`;
  });
  
  fs.writeFileSync(filePath, csvContent);
  console.log(`CSV data saved to ${filePath}`);
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Fetching Fear and Greed Index data from CNN...');
    const data = await fetchFearAndGreedIndexData();
    
    if (!data) {
      console.error('Failed to fetch Fear and Greed Index data');
      process.exit(1);
    }
    
    console.log('Raw data structure:', Object.keys(data));
    if (data.fear_and_greed) {
      console.log('Current score:', data.fear_and_greed.score);
    }
    
    if (data.fear_and_greed_historical) {
      console.log('Historical data available:', data.fear_and_greed_historical.length, 'entries');
    } else {
      console.log('No historical data available in the response');
    }
    
    // Extract daily data points
    const dailyData = extractDailyDataPoints(data);
    console.log('Daily data points extracted:', dailyData.length);
    
    // Save data to files
    saveToJsonFile(dailyData, 'recent_fear_greed_data.json');
    saveToCsvFile(dailyData, 'recent_fear_greed_data.csv');
    
    console.log('Done!');
  } catch (error) {
    console.error(`Error in main: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
