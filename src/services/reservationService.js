import supabase from './supabaseService';

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

// Mapping function to convert from app format to DB format
const mapReservationToDb = (reservation) => {
  console.log('Converting reservation to DB format:', reservation);
  const dbData = {
    customer_name: reservation.customerName,
    phone_number: reservation.phoneNumber,
    date: reservation.date,
    time: reservation.time,
    party_size: reservation.partySize,
    source: reservation.source,
    status: reservation.status,
    notes: reservation.notes,
  };
  console.log('DB format data:', dbData);
  return dbData;
};

const reservationService = {
  // Get all reservations
  async getReservations() {
    console.log('Fetching all reservations from Supabase');
    
    if (!supabase) {
      console.error('Supabase client not initialized');
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) {
        console.error('Error fetching reservations:', error);
        throw error;
      }

      if (!data) {
        console.log('No reservation data returned from Supabase');
        return [];
      }

      console.log(`Found ${data.length} reservations in database`);
      return data.map(mapDbToReservation);
    } catch (err) {
      console.error('Unexpected error fetching reservations:', err);
      return [];
    }
  },

  // Get a single reservation by ID
  async getReservation(id) {
    console.log(`Fetching reservation with ID ${id} from Supabase`);
    
    if (!supabase) {
      console.error('Supabase client not initialized');
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Error fetching reservation ${id}:`, error);
        throw error;
      }

      return data ? mapDbToReservation(data) : null;
    } catch (err) {
      console.error('Unexpected error fetching reservation:', err);
      return null;
    }
  },

  // Create a new reservation
  async createReservation(reservation) {
    console.log('Creating new reservation in Supabase:', reservation);
    
    if (!supabase) {
      console.error('Supabase client not initialized');
      throw new Error('Database connection not available');
    }
    
    try {
      const dbReservation = mapReservationToDb(reservation);
      console.log('About to insert reservation into Supabase:', dbReservation);
      
      const { data, error } = await supabase
        .from('reservations')
        .insert(dbReservation)
        .select()
        .single();

      if (error) {
        console.error('Error creating reservation:', error);
        // Check if this is a permission error
        if (error.message.includes('permission')) {
          console.error('This appears to be a permissions issue. Check your RLS policies in Supabase.');
        }
        
        if (error.code === '23505') {
          console.error('This appears to be a unique constraint violation. Check for duplicate records.');
        }
        
        throw error;
      }

      if (!data) {
        console.error('No data returned after insert operation');
        throw new Error('No data returned after creating reservation');
      }

      console.log('Successfully created reservation:', data);
      return mapDbToReservation(data);
    } catch (err) {
      console.error('Unexpected error during reservation creation:', err);
      throw err;
    }
  },

  // Update an existing reservation
  async updateReservation(id, reservation) {
    console.log(`Updating reservation with ID ${id} in Supabase`);
    
    if (!supabase) {
      console.error('Supabase client not initialized');
      throw new Error('Database connection not available');
    }
    
    try {
      const dbReservation = mapReservationToDb(reservation);

      const { data, error } = await supabase
        .from('reservations')
        .update(dbReservation)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating reservation ${id}:`, error);
        throw error;
      }

      if (!data) {
        throw new Error(`No data returned after updating reservation ${id}`);
      }

      return mapDbToReservation(data);
    } catch (err) {
      console.error('Unexpected error updating reservation:', err);
      throw err;
    }
  },

  // Update just the status of a reservation
  async updateReservationStatus(id, status) {
    console.log(`Updating status to ${status} for reservation ${id} in Supabase`);
    
    if (!supabase) {
      console.error('Supabase client not initialized');
      throw new Error('Database connection not available');
    }
    
    try {
      const { data, error } = await supabase
        .from('reservations')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating status for reservation ${id}:`, error);
        throw error;
      }

      if (!data) {
        throw new Error(`No data returned after updating status for reservation ${id}`);
      }

      return mapDbToReservation(data);
    } catch (err) {
      console.error('Unexpected error updating reservation status:', err);
      throw err;
    }
  },

  // Delete a reservation
  async deleteReservation(id) {
    console.log(`Deleting reservation with ID ${id} from Supabase`);
    
    if (!supabase) {
      console.error('Supabase client not initialized');
      throw new Error('Database connection not available');
    }
    
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Error deleting reservation ${id}:`, error);
        throw error;
      }
      
      console.log(`Successfully deleted reservation ${id}`);
    } catch (err) {
      console.error('Unexpected error deleting reservation:', err);
      throw err;
    }
  },
};

export default reservationService; 