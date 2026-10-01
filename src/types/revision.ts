import type { SourceCitation } from './tutor'
import type { QuizQuestion } from './quiz'

export type RevisionBucket = 'revise_now' | 'due_today' | 'upcoming' | 'mastered'

export interface RevisionItem {
  topicId: string
  topicName: string
  courseId: string
  userId: string
  masteryScore: number // 0.0 to 1.0
  lastStudiedAt: string
  lastQuizScore?: number // percentage e.g. 75
  nextRevisionDue: string // ISO date
  attempts: number
  revisionCount: number
  intervalDays: number
  status: RevisionBucket
  weakAreas: string[]
  misconceptions?: string[]
}

export interface RevisionRecap {
  topicId: string
  topicName: string
  summary: string
  keyPoints: string[]
  sourceCitations: SourceCitation[]
  previousMistakes: Array<{
    question: string
    studentAnswer: string
    correctAnswer: string
    misconception?: string
    groundedCorrection: string
  }>
  quizQuestions: QuizQuestion[]
}
