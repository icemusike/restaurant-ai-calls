// Simple diagnostic endpoint to check environment variables and Supabase connection
const { createClient } = require('@supabase/supabase-js');

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

  const response = {
    success: true,
    message: "Environment diagnostic information",
    environment: {
      node_env: process.env.NODE_ENV || 'not set',
      vercel_env: process.env.VERCEL_ENV || 'not set',
      is_vercel: !!process.env.VERCEL,
      region: process.env.VERCEL_REGION || 'not set',
    },
    supabase: {
      url_available: false,
      key_available: false,
      connection_test: 'not performed',
      available_variables: []
    }
  };

  // Check what Supabase-related environment variables are available
  for (const key in process.env) {
    if (key.includes('SUPABASE')) {
      response.supabase.available_variables.push(
        `${key}: ${key.includes('KEY') ? '[HIDDEN]' : 'present'}`
      );
    }
  }

  // Check for Supabase credentials
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || 
                      process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  response.supabase.url_available = !!supabaseUrl;
  response.supabase.key_available = !!supabaseKey;

  // Only try to connect if both URL and key are available
  if (supabaseUrl && supabaseKey) {
    try {
      // Initialize Supabase client with minimal options
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });

      // Perform a simple connection test
      const { data, error } = await supabase
        .from('reservations')
        .select('count', { count: 'exact', head: true });

      if (error) {
        response.supabase.connection_test = `Failed: ${error.message} (${error.code})`;
        response.success = false;
      } else {
        response.supabase.connection_test = 'Successful';
        // Try a simple insert as well
        const testData = {
          customer_name: 'Test User',
          phone_number: '+1234567890',
          date: new Date().toISOString().split('T')[0],
          time: '12:00:00',
          party_size: 2,
          source: 'Manual',
          status: 'Pending',
          notes: 'This is a test reservation created by the diagnostic endpoint'
        };

        const insertResult = await supabase
          .from('reservations')
          .insert(testData)
          .select()
          .single();

        if (insertResult.error) {
          response.supabase.insert_test = `Failed: ${insertResult.error.message} (${insertResult.error.code})`;
          if (insertResult.error.code === '42501') {
            response.supabase.suggestion = 'This appears to be a permissions issue. Make sure you are using the service role key that can bypass RLS policies.';
          }
        } else {
          response.supabase.insert_test = 'Successful';
          response.supabase.test_record_id = insertResult.data.id;
          
          // Clean up the test data
          await supabase
            .from('reservations')
            .delete()
            .eq('id', insertResult.data.id);
        }
      }
    } catch (err) {
      response.supabase.connection_test = `Error: ${err.message}`;
      response.success = false;
    }
  } else {
    response.supabase.connection_test = 'Skipped - missing credentials';
    response.success = false;
  }

  return res.status(response.success ? 200 : 500).json(response);
}; 