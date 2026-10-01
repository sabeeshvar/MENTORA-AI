import { supabase } from './client'
import { isSupabaseConfigured } from './config'
import type { UserProfile, LearningStats } from '@/types/auth'
import type { Course, CourseMaterial, MaterialProcessingStatus } from '@/types/course'
import type { ProcessedChunk } from '@/types/chunk'
import type { Quiz, QuizAttempt } from '@/types/quiz'
import type { TopicMastery, PersonalizedRecommendation } from '@/types/mastery'
import type { StudyPlan } from '@/types/studyPlan'
import type { RevisionItem } from '@/types/revision'

export const defaultLearningStats: LearningStats = {
  materialsCount: 0,
  quizzesTaken: 0,
  overallMastery: 0,
  questionsAsked: 0,
  streakDays: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
}

// ==========================================
// 1. User Profiles
// ==========================================

export const getUserDocument = async (uid: string): Promise<UserProfile | null> => {
  if (!uid) return null
  if (!isSupabaseConfigured()) {
    const local = localStorage.getItem(`mentora_user_${uid}`) || localStorage.getItem('mentora_demo_user')
    return local ? JSON.parse(local) : null
  }

  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (error || !data) return null
    return {
      uid: data.id,
      name: data.name || data.display_name,
      email: data.email,
      photoURL: data.photo_url,
      role: data.role,
      createdAt: data.created_at,
      lastLoginAt: data.updated_at,
      learningStats: data.learning_stats || defaultLearningStats,
      displayName: data.display_name || data.name,
      preferredLanguage: data.preferred_language || 'en',
    }
  } catch (err) {
    console.warn('Error reading profile from Supabase:', err)
    return null
  }
}

export const syncUserDocument = async (
  user: { id?: string; uid?: string; email?: string; displayName?: string; user_metadata?: any },
  additionalData?: { name?: string; role?: 'student' | 'educator'; preferredLanguage?: string }
): Promise<UserProfile> => {
  const uid = user.id || user.uid || 'demo-user-id'
  const email = user.email || ''
  const name =
    additionalData?.name ||
    user.displayName ||
    user.user_metadata?.name ||
    (email ? email.split('@')[0] : 'Student')
  const role = additionalData?.role || user.user_metadata?.role || 'student'
  const lang = additionalData?.preferredLanguage || 'en'
  const now = new Date().toISOString()

  const profile: UserProfile = {
    uid,
    name,
    email,
    photoURL: null,
    role,
    createdAt: now,
    lastLoginAt: now,
    learningStats: defaultLearningStats,
    displayName: name,
    preferredLanguage: lang,
  }

  localStorage.setItem(`mentora_user_${uid}`, JSON.stringify(profile))
  localStorage.setItem('mentora_demo_user', JSON.stringify(profile))

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('profiles').upsert({
        id: uid,
        email,
        name,
        display_name: name,
        role,
        preferred_language: lang,
        updated_at: now,
      })
    } catch (err) {
      console.warn('Could not sync profile to Supabase (cached locally):', err)
    }
  }

  return profile
}

// ==========================================
// 2. Courses Management
// ==========================================

