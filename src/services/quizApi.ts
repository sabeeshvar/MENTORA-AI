import type {
  QuizQuestion,
  QuestionAnswerResult,
  QuizDifficulty,
  QuestionType,
  QuizAttempt,
} from '@/types/quiz'
import type { ProcessedChunk } from '@/types/chunk'
import type { TopicMastery, PersonalizedRecommendation } from '@/types/mastery'
import { getApiEndpoint } from './apiConfig'

const getEndpoint = (path: string) => getApiEndpoint(`/api/ai${path}`)

export interface GenerateQuizApiParams {
  courseId: string
  topic: string
  difficulty?: QuizDifficulty
  numberOfQuestions?: number
  questionTypes?: QuestionType[]
  chunks?: ProcessedChunk[]
  preferredLanguage?: string
  priorQuestionTexts?: string[]
  priorQuestionHashes?: string[]
  learnerMastery?: {
    masteryScore?: number
    weakAreas?: string[]
    misconceptions?: string[]
    attempts?: number
    recentAccuracy?: number
  }
}

export interface GeneratedQuizApiResponse {
  quizId: string
  courseId: string
  topic: string
  difficulty: QuizDifficulty
  questions: QuizQuestion[]
  grounded: boolean
  sourceCount: number
  repetitionRate?: number
  calibratedAdaptiveDifficulty?: QuizDifficulty
}

export interface SubmitQuizAttemptParams {
  quizId: string
  courseId: string
  userId: string
  topic: string
  difficulty: QuizDifficulty
  answers: Array<{
    questionId: string
    studentAnswer: string
    confidence?: number
  }>
  questions: QuizQuestion[]
  timeSpentSeconds?: number
  isDiagnostic?: boolean
  idempotencyKey?: string
  preferredLanguage?: string
}

export interface SubmitQuizAttemptApiResponse {
  attempt: QuizAttempt
  updatedMasteries: TopicMastery[]
  recommendations: PersonalizedRecommendation[]
  nextAdaptiveDifficulty: QuizDifficulty
  nextRecommendedTopic: string
}

/**
 * Calls backend Gemini AI service to generate questions grounded strictly in course chunks
 */
export const generateGroundedQuizApi = async (
  params: GenerateQuizApiParams
): Promise<GeneratedQuizApiResponse> => {
  const res = await fetch(getEndpoint('/quiz/generate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Quiz generation failed with HTTP ${res.status}`)
  }

  return res.json()
}

/**
 * Calls backend to evaluate student answer and return grounded feedback + wrong-answer remedy
 */
export const evaluateQuizAnswerApi = async (
  question: QuizQuestion,
  studentAnswer: string,
  preferredLanguage: string = 'en'
): Promise<QuestionAnswerResult> => {
  const res = await fetch(getEndpoint('/quiz/evaluate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, studentAnswer, preferredLanguage }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Answer evaluation failed with HTTP ${res.status}`)
  }

  return res.json()
}

/**
 * Submits the completed quiz attempt to the server for verified grading, attempt logging, and deterministic mastery updates
 */
export const submitQuizAttemptApi = async (
  params: SubmitQuizAttemptParams
): Promise<SubmitQuizAttemptApiResponse> => {
  const res = await fetch(getEndpoint('/quiz/submit'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Quiz submission failed with HTTP ${res.status}`)
  }

  return res.json()
}

/**
 * Powers interactive wrong-answer remedy buttons: Explain Simply, Give an Example, Ask Me a Follow-up
 */
export const requestRemedyActionApi = async (params: {
  action: 'explain_simply' | 'give_example' | 'ask_followup'
  question: string
  studentAnswer: string
  correctConcept: string
  sourceContext?: string
}): Promise<string> => {
  const res = await fetch(getEndpoint('/quiz/remedy'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Remedy action failed with HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.text || 'Explanation processed.'
}

