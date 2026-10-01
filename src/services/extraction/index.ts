import type { CourseMaterial, CourseMaterialType } from '@/types/course'
import {
  saveMaterialChunks,
  updateMaterialProcessingStatus,
} from '@/lib/firebase/firestore'
import { extractPdfPages } from './pdfExtractor'
import { extractPptxSlides } from './pptxExtractor'
import { createChunksFromExtractedPages } from './chunkingService'
import { defaultEmbeddingService } from './embedding'
import type {
  ExtractedPage,
  ExtractionProgressCallback,
  IExtractionService,
  ProcessMaterialResult,
} from './types'

/**
 * Modular extractor registry.
 * Allows plug-and-play replacement of extractors for specific formats.
 */
export class DocumentExtractionManager implements IExtractionService {
  private pdfExtractor: typeof extractPdfPages = extractPdfPages
  private pptxExtractor: typeof extractPptxSlides = extractPptxSlides

  /**
   * Allows plugging in alternative extractors (e.g. server-side OCR, Cloud Vision, etc.)
   */
  public registerPdfExtractor(customExtractor: typeof extractPdfPages) {
    this.pdfExtractor = customExtractor
  }

  public registerPptxExtractor(customExtractor: typeof extractPptxSlides) {
    this.pptxExtractor = customExtractor
  }

  /**
   * Main text extraction dispatcher based on format
   */
  public async extractText(
    data: ArrayBuffer | Uint8Array,
    _fileName: string,
    fileType: CourseMaterialType,
    onProgress?: ExtractionProgressCallback
  ): Promise<ExtractedPage[]> {
    if (fileType === 'PDF') {
      return this.pdfExtractor(data, onProgress)
    }

    if (fileType === 'PPT' || fileType === 'PPTX') {
      return this.pptxExtractor(data, onProgress)
    }

    if (fileType === 'MP4') {
      // Future transcription support
      return [
        {
          title: 'Video Transcript',
          text: `Audio/video transcription for ${_fileName} is prepared for processing.`,
        },
      ]
    }

    throw new Error(`Unsupported material type for text extraction: ${fileType}`)
  }
}

// Singleton default instance
export const defaultExtractionManager = new DocumentExtractionManager()

/**
 * Helper to fetch ArrayBuffer from a URL or File
 */
export const getFileBuffer = async (
  fileOrUrl: File | Blob | string | ArrayBuffer
): Promise<ArrayBuffer> => {
  if (fileOrUrl instanceof ArrayBuffer) {
    return fileOrUrl
  }

  if (fileOrUrl instanceof Blob) {
    return await fileOrUrl.arrayBuffer()
  }

  if (typeof fileOrUrl === 'string') {
    const res = await fetch(fileOrUrl)
    if (!res.ok) {
      throw new Error(`Failed to download material file from URL: ${res.statusText}`)
    }
    return await res.arrayBuffer()
  }

  throw new Error('Invalid file input format for buffer retrieval')
}

export interface ProcessMaterialPipelineParams {
  courseId: string
  material: CourseMaterial
  fileData?: File | Blob | ArrayBuffer
  onProgress?: (stage: string, percent: number) => void
  extractionManager?: IExtractionService
}

/**
 * End-to-end Learning Material Processing Pipeline:
 *
 * Uploaded file
 * -> update status to 'processing'
 * -> extract text (preserving page/slide information)
 * -> clean text
 * -> split into meaningful chunks
 * -> attach metadata
 * -> store processed content in Firestore (courses/{courseId}/materials/{materialId}/chunks)
 * -> update status to 'processed' (or 'failed' on error)
 */
export const processUploadedMaterial = async (
  params: ProcessMaterialPipelineParams
): Promise<ProcessMaterialResult> => {
  const { courseId, material, fileData, onProgress, extractionManager } = params
  const manager = extractionManager || defaultExtractionManager

  const reportProgress = (stage: string, percent: number) => {
    if (onProgress) {
      onProgress(stage, percent)
    }
  }

  try {
    reportProgress('Initializing processing pipeline...', 5)
    await updateMaterialProcessingStatus(courseId, material.materialId, 'processing')

    // 1. Obtain file ArrayBuffer
    reportProgress('Loading document bytes...', 15)
    let buffer: ArrayBuffer
    if (fileData) {
      buffer = await getFileBuffer(fileData)
    } else if (material.downloadURL) {
      buffer = await getFileBuffer(material.downloadURL)
    } else {
      throw new Error('Neither file buffer nor download URL is available for this material.')
    }

    // 2. Extract structured pages/slides
    reportProgress(`Extracting content from ${material.name}...`, 30)
    const extractedPages = await manager.extractText(
      buffer,
      material.name,
      material.type,
      (stage, subPercent) => {
        // Map 0-100% of extraction to 30-75% overall
        reportProgress(stage, 30 + Math.round((subPercent / 100) * 45))
      }
    )

    if (!extractedPages || extractedPages.length === 0) {
      throw new Error('No readable text or content could be extracted from this document.')
    }

    // 3. Clean and chunk into structured units with complete metadata
    reportProgress('Cleaning text and generating semantic chunks...', 80)
    const chunks = createChunksFromExtractedPages(extractedPages, {
      courseId,
      materialId: material.materialId,
      sourceName: material.name,
      sourceType: material.type,
      options: {
        maxChunkSizeChars: 1200,
        chunkOverlapChars: 150,
      },
    })

    if (chunks.length === 0) {
      throw new Error('Extracted content yielded zero chunks.')
    }

    // 4. Generate dense semantic embeddings for chunks
    reportProgress(`Generating vector embeddings for ${chunks.length} chunks...`, 86)
    const texts = chunks.map((c) => `${c.sectionTitle}: ${c.text}`)
    const embeddings = await defaultEmbeddingService.generateBatchEmbeddings(texts)
    for (let i = 0; i < chunks.length; i++) {
      chunks[i].embedding = embeddings[i]
      chunks[i].embeddingModel = defaultEmbeddingService.modelName
    }

    // 5. Save chunks with embeddings and metadata to Firestore
    reportProgress(`Saving ${chunks.length} structured chunks to Firestore...`, 92)
    await saveMaterialChunks(courseId, material.materialId, chunks)

    // 5. Update processing status to 'processed'
    reportProgress('Finalizing material processing...', 98)
    await updateMaterialProcessingStatus(courseId, material.materialId, 'processed', {
      chunksCount: chunks.length,
    })

    reportProgress('Completed processing successfully!', 100)

    return {
      materialId: material.materialId,
      courseId,
      chunks,
      totalChunks: chunks.length,
      totalPagesOrSlides: extractedPages.length,
      processedAt: new Date().toISOString(),
    }
  } catch (error: any) {
    const errorMsg = error?.message || 'Failed to process learning material'
    console.error(`Pipeline failure for material ${material.materialId}:`, error)

    await updateMaterialProcessingStatus(courseId, material.materialId, 'failed', {
      errorMessage: errorMsg,
    })

    throw error
  }
}

// Re-export modular components for flexible customization
export * from './types'
export * from './pdfExtractor'
export * from './pptxExtractor'
export * from './chunkingService'
export * from './embedding'
export * from './videoExtractor'
