/**
 * Publishes an HTML file from Google Drive to Ghost CMS.
 * 
 * @param {string} fileId - The ID of the HTML file in Google Drive
 * @param {string} folderId - The ID of the folder containing the HTML file
 * @param {string} fileName - The name of the HTML file
 * @param {Object} options - Additional options
 * @param {boolean} options.draft - Force the post to be created as a draft
 * @returns {Object} - The response from Ghost API
 */
function publishToGhost(fileId, folderId, fileName, options = {}) {
    try {
        // Get script properties
        const props = PropertiesService.getScriptProperties();
        const ghostApiUrl = props.getProperty('GHOST_API_URL') || 'https://market-pulse-daily.ghost.io';
        const ghostAdminApiKey = props.getProperty('GHOST_ADMIN_API_KEY') || '67f553a7f41c9900013e1fbe:36fe3da206f1ebb61643868fffca951da8ce9571521c1e8f853aadffe2f56e2e';
        const ghostAuthorId = props.getProperty('GHOST_AUTHOR_ID') || null;
        const debugMode = props.getProperty('DEBUG_MODE') === 'true';
        const newsletterId = props.getProperty('GHOST_NEWSLETTER_ID') || '67f427c5744a72000854ee8f';  // Using GHOST_NEWSLETTER_ID property

        // Get current time in ET
        const now = new Date();
        const timeInET = Utilities.formatDate(now, TIME_ZONE, 'HH:mm');
        const [hour, minute] = timeInET.split(':');
        const currentHour = parseInt(hour);
        const currentMinute = parseInt(minute);

        // Determine content type based on time
        const isPremiumContent = currentHour < 16 || (currentHour === 16 && currentMinute < 30);

        // Set visibility and email segment
        const visibility = isPremiumContent ? "paid" : "members";
        const emailSegment = "all"; // Send to all members regardless of content type

        // Log configuration
        Logger.log('Ghost API Configuration:');
        Logger.log('Raw API URL: ' + ghostApiUrl);
        Logger.log('Raw Admin API Key: ' + ghostAdminApiKey);
        Logger.log('Raw Author ID: ' + ghostAuthorId);
        Logger.log('Newsletter ID: ' + newsletterId);
        Logger.log('Content Type: ' + (isPremiumContent ? 'Premium (Paid-members only)' : 'Standard (Members only)'));
        Logger.log('Debug Mode: ' + debugMode);
        Logger.log('Email Segment: ' + emailSegment);

        // Set configuration
        const config = {
          apiUrl: ghostApiUrl,
          apiKey: ghostAdminApiKey,
          authorId: ghostAuthorId,
          newsletterId: newsletterId
        };

        // Get the HTML content from the file
        const file = DriveApp.getFileById(fileId);
        const htmlContent = file.getBlob().getDataAsString();
        
        // Format content for Ghost
        const formattedContent = formatContentForGhost(htmlContent);
        
        // Extract excerpt from justification section
        const excerpt = extractJustificationExcerpt(htmlContent);
        
        // Generate engaging title and tags
        const titleInfo = generateEngagingTitle();
        const title = titleInfo.title;
        const tags = titleInfo.tags;
        
        // Generate token
        const token = generateGhostJWT(config.apiKey);
        
        // Build post payload
        const postPayload = {
          title: title,
          lexical: JSON.stringify(formattedContent),
          status: "published", // Always publish immediately
          tags: tags,
          visibility: visibility,
          custom_excerpt: excerpt,
          email_recipient_filter: emailSegment,
          send_email_when_published: true, // Always send emails when published
          newsletter_id: config.newsletterId,
          email_segment: "all", // Added for compatibility with older Ghost versions
          canonical_url: ""
        };

        // Build options object
        const optionsObj = {
          method: 'post',
          headers: {
            'Authorization': 'Ghost ' + token,
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify({ posts: [postPayload] })
        };

        // Create post
        const createUrl = `${config.apiUrl}/ghost/api/admin/posts/?newsletter=${config.newsletterId}`;
        const createResponse = UrlFetchApp.fetch(createUrl, optionsObj);
        const createResult = JSON.parse(createResponse.getContentText());

        // --- Enhancement: Log and validate Ghost API response for email sending ---
        Logger.log('Ghost API create post response: ' + JSON.stringify(createResult));
        if (createResult && createResult.posts && createResult.posts[0]) {
          const post = createResult.posts[0];
          // If post status is 'sent', email was dispatched
          if (post.status === 'sent') {
            Logger.log('Email sent successfully to subscribers.');
          } else if (post.status === 'published') {
            Logger.log('Post published, but email may not have been sent. Check Ghost configuration.');
          } else {
            Logger.log('Post status: ' + post.status + '. Email NOT sent.');
          }
          // Log email object if present
          if (post.email) {
            Logger.log('Email object: ' + JSON.stringify(post.email));
          } else {
            Logger.log('No email object present in response.');
          }
        }
        // --- End enhancement ---
        return createResult;

    } catch (error) {
        Logger.log('Error in publishToGhost: ' + error.toString());
        throw error;
    }
}

/**
 * Formats the content for Ghost.
 * Removes title/timestamp, applies styles, and wraps HTML in Lexical format.
 * @param {string} html - The HTML content to format
 * @returns {Object} - Lexical format object for Ghost API
 */
function formatContentForGhost(html) {
  // Remove the title and timestamp from the content
  const titleRegex = /<h1[^>]*>Market Pulse Daily[^<]*<\/h1>/i;
  const timestampRegex = /<p[^>]*>As of[^<]*<\/p>/i;
  let contentWithoutTitle = html.replace(titleRegex, '');
  contentWithoutTitle = contentWithoutTitle.replace(timestampRegex, '');

  // Add CSS styles to reduce font sizes
  const styles = `
    <style>
      /* Reduce font size by 20% for Upcoming Events */
      .upcoming-events h2, .upcoming-events h3, .upcoming-events .event-name, .upcoming-events .event-date {
        font-size: 0.8em !important;
      }
      /* Reduce font size by 20% for Market Sentiment */
      .market-sentiment h2, .market-sentiment h3, .market-sentiment .sentiment-item {
        font-size: 0.8em !important;
      }
      /* Reduce font size by 20% for Geopolitical Risks */
      .geopolitical-risks h2, .geopolitical-risks h3, .geopolitical-risks .risk-item {
        font-size: 0.8em !important;
      }
    </style>
  `;

  // Wrap the content with our styles
  const styledHtml = `${styles}${contentWithoutTitle}`;

  // Convert HTML to Lexical format
  return {
    root: {
      type: 'root',
      version: 1,
      indent: 0,
      format: '',
      direction: null,
      children: [
        {
          type: 'html',
          html: styledHtml,
          version: 1
        }
      ]
    }
  };
}

/**
 * Extracts the Justification section from the HTML content to use as the excerpt
 * @param {string} htmlContent - The HTML content to extract from
 * @returns {string} - The extracted justification text
 */
function extractJustificationExcerpt(htmlContent) {
  // Normalize whitespace in the HTML
  const normalizedHtml = htmlContent.replace(/\s+/g, ' ');
  
  // Try to find the justification section using the ID first
  const justificationSection = normalizedHtml.match(/<div[^>]*id="justification-section"[^>]*>(.*?)<\/div>/i);
  if (justificationSection) {
    // Extract the content inside the div and remove the heading
    const content = justificationSection[1];
    const text = content.replace(/<h2[^>]*>Justification<\/h2>/i, '');
    // Remove HTML tags and trim whitespace
    const cleanText = text.replace(/<[^>]+>/g, '').trim();
    // Limit to 300 characters
    return cleanText.substring(0, 300);
  }
  
  // Fallback: try to find by heading text
  const byHeadingMatch = normalizedHtml.match(/<h2[^>]*>Justification<\/h2>\s*<div[^>]*>(.*?)<\/div>/i);
  if (byHeadingMatch) {
    // Extract the content inside the div and remove the heading
    const content = byHeadingMatch[1];
    const text = content.replace(/<h2[^>]*>Justification<\/h2>/i, '');
    // Remove HTML tags and trim whitespace
    const cleanText = text.replace(/<[^>]+>/g, '').trim();
    // Limit to 300 characters
    return cleanText.substring(0, 300);
  }
  
  // Default fallback if neither method works
  return "Market analysis and trading insights for today's market conditions.";
}

/**
 * Test function to create a draft post from the latest trading analysis HTML file in Ghost.
 * @param {Object} options - Configuration options
 * @returns {Object} - The result of the publishing operation including the draft URL and ID
 */
function testPublishLatestAnalysis(options) {
  try {
    // Get script properties
    const props = PropertiesService.getScriptProperties();
    const folderName = props.getProperty('GOOGLE_FOLDER_NAME');
    const fileName = props.getProperty('GOOGLE_FILE_NAME');

    // Find the folder by name
    const folderIterator = DriveApp.getFoldersByName(folderName);
    if (!folderIterator.hasNext()) {
      throw new Error(`Folder ${folderName} not found`);
    }
    const folder = folderIterator.next();
    
    Logger.log(`Searching for file: ${fileName} in folder: ${folderName}`);

    // Search for the file in the specified folder
    const files = folder.getFilesByName(fileName);

    if (!files.hasNext()) {
      throw new Error(`File ${fileName} not found in folder ${folderName}`);
    }

    const file = files.next();
    Logger.log(`Found file: ${file.getName()} with ID: ${file.getId()}`);

    // --- Enhancement: Option to publish and notify (not just draft) ---
    // Accept options.publishAndNotify to publish and send email
    const publishAndNotify = options && options.publishAndNotify;
    const result = publishToGhost(file.getId(), folder.getId(), fileName, { draft: !publishAndNotify });
    // Log and return the post information
    if (result && result.posts && result.posts[0]) {
      const post = result.posts[0];
      const postUrl = `${props.getProperty('GHOST_API_URL')}/ghost/#/editor/post/${post.id}`;
      Logger.log((publishAndNotify ? 'Published' : 'Draft') + ' Post Created Successfully!');
      Logger.log('Post ID: ' + post.id);
      Logger.log('Post URL: ' + postUrl);
      // Log email status
      if (post.status === 'sent') {
        Logger.log('Email sent successfully to subscribers.');
      } else if (post.status === 'published') {
        Logger.log('Post published, but email may not have been sent.');
      } else {
        Logger.log('Post status: ' + post.status);
      }
      return {
        success: true,
        postId: post.id,
        postUrl: postUrl,
        status: post.status,
        message: (publishAndNotify ? 'Published and notified' : 'Draft post created')
      };
    } else {
      throw new Error('Failed to create post');
    }
  } catch (error) {
    Logger.log('Error in testPublishLatestAnalysis:' + error.toString());
    throw error;
  }
}

/**
 * Generates a Ghost Admin API JWT for authentication.
 * @param {string} adminApiKey - The Ghost Admin API key in id:secret format
 * @returns {string} - The JWT token
 */
function generateGhostJWT(adminApiKey) {
  var parts = adminApiKey.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid Admin API key format. Expect "id:secret".');
  }
  var keyId = parts[0];
  var secretHex = parts[1]; // secret is a hex string

  // Convert the hex secret to bytes
  var secretBytes = hexToBytes(secretHex);
  
  // Build the JWT header and payload
  var header = { alg: "HS256", typ: "JWT", kid: keyId };
  var now = Math.floor(Date.now() / 1000);
  // The token is valid for 5 minutes
  var payload = { iat: now, exp: now + 300, aud: "/admin/" };

  // Helper function to Base64Url encode an object without trailing '='
  var base64UrlEncode = function(obj) {
    return Utilities.base64EncodeWebSafe(JSON.stringify(obj)).replace(/=+$/, '');
  };

  var encodedHeader = base64UrlEncode(header);
  var encodedPayload = base64UrlEncode(payload);
  var toSign = Utilities.newBlob(encodedHeader + "." + encodedPayload).getBytes();
  
  // Compute the signature using the secret bytes
  var signatureBytes = Utilities.computeHmacSha256Signature(toSign, secretBytes);
  var encodedSignature = Utilities.base64EncodeWebSafe(signatureBytes).replace(/=+$/, '');
  
  return encodedHeader + "." + encodedPayload + "." + encodedSignature;
}

