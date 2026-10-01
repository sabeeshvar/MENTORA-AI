export type QuizDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'adaptive'

export interface QuizQuestionOption {
  id: string
  text: string
}

export interface QuizQuestion {
  id: string
  question: string
  options: QuizQuestionOption[]
  correctOptionId: string
  explanation: string
  sourceCitation?: {
    materialId: string
    pageOrTimestamp: string
    text: string
  }
  topic: string
  difficulty: QuizDifficulty
}

export interface QuizAttempt {
  id: string
  quizId: string
  userId: string
  score: number
  totalQuestions: number
  timeSpentSeconds: number
  completedAt: string
  answers: {
    questionId: string
    selectedOptionId: string
    isCorrect: boolean
  }[]
}

export interface Quiz {
  id: string
  userId: string
  materialId?: string
  topic: string
  title: string
  difficulty: QuizDifficulty
  questions: QuizQuestion[]
  createdAt: string
}
