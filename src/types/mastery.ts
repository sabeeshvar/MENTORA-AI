export type MasteryStatus = 'needs_attention' | 'developing' | 'good' | 'mastered'

export interface TopicMastery {
  topicId: string
  courseId: string
  userId: string
  topicName: string
  masteryScore: number // 0.0 to 1.0 (internal float, e.g. 0.75 for 75%)
  attempts: number
  correctAnswers: number
  incorrectAnswers: number
  lastAttemptAt: string
  difficultyLevel: 'easy' | 'medium' | 'hard'
  trend: 'up' | 'down' | 'stable'
  updatedAt: string
}

export type RecommendationType = 'REVISION' | 'QUIZ' | 'READ' | 'PRACTICE' | 'ADVANCE'

export interface PersonalizedRecommendation {
  recommendationId: string
  userId: string
  courseId: string
  topicId: string
  type: RecommendationType
  title: string
  reason: string // Grounded reason based on learner data
  priority: 'high' | 'medium' | 'low'
  estimatedMinutes?: number
  actionLabel?: string
  createdAt: string
}

/**
 * Returns user-facing mastery category from 0.0 - 1.0 float score
 * 0–39: Needs Attention
 * 40–69: Developing
 * 70–84: Good
 * 85–100: Mastered
 */
export const getMasteryStatus = (score: number): {
  status: MasteryStatus
  label: string
  color: 'rose' | 'amber' | 'indigo' | 'emerald'
} => {
  const pct = Math.round(score * 100)
  if (pct < 40) {
    return { status: 'needs_attention', label: 'Needs Attention', color: 'rose' }
  }
  if (pct < 70) {
    return { status: 'developing', label: 'Developing', color: 'amber' }
  }
  if (pct < 85) {
    return { status: 'good', label: 'Good', color: 'indigo' }
  }
  return { status: 'mastered', label: 'Mastered', color: 'emerald' }
}