export const createCourse = async (
  ownerId: string,
  data: { title: string; description: string; subject: string }
): Promise<Course> => {
  if (!ownerId) throw new Error('Authentication required: ownerId missing.')
  const courseId = `crs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
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

  if (!isSupabaseConfigured()) {
    const local = localStorage.getItem(`mentora_courses_${ownerId}`)
    const list: Course[] = local ? JSON.parse(local) : []
    const updated = [newCourse, ...list]
    localStorage.setItem(`mentora_courses_${ownerId}`, JSON.stringify(updated))
    return newCourse
  }

  try {
    const { data: inserted, error } = await supabase
      .from('courses')
      .insert({
        owner_id: ownerId,
        title: newCourse.title,
        subject: newCourse.subject,
        description: newCourse.description,
      })
      .select()
      .single()

    if (error) throw error
    return {
      courseId: inserted.id,
      ownerId: inserted.owner_id,
      title: inserted.title,
      subject: inserted.subject,
      description: inserted.description || '',
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at,
      materialsCount: 0,
    }
  } catch (err) {
    console.warn('Supabase course creation failed, using local fallback:', err)
    const local = localStorage.getItem(`mentora_courses_${ownerId}`)
    const list: Course[] = local ? JSON.parse(local) : []
    const updated = [newCourse, ...list]
    localStorage.setItem(`mentora_courses_${ownerId}`, JSON.stringify(updated))
    return newCourse
  }
}

export const getUserCourses = async (ownerId: string): Promise<Course[]> => {
  if (!ownerId) return []

  if (!isSupabaseConfigured()) {
    const local = localStorage.getItem(`mentora_courses_${ownerId}`)
    const list: Course[] = local ? JSON.parse(local) : []
    return list.map((c) => {
      const matLocal = localStorage.getItem(`mentora_course_materials_${c.courseId}`)
      const mats: CourseMaterial[] = matLocal ? JSON.parse(matLocal) : []
      return { ...c, materialsCount: mats.length }
    })
  }

  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*, course_materials(count)')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })

    if (error || !data) {
      const local = localStorage.getItem(`mentora_courses_${ownerId}`)
      return local ? JSON.parse(local) : []
    }

    return data.map((c) => ({
      courseId: c.id,
      ownerId: c.owner_id,
      title: c.title,
      subject: c.subject,
      description: c.description || '',
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      materialsCount: c.course_materials?.[0]?.count ?? 0,
    }))
  } catch (err) {
    console.warn('Error reading courses from Supabase:', err)
    const local = localStorage.getItem(`mentora_courses_${ownerId}`)
    return local ? JSON.parse(local) : []
  }
}

export const getCourseById = async (courseId: string, ownerId: string): Promise<Course | null> => {
  if (!courseId || !ownerId) return null

  if (!isSupabaseConfigured()) {
    const local = localStorage.getItem(`mentora_courses_${ownerId}`)
    const list: Course[] = local ? JSON.parse(local) : []
    const match = list.find((c) => c.courseId === courseId)
    return match || null
  }

  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*, course_materials(count)')
      .eq('id', courseId)
      .single()

    if (error || !data) return null
    if (data.owner_id !== ownerId) {
      throw new Error('Access denied: You do not have permission to view this course.')
    }

    return {
      courseId: data.id,
      ownerId: data.owner_id,
      title: data.title,
      subject: data.subject,
      description: data.description || '',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      materialsCount: data.course_materials?.[0]?.count ?? 0,
    }
  } catch (err) {
    console.warn('Supabase getCourseById failed, fallback to local:', err)
    const local = localStorage.getItem(`mentora_courses_${ownerId}`)
    const list: Course[] = local ? JSON.parse(local) : []
    return list.find((c) => c.courseId === courseId) || null
  }
}

export const updateCourse = async (
  courseId: string,
  ownerId: string,
  updates: Partial<Pick<Course, 'title' | 'description' | 'subject'>>
): Promise<Course> => {
  if (!courseId || !ownerId) throw new Error('Course ID and Owner ID are required.')

  const existing = await getCourseById(courseId, ownerId)
  if (!existing) throw new Error('Course not found or unauthorized.')

  const now = new Date().toISOString()
  const updatedCourse: Course = {
    ...existing,
    ...updates,
    title: updates.title !== undefined ? updates.title.trim() : existing.title,
    description: updates.description !== undefined ? updates.description.trim() : existing.description,
    subject: updates.subject !== undefined ? updates.subject.trim() : existing.subject,
    updatedAt: now,
  }

  // Always update local cache
  const local = localStorage.getItem(`mentora_courses_${ownerId}`)
  const courses: Course[] = local ? JSON.parse(local) : []
  const updatedList = courses.map((c) => (c.courseId === courseId ? updatedCourse : c))
  localStorage.setItem(`mentora_courses_${ownerId}`, JSON.stringify(updatedList))

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('courses')
        .update({
          title: updatedCourse.title,
          description: updatedCourse.description,
          subject: updatedCourse.subject,
          updated_at: now,
        })
        .eq('id', courseId)
        .eq('owner_id', ownerId)
    } catch (err) {
      console.warn('Supabase course update failed:', err)
    }
  }

  return updatedCourse
}

export const deleteCourse = async (courseId: string, ownerId: string): Promise<void> => {
  if (!courseId || !ownerId) return

  // Always update local cache
  const local = localStorage.getItem(`mentora_courses_${ownerId}`)
  const courses: Course[] = local ? JSON.parse(local) : []
  const updated = courses.filter((c) => c.courseId !== courseId)
  localStorage.setItem(`mentora_courses_${ownerId}`, JSON.stringify(updated))
  localStorage.removeItem(`mentora_course_materials_${courseId}`)

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('courses').delete().eq('id', courseId).eq('owner_id', ownerId)
    } catch (err) {
      console.warn('Supabase course deletion failed:', err)
    }
  }
}

// ==========================================
// 3. Course Materials
// ==========================================

export const addCourseMaterial = async (
  courseId: string,
  materialData: Omit<CourseMaterial, 'materialId' | 'createdAt' | 'updatedAt'>
): Promise<CourseMaterial> => {
  const materialId = `mat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  const now = new Date().toISOString()

  const material: CourseMaterial = {
    ...materialData,
    materialId,
    uploadedAt: now,
    createdAt: now,
    updatedAt: now,
    chunksCount: 0,
  }

  // Local storage cache
  const local = localStorage.getItem(`mentora_course_materials_${courseId}`)
  const materials: CourseMaterial[] = local ? JSON.parse(local) : []
  localStorage.setItem(`mentora_course_materials_${courseId}`, JSON.stringify([material, ...materials]))

  if (isSupabaseConfigured()) {
    try {
      const { data: inserted, error } = await supabase
        .from('course_materials')
        .insert({
          course_id: courseId,
          owner_id: material.ownerId || 'demo',
          name: material.name,
          type: material.type,
          storage_path: material.storagePath,
          download_url: material.downloadURL || null,
          size_bytes: material.size || 0,
          processing_status: material.processingStatus,
        })
        .select()
        .single()

      if (!error && inserted) {
        return {
          ...material,
          materialId: inserted.id,
        }
      }
    } catch (err) {
      console.warn('Supabase addCourseMaterial failed, using local ID:', err)
    }
  }

  return material
}