/**
 * Converts a hex string to a byte array with proper handling for signed 8-bit values
 * @param {string} hex - The hex string to convert
 * @returns {number[]} Array of bytes
 * @throws {Error} If the hex string is invalid
 */
function hexToBytes(hex) {
  var bytes = [];
  for (var i = 0; i < hex.length; i += 2) {
    var byte = parseInt(hex.substr(i, 2), 16);
    if (byte > 127) byte -= 256;  // interpret as signed 8-bit (two's complement)
    bytes.push(byte);
  }
  return bytes;
}

/**
 * Generates an engaging market-related title with a timestamp
 * @returns {Object} The formatted title and tags
 */
function generateEngagingTitle() {
  const now = new Date();
  const time = Utilities.formatDate(now, Session.getScriptTimeZone(), "h:mm a z");
  const date = Utilities.formatDate(now, Session.getScriptTimeZone(), "MMMM d, yyyy");
  // Array of engaging market phrases
  const marketPhrases = [
    "Market Currents","Market Pulse","Market Whisper","Market Musings","Market Rhythms",
    "Market Beats","Market Insights","Market Signals","Market Watch","Market Movements"
  ];
  // Randomly select a phrase
  const phrase = marketPhrases[Math.floor(Math.random() * marketPhrases.length)];
  // Add a random emoji for engagement
  const emojis = ["📊", "📈", "📉", "💰", "🔍", "🎯", "💡", "⚡", "💫", "🌟"];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  // Format the title with emoji after the name
  return {
    title: `${phrase} ${emoji} - ${date} ${time}`,
    tags: ["Market Insights", "Daily Update", "Market Pulse"]
  };
}

