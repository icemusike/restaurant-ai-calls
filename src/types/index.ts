export interface Reservation {
  id: string;
  customerName: string;
  phoneNumber: string;
  date: string;
  time: string;
  partySize: number;
  source: 'AI Call' | 'Manual';
  status: 'Pending' | 'Confirmed' | 'Cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Restaurant {
  name: string;
  logo: string;
  phone: string;
  address: string;
  openingHours: string;
  callfluentWebhook?: string; // Added webhook URL field
}

export interface ReservationFilters {
  date: Date | null;
  status: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CallFluentPayload {
  customerName: string;
  phoneNumber: string;
  date: string;
  time: string;
  partySize: number;
  notes: string;
  reservationId: string;
}
