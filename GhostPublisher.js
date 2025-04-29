/**
 * Test function to create a draft post from the latest trading analysis HTML file in Ghost.
 * @param {Object} options - Configuration options
 * @returns {Object} - The result of the publishing operation including the draft URL and ID
 */
function testPublishLatestAnalysis(options) {
  try {
    // Get script properties
    var props = PropertiesService.getScriptProperties();
    var folderName = props.getProperty('GOOGLE_FOLDER_NAME');
    var fileName = props.getProperty('GOOGLE_FILE_NAME');
    // Find the folder by name
    var folderIterator = DriveApp.getFoldersByName(folderName);
    if (!folderIterator.hasNext()) {
      throw new Error('Folder ' + folderName + ' not found');
    }
    var folder = folderIterator.next();
    Logger.log('Searching for file: ' + fileName + ' in folder: ' + folderName);

    // Search for the file in the specified folder
    var files = folder.getFilesByName(fileName);
    if (!files.hasNext()) {
      throw new Error('File ' + fileName + ' not found in folder ' + folderName);
    }
    var file = files.next();
    Logger.log('Found file: ' + file.getName() + ' with ID: ' + file.getId());

    // Always publish (not draft) and notify
    var publishAndNotify = true;
    // Call the main publish function (now includes teaser email)
    return publishToGhost(file.getId(), folder.getId(), fileName, { draft: !publishAndNotify });
  } catch (error) {
    Logger.log('Error in testPublishLatestAnalysis:' + error.toString());
    throw error;
  }
}

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
    const props = PropertiesService.getScriptProperties();
    const ghostApiUrl = props.getProperty('GHOST_API_URL') || 'https://market-pulse-daily.ghost.io';
    const ghostAdminApiKey = props.getProperty('GHOST_ADMIN_API_KEY');
    const ghostAuthorId = props.getProperty('GHOST_AUTHOR_ID') || null;
    const debugMode = props.getProperty('DEBUG_MODE') === 'true';
    const newsletterId = props.getProperty('GHOST_NEWSLETTER_ID') || '67f427c5744a72000854ee8f';

    // Get current time in ET
    const now = new Date();
    const timeInET = Utilities.formatDate(now, props.getProperty('TIME_ZONE') || 'America/New_York', 'HH:mm');
    const [hour, minute] = timeInET.split(':');
    const currentHour = parseInt(hour);
    const currentMinute = parseInt(minute);

    // Determine content type based on time
    const isPremiumContent = currentHour < 16 || (currentHour === 16 && currentMinute < 30);

    // Set visibility and email segment
    const visibility = isPremiumContent ? "paid" : "members";
    const emailSegment = "all";

    Logger.log('Ghost API Configuration:');
    Logger.log('Raw API URL: ' + ghostApiUrl);
    Logger.log('Raw Admin API Key: ' + ghostAdminApiKey);
    Logger.log('Raw Author ID: ' + ghostAuthorId);
    Logger.log('Newsletter ID: ' + newsletterId);
    Logger.log('Content Type: ' + (isPremiumContent ? 'Premium (Paid-members only)' : 'Standard (Members only)'));
    Logger.log('Debug Mode: ' + debugMode);
    Logger.log('Email Segment: ' + emailSegment);

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
    // Extract excerpt from justification section and sanitize
    const rawExcerpt = extractJustificationExcerpt(htmlContent) || '';
    // Strip HTML tags
    const plainExcerpt = rawExcerpt.replace(/<[^>]*>/g, '');
    // Collapse whitespace and trim
    let excerpt = plainExcerpt.replace(/\s+/g, ' ').trim();
    // Truncate excerpt if too long for Ghost custom_excerpt (max ~300 chars)
    if (excerpt.length > 300) {
      excerpt = excerpt.substring(0, 300).trim();
    }
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
      status: options.draft ? "draft" : "published",
      tags: tags,
      visibility: visibility,
      custom_excerpt: excerpt,
      email_recipient_filter: emailSegment,
      send_email_when_published: !options.draft,
      newsletter_id: config.newsletterId,
      email_segment: "all",
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
    let createUrl = `${config.apiUrl}/ghost/api/admin/posts/`;
    if (config.newsletterId) {
      createUrl += `?newsletter=${config.newsletterId}`;
    }
    let createResponse, createResult;
    let attempt = 0;
    let maxAttempts = 2;
    while (attempt < maxAttempts) {
      try {
        createResponse = UrlFetchApp.fetch(createUrl, optionsObj);
        createResult = JSON.parse(createResponse.getContentText());
        break; // Success, exit loop
      } catch (e) {
        if (e && e.toString && e.toString().indexOf('503') !== -1 && attempt === 0) {
          // Random delay between 1 and 4 seconds
          var delayMs = 1000 + Math.floor(Math.random() * 3000);
          Logger.log('503 error from Ghost API. Retrying after ' + delayMs + ' ms...');
          Utilities.sleep(delayMs);
          attempt++;
        } else {
          throw e;
        }
      }
    }
    Logger.log('Ghost API create post response: ' + JSON.stringify(createResult));
    if (createResult && createResult.posts && createResult.posts[0]) {
      const post = createResult.posts[0];
      if (post.status === 'sent') {
        Logger.log('Email sent successfully to subscribers.');
      } else if (post.status === 'published') {
        Logger.log('Post published, but email may not have been sent. Check Ghost configuration.');
      } else {
        Logger.log('Post status: ' + post.status + '. Email NOT sent.');
      }
      if (post.email) {
        Logger.log('Email object: ' + JSON.stringify(post.email));
      } else {
        Logger.log('No email object present in response.');
      }
      // --- Send teaser email to all newsletter subscribers as BCC ---
      try {
        // Fetch all Ghost newsletter subscribers via Admin API
        var membersUrl = ghostApiUrl + '/ghost/api/admin/members/?limit=all&filter=subscribed:true';
        var membersResp = UrlFetchApp.fetch(membersUrl, {
          method: 'get',
          headers: { 'Authorization': 'Ghost ' + token }
        });
        var membersData = JSON.parse(membersResp.getContentText());
        var emails = [];
        if (membersData && membersData.members) {
          for (var i = 0; i < membersData.members.length; i++) {
            if (membersData.members[i].email) {
              emails.push(membersData.members[i].email);
            }
          }
        }
        var bccRecipients = emails.join(",");
        Logger.log('BCC Recipients: ' + bccRecipients);
        // Extract decision and summary for teaser email
        var decisionText = extractSectionTextById(htmlContent, 'decision') || '';
        var decisionSummary = extractSectionTextById(htmlContent, 'decision-summary') || '';

        // Use these in teaser HTML generation
        var teaserHtmlBody = generateTeaserTeaserHtml({
          decision: decisionText,
          summary: decisionSummary,
          reportUrl: (props.getProperty('GHOST_SITE_URL') || 'https://market-pulse-daily.ghost.io') + '/' + (post && post.slug ? post.slug : '') + '/',
          generatedAt: now
        });
        var subject = 'Market Pulse Daily: New Analysis Published';
        Logger.log('Teaser Email HTML Preview: ' + teaserHtmlBody);
        scriptProperties = PropertiesService.getScriptProperties();
        const debugMode = scriptProperties.getProperty('DEBUG_MODE') === 'true';
        const TEST_EMAIL = scriptProperties.getProperty('TEST_EMAIL');
        if (debugMode) {
          Logger.log("In debug mode, changing recipients to "+TEST_EMAIL)
          bccRecipients = TEST_EMAIL;
        }
        sendEmail(subject, teaserHtmlBody, bccRecipients, false, true);
        Logger.log('Teaser email sent to all newsletter subscribers (via sendEmail, BCC only): ' + bccRecipients);
        
      } catch (emailErr) {
        Logger.log('Failed to send teaser email: ' + emailErr);
      }
    }
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
  const titleRegex = /<h1[^>]*>Market Pulse Daily[^<]*<\/h1>/i;
  const timestampRegex = /<p[^>]*>As of[^<]*<\/p>/i;
  let contentWithoutTitle = html.replace(titleRegex, '');
  contentWithoutTitle = contentWithoutTitle.replace(timestampRegex, '');
  const styles = `
    <style>
      .upcoming-events h2, .upcoming-events h3, .upcoming-events .event-name, .upcoming-events .event-date { font-size: 0.8em !important; }
      .market-sentiment h2, .market-sentiment h3, .market-sentiment .sentiment-item { font-size: 0.8em !important; }
      .geopolitical-risks h2, .geopolitical-risks h3, .geopolitical-risks .risk-item { font-size: 0.8em !important; }
    </style>
  `;
  const styledHtml = `${styles}${contentWithoutTitle}`;
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
  const normalizedHtml = htmlContent.replace(/\s+/g, ' ');
  const justificationSection = normalizedHtml.match(/<div[^>]*id="justification-section"[^>]*>(.*?)<\/div>/i);
  if (justificationSection) {
    const content = justificationSection[1];
    const text = content.replace(/<h2[^>]*>Justification<\/h2>/i, '');
    const cleanText = text.replace(/<[^>]+>/g, '').trim();
    if (cleanText.length <= 300) {
      return cleanText;
    }
    // Truncate to 300 chars, avoid chopping last word
    let truncated = cleanText.substring(0, 300);
    if (/\S$/.test(truncated)) {
      // Find last space in truncated
      let lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 0) {
        truncated = truncated.substring(0, lastSpace);
      }
    }
    let result = truncated.trim() + '...';
    // Replace 4 or more dots at end with just three
    result = result.replace(/\.{4,}$/, '...');
    return result;
  }
  const byHeadingMatch = normalizedHtml.match(/<h2[^>]*>Justification<\/h2>\s*<div[^>]*>(.*?)<\/div>/i);
  if (byHeadingMatch) {
    const content = byHeadingMatch[1];
    const text = content.replace(/<h2[^>]*>Justification<\/h2>/i, '');
    const cleanText = text.replace(/<[^>]+>/g, '').trim();
    if (cleanText.length <= 300) {
      return cleanText;
    }
    // Truncate to 300 chars, avoid chopping last word
    let truncated = cleanText.substring(0, 300);
    if (/\S$/.test(truncated)) {
      // Find last space in truncated
      let lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 0) {
        truncated = truncated.substring(0, lastSpace);
      }
    }
    let result = truncated.trim() + '...';
    // Replace 4 or more dots at end with just three
    result = result.replace(/\.{4,}$/, '...');
    return result;
  }
  return "Market analysis and trading insights for today's market conditions.";
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
  var secretHex = parts[1];
  var secretBytes = hexToBytes(secretHex);
  var header = { alg: "HS256", typ: "JWT", kid: keyId };
  var now = Math.floor(Date.now() / 1000);
  var payload = { iat: now, exp: now + 300, aud: "/admin/" };
  var base64UrlEncode = function(obj) {
    return Utilities.base64EncodeWebSafe(JSON.stringify(obj)).replace(/=+$/, '');
  };
  var encodedHeader = base64UrlEncode(header);
  var encodedPayload = base64UrlEncode(payload);
  var toSign = Utilities.newBlob(encodedHeader + "." + encodedPayload).getBytes();
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
    if (byte > 127) byte -= 256;
    bytes.push(byte);
  }
  return bytes;
}

