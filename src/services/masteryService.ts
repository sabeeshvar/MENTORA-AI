import {
  saveTopicMastery,
  getUserTopicMasteries,
  getTopicMastery,
  saveUserQuizAttempt,
  saveUserRecommendations,
} from '@/lib/supabase/db'
import type {
  TopicMastery,
  PersonalizedRecommendation,
} from '@/types/mastery'
import type { QuizAttempt, QuizDifficulty } from '@/types/quiz'

export class MasteryService {
  /**
   * Calculates the updated mastery score for a topic after an answered question or quiz
   * Uses dampened exponential moving average so mastery does not wildly swing after a single question
   */
  public static calculateUpdatedMastery(
    currentMastery: number = 0.5,
    isCorrect: boolean,
    difficulty: QuizDifficulty = 'medium',
    totalAttemptsSoFar: number = 0
  ): {
    newScore: number
    trend: 'up' | 'down' | 'stable'
  } {
    // Difficulty weighting factor
    let diffMultiplier = 1.0
    if (difficulty === 'easy') {
      diffMultiplier = isCorrect ? 0.7 : 1.3 // Missing easy questions penalizes more
    } else if (difficulty === 'hard') {
      diffMultiplier = isCorrect ? 1.4 : 0.6 // Answering hard questions correctly rewards more
    }

    // Dampening factor: decreases as attempts accumulate to provide stability
    const learningRate = Math.max(0.12, 1.0 / Math.sqrt(totalAttemptsSoFar + 2))
    const baseDelta = isCorrect ? 0.15 : -0.15
    const adjustment = baseDelta * diffMultiplier * learningRate

    const rawScore = currentMastery + adjustment
    const clampedScore = Math.max(0.0, Math.min(1.0, Math.round(rawScore * 1000) / 1000))

    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (clampedScore > currentMastery + 0.01) {
      trend = 'up'
    } else if (clampedScore < currentMastery - 0.01) {
      trend = 'down'
    }

    return {
      newScore: clampedScore,
      trend,
    }
  }

  /**
   * Process a completed quiz attempt:
   * 1. Updates topic-level mastery in Supabase PostgreSQL
   * 2. Persists the QuizAttempt record
   * 3. Triggers personalized recommendation updates
   */
  public static async processQuizAttempt(
    attempt: QuizAttempt
  ): Promise<{
    updatedMasteries: TopicMastery[]
    recommendations: PersonalizedRecommendation[]
  }> {
    const { userId, courseId, topic, results, difficulty } = attempt
    if (!userId) {
      throw new Error('UserId is required to process quiz attempt')
    }

    // Find or initialize topic mastery
    const topicId = topic.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const existing = await getTopicMastery(userId, topicId)

    let currentScore = existing?.masteryScore ?? 0.5
    let attemptsCount = existing?.attempts ?? 0
    let correctCount = existing?.correctAnswers ?? 0
    let incorrectCount = existing?.incorrectAnswers ?? 0

    let latestTrend: 'up' | 'down' | 'stable' = 'stable'

    // Update mastery step-by-step for each evaluated question in the attempt
    for (const res of results) {
      attemptsCount++
      if (res.isCorrect) {
        correctCount++
      } else {
        incorrectCount++
      }

      const { newScore, trend } = this.calculateUpdatedMastery(
        currentScore,
        res.isCorrect,
        difficulty,
        attemptsCount
      )
      currentScore = newScore
      latestTrend = trend
    }

    const updatedTopicMastery: TopicMastery = {
      topicId,
      courseId,
      userId,
      topicName: topic,
      masteryScore: currentScore,
      attempts: attemptsCount,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      lastAttemptAt: new Date().toISOString(),
      difficultyLevel: difficulty === 'adaptive' ? 'medium' : difficulty,
      trend: latestTrend,
      updatedAt: new Date().toISOString(),
    }

    // 1. Save mastery
    await saveTopicMastery(updatedTopicMastery)

    // 2. Save quiz attempt
    await saveUserQuizAttempt(attempt)

    // 3. Generate adaptive personalized recommendations
    const recommendations = await this.generateRecommendations(userId, courseId)

    return {
      updatedMasteries: [updatedTopicMastery],
      recommendations,
    }
  }

