const GhostAdminAPI = require('@tryghost/admin-api');
const { google } = require('googleapis');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const TurndownService = require('turndown');
require('dotenv').config();

console.log('Environment variables:', {
    GHOST_API_URL: process.env.GHOST_API_URL,
    GHOST_ADMIN_API_KEY: process.env.GHOST_ADMIN_API_KEY,
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    GOOGLE_DRIVE_FOLDER_URL: process.env.GOOGLE_DRIVE_FOLDER_URL,
    GOOGLE_FILE_NAME: process.env.GOOGLE_FILE_NAME,
    GHOST_AUTHOR_ID: process.env.GHOST_AUTHOR_ID
});

// Initialize Google Drive API with service account credentials
const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
});

const drive = google.drive({
    version: 'v3',
    auth
});

// Initialize Ghost Admin API
const api = new GhostAdminAPI({
    url: process.env.GHOST_API_URL || 'https://market-pulse-daily.ghost.io',
    key: process.env.GHOST_ADMIN_API_KEY || 'YOUR_DEFAULT_API_KEY_HERE',
    version: 'v5.0'
});

// Initialize Turndown for HTML to Markdown conversion (if needed)
const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockLanguagePrefix: 'language-',
    bulletListMarker: '-',
    fence: '```',
    emDelimiter: '_',
    strongDelimiter: '__',
    hr: '---',
    linkStyle: 'inlined',
    linkReferenceStyle: 'full'
});

async function getLatestMarketPulseHTML() {
    try {
        // Extract folder ID from the URL
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_URL.split('/').pop();
        const fileName = process.env.GOOGLE_FILE_NAME;

        console.log('Searching for file:', fileName, 'in folder:', folderId);

        // Search for the file in the specified folder
        const files = await drive.files.list({
            q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, modifiedTime)'
        });

        if (files.data.files.length === 0) {
            throw new Error(`File ${fileName} not found in folder ${folderId}`);
        }

        const latestFile = files.data.files[0];
        console.log('Found file:', latestFile.name, 'with ID:', latestFile.id);
        
        // Get the file content
        const response = await drive.files.get({
            fileId: latestFile.id,
            alt: 'media'
        });

        const rawHtml = response.data.toString();
        console.log('File content length:', rawHtml.length);

        // Try different patterns to find the Justification section
        let justificationHtml;
        
        // Pattern 1: Direct div with class
        const justificationStart1 = rawHtml.indexOf('<div class="justification">');
        const justificationEnd1 = rawHtml.indexOf('</div>', justificationStart1);
        if (justificationStart1 !== -1 && justificationEnd1 !== -1) {
            justificationHtml = rawHtml.substring(justificationStart1, justificationEnd1 + 6);
        }

        // Pattern 2: Section with heading
        if (!justificationHtml) {
            const justificationStart2 = rawHtml.indexOf('<h2>Justification</h2>');
            if (justificationStart2 !== -1) {
                const nextSectionStart = rawHtml.indexOf('<h2>', justificationStart2 + 1);
                justificationHtml = rawHtml.substring(justificationStart2, nextSectionStart !== -1 ? nextSectionStart : rawHtml.length);
            }
        }

        // Pattern 3: Section with heading (case insensitive)
        if (!justificationHtml) {
            const justificationStart3 = rawHtml.toLowerCase().indexOf('<h2>justification</h2>');
            if (justificationStart3 !== -1) {
                const nextSectionStart = rawHtml.toLowerCase().indexOf('<h2>', justificationStart3 + 1);
                justificationHtml = rawHtml.substring(justificationStart3, nextSectionStart !== -1 ? nextSectionStart : rawHtml.length);
            }
        }

        if (!justificationHtml) {
            throw new Error('Justification section not found in HTML using any pattern');
        }

        console.log('Justification HTML length:', justificationHtml.length);

        // Sanitize the HTML content
        const sanitizedHtml = sanitizeHtml(justificationHtml, {
            allowedTags: [
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'p', 'br', 'hr',
                'ul', 'ol', 'li',
                'table', 'thead', 'tbody', 'tr', 'th', 'td',
                'a', 'strong', 'em', 'span',
                'div', 'img'
            ],
            allowedAttributes: {
                a: ['href', 'target'],
                img: ['src', 'alt'],
                '*': ['class', 'style']
            },
            transformTags: {
                'div': 'p',
                'span': 'p'
            },
            allowedSchemes: ['http', 'https', 'mailto', 'tel'],
            allowedSchemesAppliedToAttributes: ['href', 'src'],
            selfClosing: ['img', 'br', 'hr'],
            exclusiveFilter: function(frame) {
                return frame.tag === 'script' || frame.tag === 'style';
            }
        });

        console.log('Sanitized HTML length:', sanitizedHtml.length);

        // Format the content with simple HTML
        const formattedContent = `
            <p>Market Pulse Daily</p>
            <h2>Justification</h2>
            <p>${sanitizedHtml}</p>
            <p>Last updated: ${new Date(latestFile.modifiedTime).toLocaleString()}</p>
        `;

        console.log('Final content preview:', formattedContent.substring(0, 200) + '...');

        return {
            content: formattedContent,
            timestamp: latestFile.modifiedTime
        };
    } catch (error) {
        console.error('Error fetching and processing HTML content:', error);
        throw error;
    }
}