export const getCourseMaterials = async (
  courseId: string,
  _ownerId?: string
): Promise<CourseMaterial[]> => {
  if (!courseId) return []

  if (!isSupabaseConfigured()) {
    const local = localStorage.getItem(`mentora_course_materials_${courseId}`)
    return local ? JSON.parse(local) : []
  }

  try {
    const { data, error } = await supabase
      .from('course_materials')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })

    if (error || !data) {
      const local = localStorage.getItem(`mentora_course_materials_${courseId}`)
      return local ? JSON.parse(local) : []
    }

    return data.map((d) => ({
      materialId: d.id,
      courseId: d.course_id,
      ownerId: d.owner_id,
      name: d.name,
      type: d.type as any,
      storagePath: d.storage_path,
      downloadURL: d.download_url,
      size: Number(d.size_bytes),
      processingStatus: d.processing_status,
      errorMessage: d.error_message,
      chunksCount: d.chunks_count,
      uploadedAt: d.created_at || new Date().toISOString(),
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }))
  } catch (err) {
    console.warn('Supabase getCourseMaterials failed:', err)
    const local = localStorage.getItem(`mentora_course_materials_${courseId}`)
    return local ? JSON.parse(local) : []
  }
}

export const deleteCourseMaterial = async (
  courseId: string,
  materialId: string,
  _ownerId?: string
): Promise<void> => {
  const local = localStorage.getItem(`mentora_course_materials_${courseId}`)
  const materials: CourseMaterial[] = local ? JSON.parse(local) : []
  const updated = materials.filter((m) => m.materialId !== materialId)
  localStorage.setItem(`mentora_course_materials_${courseId}`, JSON.stringify(updated))
  localStorage.removeItem(`mentora_chunks_${courseId}_${materialId}`)

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('course_materials').delete().eq('id', materialId)
    } catch (err) {
      console.warn('Supabase deleteCourseMaterial failed:', err)
    }
  }
}

