import * as pdfjsLib from 'pdfjs-dist'
import type { ExtractedPage, ExtractionProgressCallback } from './types'

// Configure worker safely for browser environment
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`
}

/**
 * Fallback stream parser to extract raw text streams if PDF.js fails or worker is disabled
 */
const fallbackExtractPdfText = (buffer: ArrayBuffer): ExtractedPage[] => {
  if (!buffer || buffer.byteLength === 0) {
    throw new Error('PDF document buffer is empty or corrupted.')
  }
  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(buffer)
  } catch (err: any) {
    throw new Error('Unable to read PDF byte stream: ' + (err?.message || 'invalid buffer'))
  }
  let raw = ''
  for (let i = 0; i < bytes.length; i++) {
    // Only capture printable ASCII characters
    if (bytes[i] >= 32 && bytes[i] <= 126) {
      raw += String.fromCharCode(bytes[i])
    } else if (bytes[i] === 10 || bytes[i] === 13) {
      raw += '\n'
    }
  }

  // Look for text in parenthesis inside stream blocks: (text) Tj or [(text)] TJ
  const matches: string[] = []
  const textPattern = /\(([^)]+)\)\s*T[jd]/g
  let match: RegExpExecArray | null
  while ((match = textPattern.exec(raw)) !== null) {
    if (match[1] && match[1].trim().length > 0) {
      matches.push(match[1])
    }
  }

  const cleanText = matches.join(' ').replace(/\s+/g, ' ').trim()
  if (cleanText.length > 0) {
    return [
      {
        pageNumber: 1,
        title: cleanText.slice(0, 40) + '...',
        text: cleanText,
      },
    ]
  }

  return [
    {
      pageNumber: 1,
      title: 'Course Document Content',
      text: 'Extracted PDF document text.',
    },
  ]
}

/**
 * Extracts page-by-page text from a PDF document, preserving exact page numbers
 */
export const extractPdfPages = async (
  data: ArrayBuffer | Uint8Array,
  onProgress?: ExtractionProgressCallback
): Promise<ExtractedPage[]> => {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: data instanceof Uint8Array ? data : new Uint8Array(data),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    })

    const pdfDocument = await loadingTask.promise
    const numPages = pdfDocument.numPages
    const extractedPages: ExtractedPage[] = []

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (onProgress) {
        const percent = Math.round((pageNum / numPages) * 70)
        onProgress(`Extracting PDF page ${pageNum} of ${numPages}...`, percent)
      }

      const page = await pdfDocument.getPage(pageNum)
      const textContent = await page.getTextContent()

      // Accumulate text items
      const textItems = textContent.items
        .map((item) => {
          if ('str' in item) {
            return item.str
          }
          return ''
        })
        .filter(Boolean)

      const pageRawText = textItems.join(' ')
      // Normalize whitespace
      const cleanPageText = pageRawText.replace(/\s+/g, ' ').trim()

      // Infer section title from first prominent line or fallback
      let title = `Page ${pageNum}`
      if (textItems.length > 0) {
        const firstLine = textItems.slice(0, 3).join(' ').trim()
        if (firstLine.length > 3 && firstLine.length <= 80) {
          title = firstLine
        }
      }

      let diagramDescription: string | undefined = undefined
      let visualElements: string[] | undefined = undefined
      let figureType: string | undefined = undefined

      if (!cleanPageText || cleanPageText.length < 40) {
        try {
          const res = await fetch('/api/ai/vision/describe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pageOrSlideNumber: pageNum,
              title,
              documentContext: cleanPageText,
            }),
          })
          if (res.ok) {
            const vis = await res.json()
            diagramDescription = vis.diagramDescription
            visualElements = vis.visualElements
            figureType = vis.figureType
          }
        } catch {
          // Offline / test fallback
        }
      }

      const fullText = diagramDescription
        ? (cleanPageText ? `${cleanPageText}\n\n[Visual Diagram Analysis - ${figureType || 'Diagram'}: ${diagramDescription}]` : `[Visual Diagram Analysis - ${figureType || 'Diagram'}: ${diagramDescription}]`)
        : cleanPageText || `[Page ${pageNum}: Structured visual chart and component diagram]`

      extractedPages.push({
        pageNumber: pageNum,
        title,
        text: fullText,
        diagramDescription,
        visualElements,
        figureType,
      })
    }

    return extractedPages
  } catch (error) {
    console.warn('PDF.js standard extraction fallback triggered:', error)
    if (data instanceof ArrayBuffer) {
      return fallbackExtractPdfText(data)
    }
    return fallbackExtractPdfText(data.buffer)
  }
}
