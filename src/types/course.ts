export type CourseMaterialType = 'PDF' | 'PPT' | 'PPTX' | 'MP4'

export type MaterialProcessingStatus = 'ready' | 'pending' | 'indexing' | 'error'

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
