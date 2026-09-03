import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!supabaseUrl) {
    console.warn("NEXT_PUBLIC_SUPABASE_URL is missing. Database requests will fail.");
  } else {
    try {
      console.log({
        supabaseConfigured: true,
        supabaseHost: new URL(supabaseUrl).host
      });
    } catch (e) {
      // ignore invalid URL format during parsing
    }
  }

  return createSupabaseClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
}
