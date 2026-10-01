import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from './config'
import { syncUserDocument, getUserDocument, defaultLearningStats } from './firestore'
import type { UserProfile } from '@/types/auth'

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

/**
 * Format Firebase Auth error codes into clean user-friendly messages
 */
export const formatAuthError = (err: unknown): string => {
  if (!err || typeof err !== 'object') {
    return 'An unexpected error occurred. Please try again.'
  }

  const code = (err as { code?: string }).code || ''
  const message = (err as { message?: string }).message || ''

  switch (code) {
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your credentials and try again.'
    case 'auth/user-not-found':
      return 'No account found with this email address.'
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again or use the forgot password link.'
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.'
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Access is temporarily disabled. Please reset your password or try again later.'
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing.'
    case 'auth/cancelled-popup-request':
      return 'Sign-in popup was cancelled.'
    case 'auth/network-request-failed':
      return 'Network connection error. Please verify your internet connection.'
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in the Firebase Console.'
    default:
      if (message) {
        // Strip Firebase prefix if present (e.g. "Firebase: Error (auth/...)")
        return message.replace(/^Firebase:\s*/, '').replace(/\(auth\/[^)]+\)\.?/, '').trim() || 'Authentication failed. Please try again.'
      }
      return 'Authentication failed. Please try again.'
  }
}

/**
 * Subscribe to Firebase auth state changes and sync with Firestore user document
 */
export const subscribeToAuth = (callback: (user: UserProfile | null) => void) => {
  if (!isFirebaseConfigured()) {
    const savedDemoUser = localStorage.getItem('mentora_demo_user')
    if (savedDemoUser) {
      try {
        callback(JSON.parse(savedDemoUser))
        return () => {}
      } catch {
        // Ignore JSON error
      }
    }
    callback(null)
    return () => {}
  }

  return onAuthStateChanged(auth, async (firebaseUser: User | null) => {
    if (firebaseUser) {
      try {
        const userDoc = await getUserDocument(firebaseUser.uid)
        if (userDoc) {
          callback(userDoc)
        } else {
          const syncedUser = await syncUserDocument(firebaseUser)
          callback(syncedUser)
        }
      } catch (err) {
        console.warn('Error reading user profile from Firestore:', err)
        // Fallback user object
        callback({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Student',
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          role: 'student',
          createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          learningStats: defaultLearningStats,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Student',
        })
      }
    } else {
      callback(null)
    }
  })
}

/**
 * Sign in using Email and Password
 */
export const loginWithEmail = async (email: string, pass: string): Promise<UserProfile> => {
  if (!isFirebaseConfigured()) {
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

  try {
    const credential = await signInWithEmailAndPassword(auth, email, pass)
    return await syncUserDocument(credential.user)
  } catch (err) {
    throw new Error(formatAuthError(err))
  }
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

  if (!isFirebaseConfigured()) {
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

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, pass)
    
    // Update Firebase Auth profile
    try {
      await updateProfile(credential.user, { displayName: chosenName })
    } catch {
      // Continue even if updateProfile fails
    }

    // Create Firestore document with role: 'student' and default learningStats
    return await syncUserDocument(credential.user, {
      name: chosenName,
      role: 'student',
    })
  } catch (err) {
    throw new Error(formatAuthError(err))
  }
}

/**
 * Sign in or sign up using Google OAuth Popup
 */
export const loginWithGoogle = async (): Promise<UserProfile> => {
  if (!isFirebaseConfigured()) {
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

  try {
    const credential = await signInWithPopup(auth, googleProvider)
    return await syncUserDocument(credential.user, { role: 'student' })
  } catch (err) {
    throw new Error(formatAuthError(err))
  }
}

/**
 * Send Password Reset Email
 */
export const resetPassword = async (email: string): Promise<void> => {
  if (!isFirebaseConfigured()) {
    // Local demo simulation
    await new Promise((resolve) => setTimeout(resolve, 600))
    return
  }

  try {
    await sendPasswordResetEmail(auth, email)
  } catch (err) {
    throw new Error(formatAuthError(err))
  }
}

/**
 * Sign out current user
 */
export const logoutUser = async (): Promise<void> => {
  localStorage.removeItem('mentora_demo_user')
  if (isFirebaseConfigured()) {
    try {
      await signOut(auth)
    } catch (err) {
      console.error('Logout error:', err)
    }
  }
}

