const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

    // Load from Lambda environment variables
    const GHOST_ADMIN_API_KEY = process.env.GHOST_ADMIN_API_KEY;
    const GHOST_API_URL = process.env.GHOST_API_URL;
    const GHOST_NEWSLETTER_ID = process.env.GHOST_NEWSLETTER_ID;

    if (!GHOST_ADMIN_API_KEY || !GHOST_API_URL) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing required environment variables." })
      };
    }

    // Generate Ghost Admin API JWT
    const [id, secret] = GHOST_ADMIN_API_KEY.split(':');
    if (!id || !secret) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Invalid GHOST_ADMIN_API_KEY format." })
      };
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

    // Prepare Ghost post payload
    const postPayload = {
      ...body,
      newsletter_id: body.newsletter_id || GHOST_NEWSLETTER_ID
    };

    // Forward to Ghost Admin API
    const response = await fetch(
      `${GHOST_API_URL}/ghost/api/admin/posts/?newsletter=${postPayload.newsletter_id}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Ghost ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ posts: [postPayload] })
      }
    );

    const ghostResponse = await response.text();
    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: ghostResponse
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message, stack: error.stack })
    };
  }
};
