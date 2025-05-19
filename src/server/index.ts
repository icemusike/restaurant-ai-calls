import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { z } from 'zod';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Reservation, ApiResponse } from '../types';
import { createCallfluentService } from './callfluentService';
import reservationService from '../services/reservationService';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

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
app.get('/api/reservations', async (_req, res) => {
  try {
    const reservations = await reservationService.getReservations();
    const response: ApiResponse<Reservation[]> = {
      success: true,
      data: reservations,
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
app.get('/api/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const reservation = await reservationService.getReservation(id);
    
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
    
    // Create the reservation in Supabase
    const newReservation = await reservationService.createReservation(validationResult.data);
    
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
app.put('/api/reservations/:id', async (req, res) => {
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
    
    // Check if reservation exists
    const existingReservation = await reservationService.getReservation(id);
    if (!existingReservation) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Reservation not found',
      };
      return res.status(404).json(response);
    }
    
    // Update the reservation in Supabase
    const updatedReservation = await reservationService.updateReservation(id, validationResult.data);
    
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
    
    // Check if reservation exists
    const existingReservation = await reservationService.getReservation(id);
    if (!existingReservation) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Reservation not found',
      };
      return res.status(404).json(response);
    }
    
    const oldStatus = existingReservation.status;
    
    // Update status in Supabase
    const updatedReservation = await reservationService.updateReservationStatus(
      id, 
      status as 'Pending' | 'Confirmed' | 'Cancelled'
    );
    
    // If status changed to Confirmed, trigger a confirmation call via CallFluent
    if (status === 'Confirmed' && oldStatus !== 'Confirmed') {
      const callfluentService = createCallfluentService();
      if (callfluentService) {
        try {
          await callfluentService.triggerConfirmationCall(updatedReservation);
        } catch (error) {
          console.error('Error triggering CallFluent confirmation call:', error);
        }
      }
    }
    
    const response: ApiResponse<Reservation> = {
      success: true,
      data: updatedReservation,
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
app.delete('/api/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if reservation exists
    const existingReservation = await reservationService.getReservation(id);
    if (!existingReservation) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Reservation not found',
      };
      return res.status(404).json(response);
    }
    
    // Delete from Supabase
    await reservationService.deleteReservation(id);
    
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
app.post('/api/webhook/callfluent', async (req, res) => {
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
    
    // Create new reservation from CallFluent webhook data
    const reservationData = {
      customerName: payload.name,
      phoneNumber: payload.phone_number,
      date: formattedDate,
      time: formattedTime,
      partySize: payload.partySize,
      source: 'AI Call' as const,
      status: 'Pending' as const,
      notes: payload.notes || '',
    };
    
    // Save to Supabase
    const newReservation = await reservationService.createReservation(reservationData);
    
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
 *       500:
 *         description: Connection failed
 */
app.post('/api/callfluent/test', async (_req, res) => {
  try {
    const callfluentService = createCallfluentService();
    if (!callfluentService) {
      return res.status(400).json({
        success: false,
        error: 'CallFluent service not configured'
      });
    }
    
    // Create a test reservation to use for the connection test
    const testReservation: Reservation = {
      id: 'test-id',
      customerName: 'Test Customer',
      phoneNumber: '+1234567890',
      date: new Date().toISOString().split('T')[0],
      time: '18:00:00',
      partySize: 2,
      source: 'Manual',
      status: 'Pending',
      notes: 'This is a test reservation for API connection verification',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Call the service without actually triggering a real call
    const result = await callfluentService.triggerConfirmationCall(testReservation);
    
    if (result) {
      return res.json({
        success: true,
        message: 'Successfully connected to CallFluent API'
      });
    } else {
      return res.status(500).json({
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
 *     summary: Trigger a reminder call for a reservation
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
 *       500:
 *         description: Error triggering reminder call
 */
app.post('/api/callfluent/trigger-reminder/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the reservation
    const reservation = await reservationService.getReservation(id);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found'
      });
    }
    
    // Initialize CallFluent service
    const callfluentService = createCallfluentService();
    if (!callfluentService) {
      return res.status(400).json({
        success: false,
        error: 'CallFluent service not configured'
      });
    }
    
    // Trigger the reminder call
    const result = await callfluentService.triggerReminderCall(reservation);
    
    if (result) {
      return res.json({
        success: true,
        message: 'Reminder call triggered successfully'
      });
    } else {
      return res.status(500).json({
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

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`API documentation available at http://localhost:${PORT}/api-docs`);
});
