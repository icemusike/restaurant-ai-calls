// Main API handler for Vercel
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config(); // Load .env file if present (for local development)

// --- Supabase Client Initialization ---
let supabase;
let supabaseInitializationError;

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Recommended for server-side

console.log('[api/index.js] Environment Check:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`- VERCEL_ENV: ${process.env.VERCEL_ENV || 'not set'}`);
console.log(`- SUPABASE_URL available: ${!!supabaseUrl}`);
console.log(`- SUPABASE_SERVICE_ROLE_KEY available: ${!!supabaseServiceKey}`);

if (supabaseUrl && supabaseServiceKey) {
  try {
    console.log('[api/index.js] Initializing Supabase client...');
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false, // No sessions on server
        autoRefreshToken: false,
      }
    });
    console.log('[api/index.js] Supabase client initialized successfully.');
  } catch (error) {
    supabaseInitializationError = `Failed to initialize Supabase client: ${error.message}`;
    console.error(`[api/index.js] ${supabaseInitializationError}`);
  }
} else {
  supabaseInitializationError = 'Supabase URL or Service Role Key is missing. Cannot initialize Supabase client.';
  console.warn(`[api/index.js] ${supabaseInitializationError}`);
}

const isSupabaseConfigured = () => {
  return !!supabase && !supabaseInitializationError;
};

// --- In-memory database (fallback) ---
const database = {
  reservations: []
};

const addSampleData = () => {
  if (database.reservations.length === 0) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    database.reservations.push(
      { id: uuidv4(), customerName: 'Demo User 1', phoneNumber: '555-0101', date: today, time: '18:00:00', partySize: 2, source: 'Manual', status: 'Confirmed', notes: 'Sample reservation 1', createdAt: now.toISOString(), updatedAt: now.toISOString() },
      { id: uuidv4(), customerName: 'Demo User 2', phoneNumber: '555-0102', date: today, time: '19:30:00', partySize: 4, source: 'AI Call', status: 'Pending', notes: 'Sample reservation 2', createdAt: now.toISOString(), updatedAt: now.toISOString() }
    );
    console.log('[api/index.js] Added sample data to in-memory store.');
  }
};

// Initialize with sample data if not using Supabase
if (!isSupabaseConfigured()) {
  console.log('[api/index.js] Supabase not configured or initialization failed. Using in-memory database with sample data.');
  addSampleData();
}


// --- Express App Setup ---
const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- Data Mapping Functions ---
const mapDbToReservation = (dbReservation) => {
  if (!dbReservation) return null;
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

const mapReservationToDb = (reservation) => {
  if (!reservation) return null;
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

// --- Zod Validation Schemas ---
const reservationSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Time must be HH:MM:SS'),
  partySize: z.number().int().positive('Party size must be a positive integer'),
  source: z.enum(['AI Call', 'Manual']).optional().default('Manual'),
  status: z.enum(['Pending', 'Confirmed', 'Cancelled']).optional().default('Pending'),
  notes: z.string().optional(),
});

const callFluentPayloadSchema = z.object({
  name: z.string().min(1),
  phone_number: z.string().min(1),
  date: z.string(),
  time: z.string(),
  partySize: z.number().int().positive(),
  notes: z.string().optional(),
});


// --- API Routes ---

// GET /api/reservations
app.get('/api/reservations', async (req, res) => {
  console.log('[api/index.js] GET /api/reservations called.');
  if (isSupabaseConfigured()) {
    try {
      console.log('[api/index.js] Fetching reservations from Supabase...');
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) {
        console.error('[api/index.js] Supabase error fetching reservations:', error);
        return res.status(500).json({ success: false, error: `Supabase error: ${error.message}`, code: error.code });
      }
      console.log(`[api/index.js] Successfully fetched ${data ? data.length : 0} reservations from Supabase.`);
      return res.json({ success: true, data: data.map(mapDbToReservation) });
    } catch (err) {
      console.error('[api/index.js] Catch block error fetching reservations from Supabase:', err);
      return res.status(500).json({ success: false, error: `Server error: ${err.message}` });
    }
  } else {
    console.log('[api/index.js] Using in-memory reservations.');
    return res.json({ success: true, data: database.reservations, message: supabaseInitializationError || 'Supabase not configured.' });
  }
});

