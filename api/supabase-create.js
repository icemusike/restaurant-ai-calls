// Dedicated Vercel serverless function for creating reservations in Supabase
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');

// Validation schema for reservations
const reservationSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Time must be in HH:MM:SS format'),
  partySize: z.number().int().positive('Party size must be a positive integer'),
  source: z.enum(['AI Call', 'Manual']),
  status: z.enum(['Pending', 'Confirmed', 'Cancelled']),
  notes: z.string().optional(),
});

// Mapping function to convert from app format to DB format
const mapReservationToDb = (reservation) => {
  return {
    customer_name: reservation.customerName,
    phone_number: reservation.phoneNumber,
    date: reservation.date,
    time: reservation.time,
    party_size: reservation.partySize,
    source: reservation.source,
    status: reservation.status,
    notes: reservation.notes || '',
  };
};

// Mapping function to convert from DB format to app format
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

// Handler for the serverless function
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
    console.log('Received request to create reservation in Supabase:', req.body);
    
    // Validate the request body
    const validationResult = reservationSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.message);
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation data: ' + validationResult.error.message,
      });
    }

    // Get Supabase credentials - Directly from Vercel environment variables
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

    // Convert to DB format
    const dbReservation = mapReservationToDb(validationResult.data);
    console.log('Converting to DB format:', dbReservation);

    // Insert into Supabase
    console.log('Inserting into Supabase...');
    try {
      const { data, error } = await supabase
        .from('reservations')
        .insert(dbReservation)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating reservation:', error);
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

      // Convert back to app format and return
      const reservation = mapDbToReservation(data);
      console.log('Successfully created reservation:', reservation);
      
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
    console.error('Unexpected error creating reservation:', error);
    return res.status(500).json({
      success: false,
      error: `Server error: ${error.message}`,
      debug: { stack: error.stack }
    });
  }
}; 