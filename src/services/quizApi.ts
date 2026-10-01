import type {
  QuizQuestion,
  QuestionAnswerResult,
  QuizDifficulty,
  QuestionType,
} from '@/types/quiz'
import type { ProcessedChunk } from '@/types/chunk'

const API_BASE_URL = '/api/ai'

export interface GenerateQuizApiParams {
  courseId: string
  topic: string
  difficulty?: QuizDifficulty
  numberOfQuestions?: number
  questionTypes?: QuestionType[]
  chunks?: ProcessedChunk[]
  preferredLanguage?: string
}

export interface GeneratedQuizApiResponse {
  quizId: string
  courseId: string
  topic: string
  difficulty: QuizDifficulty
  questions: QuizQuestion[]
  grounded: boolean
  sourceCount: number
}

/**
 * Calls backend Gemini AI service to generate questions grounded strictly in course chunks
 */
export const generateGroundedQuizApi = async (
  params: GenerateQuizApiParams
): Promise<GeneratedQuizApiResponse> => {
  const res = await fetch(`${API_BASE_URL}/quiz/generate`, {
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
  const res = await fetch(`${API_BASE_URL}/quiz/evaluate`, {
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
 * Powers interactive wrong-answer remedy buttons: Explain Simply, Give an Example, Ask Me a Follow-up
 */
export const requestRemedyActionApi = async (params: {
  action: 'explain_simply' | 'give_example' | 'ask_followup'
  question: string
  studentAnswer: string
  correctConcept: string
  sourceContext?: string
}): Promise<string> => {
  const res = await fetch(`${API_BASE_URL}/quiz/remedy`, {
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