export const updateMaterialProcessingStatus = async (
  courseId: string,
  materialId: string,
  status: MaterialProcessingStatus,
  errorMessage?: string,
  chunksCount?: number
): Promise<void> => {
  const local = localStorage.getItem(`mentora_course_materials_${courseId}`)
  if (local) {
    const materials: CourseMaterial[] = JSON.parse(local)
    const updated = materials.map((m) =>
      m.materialId === materialId
        ? {
            ...m,
            processingStatus: status,
            errorMessage,
            chunksCount: chunksCount !== undefined ? chunksCount : m.chunksCount,
            updatedAt: new Date().toISOString(),
          }
        : m
    )
    localStorage.setItem(`mentora_course_materials_${courseId}`, JSON.stringify(updated))
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('course_materials')
        .update({
          processing_status: status,
          error_message: errorMessage || null,
          chunks_count: chunksCount !== undefined ? chunksCount : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', materialId)
    } catch (err) {
      console.warn('Supabase updateMaterialProcessingStatus failed:', err)
    }
  }
}

// ==========================================
// 4. Multimodal Chunks
// ==========================================

export const saveMaterialChunks = async (
  courseId: string,
  materialId: string,
  chunks: ProcessedChunk[]
): Promise<void> => {
  localStorage.setItem(`mentora_chunks_${courseId}_${materialId}`, JSON.stringify(chunks))

  if (isSupabaseConfigured()) {
    try {
      const records = chunks.map((c) => ({
        course_id: courseId,
        material_id: materialId,
        chunk_index: c.chunkIndex,
        content: c.content,
        page_number: c.pageNumber || null,
        slide_number: c.slideNumber || null,
        video_timestamp: c.videoTimestamp || null,
        token_count: c.tokenCount || 0,
        topic_id: c.topicId || null,
        concept_id: c.conceptId || null,
        metadata: {
          sectionTitle: c.sectionTitle,
          materialName: c.materialName,
          materialType: c.materialType,
          diagramDescription: c.diagramDescription,
        },
      }))
      await supabase.from('course_chunks').insert(records)
    } catch (err) {
      console.warn('Supabase saveMaterialChunks failed:', err)
    }
  }
}

export const getMaterialChunks = async (
  courseId: string,
  materialId: string
): Promise<ProcessedChunk[]> => {
  const local = localStorage.getItem(`mentora_chunks_${courseId}_${materialId}`)
  if (local) {
    try {
      return JSON.parse(local)
    } catch {
      // Ignore
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('course_chunks')
        .select('*')
        .eq('course_id', courseId)
        .eq('material_id', materialId)
        .order('chunk_index', { ascending: true })

      if (!error && data) {
        return data.map((d) => ({
          chunkId: d.id,
          courseId: d.course_id,
          materialId: d.material_id,
          chunkIndex: d.chunk_index,
          text: d.content || '',
          sourceType: (d.metadata?.materialType as any) || 'PDF',
          sourceName: d.metadata?.materialName || 'Course Document',
          content: d.content,
          pageNumber: d.page_number,
          slideNumber: d.slide_number,
          videoTimestamp: d.video_timestamp,
          tokenCount: d.token_count,
          sectionTitle: d.metadata?.sectionTitle || '',
          materialName: d.metadata?.materialName,
          materialType: d.metadata?.materialType,
          topicId: d.topic_id,
          conceptId: d.concept_id,
          diagramDescription: d.metadata?.diagramDescription,
          createdAt: d.created_at,
        }))
      }
    } catch (err) {
      console.warn('Supabase getMaterialChunks failed:', err)
    }
  }

  return []
}

// ==========================================
// 5. Topic Mastery Model
// ==========================================

export const saveTopicMastery = async (mastery: TopicMastery): Promise<void> => {
  const { userId, topicId } = mastery
  const localKey = `mentora_mastery_${userId}`
  const existingList: TopicMastery[] = JSON.parse(localStorage.getItem(localKey) || '[]')
  const filtered = existingList.filter((m) => m.topicId !== topicId)
  localStorage.setItem(localKey, JSON.stringify([mastery, ...filtered]))

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('mastery').upsert({
        id: `${userId}_${topicId}`,
        user_id: userId,
        course_id: mastery.courseId,
        topic_id: topicId,
        topic_name: mastery.topicName,
        mastery_score: mastery.masteryScore,
        attempts: mastery.attempts,
        correct_answers: mastery.correctAnswers,
        incorrect_answers: mastery.incorrectAnswers,
        difficulty_level: mastery.difficultyLevel,
        trend: mastery.trend,
        last_attempt_at: mastery.lastAttemptAt,
        updated_at: new Date().toISOString(),
      })
    } catch (err) {
      console.warn('Supabase saveTopicMastery failed:', err)
    }
  }
}

