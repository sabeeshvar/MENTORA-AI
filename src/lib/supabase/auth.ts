import type { User } from '@supabase/supabase-js'
import { supabase } from './client'
import { isSupabaseConfigured } from './config'
import { syncUserDocument, getUserDocument } from './db'
import type { UserProfile, LearningStats } from '@/types/auth'

export const defaultLearningStats: LearningStats = {
  materialsCount: 0,
  quizzesTaken: 0,
  overallMastery: 0,
  questionsAsked: 0,
  streakDays: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
}

export const formatAuthError = (err: unknown): string => {
  if (!err || typeof err !== 'object') {
    return 'An unexpected error occurred. Please try again.'
  }
  const message = (err as { message?: string }).message || ''
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please verify your credentials and try again.'
  }
  if (message.includes('User already registered')) {
    return 'An account with this email address already exists. Please sign in instead.'
  }
  if (message.includes('Password should be at least')) {
    return 'Password should be at least 6 characters long.'
  }
  if (message.includes('rate limit')) {
    return 'Too many attempts. Access is temporarily disabled. Please try again later.'
  }
  return message || 'Authentication failed. Please check your network and credentials.'
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
 * Subscribes to Supabase authentication state changes
 */
export const subscribeToAuth = (callback: (user: UserProfile | null) => void) => {
  if (!isSupabaseConfigured()) {
    const savedDemoUser = localStorage.getItem('mentora_demo_user')
    if (savedDemoUser) {
      try {
        callback(JSON.parse(savedDemoUser))
        return () => {}
      } catch {
        // Ignore
      }
    }
    callback(null)
    return () => {}
  }

  // Initial check
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (session?.user) {
      const existing = await getUserDocument(session.user.id)
      const p = existing || (await syncUserDocument(session.user))
      callback(p)
    } else {
      const savedDemoUser = localStorage.getItem('mentora_demo_user')
      if (savedDemoUser) {
        try {
          callback(JSON.parse(savedDemoUser))
          return
        } catch {
          // Ignore
        }
      }
      callback(null)
    }
  })

  const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      const existing = await getUserDocument(session.user.id)
      const p = existing || (await syncUserDocument(session.user))
      callback(p)
    } else {
      callback(null)
    }
  })

  return () => {
    authListener.subscription.unsubscribe()
  }
}

/**
 * Sign in using Email and Password
 */
export const loginWithEmail = async (email: string, pass: string): Promise<UserProfile> => {
  if (!isSupabaseConfigured()) {
    const demoUser: UserProfile = {
      uid: 'demo-student-id',
      name: email.split('@')[0] || 'Student Learner',
      email,
      photoURL: null,
      role: 'student',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      learningStats: defaultLearningStats,
      displayName: email.split('@')[0] || 'Student Learner',
    }
    localStorage.setItem('mentora_demo_user', JSON.stringify(demoUser))
    return demoUser
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  })

  if (error) {
    throw new Error(formatAuthError(error))
  }

  if (!data.user) {
    throw new Error('Authentication succeeded but user profile was not returned.')
  }

  const existing = await getUserDocument(data.user.id)
  const profile = existing || (await syncUserDocument(data.user))
  localStorage.setItem('mentora_demo_user', JSON.stringify(profile))
  return profile
}

/**
 * Register a new user using Email, Password and Name
 */
export const registerWithEmail = async (
  email: string,
  pass: string,
  name?: string
): Promise<UserProfile> => {
  const chosenName = name?.trim() || email.split('@')[0] || 'Student Learner'

  if (!isSupabaseConfigured()) {
    const demoUser: UserProfile = {
      uid: 'demo-student-id',
      name: chosenName,
      email,
      photoURL: null,
      role: 'student',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      learningStats: defaultLearningStats,
      displayName: chosenName,
    }
    localStorage.setItem('mentora_demo_user', JSON.stringify(demoUser))
    return demoUser
  }

  const { data, error } = await supabase.auth.signUp({
    email,
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

  const profile = await syncUserDocument(data.user, { name: chosenName })
  localStorage.setItem('mentora_demo_user', JSON.stringify(profile))
  return profile
}

/**
 * Sign in using Google OAuth Popup / Redirect
 */
export const loginWithGoogle = async (): Promise<UserProfile> => {
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
    localStorage.setItem('mentora_demo_user', JSON.stringify(demoUser))
    return demoUser
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/dashboard',
    },
  })

  if (error) {
    throw new Error(formatAuthError(error))
  }

  return {
    uid: 'pending-oauth',
    name: 'Google Learner',
    email: '',
    photoURL: null,
    role: 'student',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    learningStats: defaultLearningStats,
    displayName: 'Google Learner',
  }
}

/**
 * Send Password Reset Email
 */
export const resetPassword = async (email: string): Promise<void> => {
  if (!isSupabaseConfigured()) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/login',
  })

  if (error) {
    throw new Error(formatAuthError(error))
  }
}

/**
 * Sign out current user
 */
export const logoutUser = async (): Promise<void> => {
  localStorage.removeItem('mentora_demo_user')
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Logout error:', err)
    }
  }
}
