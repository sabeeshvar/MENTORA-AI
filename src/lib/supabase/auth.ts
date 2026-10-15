import type { User, Session } from '@supabase/supabase-js'
import { supabase } from './client'
import { isSupabaseConfigured, getOAuthRedirectUrl, supabaseUrl } from './config'
import { syncUserDocument, getUserDocument, safeStorage } from './db'
import type { UserProfile, LearningStats } from '@/types/auth'

export const defaultLearningStats: LearningStats = {
  materialsCount: 0,
  quizzesTaken: 0,
  overallMastery: 0,
  questionsAsked: 0,
  streakDays: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
}

/**
 * Parses and formats authentication errors into user-friendly, actionable messages.
 * Directly identifies DNS resolution failures (NXDOMAIN), network errors, or paused projects.
 */
export const formatAuthError = (err: unknown): string => {
  if (!err) {
    return 'An unexpected error occurred. Please try again.'
  }

  const message = typeof err === 'string' 
    ? err 
    : (err as { message?: string }).message || String(err)

  // 1. DNS & Network Resolution Failures (NXDOMAIN / ENOTFOUND)
  if (
    message.includes('ENOTFOUND') ||
    message.includes('fetch failed') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('getaddrinfo')
  ) {
    return `Cannot connect to Supabase (${supabaseUrl || 'project'}). The project may be paused, unresolvable (DNS NXDOMAIN), or offline. Please verify the project in your Supabase Dashboard.`
  }

  // 2. Authentication Failures
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please verify your credentials and try again.'
  }
  if (message.includes('User already registered') || message.includes('already registered')) {
    return 'An account with this email address already exists. Please sign in instead.'
  }
  if (message.includes('Password should be at least')) {
    return 'Password must be at least 6 characters long.'
  }
  if (message.includes('Email not confirmed')) {
    return 'Your email address has not been confirmed yet. Please check your inbox for the verification link.'
  }
  if (message.includes('rate limit') || message.includes('Too many requests')) {
    return 'Too many attempts. Access is temporarily rate-limited. Please wait a few moments and try again.'
  }
  if (message.includes('invalid_grant')) {
    return 'The authentication code or session has expired. Please sign in again.'
  }

  return message || 'Authentication failed. Please check your credentials and network connection.'
}

/**
 * Converts Supabase auth user to MENTORA UserProfile
 */
export const mapSupabaseUserToProfile = (
  user: User,
  additionalData?: { name?: string; role?: 'student' | 'educator' }
): UserProfile => {
  const chosenName =
    additionalData?.name ||
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'Student Learner'

  return {
    uid: user.id,
    name: chosenName,
    email: user.email || '',
    photoURL: user.user_metadata?.avatar_url || null,
    role: additionalData?.role || user.user_metadata?.role || 'student',
    createdAt: user.created_at || new Date().toISOString(),
    lastLoginAt: user.last_sign_in_at || new Date().toISOString(),
    learningStats: defaultLearningStats,
    displayName: chosenName,
  }
}

/**
 * Subscribes to Supabase authentication state changes.
 * Avoids race conditions by relying on onAuthStateChange as the single source of truth.
 * Ensures the callback is ALWAYS called (never hangs the UI loading state).
 */
export const subscribeToAuth = (
  callback: (user: UserProfile | null, session?: Session | null) => void
) => {
  if (!isSupabaseConfigured()) {
    const savedDemoUser = safeStorage.getItem('mentora_demo_user')
    if (savedDemoUser) {
      try {
        callback(JSON.parse(savedDemoUser), null)
        return () => {}
      } catch {
        // Fall through
      }
    }
    callback(null, null)
    return () => {}
  }

  let isCancelled = false

  const resolveProfileForUser = async (user: User): Promise<UserProfile> => {
    try {
      // Race getUserDocument with a 3.5s timeout so the app never freezes if DB is slow
      const profilePromise = getUserDocument(user.id)
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 3500)
      )
      const existing = await Promise.race([profilePromise, timeoutPromise])

      if (existing) return existing

      // Try sync if no profile was found
      return await syncUserDocument(user)
    } catch (err) {
      console.warn('[Auth] Falling back to mapped profile due to database notice:', err)
      return mapSupabaseUserToProfile(user)
    }
  }

  const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (isCancelled) return

    if (session?.user) {
      const profile = await resolveProfileForUser(session.user)
      if (!isCancelled) {
        callback(profile, session)
      }
    } else {
      // User is logged out
      if (!isCancelled) {
        callback(null, null)
      }
    }
  })

  // Backup safety timeout: if onAuthStateChange hasn't responded within 4s, check getSession
  const backupTimeout = setTimeout(async () => {
    if (isCancelled) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const profile = await resolveProfileForUser(session.user)
        if (!isCancelled) callback(profile, session)
      } else {
        if (!isCancelled) callback(null, null)
      }
    } catch {
      if (!isCancelled) callback(null, null)
    }
  }, 4000)

  return () => {
    isCancelled = true
    clearTimeout(backupTimeout)
    authListener.subscription.unsubscribe()
  }
}

/**
 * Returns current access token for authenticating backend API requests
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (!isSupabaseConfigured()) {
    return 'demo-bearer-token'
  }
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  } catch {
    return null
  }
}

/**
 * Sign in using Email and Password
 */
