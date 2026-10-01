export type StudyTaskType = 'REVISION' | 'QUIZ' | 'READING' | 'PRACTICE' | 'DIAGNOSTIC'

export interface StudyPlanTask {
  taskId: string
  topicId: string
  topicName: string
  taskType: StudyTaskType
  durationMinutes: number
  reason: string
  sourceReferences?: Array<{
    materialName: string
    pageNumber?: number | null
    slideNumber?: number | null
    videoTimestamp?: string | null
  }>
  completed: boolean
  completedAt?: string
}

export interface StudyPlanDay {
  date: string // YYYY-MM-DD
  dayLabel: string // e.g. "Day 1 (Monday)"
  tasks: StudyPlanTask[]
  totalMinutes: number
  completedMinutes: number
  status: 'pending' | 'completed' | 'partial' | 'missed'
}

export interface StudyPlan {
  planId: string
  userId: string
  courseId: string
  courseTitle?: string
  targetDate: string // YYYY-MM-DD
  dailyAvailableMinutes: number
  preferredDays: string[] // e.g. ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  status: 'active' | 'completed' | 'archived'
  days: StudyPlanDay[]
  createdAt: string
  updatedAt: string
}

export interface CreateStudyPlanParams {
  courseId: string
  targetDate: string
  dailyAvailableMinutes: number
  preferredDays: string[]
  topicsToCover?: string[]
  priorityTopics?: string[]
}
