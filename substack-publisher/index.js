import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env') });
import { google } from 'googleapis';
import axios from 'axios';
import clipboardy from 'clipboardy';
import { exec } from 'child_process';

// Configure RapidAPI headers
const rapidApiHeaders = {
    'x-rapidapi-host': 'substack-live.p.rapidapi.com',
    'x-rapidapi-key': process.env.RAPID_API_KEY
};

// Validate environment variables
if (!process.env.GOOGLE_DRIVE_FOLDER_URL) {
    console.error('Error: GOOGLE_DRIVE_FOLDER_URL not set in .env');
    process.exit(1);
}

if (!process.env.GOOGLE_FILE_NAME) {
    console.error('Error: GOOGLE_FILE_NAME not set in .env');
    process.exit(1);
}

if (!process.env.SUBSTACK_EMAIL) {
    console.error('Error: SUBSTACK_EMAIL not set in .env');
    process.exit(1);
}

if (!process.env.SUBSTACK_PASSWORD) {
    console.error('Error: SUBSTACK_PASSWORD not set in .env');
    process.exit(1);
}

if (!process.env.SUBSTACK_PUBLICATION_URL) {
    console.error('Error: SUBSTACK_PUBLICATION_URL not set in .env');
    process.exit(1);
}

if (!process.env.RAPID_API_KEY) {
    console.error('Error: RAPID_API_KEY not set in .env');
    process.exit(1);
}

/**
 * Fetch HTML file content from Google Drive using a service account.
 * @returns {Promise<string>} - Resolves to the HTML content.
 */
async function fetchHtmlFromGoogleDrive() {
    try {
        console.log('Fetching HTML content from Google Drive...');
        
        // Initialize Google Drive API client
        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS),
            scopes: ['https://www.googleapis.com/auth/drive.readonly']
        });

        const drive = google.drive({
            version: 'v3',
            auth
        });

        // Get the HTML file from Google Drive
        const folderUrl = process.env.GOOGLE_DRIVE_FOLDER_URL;
        const fileName = process.env.GOOGLE_FILE_NAME;

        // Extract folder ID from URL
        const folderId = folderUrl.split('/').find(id => id.length === 33);
        if (!folderId) {
            throw new Error('Could not extract folder ID from URL');
        }

        // Search for the file
        const files = await drive.files.list({
            q: `name = '${fileName}' and '${folderId}' in parents and mimeType = 'text/html'`,
            fields: 'files(id, name)'
        });

        if (!files.data.files || files.data.files.length === 0) {
            throw new Error(`File ${fileName} not found in Google Drive`);
        }

        const fileId = files.data.files[0].id;
        console.log(`Found file: ${fileName} (ID: ${fileId})`);

        // Download the file
        const response = await drive.files.get({
            fileId,
            alt: 'media'
        });

        const htmlContent = response.data;
        console.log('Fetched HTML content successfully.');
        return htmlContent;
    } catch (error) {
        console.error('Error fetching HTML from Google Drive:', error);
        throw error;
    }
}

/**
 * Copy HTML content to clipboard for Substack.
 * @param {string} htmlContent - The HTML content to copy.
 * @param {string} postTitle - The title of the post.
 */
async function copyToClipboard(htmlContent, postTitle) {
    try {
        console.log('Starting clipboard copy process...');
        
        // Copy HTML content to clipboard
        await clipboardy.write(htmlContent);

        console.log('HTML content copied to clipboard!');
        console.log('Now you can paste it into Substack editor.');
        
        // Open Substack in browser
        const substackUrl = process.env.SUBSTACK_PUBLICATION_URL;
        if (substackUrl) {
            console.log('Opening Substack editor...');
            const editorUrl = `${substackUrl}/publish/post?type=newsletter&back=%2Fpublish%2Fposts`;
            await openUrlInBrowser(editorUrl);
        }
    } catch (error) {
        console.error('Error during clipboard copy:', error);
        throw error;
    }
}

/**
 * Open URL in default browser.
 * @param {string} url - The URL to open.
 */
async function openUrlInBrowser(url) {
    try {
        const platform = process.platform;
        
        let command;
        if (platform === 'darwin') {
            command = `open "${url}"`;
        } else if (platform === 'win32') {
            command = `start "" "${url}"`;
        } else {
            command = `xdg-open "${url}"`;
        }
        
        await new Promise((resolve, reject) => {
            exec(command, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    } catch (error) {
        console.error('Error opening browser:', error);
        throw error;
    }
}

async function main() {
    try {
        console.log('Fetching HTML content from Google Drive...');
        const htmlContent = await fetchHtmlFromGoogleDrive();
        console.log('Fetched HTML content successfully.');
        
        const postTitle = process.env.POST_TITLE || 'Market Pulse Daily';
        console.log(`Publishing post titled: "${postTitle}"`);
        
        // Copy content to clipboard instead of using API
        await copyToClipboard(htmlContent, postTitle);
        
        console.log('Process completed successfully!');
        console.log('1. Opened Substack editor');
        console.log('2. HTML content copied to clipboard');
        console.log('3. Paste the content into Substack editor');
        console.log('4. Add title and any additional text');
        console.log('5. Preview and publish');
    } catch (error) {
        console.error('Error in main process:', error);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Error in main:', error);
    process.exit(1);
});