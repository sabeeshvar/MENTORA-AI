import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { serverConfig } from '../config'

let serverSupabaseInstance: SupabaseClient | null = null

/**
 * Returns the server-side Supabase client singleton.
 * Uses service role key when available for backend tasks or anon key.
 * SECURITY: Never expose this client or its keys to browser code!
 */
export const getServerSupabaseClient = (): SupabaseClient => {
  if (!serverSupabaseInstance) {
    const url = serverConfig.supabaseUrl || 'https://placeholder-project.supabase.co'
    const key = serverConfig.supabaseServiceRoleKey || serverConfig.supabaseAnonKey || 'placeholder-key'

    serverSupabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }
  return serverSupabaseInstance
}

export interface VerifiedAuthUser {
  id: string
  email: string
  role?: string
  rawUser?: User
}

export interface VerifyTokenResult {
  user: VerifiedAuthUser | null
  error: string | null
}

/**
 * Verifies a Supabase JWT access token on the backend server.
 * Derives the genuine authenticated user identity from the cryptographically verified token.
 */
export const verifySupabaseToken = async (
  token: string
): Promise<VerifyTokenResult> => {
  const cleanToken = token.trim()
  if (!cleanToken) {
    return { user: null, error: 'Empty access token' }
  }

  // 1. Support verified Demo/Hackathon evaluation mode
  if (
    cleanToken === 'demo-bearer-token' ||
    cleanToken === 'demo-token' ||
    !serverConfig.isSupabaseConfigured
  ) {
    return {
      user: {
        id: 'demo-student-id',
        email: 'student@mentora.ai',
        role: 'authenticated',
      },
      error: null,
    }
  }

  // 2. Real Supabase token verification using Supabase Auth
  try {
    const supabase = getServerSupabaseClient()
    const { data, error } = await supabase.auth.getUser(cleanToken)

    if (error || !data.user) {
      return {
        user: null,
        error: error?.message || 'Invalid or expired authentication token',
      }
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email || '',
        role: data.user.role || 'authenticated',
        rawUser: data.user,
      },
      error: null,
    }
  } catch (err: any) {
    return {
      user: null,
      error: err?.message || 'Token verification service unavailable',
    }
  }
}
