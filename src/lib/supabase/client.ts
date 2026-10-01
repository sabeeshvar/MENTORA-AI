import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseUrl, supabaseAnonKey, isSupabaseConfigured } from './config'

let supabaseInstance: SupabaseClient | null = null

/**
 * Returns the singleton centralized Supabase client.
 * Validates configuration and raises a clear descriptive error when keys are missing.
 */
export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseInstance) {
    if (!isSupabaseConfigured()) {
      console.error(
        '[MENTORA AI] ⚠️ Supabase environment variables are missing or incomplete!\n' +
        'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are defined in your .env file.\n' +
        'Example:\n' +
        '  VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
        '  VITE_SUPABASE_ANON_KEY=your_supabase_anon_key'
      )
    }

    const effectiveUrl = supabaseUrl || 'https://placeholder-project.supabase.co'
    const effectiveKey = supabaseAnonKey || 'placeholder-anon-key'

    supabaseInstance = createClient(effectiveUrl, effectiveKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return supabaseInstance
}

export const supabase = getSupabaseClient()
