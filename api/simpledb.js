// Minimal serverless function for Supabase operations
const { createClient } = require('@supabase/supabase-js');

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
    console.log('Received request to insert data');
    
    // Get body data
    const reservation = req.body;
    
    // Convert from app format to DB format
    const dbData = {
      customer_name: reservation.customerName,
      phone_number: reservation.phoneNumber,
      date: reservation.date,
      time: reservation.time,
      party_size: reservation.partySize,
      source: reservation.source || 'Manual',
      status: reservation.status || 'Pending',
      notes: reservation.notes || '',
    };
    
    // Log to help with debugging (excluding sensitive info)
    console.log('Data to insert:', {
      ...dbData,
      phone_number: '******' // Don't log phone numbers
    });
    
    // Get Supabase URL and key
    const url = process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    // Check if we have credentials
    if (!url || !key) {
      console.log('Missing Supabase credentials');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error - missing database credentials',
        debug: {
          hasUrl: !!url,
          hasKey: !!key
        }
      });
    }
    
    // Initialize Supabase with minimal options
    const supabase = createClient(url, key, {
      auth: { persistSession: false }
    });
    
    // Insert data
    const { data, error } = await supabase
      .from('reservations')
      .insert(dbData)
      .select()
      .single();
    
    if (error) {
      console.log('Database error:', error);
      return res.status(500).json({
        success: false,
        error: `Database error: ${error.message}`,
        code: error.code
      });
    }
    
    // Format the response
    const result = {
      id: data.id,
      customerName: data.customer_name,
      phoneNumber: data.phone_number,
      date: data.date,
      time: data.time,
      partySize: data.party_size,
      source: data.source,
      status: data.status,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    // Success response
    return res.status(201).json({
      success: true,
      data: result
    });
    
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: err.message
    });
  }
}; 