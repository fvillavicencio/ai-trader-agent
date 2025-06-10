/**
 * Simple Fear and Greed Index Data Fetcher
 * 
 * This script fetches the latest Fear and Greed Index data from CNN
 * with minimal dependencies and straightforward logging.
 */

const axios = require('axios');
const fs = require('fs');

// Main function to fetch data
async function fetchFearAndGreedData() {
  try {
    console.log('Starting to fetch Fear and Greed Index data...');
    
    // First try the direct API
    const apiUrl = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";
    console.log(`Requesting data from ${apiUrl}...`);
    
    try {
      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log(`API Response status: ${response.status}`);
      
      if (response.status === 200 && response.data) {
        console.log('Successfully retrieved data from CNN API');
        console.log('Response data structure:', Object.keys(response.data));
        
        if (response.data.fear_and_greed && response.data.fear_and_greed.score) {
          console.log(`Current Fear & Greed score: ${response.data.fear_and_greed.score}`);
          
          // Save raw response to file for inspection
          fs.writeFileSync('fear_greed_raw_response.json', JSON.stringify(response.data, null, 2));
          console.log('Raw response saved to fear_greed_raw_response.json');
          
          return response.data;
        } else {
          console.log('API response missing expected fear_and_greed data structure');
        }
      } else {
        console.log(`API request failed with status: ${response.status}`);
      }
    } catch (apiError) {
      console.error(`Error fetching from API: ${apiError.message}`);
    }
    
    // If API fails, try scraping the HTML
    console.log('Trying to scrape data from CNN website...');
    const webUrl = "https://www.cnn.com/markets/fear-and-greed";
    
    try {
      const webResponse = await axios.get(webUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log(`Web scraping response status: ${webResponse.status}`);
      
      if (webResponse.status === 200) {
        const html = webResponse.data;
        console.log(`Received HTML response (${html.length} bytes)`);
        
        // Save the first 1000 characters of HTML for debugging
        fs.writeFileSync('fear_greed_html_sample.txt', html.substring(0, 1000));
        console.log('HTML sample saved to fear_greed_html_sample.txt');
        
        // Look for the INITIAL_STATE pattern
        console.log('Searching for INITIAL_STATE in HTML...');
        const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/);
        
        if (stateMatch && stateMatch[1]) {
          console.log('Found INITIAL_STATE match in HTML');
          
          try {
            const initialState = JSON.parse(stateMatch[1]);
            console.log('Successfully parsed INITIAL_STATE JSON');
            
            // Save the parsed state for inspection
            fs.writeFileSync('fear_greed_initial_state.json', JSON.stringify(initialState, null, 2));
            console.log('Initial state saved to fear_greed_initial_state.json');
            
            // Check if we have the fear and greed data
            if (initialState.marketData && initialState.marketData.fearAndGreed) {
              const fearAndGreed = initialState.marketData.fearAndGreed;
              console.log(`Found Fear & Greed score in HTML: ${fearAndGreed.score}`);
              
              return {
                fear_and_greed: {
                  score: fearAndGreed.score,
                  previous_close: fearAndGreed.previousClose,
                  previous_1_week: fearAndGreed.oneWeekAgo,
                  previous_1_month: fearAndGreed.oneMonthAgo,
                  previous_1_year: fearAndGreed.oneYearAgo
                }
              };
            } else {
              console.log('Could not find fearAndGreed data in INITIAL_STATE');
            }
          } catch (parseError) {
            console.error(`Error parsing INITIAL_STATE: ${parseError.message}`);
          }
        } else {
          console.log('Could not find INITIAL_STATE pattern in HTML');
        }
      }
    } catch (webError) {
      console.error(`Error scraping website: ${webError.message}`);
    }
    
    console.log('All attempts to fetch Fear & Greed data failed');
    return null;
    
  } catch (error) {
    console.error(`Unexpected error: ${error.message}`);
    console.error(error.stack);
    return null;
  }
}

// Run the fetch function
fetchFearAndGreedData()
  .then(data => {
    if (data) {
      console.log('Successfully retrieved Fear & Greed data');
      
      // Format the data for easy viewing
      const formattedData = {
        timestamp: new Date().toISOString(),
        score: data.fear_and_greed?.score || null,
        rating: getRating(data.fear_and_greed?.score),
        previous_close: data.fear_and_greed?.previous_close || null,
        previous_week: data.fear_and_greed?.previous_1_week || null,
        previous_month: data.fear_and_greed?.previous_1_month || null,
        previous_year: data.fear_and_greed?.previous_1_year || null
      };
      
      console.log('Formatted data:', formattedData);
      
      // Save to JSON file
      fs.writeFileSync('fear_greed_current.json', JSON.stringify(formattedData, null, 2));
      console.log('Data saved to fear_greed_current.json');
    } else {
      console.log('Failed to retrieve Fear & Greed data');
    }
  })
  .catch(error => {
    console.error(`Error in main execution: ${error.message}`);
  });

/**
 * Get the rating based on the score
 * @param {number} score - The fear and greed score
 * @return {string} The rating (extreme fear, fear, neutral, greed, extreme greed)
 */
function getRating(score) {
  if (!score) return 'unknown';
  
  if (score <= 25) return 'extreme fear';
  if (score <= 40) return 'fear';
  if (score <= 60) return 'neutral';
  if (score <= 75) return 'greed';
  return 'extreme greed';
}
