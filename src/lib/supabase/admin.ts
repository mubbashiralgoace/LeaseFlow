import { createClient } from '@supabase/supabase-js';

// Admin client for server-side operations (webhooks, etc.)
// Uses service role key to bypass RLS
export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set! Webhooks will fail due to RLS policies.');
    console.error('Please add SUPABASE_SERVICE_ROLE_KEY to .env.local');
    // Fallback to anon key (will fail with RLS, but at least won't crash)
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  console.log('✅ Using service role key for admin operations');
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

