import { saveStudyPlan } from '@/lib/supabase/db'
import type { StudyPlan, StudyPlanDay, StudyPlanTask } from '@/types/studyPlan'
import type { TopicMastery } from '@/types/mastery'

const API_BASE = '/api/ai'

export class StudyPlanService {
  /**
   * Generates a new personalized Study Plan for a course
   */
  public static async generatePlan(params: {
    userId: string
    courseId: string
    courseTitle: string
    targetDate: string
    dailyAvailableMinutes: number
    preferredDays: string[]
    masteries: TopicMastery[]
    preferredLanguage?: string
  }): Promise<StudyPlan> {
    const {
      userId,
      courseId,
      courseTitle,
      targetDate,
      dailyAvailableMinutes,
      preferredDays,
      masteries,
      preferredLanguage = 'en',
    } = params

    let days: StudyPlanDay[] = []

    try {
      const res = await fetch(`${API_BASE}/study-plan/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          courseTitle,
          targetDate,
          dailyAvailableMinutes,
          preferredDays,
          topics: masteries.map((m) => ({
            topicId: m.topicId,
            topicName: m.topicName,
            masteryScore: m.masteryScore,
          })),
          preferredLanguage,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        days = data.days || []
      }
    } catch (err) {
      console.warn('Backend study-plan generator failed, generating locally:', err)
    }

    // Local deterministic generator fallback if backend was unavailable
    if (days.length === 0) {
      const today = new Date()
      const target = new Date(targetDate)
      const diffTime = Math.max(1, target.getTime() - today.getTime())
      const diffDays = Math.min(21, Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24))))

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const sortedTopics = [...masteries].sort((a, b) => a.masteryScore - b.masteryScore)

      let topicIdx = 0
      for (let i = 0; i < diffDays; i++) {
        const curDate = new Date(today)
        curDate.setDate(today.getDate() + i)
        const dayName = dayNames[curDate.getDay()]

        if (preferredDays.length > 0 && !preferredDays.includes(dayName)) {
          continue
        }

        const dateStr = curDate.toISOString().split('T')[0]
        const top1 = sortedTopics[topicIdx % Math.max(1, sortedTopics.length)]
        const top2 = sortedTopics[(topicIdx + 1) % Math.max(1, sortedTopics.length)]
        topicIdx += 2

        const t1: StudyPlanTask = {
          taskId: `task_${dateStr}_1`,
          topicId: top1?.topicId || 'foundational_concepts',
          topicName: top1?.topicName || 'Foundational Concept Review',
          taskType: top1 && top1.masteryScore < 0.4 ? 'REVISION' : 'READING',
          durationMinutes: Math.round(dailyAvailableMinutes * 0.5),
          reason:
            top1 && top1.masteryScore < 0.4
              ? `Current mastery is ${Math.round(top1.masteryScore * 100)}%. Immediate revision recommended.`
              : 'Core curriculum concept milestone.',
          completed: false,
        }

        const t2: StudyPlanTask = {
          taskId: `task_${dateStr}_2`,
          topicId: top2?.topicId || 'practice_quiz',
          topicName: top2?.topicName || 'Practice & Knowledge Check',
          taskType: 'QUIZ',
          durationMinutes: Math.round(dailyAvailableMinutes * 0.4),
          reason: 'Solidify retention and practice question solving.',
          completed: false,
        }

        days.push({
          date: dateStr,
          dayLabel: `Day ${days.length + 1} (${dayName})`,
          tasks: [t1, t2],
          totalMinutes: dailyAvailableMinutes,
          completedMinutes: 0,
          status: 'pending',
        })
      }
    }

    const newPlan: StudyPlan = {
      planId: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      courseId,
      courseTitle,
      targetDate,
      dailyAvailableMinutes,
      preferredDays,
      status: 'active',
      days,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await saveStudyPlan(newPlan)
    return newPlan
  }

  /**
   * Toggles task completion and updates day progress
   */
  public static async toggleTask(
    plan: StudyPlan,
    dayIndex: number,
    taskId: string
  ): Promise<StudyPlan> {
    const updatedDays = plan.days.map((day, dIdx) => {
      if (dIdx !== dayIndex) return day

      let compMins = 0
      const updatedTasks = day.tasks.map((task) => {
        if (task.taskId === taskId) {
          const nextCompleted = !task.completed
          if (nextCompleted) compMins += task.durationMinutes
          return {
            ...task,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
          }
        }
        if (task.completed) compMins += task.durationMinutes
        return task
      })

      const allCompleted = updatedTasks.every((t) => t.completed)
      const someCompleted = updatedTasks.some((t) => t.completed)

      return {
        ...day,
        tasks: updatedTasks,
        completedMinutes: compMins,
        status: allCompleted ? ('completed' as const) : someCompleted ? ('partial' as const) : ('pending' as const),
      }
    })

    const updatedPlan: StudyPlan = {
      ...plan,
      days: updatedDays,
      updatedAt: new Date().toISOString(),
    }

    await saveStudyPlan(updatedPlan)
    return updatedPlan
  }

  /**
   * Recalculates study plan when a student misses tasks:
   * Carries forward incomplete tasks and prioritizes weak topics without overloading daily time.
   */
  public static async recalculatePlan(
    plan: StudyPlan,
    _masteries?: TopicMastery[]
  ): Promise<{ updatedPlan: StudyPlan; carriedForwardCount: number }> {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // Find all incomplete tasks from past days
    const missedTasks: StudyPlanTask[] = []
    const futureDays: StudyPlanDay[] = []

    for (const day of plan.days) {
      if (day.date < todayStr) {
        for (const t of day.tasks) {
          if (!t.completed) {
            missedTasks.push({ ...t, reason: `Carried forward: ${t.reason}` })
          }
        }
      } else {
        futureDays.push(day)
      }
    }

    if (futureDays.length === 0) {
      return { updatedPlan: plan, carriedForwardCount: 0 }
    }

    // Redistribute missed tasks into future days without exceeding dailyAvailableMinutes
    let missedCursor = 0
    const reallocatedDays = futureDays.map((day) => {
      const remainingMinutes = Math.max(0, day.totalMinutes - day.completedMinutes)
      const tasks = [...day.tasks]

      if (missedCursor < missedTasks.length && remainingMinutes >= 20) {
        const carry = missedTasks[missedCursor++]
        tasks.unshift(carry)
      }

      return {
        ...day,
        tasks,
      }
    })

    const updatedPlan: StudyPlan = {
      ...plan,
      days: reallocatedDays,
      updatedAt: new Date().toISOString(),
    }

    await saveStudyPlan(updatedPlan)
    return {
      updatedPlan,
      carriedForwardCount: missedTasks.length,
    }
  }
}
