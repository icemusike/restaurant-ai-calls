// Simple diagnostic endpoint to check environment variables
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Create response object with basic information
    const response = {
      success: true,
      message: "Basic environment diagnostic information",
      timestamp: new Date().toISOString(),
      environment: {
        node_env: process.env.NODE_ENV || 'not set',
        vercel_env: process.env.VERCEL_ENV || 'not set',
        is_vercel: !!process.env.VERCEL,
        region: process.env.VERCEL_REGION || 'not set',
      },
      supabase: {
        url_available: false,
        key_available: false,
        available_variables: []
      }
    };

    // Check what Supabase-related environment variables are available
    for (const key in process.env) {
      if (key.includes('SUPABASE')) {
        response.supabase.available_variables.push(key);
      }
    }

    // Check for Supabase credentials (without accessing their values)
    response.supabase.url_available = !!process.env.SUPABASE_URL || 
                                      !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    response.supabase.key_available = !!process.env.SUPABASE_SERVICE_ROLE_KEY || 
                                      !!process.env.SERVICE_ROLE_KEY || 
                                      !!process.env.SUPABASE_ANON_KEY || 
                                      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    return res.status(200).json(response);
  } catch (err) {
    console.error('Error in diagnostic endpoint:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: err.message
    });
  }
}; 