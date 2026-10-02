import type { CourseMaterialType } from '@/types/course'
import type { ProcessedChunk } from '@/types/chunk'
import type { ExtractedPage, ChunkingOptions } from './types'

/**
 * Cleans extracted raw text
 */
export const cleanExtractedText = (raw: string): string => {
  return raw
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '') // remove unprintable control chars
    .replace(/[ \t]+/g, ' ') // collapse horizontal spaces
    .replace(/\n\s*\n\s*\n+/g, '\n\n') // collapse multiple blank lines
    .trim()
}

/**
 * Splits extracted pages/slides into structured chunks while preserving exact page/slide citations
 */
export const createChunksFromExtractedPages = (
  pages: ExtractedPage[],
  params: {
    courseId: string
    materialId: string
    sourceName: string
    sourceType: CourseMaterialType
    options?: ChunkingOptions
  }
): ProcessedChunk[] => {
  const { courseId, materialId, sourceName, sourceType, options } = params
  const maxChunkSize = options?.maxChunkSizeChars || 1200
  const chunkOverlap = options?.chunkOverlapChars || 150

  const chunks: ProcessedChunk[] = []
  let globalChunkIndex = 0
  const now = new Date().toISOString()
  for (const page of pages) {
    let cleanedText = cleanExtractedText(page.text)
    if (page.diagramDescription && !cleanedText.includes(page.diagramDescription)) {
      cleanedText = cleanedText
        ? `${cleanedText}\n\n[Visual Figure / Diagram Analysis: ${page.diagramDescription}]`
        : `[Visual Figure / Diagram Analysis: ${page.diagramDescription}]`
    }
    if (!cleanedText) continue

    const pageNum = sourceType === 'PPTX' ? undefined : page.pageNumber
    const slideNum = page.slideNumber ?? (sourceType === 'PPTX' ? page.pageNumber : undefined)
    const sectionTitle = page.title?.trim() || (pageNum ? `Page ${pageNum}` : `Slide ${slideNum || page.pageNumber}`)

    // If page content is within normal chunk limit, keep as single chunk
    if (cleanedText.length <= maxChunkSize) {
      const chunkId = `chk_${materialId}_${globalChunkIndex}_${Date.now().toString(36)}`
      const wordCount = cleanedText.split(/\s+/).filter(Boolean).length

      chunks.push({
        chunkId,
        courseId,
        materialId,
        text: cleanedText,
        sourceType,
        sourceName,
        pageNumber: pageNum,
        slideNumber: slideNum,
        videoTimestamp: page.videoTimestamp,
        startTimestamp: page.startTimestamp,
        endTimestamp: page.endTimestamp,
        diagramDescription: page.diagramDescription,
        sectionTitle,
        chunkIndex: globalChunkIndex,
        createdAt: now,
        charCount: cleanedText.length,
        wordCount,
      })
      globalChunkIndex++
      continue
    }

    // Otherwise split long page into overlapping sub-chunks without losing page/slide citation
    const paragraphs = cleanedText.split(/\n\n+/)
    let currentChunkText = ''

    for (const paragraph of paragraphs) {
      if ((currentChunkText + '\n\n' + paragraph).length <= maxChunkSize) {
        currentChunkText = currentChunkText ? currentChunkText + '\n\n' + paragraph : paragraph
      } else {
        if (currentChunkText.trim().length > 0) {
          const chunkId = `chk_${materialId}_${globalChunkIndex}_${Date.now().toString(36)}`
          const trimmed = currentChunkText.trim()
          chunks.push({
            chunkId,
            courseId,
            materialId,
            text: trimmed,
            sourceType,
            sourceName,
            pageNumber: pageNum,
            slideNumber: slideNum,
            videoTimestamp: page.videoTimestamp,
            startTimestamp: page.startTimestamp,
            endTimestamp: page.endTimestamp,
            diagramDescription: page.diagramDescription,
            sectionTitle,
            chunkIndex: globalChunkIndex,
            createdAt: now,
            charCount: trimmed.length,
            wordCount: trimmed.split(/\s+/).filter(Boolean).length,
          })
          globalChunkIndex++
        }

        // Handle paragraphs larger than maxChunkSize by slicing with overlap
        if (paragraph.length > maxChunkSize) {
          let start = 0
          while (start < paragraph.length) {
            const end = Math.min(start + maxChunkSize, paragraph.length)
            const slice = paragraph.slice(start, end).trim()
            if (slice.length > 0) {
              const chunkId = `chk_${materialId}_${globalChunkIndex}_${Date.now().toString(36)}`
              chunks.push({
                chunkId,
                courseId,
                materialId,
                text: slice,
                sourceType,
                sourceName,
                pageNumber: pageNum,
                slideNumber: slideNum,
                videoTimestamp: page.videoTimestamp,
                startTimestamp: page.startTimestamp,
                endTimestamp: page.endTimestamp,
                diagramDescription: page.diagramDescription,
                sectionTitle,
                chunkIndex: globalChunkIndex,
                createdAt: now,
                charCount: slice.length,
                wordCount: slice.split(/\s+/).filter(Boolean).length,
              })
              globalChunkIndex++
            }
            start += maxChunkSize - chunkOverlap
          }
          currentChunkText = ''
        } else {
          currentChunkText = paragraph
        }
      }
    }

    // Push trailing chunk for this page
    if (currentChunkText.trim().length > 0) {
      const chunkId = `chk_${materialId}_${globalChunkIndex}_${Date.now().toString(36)}`
      const trimmed = currentChunkText.trim()
      chunks.push({
        chunkId,
        courseId,
        materialId,
        text: trimmed,
        sourceType,
        sourceName,
        pageNumber: pageNum,
        slideNumber: slideNum,
        sectionTitle,
        chunkIndex: globalChunkIndex,
        createdAt: now,
        charCount: trimmed.length,
        wordCount: trimmed.split(/\s+/).filter(Boolean).length,
      })
      globalChunkIndex++
    }
  }

  return chunks
}