// GET /api/reservations/:id
app.get('/api/reservations/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[api/index.js] GET /api/reservations/${id} called.`);
  if (isSupabaseConfigured()) {
    try {
      console.log(`[api/index.js] Fetching reservation ${id} from Supabase...`);
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Not found
          console.log(`[api/index.js] Reservation ${id} not found in Supabase.`);
          return res.status(404).json({ success: false, error: 'Reservation not found' });
        }
        console.error(`[api/index.js] Supabase error fetching reservation ${id}:`, error);
        return res.status(500).json({ success: false, error: `Supabase error: ${error.message}`, code: error.code });
      }
      console.log(`[api/index.js] Successfully fetched reservation ${id} from Supabase.`);
      return res.json({ success: true, data: mapDbToReservation(data) });
    } catch (err) {
      console.error(`[api/index.js] Catch block error fetching reservation ${id} from Supabase:`, err);
      return res.status(500).json({ success: false, error: `Server error: ${err.message}` });
    }
  } else {
    console.log(`[api/index.js] Using in-memory to find reservation ${id}.`);
    const reservation = database.reservations.find(r => r.id === id);
    if (reservation) {
      return res.json({ success: true, data: reservation });
    } else {
      return res.status(404).json({ success: false, error: 'Reservation not found (in-memory)' });
    }
  }
});

// POST /api/reservations (Handled by dedicated functions like simpledb or supabase-create, but keep a basic fallback)
app.post('/api/reservations', async (req, res) => {
  console.log('[api/index.js] POST /api/reservations called (basic fallback). Body:', req.body);
   const validationResult = reservationSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error('[api/index.js] Validation failed for POST /api/reservations:', validationResult.error.flatten());
      return res.status(400).json({ success: false, error: 'Invalid reservation data', details: validationResult.error.flatten() });
    }

  if (isSupabaseConfigured()) {
     try {
        console.log('[api/index.js] Inserting reservation into Supabase (via POST /api/reservations fallback)...');
        const dbReservation = mapReservationToDb(validationResult.data);
        const { data, error } = await supabase
          .from('reservations')
          .insert(dbReservation)
          .select()
          .single();

        if (error) {
          console.error('[api/index.js] Supabase error inserting reservation (fallback):', error);
          return res.status(500).json({ success: false, error: `Supabase error: ${error.message}`, code: error.code });
        }
        console.log('[api/index.js] Successfully inserted reservation (fallback) via Supabase:', data);
        return res.status(201).json({ success: true, data: mapDbToReservation(data) });
      } catch (err) {
        console.error('[api/index.js] Catch block error inserting reservation (fallback) via Supabase:', err);
        return res.status(500).json({ success: false, error: `Server error: ${err.message}` });
      }
  } else {
    console.log('[api/index.js] Using in-memory for POST /api/reservations.');
    const newReservation = {
      ...validationResult.data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    database.reservations.push(newReservation);
    console.log('[api/index.js] Added to in-memory (fallback):', newReservation);
    return res.status(201).json({ success: true, data: newReservation });
  }
});


