/**
 * Test Lambda handler function to diagnose API Gateway integration issues
 */
exports.handler = async (event, context) => {
  try {
    // Log the entire event and context for debugging
    console.log('Event:', JSON.stringify(event));
    console.log('Context:', JSON.stringify(context));
    
    // Extract request details
    let headers = {};
    if (event.headers) {
      headers = event.headers;
    }
    
    let body = {};
    if (event.body) {
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (error) {
        console.error('Error parsing body:', error);
        body = { error: 'Failed to parse body' };
      }
    }
    
    // Return a successful response with the event details
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
      },
      body: JSON.stringify({
        message: 'API Gateway test successful',
        receivedHeaders: headers,
        receivedBody: body,
        receivedEvent: event
      })
    };
  } catch (error) {
    console.error('Error:', error);
    
    // Return an error response
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
      },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
};
