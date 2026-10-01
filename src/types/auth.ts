export interface LearningStats {
  materialsCount: number
  quizzesTaken: number
  overallMastery: number
  questionsAsked: number
  streakDays: number
  lastActiveDate: string
}

export interface UserProfile {
  uid: string
  name: string
  email: string | null
  photoURL: string | null
  role: 'student' | 'educator'
  createdAt: string
  lastLoginAt: string
  learningStats: LearningStats
  displayName?: string | null
}

export interface AuthState {
  user: UserProfile | null
  loading: boolean
  error: string | null
}