// PUT /api/reservations/:id
app.put('/api/reservations/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[api/index.js] PUT /api/reservations/${id} called. Body:`, req.body);
  const validationResult = reservationSchema.safeParse(req.body);
  if (!validationResult.success) {
    console.error(`[api/index.js] Validation failed for PUT /api/reservations/${id}:`, validationResult.error.flatten());
    return res.status(400).json({ success: false, error: 'Invalid reservation data', details: validationResult.error.flatten() });
  }

  if (isSupabaseConfigured()) {
    try {
      console.log(`[api/index.js] Updating reservation ${id} in Supabase...`);
      const dbReservation = mapReservationToDb(validationResult.data);
      const { data, error } = await supabase
        .from('reservations')
        .update(dbReservation)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`[api/index.js] Supabase error updating reservation ${id}:`, error);
        return res.status(500).json({ success: false, error: `Supabase error: ${error.message}`, code: error.code });
      }
      if (!data) { // Should not happen if .single() and no error, but good practice
         console.log(`[api/index.js] Reservation ${id} not found for update or no data returned.`);
         return res.status(404).json({ success: false, error: 'Reservation not found or no data returned post-update' });
      }
      console.log(`[api/index.js] Successfully updated reservation ${id} in Supabase.`);
      return res.json({ success: true, data: mapDbToReservation(data) });
    } catch (err) {
      console.error(`[api/index.js] Catch block error updating reservation ${id} in Supabase:`, err);
      return res.status(500).json({ success: false, error: `Server error: ${err.message}` });
    }
  } else {
    console.log(`[api/index.js] Using in-memory to update reservation ${id}.`);
    const index = database.reservations.findIndex(r => r.id === id);
    if (index !== -1) {
      database.reservations[index] = {
        ...database.reservations[index],
        ...validationResult.data,
        updatedAt: new Date().toISOString(),
      };
      return res.json({ success: true, data: database.reservations[index] });
    } else {
      return res.status(404).json({ success: false, error: 'Reservation not found (in-memory)' });
    }
  }
});

// PATCH /api/reservations/:id/status
app.patch('/api/reservations/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  console.log(`[api/index.js] PATCH /api/reservations/${id}/status called. Status: ${status}`);

  const statusValidation = z.enum(['Pending', 'Confirmed', 'Cancelled']).safeParse(status);
  if (!statusValidation.success) {
    console.error(`[api/index.js] Invalid status for PATCH /api/reservations/${id}/status:`, status);
    return res.status(400).json({ success: false, error: 'Invalid status value' });
  }

  if (isSupabaseConfigured()) {
    try {
      console.log(`[api/index.js] Updating status for reservation ${id} to ${status} in Supabase...`);
      const { data, error } = await supabase
        .from('reservations')
        .update({ status: statusValidation.data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`[api/index.js] Supabase error updating status for reservation ${id}:`, error);
        return res.status(500).json({ success: false, error: `Supabase error: ${error.message}`, code: error.code });
      }
       if (!data) {
         console.log(`[api/index.js] Reservation ${id} not found for status update or no data returned.`);
         return res.status(404).json({ success: false, error: 'Reservation not found or no data returned post-status-update' });
      }
      console.log(`[api/index.js] Successfully updated status for reservation ${id} in Supabase.`);
      return res.json({ success: true, data: mapDbToReservation(data) });
    } catch (err) {
      console.error(`[api/index.js] Catch block error updating status for reservation ${id} in Supabase:`, err);
      return res.status(500).json({ success: false, error: `Server error: ${err.message}` });
    }
  } else {
    console.log(`[api/index.js] Using in-memory to update status for reservation ${id}.`);
    const index = database.reservations.findIndex(r => r.id === id);
    if (index !== -1) {
      database.reservations[index].status = statusValidation.data;
      database.reservations[index].updatedAt = new Date().toISOString();
      return res.json({ success: true, data: database.reservations[index] });
    } else {
      return res.status(404).json({ success: false, error: 'Reservation not found (in-memory)' });
    }
  }
});

