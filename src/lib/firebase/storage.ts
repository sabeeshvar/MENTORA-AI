import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage, isFirebaseConfigured } from './config'
import type { CourseMaterialType } from '@/types/course'

export interface UploadProgressCallback {
  (progressPercent: number): void
}

/**
 * Detects supported course material type from file extension
 */
export const detectCourseMaterialType = (fileName: string): CourseMaterialType => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  switch (ext) {
    case 'pdf':
      return 'PDF'
    case 'ppt':
      return 'PPT'
    case 'pptx':
      return 'PPTX'
    case 'mp4':
    case 'm4v':
    case 'mov':
      return 'MP4'
    default:
      return 'PDF'
  }
}

/**
 * Validates if the file format is supported (PDF, PPT, PPTX, MP4)
 */
export const isSupportedMaterialFile = (fileName: string): boolean => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  return ['pdf', 'ppt', 'pptx', 'mp4'].includes(ext)
}

/**
 * Uploads a course learning material to Firebase Storage
 */
export const uploadCourseMaterialFile = async (
  courseId: string,
  _ownerId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<{ downloadURL: string; storagePath: string; fileType: CourseMaterialType }> => {
  if (!isSupportedMaterialFile(file.name)) {
    throw new Error('Unsupported file format. Please upload a PDF, PPT, PPTX, or MP4 file.')
  }

  const fileType = detectCourseMaterialType(file.name)
  const timestamp = Date.now()
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const storagePath = `courses/${courseId}/materials/${timestamp}_${cleanFileName}`

  if (!isFirebaseConfigured()) {
    // Local demo simulation: simulate progress ticks
    if (onProgress) {
      onProgress(25)
      await new Promise((r) => setTimeout(r, 120))
      onProgress(60)
      await new Promise((r) => setTimeout(r, 120))
      onProgress(95)
      await new Promise((r) => setTimeout(r, 80))
      onProgress(100)
    }

    const localUrl = URL.createObjectURL(file)
    return {
      downloadURL: localUrl,
      storagePath,
      fileType,
    }
  }

  const storageRef = ref(storage, storagePath)
  const uploadTask = uploadBytesResumable(storageRef, file)

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
        if (onProgress) onProgress(percent)
      },
      (error) => {
        reject(error)
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
          resolve({ downloadURL, storagePath, fileType })
        } catch (err) {
          reject(err)
        }
      }
    )
  })
}

/**
 * Deletes a file from Firebase Storage
 */
export const deleteStorageFile = async (storagePath: string): Promise<void> => {
  if (!storagePath) return

  if (!isFirebaseConfigured()) {
    // In local fallback mode, simulation is instantaneous
    return
  }

  try {
    const fileRef = ref(storage, storagePath)
    await deleteObject(fileRef)
  } catch (err) {
    console.warn('Could not delete storage file or file does not exist:', err)
  }
}

/**
 * Legacy upload function maintained for backwards compatibility
 */
export const uploadLearningMaterialFile = async (
  userId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<{ downloadUrl: string; storagePath: string }> => {
  const result = await uploadCourseMaterialFile('default', userId, file, onProgress)
  return {
    downloadUrl: result.downloadURL,
    storagePath: result.storagePath,
  }
}
