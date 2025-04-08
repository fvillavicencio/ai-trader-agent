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
    const ghostApiUrl = props.getProperty('GHOST_API_URL');
    const ghostAdminApiKey = props.getProperty('GHOST_ADMIN_API_KEY');
    const ghostAuthorId = props.getProperty('GHOST_AUTHOR_ID');

    // Initialize Ghost Admin API
    const options = {
      'method': 'get',
      'headers': {
        'Authorization': `Ghost ${ghostAdminApiKey}`,
        'Accept': 'application/json'
      }
    };

    // Get the file content
    const file = DriveApp.getFileById(fileId);
    const content = file.getBlob().getDataAsString();
    
    // Sanitize the HTML content
    const sanitizedHtml = sanitizeHtml(content, {
      allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'ul', 'ol', 'li',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'a', 'strong', 'em', 'span',
        'div', 'img', 'pre', 'code'
      ],
      allowedAttributes: {
        a: ['href', 'target'],
        img: ['src', 'alt'],
        '*': ['class', 'style'],
        pre: ['class'],
        code: ['class']
      }
    });

    // Build the final content
    const formattedContent = `
      <div class="market-pulse-content">
          <h1>Market Pulse Daily</h1>
          <div class="last-updated">
              <p>Last updated: ${new Date(file.getLastUpdated()).toLocaleString()}</p>
          </div>
          ${sanitizedHtml}
      </div>
    `;

    // Prepare the post payload
    const title = `Market Pulse Daily: Morning Analysis - ${new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    })}`;

    const postPayload = {
      title: title,
      lexical: JSON.stringify({
        root: {
          type: 'root',
          version: 1,
          indent: 0,
          format: '',
          direction: null,
          children: [
            {
              type: 'html',
              html: formattedContent,
              version: 1
            }
          ]
        }
      }),
      status: 'published',
      tags: ['Market Analysis', 'Daily Update']
    };

    if (ghostAuthorId) {
      postPayload.authors = [ghostAuthorId];
    }

    // Check for existing post with the same title
    const existingPosts = UrlFetchApp.fetch(
      `${ghostApiUrl}/ghost/api/v5.0/posts/?filter=title:${encodeURIComponent(title)}`,
      options
    ).getContentText();

    const existingPostsData = JSON.parse(existingPosts);

    if (existingPostsData.posts && existingPostsData.posts.length > 0) {
      // Update existing post
      const postId = existingPostsData.posts[0].id;
      const updateResponse = UrlFetchApp.fetch(
        `${ghostApiUrl}/ghost/api/v5.0/posts/${postId}/`,
        {
          ...options,
          'method': 'put',
          'payload': JSON.stringify(postPayload),
          'contentType': 'application/json'
        }
      );
      
      return JSON.parse(updateResponse.getContentText());
    } else {
      // Create new post
      const createResponse = UrlFetchApp.fetch(
        `${ghostApiUrl}/ghost/api/v5.0/posts/`,
        {
          ...options,
          'method': 'post',
          'payload': JSON.stringify(postPayload),
          'contentType': 'application/json'
        }
      );
      
      return JSON.parse(createResponse.getContentText());
    }
  } catch (error) {
    Logger.log('Error in publishToGhost: ' + error.toString());
    throw error;
  }
}

/**
 * Sanitizes HTML content using a simple regex-based approach since sanitize-html is not available in GAS.
 * 
 * @param {string} html - The HTML content to sanitize
 * @param {Object} config - The sanitization configuration
 * @returns {string} - The sanitized HTML
 */
function sanitizeHtml(html, config) {
  // Remove script and style tags
  let sanitized = html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '');

  // Remove disallowed tags
  const allowedTags = config.allowedTags || [];
  sanitized = sanitized.replace(/<([\w-]+)[^>]*>/g, (match, tag) => {
    return allowedTags.includes(tag) ? match : '';
  });

  // Remove disallowed attributes
  const allowedAttributes = config.allowedAttributes || {};
  sanitized = sanitized.replace(/<([\w-]+)[^>]*>/g, (match, tag) => {
    if (!allowedTags.includes(tag)) return '';
    
    let result = `<${tag}`;
    const attrs = match.slice(match.indexOf(' '), match.length - 1);
    
    if (attrs) {
      attrs.split(' ').forEach(attr => {
        const [name, value] = attr.split('=');
        if (allowedAttributes[tag] && allowedAttributes[tag].includes(name)) {
          result += ` ${name}="${value}"`;
        }
      });
    }
    
    return result + '>';
  });

  return sanitized;
}

/**
 * Test function to locate and publish the latest trading analysis HTML file to Ghost.
 * This function uses the same logic as the Node.js script to find the file in Google Drive.
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

    // Publish the file to Ghost
    const result = publishToGhost(file.getId(), folder.getId(), fileName);
    Logger.log('Ghost publishing result:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    Logger.log('Error in testPublishLatestAnalysis:', error.toString());
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
    
    Logger.log('Ghost publishing result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    Logger.log('Error in runGhostPublisher:', error.toString());
    throw error;
  }
}
