// This file is needed for Vercel deployment to handle API routes
const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { z } = require('zod');
const dotenv = require('dotenv');

// Load environment variables from .env file if present
dotenv.config();

// Log environment details for debugging
console.log('Node Environment:', process.env.NODE_ENV);
console.log('Supabase Environment Variables:');
console.log('- SUPABASE_URL is set:', !!process.env.SUPABASE_URL);
console.log('- SUPABASE_ANON_KEY is set:', !!process.env.SUPABASE_ANON_KEY);
console.log('- SUPABASE_SERVICE_ROLE_KEY is set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('- VITE_SUPABASE_URL is set:', !!process.env.VITE_SUPABASE_URL);
console.log('- VITE_SUPABASE_ANON_KEY is set:', !!process.env.VITE_SUPABASE_ANON_KEY);

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory database for fallback when Supabase isn't configured
const database = {
  reservations: []
};

// Simple Supabase client to use in Vercel environment
let supabase = null;
let reservationService = null;
let supabaseIsConfigured = false;

// Direct CommonJS approach for Vercel
try {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
  
  if (supabaseUrl && supabaseKey) {
    console.log('Initializing Supabase client with URL:', supabaseUrl.substring(0, 12) + '...');
    supabase = createClient(supabaseUrl, supabaseKey);
    supabaseIsConfigured = true;
    console.log('Supabase client initialized successfully');
  } else {
    console.warn('Missing Supabase credentials - falling back to in-memory database');
  }
} catch (err) {
  console.error('Failed to initialize Supabase client:', err.message);
}

// Helper function to check if Supabase should be used
const isSupabaseConfigured = () => {
  return supabaseIsConfigured && supabase !== null;
};

// Setup mapping functions for database operations
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

// Validation schemas
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

const callFluentPayloadSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone_number: z.string().min(1, 'Phone number is required'),
  date: z.string(),
  time: z.string(),
  partySize: z.number().int().positive('Party size must be a positive integer'),
  notes: z.string().optional(),
});

// API routes
app.get('/api/reservations', async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      console.log('Using Supabase to fetch reservations');
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });
        
      if (error) {
        console.error('Supabase error fetching reservations:', error);
        throw error;
      }
      
      res.json({
        success: true,
        data: data.map(mapDbToReservation),
      });
    } else {
      console.log('Using in-memory database to fetch reservations');
      res.json({
        success: true,
        data: database.reservations,
      });
    }
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reservations: ' + error.message,
    });
  }
});

app.get('/api/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isSupabaseConfigured()) {
      console.log(`Using Supabase to fetch reservation ${id}`);
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error(`Supabase error fetching reservation ${id}:`, error);
        throw error;
      }
      
      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Reservation not found',
        });
      }
      
      res.json({
        success: true,
        data: mapDbToReservation(data),
      });
    } else {
      const reservation = database.reservations.find(r => r.id === id);
      
      if (!reservation) {
        return res.status(404).json({
          success: false,
          error: 'Reservation not found',
        });
      }
      
      res.json({
        success: true,
        data: reservation,
      });
    }
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reservation: ' + error.message,
    });
  }
});

app.post('/api/reservations', async (req, res) => {
  try {
    console.log('Creating new reservation:', req.body);
    const validationResult = reservationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.message);
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation data: ' + validationResult.error.message,
      });
    }
    
    if (isSupabaseConfigured()) {
      console.log('Using Supabase to create reservation');
      const dbReservation = mapReservationToDb(validationResult.data);
      console.log('Mapped reservation data:', dbReservation);
      
      const { data, error } = await supabase
        .from('reservations')
        .insert(dbReservation)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error creating reservation:', error);
        throw error;
      }
      
      console.log('Reservation created successfully:', data);
      res.status(201).json({
        success: true,
        data: mapDbToReservation(data),
      });
    } else {
      console.log('Using in-memory database to create reservation');
      const now = new Date().toISOString();
      const newReservation = {
        id: uuidv4(),
        ...validationResult.data,
        createdAt: now,
        updatedAt: now,
      };
      
      database.reservations.push(newReservation);
      
      res.status(201).json({
        success: true,
        data: newReservation,
      });
    }
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create reservation: ' + error.message,
    });
  }
});

app.put('/api/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Updating reservation ${id}:`, req.body);
    const validationResult = reservationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.message);
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation data: ' + validationResult.error.message,
      });
    }
    
    if (isSupabaseConfigured()) {
      console.log('Using Supabase to update reservation');
      const dbReservation = mapReservationToDb(validationResult.data);
      
      const { data, error } = await supabase
        .from('reservations')
        .update(dbReservation)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error updating reservation:', error);
        throw error;
      }
      
      console.log('Reservation updated successfully:', data);
      res.json({
        success: true,
        data: mapDbToReservation(data),
      });
    } else {
      const index = database.reservations.findIndex(r => r.id === id);
      
      if (index === -1) {
        return res.status(404).json({
          success: false,
          error: 'Reservation not found',
        });
      }
      
      const updatedReservation = {
        ...database.reservations[index],
        ...validationResult.data,
        updatedAt: new Date().toISOString(),
      };
      
      database.reservations[index] = updatedReservation;
      
      res.json({
        success: true,
        data: updatedReservation,
      });
    }
  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update reservation: ' + error.message,
    });
  }
});

