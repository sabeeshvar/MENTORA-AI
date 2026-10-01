export type QuizDifficulty = 'easy' | 'medium' | 'hard' | 'adaptive'
export type QuestionType = 'mcq' | 'short_answer' | 'numerical'

export interface QuestionSourceCitation {
  materialName: string
  pageNumber?: number | null
  slideNumber?: number | null
  startTimestamp?: string | null
  endTimestamp?: string | null
  relevantText: string
}

export interface QuizQuestion {
  questionId: string
  courseId: string
  topicId?: string
  topic: string
  difficulty: QuizDifficulty
  type: QuestionType
  question: string
  options?: string[] // Exactly 4 options for MCQ
  correctAnswer: string // Correct option for MCQ, model answer for short_answer, numeric string for numerical
  expectedConcepts?: string[] // Key concepts required for short answer
  expectedNumericValue?: number // Numeric answer
  tolerance?: number // Numerical tolerance range e.g. 0.05
  unit?: string // Unit e.g. 'm/s', 'Hz'
  explanation: string
  source: QuestionSourceCitation
  createdAt: string
}

export interface WrongAnswerExplanation {
  correctConcept: string
  whyIncorrect: string
  simpleExplanation: string
  example: string
  source: QuestionSourceCitation
  followUpQuestion: string
}

export interface QuestionAnswerResult {
  questionId: string
  studentAnswer: string
  correctAnswer: string
  isCorrect: boolean
  score: number // 0.0 to 1.0
  feedback: string
  explanation: string
  source: QuestionSourceCitation
  wrongAnswerAnalysis?: WrongAnswerExplanation
}

export interface QuizAttempt {
  attemptId: string
  quizId: string
  courseId: string
  userId: string
  topic: string
  difficulty: QuizDifficulty
  totalQuestions: number
  correctCount: number
  accuracyPercentage: number
  timeSpentSeconds: number
  completedAt: string
  results: QuestionAnswerResult[]
}

export interface Quiz {
  quizId: string
  courseId: string
  userId: string
  topic: string
  title: string
  difficulty: QuizDifficulty
  questions: QuizQuestion[]
  createdAt: string
}
