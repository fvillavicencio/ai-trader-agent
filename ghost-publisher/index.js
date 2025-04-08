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

        // Sanitize the HTML content while preserving structure
        const sanitizedHtml = sanitizeHtml(rawHtml, {
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
            },
            // Preserve formatting
            keepAttributes: true,
            keepClassNames: true
        });

        console.log('Sanitized HTML length:', sanitizedHtml.length);

        // Format the content with proper structure
        const formattedContent = `
            <div class="market-pulse-content">
                <h1>Market Pulse Daily</h1>
                <div class="last-updated">
                    <p>Last updated: ${new Date(latestFile.modifiedTime).toLocaleString()}</p>
                </div>
                ${sanitizedHtml}
            </div>
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

// Updated htmlToLexical to handle complex HTML structure
function htmlToLexical(html) {
    // Clean the HTML content; adjust sanitization as needed.
    let cleanHtml = html
        .replace(/\p{Emoji}/gu, '') // Remove emojis
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .trim();

    // Parse the HTML into a proper Lexical structure
    const root = {
        type: 'root',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: []
    };

    // Split content into sections based on heading levels
    const sections = cleanHtml.split(/(<h[1-6][^>]*>.*?<\/h[1-6]>)|(<hr[^>]*>)/).filter(p => p.trim());
    
    sections.forEach(section => {
        // Check if this is a heading
        const headingMatch = section.match(/<h([1-6])[^>]*>(.*?)<\/h\1>/);
        if (headingMatch) {
            const level = parseInt(headingMatch[1]);
            const headingText = headingMatch[2];
            
            root.children.push({
                type: `heading_${level}`,
                version: 1,
                indent: 0,
                format: '',
                direction: null,
                children: [
                    {
                        type: "text",
                        version: 1,
                        text: headingText.trim()
                    }
                ]
            });
        } else {
            // Process regular content
            const paragraphs = section.split(/\n\s*\n/).filter(p => p.trim());
            paragraphs.forEach(paragraph => {
                const textContent = paragraph
                    .replace(/<[^>]+>/g, '') // Remove HTML tags
                    .replace(/\s+/g, ' ') // Remove extra whitespace
                    .trim();

                if (textContent) {
                    root.children.push({
                        type: "paragraph",
                        version: 1,
                        indent: 0,
                        format: "",
                        direction: null,
                        children: [
                            {
                                type: "text",
                                version: 1,
                                text: textContent
                            }
                        ]
                    });
                }
            });
        }
    });

    return { root: root };
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
