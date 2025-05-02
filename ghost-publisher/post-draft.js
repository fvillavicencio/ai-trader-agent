require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const jwt = require('jsonwebtoken');

const GHOST_API_URL = process.env.GHOST_API_URL;
const GHOST_ADMIN_API_KEY = process.env.GHOST_ADMIN_API_KEY;

if (!GHOST_API_URL || !GHOST_ADMIN_API_KEY) {
  console.error("Missing GHOST_API_URL or GHOST_ADMIN_API_KEY in .env");
  process.exit(1);
}

// Generate JWT from Admin API Key
const [id, secret] = GHOST_ADMIN_API_KEY.split(':');
if (!id || !secret) {
  console.error("Invalid GHOST_ADMIN_API_KEY format. Should be <id>:<secret>");
  process.exit(1);
}
const token = jwt.sign(
  {
    exp: Math.floor(Date.now() / 1000) + 5 * 60,
    aud: '/admin/'
  },
  Buffer.from(secret, 'hex'),
  {
    keyid: id,
    algorithm: 'HS256'
  }
);

// Example draft post data
const post = {
  title: "Test Draft from Local Script",
  status: "draft",
  html: "<p>This is a test draft created using the Admin API JWT.</p>"
};

async function createDraft() {
  try {
    const response = await fetch(`${GHOST_API_URL}/ghost/api/admin/posts/`, {
      method: 'POST',
      headers: {
        'Authorization': `Ghost ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ posts: [post] })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Failed to create draft:", data);
      process.exit(1);
    }
    console.log("Draft created:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error posting draft:", err);
    process.exit(1);
  }
}

createDraft();
