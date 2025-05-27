require('dotenv').config();
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { chromium } = require('playwright');
const UserAgent = require('user-agents');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const EMAIL_USERNAME = process.env.EMAIL_USERNAME;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const GHOST_URL = process.env.GHOST_API_URL;
const GHOST_EDITOR_EMAIL = process.env.GHOST_EDITOR_EMAIL;
const GHOST_EDITOR_PASSWORD = process.env.GHOST_EDITOR_PASSWORD;
const POST_URL = process.env.POST_URL;
const POST_TITLE = process.env.POST_TITLE;
const GHOST_ADMIN_API_KEY = process.env.GHOST_ADMIN_API_KEY;
const POST_ID = process.env.POST_ID;

function log(msg) { console.log(`[Ghost Publisher] ${msg}`); }

function extractCodeFromSubject(subject) {
    // e.g. "060095 is your Ghost sign in verification code"
    const match = subject.match(/^(\d{6,7}) is your Ghost sign in verification code$/);
    return match ? match[1] : null;
}

function searchGhostCodeEmail(loginSubmittedAt) {
    return new Promise((resolve, reject) => {
        const imap = new Imap({
            user: EMAIL_USERNAME,
            password: EMAIL_PASSWORD,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false }
        });
        function openInbox(cb) { imap.openBox('INBOX', false, cb); }
        imap.once('ready', function() {
            openInbox(function(err, box) {
                if (err) return reject(err);
                imap.search([
                    'UNSEEN',
                    ['HEADER', 'SUBJECT', 'is your Ghost sign in verification code']
                ], function(err, results) {
                    if (err) return reject(err);
                    if (!results || results.length === 0) {
                        log('No matching unread code emails found.');
                        imap.end();
                        return resolve(null);
                    }
                    const f = imap.fetch(results, { bodies: 'HEADER.FIELDS (SUBJECT DATE)', struct: true });
                    let foundCode = null;
                    let foundUid = null;
                    let parsingPromises = [];
                    f.on('message', function(msg, seqno) {
                        msg.on('attributes', function(attrs) {
                            foundUid = attrs.uid;
                        });
                        msg.on('body', function(stream) {
                            const parsePromise = new Promise((resolveParse) => {
                                simpleParser(stream, (err, parsed) => {
                                    if (err) return resolveParse();
                                    const subject = parsed.subject;
                                    const emailDate = parsed.date;
                                    log(`Found email: Subject="${subject}" Date="${emailDate}"`);
                                    const code = extractCodeFromSubject(subject);
                                    if (code && !foundCode) {
                                        // Only accept if emailDate > loginSubmittedAt - 10s and emailDate < loginSubmittedAt + 2min
                                        const windowStart = loginSubmittedAt - 10000; // 10 seconds before login
                                        const windowEnd = loginSubmittedAt + 2 * 60 * 1000; // 2 minutes after login
                                        if (emailDate.getTime() >= windowStart && emailDate.getTime() <= windowEnd) {
                                            log(`Extracted code: ${code}`);
                                            foundCode = code;
                                        } else {
                                            log('Subject did not match expected time window.');
                                        }
                                    } else {
                                        log('Subject did not match expected pattern.');
                                    }
                                    resolveParse();
                                });
                            });
                            parsingPromises.push(parsePromise);
                        });
                    });
                    f.once('end', async function() {
                        await Promise.all(parsingPromises);
                        if (foundCode && foundUid) {
                            // Move the email to Gmail Trash
                            imap.copy(foundUid, '[Gmail]/Trash', function(copyErr) {
                                if (copyErr) {
                                    log('Failed to copy email to Trash: ' + copyErr.message);
                                    imap.end();
                                    return resolve(foundCode);
                                }
                                // Mark as deleted in INBOX and expunge
                                imap.addFlags(foundUid, ['\\Deleted'], function(flagErr) {
                                    if (flagErr) log('Failed to mark email as deleted: ' + flagErr.message);
                                    else log('Marked email as deleted in INBOX.');
                                    imap.expunge(() => {
                                        log('Expunged deleted email from INBOX.');
                                        imap.end();
                                        resolve(foundCode);
                                    });
                                });
                            });
                        } else {
                            imap.end();
                            log('FAILED to extract code.');
                            resolve(null);
                        }
                    });
                });
            });
        });
        imap.once('error', function(err) {
            reject(err);
        });
        imap.connect();
    });
}

