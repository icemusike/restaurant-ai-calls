// Dedicated Vercel serverless function for handling CallFluent webhook callbacks
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');

// Validation schema for CallFluent webhook
const callFluentPayloadSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone_number: z.string().min(1, 'Phone number is required'),
  date: z.string(),
  time: z.string(),
  partySize: z.number().int().positive('Party size must be a positive integer'),
  notes: z.string().optional(),
});

// Mapping function for DB format
const mapToDbFormat = (data) => {
  return {
    customer_name: data.name,
    phone_number: data.phone_number,
    date: data.formattedDate,
    time: data.formattedTime,
    party_size: data.partySize,
    source: 'AI Call',
    status: 'Pending',
    notes: data.notes || '',
  };
};

// Mapping function from DB to app format
const mapDbToReservation = (dbReservation) => {
  return {
    id: dbReservation.id,
    customerName: dbReservation.customer_name,
    phoneNumber: dbReservation.phone_number,
    date: dbReservation.date,
    time: dbReservation.time,
    partySize: dbReservation.party_size,
    source: dbReservation.source,
    status: dbReservation.status,
    notes: dbReservation.notes || '',
    createdAt: dbReservation.created_at,
    updatedAt: dbReservation.updated_at,
  };
};

// Handler function
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. This endpoint only accepts POST requests.'
    });
  }

  try {
    console.log('Received webhook from CallFluent AI:', req.body);
    
    // Validate the webhook payload
    const validationResult = callFluentPayloadSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.error('Invalid CallFluent payload:', validationResult.error.message);
      return res.status(400).json({
        success: false,
        error: 'Invalid payload: ' + validationResult.error.message,
      });
    }
    
    const payload = validationResult.data;
    
    // Format date and time if needed
    let formattedDate = payload.date;
    let formattedTime = payload.time;
    
    // Simple date format conversion (assuming payload might have different formats)
    if (!formattedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Try to parse and format the date
      try {
        const dateObj = new Date(formattedDate);
        formattedDate = dateObj.toISOString().split('T')[0];
      } catch (e) {
        console.error('Error parsing date:', e);
        return res.status(400).json({
          success: false,
          error: 'Invalid date format',
        });
      }
    }
    
    // Ensure time is in HH:MM:SS format
    if (!formattedTime.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
      // Try to parse and format the time
      try {
        const timeObj = new Date(`2000-01-01T${formattedTime}`);
        formattedTime = timeObj.toTimeString().split(' ')[0];
      } catch (e) {
        // If parsing fails, use a default format
        if (formattedTime.match(/^\d{1,2}:\d{2}$/)) {
          // Add seconds if missing
          formattedTime = `${formattedTime}:00`;
        } else if (formattedTime.match(/^\d{1,2}$/)) {
          // Assume it's just hours
          formattedTime = `${formattedTime.padStart(2, '0')}:00:00`;
        } else {
          console.error('Error parsing time:', e);
          return res.status(400).json({
            success: false,
            error: 'Invalid time format',
          });
        }
      }
    }
    
    // Add seconds if missing
    if (formattedTime.match(/^\d{2}:\d{2}$/)) {
      formattedTime = `${formattedTime}:00`;
    }
    
    // Get Supabase credentials - directly from Vercel environment variables
    // Try alternative environment variable names as well
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';
    
    // Log all environment variables for debugging (without their values)
    console.log('Environment variables available:');
    for (const key in process.env) {
      if (key.includes('SUPABASE')) {
        console.log(`- ${key}: ${key.includes('KEY') ? '[HIDDEN]' : 'present'}`);
      }
    }
    
    // Log environment variables (without revealing full values)
    console.log('Environment check:');
    console.log('SUPABASE_URL set:', !!supabaseUrl);
    console.log('SUPABASE_SERVICE_ROLE_KEY set:', !!supabaseKey);
    console.log('Running in environment:', process.env.NODE_ENV || 'unknown');
    console.log('Vercel environment:', process.env.VERCEL_ENV || 'not in Vercel');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({
        success: false,
        error: 'Server is not properly configured. Missing database credentials.',
        debug: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          environment: process.env.NODE_ENV || 'unknown',
          isVercel: !!process.env.VERCEL
        }
      });
    }
    
    // Initialize Supabase client
    console.log('Initializing Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    
    // Test the connection first
    console.log('Testing Supabase connection...');
    try {
      const { error: testError } = await supabase.from('reservations').select('count', { count: 'exact', head: true });
      if (testError) {
        console.error('Supabase connection test failed:', testError);
        return res.status(500).json({
          success: false,
          error: `Failed to connect to database: ${testError.message} (${testError.code})`,
          debug: { error: testError }
        });
      }
      console.log('Supabase connection test successful');
    } catch (testErr) {
      console.error('Unexpected error testing Supabase connection:', testErr);
      return res.status(500).json({
        success: false,
        error: `Failed to connect to database: ${testErr.message}`,
        debug: { error: testErr.toString() }
      });
    }
    
    // Prepare data for insertion
    const dbReservation = mapToDbFormat({
      ...payload,
      formattedDate,
      formattedTime
    });
    
    console.log('Prepared data for insertion:', dbReservation);
    
    // Insert into Supabase
    console.log('Inserting into Supabase...');
    try {
      const { data, error } = await supabase
        .from('reservations')
        .insert(dbReservation)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error creating reservation from webhook:', error);
        return res.status(500).json({
          success: false,
          error: `Database error: ${error.message} (${error.code})`,
          debug: { error }
        });
      }
      
      if (!data) {
        console.error('No data returned from Supabase');
        return res.status(500).json({
          success: false,
          error: 'Database returned no data after insertion'
        });
      }
      
      // Convert to app format and return
      const reservation = mapDbToReservation(data);
      console.log('Created new reservation from CallFluent AI:', reservation);
      
      return res.status(201).json({
        success: true,
        data: reservation
      });
    } catch (insertError) {
      console.error('Unexpected error during Supabase insert:', insertError);
      return res.status(500).json({
        success: false,
        error: `Insert error: ${insertError.message}`,
        debug: { error: insertError.toString() }
      });
    }
  } catch (error) {
    console.error('Error processing CallFluent webhook:', error);
    return res.status(500).json({
      success: false,
      error: `Server error: ${error.message}`,
      debug: { stack: error.stack }
    });
  }
}; 