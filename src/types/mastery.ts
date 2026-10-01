export type MasteryLevel = 'novice' | 'learning' | 'competent' | 'mastered'

export interface TopicMastery {
  id: string
  userId: string
  topic: string
  score: number // 0 to 100
  level: MasteryLevel
  quizzesAttempted: number
  correctRate: number
  lastAssessedAt: string
  weakAreas: string[]
  recommendedActions: string[]
}

export interface PersonalizedRecommendation {
  id: string
  topic: string
  priority: 'high' | 'medium' | 'low'
  reason: string
  suggestedMaterialId?: string
  suggestedAction: 'review_material' | 'take_quiz' | 'practice_weak_concepts'
}
