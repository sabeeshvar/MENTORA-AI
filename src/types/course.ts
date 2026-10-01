export type CourseMaterialType = 'PDF' | 'PPT' | 'PPTX' | 'MP4'

export type MaterialProcessingStatus =
  | 'uploaded'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'ready'

export interface CourseMaterial {
  materialId: string
  courseId: string
  name: string
  type: CourseMaterialType
  storagePath: string
  downloadURL: string
  uploadedAt: string
  processingStatus: MaterialProcessingStatus
  fileSizeBytes?: number
  chunksCount?: number
  errorMessage?: string
}

export interface Course {
  courseId: string
  ownerId: string
  title: string
  description: string
  subject: string
  createdAt: string
  updatedAt: string
  materialsCount?: number
}
