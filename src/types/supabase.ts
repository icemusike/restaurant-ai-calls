export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      reservations: {
        Row: {
          id: string;
          customer_name: string;
          phone_number: string;
          date: string;
          time: string;
          party_size: number;
          source: 'AI Call' | 'Manual';
          status: 'Pending' | 'Confirmed' | 'Cancelled';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_name: string;
          phone_number: string;
          date: string;
          time: string;
          party_size: number;
          source: 'AI Call' | 'Manual';
          status: 'Pending' | 'Confirmed' | 'Cancelled';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_name?: string;
          phone_number?: string;
          date?: string;
          time?: string;
          party_size?: number;
          source?: 'AI Call' | 'Manual';
          status?: 'Pending' | 'Confirmed' | 'Cancelled';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      reservation_source: 'AI Call' | 'Manual';
      reservation_status: 'Pending' | 'Confirmed' | 'Cancelled';
    };
  };
}; 