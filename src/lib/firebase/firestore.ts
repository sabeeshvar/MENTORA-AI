import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db, isFirebaseConfigured } from './config'
import { deleteStorageFile } from './storage'
import type { UserProfile, LearningStats } from '@/types/auth'
import type { Course, CourseMaterial, CourseMaterialType, MaterialProcessingStatus } from '@/types/course'
import type { ProcessedChunk } from '@/types/chunk'
import type { LearningMaterial } from '@/types/material'
import type { Quiz, QuizAttempt } from '@/types/quiz'
import type { TopicMastery, PersonalizedRecommendation } from '@/types/mastery'

// Collection references
export const COLLECTIONS = {
  USERS: 'users',
  COURSES: 'courses',
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

// ==========================================
// 1. User Document Helpers
// ==========================================
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

// ==========================================
// 2. Course Management Helpers
// ==========================================

/**
 * Creates a new Course document in courses/{courseId}
 */
export const createCourse = async (
  ownerId: string,
  data: { title: string; description: string; subject: string }
): Promise<Course> => {
  if (!ownerId) throw new Error('Authentication required: ownerId missing.')

  const courseId = doc(collection(db, COLLECTIONS.COURSES)).id
  const now = new Date().toISOString()

  const newCourse: Course = {
    courseId,
    ownerId,
    title: data.title.trim(),
    description: data.description.trim(),
    subject: data.subject.trim(),
    createdAt: now,
    updatedAt: now,
    materialsCount: 0,
  }

  if (!isFirebaseConfigured()) {
    const local = localStorage.getItem(`mentora_courses_${ownerId}`)
    const courses: Course[] = local ? JSON.parse(local) : []
    const updated = [newCourse, ...courses]
    localStorage.setItem(`mentora_courses_${ownerId}`, JSON.stringify(updated))
    return newCourse
  }

  const courseRef = doc(db, COLLECTIONS.COURSES, courseId)
  await setDoc(courseRef, newCourse)
  return newCourse
}

/**
 * Retrieves all courses owned by the authenticated student
 */
export const getUserCourses = async (ownerId: string): Promise<Course[]> => {
  if (!ownerId) return []

  if (!isFirebaseConfigured()) {
    const local = localStorage.getItem(`mentora_courses_${ownerId}`)
    const courses: Course[] = local ? JSON.parse(local) : []
    // Enrich with local materials count
    return courses.map((c) => {
      const matLocal = localStorage.getItem(`mentora_course_materials_${c.courseId}`)
      const mats: CourseMaterial[] = matLocal ? JSON.parse(matLocal) : []
      return { ...c, materialsCount: mats.length }
    })
  }

  try {
    const q = query(
      collection(db, COLLECTIONS.COURSES),
      where('ownerId', '==', ownerId),
      orderBy('createdAt', 'desc')
    )
    const snap = await getDocs(q)
    const courses = snap.docs.map((d) => d.data() as Course)

    // Calculate materials count for each course
    const enriched = await Promise.all(
      courses.map(async (c) => {
        try {
          const matSnap = await getDocs(
            collection(db, COLLECTIONS.COURSES, c.courseId, 'materials')
          )
          return { ...c, materialsCount: matSnap.size }
        } catch {
          return { ...c, materialsCount: 0 }
        }
      })
    )

    return enriched
  } catch (err) {
    console.warn('Error fetching courses from Firestore, attempting fallback:', err)
    const local = localStorage.getItem(`mentora_courses_${ownerId}`)
    return local ? JSON.parse(local) : []
  }
}

/**
 * Retrieves a single course by ID, enforcing that ownerId matches
 */
export const getCourseById = async (
  courseId: string,
  ownerId: string
): Promise<Course | null> => {
  if (!courseId || !ownerId) return null

  if (!isFirebaseConfigured()) {
    const local = localStorage.getItem(`mentora_courses_${ownerId}`)
    const courses: Course[] = local ? JSON.parse(local) : []
    const match = courses.find((c) => c.courseId === courseId)
    if (!match || match.ownerId !== ownerId) return null
    return match
  }

  const courseRef = doc(db, COLLECTIONS.COURSES, courseId)
  const snap = await getDoc(courseRef)
  if (!snap.exists()) return null

  const course = snap.data() as Course
  if (course.ownerId !== ownerId) {
    throw new Error('Access denied: You do not have permission to view this course.')
  }
  return course
}

/**
 * Deletes a course and all its subcollection materials
 */
export const deleteCourse = async (courseId: string, ownerId: string): Promise<void> => {
  if (!courseId || !ownerId) return

  // First verify authorization
  const course = await getCourseById(courseId, ownerId)
  if (!course) throw new Error('Course not found or unauthorized')

  if (!isFirebaseConfigured()) {
    const local = localStorage.getItem(`mentora_courses_${ownerId}`)
    const courses: Course[] = local ? JSON.parse(local) : []
    const updated = courses.filter((c) => c.courseId !== courseId)
    localStorage.setItem(`mentora_courses_${ownerId}`, JSON.stringify(updated))
    localStorage.removeItem(`mentora_course_materials_${courseId}`)
    return
  }

  // Delete all material documents in subcollection
  try {
    const materialsSnap = await getDocs(
      collection(db, COLLECTIONS.COURSES, courseId, 'materials')
    )
    for (const mDoc of materialsSnap.docs) {
      const matData = mDoc.data() as CourseMaterial
      if (matData.storagePath) {
        await deleteStorageFile(matData.storagePath)
      }
      await deleteDoc(mDoc.ref)
    }
  } catch (err) {
    console.warn('Error clearing subcollection materials:', err)
  }

  // Delete main course document
  await deleteDoc(doc(db, COLLECTIONS.COURSES, courseId))
}

// ==========================================
// 3. Course Materials Subcollection Helpers
// courses/{courseId}/materials/{materialId}
// ==========================================

/**
 * Adds a new material to courses/{courseId}/materials/{materialId}
 */
export const addCourseMaterial = async (
  courseId: string,
  ownerId: string,
  data: {
    name: string
    type: CourseMaterialType
    storagePath: string
    downloadURL: string
    fileSizeBytes?: number
    processingStatus?: MaterialProcessingStatus
  }
): Promise<CourseMaterial> => {
  // Verify course ownership
  const course = await getCourseById(courseId, ownerId)
  if (!course) throw new Error('Course not found or unauthorized')

  const materialId = doc(
    collection(db, COLLECTIONS.COURSES, courseId, 'materials')
  ).id
  const now = new Date().toISOString()

  const newMaterial: CourseMaterial = {
    materialId,
    courseId,
    name: data.name,
    type: data.type,
    storagePath: data.storagePath,
    downloadURL: data.downloadURL,
    uploadedAt: now,
    processingStatus: data.processingStatus || 'ready',
    fileSizeBytes: data.fileSizeBytes,
  }

  if (!isFirebaseConfigured()) {
    const local = localStorage.getItem(`mentora_course_materials_${courseId}`)
    const list: CourseMaterial[] = local ? JSON.parse(local) : []
    const updated = [newMaterial, ...list]
    localStorage.setItem(`mentora_course_materials_${courseId}`, JSON.stringify(updated))
    return newMaterial
  }

  const matRef = doc(db, COLLECTIONS.COURSES, courseId, 'materials', materialId)
  await setDoc(matRef, newMaterial)

  // Update course's updatedAt
  try {
    await setDoc(
      doc(db, COLLECTIONS.COURSES, courseId),
      { updatedAt: now },
      { merge: true }
    )
  } catch {
    // Continue
  }

  return newMaterial
}

/**
 * Retrieves all materials in courses/{courseId}/materials
 */
export const getCourseMaterials = async (
  courseId: string,
  ownerId: string
): Promise<CourseMaterial[]> => {
  // Verify ownership
  const course = await getCourseById(courseId, ownerId)
  if (!course) throw new Error('Course not found or unauthorized')

  if (!isFirebaseConfigured()) {
    const local = localStorage.getItem(`mentora_course_materials_${courseId}`)
    return local ? JSON.parse(local) : []
  }

  try {
    const q = query(
      collection(db, COLLECTIONS.COURSES, courseId, 'materials'),
      orderBy('uploadedAt', 'desc')
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => d.data() as CourseMaterial)
  } catch (err) {
    console.warn('Error fetching course materials from Firestore:', err)
    const local = localStorage.getItem(`mentora_course_materials_${courseId}`)
    return local ? JSON.parse(local) : []
  }
}

/**
 * Deletes a material from courses/{courseId}/materials/{materialId} and its file from Storage
 */
export const deleteCourseMaterial = async (
  courseId: string,
  materialId: string,
  ownerId: string,
  storagePath?: string
): Promise<void> => {
  // Verify ownership
  const course = await getCourseById(courseId, ownerId)
  if (!course) throw new Error('Course not found or unauthorized')

  if (!isFirebaseConfigured()) {
    const local = localStorage.getItem(`mentora_course_materials_${courseId}`)
    const list: CourseMaterial[] = local ? JSON.parse(local) : []
    const updated = list.filter((m) => m.materialId !== materialId)
    localStorage.setItem(`mentora_course_materials_${courseId}`, JSON.stringify(updated))
    localStorage.removeItem(`mentora_chunks_${courseId}_${materialId}`)
    return
  }

  // Delete from Storage
  if (storagePath) {
    await deleteStorageFile(storagePath)
  }

  // Delete chunks subcollection first
  try {
    const chunksSnap = await getDocs(
      collection(db, COLLECTIONS.COURSES, courseId, 'materials', materialId, 'chunks')
    )
    if (!chunksSnap.empty) {
      const batch = writeBatch(db)
      chunksSnap.docs.forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
  } catch (err) {
    console.warn('Could not cleanly delete chunks subcollection:', err)
  }

  // Delete document from Firestore
  const matRef = doc(db, COLLECTIONS.COURSES, courseId, 'materials', materialId)
  await deleteDoc(matRef)
}

/**
 * Updates processing status of a course material (uploaded -> processing -> processed | failed)
 */
export const updateMaterialProcessingStatus = async (
  courseId: string,
  materialId: string,
  status: MaterialProcessingStatus,
  extra?: { chunksCount?: number; errorMessage?: string }
): Promise<void> => {
  if (!courseId || !materialId) return

  // Update in localStorage cache/fallback
  const localKey = `mentora_course_materials_${courseId}`
  const local = localStorage.getItem(localKey)
  if (local) {
    try {
      const list: CourseMaterial[] = JSON.parse(local)
      const updated = list.map((m) =>
        m.materialId === materialId
          ? {
              ...m,
              processingStatus: status,
              ...(extra?.chunksCount !== undefined ? { chunksCount: extra.chunksCount } : {}),
              ...(extra?.errorMessage !== undefined ? { errorMessage: extra.errorMessage } : {}),
            }
          : m
      )
      localStorage.setItem(localKey, JSON.stringify(updated))
    } catch {
      // Ignore
    }
  }

  if (!isFirebaseConfigured()) return

  try {
    const matRef = doc(db, COLLECTIONS.COURSES, courseId, 'materials', materialId)
    const updatePayload: Record<string, any> = { processingStatus: status }
    if (extra?.chunksCount !== undefined) {
      updatePayload.chunksCount = extra.chunksCount
    }
    if (extra?.errorMessage !== undefined) {
      updatePayload.errorMessage = extra.errorMessage
    }
    await updateDoc(matRef, updatePayload)
  } catch (err) {
    console.warn(`Could not update material ${materialId} status to ${status} in Firestore:`, err)
  }
}

/**
 * Stores processed chunks in Firestore subcollection:
 * courses/{courseId}/materials/{materialId}/chunks/{chunkId}
 */
export const saveMaterialChunks = async (
  courseId: string,
  materialId: string,
  chunks: ProcessedChunk[]
): Promise<void> => {
  if (!courseId || !materialId || !chunks) return

  // Always cache locally for instant UI responsiveness and offline fallback
  const cacheKey = `mentora_chunks_${courseId}_${materialId}`
  localStorage.setItem(cacheKey, JSON.stringify(chunks))

  if (!isFirebaseConfigured()) return

  try {
    // Firestore batch limit is 500 writes
    const CHUNK_BATCH_SIZE = 400
    for (let i = 0; i < chunks.length; i += CHUNK_BATCH_SIZE) {
      const slice = chunks.slice(i, i + CHUNK_BATCH_SIZE)
      const batch = writeBatch(db)

      for (const chunk of slice) {
        const chunkDocRef = doc(
          db,
          COLLECTIONS.COURSES,
          courseId,
          'materials',
          materialId,
          'chunks',
          chunk.chunkId
        )
        batch.set(chunkDocRef, chunk)
      }

      await batch.commit()
    }
  } catch (err) {
    console.warn('Could not save chunks to Firestore subcollection, saved to local cache:', err)
  }
}

/**
 * Retrieves all processed chunks for a material, ordered by chunkIndex
 */
export const getMaterialChunks = async (
  courseId: string,
  materialId: string
): Promise<ProcessedChunk[]> => {
  if (!courseId || !materialId) return []

  const cacheKey = `mentora_chunks_${courseId}_${materialId}`

  if (!isFirebaseConfigured()) {
    const local = localStorage.getItem(cacheKey)
    return local ? JSON.parse(local) : []
  }

  try {
    const q = query(
      collection(db, COLLECTIONS.COURSES, courseId, 'materials', materialId, 'chunks'),
      orderBy('chunkIndex', 'asc')
    )
    const snap = await getDocs(q)
    if (!snap.empty) {
      const chunks = snap.docs.map((d) => d.data() as ProcessedChunk)
      // Refresh local cache
      localStorage.setItem(cacheKey, JSON.stringify(chunks))
      return chunks
    }
  } catch (err) {
    console.warn('Failed to query chunks from Firestore, checking local cache:', err)
  }

  // Fallback to local cache if Firestore returned empty or failed
  const fallback = localStorage.getItem(cacheKey)
  return fallback ? JSON.parse(fallback) : []
}

// ==========================================
// 4. Legacy Material Helpers (Maintained)
// ==========================================
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

// ==========================================
// 5. Schema: users/{uid}/mastery/{topicId}
// ==========================================

export const saveTopicMastery = async (mastery: TopicMastery): Promise<void> => {
  if (!mastery.userId || !mastery.topicId) return

  const localKey = `mentora_mastery_${mastery.userId}`
  const local = localStorage.getItem(localKey)
  const existing: TopicMastery[] = local ? JSON.parse(local) : []
  const updated = [mastery, ...existing.filter((m) => m.topicId !== mastery.topicId)]
  localStorage.setItem(localKey, JSON.stringify(updated))

  if (!isFirebaseConfigured()) return

  try {
    const masteryRef = doc(db, COLLECTIONS.USERS, mastery.userId, 'mastery', mastery.topicId)
    await setDoc(masteryRef, mastery, { merge: true })
  } catch (err) {
    console.warn('Error persisting topic mastery to Firestore:', err)
  }
}

export const getUserTopicMasteries = async (userId: string): Promise<TopicMastery[]> => {
  if (!userId) return []

  const localKey = `mentora_mastery_${userId}`
  if (!isFirebaseConfigured()) {
    const local = localStorage.getItem(localKey)
    return local ? JSON.parse(local) : []
  }

  try {
    const q = collection(db, COLLECTIONS.USERS, userId, 'mastery')
    const snap = await getDocs(q)
    if (!snap.empty) {
      const data = snap.docs.map((d) => d.data() as TopicMastery)
      localStorage.setItem(localKey, JSON.stringify(data))
      return data
    }
  } catch (err) {
    console.warn('Error fetching user topic masteries from Firestore:', err)
  }

  const local = localStorage.getItem(localKey)
  return local ? JSON.parse(local) : []
}

export const getUserMastery = getUserTopicMasteries

export const getTopicMastery = async (userId: string, topicId: string): Promise<TopicMastery | null> => {
  if (!userId || !topicId) return null
  const all = await getUserTopicMasteries(userId)
  return all.find((m) => m.topicId === topicId) || null
}

// ==========================================
// 6. Schema: users/{uid}/quizAttempts/{attemptId}
// ==========================================

export const saveUserQuizAttempt = async (attempt: QuizAttempt): Promise<void> => {
  if (!attempt.userId || !attempt.attemptId) return

  const localKey = `mentora_attempts_${attempt.userId}`
  const local = localStorage.getItem(localKey)
  const existing: QuizAttempt[] = local ? JSON.parse(local) : []
  localStorage.setItem(localKey, JSON.stringify([attempt, ...existing]))

  if (!isFirebaseConfigured()) return

  try {
    const attemptRef = doc(db, COLLECTIONS.USERS, attempt.userId, 'quizAttempts', attempt.attemptId)
    await setDoc(attemptRef, attempt)
  } catch (err) {
    console.warn('Error saving quiz attempt to Firestore:', err)
  }
}

export const saveQuizAttempt = saveUserQuizAttempt

export const getUserQuizAttempts = async (userId: string, courseId?: string): Promise<QuizAttempt[]> => {
  if (!userId) return []

  const localKey = `mentora_attempts_${userId}`
  if (!isFirebaseConfigured()) {
    const local = localStorage.getItem(localKey)
    const all: QuizAttempt[] = local ? JSON.parse(local) : []
    return courseId ? all.filter((a) => a.courseId === courseId) : all
  }

  try {
    const q = query(
      collection(db, COLLECTIONS.USERS, userId, 'quizAttempts'),
      orderBy('completedAt', 'desc')
    )
    const snap = await getDocs(q)
    if (!snap.empty) {
      const data = snap.docs.map((d) => d.data() as QuizAttempt)
      localStorage.setItem(localKey, JSON.stringify(data))
      return courseId ? data.filter((a) => a.courseId === courseId) : data
    }
  } catch (err) {
    console.warn('Error fetching quiz attempts from Firestore:', err)
  }

  const local = localStorage.getItem(localKey)
  const all: QuizAttempt[] = local ? JSON.parse(local) : []
  return courseId ? all.filter((a) => a.courseId === courseId) : all
}

// ==========================================
// 7. Schema: users/{uid}/recommendations/{recommendationId}
// ==========================================

export const saveUserRecommendations = async (
  userId: string,
  recs: PersonalizedRecommendation[]
): Promise<void> => {
  if (!userId) return

  const localKey = `mentora_recs_${userId}`
  localStorage.setItem(localKey, JSON.stringify(recs))

  if (!isFirebaseConfigured()) return

  try {
    const batch = writeBatch(db)
    for (const rec of recs) {
      const ref = doc(db, COLLECTIONS.USERS, userId, 'recommendations', rec.recommendationId)
      batch.set(ref, rec)
    }
    await batch.commit()
  } catch (err) {
    console.warn('Error saving recommendations to Firestore:', err)
  }
}

export const getUserRecommendations = async (userId: string): Promise<PersonalizedRecommendation[]> => {
  if (!userId) return []

  const localKey = `mentora_recs_${userId}`
  if (!isFirebaseConfigured()) {
    const local = localStorage.getItem(localKey)
    return local ? JSON.parse(local) : []
  }

  try {
    const snap = await getDocs(collection(db, COLLECTIONS.USERS, userId, 'recommendations'))
    if (!snap.empty) {
      const data = snap.docs.map((d) => d.data() as PersonalizedRecommendation)
      localStorage.setItem(localKey, JSON.stringify(data))
      return data
    }
  } catch (err) {
    console.warn('Error fetching recommendations from Firestore:', err)
  }

  const local = localStorage.getItem(localKey)
  return local ? JSON.parse(local) : []
}

// ==========================================
// 8. Schema: quizzes/{quizId}
// ==========================================

export const saveQuiz = async (quiz: Quiz): Promise<void> => {
  if (!quiz.quizId) return

  const localKey = `mentora_quiz_${quiz.quizId}`
  localStorage.setItem(localKey, JSON.stringify(quiz))

  const userQuizzesKey = `mentora_quizzes_${quiz.userId}`
  const userQuizzesLocal = localStorage.getItem(userQuizzesKey)
  const existing: Quiz[] = userQuizzesLocal ? JSON.parse(userQuizzesLocal) : []
  localStorage.setItem(userQuizzesKey, JSON.stringify([quiz, ...existing.filter((q) => q.quizId !== quiz.quizId)]))

  if (!isFirebaseConfigured()) return

  try {
    await setDoc(doc(db, COLLECTIONS.QUIZZES, quiz.quizId), quiz)
  } catch (err) {
    console.warn('Error saving quiz to Firestore:', err)
  }
}

export const getQuizById = async (quizId: string): Promise<Quiz | null> => {
  if (!quizId) return null

  if (!isFirebaseConfigured()) {
    const local = localStorage.getItem(`mentora_quiz_${quizId}`)
    return local ? JSON.parse(local) : null
  }

  try {
    const snap = await getDoc(doc(db, COLLECTIONS.QUIZZES, quizId))
    if (snap.exists()) {
      return snap.data() as Quiz
    }
  } catch (err) {
    console.warn('Error fetching quiz from Firestore:', err)
  }

  const local = localStorage.getItem(`mentora_quiz_${quizId}`)
  return local ? JSON.parse(local) : null
}

export const getCourseQuizzes = async (userId: string, courseId?: string): Promise<Quiz[]> => {
  if (!userId) return []

  const localKey = `mentora_quizzes_${userId}`
  if (!isFirebaseConfigured()) {
    const local = localStorage.getItem(localKey)
    const list: Quiz[] = local ? JSON.parse(local) : []
    return courseId ? list.filter((q) => q.courseId === courseId) : list
  }

  try {
    const q = courseId
      ? query(collection(db, COLLECTIONS.QUIZZES), where('courseId', '==', courseId))
      : query(collection(db, COLLECTIONS.QUIZZES), where('userId', '==', userId))
    const snap = await getDocs(q)
    return snap.docs.map((d) => d.data() as Quiz)
  } catch (err) {
    console.warn('Error fetching quizzes from Firestore:', err)
    const local = localStorage.getItem(localKey)
    const list: Quiz[] = local ? JSON.parse(local) : []
    return courseId ? list.filter((q) => q.courseId === courseId) : list
  }
}

export const getQuizzesForTopic = async (userId: string, topic?: string): Promise<Quiz[]> => {
  const all = await getCourseQuizzes(userId)
  return topic ? all.filter((q) => q.topic.toLowerCase() === topic.toLowerCase()) : all
}

