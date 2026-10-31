import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL || 'https://vuyyaqsmlzixhdjvaidj.supabase.co';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_3zXUJ5hz_1cl9sFQqPVqCQ_Tu5KfaCu';
export const supabase = createClient(url, publishableKey, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
});
