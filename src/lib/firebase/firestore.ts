import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db, isFirebaseConfigured } from './config'
import type { UserProfile, LearningStats } from '@/types/auth'
import type { LearningMaterial } from '@/types/material'
import type { Quiz, QuizAttempt } from '@/types/quiz'
import type { TopicMastery } from '@/types/mastery'

// Collection references
export const COLLECTIONS = {
  USERS: 'users',
  MATERIALS: 'materials',
  QUIZZES: 'quizzes',
  QUIZ_ATTEMPTS: 'quiz_attempts',
  MASTERY: 'mastery',
} as const

export const defaultLearningStats: LearningStats = {
  materialsCount: 0,
  quizzesTaken: 0,
  overallMastery: 0,
  questionsAsked: 0,
  streakDays: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
}

// User Document Helpers
export const getUserDocument = async (uid: string): Promise<UserProfile | null> => {
  if (!isFirebaseConfigured()) {
    const local = localStorage.getItem(`mentora_user_${uid}`) || localStorage.getItem('mentora_demo_user')
    if (local) {
      try {
        return JSON.parse(local) as UserProfile
      } catch {
        return null
      }
    }
    return null
  }

  try {
    const userRef = doc(db, COLLECTIONS.USERS, uid)
    const snap = await getDoc(userRef)
    if (snap.exists()) {
      const data = snap.data() as UserProfile
      return {
        ...data,
        displayName: data.name || data.displayName,
      }
    }
    return null
  } catch (err) {
    console.warn('Error retrieving user document from Firestore:', err)
    return null
  }
}

export const syncUserDocument = async (
  firebaseUser: User,
  additionalData?: { name?: string; role?: 'student' | 'educator' }
): Promise<UserProfile> => {
  const existing = await getUserDocument(firebaseUser.uid)
  const now = new Date().toISOString()
  const name =
    additionalData?.name ||
    existing?.name ||
    firebaseUser.displayName ||
    (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Student')

  const userProfile: UserProfile = {
    uid: firebaseUser.uid,
    name,
    email: firebaseUser.email,
    photoURL: firebaseUser.photoURL || existing?.photoURL || null,
    role: existing?.role || additionalData?.role || 'student',
    createdAt: existing?.createdAt || firebaseUser.metadata.creationTime || now,
    lastLoginAt: now,
    learningStats: existing?.learningStats || defaultLearningStats,
    displayName: name,
  }

  if (!isFirebaseConfigured()) {
    localStorage.setItem(`mentora_user_${firebaseUser.uid}`, JSON.stringify(userProfile))
    localStorage.setItem('mentora_demo_user', JSON.stringify(userProfile))
    return userProfile
  }

  try {
    const userRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid)
    await setDoc(userRef, userProfile, { merge: true })
  } catch (err) {
    console.warn('Could not sync user to Firestore (falling back to local cache):', err)
    localStorage.setItem(`mentora_user_${firebaseUser.uid}`, JSON.stringify(userProfile))
  }

  return userProfile
}


// Material Helpers
export const getUserMaterials = async (userId: string): Promise<LearningMaterial[]> => {
  if (!isFirebaseConfigured()) {
    const local = localStorage.getItem(`mentora_materials_${userId}`)
    return local ? JSON.parse(local) : []
  }
  const q = query(
    collection(db, COLLECTIONS.MATERIALS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LearningMaterial)
}

export const saveMaterial = async (material: LearningMaterial): Promise<void> => {
  if (!isFirebaseConfigured()) {
    const current = await getUserMaterials(material.userId)
    const updated = [material, ...current.filter((m) => m.id !== material.id)]
    localStorage.setItem(`mentora_materials_${material.userId}`, JSON.stringify(updated))
    return
  }
  await setDoc(doc(db, COLLECTIONS.MATERIALS, material.id), material)
}

// Quiz Helpers
export const getQuizzesForTopic = async (userId: string, topic?: string): Promise<Quiz[]> => {
  if (!isFirebaseConfigured()) {
    const local = localStorage.getItem(`mentora_quizzes_${userId}`)
    const all: Quiz[] = local ? JSON.parse(local) : []
    return topic ? all.filter((q) => q.topic.toLowerCase() === topic.toLowerCase()) : all
  }
  const q = query(collection(db, COLLECTIONS.QUIZZES), where('userId', '==', userId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Quiz)
}

export const saveQuizAttempt = async (attempt: QuizAttempt): Promise<void> => {
  if (!isFirebaseConfigured()) {
    const key = `mentora_attempts_${attempt.userId}`
    const local = localStorage.getItem(key)
    const all: QuizAttempt[] = local ? JSON.parse(local) : []
    localStorage.setItem(key, JSON.stringify([attempt, ...all]))
    return
  }
  await setDoc(doc(db, COLLECTIONS.QUIZ_ATTEMPTS, attempt.id), attempt)
}

// Mastery Helpers
export const getUserMastery = async (userId: string): Promise<TopicMastery[]> => {
  if (!isFirebaseConfigured()) {
    const local = localStorage.getItem(`mentora_mastery_${userId}`)
    return local ? JSON.parse(local) : []
  }
  const q = query(collection(db, COLLECTIONS.MASTERY), where('userId', '==', userId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TopicMastery)
}
