import type { CourseMaterialType } from './course'

export interface ProcessedChunk {
  chunkId: string
  courseId: string
  materialId: string
  text: string
  sourceType: CourseMaterialType
  sourceName: string
  pageNumber?: number
  slideNumber?: number
  startTimestamp?: string
  endTimestamp?: string
  sectionTitle: string
  chunkIndex: number
  createdAt: string
  charCount?: number
  wordCount?: number
  embedding?: number[]
  embeddingModel?: string
  similarityScore?: number
}

export interface MaterialExtractionSummary {
  materialId: string
  courseId: string
  fileName: string
  fileType: CourseMaterialType
  totalChunks: number
  totalPagesOrSlides: number
  extractedAt: string
}
