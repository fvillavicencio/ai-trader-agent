require('dotenv').config();
const GhostAdminAPI = require('@tryghost/admin-api');
const readline = require('readline');

const api = new GhostAdminAPI({
    url: process.env.GHOST_API_URL,
    key: process.env.GHOST_ADMIN_API_KEY,
    version: 'v5.0'
});

const dummyTitle = `Test Hybrid Article - ${new Date().toLocaleString()}`;
const dummyHtml = `
    <h1>This is a Dummy Article</h1>
    <p>This article was created automatically by the hybrid Ghost publisher script.</p>
    <ul>
      <li>Supports publish & email</li>
      <li>Supports publish only</li>
      <li>Supports email only</li>
    </ul>
    <p>Current time: ${new Date().toLocaleString()}</p>
`;

function promptMode() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        console.log('\nChoose publish mode:');
        console.log('1. Publish and email (public post + send to all subscribers)');
        console.log('2. Publish only (public post, no email)');
        console.log('3. Email only (newsletter, not public on site)');
        rl.question('Enter 1, 2, or 3: ', (answer) => {
            rl.close();
            let mode;
            if (answer.trim() === '1') mode = 'publish-and-email';
            else if (answer.trim() === '2') mode = 'publish-only';
            else if (answer.trim() === '3') mode = 'email-only';
            else mode = 'publish-and-email'; // default
            resolve(mode);
        });
    });
}

async function createAndPublishArticle() {
    try {
        const mode = await promptMode();
        let postData = {
            title: dummyTitle,
            html: dummyHtml,
            status: 'draft',
            tags: ['hybrid', 'automation', 'demo'],
            visibility: 'public',
        };
        if (mode === 'email-only') {
            postData.email_only = true;
        }
        // Create the post as draft
        const post = await api.posts.add(postData, { source: 'html' });
        console.log(`Draft created: ${post.title} (ID: ${post.id})`);

        // Prepare publish options
        let editData = {
            id: post.id,
            updated_at: post.updated_at,
            status: 'published',
        };
        let options = {};
        if (mode === 'publish-and-email') {
            editData.send_email_when_published = true;
            editData.email_recipient_filter = 'all';
        } else if (mode === 'email-only') {
            editData.email_only = true;
            editData.send_email_when_published = true;
            editData.email_recipient_filter = 'all';
        }
        // Publish (or send email only)
        const published = await api.posts.edit(editData, options);
        console.log('Post published!');
        console.log('URL:', published.url);
        if (mode === 'email-only') {
            console.log('This was sent as an email newsletter only (not public on site).');
        } else if (mode === 'publish-and-email') {
            console.log('This was published and emailed to all subscribers.');
        } else if (mode === 'publish-only') {
            console.log('This was published on the site only.');
        }
    } catch (err) {
        console.error('Error creating or publishing article:', err.message || err);
        if (err.response && err.response.data) {
            console.error('Details:', JSON.stringify(err.response.data, null, 2));
        }
        process.exit(1);
    }
}

createAndPublishArticle();
