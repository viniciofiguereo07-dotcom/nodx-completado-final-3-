import { createClient } from '@supabase/supabase-js';

// Try environment variables first, fallback to hardcoded values for Bolt environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';

if (!supabaseUrl || supabaseUrl === '') {
  throw new Error('VITE_SUPABASE_URL is not defined. Check your .env file.');
}
if (!supabaseAnonKey || supabaseAnonKey === '') {
  throw new Error('VITE_SUPABASE_ANON_KEY is not defined. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
