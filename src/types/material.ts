export type MaterialType = 'pdf' | 'pptx' | 'video'

export type ProcessingStatus = 'uploading' | 'processing' | 'ready' | 'error'

export interface MaterialSourceCitation {
  id: string
  materialId: string
  materialTitle: string
  pageNumber?: number
  slideNumber?: number
  timestamp?: number // in seconds for lecture videos
  snippetText: string
  relevanceScore: number
}

export interface LearningMaterial {
  id: string
  userId: string
  title: string
  description?: string
  fileType: MaterialType
  fileUrl: string
  storagePath: string
  fileSizeBytes: number
  status: ProcessingStatus
  errorMessage?: string
  extractedTopics: string[]
  totalPages?: number
  totalSlides?: number
  durationSeconds?: number
  createdAt: string
  updatedAt: string
}
