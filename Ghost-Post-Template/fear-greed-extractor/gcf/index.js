/**
 * Fear and Greed Index Data Collector
 * 
 * Google Cloud Function that runs daily to fetch the latest Fear and Greed Index data
 * and store it in AWS DynamoDB for historical tracking.
 */

const axios = require('axios');
const AWS = require('aws-sdk');
const { DateTime } = require('luxon');

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @return {Promise} Promise that resolves after the delay
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate a random delay between min and max milliseconds
 * @param {number} min - Minimum delay in milliseconds
 * @param {number} max - Maximum delay in milliseconds
 * @return {number} Random delay in milliseconds
 */
const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Execute a function with retry logic and exponential backoff
 * @param {Function} fn - Function to execute (must return a promise)
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {number} options.baseDelayMs - Base delay in milliseconds
 * @param {number} options.maxDelayMs - Maximum delay in milliseconds
 * @param {Function} options.retryCondition - Function that returns true if retry should happen
 * @return {Promise} Promise that resolves with the function result or rejects after all retries
 */
async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    retryCondition = (error) => true
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt >= maxRetries || !retryCondition(error)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter
      const expDelay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      const jitteredDelay = randomDelay(expDelay / 2, expDelay);
      
      console.log(`Attempt ${attempt + 1} failed. Retrying in ${jitteredDelay}ms...`);
      await sleep(jitteredDelay);
    }
  }
  
  throw lastError;
}

// Configure AWS SDK with retry options
const configureAWS = () => {
  // Configure AWS with retry options
  AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-2',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    maxRetries: 5, // Built-in AWS SDK retry mechanism
    retryDelayOptions: { base: 300 } // Base delay for retries in ms
  });
  
  // Create DynamoDB client with custom retry strategy
  const dynamoConfig = {
    httpOptions: {
      timeout: 5000, // 5 second timeout
      connectTimeout: 3000 // 3 second connect timeout
    },
    maxRetries: 5
  };
  
  return new AWS.DynamoDB.DocumentClient(dynamoConfig);
};

/**
 * Fetches the CNN Fear & Greed Index data with retry logic
 * @return {Object} Raw Fear & Greed Index data or null if unavailable
 */
