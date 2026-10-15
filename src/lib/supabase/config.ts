/**
 * MENTORA AI — Centralized Supabase Configuration
 * Reads frontend variables:
 * - import.meta.env.VITE_SUPABASE_URL
 * - import.meta.env.VITE_SUPABASE_ANON_KEY
 * 
 * SECURITY NOTICE:
 * Never import or expose SUPABASE_SERVICE_ROLE_KEY or GEMINI_API_KEY in frontend code!
 */

const stripQuotes = (val: string): string => {
  if (!val) return ''
  return val.trim().replace(/^["']|["']$/g, '').trim()
}

const rawUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) 
  ? String((import.meta as any).env.VITE_SUPABASE_URL) 
  : (typeof process !== 'undefined' && process.env ? String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '') : '')

const rawAnonKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) 
  ? String((import.meta as any).env.VITE_SUPABASE_ANON_KEY) 
  : (typeof process !== 'undefined' && process.env ? String(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '') : '')

/**
 * Sanitize URL:
 * 1. Strips accidental quotes or whitespace
 * 2. Prepends https:// if protocol was omitted
 * 3. Strips /rest/v1 or /rest/v1/ suffix to obtain root project domain
 * 4. Strips trailing slashes
 */
export const sanitizeSupabaseUrl = (url: string): string => {
  let clean = stripQuotes(url)
  if (!clean) return ''
  
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`
  }
  
  return clean
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/+$/, '')
}

export const supabaseUrl = sanitizeSupabaseUrl(rawUrl)
export const supabaseAnonKey = stripQuotes(rawAnonKey)

/**
 * Extracts Supabase project ref (e.g. 'eqhlzfbzcjgxbdpttibz') from project URL
 */
export const getSupabaseProjectRef = (url: string = supabaseUrl): string => {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname
    if (hostname.endsWith('.supabase.co')) {
      return hostname.split('.')[0]
    }
    return hostname
  } catch {
    return ''
  }
}

export const supabaseProjectRef = getSupabaseProjectRef(supabaseUrl)

/**
 * Resolves the valid OAuth Redirect URL for the current environment.
 * Local development: http://localhost:5173/auth/callback
 * Production: https://<domain>/auth/callback
 */
export const getOAuthRedirectUrl = (): string => {
  const g = typeof globalThis !== 'undefined' ? (globalThis as any) : {}
  if (g.window?.location?.origin) {
    return `${g.window.location.origin}/auth/callback`
  }
  if (g.location?.origin) {
    return `${g.location.origin}/auth/callback`
  }
  return 'http://localhost:5173/auth/callback'
}


/**
 * Checks whether valid Supabase configuration is present
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your_supabase_project_url') &&
    !supabaseUrl.includes('your-project') &&
    !supabaseUrl.includes('placeholder-project') &&
    supabaseAnonKey &&
    !supabaseAnonKey.includes('your_supabase_anon_key') &&
    !supabaseAnonKey.includes('placeholder')
  )
}

export interface SupabaseHealthResult {
  reachable: boolean
  status?: number
  error?: string
  isDnsFailure?: boolean
  projectRef: string
}

/**
 * Fast network probe to verify if the configured Supabase endpoint is reachable.
 * Distinguishes DNS NXDOMAIN / ENOTFOUND from HTTP errors or CORS.
 */
export const checkSupabaseReachability = async (
  timeoutMs = 4000
): Promise<SupabaseHealthResult> => {
  if (!isSupabaseConfigured()) {
    return {
      reachable: false,
      error: 'Supabase URL or Anon Key is not configured.',
      projectRef: supabaseProjectRef,
    }
  }

  const endpoint = `${supabaseUrl}/auth/v1/health`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    return {
      reachable: res.ok || res.status === 200 || res.status === 401,
      status: res.status,
      projectRef: supabaseProjectRef,
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    const errMessage = String(err?.message || err)
    const isDns =
      errMessage.includes('ENOTFOUND') ||
      errMessage.includes('fetch failed') ||
      errMessage.includes('Failed to fetch') ||
      err?.name === 'TypeError'

    return {
      reachable: false,
      error: isDns
        ? `DNS or connection failure: cannot reach ${supabaseUrl}. The Supabase project may be paused, deleted, or unresolvable.`
        : errMessage,
      isDnsFailure: isDns,
      projectRef: supabaseProjectRef,
    }
  }
}

export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  projectRef: supabaseProjectRef,
  getOAuthRedirectUrl,
}