async function pollForGhostCode(loginSubmittedAt, maxAttempts = 30, delayMs = 3000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const code = await searchGhostCodeEmail(loginSubmittedAt);
        if (code) return code;
        log(`Attempt ${attempt}: No code found, waiting ${delayMs / 1000} seconds...`);
        await new Promise(res => setTimeout(res, delayMs));
    }
    return null;
}

(async () => {
    log('Starting Ghost login and publish automation...');
    log('Launching Playwright browser with human-like settings...');

    // --- HUMANIZATION SETTINGS ---
    // Generate a random user agent
    const userAgent = new UserAgent();
    // Randomize viewport
    const viewport = {
        width: 1280 + Math.floor(Math.random() * 400),
        height: 720 + Math.floor(Math.random() * 300)
    };

    log(`[Humanize] Using user-agent: ${userAgent.toString()}`);
    log(`[Humanize] Using viewport: ${viewport.width}x${viewport.height}`);

    // Launch browser with human-like settings
    const browser = await chromium.launch({ headless: false, slowMo: 50 });
    const context = await browser.newContext({
        userAgent: userAgent.toString(),
        viewport,
        locale: 'en-US',
        timezoneId: 'America/New_York',
        geolocation: { longitude: -74.006, latitude: 40.7128 },
        permissions: ['geolocation'],
    });
    const page = await context.newPage();

    // Step 1: Go to Ghost sign-in page
    log('Navigating to Ghost sign-in page...');
    await page.goto(`${GHOST_URL}/ghost/#/signin`, { waitUntil: 'domcontentloaded' });

    // Step 2: Fill in credentials and submit
    log('Filling in email and password...');
    await page.fill('input[name="identification"]', GHOST_EDITOR_EMAIL);
    await page.waitForTimeout(500 + Math.random() * 1000); // Human-like pause
    await page.fill('input[name="password"]', GHOST_EDITOR_PASSWORD);
    await page.waitForTimeout(500 + Math.random() * 1000); // Human-like pause
    log('Submitting login form...');
    await page.click('button.login');

    // Step 3: Wait for code input
    log('Waiting for code input field to appear (input[type="text"])...');
    await page.waitForSelector('input[type="text"]', { timeout: 60000 });
    log('Code input field detected. Now polling Gmail for verification code...');

    // Step 4: Poll Gmail for the code (while browser is waiting)
    // Use current time as loginSubmittedAt for code freshness filtering
    const loginSubmittedAt = Date.now();
    const code = await pollForGhostCode(loginSubmittedAt);
    if (!code) {
        log('ERROR: Timed out waiting for Ghost verification code email.');
        await browser.close();
        process.exit(1);
    }
    log(`*** Retrieved verification code: ${code} ***`);
    log('Entering verification code...');
    await page.fill('input[type="text"]', code);
    log('Submitting verification code...');
    await page.click('button.login');

    log(`After code entry, current URL: ${page.url()}`);

    // Take a screenshot and save page HTML for debugging
    await page.screenshot({ path: 'ghost_post_code_entry.png', fullPage: true });
    const htmlContent = await page.content();
    const fs = require('fs');
    fs.writeFileSync('ghost_post_code_entry.html', htmlContent);
    log('Saved screenshot and HTML after code entry.');

    // Check for error or retry prompts
    const errorMsg = await page.$('text=/try again|invalid|error|expired|resend/i');
    if (errorMsg) {
        log('ERROR: Detected error or retry prompt after code entry. Attempting to click retry/resend if possible.');
        const retryBtn = await page.$('button:has-text("Try again"), button:has-text("Resend")');
        if (retryBtn) {
            await retryBtn.click();
            log('Clicked retry/resend button.');
        }
        // Wait a bit to see if UI changes
        await page.waitForTimeout(5000);
    }

    // If still on verify page, try reloading
    if (page.url().includes('/signin/verify')) {
        log('Still on verification page. Reloading to try to advance...');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
    }

    // Wait for dashboard/sidebar or posts nav (be robust)
    log('Waiting for dashboard/sidebar or posts nav to confirm login...');
    try {
        await page.waitForSelector('nav.gh-nav, a[title="Posts"], .gh-nav-list-new-posts', { timeout: 90000 });
        log('Login successful! Navigating to draft post editor...');
    } catch (e) {
        log('ERROR: Timed out waiting for dashboard or posts navigation. See ghost_post_code_entry.png and ghost_post_code_entry.html for debugging.');
        process.exit(1);
    }

    // Navigate directly to the draft post editor
    const draftUrl = process.env.POST_URL.replace(/"/g, '');
    await page.goto(draftUrl, { waitUntil: 'networkidle' });
    log(`[Ghost Publisher] Arrived at draft editor: ${draftUrl}`);

    // --- ADVANCED PUBLISH FLOW ---
    // 1. Click top-right "Publish" button in editor
    log('[Ghost Publisher] Clicking top-right Publish button...');
    await page.waitForSelector('button[data-test-button="publish-flow"]', { timeout: 20000 });
    await page.click('button[data-test-button="publish-flow"]');
    await page.waitForTimeout(1000);

    // 2. Wait for the publish dialog and click the green publish button
    log('[Ghost Publisher] Waiting for "Publish & send, right now" button...');
    try {
        await page.waitForSelector('button:has-text("Publish & send, right now")', { timeout: 20000 });
        const publishNowBtn = await page.$('button:has-text("Publish & send, right now")');
        if (publishNowBtn) {
            log('[Ghost Publisher] Clicking "Publish & send, right now"...');
            await publishNowBtn.click();
            await page.waitForTimeout(2000);
            log('[Ghost Publisher] Post published successfully!');
            await page.screenshot({ path: 'ghost_publish_success.png', fullPage: true });
        } else {
            log('[Ghost Publisher] ERROR: Could not find the "Publish & send, right now" button.');
            const allButtons = await page.$$eval('button', btns => btns.map(b => b.innerText));
            log('[Ghost Publisher] Visible buttons: ' + JSON.stringify(allButtons));
            await page.screenshot({ path: 'ghost_publish_button_error.png', fullPage: true });
            process.exit(1);
        }
    } catch (e) {
        log('[Ghost Publisher] ERROR: Timed out waiting for "Publish & send, right now" button.');
        await page.screenshot({ path: 'ghost_publish_dialog_error.png', fullPage: true });
        process.exit(1);
    }

    // 3. Verify with Ghost Admin API
    log('[Ghost Publisher] Verifying publish status via Ghost Admin API...');
    const apiUrl = process.env.GHOST_API_URL.replace(/"/g, '');
    const adminApiKey = process.env.GHOST_ADMIN_API_KEY;
    const postId = process.env.POST_ID;
    const [id, secret] = adminApiKey.split(':');
    const token = jwt.sign({}, Buffer.from(secret, 'hex'), {
        keyid: id,
        algorithm: 'HS256',
        expiresIn: '5m',
        audience: `/admin/`
    });
    try {
        const resp = await axios.get(`${apiUrl}/ghost/api/v3/admin/posts/${postId}/`, {
            headers: { Authorization: `Ghost ${token}` },
        });
        const post = resp.data.posts && resp.data.posts[0];
        if (post && post.status === 'published') {
            log(`[Ghost Publisher] SUCCESS: Article ${postId} is published!`);
        } else {
            log(`[Ghost Publisher] ERROR: Article ${postId} is NOT published. Status: ${post && post.status}`);
        }
    } catch (err) {
        log(`[Ghost Publisher] ERROR: Failed to verify post status via Ghost API: ${err}`);
    }

    await browser.close();
    log('[Ghost Publisher] Automation complete.');
})();
