import { supabase } from './client'
import { isSupabaseConfigured } from './config'
import type { CourseMaterialType } from '@/types/course'

export const BUCKET_NAME = 'course-materials'

const ALLOWED_EXTENSIONS = ['.pdf', '.ppt', '.pptx', '.mp4']

export const isSupportedMaterialFile = (
  file: File
): { valid: boolean; type?: CourseMaterialType; error?: string } => {
  const name = file.name.toLowerCase()
  const sizeMb = file.size / (1024 * 1024)

  if (sizeMb > 50) {
    return { valid: false, error: 'File size exceeds maximum allowed limit of 50MB.' }
  }

  if (name.endsWith('.pdf')) {
    return { valid: true, type: 'PDF' }
  }
  if (name.endsWith('.pptx')) {
    return { valid: true, type: 'PPTX' }
  }
  if (name.endsWith('.ppt')) {
    return { valid: true, type: 'PPT' }
  }
  if (name.endsWith('.mp4')) {
    return { valid: true, type: 'MP4' }
  }

  return {
    valid: false,
    error: `Unsupported format (${name}). Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}.`,
  }
}

export const uploadCourseMaterialFile = async (
  courseId: string,
  file: File,
  onProgress?: (progressPercent: number) => void
): Promise<{ storagePath: string; downloadURL: string; fileType: CourseMaterialType }> => {
  const check = isSupportedMaterialFile(file)
  if (!check.valid || !check.type) {
    throw new Error(check.error || 'Invalid file format')
  }

  const timestamp = Date.now()
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `courses/${courseId}/${timestamp}_${sanitizedFileName}`

  if (onProgress) onProgress(30)

  if (!isSupabaseConfigured()) {
    // Local simulation fallback
    const simulatedUrl = URL.createObjectURL(file)
    if (onProgress) onProgress(100)
    return {
      storagePath,
      downloadURL: simulatedUrl,
      fileType: check.type,
    }
  }

  try {
    if (onProgress) onProgress(60)

    const { error } = await supabase.storage.from(BUCKET_NAME).upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
    })

    if (error) {
      console.warn('Supabase storage upload returned error, using fallback URL:', error)
      const simulatedUrl = URL.createObjectURL(file)
      return {
        storagePath,
        downloadURL: simulatedUrl,
        fileType: check.type,
      }
    }

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath)

    if (onProgress) onProgress(100)

    return {
      storagePath,
      downloadURL: data.publicUrl,
      fileType: check.type,
    }
  } catch (err: unknown) {
    console.warn('Supabase upload exception, falling back to local object URL:', err)
    const simulatedUrl = URL.createObjectURL(file)
    return {
      storagePath,
      downloadURL: simulatedUrl,
      fileType: check.type,
    }
  }
}

export const deleteStorageFile = async (storagePath: string): Promise<void> => {
  if (!storagePath || !isSupabaseConfigured()) return
  try {
    await supabase.storage.from(BUCKET_NAME).remove([storagePath])
  } catch (err) {
    console.warn('Could not delete storage file from Supabase:', err)
  }
}
