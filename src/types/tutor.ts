export interface SourceCitation {
  materialName: string
  pageNumber?: number | null
  slideNumber?: number | null
  videoTimestamp?: string | null
  relevantText: string
  sourceType?: 'PDF' | 'PPT' | 'PPTX' | 'MP4' | 'VIDEO'
  materialId?: string
}

export interface TutorResponse {
  answer: string
  sources: SourceCitation[]
  confidence: number
  grounded: boolean
  retrievedChunksCount?: number
  retrievedChunks?: any[]
  groundingStatus?: 'SOURCE-BACKED' | 'OUTSIDE KNOWLEDGE' | 'NOT COVERED'
  language?: string
}
