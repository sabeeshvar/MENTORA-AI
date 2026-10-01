import type {
  QuizQuestion,
  QuestionAnswerResult,
  QuizDifficulty,
  QuestionType,
} from '@/types/quiz'
import type { ProcessedChunk } from '@/types/chunk'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

export interface GenerateQuizApiParams {
  courseId: string
  topic: string
  difficulty?: QuizDifficulty
  numberOfQuestions?: number
  questionTypes?: QuestionType[]
  chunks?: ProcessedChunk[]
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
 * Calls backend Groq AI service to generate questions grounded strictly in course chunks
 */
export const generateGroundedQuizApi = async (
  params: GenerateQuizApiParams
): Promise<GeneratedQuizApiResponse> => {
  const res = await fetch(`${API_BASE_URL}/groq/quiz/generate`, {
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
  studentAnswer: string
): Promise<QuestionAnswerResult> => {
  const res = await fetch(`${API_BASE_URL}/groq/quiz/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, studentAnswer }),
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
  const res = await fetch(`${API_BASE_URL}/groq/quiz/remedy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `Remedy action failed with HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.text
}
