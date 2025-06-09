/**
 * YouTube API Module for Market Sentiment Analyzer
 * Fetches data from YouTube channels and playlists
 */

require('dotenv').config();
const axios = require('axios');

// Simple logger for Node.js compatibility
let logger = {
  info: (message) => console.log(`\x1b[32m[INFO] ${message}\x1b[0m`),
  error: (message) => console.error(`\x1b[31m[ERROR] ${message}\x1b[0m`),
  warn: (message) => console.warn(`\x1b[33m[WARN] ${message}\x1b[0m`),
  debug: (message) => console.log(`\x1b[34m[DEBUG] ${message}\x1b[0m`),
  verbose: (message) => console.log(`\x1b[36m[VERBOSE] ${message}\x1b[0m`)
};

// Function to set a custom logger
function setLogger(customLogger) {
  if (customLogger) {
    logger = customLogger;
  }
}

// Import required modules
const { getFeedsByType } = require('../config/analyst-sources');
let detectAnalystMention, extractStockSymbols;

try {
  const analystDetection = require('./analyst-detection');
  const symbolExtraction = require('./stock-symbol-extraction');
  
  // Use the correct function name from the analyst-detection module
  // The module exports isAnalystMentioned, not detectAnalystMention
  detectAnalystMention = (text, analyst) => {
    if (analystDetection && typeof analystDetection.isAnalystMentioned === 'function') {
      return analystDetection.isAnalystMentioned(text.toLowerCase(), analyst) ? analyst : null;
    }
    return null;
  };
  
  extractStockSymbols = symbolExtraction.extractStockSymbols;
  
  console.log('[YOUTUBE DEBUG] Successfully imported detection modules');
} catch (error) {
  logger.warn(`Error importing detection modules: ${error.message}`);
  console.error(`[YOUTUBE DEBUG] Error importing detection modules: ${error.message}`);
  
  // Create fallback functions
  detectAnalystMention = (text, analyst) => {
    // Simple fallback implementation
    if (text && analyst && text.toLowerCase().includes(analyst.toLowerCase())) {
      return analyst;
    }
    return null;
  };
  
  extractStockSymbols = (text) => {
    // Simple fallback implementation
    const symbolRegex = /\$([A-Z]{1,5})\b/g;
    const matches = [];
    let match;
    while ((match = symbolRegex.exec(text)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  };
}

// Extract YouTube feeds from analyst sources
const YOUTUBE_FEEDS = getFeedsByType('youtube_api') || [];
logger.info(`Found ${YOUTUBE_FEEDS.length} YouTube feeds in configuration`);

/**
 * Fetches recent videos from YouTube channels and searches for analyst mentions
 * @param {Date} startTime - The start time to search from
 * @param {Date} endTime - The end time to search to
 * @param {number} maxResults - Maximum number of results to return per channel
 * @returns {Promise<Array>} - Array of commentary items with analyst mentions
 */
async function fetchYouTubeData(startTime, endTime, maxResults = 10) {
  try {
    logger.info('Fetching YouTube data...');
    
    if (!process.env.YOUTUBE_API_KEY) {
      logger.error('YouTube API key not found in environment variables');
      return [];
    }
    
    const apiKey = process.env.YOUTUBE_API_KEY;
    const publishedAfter = startTime.toISOString();
    const publishedBefore = endTime.toISOString();
    const commentaryItems = [];
    
    for (const feed of YOUTUBE_FEEDS) {
      try {
        const analyst = feed.analyst || feed.name.split(' ')[0]; // Get analyst from feed config
        let channelId = null;
        
        // Channel ID resolution logic
        console.log(`[YOUTUBE DEBUG] Resolving channel ID for URL: ${feed.url}`);
        
        // Handle YouTube channel URLs
        if (feed.url.includes('youtube.com/channel/')) {
          // Direct channel ID format
          const channelMatch = feed.url.match(/youtube\.com\/channel\/([-\w]+)/);
          if (channelMatch && channelMatch[1]) {
            channelId = channelMatch[1];
            console.log(`[YOUTUBE DEBUG] Extracted direct channel ID: ${channelId}`);
          }
        } 
        // Handle YouTube handle/custom URLs
        else if (feed.url.includes('youtube.com/@') || feed.url.includes('youtube.com/c/') || feed.url.includes('youtube.com/user/')) {
          // Extract handle or custom name
          const handleMatch = feed.url.match(/youtube\.com\/(?:@|c\/|user\/)([-\w]+)/);
          if (handleMatch && handleMatch[1]) {
            const handle = handleMatch[1];
            console.log(`[YOUTUBE DEBUG] Extracted handle/custom name: ${handle}`);
            
            try {
              // For @handles
              if (feed.url.includes('@')) {
                // First try search to find the channel
                try {
                  console.log(`[YOUTUBE DEBUG] Searching for channel with handle @${handle}`);
                  const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
                    params: {
                      key: apiKey,
                      q: `@${handle}`,
                      type: 'channel',
                      part: 'snippet',
                      maxResults: 1
                    }
                  });
                  
                  if (searchResponse.data?.items?.length > 0) {
                    channelId = searchResponse.data.items[0].id.channelId;
                    console.log(`[YOUTUBE DEBUG] Found channel ID via search: ${channelId}`);
                  } else {
                    console.log(`[YOUTUBE DEBUG] No channels found via search for @${handle}`);
                  }
                } catch (searchError) {
                  console.error(`[YOUTUBE DEBUG] Error searching for channel: ${searchError.message}`);
                }
                
                // If search didn't work, try direct API call
                if (!channelId) {
                  try {
                    console.log(`[YOUTUBE DEBUG] Trying direct API call for handle ${handle}`);
                    // Remove @ from handle if present
                    const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
                    
                    const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
                      params: {
                        key: apiKey,
                        forHandle: cleanHandle,
                        part: 'id'
                      }
                    });
                    
                    if (channelResponse.data?.items?.length > 0) {
                      channelId = channelResponse.data.items[0].id;
                      console.log(`[YOUTUBE DEBUG] Resolved handle @${handle} to channel ID: ${channelId}`);
                    } else {
                      console.log(`[YOUTUBE DEBUG] Could not resolve handle @${handle} via API`);
                    }
                  } catch (apiError) {
                    console.error(`[YOUTUBE DEBUG] Error in channel API call: ${apiError.message}`);
                  }
                }
              } 
              // For custom URLs (c/) and usernames
              else {
                // First try with forUsername parameter
                try {
                  console.log(`[YOUTUBE DEBUG] Trying to resolve custom URL/username ${handle} with forUsername`);
                  const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
                    params: {
                      key: apiKey,
                      forUsername: handle,
                      part: 'id'
                    }
                  });
                  
                  if (channelResponse.data?.items?.length > 0) {
                    channelId = channelResponse.data.items[0].id;
                    console.log(`[YOUTUBE DEBUG] Resolved custom URL ${handle} to channel ID: ${channelId}`);
                  } else {
                    console.log(`[YOUTUBE DEBUG] Could not resolve custom URL ${handle} with forUsername`);
                  }
                } catch (usernameError) {
                  console.error(`[YOUTUBE DEBUG] Error resolving with forUsername: ${usernameError.message}`);
                }
                
                // If that didn't work, try search
                if (!channelId) {
                  try {
                    console.log(`[YOUTUBE DEBUG] Searching for channel with custom URL ${handle}`);
                    const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
                      params: {
                        key: apiKey,
                        q: handle,
                        type: 'channel',
                        part: 'snippet',
                        maxResults: 1
                      }
                    });
                    
                    if (searchResponse.data?.items?.length > 0) {
                      channelId = searchResponse.data.items[0].id.channelId;
                      console.log(`[YOUTUBE DEBUG] Found channel ID via search: ${channelId}`);
                    } else {
                      console.log(`[YOUTUBE DEBUG] No channels found via search for ${handle}`);
                    }
                  } catch (searchError) {
                    console.error(`[YOUTUBE DEBUG] Error searching for channel: ${searchError.message}`);
                  }
                }
              }
            } catch (error) {
              console.error(`[YOUTUBE DEBUG] Error resolving handle/custom name: ${error.message}`);
              logger.error(`Error resolving handle/custom name: ${error.message}`);
            }
          }
        } 
        // Handle direct handles without youtube.com
        else if (feed.url.startsWith('@')) {
          const handle = feed.url.substring(1); // Remove @ symbol
          console.log(`[YOUTUBE DEBUG] Processing direct handle: @${handle}`);
          
          try {
            // Search for the channel by username
            const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
              params: {
                key: apiKey,
                q: `@${handle}`,
                type: 'channel',
                part: 'snippet',
                maxResults: 1
              }
            });
            
            if (searchResponse.data?.items?.length > 0) {
              channelId = searchResponse.data.items[0].id.channelId;
              console.log(`[YOUTUBE DEBUG] Resolved direct handle @${handle} to channel ID: ${channelId}`);
            }
          } catch (error) {
            console.error(`[YOUTUBE DEBUG] Error resolving direct handle: ${error.message}`);
            logger.error(`Error resolving direct handle: ${error.message}`);
          }
        }
        // Use as direct channel ID if it looks like one
        else if (/^[\w-]{24}$/.test(feed.url)) {
          channelId = feed.url;
          console.log(`[YOUTUBE DEBUG] Using direct channel ID: ${channelId}`);
        }
        // For playlist URLs
        else if (feed.url.includes('playlist?list=')) {
          // This is a playlist, not a channel
          // We'll handle this separately
          const playlistMatch = feed.url.match(/playlist\?list=([\w-]+)/);
          if (playlistMatch && playlistMatch[1]) {
            const playlistId = playlistMatch[1];
            console.log(`[YOUTUBE DEBUG] Detected playlist ID: ${playlistId}`);
            
            try {
              // Get videos from playlist instead of channel
              const playlistResponse = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
                params: {
                  key: apiKey,
                  playlistId: playlistId,
                  part: 'snippet',
                  maxResults: maxResults
                }
              });
              
              if (playlistResponse.data?.items) {
                console.log(`[YOUTUBE DEBUG] Found ${playlistResponse.data.items.length} videos in playlist`);
                
                for (const item of playlistResponse.data.items) {
                  try {
                    const videoId = item.snippet.resourceId.videoId;
                    const videoTitle = item.snippet.title;
                    const videoDescription = item.snippet.description;
                    const publishedAt = new Date(item.snippet.publishedAt);
                    
                    // Check if the video is within our date range
                    if (publishedAt < startTime || publishedAt > endTime) {
                      continue;
                    }
                    
                    // Get video details
                    const videoResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                      params: {
                        key: apiKey,
                        id: videoId,
                        part: 'snippet,contentDetails,statistics'
                      }
                    });
                    
                    if (videoResponse.data?.items?.length > 0) {
                      const videoDetails = videoResponse.data.items[0];
                      const fullText = `${videoTitle} ${videoDescription}`;
                      
                      // Check for analyst mentions
                      console.log(`[YOUTUBE DEBUG] Detecting analyst mentions in playlist video: "${videoTitle}" for analyst: ${analyst}`);
                      const detectedAnalyst = detectAnalystMention(fullText, analyst);
                      console.log(`[YOUTUBE DEBUG] Detection result: ${detectedAnalyst}`);
                      
                      if (detectedAnalyst === analyst) {
                        console.log(`[YOUTUBE DEBUG] Found analyst mention in playlist video ${videoId}`);
                        const stockSymbols = extractStockSymbols(fullText);
                        console.log(`[YOUTUBE DEBUG] Found ${stockSymbols.length} stock symbols: ${stockSymbols.join(', ')}`);

                        
                        commentaryItems.push({
                          analyst_id: analyst,
                          content: videoDescription,
                          raw_content: videoDescription,
                          title: videoTitle,
                          published_at_utc: publishedAt.toISOString(),
                          pubDate: publishedAt.toISOString(),
                          retrieved_at_utc: new Date().toISOString(),
                          url: `https://www.youtube.com/watch?v=${videoId}`,
                          link: `https://www.youtube.com/watch?v=${videoId}`,
                          source: `YouTube - ${videoDetails.snippet?.channelTitle || feed.name}`,
                          sourceType: 'youtube',
                          tickers: [...new Set(stockSymbols)],
                          mentionedStocks: [...new Set(stockSymbols)],
                          mentionedAnalysts: [analyst],
                          language: 'en',
                          metadata: {
                            views: videoDetails.statistics?.viewCount || 0,
                            duration_sec: videoDetails.contentDetails?.duration || 'unknown',
                            channel_title: videoDetails.snippet?.channelTitle || '',
                            content_type: 'video'
                          }
                        });
                      }
                    }
                  } catch (videoError) {
                    console.error(`[YOUTUBE DEBUG] Error processing playlist video: ${videoError.message}`);
                    logger.warn(`Error processing playlist video: ${videoError.message}`);
                  }
                }
              }
              
              // Skip the regular channel processing since we've handled the playlist
              continue;
            } catch (playlistError) {
              console.error(`[YOUTUBE DEBUG] Error fetching playlist: ${playlistError.message}`);
              logger.error(`Error fetching playlist: ${playlistError.message}`);
              continue;
            }
          }
        }
        
        if (!channelId) {
          logger.warn(`Could not determine channel ID for ${feed.name}`);
          continue;
        }
        
        // Get recent videos from channel
        if (!channelId) {
          console.log(`[YOUTUBE DEBUG] No valid channel ID found for ${feed.name}, skipping`);
          logger.warn(`No valid channel ID found for ${feed.name}, skipping`);
          continue;
        }
        
        console.log(`[YOUTUBE DEBUG] Searching for videos from channel ${channelId}`);
        let searchResponse;
        try {
          // Format dates correctly for the API
          // The API requires RFC 3339 format
          const formattedStartTime = startTime.toISOString();
          const formattedEndTime = endTime.toISOString();
          
          console.log(`[YOUTUBE DEBUG] Search params: channelId=${channelId}, publishedAfter=${formattedStartTime}, publishedBefore=${formattedEndTime}`);
          
          searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
              key: apiKey,
              channelId: channelId,
              part: 'snippet',
              order: 'date',
              maxResults: maxResults,
              publishedAfter: formattedStartTime,
              publishedBefore: formattedEndTime,
              type: 'video'
            }
          });
          
          console.log(`[YOUTUBE DEBUG] Search response status: ${searchResponse.status}`);
          console.log(`[YOUTUBE DEBUG] Found ${searchResponse.data?.items?.length || 0} videos`);
          
        } catch (error) {
          console.error(`[YOUTUBE DEBUG] Error fetching videos for channel ${feed.name}:`, error.response?.data || error.message);
          logger.error(`Error fetching videos for channel ${feed.name}: ${error.message}`);
          continue;
        }
        
        if (!searchResponse.data?.items) {
          logger.warn(`No videos found for channel: ${feed.name}`);
          continue;
        }
        
        for (const item of searchResponse.data.items) {
          try {
            console.log(`[YOUTUBE DEBUG] Getting details for video ${item.id.videoId}`);
            
            const videoId = item.id.videoId;
            const videoTitle = item.snippet.title;
            const videoDescription = item.snippet.description;
            const publishedAt = new Date(item.snippet.publishedAt);
            const channelTitle = item.snippet.channelTitle;
            
            // Get video details
            const videoResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
              params: {
                key: apiKey,
                id: videoId,
                part: 'contentDetails,statistics'
              }
            });
            
            let duration = 0;
            if (videoResponse.data.items?.length > 0) {
              try {
                const durationStr = videoResponse.data.items[0].contentDetails.duration;
                const matches = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                
                if (matches) {
                  const hours = parseInt(matches[1] || 0, 10);
                  const minutes = parseInt(matches[2] || 0, 10);
                  const seconds = parseInt(matches[3] || 0, 10);
                  duration = hours * 3600 + minutes * 60 + seconds;
                }
              } catch (error) {
                console.log(`[YOUTUBE DEBUG] Error parsing video duration: ${error.message}`);
                logger.error(`Error parsing video duration: ${error.message}`);
              }
            }
            
            // Check for analyst mentions
            console.log(`[YOUTUBE DEBUG] Detecting analyst mentions in: "${videoTitle}" for analyst: ${analyst}`);
            const fullText = `${videoTitle} ${videoDescription}`;
            
            // Pass both text and analyst to the detection function
            const detectedAnalyst = detectAnalystMention(fullText, analyst);
            console.log(`[YOUTUBE DEBUG] Detection result: ${detectedAnalyst}`);
            
            if (detectedAnalyst === analyst) {
              console.log(`[YOUTUBE DEBUG] Found analyst mention in video ${videoId}`);
              const stockSymbols = extractStockSymbols(fullText);
              console.log(`[YOUTUBE DEBUG] Found ${stockSymbols.length} stock symbols: ${stockSymbols.join(', ')}`);
              
              commentaryItems.push({
                analyst_id: analyst,
                source: `YouTube - ${channelTitle}`,
                title: videoTitle,
                content: videoDescription, // Use content field for compatibility with other feeds
                raw_content: videoDescription,
                url: `https://www.youtube.com/watch?v=${videoId}`,
                link: `https://www.youtube.com/watch?v=${videoId}`, // Add link field for compatibility
                published_at_utc: publishedAt.toISOString(),
                pubDate: publishedAt.toISOString(), // Add pubDate field for compatibility
                retrieved_at_utc: new Date().toISOString(),
                tickers: [...new Set(stockSymbols)],
                mentionedStocks: [...new Set(stockSymbols)], // Add mentionedStocks field for compatibility
                mentionedAnalysts: [analyst], // Add mentionedAnalysts field for compatibility
                sourceType: 'youtube', // Add sourceType field for compatibility
                language: 'en',
                metadata: {
                  duration_sec: duration,
                  views: videoResponse.data.items?.[0]?.statistics?.viewCount || 0,
                  content_type: 'video'
                }
              });
              console.log(`[YOUTUBE DEBUG] Added video ${videoId} to results`);
              logger.info(`Found relevant YouTube video for ${analyst}: ${videoTitle}`);
            } else {
              console.log(`[YOUTUBE DEBUG] No analyst mentions found in video ${videoId}, skipping`);
            }
          } catch (videoError) {
            console.log(`[YOUTUBE DEBUG] Error processing video: ${videoError.message}`);
            logger.warn(`Error processing video: ${videoError.message}`);
          }
        }
      } catch (searchError) {
        console.log(`[YOUTUBE DEBUG] Search error: ${searchError.message}`);
        logger.error(`Search error: ${searchError.message}`);
      }
    }
    
    console.log(`[YOUTUBE DEBUG] fetchYouTubeData returning ${commentaryItems.length} videos`);
    return commentaryItems;
  } catch (error) {
    console.log(`[YOUTUBE DEBUG] Error in fetchYouTubeData: ${error.message}`);
    logger.error(`Error in fetchYouTubeData: ${error.message}`);
    return [];
  }
}

