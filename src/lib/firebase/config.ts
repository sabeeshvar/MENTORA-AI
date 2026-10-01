import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

// Universal environment variable resolver (supports both Vite client and Node.js test runners)
const getEnvVar = (key: string, defaultValue = ''): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key]
    }
  } catch {
    // Ignore
  }
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key]
    }
  } catch {
    // Ignore
  }
  return defaultValue
}

// Check if Firebase is properly configured with real credentials
export const isFirebaseConfigured = (): boolean => {
  const apiKey = getEnvVar('VITE_FIREBASE_API_KEY')
  const projectId = getEnvVar('VITE_FIREBASE_PROJECT_ID')
  return Boolean(
    apiKey &&
    apiKey.trim() !== '' &&
    !apiKey.includes('mock-') &&
    !apiKey.includes('your_') &&
    projectId &&
    !projectId.includes('your-')
  )
}

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY', 'AIzaSyDemoPlaceholderKey1234567890'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', 'mentora-ai.firebaseapp.com'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', 'mentora-ai'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', 'mentora-ai.appspot.com'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', '1234567890'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID', '1:1234567890:web:mockappid'),
}

let app: FirebaseApp
let auth: Auth
let db: Firestore
let storage: FirebaseStorage

try {
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
} catch (error) {
  console.warn('Firebase initialization notice (running in local fallback mode):', error)
  if (getApps().length > 0) {
    app = getApps()[0]
  } else {
    try {
      app = initializeApp({
        apiKey: 'demo-fallback-key',
        projectId: 'mentora-ai-demo',
      })
    } catch {
      app = {} as FirebaseApp
    }
  }
  try {
    auth = getAuth(app)
  } catch {
    auth = {} as Auth
  }
  try {
    db = getFirestore(app)
  } catch {
    db = {} as Firestore
  }
  try {
    storage = getStorage(app)
  } catch {
    storage = {} as FirebaseStorage
  }
}

export { app, auth, db, storage }

