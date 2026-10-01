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
  sectionTitle: string
  chunkIndex: number
  createdAt: string
  charCount?: number
  wordCount?: number
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