/**
 * Fetches videos from a YouTube playlist
 * @param {string} playlistId - The YouTube playlist ID
 * @param {Date} startTime - The start time to search from
 * @param {number} maxResults - Maximum number of results to return
 * @returns {Promise<Array>} - Array of video items
 */
async function fetchPlaylistVideos(playlistId, startTime, maxResults = 10) {
  try {
    if (!process.env.YOUTUBE_API_KEY) {
      logger.error('YouTube API key not found in environment variables');
      return [];
    }
    
    const apiKey = process.env.YOUTUBE_API_KEY;
    const videos = [];
    
    const playlistResponse = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
      params: {
        key: apiKey,
        playlistId: playlistId,
        part: 'snippet',
        maxResults: maxResults
      }
    });
    
    if (!playlistResponse.data?.items) {
      logger.warn(`No videos found in playlist: ${playlistId}`);
      return [];
    }
    
    for (const item of playlistResponse.data.items) {
      try {
        const videoId = item.snippet.resourceId.videoId;
        const videoTitle = item.snippet.title;
        const publishedAt = new Date(item.snippet.publishedAt);
        
        // Only include videos published after startTime
        if (publishedAt >= startTime) {
          videos.push({
            id: videoId,
            title: videoTitle,
            publishedAt: publishedAt,
            url: `https://www.youtube.com/watch?v=${videoId}`
          });
        }
      } catch (error) {
        logger.warn(`Error processing playlist item: ${error.message}`);
      }
    }
    
    return videos;
  } catch (error) {
    logger.error(`Error fetching playlist videos: ${error.message}`);
    return [];
  }
}