export const getTopicMastery = async (
  userId: string,
  topicId: string
): Promise<TopicMastery | null> => {
  const localKey = `mentora_mastery_${userId}`
  const existingList: TopicMastery[] = JSON.parse(localStorage.getItem(localKey) || '[]')
  const match = existingList.find((m) => m.topicId === topicId)
  if (match) return match

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('mastery')
        .select('*')
        .eq('user_id', userId)
        .eq('topic_id', topicId)
        .single()

      if (!error && data) {
        return {
          topicId: data.topic_id,
          courseId: data.course_id,
          userId: data.user_id,
          topicName: data.topic_name,
          masteryScore: data.mastery_score,
          attempts: data.attempts,
          correctAnswers: data.correct_answers,
          incorrectAnswers: data.incorrect_answers,
          lastAttemptAt: data.last_attempt_at,
          difficultyLevel: data.difficulty_level,
          trend: data.trend,
          updatedAt: data.updated_at,
        }
      }
    } catch (err) {
      console.warn('Supabase getTopicMastery failed:', err)
    }
  }

  return null
}

export const getUserTopicMasteries = async (userId: string): Promise<TopicMastery[]> => {
  const localKey = `mentora_mastery_${userId}`
  const existingList: TopicMastery[] = JSON.parse(localStorage.getItem(localKey) || '[]')

  if (!isSupabaseConfigured() || existingList.length > 0) {
    return existingList
  }

  try {
    const { data, error } = await supabase.from('mastery').select('*').eq('user_id', userId)
    if (!error && data) {
      return data.map((d) => ({
        topicId: d.topic_id,
        courseId: d.course_id,
        userId: d.user_id,
        topicName: d.topic_name,
        masteryScore: d.mastery_score,
        attempts: d.attempts,
        correctAnswers: d.correct_answers,
        incorrectAnswers: d.incorrect_answers,
        lastAttemptAt: d.last_attempt_at,
        difficultyLevel: d.difficulty_level,
        trend: d.trend,
        updatedAt: d.updated_at,
      }))
    }
  } catch (err) {
    console.warn('Supabase getUserTopicMasteries failed:', err)
  }

  return existingList
}

// ==========================================
// 6. Quizzes & Assessments
// ==========================================

export const saveQuiz = async (quiz: Quiz): Promise<void> => {
  const localKey = `mentora_quizzes_${quiz.courseId}`
  const existing: Quiz[] = JSON.parse(localStorage.getItem(localKey) || '[]')
  localStorage.setItem(localKey, JSON.stringify([quiz, ...existing]))

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('quizzes').insert({
        user_id: quiz.userId,
        course_id: quiz.courseId,
        topic: quiz.topic,
        title: quiz.title,
        difficulty: quiz.difficulty,
        questions: quiz.questions,
        is_diagnostic: quiz.isDiagnostic || false,
      })
    } catch (err) {
      console.warn('Supabase saveQuiz failed:', err)
    }
  }
}

export const getCourseQuizzes = async (
  _userId: string,
  courseId: string
): Promise<Quiz[]> => {
  const localKey = `mentora_quizzes_${courseId}`
  const existing: Quiz[] = JSON.parse(localStorage.getItem(localKey) || '[]')
  return existing
}

export const saveUserQuizAttempt = async (attempt: QuizAttempt): Promise<void> => {
  const localKey = `mentora_attempts_${attempt.userId}`
  const existing: QuizAttempt[] = JSON.parse(localStorage.getItem(localKey) || '[]')
  localStorage.setItem(localKey, JSON.stringify([attempt, ...existing]))

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('quiz_attempts').insert({
        user_id: attempt.userId,
        course_id: attempt.courseId,
        quiz_id: attempt.quizId,
        topic: attempt.topic,
        score: attempt.score,
        correct_count: attempt.correctCount,
        total_questions: attempt.totalQuestions,
        difficulty: attempt.difficulty,
        results: attempt.results,
        is_diagnostic: attempt.isDiagnostic || false,
      })
    } catch (err) {
      console.warn('Supabase saveUserQuizAttempt failed:', err)
    }
  }
}

export const getUserQuizAttempts = async (
  userId: string,
  courseId?: string
): Promise<QuizAttempt[]> => {
  const localKey = `mentora_attempts_${userId}`
  const existing: QuizAttempt[] = JSON.parse(localStorage.getItem(localKey) || '[]')
  if (courseId) {
    return existing.filter((a) => a.courseId === courseId)
  }
  return existing
}