/**
 * Generates an engaging market-related title with a timestamp
 * @returns {Object} - The formatted title and tags
 */
function generateEngagingTitle() {
  const now = new Date();
  const time = Utilities.formatDate(now, Session.getScriptTimeZone(), "h:mm a z");
  const date = Utilities.formatDate(now, Session.getScriptTimeZone(), "MMMM d, yyyy");
  const marketPhrases = [
    "Market Currents","Market Pulse","Market Whisper","Market Musings","Market Rhythms",
    "Market Beats","Market Insights","Market Signals","Market Watch","Market Movements"
  ];
  const phrase = marketPhrases[Math.floor(Math.random() * marketPhrases.length)];
  const emojis = ["📊", "📈", "📉", "💰", "🔍", "🎯", "💡", "⚡", "💫", "🌟"];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
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
      options.fileName,
      options
    );
    Logger.log('Ghost publishing result: ' + JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    Logger.log('Error in runGhostPublisher:' + error.toString());
    throw error;
  }
}

/**
 * Add the new function to generate HTML from analysis JSON
 * @param {Object} analysisJson - The analysis JSON object
 * @param {Date} nextScheduledTime - The next scheduled time
 * @param {boolean} isPremium - Whether the content is premium
 * @param {string} ctaUrl - The URL for the CTA button
 * @returns {string} - The generated HTML
 */
