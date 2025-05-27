/**
 * Ghost Publisher Lambda Function
 * 
 * This Lambda function:
 * 1. Publishes an article to Ghost CMS
 * 2. Includes fallback mechanisms for different visibility settings
 * 3. Implements robust error handling and retry logic
 */

const GhostAdminAPI = require('@tryghost/admin-api');
const AWS = require('aws-sdk');

// Constants for retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RETRY_STATUS_CODES = [429, 500, 502, 503, 504];

/**
 * Enhanced retry function for API calls with exponential backoff
 * @param {Function} fn - The function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in ms
 * @param {Array} retryStatusCodes - HTTP status codes to retry on
 * @returns {Promise} - The result of the function call
 */
const retryWithExponentialBackoff = async (fn, maxRetries = MAX_RETRIES, initialDelay = RETRY_DELAY_MS, retryStatusCodes = RETRY_STATUS_CODES) => {
    let retries = 0;
    let delay = initialDelay;
    
    while (true) {
        try {
            console.log(`Attempt ${retries + 1}: Executing function...`);
            return await fn();
        } catch (error) {
            // Enhanced error logging
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                status: error.response?.status,
                statusText: error.response?.statusText,
                headers: error.response?.headers ? JSON.stringify(error.response.headers) : 'No headers',
                data: error.response?.data ? JSON.stringify(error.response.data).substring(0, 200) : 'No data'
            });
            
            // Check if we've reached the maximum number of retries
            if (retries >= maxRetries) {
                console.error(`Maximum retries (${maxRetries}) reached. Giving up.`);
                throw error;
            }
            
            // Check if the error has a response with a status code
            const statusCode = error.response?.status;
            
            // Only retry on specific status codes if provided
            if (statusCode && retryStatusCodes.length > 0 && !retryStatusCodes.includes(statusCode)) {
                console.error(`Error with status code ${statusCode} is not in the retry list. Giving up.`);
                throw error;
            }
            
            // Increment retry counter
            retries++;
            
            // Log the retry attempt
            console.warn(`Attempt ${retries}/${maxRetries} failed with ${error.message}. Retrying in ${delay}ms...`);
            
            // Wait for the specified delay
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Increase the delay for the next retry (exponential backoff)
            delay *= 2;
        }
    }
};

/**
 * Lambda handler function
 * @param {object} event - The Lambda event object
 * @param {object} context - The Lambda context object
 * @returns {object} - The Lambda response object
 */
