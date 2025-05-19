import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { z } from 'zod';
import { Reservation, CallFluentPayload, ApiResponse } from '../types';
import { createCallfluentService } from './callfluentService';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database path (JSON file for simplicity)
const DB_PATH = path.join(__dirname, 'db.json');

// Initialize database if it doesn't exist
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ reservations: [] }));
}

// Helper functions for database operations
const readDatabase = (): { reservations: Reservation[] } => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { reservations: [] };
  }
};

const writeDatabase = (data: { reservations: Reservation[] }): void => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing to database:', error);
  }
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
  customerName: z.string().min(1, 'Customer name is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  date: z.string(),
  time: z.string(),
  partySize: z.number().int().positive('Party size must be a positive integer'),
  notes: z.string().optional(),
});

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Restaurant Reservation API',
      version: '1.0.0',
      description: 'API for managing restaurant reservations with CallFluent AI integration',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/server/index.ts'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /api/reservations:
 *   get:
 *     summary: Get all reservations
 *     responses:
 *       200:
 *         description: List of all reservations
 */
app.get('/api/reservations', (req, res) => {
  try {
    const db = readDatabase();
    const response: ApiResponse<Reservation[]> = {
      success: true,
      data: db.reservations,
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch reservations',
    };
    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/reservations/{id}:
 *   get:
 *     summary: Get a reservation by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation details
 *       404:
 *         description: Reservation not found
 */
app.get('/api/reservations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = readDatabase();
    const reservation = db.reservations.find(r => r.id === id);
    
    if (!reservation) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Reservation not found',
      };
      return res.status(404).json(response);
    }
    
    const response: ApiResponse<Reservation> = {
      success: true,
      data: reservation,
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching reservation:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch reservation',
    };
    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/reservations:
 *   post:
 *     summary: Create a new reservation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Reservation created successfully
 *       400:
 *         description: Invalid request data
 */
app.post('/api/reservations', async (req, res) => {
  try {
    const validationResult = reservationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid reservation data: ' + validationResult.error.message,
      };
      return res.status(400).json(response);
    }
    
    const db = readDatabase();
    const now = new Date().toISOString();
    
    const newReservation: Reservation = {
      id: uuidv4(),
      ...validationResult.data,
      createdAt: now,
      updatedAt: now,
    };
    
    db.reservations.push(newReservation);
    writeDatabase(db);
    
    // Send SMS notification if enabled (would be implemented with Twilio)
    // sendSmsNotification(newReservation);
    
    // Trigger CallFluent AI call if enabled
    const callfluentService = createCallfluentService();
    if (callfluentService) {
      try {
        await callfluentService.triggerConfirmationCall(newReservation);
      } catch (error) {
        console.error('Error triggering CallFluent call:', error);
      }
    }
    
    const response: ApiResponse<Reservation> = {
      success: true,
      data: newReservation,
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating reservation:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to create reservation',
    };
    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/reservations/{id}:
 *   put:
 *     summary: Update a reservation
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Reservation updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Reservation not found
 */
app.put('/api/reservations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const validationResult = reservationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid reservation data: ' + validationResult.error.message,
      };
      return res.status(400).json(response);
    }
    
    const db = readDatabase();
    const index = db.reservations.findIndex(r => r.id === id);
    
    if (index === -1) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Reservation not found',
      };
      return res.status(404).json(response);
    }
    
    const updatedReservation: Reservation = {
      ...db.reservations[index],
      ...validationResult.data,
      updatedAt: new Date().toISOString(),
    };
    
    db.reservations[index] = updatedReservation;
    writeDatabase(db);
    
    const response: ApiResponse<Reservation> = {
      success: true,
      data: updatedReservation,
    };
    res.json(response);
  } catch (error) {
    console.error('Error updating reservation:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to update reservation',
    };
    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/reservations/{id}/status:
 *   patch:
 *     summary: Update reservation status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Pending, Confirmed, Cancelled]
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Reservation not found
 */
