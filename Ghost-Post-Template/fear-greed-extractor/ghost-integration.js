/**
 * Fear and Greed Index Ghost Integration
 * 
 * This script provides functions to integrate the Fear and Greed Index chart
 * into Ghost blog posts at publication time.
 */

const AWS = require('aws-sdk');
const axios = require('axios');
const cheerio = require('cheerio');

// Configure AWS SDK
const region = process.env.AWS_REGION || 'us-east-1';
AWS.config.update({ region });

// Lambda function name
const lambdaFunctionName = process.env.LAMBDA_FUNCTION_NAME || 'fear-greed-chart-generator';

/**
 * Invoke the Fear and Greed Chart Generator Lambda
 * @param {Object} options - Chart options
 * @return {Promise<string>} Promise that resolves to HTML content
 */
async function generateFearAndGreedChart(options = {}) {
  const lambda = new AWS.Lambda();
  
  const params = {
    FunctionName: lambdaFunctionName,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify({ options })
  };
  
  try {
    console.log(`Invoking Lambda function: ${lambdaFunctionName}`);
    const response = await lambda.invoke(params).promise();
    
    if (response.FunctionError) {
      console.error(`Lambda function error: ${response.FunctionError}`);
      console.error(`Error details: ${response.Payload}`);
      throw new Error(`Lambda function error: ${response.FunctionError}`);
    }
    
    const payload = JSON.parse(response.Payload);
    
    if (payload.statusCode !== 200) {
      console.error(`Lambda function returned non-200 status code: ${payload.statusCode}`);
      console.error(`Error details: ${payload.body}`);
      throw new Error(`Lambda function error: ${payload.body}`);
    }
    
    return payload.body;
  } catch (error) {
    console.error(`Error invoking Lambda function: ${error.message}`);
    throw error;
  }
}

/**
 * Get the current Fear and Greed Index data from CNN
 * @return {Promise<Object>} Promise that resolves to Fear and Greed Index data
 */
async function getCurrentFearAndGreedData() {
  try {
    const apiUrl = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";
    
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.cnn.com/markets/fear-and-greed',
        'Origin': 'https://www.cnn.com'
      }
    });
    
    if (response.status === 200 && response.data && response.data.fear_and_greed) {
      return {
        score: response.data.fear_and_greed.score,
        rating: response.data.fear_and_greed.rating || getRating(response.data.fear_and_greed.score),
        previousClose: response.data.fear_and_greed.previous_close,
        previousWeek: response.data.fear_and_greed.previous_1_week,
        previousMonth: response.data.fear_and_greed.previous_1_month,
        previousYear: response.data.fear_and_greed.previous_1_year
      };
    }
    
    // Try alternative method if API fails
    const altUrl = "https://www.cnn.com/markets/fear-and-greed";
    const altResponse = await axios.get(altUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });
    
    if (altResponse.status === 200) {
      const html = altResponse.data;
      const $ = cheerio.load(html);
      
      // Extract the score from the page
      const scoreText = $('.market-fng-gauge__dial-number-value').text();
      const score = parseFloat(scoreText);
      
      if (!isNaN(score)) {
        return {
          score,
          rating: getRating(score),
          previousClose: null,
          previousWeek: null,
          previousMonth: null,
          previousYear: null
        };
      }
    }
    
    throw new Error('Failed to retrieve Fear and Greed Index data');
  } catch (error) {
    console.error(`Error fetching Fear and Greed data: ${error.message}`);
    throw error;
  }
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
 * Process Ghost post content to embed Fear and Greed Index chart
 * @param {string} content - Original post content
 * @return {Promise<string>} Promise that resolves to processed content
 */
async function processFearAndGreedTags(content) {
  try {
    // Check if content contains fear-greed-chart tag
    if (!content.includes('<!-- fear-greed-chart -->')) {
      return content;
    }
    
    console.log('Found fear-greed-chart tag in content');
    
    // Generate chart HTML
    const chartHtml = await generateFearAndGreedChart({
      width: '100%',
      height: '400px',
      showControls: true,
      defaultPeriod: '3m'
    });
    
    // Replace tag with chart HTML
    return content.replace('<!-- fear-greed-chart -->', chartHtml);
  } catch (error) {
    console.error(`Error processing Fear and Greed tags: ${error.message}`);
    return content;
  }
}

/**
 * Generate Fear and Greed Index summary text
 * @return {Promise<string>} Promise that resolves to summary text
 */
async function generateFearAndGreedSummary() {
  try {
    const data = await getCurrentFearAndGreedData();
    
    let trendText = '';
    if (data.previousClose) {
      const change = data.score - data.previousClose;
      if (Math.abs(change) < 1) {
        trendText = 'unchanged from yesterday';
      } else if (change > 0) {
        trendText = `up ${change.toFixed(1)} points from yesterday`;
      } else {
        trendText = `down ${Math.abs(change).toFixed(1)} points from yesterday`;
      }
    }
    
    let weeklyTrendText = '';
    if (data.previousWeek) {
      const weeklyChange = data.score - data.previousWeek;
      if (Math.abs(weeklyChange) < 1) {
        weeklyTrendText = 'unchanged from last week';
      } else if (weeklyChange > 0) {
        weeklyTrendText = `up ${weeklyChange.toFixed(1)} points from last week`;
      } else {
        weeklyTrendText = `down ${Math.abs(weeklyChange).toFixed(1)} points from last week`;
      }
    }
    
    return `
## Market Sentiment: CNN Fear & Greed Index

The CNN Fear & Greed Index currently stands at **${data.score.toFixed(1)}** (${data.rating}), ${trendText}${weeklyTrendText ? ' and ' + weeklyTrendText : ''}.

<!-- fear-greed-chart -->

*The Fear & Greed Index is a tool used by investors to gauge market sentiment. It ranges from 0 (Extreme Fear) to 100 (Extreme Greed) and is calculated based on seven different indicators including market volatility, put/call options, market momentum, stock price strength, and safe haven demand.*
`;
  } catch (error) {
    console.error(`Error generating Fear and Greed summary: ${error.message}`);
    return `
## Market Sentiment: CNN Fear & Greed Index

*Unable to retrieve current Fear & Greed Index data. Please check [CNN's Fear & Greed Index](https://www.cnn.com/markets/fear-and-greed) for the latest information.*

<!-- fear-greed-chart -->
`;
  }
}

module.exports = {
  generateFearAndGreedChart,
  getCurrentFearAndGreedData,
  processFearAndGreedTags,
  generateFearAndGreedSummary
};
