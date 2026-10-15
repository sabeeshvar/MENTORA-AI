import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseUrl, supabaseAnonKey, isSupabaseConfigured } from './config'

let supabaseInstance: SupabaseClient | null = null

/**
 * Returns the singleton centralized Supabase client.
 * Validates configuration and raises a clear descriptive warning when keys are missing.
 */
export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseInstance) {
    if (!isSupabaseConfigured()) {
      console.warn(
        '[MENTORA AI] ⚠️ Supabase environment variables are missing, incomplete, or unconfigured.\n' +
        'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are defined in your .env file.\n' +
        'Example:\n' +
        '  VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
        '  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      )
    }

    const effectiveUrl = supabaseUrl || 'https://placeholder-project.supabase.co'
    const effectiveKey = supabaseAnonKey || 'placeholder-anon-key'

    supabaseInstance = createClient(effectiveUrl, effectiveKey, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return supabaseInstance
}

/**
 * Resets the Supabase client instance (used by test suites)
 */
export const resetSupabaseClientForTesting = (): void => {
  supabaseInstance = null
}

export const supabase = getSupabaseClient()

