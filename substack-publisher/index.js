require('dotenv').config();
const { google } = require('googleapis');
const puppeteer = require('puppeteer');
const path = require('path');

/**
 * Fetch HTML file content from Google Drive using a service account.
 * @param {string} fileId - The Google Drive file ID.
 * @returns {Promise<string>} - Resolves to the HTML content.
 */
async function fetchHtmlFromDrive(fileId) {
  console.log('Fetching HTML content from Google Drive...');
  
  // Authenticate using service account credentials
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'ai-trader-agent-26a2b921b48d.json'),
    scopes: ['[https://www.googleapis.com/auth/drive.readonly'],](https://www.googleapis.com/auth/drive.readonly'],)
  });
  
  const drive = google.drive({ version: 'v3', auth });
  
  try {
    // Get the file as a stream
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    
    return new Promise((resolve, reject) => {
      let data = '';
      res.data.on('data', (chunk) => (data += chunk));
      res.data.on('end', () => resolve(data));
      res.data.on('error', (err) => reject(err));
    });
  } catch (error) {
    console.error('Error fetching file from Google Drive:', error);
    throw error;
  }
}

/**
 * Use Puppeteer to automate logging into Substack and publishing a new post.
 * @param {string} htmlContent - The HTML content to post.
 * @param {string} postTitle - The title of the post.
 */
async function publishToSubstack(htmlContent, postTitle) {
  console.log('Starting Substack publishing process...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // Navigate to the Substack sign-in page
    await page.goto('[https://substack.com/sign-in',](https://substack.com/sign-in',) { waitUntil: 'networkidle2' });
    
    // Fill in email and submit
    await page.type('input[name="email"]', process.env.SUBSTACK_EMAIL, { delay: 100 });
    await page.click('button[type="submit"]');
    
    // Wait for the password field and then type password
    await page.waitForSelector('input[name="password"]', { visible: true });
    await page.type('input[name="password"]', process.env.SUBSTACK_PASSWORD, { delay: 100 });
    await page.click('button[type="submit"]');
    
    // Wait for the navigation to complete after login
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Navigate to the new post page
    const newPostUrl = `${process.env.SUBSTACK_PUBLICATION_URL}/dashboard?post=new`;
    await page.goto(newPostUrl, { waitUntil: 'networkidle2' });

    // Wait for the rich-text editor
    await page.waitForSelector('div[contenteditable="true"]', { visible: true });

    // Fill in the title
    if (postTitle) {
      await page.type('input[name="title"]', postTitle, { delay: 100 });
    }

    // Set the HTML content inside the editor
    await page.evaluate((html) => {
      const editor = document.querySelector('div[contenteditable="true"]');
      if (editor) {
        editor.innerHTML = html;
      }
    }, htmlContent);

    // Wait briefly for the content to settle
    await page.waitForTimeout(1000);

    // Attempt to click the "Publish" button
    const [publishButton] = await page.$x("//button[contains(., 'Publish')]");
    if (publishButton) {
      await publishButton.click();
    } else {
      console.error("Publish button not found.");
      await browser.close();
      return;
    }

    // Wait for the publish action to complete
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log("Post published successfully!");
  } catch (error) {
    console.error("Error during publishing:", error);
  } finally {
    await browser.close();
  }
}

/**
 * Main function: fetch HTML from Drive and publish it to Substack.
 */
async function main() {
  const fileId = process.env.GDRIVE_FILE_ID;
  const postTitle = process.env.POST_TITLE || "Automated Post";
  
  try {
    console.log(`Fetching HTML content from Google Drive file: ${fileId}`);
    const htmlContent = await fetchHtmlFromDrive(fileId);
    console.log("Fetched HTML content successfully.");
    
    console.log(`Publishing post titled: "${postTitle}"`);
    await publishToSubstack(htmlContent, postTitle);
  } catch (error) {
    console.error("Error in main process:", error);
    process.exit(1);
  }
}

// Run the main function
main();  