import { createClient } from '@supabase/supabase-js';

// Get environment variables from wherever they are available
// In Vercel, they will be in process.env
// In local Node.js server, they should also be in process.env loaded by dotenv
const getEnvVar = (name) => {
  // Check if we're in a browser context
  if (typeof window !== 'undefined' && window.env && window.env[name]) {
    return window.env[name];
  }
  
  // Otherwise use process.env (Node.js context)
  return process.env[name];
};

// Get Supabase credentials
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL') || '';
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY') || '';
const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY') || '';

// Log which credentials we're using (without exposing them)
console.log('Supabase URL available:', !!supabaseUrl);
console.log('Supabase Anon Key available:', !!supabaseAnonKey);
console.log('Supabase Service Role Key available:', !!supabaseServiceKey);

// For server operations, prefer the service role key to bypass RLS
// For client operations, use the anon key
const useServiceKey = typeof window === 'undefined' && !!supabaseServiceKey;
const apiKey = useServiceKey ? supabaseServiceKey : supabaseAnonKey;

if (useServiceKey) {
  console.log('Using Service Role Key for server operations');
} else {
  console.log('Using Anon Key for operations');
}

// Create Supabase client with the appropriate key
const createSupabaseClient = () => {
  if (!supabaseUrl || !apiKey) {
    console.error('Missing Supabase credentials. Database operations will fail.');
    return null;
  }
  
  return createClient(supabaseUrl, apiKey, {
    auth: {
      persistSession: typeof window !== 'undefined', // Only persist sessions in browser context
      autoRefreshToken: typeof window !== 'undefined', // Only auto-refresh in browser context
    }
  });
};

// Create and export the Supabase client
const supabase = createSupabaseClient();

export default supabase; 