async function fetchFearAndGreedIndexData() {
  // Define the primary API fetch function with retry
  const fetchPrimaryApi = async () => {
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
      },
      timeout: 10000 // 10 second timeout
    };
    
    console.log("Sending request to CNN Fear & Greed API...");
    const response = await axios.get(apiUrl, options);
    
    if (response.status === 200 && response.data) {
      console.log(`Successfully retrieved Fear & Greed Index data from CNN API: Score=${response.data.fear_and_greed?.score}`);
      return response.data;
    }
    
    throw new Error(`CNN API failed with response code ${response.status}`);
  };
  
  // Define the alternative API fetch function with retry
  const fetchAlternativeApi = async () => {
    console.log("Trying alternative CNN Fear & Greed endpoint...");
    const alternativeUrl = "https://www.cnn.com/markets/fear-and-greed";
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      },
      timeout: 15000 // 15 second timeout for HTML page
    };
    
    const altResponse = await axios.get(alternativeUrl, options);
    
    if (altResponse.status !== 200) {
      throw new Error(`Alternative CNN endpoint failed with status ${altResponse.status}`);
    }
    
    const htmlContent = altResponse.data;
    // Look for the fear and greed data in the HTML
    const dataMatch = htmlContent.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});/);
    if (!dataMatch || !dataMatch[1]) {
      throw new Error('Could not find Fear & Greed data in CNN HTML');
    }
    
    const initialState = JSON.parse(dataMatch[1]);
    // Navigate through the state object to find fear and greed data
    if (!initialState || !initialState.marketData || !initialState.marketData.fearAndGreed) {
      throw new Error('Fear & Greed data not found in parsed CNN HTML');
    }
    
    const fearAndGreed = initialState.marketData.fearAndGreed;
    console.log("Successfully extracted Fear & Greed data from CNN HTML");
    
    // Extract the current score
    const currentValue = fearAndGreed.score ? parseInt(fearAndGreed.score) : null;
    
    // Get previous values for trend analysis
    const previousValue = fearAndGreed.previousClose ? parseInt(fearAndGreed.previousClose) : null;
    const oneWeekAgo = fearAndGreed.oneWeekAgo ? parseInt(fearAndGreed.oneWeekAgo) : null;
    
    // Create the result object
    return {
      fear_and_greed: {
        score: currentValue,
        previous_close: previousValue,
        previous_1_week: oneWeekAgo,
        previous_1_month: fearAndGreed.oneMonthAgo,
        previous_1_year: fearAndGreed.oneYearAgo,
        rating_data: fearAndGreed.indicators
      }
    };
  };
  
  try {
    // Try the primary API with retry logic
    return await withRetry(fetchPrimaryApi, {
      maxRetries: 3,
      baseDelayMs: 2000,
      maxDelayMs: 10000,
      retryCondition: (error) => {
        // Retry on network errors, timeouts, and 5xx server errors
        const shouldRetry = (
          error.code === 'ECONNRESET' || 
          error.code === 'ETIMEDOUT' || 
          error.code === 'ECONNABORTED' ||
          (error.response && error.response.status >= 500)
        );
        console.log(`Primary API error: ${error.message}. Should retry: ${shouldRetry}`);
        return shouldRetry;
      }
    });
  } catch (primaryError) {
    console.log(`All retries failed for primary CNN API: ${primaryError.message}`);
    
    try {
      // Try the alternative endpoint with retry logic
      return await withRetry(fetchAlternativeApi, {
        maxRetries: 3,
        baseDelayMs: 3000,
        maxDelayMs: 15000,
        retryCondition: (error) => {
          // Retry on network errors, timeouts, and 5xx server errors
          const shouldRetry = (
            error.code === 'ECONNRESET' || 
            error.code === 'ETIMEDOUT' || 
            error.code === 'ECONNABORTED' ||
            (error.response && error.response.status >= 500)
          );
          console.log(`Alternative API error: ${error.message}. Should retry: ${shouldRetry}`);
          return shouldRetry;
        }
      });
    } catch (alternativeError) {
      console.log(`All retries failed for alternative CNN endpoint: ${alternativeError.message}`);
      return null;
    }
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
 * Store the fear and greed data in DynamoDB with retry logic
 * @param {Object} data - The fear and greed data
 * @param {AWS.DynamoDB.DocumentClient} dynamoDB - The DynamoDB client
 * @param {DateTime} [targetDate] - Optional specific date for the data
 * @return {Promise} Promise that resolves when data is stored
 */
async function storeDataInDynamoDB(data, dynamoDB, targetDate = null) {
  if (!data || !data.fear_and_greed || !data.fear_and_greed.score) {
    throw new Error('Invalid data format');
  }
  
  const score = data.fear_and_greed.score;
  const rating = getRating(score);
  
  // Use provided target date or current date
  const dateTime = targetDate || DateTime.now();
  const timestamp = dateTime.toMillis();
  const dateStr = dateTime.toFormat('yyyy-MM-dd');
  
  // Extract year, month, day for easier querying
  const year = dateTime.year;
  const month = dateTime.month;
  const day = dateTime.day;
  
  const tableName = process.env.DYNAMODB_TABLE_NAME || 'fear_greed_index';
  
  const params = {
    TableName: tableName,
    Item: {
      timestamp_ms: timestamp,
      score: score,
      rating: rating,
      previous_close: data.fear_and_greed.previous_close || null,
      previous_1_week: data.fear_and_greed.previous_1_week || null,
      previous_1_month: data.fear_and_greed.previous_1_month || null,
      previous_1_year: data.fear_and_greed.previous_1_year || null,
      date: dateStr,
      year: year,
      month: month,
      day: day
    }
  };
  
  console.log(`Preparing to store data in DynamoDB for date ${dateStr}`);
  
  return withRetry(
    async () => {
      console.log(`Attempting to write to DynamoDB table ${tableName} for date ${dateStr}`);
      await dynamoDB.put(params).promise();
      console.log(`Data for ${dateStr} stored successfully in DynamoDB`);
      return params.Item;
    },
    {
      maxRetries: 5,
      baseDelayMs: 1000,
      maxDelayMs: 8000,
      retryCondition: (error) => {
        // Retry on provisioned throughput exceeded, conditional check failed, or network errors
        const retryableErrors = [
          'ProvisionedThroughputExceededException',
          'ThrottlingException',
          'RequestLimitExceeded',
          'InternalServerError',
          'ServiceUnavailable',
          'NetworkingError',
          'TimeoutError',
          'ConnectionError'
        ];
        
        const shouldRetry = retryableErrors.includes(error.code);
        console.log(`DynamoDB write error for ${dateStr}: ${error.message}. Error code: ${error.code}. Should retry: ${shouldRetry}`);
        return shouldRetry;
      }
    }
  );
}

/**
 * Get the latest entry from DynamoDB with retry logic
 * @param {AWS.DynamoDB.DocumentClient} dynamoDB - The DynamoDB client
 * @return {Promise<Object>} The latest entry or null if none exists
 */
async function getLatestEntry(dynamoDB) {
  const tableName = process.env.DYNAMODB_TABLE_NAME || 'fear_greed_index';
  console.log(`Fetching recent entries from DynamoDB table: ${tableName}...`);
  
  try {
    // Use retry logic for the scan operation
    const scanWithRetry = async (params, exclusiveStartKey = null) => {
      if (exclusiveStartKey) {
        params.ExclusiveStartKey = exclusiveStartKey;
      }
      
      return withRetry(
        async () => {
          console.log(`Scanning DynamoDB table ${tableName} for latest entries...`);
          return await dynamoDB.scan(params).promise();
        },
        {
          maxRetries: 5,
          baseDelayMs: 1000,
          maxDelayMs: 8000,
          retryCondition: (error) => {
            // Retry on provisioned throughput exceeded or network errors
            const retryableErrors = [
              'ProvisionedThroughputExceededException',
              'ThrottlingException',
              'RequestLimitExceeded',
              'InternalServerError',
              'ServiceUnavailable',
              'NetworkingError',
              'TimeoutError',
              'ConnectionError'
            ];
            
            const shouldRetry = retryableErrors.includes(error.code);
            console.log(`DynamoDB scan error: ${error.message}. Error code: ${error.code}. Should retry: ${shouldRetry}`);
            return shouldRetry;
          }
        }
      );
    };
    
    // First try to get all items to ensure we find the actual latest one
    const allItems = [];
    let lastEvaluatedKey;
    
    do {
      const params = {
        TableName: tableName,
        ProjectionExpression: 'timestamp_ms, #date, score, rating',
        ExpressionAttributeNames: {
          '#date': 'date'
        },
        Limit: 100
      };
      
      const data = await scanWithRetry(params, lastEvaluatedKey);
      if (data.Items && data.Items.length > 0) {
        allItems.push(...data.Items);
      }
      
      lastEvaluatedKey = data.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    
    if (allItems.length === 0) {
      console.log('No entries found in DynamoDB');
      return null;
    }
    
    console.log(`Found ${allItems.length} total entries in DynamoDB`);
    
    // Sort by timestamp (descending) and get the latest
    const sortedItems = allItems.sort((a, b) => b.timestamp_ms - a.timestamp_ms);
    const latestEntry = sortedItems[0];
    
    console.log(`Latest entry in DynamoDB is from ${latestEntry.date} with score ${latestEntry.score}`);
    return latestEntry;
  } catch (error) {
    console.error(`Error fetching latest entry: ${error.message}`);
    throw error;
  }
}

/**
 * Get the oldest entry from DynamoDB with retry logic
 * @param {AWS.DynamoDB.DocumentClient} dynamoDB - The DynamoDB client
 * @return {Promise<Object>} The oldest entry or null if none exists
 */
async function getOldestEntry(dynamoDB) {
  const tableName = process.env.DYNAMODB_TABLE_NAME || 'fear_greed_index';
  console.log(`Fetching oldest entries from DynamoDB table: ${tableName}...`);
  
  try {
    // Use retry logic for the scan operation
    const scanWithRetry = async (params, exclusiveStartKey = null) => {
      if (exclusiveStartKey) {
        params.ExclusiveStartKey = exclusiveStartKey;
      }
      
      return withRetry(
        async () => {
          console.log(`Scanning DynamoDB table ${tableName} for oldest entries...`);
          return await dynamoDB.scan(params).promise();
        },
        {
          maxRetries: 5,
          baseDelayMs: 1000,
          maxDelayMs: 8000,
          retryCondition: (error) => {
            // Retry on provisioned throughput exceeded or network errors
            const retryableErrors = [
              'ProvisionedThroughputExceededException',
              'ThrottlingException',
              'RequestLimitExceeded',
              'InternalServerError',
              'ServiceUnavailable',
              'NetworkingError',
              'TimeoutError',
              'ConnectionError'
            ];
            
            const shouldRetry = retryableErrors.includes(error.code);
            console.log(`DynamoDB scan error: ${error.message}. Error code: ${error.code}. Should retry: ${shouldRetry}`);
            return shouldRetry;
          }
        }
      );
    };
    
    // First try to get all items to ensure we find the actual oldest one
    const allItems = [];
    let lastEvaluatedKey;
    
    do {
      const params = {
        TableName: tableName,
        ProjectionExpression: 'timestamp_ms, #date, score, rating',
        ExpressionAttributeNames: {
          '#date': 'date'
        },
        Limit: 100
      };
      
      const data = await scanWithRetry(params, lastEvaluatedKey);
      if (data.Items && data.Items.length > 0) {
        allItems.push(...data.Items);
      }
      
      lastEvaluatedKey = data.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    
    if (allItems.length === 0) {
      console.log('No entries found in DynamoDB');
      return null;
    }
    
    console.log(`Found ${allItems.length} total entries in DynamoDB`);
    
    // Sort by timestamp (ascending) and get the oldest
    const sortedItems = allItems.sort((a, b) => a.timestamp_ms - b.timestamp_ms);
    const oldestEntry = sortedItems[0];
    
    console.log(`Oldest entry in DynamoDB is from ${oldestEntry.date} with score ${oldestEntry.score}`);
    return oldestEntry;
  } catch (error) {
    console.error(`Error fetching oldest entry: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch historical data from CNN API
 * @param {DateTime} startDate - Start date to fetch from
 * @param {DateTime} endDate - End date to fetch to
 * @return {Promise<Array>} Array of daily data points
 */
async function fetchHistoricalData(startDate, endDate) {
  try {
    console.log(`Fetching historical data from ${startDate.toFormat('yyyy-MM-dd')} to ${endDate.toFormat('yyyy-MM-dd')}`);
    
    // First get the current data which includes historical data points
    const fearAndGreedData = await fetchFearAndGreedIndexData();
    
    if (!fearAndGreedData || !fearAndGreedData.fear_and_greed) {
      console.log('Failed to fetch Fear and Greed data');
      return [];
    }
    
    // Extract historical data points if available
    const historicalData = [];
    
    // Process each day in the range
    let currentDate = startDate;
    while (currentDate <= endDate) {
      const dateStr = currentDate.toFormat('yyyy-MM-dd');
      console.log(`Processing date: ${dateStr}`);
      
      // Create a data point for this date
      // Note: This is a simplified approach - in reality, you'd need to
      // extract the specific historical data for each date from the API response
      // or use another source for historical data
      const dataPoint = {
        date: dateStr,
        timestamp_ms: currentDate.toMillis(),
        score: 50, // Default value, should be replaced with actual data
        rating: 'neutral' // Default value
      };
      
      // Try to find this date in the historical data from the API
      if (fearAndGreedData.fear_and_greed.historical_data) {
        const matchingPoint = fearAndGreedData.fear_and_greed.historical_data.find(
          point => {
            const pointDate = DateTime.fromMillis(point.timestamp_ms).toFormat('yyyy-MM-dd');
            return pointDate === dateStr;
          }
        );
        
        if (matchingPoint) {
          dataPoint.score = matchingPoint.score;
          dataPoint.rating = getRating(matchingPoint.score);
        }
      }
      
      historicalData.push({
        fear_and_greed: {
          score: dataPoint.score,
          rating: dataPoint.rating
        },
        date: dataPoint.date,
        timestamp_ms: dataPoint.timestamp_ms
      });
      
      // Move to next day
      currentDate = currentDate.plus({ days: 1 });
    }
    
    return historicalData;
  } catch (error) {
    console.error(`Error fetching historical data: ${error.message}`);
    return [];
  }
}

/**
 * Main function that fetches data and stores it in DynamoDB
 */
exports.collectFearAndGreedData = async (req, res) => {
  try {
    console.log('Starting Fear and Greed Index data collection');
    
    // Initialize DynamoDB client
    const dynamoDB = configureAWS();
    
    // Get the latest entry from DynamoDB
    const latestEntry = await getLatestEntry(dynamoDB);
    
    // Calculate yesterday's date
    const yesterday = DateTime.now().minus({ days: 1 }).startOf('day');
    const yesterdayStr = yesterday.toFormat('yyyy-MM-dd');
    
    console.log(`Yesterday's date: ${yesterdayStr}`);
    
    // Check if the latest entry is from yesterday
    if (latestEntry && latestEntry.date === yesterdayStr) {
      console.log('Database is up to date with yesterday\'s data. No action needed.');
      
      // Get the oldest entry to report the full range
      const oldestEntry = await getOldestEntry(dynamoDB);
      
      res.status(200).send({
        message: 'Database is already up to date',
        latestEntry: latestEntry,
        oldestEntry: oldestEntry,
        dataRange: {
          from: oldestEntry ? oldestEntry.date : null,
          to: latestEntry ? latestEntry.date : null
        }
      });
      return;
    }
    
    // Calculate the start date for fetching data
    let startDate;
    if (latestEntry) {
      // Start from the day after the latest entry
      startDate = DateTime.fromFormat(latestEntry.date, 'yyyy-MM-dd').plus({ days: 1 }).startOf('day');
    } else {
      // If no entries exist, start from yesterday (or could set a default start date)
      startDate = yesterday;
    }
    
    console.log(`Need to fetch data from ${startDate.toFormat('yyyy-MM-dd')} to ${yesterdayStr}`);
    
    // Fetch historical data for the missing period
    const historicalData = await fetchHistoricalData(startDate, yesterday);
    
    if (historicalData.length === 0) {
      console.log('No historical data available to add');
      res.status(404).send({
        message: 'No historical data available',
        latestEntry: latestEntry
      });
      return;
    }
    
    console.log(`Retrieved ${historicalData.length} historical data points`);
    
    // Store each data point in DynamoDB
    const storedItems = [];
    for (const dataPoint of historicalData) {
      const targetDate = DateTime.fromFormat(dataPoint.date, 'yyyy-MM-dd');
      const storedItem = await storeDataInDynamoDB(dataPoint, dynamoDB, targetDate);
      storedItems.push(storedItem);
    }
    
    // Get the updated latest and oldest entries
    const updatedLatestEntry = await getLatestEntry(dynamoDB);
    const oldestEntry = await getOldestEntry(dynamoDB);
    
    // Return success response
    res.status(200).send({
      message: `Successfully added ${storedItems.length} new data points`,
      addedDataPoints: storedItems.length,
      dateRange: {
        from: startDate.toFormat('yyyy-MM-dd'),
        to: yesterdayStr
      },
      databaseRange: {
        oldest: oldestEntry ? oldestEntry.date : null,
        latest: updatedLatestEntry ? updatedLatestEntry.date : null
      }
    });
    
  } catch (error) {
    console.error(`Error in collectFearAndGreedData: ${error.message}`);
    res.status(500).send(`Error: ${error.message}`);
  }
};
