require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const readline = require('readline');
const { marketPulseToKoenig } = require('./koenig-blocks');
const fs = require('fs');
const path = require('path');

const GHOST_API_URL = process.env.GHOST_API_URL || 'https://market-pulse-daily.ghost.io';
const ADMIN_API_KEY = process.env.GHOST_ADMIN_API_KEY;
console.log('Loaded GHOST_ADMIN_API_KEY:', ADMIN_API_KEY);
const POST_ID = process.env.POST_ID;
const POST_UUID = process.env.POST_UUID;
const POST_URL = process.env.POST_URL;

if (!ADMIN_API_KEY) {
    console.error('Error: GHOST_ADMIN_API_KEY environment variable is not set.');
    process.exit(1);
}

// Helper for debug logging
function debugLog(...args) {
    if (process.env.DEBUG) {
        console.log('[DEBUG]', ...args);
    }
}

const [keyId, secret] = ADMIN_API_KEY.split(':');
if (!keyId || !secret) {
    console.error('Error: Invalid GHOST_ADMIN_API_KEY format.');
    process.exit(1);
}

// Create a JWT for Ghost Admin API
function createAdminToken() {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iat: now,
        exp: now + 5 * 60, // 5 minutes
        aud: '/v5/admin/'
    };
    return jwt.sign(payload, Buffer.from(secret, 'hex'), {
        keyid: keyId,
        algorithm: 'HS256',
        header: { kid: keyId, alg: 'HS256', typ: 'JWT' }
    });
}

const adminToken = createAdminToken();
debugLog('Admin JWT token created.');

// Create an axios instance for Ghost Admin API with JWT
const ghostApi = axios.create({
    baseURL: `${GHOST_API_URL}/ghost/api/admin/`,
    headers: {
        'Authorization': `Ghost ${adminToken}`,
        'Content-Type': 'application/json'
    }
});

// Function to list all draft posts with full details
async function listDraftPosts() {
    try {
        console.log('Fetching draft posts...');
        const response = await ghostApi.get('posts', {
            params: {
                status: 'draft',
                include: 'authors,tags',
                limit: 'all'
            }
        });
        const posts = response.data.posts || [];
        if (posts.length > 0) {
            console.log(`Found ${posts.length} draft posts:\n`);
            posts.forEach(post => {
                console.log('---------------------------');
                console.log(`Title:         ${post.title}`);
                console.log(`ID:            ${post.id}`);
                console.log(`UUID:          ${post.uuid}`);
                console.log(`Status:        ${post.status}`);
                console.log(`Slug:          ${post.slug}`);
                console.log(`Created At:    ${post.created_at}`);
                console.log(`Updated At:    ${post.updated_at}`);
                console.log(`Published At:  ${post.published_at}`);
                console.log(`URL:           ${GHOST_API_URL}/ghost/#/editor/post/${post.id}`);
                if (post.authors && post.authors.length > 0) {
                    console.log(`Authors:       ${post.authors.map(a => a.name).join(', ')}`);
                }
                if (post.tags && post.tags.length > 0) {
                    console.log(`Tags:          ${post.tags.map(tag => tag.name).join(', ')}`);
                }
                console.log(`Excerpt:       ${post.custom_excerpt || post.excerpt || ''}`);
                console.log(`HTML Length:   ${post.html ? post.html.length : 0}`);
                console.log(`Feature Image: ${post.feature_image || 'None'}`);
                console.log('---------------------------\n');
            });
            // Additionally, print details for the specific post if found
            const specificPost = posts.find(p => p.id === POST_ID || p.uuid === POST_UUID);
            if (specificPost) {
                console.log('=== Details for the target draft post ===');
                console.log(JSON.stringify(specificPost, null, 2));
                console.log(`Edit URL: ${POST_URL}`);
            } else {
                console.log('Target draft post (by POST_ID or POST_UUID) not found in drafts.');
            }
        } else {
            console.log('No draft posts found.');
        }
    } catch (err) {
        if (err.response) {
            console.error('Error fetching draft posts:', err.response.data || err.message);
        } else {
            console.error('Error fetching draft posts:', err.message);
        }
        process.exit(1);
    }
}

