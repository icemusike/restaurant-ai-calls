import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// These values should be set in your .env file
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Check if the environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export default supabase; 