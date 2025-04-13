/**
 * Publishes an HTML file from Google Drive to Ghost CMS.
 * 
 * @param {string} fileId - The ID of the HTML file in Google Drive
 * @param {string} folderId - The ID of the folder containing the HTML file
 * @param {string} fileName - The name of the HTML file
 * @returns {Object} - The response from Ghost API
 */
function publishToGhost(fileId, folderId, fileName) {
    try {
        // Get script properties
        const props = PropertiesService.getScriptProperties();
        const ghostApiUrl = props.getProperty('GHOST_API_URL') || 'https://market-pulse-daily.ghost.io';
        const ghostAdminApiKey = props.getProperty('GHOST_ADMIN_API_KEY') || '67f553a7f41c9900013e1fbe:36fe3da206f1ebb61643868fffca951da8ce9571521c1e8f853aadffe2f56e2e';
        const ghostAuthorId = props.getProperty('GHOST_AUTHOR_ID') || null;
        
        // Get current time in ET
        const now = new Date();
        const timeInET = Utilities.formatDate(now, TIME_ZONE, 'HH:mm');
        const [hour, minute] = timeInET.split(':');
        const currentHour = parseInt(hour);
        const currentMinute = parseInt(minute);

        // Determine content type based on time
        const isPremiumContent = currentHour < 16 || (currentHour === 16 && currentMinute < 30);

        // Set visibility and email segment based on content type
        const visibility = isPremiumContent ? "paid" : "members";
        const emailSegment = isPremiumContent ? "paid" : "all";

        // Log configuration
        Logger.log('Ghost API Configuration:');
        Logger.log('Raw API URL: ' + ghostApiUrl);
        Logger.log('Raw Admin API Key: ' + ghostAdminApiKey);
        Logger.log('Raw Author ID: ' + ghostAuthorId);
        Logger.log('Content Type: ' + (isPremiumContent ? 'Premium (Paid-members only)' : 'Standard (Members only)'));
        Logger.log('Debug Mode: ' + debugMode);
        Logger.log('Email Segment: ' + emailSegment);

        // Set configuration
        const config = {
          apiUrl: ghostApiUrl,
          apiKey: ghostAdminApiKey,
          authorId: ghostAuthorId
        };

        // Get the HTML content from the file
        const file = DriveApp.getFileById(fileId);
        const htmlContent = file.getBlob().getDataAsString();
        
        // Format the content for Ghost
        const formattedContent = formatContentForGhost(htmlContent);
        
        // Generate title and tags
        const { title, tags } = generateEngagingTitle();
        
        // Extract the Justification section for the excerpt
        const excerpt = extractJustificationExcerpt(htmlContent);
        
        // Build the post payload
        const postPayload = {
          title: title,
          lexical: JSON.stringify(formattedContent),
          status: debugMode ? "draft" : "published",
          tags: tags,
          visibility: visibility,
          excerpt: excerpt,
          email_segment: emailSegment,
          email_only: false,
          canonical_url: "",
          email_recipient_filter: "all", // Force email to all members
          send_email_when_published: true // Explicit email flag
        };

        if (config.authorId) {
          postPayload.authors = [config.authorId];
        }

        // Log the payload (for debugging)
        if (debugMode) {
          Logger.log('Post Payload: ' + JSON.stringify(postPayload, null, 2));
        }

        // Generate JWT token
        const token = generateGhostJWT(config.apiKey);
        if (debugMode) {
          Logger.log('Generated JWT: ' + token);
        }

        // Set up the request options
        const options = {
          method: 'post',
          headers: {
            'Authorization': 'Ghost ' + token,
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify({ posts: [postPayload] })
        };

        // In debug mode, create a draft in Ghost admin interface
        if (debugMode) {
          Logger.log('Debug mode enabled - creating draft post');
          const draftUrl = config.apiUrl + '/ghost/api/admin/posts/';
          const draftResponse = UrlFetchApp.fetch(draftUrl, options);
          Logger.log('Draft response status code: ' + draftResponse.getResponseCode());
          const draftResult = JSON.parse(draftResponse.getContentText());
          Logger.log('Draft result: ' + JSON.stringify(draftResult, null, 2));
          return {
            status: 'draft',
            message: 'Draft post created in Ghost admin interface',
            draftId: draftResult.posts[0]?.id
          };
        }

        // Continue with regular publishing
        // Search for existing post with the same title
        const searchUrl = config.apiUrl + '/ghost/api/admin/posts/';
        const searchResponse = UrlFetchApp.fetch(searchUrl, {
          headers: {
            'Authorization': 'Ghost ' + token
          }
        });

        let existingPostId = null;
        if (searchResponse.getResponseCode() === 200) {
          const searchResult = JSON.parse(searchResponse.getContentText());
          if (searchResult.posts) {
            existingPostId = searchResult.posts.find(post => post.title === title)?.id;
            if (existingPostId) {
              Logger.log('Found existing post with ID: ' + existingPostId);
            }
          }
        }

        if (existingPostId) {
          // Update existing post
          const updateUrl = config.apiUrl + '/ghost/api/admin/posts/' + existingPostId + '?source=html&send_email_when_published=true';
          const updateResponse = UrlFetchApp.fetch(updateUrl, {
            method: 'put',
            headers: {
              'Authorization': 'Ghost ' + token,
              'Content-Type': 'application/json'
            },
            payload: JSON.stringify({ posts: [postPayload] })
          });

          Logger.log('Update response status code: ' + updateResponse.getResponseCode());
          const updateResult = JSON.parse(updateResponse.getContentText());
          Logger.log('Update result: ' + JSON.stringify(updateResult, null, 2));

          // Log email queue information
          if (!debugMode && (updateResult.posts[0]?.status === 'published')) {
            Logger.log(`Check Ghost dashboard to verify email queue:
            ${config.apiUrl}/ghost/#/settings/newsletters`);
            Logger.log('Allow 5-10 minutes for email delivery');
          }

          return {
            status: 'updated',
            message: 'Post updated successfully',
            postId: existingPostId
          };
        }

        // Create new post
        const createUrl = config.apiUrl + '/ghost/api/admin/posts/?source=html&send_email_when_published=true';
        const createResponse = UrlFetchApp.fetch(createUrl, options);
        Logger.log('Create response status code: ' + createResponse.getResponseCode());
        const createResult = JSON.parse(createResponse.getContentText());
        Logger.log('Create result: ' + JSON.stringify(createResult, null, 2));

        // Log email queue information
        if (!debugMode && (createResult.posts[0]?.status === 'published')) {
          Logger.log(`Check Ghost dashboard to verify email queue:
          ${config.apiUrl}/ghost/#/settings/newsletters`);
          Logger.log('Allow 5-10 minutes for email delivery');
        }

        return {
          status: 'published',
          message: 'Post created successfully',
          postId: createResult.posts[0]?.id
        };
      } catch (error) {
        Logger.log('Error in publishToGhost: ' + error.toString());
        throw error;
      }
    }

    /**
     * Converts a hex string to a byte array with proper handling for signed 8-bit values
     * @param {string} hex - The hex string to convert
     * @returns {number[]} Array of bytes
     */
    function hexToBytes(hex) {
      var bytes = [];
      for (var i = 0; i < hex.length; i += 2) {
        var byte = parseInt(hex.substr(i, 2), 16);
        if (byte > 127) byte -= 256;  // interpret as signed 8-bit (two’s complement)
        bytes.push(byte);
      }
      return bytes;
    }

    /**
     * Generates a valid JWT token for Ghost Admin API requests.
     * @param {string} adminApiKey - The Ghost Admin API key in format "id:secret"
     * @returns {string} The JWT token
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
     * Formats the content for Ghost.
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
     * Generates an engaging market-related title with a timestamp
     * @returns {string} The formatted title
     */
    function generateEngagingTitle() {
      const now = new Date();
      const time = Utilities.formatDate(now, Session.getScriptTimeZone(), "h:mm a z");
      const date = Utilities.formatDate(now, Session.getScriptTimeZone(), "MMMM d, yyyy");
      
      // Array of engaging market phrases
      const marketPhrases = [
        "Market Currents",
        "Market Pulse",
        "Market Whisper",
        "Market Musings",
        "Market Rhythms",
        "Market Beats",
        "Market Insights",
        "Market Signals",
        "Market Watch",
        "Market Movements"
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
     * Extracts the Justification section from the HTML content to use as the excerpt
     * @param {string} htmlContent - The HTML content to extract from
     * @returns {string} - The extracted justification text
     */
    function extractJustificationExcerpt(htmlContent) {
      try {
        // Find the Justification section using a more flexible pattern
        const startPattern = /<div class="section">\s*<h2>Justification<\/h2>\s*<div[^>]*>/;
        const endPattern = /<\/div>/;
        
        const match = startPattern.exec(htmlContent);
        if (!match) {
          return '';
        }
        
        const contentStart = match[0].length;
        const contentEnd = htmlContent.indexOf('</div>', contentStart);
        
        if (contentEnd === -1) {
          return '';
        }
        
        // Extract and clean the content
        let content = htmlContent.substring(contentStart, contentEnd);
        
        // Remove HTML tags and extra whitespace
        content = content.replace(/<[^>]+>/g, ''); // Remove HTML tags
        content = content.replace(/\s+/g, ' ').trim(); // Normalize whitespace
        
        // Limit to 300 characters
        Logger.log('Excerpt created:\n' + content);
        return content.substring(0, 300) + (content.length > 300 ? '...' : '');
      } catch (e) {
        Logger.log('Error extracting justification excerpt: ' + e.message);
        return '';
      }
    }

    /**
     * Check if Ghost email service is properly configured
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
     * Test function to locate and publish the latest trading analysis HTML file to Ghost.
     */
    function testPublishLatestAnalysis() {
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

        // Publish the file to Ghost directly
        const result = publishToGhost(file.getId(), folder.getId(), fileName);
        Logger.log('Ghost publishing result: ' + JSON.stringify(result, null, 2));
        
        return result;
      } catch (error) {
        Logger.log('Error in testPublishLatestAnalysis:' + error.toString());
        throw error;
      }
    }

    /**
     * Main function to be called from other scripts
     * 
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