/**
 * Function expected by the main index.js file
 * @param {string} channelId - YouTube channel ID or handle
 * @returns {Promise<Array>} - Array of videos from the channel
 */
async function getLatestVideos(channelId) {
  console.log(`[YOUTUBE DEBUG] Getting latest videos for channel: ${channelId}`);
  logger.info(`Getting latest videos for channel: ${channelId}`);
  
  // Create date range for the last 24 hours
  const endTime = new Date();
  const startTime = new Date(endTime);
  startTime.setDate(startTime.getDate() - 1); // Last 24 hours
  
  try {
    console.log(`[YOUTUBE DEBUG] Calling fetchYouTubeData with startTime=${startTime.toISOString()}, endTime=${endTime.toISOString()}`);
    
    // Get all videos from the YouTube API
    const allVideos = await fetchYouTubeData(startTime, endTime);
    console.log(`[YOUTUBE DEBUG] fetchYouTubeData returned ${allVideos.length} videos`);
    
    if (allVideos.length > 0) {
      console.log(`[YOUTUBE DEBUG] Sample video:`, JSON.stringify(allVideos[0], null, 2));
    }
    
    // Filter videos by the requested channel ID or handle
    const filteredVideos = allVideos.filter(video => {
      // Check if the video's channel matches the requested channel
      const videoChannelId = video.channelId || '';
      const videoChannelHandle = video.channelHandle || '';
      
      const isMatch = videoChannelId === channelId || 
                      videoChannelId.includes(channelId) || 
                      videoChannelHandle === channelId || 
                      videoChannelHandle.includes(channelId);
      
      console.log(`[YOUTUBE DEBUG] Video ${video.title} channel match? ${isMatch} (videoChannelId=${videoChannelId}, videoChannelHandle=${videoChannelHandle}, requested=${channelId})`);
      
      return isMatch;
    });
    
    console.log(`[YOUTUBE DEBUG] Returning ${filteredVideos.length} filtered videos for channel ${channelId}`);
    return filteredVideos;
  } catch (error) {
    console.error(`[YOUTUBE DEBUG] Error getting videos for channel ${channelId}:`, error);
    logger.error(`Error getting videos for channel ${channelId}: ${error.message}`);
    return [];
  }
}

module.exports = {
  fetchYouTubeData,
  fetchPlaylistVideos,
  getLatestVideos,
  setLogger
};