// Updated htmlToLexical returns a valid Lexical JSON structure.
// This function splits the cleaned text into paragraphs.
function htmlToLexical(html) {
    // Remove emojis and non-ASCII (optional)
    let cleanHtml = html
        .replace(/\p{Emoji}/gu, '')
        .replace(/[^\u0000-\u007F]+/g, '')
        .trim();

    // Remove HTML tags while preserving text content
    cleanHtml = cleanHtml
        .replace(/<style[^>]*>.*?<\/style>/gi, '') // Remove style tags
        .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
        .replace(/<[^>]+>/g, '') // Remove all other HTML tags
        .replace(/\s+/g, ' ') // Remove extra whitespace
        .trim();

    // Split into paragraphs based on double newlines
    const paragraphs = cleanHtml.split(/\n\s*\n/).filter(p => p.trim());

    const children = paragraphs.map(paragraph => ({
        type: "paragraph",
        version: 1,
        indent: 0,
        format: "",
        direction: null,
        children: [
            {
                type: "text",
                version: 1,
                text: paragraph.trim()
            }
        ]
    }));

    return { root: { type: "root", version: 1, indent: 0, format: "", direction: null, children } };
}

async function createMarketPulseArticle() {
    const title = `Market Pulse Daily: Morning Analysis - ${new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    })}`;
    
    try {
        // Get the latest HTML content from Google Drive
        const { content, timestamp } = await getLatestMarketPulseHTML();
        
        // Prepare the payload for creating/updating the Ghost post.
        // Conditionally include the authors field only if GHOST_AUTHOR_ID is provided.
        let postPayload = {
            title: title,
            lexical: JSON.stringify(htmlToLexical(content)),
            status: 'published',
            tags: ['Market Analysis', 'Daily Update']
        };
        if (process.env.GHOST_AUTHOR_ID) {
            postPayload.authors = [process.env.GHOST_AUTHOR_ID];
        }
        
        // Search for an existing post with the same title.
        const existingPosts = await api.posts.browse({
            filter: `title:${encodeURIComponent(title)}`
        });

        console.log('Original content:', content.substring(0, 200) + '...');

        if (existingPosts && existingPosts.posts && existingPosts.posts.length > 0) {
            // Update the existing post.
            console.log('Updating existing post...');
            const updatedPost = await api.posts.edit(existingPosts.posts[0].id, postPayload);
            await verifyAndFixContent(updatedPost.id, content);
        } else {
            // Create a new post.
            console.log('Creating new post...');
            const post = await api.posts.add(postPayload);
            await verifyAndFixContent(post.id, content);
        }
    } catch (error) {
        console.error('Error creating/updating article:', error);
    }
}

async function verifyAndFixContent(postId, originalContent) {
    const maxAttempts = 5;
    let currentContent = originalContent;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const fetchedPost = await api.posts.read({ id: postId });
        console.log(`Attempt ${attempt}: Fetched post lexical content:`, fetchedPost.lexical);
        
        if (!fetchedPost.lexical || fetchedPost.lexical === "{}") {
            console.log(`Attempt ${attempt}: Content is empty, trying to fix...`);
            currentContent = sanitizeContent(currentContent, attempt);
            await api.posts.edit(postId, {
                lexical: JSON.stringify(htmlToLexical(currentContent))
            });
            console.log(`Attempt ${attempt}: Updated post with sanitized content`);
        } else {
            console.log('Content is present! Article published successfully.');
            console.log('Final post lexical:', fetchedPost.lexical);
            return;
        }
    }
    
    console.log('Max attempts reached. Setting test message...');
    await api.posts.edit(postId, {
        lexical: JSON.stringify(htmlToLexical('Hello World!'))
    });
    const finalPost = await api.posts.read({ id: postId });
    console.log('Final verification:', finalPost.lexical);
}

function sanitizeContent(content, attempt) {
    let sanitized = content;
    switch (attempt) {
        case 2:
            sanitized = sanitized.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            break;
        case 3:
            sanitized = sanitized.replace(/[^\w\s]/g, '').trim();
            break;
        case 4:
            sanitized = sanitized.replace(/\s+/g, ' ').trim();
            break;
        case 5:
            sanitized = 'Test content: The article body is empty.';
            break;
    }
    console.log(`Sanitized content (attempt ${attempt}):`, sanitized.substring(0, 200) + '...');
    return sanitized;
}

// Run the article creation function
createMarketPulseArticle();
