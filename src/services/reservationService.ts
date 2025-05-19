import { supabase } from '../lib/supabase';
import { Reservation } from '../types';

// Mapping function to convert from DB format to app format
const mapDbToReservation = (dbReservation: any): Reservation => {
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
const mapReservationToDb = (reservation: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>) => {
  return {
    customer_name: reservation.customerName,
    phone_number: reservation.phoneNumber,
    date: reservation.date,
    time: reservation.time,
    party_size: reservation.partySize,
    source: reservation.source,
    status: reservation.status,
    notes: reservation.notes,
  };
};

export const reservationService = {
  // Get all reservations
  async getReservations(): Promise<Reservation[]> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      console.error('Error fetching reservations:', error);
      throw error;
    }

    return data.map(mapDbToReservation);
  },

  // Get a single reservation by ID
  async getReservation(id: string): Promise<Reservation | null> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching reservation:', error);
      throw error;
    }

    return data ? mapDbToReservation(data) : null;
  },

  // Create a new reservation
  async createReservation(reservation: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Reservation> {
    const dbReservation = mapReservationToDb(reservation);

    const { data, error } = await supabase
      .from('reservations')
      .insert(dbReservation)
      .select()
      .single();

    if (error) {
      console.error('Error creating reservation:', error);
      throw error;
    }

    return mapDbToReservation(data);
  },

  // Update an existing reservation
  async updateReservation(id: string, reservation: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Reservation> {
    const dbReservation = mapReservationToDb(reservation);

    const { data, error } = await supabase
      .from('reservations')
      .update(dbReservation)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating reservation:', error);
      throw error;
    }

    return mapDbToReservation(data);
  },

  // Update just the status of a reservation
  async updateReservationStatus(id: string, status: 'Pending' | 'Confirmed' | 'Cancelled'): Promise<Reservation> {
    const { data, error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating reservation status:', error);
      throw error;
    }

    return mapDbToReservation(data);
  },

  // Delete a reservation
  async deleteReservation(id: string): Promise<void> {
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting reservation:', error);
      throw error;
    }
  },
};

export default reservationService; 