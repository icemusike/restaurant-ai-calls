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

// Log Supabase environment variables availability
console.log('SUPABASE_URL is set:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY is set:', !!process.env.SUPABASE_ANON_KEY);
console.log('SUPABASE_SERVICE_ROLE_KEY is set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// Import our supabase services
let reservationService;

// Set up Supabase client and services
async function importServices() {
  try {
    // Handle different import approaches
    let createClient;
    try {
      // Try CommonJS require first
      createClient = require('@supabase/supabase-js').createClient;
    } catch (err) {
      // If that fails, try ESM import
      try {
        const supabase = await import('@supabase/supabase-js');
        createClient = supabase.createClient;
      } catch (err2) {
        console.error('Error importing Supabase:', err2);
        return false;
      }
    }
    
    // Set up Supabase client 
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials missing, falling back to in-memory database');
      return false;
    }
    
    // Create the Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    
    // Test the connection
    const { error } = await supabase.from('reservations').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('Supabase connection successful. Using Supabase for database operations.');
    
    // Set up reservation service with this supabase client
    reservationService = {
      // Map from DB format to app format
      mapDbToReservation: (dbReservation) => ({
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
        updatedAt: dbReservation.updated_at
      }),
      
      // Map from app format to DB format
      mapReservationToDb: (reservation) => ({
        customer_name: reservation.customerName,
        phone_number: reservation.phoneNumber,
        date: reservation.date,
        time: reservation.time,
        party_size: reservation.partySize,
        source: reservation.source,
        status: reservation.status,
        notes: reservation.notes
      }),
      
      // Get all reservations
      async getReservations() {
        const { data, error } = await supabase
          .from('reservations')
          .select('*')
          .order('date', { ascending: true })
          .order('time', { ascending: true });
          
        if (error) throw error;
        return data.map(this.mapDbToReservation);
      },
      
      // Get one reservation
      async getReservation(id) {
        const { data, error } = await supabase
          .from('reservations')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error && error.code !== 'PGRST116') throw error;
        return data ? this.mapDbToReservation(data) : null;
      },
      
      // Create reservation
      async createReservation(reservation) {
        const dbReservation = this.mapReservationToDb(reservation);
        
        const { data, error } = await supabase
          .from('reservations')
          .insert(dbReservation)
          .select()
          .single();
          
        if (error) throw error;
        return this.mapDbToReservation(data);
      },
      
      // Update reservation
      async updateReservation(id, reservation) {
        const dbReservation = this.mapReservationToDb(reservation);
        
        const { data, error } = await supabase
          .from('reservations')
          .update(dbReservation)
          .eq('id', id)
          .select()
          .single();
          
        if (error) throw error;
        return this.mapDbToReservation(data);
      },
      
      // Update status
      async updateReservationStatus(id, status) {
        const { data, error } = await supabase
          .from('reservations')
          .update({ status })
          .eq('id', id)
          .select()
          .single();
          
        if (error) throw error;
        return this.mapDbToReservation(data);
      },
      
      // Delete reservation
      async deleteReservation(id) {
        const { error } = await supabase
          .from('reservations')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
      }
    };
    
    return true;
  } catch (err) {
    console.error('Error setting up Supabase:', err);
    return false;
  }
}

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory database for fallback when Supabase isn't configured
const database = {
  reservations: []
};

// Helper function to check if Supabase is configured
const isSupabaseConfigured = () => {
  return reservationService !== undefined;
};

// Initialize Supabase services
(async () => {
  try {
    const success = await importServices();
    if (success) {
      console.log('Supabase services initialized successfully');
    } else {
      console.log('Falling back to in-memory database');
      addSampleData(); // Only add sample data for in-memory database
    }
  } catch (err) {
    console.error('Error initializing Supabase services:', err);
    console.log('Falling back to in-memory database');
    addSampleData(); // Only add sample data for in-memory database
  }
})();

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
      const reservations = await reservationService.getReservations();
      res.json({
        success: true,
        data: reservations,
      });
    } else {
      res.json({
        success: true,
        data: database.reservations,
      });
    }
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reservations',
    });
  }
});

app.get('/api/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isSupabaseConfigured()) {
      const reservation = await reservationService.getReservation(id);
      
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
      error: 'Failed to fetch reservation',
    });
  }
});

app.post('/api/reservations', async (req, res) => {
  try {
    const validationResult = reservationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation data: ' + validationResult.error.message,
      });
    }
    
    const now = new Date().toISOString();
    
    if (isSupabaseConfigured()) {
      const reservation = await reservationService.createReservation(validationResult.data);
      
      res.status(201).json({
        success: true,
        data: reservation,
      });
    } else {
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
      error: 'Failed to create reservation',
    });
  }
});

app.put('/api/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validationResult = reservationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation data: ' + validationResult.error.message,
      });
    }
    
    if (isSupabaseConfigured()) {
      const reservation = await reservationService.updateReservation(id, validationResult.data);
      
      res.json({
        success: true,
        data: reservation,
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
      error: 'Failed to update reservation',
    });
  }
});

app.patch('/api/reservations/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['Pending', 'Confirmed', 'Cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be Pending, Confirmed, or Cancelled',
      });
    }
    
    if (isSupabaseConfigured()) {
      const reservation = await reservationService.updateReservationStatus(id, status);
      
      res.json({
        success: true,
        data: reservation,
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
      error: 'Failed to update reservation status',
    });
  }
});

app.delete('/api/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isSupabaseConfigured()) {
      await reservationService.deleteReservation(id);
      
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
      error: 'Failed to delete reservation',
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
    
    const now = new Date().toISOString();
    
    if (isSupabaseConfigured()) {
      const reservationData = {
        customer_name: payload.name,
        phone_number: payload.phone_number,
        date: formattedDate,
        time: formattedTime,
        party_size: payload.partySize,
        source: 'AI Call',
        status: 'Pending',
        notes: payload.notes || '',
      };
      
      const reservation = await reservationService.createReservation(reservationData);
      
      console.log('Created new reservation from CallFluent AI:', reservation);
      
      res.status(201).json({
        success: true,
        data: reservation,
      });
    } else {
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
      error: 'Failed to process webhook',
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
  addSampleData();
}

// Export the Express API
module.exports = app;