// ==========================================
// 7. Study Plans (Track D Feature)
// ==========================================

export const saveStudyPlan = async (plan: StudyPlan): Promise<void> => {
  const localKey = `mentora_study_plan_${plan.userId}_${plan.courseId}`
  localStorage.setItem(localKey, JSON.stringify(plan))

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('study_plans').upsert({
        id: plan.planId,
        user_id: plan.userId,
        course_id: plan.courseId,
        target_date: plan.targetDate,
        daily_available_minutes: plan.dailyAvailableMinutes,
        preferred_days: plan.preferredDays,
        status: plan.status,
        days: plan.days,
        updated_at: new Date().toISOString(),
      })
    } catch (err) {
      console.warn('Supabase saveStudyPlan failed:', err)
    }
  }
}

export const getStudyPlan = async (
  userId: string,
  courseId: string
): Promise<StudyPlan | null> => {
  const localKey = `mentora_study_plan_${userId}_${courseId}`
  const local = localStorage.getItem(localKey)
  if (local) {
    try {
      return JSON.parse(local)
    } catch {
      // Ignore
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!error && data) {
        return {
          planId: data.id,
          userId: data.user_id,
          courseId: data.course_id,
          targetDate: data.target_date,
          dailyAvailableMinutes: data.daily_available_minutes,
          preferredDays: data.preferred_days,
          status: data.status,
          days: data.days,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        }
      }
    } catch (err) {
      console.warn('Supabase getStudyPlan failed:', err)
    }
  }

  return null
}

// ==========================================
// 8. Revision Items (Track D Feature)
// ==========================================

export const saveRevisionItem = async (item: RevisionItem): Promise<void> => {
  const localKey = `mentora_revisions_${item.userId}`
  const existing: RevisionItem[] = JSON.parse(localStorage.getItem(localKey) || '[]')
  const filtered = existing.filter((i) => i.topicId !== item.topicId)
  localStorage.setItem(localKey, JSON.stringify([item, ...filtered]))

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('revision_items').upsert({
        id: `${item.userId}_${item.topicId}`,
        user_id: item.userId,
        course_id: item.courseId,
        topic_id: item.topicId,
        topic_name: item.topicName,
        mastery_score: item.masteryScore,
        last_studied_at: item.lastStudiedAt,
        next_revision_due: item.nextRevisionDue,
        revision_count: item.revisionCount,
        interval_days: item.intervalDays,
        status: item.status,
        weak_areas: item.weakAreas,
        updated_at: new Date().toISOString(),
      })
    } catch (err) {
      console.warn('Supabase saveRevisionItem failed:', err)
    }
  }
}

export const getUserRevisionItems = async (
  userId: string,
  courseId?: string
): Promise<RevisionItem[]> => {
  const localKey = `mentora_revisions_${userId}`
  const existing: RevisionItem[] = JSON.parse(localStorage.getItem(localKey) || '[]')
  if (courseId) {
    return existing.filter((i) => i.courseId === courseId)
  }
  return existing
}

// ==========================================
// 9. Recommendations
// ==========================================

export const saveUserRecommendations = async (
  userId: string,
  recs: PersonalizedRecommendation[]
): Promise<void> => {
  const localKey = `mentora_recs_${userId}`
  localStorage.setItem(localKey, JSON.stringify(recs))

  if (isSupabaseConfigured()) {
    try {
      const records = recs.map((r) => ({
        id: r.recommendationId,
        user_id: userId,
        course_id: r.courseId,
        topic_id: r.topicId,
        type: r.type,
        title: r.title,
        reason: r.reason,
        priority: r.priority,
        estimated_minutes: r.estimatedMinutes,
        action_label: r.actionLabel,
      }))
      await supabase.from('recommendations').upsert(records)
    } catch (err) {
      console.warn('Supabase saveUserRecommendations failed:', err)
    }
  }
}

export const getUserRecommendations = async (
  userId: string
): Promise<PersonalizedRecommendation[]> => {
  const localKey = `mentora_recs_${userId}`
  const local = localStorage.getItem(localKey)
  if (local) {
    try {
      return JSON.parse(local)
    } catch {
      // Ignore
    }
  }
  return []
}