function generateHtmlFromAnalysisJson(analysisJson, nextScheduledTime, isPremium, ctaUrl) {
  var props = PropertiesService.getScriptProperties();
  var subject = (props.getProperty('NEWSLETTER_NAME') || 'Market Pulse Daily') + ': ' + (analysisJson.decision || 'Trading Update');
  var newsletterName = props.getProperty('NEWSLETTER_NAME') || 'Market Pulse Daily';
  var analysisTime = Utilities.formatDate(new Date(), props.getProperty('TIME_ZONE') || 'America/New_York', 'MMM dd, yyyy, hh:mm a z');
  var ctaText = isPremium ? 'This report is for paid subscribers.' : '';
  var ctaButton = '<a href="' + (ctaUrl || (props.getProperty('GHOST_SITE_URL') || 'https://market-pulse-daily.ghost.io') + '/latest-report') + '" style="display:inline-block; background:#1a365d; color:#fff; font-weight:600; padding:16px 36px; border-radius:6px; font-size:1.1em; text-decoration:none; box-shadow:0 2px 8px rgba(26,54,93,0.08);">Read the Full Market Pulse Report &rarr;</a>';
  var ctaBelow = '<div style="margin-top:12px; color:#444; font-size:1em;">Unlock deeper insights and actionable trade ideas—click above to access the full analysis.'
    + (isPremium ? ' <span style="color:#c0392b; font-weight:bold;">(Paid subscription required)</span>' : '')
    + '</div>';
  var htmlBody = `
    <div style="max-width: 700px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-align: center;">${newsletterName}</h1>
      <div style="font-size: 11px; color: #666; margin-bottom: 20px; text-align: center;">Generated on ${analysisTime}</div>
      <!-- Decision/Alert Section -->
      ${analysisJson.decision ? `
      <div style="background: #fffbe7; border-radius: 10px; box-shadow: 0 3px 10px rgba(255,193,7,0.09); border: 1.5px solid #ffe082; padding: 26px 18px 22px 18px; margin-bottom: 24px; max-width: 700px; width: 100%; margin-left: auto; margin-right: auto; box-sizing: border-box;">
        <div style="display: flex; align-items: center; gap: 18px;">
          <span style="font-size: 2.1em; color: #ff9800; margin-right: 5px;">⚠️</span>
          <div style="display: flex; flex-direction: column; align-items: flex-start;">
            <span style="font-weight: bold; color: #444; font-size: 2em;">${analysisJson.decision}</span>
            <span style="margin-top: 10px; font-size: 1.18em; color: #444; text-align: left; font-weight: 500;">${analysisJson.summary || ''}</span>
          </div>
        </div>  
      </div>
      ` : ''}
      <!-- Justification Section -->
      ${analysisJson.justification ? `
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <div style="font-weight: bold; margin-bottom: 10px;">Justification</div>
        <div style="color: #333;">${analysisJson.justification}</div>
      </div>
      ` : ''}
      <div style="text-align:center; margin: 32px 0 0 0;">
        ${ctaButton}
        ${ctaBelow}
      </div>
    </div>
  `;
  return htmlBody;
}