// Function to publish and send the post
async function publishAndSendPost() {
    try {
        // Fetch the post to get its updated_at value (required for edit)
        const response = await ghostApi.get(`posts/${POST_ID}`);
        const post = response.data.posts[0];
        if (!post) {
            console.error('Target post not found.');
            process.exit(1);
        }
        const updated_at = post.updated_at;
        // Publish and send
        console.log('Publishing and sending the post to all subscribers...');
        const publishResponse = await ghostApi.put(`posts/${POST_ID}/`, {
            posts: [{
                id: POST_ID,
                status: 'published',
                updated_at,
                email_recipient_filter: 'all',
                send_email_when_published: true
            }]
        }, {
            params: {
                // You can specify newsletter slug here if needed, e.g. newsletter: 'default-newsletter'
            }
        });
        console.log('Post published and email sent!');
        console.log('Response:', JSON.stringify(publishResponse.data, null, 2));
    } catch (err) {
        if (err.response) {
            console.error('Error publishing post:', err.response.data || err.message);
        } else {
            console.error('Error publishing post:', err.message);
        }
        process.exit(1);
    }
}

// Function to prompt for confirmation before publishing
function promptToPublish() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Do you want to publish and notify all subscribers for the target draft post? (yes/no): ', async (answer) => {
        rl.close();
        if (answer.trim().toLowerCase() === 'yes') {
            await publishAndSendPost();
        } else {
            console.log('Publish action cancelled.');
            process.exit(0);
        }
    });
}

// Load Market Pulse JSON sample
const mpSamplePath = path.join(__dirname, '../market_pulse_json/market_pulse_daily.sample.json');
const mpJson = JSON.parse(fs.readFileSync(mpSamplePath, 'utf-8'));

// Convert to Koenig JSON blocks
const koenigBlocks = marketPulseToKoenig(mpJson);

// --- Retrieve and print members currently subscribed to the newsletter ---
async function printNewsletterMembers(newsletterId) {
    try {
        // Ghost API: /members/?filter=newsletters:[newsletter_id]
        const filter = newsletterId ? `newsletters:[${newsletterId}]` : '';
        const url = `members/?filter=${encodeURIComponent(filter)}`;
        const response = await ghostApi.get(url);
        const members = response.data.members || [];
        console.log(`Members subscribed to newsletter${newsletterId ? ' ' + newsletterId : ''}:`);
        members.forEach(m => {
            console.log(`- ${m.email} (${m.name || 'No name'})`);
        });
        if (members.length === 0) console.log('(No members found)');
    } catch (err) {
        console.error('Error retrieving newsletter members:', err.response?.data || err.message);
    }
}

// --- GHOST POST PAYLOAD AND PUBLISH FUNCTION ---
async function createGhostPostFromSample() {
    // Build payload to match Apps Script
    const newsletterId = process.env.GHOST_NEWSLETTER_ID || '67f427c5744a72000854ee8f';
    const postTitle = `Market Signals \uD83D\uDD0D - April 22, 2025 2:08 PM EDT`;
    const lexicalContent = JSON.stringify({
        root: {
            type: 'root',
            version: 1,
            indent: 0,
            format: '',
            direction: null,
            children: [
                { type: 'html', html: '<p>Sample content for Node.js test post.</p>' }
            ]
        }
    });
    const postPayload = {
        title: postTitle,
        lexical: lexicalContent,
        status: 'published',
        tags: ['Market Pulse Daily'],
        visibility: 'paid',
        custom_excerpt: 'The current market environment is characterized by high volatility and extreme fear... (truncated)',
        email_recipient_filter: 'all',
        send_email_when_published: false,
        newsletter_id: newsletterId,
        email_segment: 'all',
        canonical_url: ''
    };
    const payload = { posts: [postPayload] };
    const url = `${GHOST_API_URL}/ghost/api/admin/posts/?newsletter=${newsletterId}`;
    const headers = {
        'Authorization': `Ghost ${adminToken}`,
        'Content-Type': 'application/json'
    };
    // --- DEBUG LOGGING ---
    console.log('Ghost API POST URL:', url);
    console.log('Ghost API POST Headers:', headers);
    console.log('Ghost API POST Payload:', JSON.stringify(payload));
    // --- SEND REQUEST ---
    try {
        const response = await axios.post(url, payload, { headers });
        console.log('Ghost API create post response:', JSON.stringify(response.data, null, 2));
    } catch (err) {
        if (err.response) {
            console.error('Ghost API error:', err.response.status, err.response.data);
        } else {
            console.error('Ghost API error:', err.message);
        }
    }
}

// --- MAIN LOGIC ---
async function main() {
    await createGhostPostFromSample();
}

main();
