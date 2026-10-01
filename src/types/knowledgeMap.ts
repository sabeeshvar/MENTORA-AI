import type { MasteryStatus } from './mastery'

export interface ConceptNode {
  id: string
  name: string
  description?: string
  masteryScore: number // 0.0 to 1.0
  status: MasteryStatus
  attempts: number
  sourceMaterials: string[]
  prerequisites?: string[]
}

export interface SubtopicNode {
  id: string
  name: string
  concepts: ConceptNode[]
}

export interface TopicNode {
  id: string
  name: string
  subtopics: SubtopicNode[]
  masteryScore: number
  attempts: number
  status: MasteryStatus
  sourceMaterials: string[]
  prerequisites?: string[]
}

export interface ModuleNode {
  id: string
  title: string
  order: number
  topics: TopicNode[]
}

export interface CourseKnowledgeMap {
  courseId: string
  courseTitle: string
  modules: ModuleNode[]
  generatedAt: string
}