/**
 * Add the new function to generate teaser HTML from analysis JSON
 * @param {Object} analysisJson - The analysis JSON object
 * @param {Date} nextScheduledTime - The next scheduled time
 * @param {string} ctaUrl - The URL for the CTA button
 * @returns {string} - The generated HTML
 */
function generateTeaserHtmlFromAnalysisJson(analysisJson, nextScheduledTime, ctaUrl) {
  var props = PropertiesService.getScriptProperties();
  var newsletterName = props.getProperty('NEWSLETTER_NAME') || 'Market Pulse Daily';
  var analysisTime = Utilities.formatDate(new Date(), props.getProperty('TIME_ZONE') || 'America/New_York', 'MMM dd, yyyy, hh:mm a z');
  var ctaButton = '<a href="' + (ctaUrl || (props.getProperty('GHOST_SITE_URL') || 'https://market-pulse-daily.ghost.io') + '/latest-report') + '" style="display:inline-block; background:#1a365d; color:#fff; font-weight:600; padding:16px 36px; border-radius:6px; font-size:1.1em; text-decoration:none; box-shadow:0 2px 8px rgba(26,54,93,0.08);">Read the Full Market Pulse Report &rarr;</a>';
  var ctaBelow = '<div style="margin-top:12px; color:#444; font-size:1em;">Unlock deeper insights and actionable trade ideas—click above to access the full analysis. <span style="color:#c0392b; font-weight:bold;">(Paid subscription required)</span></div>';
  var htmlBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Market Pulse Daily - Teaser</title>
    </head>
    <body style="background:#f6f8fa; margin:0; padding:0;">
      <div style="max-width: 700px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-align: center;">${newsletterName}</h1>
        <div style="font-size: 11px; color: #666; margin-bottom: 20px; text-align: center;">Generated on ${analysisTime}</div>
        <!-- Decision/Alert Section -->
        ${analysisJson.decision ? `<div style=\"background: #fffbe7; border-radius: 10px; box-shadow: 0 3px 10px rgba(255,193,7,0.09); border: 1.5px solid #ffe082; padding: 26px 18px 22px 18px; margin-bottom: 24px; max-width: 700px; width: 100%; margin-left: auto; margin-right: auto; box-sizing: border-box;\"><div style=\"display: flex; align-items: center; gap: 18px;\"><span style=\"font-size: 2.1em; color: #ff9800; margin-right: 5px;\">⚠️</span><div style=\"display: flex; flex-direction: column; align-items: flex-start;\"><span style=\"font-weight: bold; color: #444; font-size: 2em;\">${analysisJson.decision}</span><span style=\"margin-top: 10px; font-size: 1.18em; color: #444; text-align: left; font-weight: 500;\">${analysisJson.summary || ''}</span></div></div></div>` : ''}
        <!-- Justification Section -->
        ${analysisJson.justification ? `<div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;\"><div style=\"font-weight: bold; margin-bottom: 10px;\">Justification</div><div style=\"color: #333;\">${analysisJson.justification}</div></div>` : ''}
        <div style="text-align:center; margin: 32px 0 0 0;">
          ${ctaButton}
          ${ctaBelow}
        </div>
      </div>
    </body>
    </html>
  `;
  return htmlBody;
}

/**
 * Utility: Robustly extract content by id from HTML using regex
 * @param {string} html - The HTML content to extract from
 * @param {string} id - The ID of the element to extract
 * @returns {string} - The extracted content
 */
function extractSectionTextById(html, id) {
  // Match any tag with the given id, non-greedy to first closing tag
  var regex = new RegExp('<[^>]+id=["\']' + id + '["\'][^>]*>(.*?)<\/[^>]+>', 'i');
  var match = html.match(regex);
  if (match) {
    // Remove all tags inside, get plain text
    var text = match[1].replace(/<[^>]+>/g, '').trim();
    return text;
  }
  return '';
}

/**
 * Utility: Find an element by ID in the XML document
 * @param {XmlService.Element} element - The current element to search
 * @param {string} id - The ID of the element to find
 * @returns {string} - The inner HTML of the found element
 */
function findElementById(element, id) {
  var elementId = element.getAttribute('id');
  if (elementId && elementId.getValue() === id) {
    return getElementInnerHtml(element);
  }
  var children = element.getChildren();
  for (var i = 0; i < children.length; i++) {
    var result = findElementById(children[i], id);
    if (result) return result;
  }
  return null;
}

/**
 * Utility: Get the inner HTML of an XML element
 * @param {XmlService.Element} element - The element to get the inner HTML from
 * @returns {string} - The inner HTML of the element
 */
function getElementInnerHtml(element) {
  var xml = XmlService.getRawFormat().format(element);
  // Remove the root tag
  var tag = element.getName();
  var inner = xml.replace(new RegExp('^<'+tag+'[^>]*>|<\/'+tag+'>$','g'), '');
  return inner.trim();
}

/**
 * Generate teaser HTML for the teaser email
 * @param {Object} opts - Options for the teaser HTML
 * @param {string} opts.decision - The decision text
 * @param {string} opts.summary - The summary text
 * @param {string} opts.reportUrl - The URL of the report
 * @param {Date} opts.generatedAt - The date the report was generated
 * @returns {string} - The generated teaser HTML
 */
function generateTeaserTeaserHtml(opts) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Market Pulse Daily - Teaser</title>
</head>
<body style="background:#f6f8fa; margin:0; padding:0;">
  <div style="max-width: 700px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0; text-align: center;">Market Pulse Daily</h1>
    <div style="font-size: 11px; color: #666; margin-bottom: 20px; text-align: center;">Generated on ${Utilities.formatDate(opts.generatedAt || new Date(), 'America/New_York', 'MMM d, yyyy, h:mm a z')}</div>
    <!-- Decision/Alert Section -->
    <div style="text-align:center; margin: 18px 0 18px 0;">
      <span style="font-weight: bold; color: #FFA500; font-size: 1.7em;">${opts.decision}</span>
      <div style="margin-top: 8px; color: #444; font-size: 1.08em;">${opts.summary}</div>
    </div>
    <div style="text-align:center; margin: 32px 0 0 0;">
      <a href="${opts.reportUrl}" style="display:inline-block; background:#1a365d; color:#fff; font-weight:600; padding:16px 36px; border-radius:6px; font-size:1.1em; text-decoration:none; box-shadow:0 2px 8px rgba(26,54,93,0.08);">Read the Full Market Pulse Report &rarr;</a>
      <div style="margin-top:12px; color:#444; font-size:1em;">Unlock deeper insights and actionable trade ideas—click above to access the full analysis. <span style="color:#c0392b; font-weight:bold;">(Paid subscription required)</span></div>
    </div>
  </div>
</body>
</html>`;
}