  /**
   * Adaptive Learning Engine:
   * Analyzes student mastery, weak topics, and recent errors to generate grounded recommendations
   */
  public static async generateRecommendations(
    userId: string,
    courseId: string
  ): Promise<PersonalizedRecommendation[]> {
    const masteries = await getUserTopicMasteries(userId)
    const recs: PersonalizedRecommendation[] = []
    const now = new Date().toISOString()

    const relevantMasteries = courseId
      ? masteries.filter((m) => !m.courseId || m.courseId === courseId)
      : masteries

    for (const m of relevantMasteries) {
      const pct = Math.round(m.masteryScore * 100)

      if (pct < 40) {
        // High weakness: Needs immediate revision
        recs.push({
          recommendationId: `rec_rev_${m.topicId}_${Date.now()}`,
          userId,
          courseId: m.courseId || courseId,
          topicId: m.topicId,
          type: 'REVISION',
          title: `Review Core Concepts in ${m.topicName}`,
          reason: `Your mastery is ${pct}% and your last ${m.incorrectAnswers} attempt(s) contained errors.`,
          priority: 'high',
          estimatedMinutes: 6,
          actionLabel: 'Ask Tutor',
          createdAt: now,
        })

        recs.push({
          recommendationId: `rec_quiz_${m.topicId}_${Date.now()}`,
          userId,
          courseId: m.courseId || courseId,
          topicId: m.topicId,
          type: 'QUIZ',
          title: `Targeted Diagnostic: ${m.topicName}`,
          reason: `Take a 3-question adaptive quiz calibrated to repair conceptual gaps in ${m.topicName}.`,
          priority: 'high',
          estimatedMinutes: 4,
          actionLabel: 'Take Quiz',
          createdAt: now,
        })
      } else if (pct < 70) {
        // Developing: Needs targeted practice
        recs.push({
          recommendationId: `rec_prac_${m.topicId}_${Date.now()}`,
          userId,
          courseId: m.courseId || courseId,
          topicId: m.topicId,
          type: 'PRACTICE',
          title: `Reinforce ${m.topicName}`,
          reason: `Developing understanding (${pct}%). Medium-difficulty practice questions will solidify your comprehension.`,
          priority: 'medium',
          estimatedMinutes: 8,
          actionLabel: 'Practice',
          createdAt: now,
        })
      } else if (pct >= 85) {
        // Mastered: Advance to next milestone
        recs.push({
          recommendationId: `rec_adv_${m.topicId}_${Date.now()}`,
          userId,
          courseId: m.courseId || courseId,
          topicId: m.topicId,
          type: 'ADVANCE',
          title: `Advance Past ${m.topicName}`,
          reason: `Mastery achieved (${pct}% with ${m.correctAnswers} correct answers). Ready to proceed to advanced concepts!`,
          priority: 'low',
          estimatedMinutes: 10,
          actionLabel: 'Explore Next',
          createdAt: now,
        })
      }
    }

    // Persist generated recommendations
    if (recs.length > 0) {
      await saveUserRecommendations(userId, recs)
    }

    return recs
  }

  /**
   * Determines the recommended question difficulty based on student's current mastery
   * Low mastery -> easier
   * Medium mastery -> medium
   * High mastery -> harder
   */
  public static getRecommendedDifficulty(masteryScore: number = 0.5): QuizDifficulty {
    const pct = Math.round(masteryScore * 100)
    if (pct < 40) return 'easy'
    if (pct < 75) return 'medium'
    return 'hard'
  }

  /**
   * Priority 7: Lightweight Conversational Mastery Calibration
   * Evaluates conceptual understanding from student's spontaneous explanatory chat answers
   * Updates topic mastery only when confidence is high (>= 0.70)
   */
  public static async processConversationalMastery(
    userId: string,
    courseId: string,
    topic: string,
    conceptualAccuracy: number,
    confidence: number
  ): Promise<TopicMastery | null> {
    if (!userId || !topic || confidence < 0.7) return null

    const topicId = topic.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const existing = await getTopicMastery(userId, topicId)

    const currentScore = existing?.masteryScore ?? 0.5
    const attemptsCount = (existing?.attempts ?? 0) + 1
    const isUnderstood = conceptualAccuracy >= 0.7
    const correctCount = (existing?.correctAnswers ?? 0) + (isUnderstood ? 1 : 0)
    const incorrectCount = (existing?.incorrectAnswers ?? 0) + (isUnderstood ? 0 : 1)

    const { newScore, trend } = this.calculateUpdatedMastery(
      currentScore,
      isUnderstood,
      'medium',
      attemptsCount
    )

    const updated: TopicMastery = {
      topicId,
      courseId,
      userId,
      topicName: topic,
      masteryScore: newScore,
      attempts: attemptsCount,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      lastAttemptAt: new Date().toISOString(),
      difficultyLevel: 'medium',
      trend,
      updatedAt: new Date().toISOString(),
    }

    await saveTopicMastery(updated)
    return updated
  }
}
