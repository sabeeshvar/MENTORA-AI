import type { CourseMaterialType } from '@/types/course'
import type { ProcessedChunk } from '@/types/chunk'

export interface ExtractedPage {
  pageNumber?: number
  slideNumber?: number
  videoTimestamp?: string
  startTimestamp?: string
  endTimestamp?: string
  title?: string
  text: string
  diagramDescription?: string
  visualElements?: string[]
  figureType?: string
}

export type ExtractionProgressCallback = (stage: string, percent: number) => void

export interface IExtractionService {
  extractText(
    data: ArrayBuffer | Uint8Array,
    fileName: string,
    fileType: CourseMaterialType,
    onProgress?: ExtractionProgressCallback
  ): Promise<ExtractedPage[]>
}

export interface ChunkingOptions {
  maxChunkSizeChars?: number
  chunkOverlapChars?: number
}

export interface ProcessMaterialResult {
  materialId: string
  courseId: string
  chunks: ProcessedChunk[]
  totalChunks: number
  totalPagesOrSlides: number
  processedAt: string
  status?: 'processed' | 'failed'
}
