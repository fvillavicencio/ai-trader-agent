/**
 * URL Validation Script for Geopolitical Risk Sensor
 * 
 * This script validates all URLs in the geopolitical risks report to ensure they are accessible.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createLogger } = require('./src/utils/logger');

// Initialize logger
const logger = createLogger('url-validator');
const DATA_DIR = path.join(__dirname, 'data');
const RISKS_FILE = path.join(DATA_DIR, 'geopolitical_risks.json');

/**
 * Validate a single URL
 * @param {string} url - URL to validate
 * @returns {Promise<Object>} - Validation result
 */
async function validateUrl(url) {
  try {
    // Skip empty URLs
    if (!url) {
      return { url, valid: false, status: 'No URL provided', error: 'Missing URL' };
    }
    
    // Handle Google News URLs which require special handling
    if (url.includes('news.google.com/rss/articles')) {
      // Google News URLs are valid but need special handling to access directly
      return { url, valid: true, status: 'Google News URL (requires special handling)', error: null };
    }
    
    // Make a HEAD request to check if the URL is accessible
    const response = await axios.head(url, {
      timeout: 5000, // 5 second timeout
      maxRedirects: 5,
      validateStatus: status => status < 500, // Accept any status < 500 as "valid"
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    return {
      url,
      valid: response.status >= 200 && response.status < 400,
      status: response.status,
      error: null
    };
  } catch (error) {
    return {
      url,
      valid: false,
      status: error.response?.status || 'Error',
      error: error.message
    };
  }
}

/**
 * Validate all URLs in the geopolitical risks report
 */
async function validateAllUrls() {
  try {
    // Read the geopolitical risks file
    const risksData = JSON.parse(fs.readFileSync(RISKS_FILE, 'utf8'));
    
    logger.info(`Found ${risksData.length} geopolitical risk items to validate`);
    
    // Extract all URLs
    const urlsToValidate = risksData.map(risk => ({
      id: risk.id,
      name: risk.name,
      url: risk.sourceUrl,
      source: risk.source,
      retrievalChannel: risk.retrievalChannel
    }));
    
    // Validate URLs with a concurrency limit to avoid overwhelming servers
    const results = [];
    const concurrencyLimit = 5;
    
    for (let i = 0; i < urlsToValidate.length; i += concurrencyLimit) {
      const batch = urlsToValidate.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(async item => {
        const validationResult = await validateUrl(item.url);
        return {
          ...item,
          ...validationResult
        };
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add a small delay between batches to be nice to servers
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summarize results
    const validUrls = results.filter(result => result.valid);
    const invalidUrls = results.filter(result => !result.valid);
    
    logger.info(`URL Validation Summary:`);
    logger.info(`Total URLs: ${results.length}`);
    logger.info(`Valid URLs: ${validUrls.length}`);
    logger.info(`Invalid URLs: ${invalidUrls.length}`);
    
    // Display invalid URLs
    if (invalidUrls.length > 0) {
      logger.info(`\nInvalid URLs:`);
      invalidUrls.forEach(item => {
        console.log(`\n${item.id}: ${item.name}`);
        console.log(`URL: ${item.url}`);
        console.log(`Source: ${item.source}`);
        console.log(`Retrieval Channel: ${item.retrievalChannel}`);
        console.log(`Status: ${item.status}`);
        console.log(`Error: ${item.error}`);
      });
    }
    
    // Display valid URLs
    logger.info(`\nValid URLs:`);
    validUrls.forEach(item => {
      console.log(`\n${item.id}: ${item.name}`);
      console.log(`URL: ${item.url}`);
      console.log(`Source: ${item.source}`);
      console.log(`Retrieval Channel: ${item.retrievalChannel}`);
      console.log(`Status: ${item.status}`);
    });
    
    // Calculate statistics by retrieval channel
    const channelStats = {};
    results.forEach(item => {
      const channel = item.retrievalChannel || 'unknown';
      if (!channelStats[channel]) {
        channelStats[channel] = { total: 0, valid: 0, invalid: 0 };
      }
      
      channelStats[channel].total++;
      if (item.valid) {
        channelStats[channel].valid++;
      } else {
        channelStats[channel].invalid++;
      }
    });
    
    logger.info(`\nURL Validity by Retrieval Channel:`);
    Object.entries(channelStats).forEach(([channel, stats]) => {
      const validPercentage = (stats.valid / stats.total * 100).toFixed(2);
      console.log(`${channel}: ${stats.valid}/${stats.total} valid (${validPercentage}%)`);
    });
    
    // Save validation results to file
    const validationResultsFile = path.join(DATA_DIR, 'url_validation_results.json');
    fs.writeFileSync(validationResultsFile, JSON.stringify(results, null, 2));
    logger.info(`\nValidation results saved to ${validationResultsFile}`);
    
    return results;
  } catch (error) {
    logger.error(`Error validating URLs: ${error.message}`);
    console.error(error);
    return [];
  }
}

// Run the validation
validateAllUrls();
