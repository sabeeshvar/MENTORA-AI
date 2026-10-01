import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage, isFirebaseConfigured } from './config'

export interface UploadProgressCallback {
  (progressPercent: number): void
}

export const uploadLearningMaterialFile = async (
  userId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<{ downloadUrl: string; storagePath: string }> => {
  const timestamp = Date.now()
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const storagePath = `users/${userId}/materials/${timestamp}_${cleanFileName}`

  if (!isFirebaseConfigured()) {
    // Local demo simulation: simulate upload progress
    if (onProgress) {
      onProgress(30)
      await new Promise((r) => setTimeout(r, 200))
      onProgress(75)
      await new Promise((r) => setTimeout(r, 200))
      onProgress(100)
    }
    // Return object URL or demo path
    const localUrl = URL.createObjectURL(file)
    return {
      downloadUrl: localUrl,
      storagePath,
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
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref)
        resolve({ downloadUrl, storagePath })
      }
    )
  })
}
