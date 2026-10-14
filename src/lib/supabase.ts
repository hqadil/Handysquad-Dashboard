// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://esrzijhaxdharvbtldpq.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzcnppamhheGRoYXJ2YnRsZHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NDU4MDQsImV4cCI6MjEwNzUyMTgwNH0.Wa67ka_Zg_JHX-gMs8AavfpyPkGS4GrLu_WMzcpvRVk';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