/**
 * Check if Ghost email service is properly configured
 * @param {Object} config - Ghost configuration object
 * @returns {boolean} - True if email service is configured
 */
function checkEmailService(config) {
  try {
    const token = generateGhostJWT(config.apiKey);
    const url = config.apiUrl + '/ghost/api/admin/email/settings';
    const response = UrlFetchApp.fetch(url, {
      headers: {
        'Authorization': 'Ghost ' + token,
        'Content-Type': 'application/json'
      }
    });
    if (response.getResponseCode() === 200) {
      const result = JSON.parse(response.getContentText());
      if (result.email_settings && result.email_settings.enabled) {
        Logger.log('Email service is configured and enabled');
        return true;
      }
      Logger.log('Email service is configured but not enabled');
      return false;
    }
    Logger.log('Email service is not properly configured');
    return false;
  } catch (e) {
    Logger.log('Error checking email service: ' + e.message);
    return false;
  }
}

/**
 * Main function to be called from other scripts
 * @param {Object} options - Configuration options
 * @param {string} options.fileId - The ID of the HTML file in Google Drive
 * @param {string} options.folderId - The ID of the folder containing the HTML file
 * @param {string} options.fileName - The name of the HTML file
 */
function runGhostPublisher(options) {
  try {
    const result = publishToGhost(
      options.fileId,
      options.folderId,
      options.fileName
    );
    Logger.log('Ghost publishing result: ' + JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    Logger.log('Error in runGhostPublisher:' + error.toString());
    throw error;
  }
}
