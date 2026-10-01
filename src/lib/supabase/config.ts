/**
 * MENTORA AI — Centralized Supabase Configuration
 * Reads frontend variables:
 * - import.meta.env.VITE_SUPABASE_URL
 * - import.meta.env.VITE_SUPABASE_ANON_KEY
 * 
 * SECURITY NOTICE:
 * Never import or expose SUPABASE_SERVICE_ROLE_KEY or GEMINI_API_KEY in frontend code!
 */

const rawUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) 
  ? String(import.meta.env.VITE_SUPABASE_URL).trim() 
  : (typeof process !== 'undefined' && process.env ? String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim() : '')

const rawAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) 
  ? String(import.meta.env.VITE_SUPABASE_ANON_KEY).trim() 
  : (typeof process !== 'undefined' && process.env ? String(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim() : '')

/**
 * Sanitize URL: if /rest/v1/ is provided at the end, strip it to obtain the project root domain
 * which is required by @supabase/supabase-js for Auth, Storage, and REST routers.
 */
export const sanitizeSupabaseUrl = (url: string): string => {
  if (!url) return ''
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

export const supabaseUrl = sanitizeSupabaseUrl(rawUrl)
export const supabaseAnonKey = rawAnonKey

/**
 * Checks whether valid Supabase configuration is present
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your_supabase_project_url') &&
    !supabaseUrl.includes('your-project') &&
    supabaseAnonKey &&
    !supabaseAnonKey.includes('your_supabase_anon_key') &&
    !supabaseAnonKey.includes('placeholder')
  )
}

export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
}
