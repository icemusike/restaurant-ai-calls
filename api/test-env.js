// Absolute minimal Vercel serverless function for testing
module.exports = async (req, res) => {
  // Enable CORS - still good practice even for a minimal test
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Be more restrictive in production
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[api/test-env] Received OPTIONS request');
    res.status(200).end();
    return;
  }

  console.log('[api/test-env] Received GET request');

  try {
    const responsePayload = {
      success: true,
      message: "Minimal test endpoint is working!",
      timestamp: new Date().toISOString(),
      environment: {
        node_version: process.version,
        vercel_env: process.env.VERCEL_ENV || 'not set',
        is_vercel: !!process.env.VERCEL,
        region: process.env.VERCEL_REGION || 'not set',
      }
    };
    console.log('[api/test-env] Sending response:', responsePayload);
    res.status(200).json(responsePayload);
  } catch (error) {
    console.error('[api/test-env] Unexpected error in minimal function:', error);
    res.status(500).json({
      success: false,
      error: "Minimal function crashed",
      message: error.message,
      stack: error.stack // Include stack trace for debugging
    });
  }
}; 