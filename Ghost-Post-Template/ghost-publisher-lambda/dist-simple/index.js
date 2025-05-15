const GhostAdminAPI = require('@tryghost/admin-api');

/**
 * Simplified Lambda handler function
 */
exports.handler = async (event, context) => {
  try {
    console.log('Event received:', JSON.stringify(event));
    
    // Parse input data
    let inputData;
    if (event.body) {
      try {
        // API Gateway format
        inputData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (error) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: 'Invalid JSON in request body',
            details: error.message
          })
        };
      }
    } else {
      // Direct Lambda invocation format
      inputData = event;
    }
    
    // Extract Ghost credentials
    const ghostUrl = process.env.GHOST_URL || inputData.ghostUrl;
    const ghostApiKey = process.env.GHOST_API_KEY || inputData.ghostApiKey;
    const newsletterId = process.env.GHOST_NEWSLETTER_ID || inputData.newsletterId;
    
    console.log('Ghost URL:', ghostUrl);
    console.log('Ghost API Key:', ghostApiKey ? 'Provided (masked)' : 'Not provided');
    console.log('Newsletter ID:', newsletterId);
    
    if (!ghostUrl || !ghostApiKey) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Missing required Ghost credentials',
          details: 'Please provide GHOST_URL and GHOST_API_KEY as environment variables or in the request payload'
        })
      };
    }
    
    // Initialize Ghost Admin API
    const api = new GhostAdminAPI({
      url: ghostUrl,
      key: ghostApiKey,
      version: 'v5.0'
    });
    
    // Create a simple test post
    const post = await api.posts.add({
      title: 'API Gateway Test Post',
      html: '<p>This is a test post created via API Gateway.</p>',
      status: 'draft',
      featured: false,
      tags: [
        { name: 'Test' }
      ],
      visibility: 'members',
      newsletter: {
        id: newsletterId
      }
    });
    
    console.log('Test post created successfully!');
    console.log('Post URL:', `${ghostUrl}/${post.slug}`);
    console.log('Post ID:', post.id);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Test post created successfully',
        postUrl: `${ghostUrl}/${post.slug}`,
        postId: post.id
      })
    };
  } catch (error) {
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.details) {
      console.error('Error details:', JSON.stringify(error.details));
    }
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: error.message,
        details: error.details || 'No additional details available',
        stack: error.stack
      })
    };
  }
};
