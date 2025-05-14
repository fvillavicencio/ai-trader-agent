// Minimal test handler to verify Lambda execution and logging
exports.handler = async (event) => {
  console.log('Lambda invoked with event:', JSON.stringify(event));
  console.log('Environment variables:', {
    PERPLEXITY_API_KEY_EXISTS: !!process.env.PERPLEXITY_API_KEY,
    USE_FALLBACK: process.env.USE_FALLBACK
  });
  
  // Return a simple response
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Minimal test handler executed successfully',
      timestamp: new Date().toISOString(),
      envVars: {
        PERPLEXITY_API_KEY_EXISTS: !!process.env.PERPLEXITY_API_KEY,
        USE_FALLBACK: process.env.USE_FALLBACK
      }
    })
  };
};
