import { createClient } from '@supabase/supabase-js';
import * as env from './.env.js';

// Initialize Supabase client
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || '';

// Check if the environment variables are set
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables for server. Check your .env file.');
}

// Create a separate Supabase client for the server
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

export default supabase; 