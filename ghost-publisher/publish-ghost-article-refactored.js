#!/usr/bin/env node
'use strict';

const axios = require('axios');

// Configuration: Prefer environment variables to hardcoded values.
const GHOST_ADMIN_API_BASE_URL = process.env.GHOST_ADMIN_API_BASE_URL || 'https://market-pulse-daily.ghost.io/ghost/api/v5/admin/';
const EDITOR_TOKEN = process.env.GHOST_EDITOR_TOKEN || '67f553a7f41c9900013e1fbe:36fe3da206f1ebb61643868fffca951da8ce9571521c1e8f853aadffe2f56e2e';
let POST_ID = process.env.GHOST_POST_ID;
const NEWSLETTER_ID = process.env.GHOST_NEWSLETTER_ID || '67f427c5744a72000854ee8f';

if (!EDITOR_TOKEN) {
    console.error('Error: GHOST_EDITOR_TOKEN environment variable is not set.');
    process.exit(1);
}

// If no POST_ID is provided, we'll create a new draft
if (!POST_ID) {
    console.log('No POST_ID provided. Will create a new draft post.');
}

// Create an Axios instance for the Ghost Admin API.
const adminApi = axios.create({
    baseURL: GHOST_ADMIN_API_BASE_URL,
    headers: {
        'Authorization': `Ghost ${EDITOR_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

// Function to fetch the current post status
const createDraft = async () => {
    try {
        console.log('Creating draft post...');
        const response = await adminApi.post('posts', {
            posts: [{
                title: 'Test Article - ' + new Date().toISOString(),
                html: '<p>This is a test article created via the Ghost API.</p>',
                status: 'draft',
                visibility: 'members',
                email_recipient_filter: 'all',
                send_email_when_published: true,
                newsletter_id: NEWSLETTER_ID,
                canonical_url: ''
            }]
        });
        if (response.data.posts && response.data.posts.length) {
            POST_ID = response.data.posts[0].id;
            console.log('Draft created successfully. Post ID:', POST_ID);
            return response.data.posts[0];
        }
        throw new Error('Failed to create draft');
    } catch (err) {
        console.error('Error creating draft:', err.response?.data || err.message);
        throw err;
    }
};

// Function to publish the post and trigger email notifications
const publishPost = async () => {
    try {
        console.log('Publishing post and triggering email notifications...');
        const response = await adminApi.put(`posts/${POST_ID}?newsletter=${NEWSLETTER_ID}&email_segment=all`, {
            posts: [{
                status: 'published',
                updated_at: new Date().toISOString(),
                email_recipient_filter: 'all',
                send_email_when_published: true
            }]
        });
        if (response.data.posts && response.data.posts.length) {
            return response.data.posts[0];
        }
        throw new Error('Failed to publish post');
    } catch (err) {
        console.error('Error publishing post:', err.response?.data || err.message);
        throw err;
    }
};

// Main function to run the workflow
const main = async () => {
    try {
        let currentPost;
        if (!POST_ID) {
            // Create a new draft if no post ID is provided
            currentPost = await createDraft();
        } else {
            // Fetch existing post if ID is provided
            currentPost = await fetchPost();
        }
        console.log(`Current post status: ${currentPost.status}`);

        const publishedPost = await publishPost();
        console.log('Article published successfully with email notifications!');
        console.log('Published post details:', publishedPost);
    } catch (error) {
        process.exit(1);
    }
};

main();