app.patch('/api/reservations/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['Pending', 'Confirmed', 'Cancelled'].includes(status)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid status. Must be Pending, Confirmed, or Cancelled',
      };
      return res.status(400).json(response);
    }
    
    const db = readDatabase();
    const index = db.reservations.findIndex(r => r.id === id);
    
    if (index === -1) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Reservation not found',
      };
      return res.status(404).json(response);
    }
    
    const oldStatus = db.reservations[index].status;
    db.reservations[index].status = status;
    db.reservations[index].updatedAt = new Date().toISOString();
    writeDatabase(db);
    
    // If status changed to Confirmed, trigger a confirmation call via CallFluent
    if (status === 'Confirmed' && oldStatus !== 'Confirmed') {
      const callfluentService = createCallfluentService();
      if (callfluentService) {
        try {
          await callfluentService.triggerConfirmationCall(db.reservations[index]);
        } catch (error) {
          console.error('Error triggering CallFluent confirmation call:', error);
        }
      }
    }
    
    const response: ApiResponse<Reservation> = {
      success: true,
      data: db.reservations[index],
    };
    res.json(response);
  } catch (error) {
    console.error('Error updating reservation status:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to update reservation status',
    };
    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/reservations/{id}:
 *   delete:
 *     summary: Delete a reservation
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation deleted successfully
 *       404:
 *         description: Reservation not found
 */
app.delete('/api/reservations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = readDatabase();
    const index = db.reservations.findIndex(r => r.id === id);
    
    if (index === -1) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Reservation not found',
      };
      return res.status(404).json(response);
    }
    
    db.reservations.splice(index, 1);
    writeDatabase(db);
    
    const response: ApiResponse<null> = {
      success: true,
    };
    res.json(response);
  } catch (error) {
    console.error('Error deleting reservation:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to delete reservation',
    };
    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/webhook/callfluent:
 *   post:
 *     summary: Webhook endpoint for CallFluent AI
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Reservation created successfully
 *       400:
 *         description: Invalid request data
 */
app.post('/api/webhook/callfluent', (req, res) => {
  try {
    console.log('Received webhook from CallFluent AI:', req.body);
    
    const validationResult = callFluentPayloadSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.error('Invalid CallFluent payload:', validationResult.error.message);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid payload: ' + validationResult.error.message,
      };
      return res.status(400).json(response);
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
        const response: ApiResponse<null> = {
          success: false,
          error: 'Invalid date format',
        };
        return res.status(400).json(response);
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
          const response: ApiResponse<null> = {
            success: false,
            error: 'Invalid time format',
          };
          return res.status(400).json(response);
        }
      }
    }
    
    // Add seconds if missing
    if (formattedTime.match(/^\d{2}:\d{2}$/)) {
      formattedTime = `${formattedTime}:00`;
    }
    
    const db = readDatabase();
    const now = new Date().toISOString();
    
    const newReservation: Reservation = {
      id: uuidv4(),
      customerName: payload.customerName,
      phoneNumber: payload.phoneNumber,
      date: formattedDate,
      time: formattedTime,
      partySize: payload.partySize,
      source: 'AI Call',
      status: 'Pending',
      notes: payload.notes,
      createdAt: now,
      updatedAt: now,
    };
    
    db.reservations.push(newReservation);
    writeDatabase(db);
    
    // Send SMS notification if enabled (would be implemented with Twilio)
    // sendSmsNotification(newReservation);
    
    console.log('Created new reservation from CallFluent AI:', newReservation);
    
    const response: ApiResponse<Reservation> = {
      success: true,
      data: newReservation,
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('Error processing CallFluent webhook:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to process webhook',
    };
    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/callfluent/test:
 *   post:
 *     summary: Test CallFluent API connection
 *     responses:
 *       200:
 *         description: Connection successful
 *       400:
 *         description: Connection failed
 */
app.post('/api/callfluent/test', async (req, res) => {
  try {
    const callfluentService = createCallfluentService();
    if (!callfluentService) {
      return res.status(400).json({
        success: false,
        error: 'CallFluent service not configured'
      });
    }
    
    // Simple test message to verify connection
    const testReservation: Reservation = {
      id: 'test-id',
      customerName: 'Test Customer',
      phoneNumber: '+15551234567', // This should be a valid test number
      date: new Date().toISOString().split('T')[0],
      time: '18:00:00',
      partySize: 2,
      source: 'Manual',
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // We're not actually making the call, just testing the connection
    const result = await callfluentService.triggerConfirmationCall(testReservation);
    
    if (result) {
      return res.json({
        success: true,
        message: 'Successfully connected to CallFluent API'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Failed to connect to CallFluent API'
      });
    }
  } catch (error) {
    console.error('Error testing CallFluent connection:', error);
    return res.status(500).json({
      success: false,
      error: 'Error testing CallFluent connection'
    });
  }
});

/**
 * @swagger
 * /api/callfluent/trigger-reminder/{id}:
 *   post:
 *     summary: Manually trigger a reminder call for a reservation
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reminder call triggered successfully
 *       404:
 *         description: Reservation not found
 *       400:
 *         description: Failed to trigger call
 */
app.post('/api/callfluent/trigger-reminder/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = readDatabase();
    const reservation = db.reservations.find(r => r.id === id);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found'
      });
    }
    
    const callfluentService = createCallfluentService();
    if (!callfluentService) {
      return res.status(400).json({
        success: false,
        error: 'CallFluent service not configured'
      });
    }
    
    const result = await callfluentService.triggerReminderCall(reservation);
    
    if (result) {
      return res.json({
        success: true,
        message: 'Reminder call triggered successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Failed to trigger reminder call'
      });
    }
  } catch (error) {
    console.error('Error triggering reminder call:', error);
    return res.status(500).json({
      success: false,
      error: 'Error triggering reminder call'
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API documentation available at http://localhost:${PORT}/api-docs`);
});
