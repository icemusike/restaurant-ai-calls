import { createClient } from '@supabase/supabase-js';

// These values should be set in your .env file and are exposed to the client by Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string || '';

// Log the values for debugging - remove in production
console.log('Client Supabase URL:', supabaseUrl ? 'configured' : 'missing');
console.log('Client Supabase Key:', supabaseAnonKey ? 'configured' : 'missing');

// Check if the environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase; 