// DELETE /api/reservations/:id
app.delete('/api/reservations/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[api/index.js] DELETE /api/reservations/${id} called.`);
  if (isSupabaseConfigured()) {
    try {
      console.log(`[api/index.js] Deleting reservation ${id} from Supabase...`);
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`[api/index.js] Supabase error deleting reservation ${id}:`, error);
        return res.status(500).json({ success: false, error: `Supabase error: ${error.message}`, code: error.code });
      }
      console.log(`[api/index.js] Successfully deleted reservation ${id} (or it did not exist) from Supabase.`);
      return res.status(200).json({ success: true, message: 'Reservation deleted successfully' }); // 200 OK or 204 No Content
    } catch (err) {
      console.error(`[api/index.js] Catch block error deleting reservation ${id} from Supabase:`, err);
      return res.status(500).json({ success: false, error: `Server error: ${err.message}` });
    }
  } else {
    console.log(`[api/index.js] Using in-memory to delete reservation ${id}.`);
    const initialLength = database.reservations.length;
    database.reservations = database.reservations.filter(r => r.id !== id);
    if (database.reservations.length < initialLength) {
      return res.json({ success: true, message: 'Reservation deleted (in-memory)' });
    } else {
      return res.status(404).json({ success: false, error: 'Reservation not found (in-memory)' });
    }
  }
});

// POST /api/webhook/callfluent (This should ideally use a dedicated function like webhook-create.js)
app.post('/api/webhook/callfluent', async (req, res) => {
  console.log('[api/index.js] POST /api/webhook/callfluent called. Body:', req.body);
  // This endpoint is better handled by api/webhook-create.js due to its specific needs.
  // For now, let's just log and acknowledge, or implement a very basic version if Supabase is configured.

  const validationResult = callFluentPayloadSchema.safeParse(req.body);
  if (!validationResult.success) {
    console.error('[api/index.js] Invalid CallFluent payload:', validationResult.error.flatten());
    return res.status(400).json({ success: false, error: 'Invalid payload', details: validationResult.error.flatten() });
  }

  const payload = validationResult.data;

  // Date/Time formatting (simplified)
  let formattedDate = payload.date;
  if (!payload.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      try { formattedDate = new Date(payload.date).toISOString().split('T')[0]; }
      catch (e) { /* ignore, use original */ }
  }
  let formattedTime = payload.time;
   if (!payload.time.match(/^\d{2}:\d{2}:\d{2}$/)) {
      try { formattedTime = new Date(`2000-01-01T${payload.time}`).toTimeString().split(' ')[0]; }
      catch (e) { /* ignore, use original */ }
  }
  if (formattedTime.match(/^\d{2}:\d{2}$/)) { formattedTime = `${formattedTime}:00`; }


  if (isSupabaseConfigured()) {
    try {
      const dbReservation = {
        customer_name: payload.name,
        phone_number: payload.phone_number,
        date: formattedDate,
        time: formattedTime,
        party_size: payload.partySize,
        source: 'AI Call',
        status: 'Pending',
        notes: payload.notes || '',
      };
      console.log('[api/index.js] Inserting reservation from CallFluent webhook into Supabase...');
      const { data, error } = await supabase.from('reservations').insert(dbReservation).select().single();
      if (error) {
        console.error('[api/index.js] Supabase error from CallFluent webhook insert:', error);
        return res.status(500).json({ success: false, error: `Supabase error: ${error.message}` });
      }
      console.log('[api/index.js] Successfully inserted reservation from CallFluent webhook.');
      return res.status(201).json({ success: true, data: mapDbToReservation(data) });
    } catch (err) {
      console.error('[api/index.js] Catch block error from CallFluent webhook Supabase insert:', err);
      return res.status(500).json({ success: false, error: `Server error: ${err.message}` });
    }
  } else {
     console.warn('[api/index.js] CallFluent webhook received, but Supabase not configured. Data not saved to DB.');
     // Fallback to in-memory for CallFluent webhook
    const newReservation = {
      id: uuidv4(),
      customerName: payload.name,
      phoneNumber: payload.phone_number,
      date: formattedDate,
      time: formattedTime,
      partySize: payload.partySize,
      source: 'AI Call',
      status: 'Pending',
      notes: payload.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    database.reservations.push(newReservation);
    console.log('[api/index.js] Added CallFluent reservation to in-memory store:', newReservation);
    return res.status(201).json({ success: true, data: newReservation, message: 'Saved to in-memory (Supabase not configured)' });
  }
});

// Export the app
module.exports = app;