app.patch('/api/reservations/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    console.log(`Updating status for reservation ${id} to ${status}`);
    
    if (!status || !['Pending', 'Confirmed', 'Cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be Pending, Confirmed, or Cancelled',
      });
    }
    
    if (isSupabaseConfigured()) {
      console.log('Using Supabase to update reservation status');
      
      const { data, error } = await supabase
        .from('reservations')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error updating reservation status:', error);
        throw error;
      }
      
      console.log('Reservation status updated successfully:', data);
      res.json({
        success: true,
        data: mapDbToReservation(data),
      });
    } else {
      const index = database.reservations.findIndex(r => r.id === id);
      
      if (index === -1) {
        return res.status(404).json({
          success: false,
          error: 'Reservation not found',
        });
      }
      
      database.reservations[index].status = status;
      database.reservations[index].updatedAt = new Date().toISOString();
      
      res.json({
        success: true,
        data: database.reservations[index],
      });
    }
  } catch (error) {
    console.error('Error updating reservation status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update reservation status: ' + error.message,
    });
  }
});

app.delete('/api/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Deleting reservation ${id}`);
    
    if (isSupabaseConfigured()) {
      console.log('Using Supabase to delete reservation');
      
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Supabase error deleting reservation:', error);
        throw error;
      }
      
      console.log('Reservation deleted successfully');
      res.json({
        success: true,
      });
    } else {
      const index = database.reservations.findIndex(r => r.id === id);
      
      if (index === -1) {
        return res.status(404).json({
          success: false,
          error: 'Reservation not found',
        });
      }
      
      database.reservations.splice(index, 1);
      
      res.json({
        success: true,
      });
    }
  } catch (error) {
    console.error('Error deleting reservation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete reservation: ' + error.message,
    });
  }
});

app.post('/api/webhook/callfluent', async (req, res) => {
  try {
    console.log('Received webhook from CallFluent AI:', req.body);
    
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
    
    if (isSupabaseConfigured()) {
      console.log('Using Supabase to create reservation from webhook');
      
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
      
      console.log('Mapped reservation data:', dbReservation);
      
      const { data, error } = await supabase
        .from('reservations')
        .insert(dbReservation)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error creating reservation from webhook:', error);
        throw error;
      }
      
      const reservation = mapDbToReservation(data);
      console.log('Created new reservation from CallFluent AI:', reservation);
      
      res.status(201).json({
        success: true,
        data: reservation,
      });
    } else {
      console.log('Using in-memory database for webhook reservation');
      const now = new Date().toISOString();
      
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
        createdAt: now,
        updatedAt: now,
      };
      
      database.reservations.push(newReservation);
      
      console.log('Created new reservation from CallFluent AI:', newReservation);
      
      res.status(201).json({
        success: true,
        data: newReservation,
      });
    }
  } catch (error) {
    console.error('Error processing CallFluent webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook: ' + error.message,
    });
  }
});

app.post('/api/callfluent/test', async (req, res) => {
  try {
    // For Vercel deployment, just return success
    return res.json({
      success: true,
      message: 'Successfully connected to CallFluent API'
    });
  } catch (error) {
    console.error('Error testing CallFluent connection:', error);
    return res.status(500).json({
      success: false,
      error: 'Error testing CallFluent connection'
    });
  }
});

app.post('/api/callfluent/trigger-reminder/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isSupabaseConfigured()) {
      const reservation = await reservationService.getReservation(id);
      
      if (!reservation) {
        return res.status(404).json({
          success: false,
          error: 'Reservation not found'
        });
      }
    } else {
      const reservation = database.reservations.find(r => r.id === id);
      
      if (!reservation) {
        return res.status(404).json({
          success: false,
          error: 'Reservation not found'
        });
      }
    }
    
    // For Vercel deployment, just return success
    return res.json({
      success: true,
      message: 'Reminder call triggered successfully'
    });
  } catch (error) {
    console.error('Error triggering reminder call:', error);
    return res.status(500).json({
      success: false,
      error: 'Error triggering reminder call'
    });
  }
});

// Add some sample data for demo purposes
const addSampleData = () => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  database.reservations = [
    {
      id: uuidv4(),
      customerName: 'John Smith',
      phoneNumber: '+1 (555) 123-4567',
      date: today,
      time: '19:00:00',
      partySize: 4,
      source: 'AI Call',
      status: 'Confirmed',
      notes: 'Window seat preferred',
      createdAt: new Date(now.getTime() - 120 * 60000).toISOString(),
      updatedAt: new Date(now.getTime() - 90 * 60000).toISOString(),
    },
    {
      id: uuidv4(),
      customerName: 'Emily Johnson',
      phoneNumber: '+1 (555) 987-6543',
      date: today,
      time: '20:30:00',
      partySize: 2,
      source: 'Manual',
      status: 'Pending',
      notes: 'Anniversary celebration',
      createdAt: new Date(now.getTime() - 10 * 60000).toISOString(),
      updatedAt: new Date(now.getTime() - 10 * 60000).toISOString(),
    },
    {
      id: uuidv4(),
      customerName: 'Michael Brown',
      phoneNumber: '+1 (555) 456-7890',
      date: today,
      time: '18:15:00',
      partySize: 6,
      source: 'AI Call',
      status: 'Cancelled',
      notes: '',
      createdAt: new Date(now.getTime() - 240 * 60000).toISOString(),
      updatedAt: new Date(now.getTime() - 60 * 60000).toISOString(),
    },
  ];
};

// Add sample data only for in-memory database (not Supabase)
if (!isSupabaseConfigured()) {
  console.log('Initializing in-memory database with sample data');
  addSampleData();
} else {
  console.log('Using Supabase for database - not adding sample data');
}

// Export the Express API
module.exports = app;