exports.handler = async (event, context) => {
    try {
        console.log('Event received:', JSON.stringify(event));
        console.log('Context:', JSON.stringify(context));
        
        // Initialize the Ghost Admin API client
        const ghostUrl = process.env.GHOST_URL || event.ghostUrl;
        const ghostApiKey = process.env.GHOST_API_KEY || event.ghostApiKey;
        const newsletterId = process.env.GHOST_NEWSLETTER_ID || event.newsletterId;
        
        console.log('Ghost URL:', ghostUrl);
        console.log('Ghost API Key:', ghostApiKey ? 'Provided (masked)' : 'Not provided');
        console.log('Newsletter ID:', newsletterId);
        
        if (!ghostUrl || !ghostApiKey) {
            throw new Error('Missing required Ghost credentials. Please provide GHOST_URL and GHOST_API_KEY as environment variables or in the request payload.');
        }
        
        const api = new GhostAdminAPI({
            url: ghostUrl,
            key: ghostApiKey,
            version: 'v5.0'
        });
        
        // Parse the JSON data from the event
        let data;
        
        // Handle different input formats
        if (event.jsonData) {
            // Direct JSON data provided in the event
            data = event.jsonData;
            console.log('Using jsonData from event');
        } else if (event.body) {
            // API Gateway format
            console.log('Detected API Gateway format with body');
            let parsedBody;
            try {
                parsedBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
                console.log('Parsed body:', JSON.stringify(parsedBody).substring(0, 200) + '...');
            } catch (error) {
                console.error('Error parsing event.body:', error);
                throw new Error('Invalid JSON in event.body');
            }
            
            if (parsedBody.jsonData) {
                data = parsedBody.jsonData;
                console.log('Using jsonData from parsed body');
            } else if (parsedBody.ghostUrl) {
                // If the body contains ghostUrl, it's likely the full payload
                ghostUrl = parsedBody.ghostUrl || ghostUrl;
                ghostApiKey = parsedBody.ghostApiKey || ghostApiKey;
                newsletterId = parsedBody.newsletterId || newsletterId;
                data = parsedBody.jsonData;
                console.log('Using jsonData from parsed body with credentials');
            } else {
                data = parsedBody;
                console.log('Using entire parsed body as data');
            }
        } else {
            // Direct event as data
            data = event;
            console.log('Using entire event as data');
        }
        
        // Validate the data structure
        if (!data) {
            throw new Error('No data provided in the event payload.');
        }
        
        console.log('Data structure validation passed');
        console.log('Data keys:', Object.keys(data));
        
        // Generate a title for the post
        const title = data.metadata && data.metadata.title 
            ? `${data.metadata.title}: ${data.decision.text}`
            : data.decision.text;
            
        console.log('Generated title:', title);
        
        // Prepare the post data
        // Define visibility options to try if the primary one fails
        const visibilityOptions = ['members', 'public'];
        
        // Prepare the post data (without visibility for now)
        const postData = {
            title: title,
            status: 'published',
            featured: false,
            tags: [
                { name: 'Market Insights' },
                { name: 'Daily Update' },
                { name: 'Market Pulse' }
            ],
            excerpt: data.decision.summary,
            newsletter: {
                id: newsletterId
            }
        };
        
        console.log('Post data prepared:', JSON.stringify({
            ...postData,
            mobiledoc: '(mobiledoc content omitted for brevity)'
        }));
        
        // Attempt to create post in Ghost with fallback visibility options
        console.log('Attempting to create post in Ghost with fallback visibility options...');
        
        // Define a max number of retries for each visibility option
        const MAX_RETRIES_PER_VISIBILITY = 3;
        const RETRY_DELAY_MS = 1000;
        
        // Function to try creating a post with a specific visibility setting
        const createPostWithVisibility = async (visibilityOption) => {
            console.log(`Attempting to create post with visibility: ${visibilityOption}`);
            const currentPostData = {
                ...postData,
                visibility: visibilityOption
            };
            return await api.posts.add(currentPostData);
        };
        
        // Try each visibility option with retries
        let post = null;
        let lastError = null;
        
        for (let visIndex = 0; visIndex < visibilityOptions.length; visIndex++) {
            const currentVisibility = visibilityOptions[visIndex];
            console.log(`Trying visibility option ${visIndex + 1}/${visibilityOptions.length}: ${currentVisibility}`);
            
            // Try this visibility option with retries
            for (let attempt = 1; attempt <= MAX_RETRIES_PER_VISIBILITY; attempt++) {
                try {
                    console.log(`Attempt ${attempt}/${MAX_RETRIES_PER_VISIBILITY} with visibility '${currentVisibility}'`);
                    post = await createPostWithVisibility(currentVisibility);
                    console.log(`Success! Post created with visibility: ${currentVisibility}`);
                    // If successful, break out of the retry loop
                    break;
                } catch (error) {
                    lastError = error;
                    console.error(`Attempt ${attempt} with visibility '${currentVisibility}' failed:`, error.message);
                    
                    // Log detailed error information
                    console.error('Error details:', {
                        message: error.message,
                        code: error.code,
                        status: error.response?.status,
                        statusText: error.response?.statusText,
                        data: error.response?.data ? JSON.stringify(error.response.data).substring(0, 200) : 'No data'
                    });
                    
                    // If this is not the last attempt for this visibility, wait before retrying
                    if (attempt < MAX_RETRIES_PER_VISIBILITY) {
                        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                        console.log(`Waiting ${delay}ms before next attempt...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
            
            // If we got a post, we're done
            if (post) {
                break;
            }
            
            // If we're here, all attempts with this visibility failed
            console.log(`All attempts with visibility '${currentVisibility}' failed. ${visIndex < visibilityOptions.length - 1 ? 'Trying next visibility option.' : 'No more visibility options to try.'}`);
        }
        
        // If we still don't have a post, throw the last error
        if (!post) {
            console.error('All visibility options failed. Giving up.');
            throw lastError || new Error('Failed to create post with all visibility options');
        }
        
        console.log('Post created successfully:', post.id);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
            },
            body: JSON.stringify({
                message: 'Post created successfully',
                postId: post.id,
                postUrl: post.url,
                status: 'success'
            })
        };
    } catch (error) {
        console.error('Error:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
            },
            body: JSON.stringify({
                message: 'Error creating post',
                error: error.message,
                status: 'error'
            })
        };
    }
};