export const loginWithEmail = async (email: string, pass: string): Promise<UserProfile> => {
  const cleanEmail = email.trim()
  if (!cleanEmail) {
    throw new Error('Please enter a valid email address.')
  }
  if (!pass) {
    throw new Error('Please enter your password.')
  }

  // Support instant Hackathon reviewer demo credentials
  if (cleanEmail.toLowerCase() === 'student@mentora.ai' && pass === 'demo1234') {
    const demoUser: UserProfile = {
      uid: 'demo-student-id',
      name: 'Student Learner',
      email: 'student@mentora.ai',
      photoURL: null,
      role: 'student',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      learningStats: defaultLearningStats,
      displayName: 'Student Learner',
    }
    safeStorage.setItem('mentora_demo_user', JSON.stringify(demoUser))
    return demoUser
  }

  if (!isSupabaseConfigured()) {
    const demoUser: UserProfile = {
      uid: 'demo-student-id',
      name: cleanEmail.split('@')[0] || 'Student Learner',
      email: cleanEmail,
      photoURL: null,
      role: 'student',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      learningStats: defaultLearningStats,
      displayName: cleanEmail.split('@')[0] || 'Student Learner',
    }
    safeStorage.setItem('mentora_demo_user', JSON.stringify(demoUser))
    return demoUser
  }


  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: pass,
  })

  if (error) {
    throw new Error(formatAuthError(error))
  }

  if (!data.user) {
    throw new Error('Authentication succeeded but user profile was not returned.')
  }

  const existing = await getUserDocument(data.user.id)
  return existing || (await syncUserDocument(data.user))
}

/**
 * Register a new user using Email, Password and Name
 */
export const registerWithEmail = async (
  email: string,
  pass: string,
  name?: string
): Promise<UserProfile> => {
  const cleanEmail = email.trim()
  const chosenName = name?.trim() || cleanEmail.split('@')[0] || 'Student Learner'

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.')
  }
  if (!pass || pass.length < 6) {
    throw new Error('Password must be at least 6 characters long.')
  }

  if (!isSupabaseConfigured()) {
    const demoUser: UserProfile = {
      uid: 'demo-student-id',
      name: chosenName,
      email: cleanEmail,
      photoURL: null,
      role: 'student',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      learningStats: defaultLearningStats,
      displayName: chosenName,
    }
    safeStorage.setItem('mentora_demo_user', JSON.stringify(demoUser))
    return demoUser
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: pass,
    options: {
      data: {
        name: chosenName,
        full_name: chosenName,
        role: 'student',
      },
    },
  })

  if (error) {
    throw new Error(formatAuthError(error))
  }

  if (!data.user) {
    throw new Error('Registration succeeded but user profile was not returned.')
  }

  // Handle case where email verification is required by Supabase project settings
  if (!data.session) {
    return {
      uid: data.user.id,
      name: chosenName,
      email: cleanEmail,
      photoURL: null,
      role: 'student',
      createdAt: data.user.created_at || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      learningStats: defaultLearningStats,
      displayName: chosenName,
      emailConfirmationRequired: true,
    }
  }

  return await syncUserDocument(data.user, { name: chosenName })
}

/**
 * Initiates Sign in using Google OAuth (PKCE Flow)
 * Redirects the browser to Google OAuth provider.
 */
export const loginWithGoogle = async (): Promise<{ url?: string; isRedirecting: boolean }> => {
  if (!isSupabaseConfigured()) {
    const demoUser: UserProfile = {
      uid: 'demo-google-user',
      name: 'Google Learner',
      email: 'learner@mentora.ai',
      photoURL: null,
      role: 'student',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      learningStats: defaultLearningStats,
      displayName: 'Google Learner',
    }
    safeStorage.setItem('mentora_demo_user', JSON.stringify(demoUser))
    return { isRedirecting: false }
  }

  const redirectUrl = getOAuthRedirectUrl()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    throw new Error(formatAuthError(error))
  }

  return { url: data?.url, isRedirecting: true }
}

/**
 * Processes OAuth or Recovery Callback on /auth/callback route
 */
export const handleOAuthCallback = async (
  code?: string | null
): Promise<{ user: UserProfile | null; error: string | null }> => {
  if (!isSupabaseConfigured()) {
    const local = safeStorage.getItem('mentora_demo_user')
    return { user: local ? JSON.parse(local) : null, error: null }
  }

  try {
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        return { user: null, error: formatAuthError(error) }
      }
      if (data.user) {
        const profile = await syncUserDocument(data.user)
        return { user: profile, error: null }
      }
    }

    // Implicit flow or existing session in URL
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      return { user: null, error: formatAuthError(sessionError) }
    }

    if (session?.user) {
      const existing = await getUserDocument(session.user.id)
      const profile = existing || (await syncUserDocument(session.user))
      return { user: profile, error: null }
    }

    return { user: null, error: 'No active authentication session found.' }
  } catch (err) {
    return { user: null, error: formatAuthError(err) }
  }
}

/**
 * Send Password Reset Email
 */
export const resetPassword = async (email: string): Promise<void> => {
  const cleanEmail = email.trim()
  if (!cleanEmail) {
    throw new Error('Please enter a valid email address.')
  }

  if (!isSupabaseConfigured()) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return
  }

  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: getOAuthRedirectUrl(),
  })

  if (error) {
    throw new Error(formatAuthError(error))
  }
}

/**
 * Sign out current user and clear local session state
 */
export const logoutUser = async (): Promise<void> => {
  safeStorage.removeItem('mentora_demo_user')
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Logout notice:', err)
    }
  }
}

