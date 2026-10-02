import JSZip from 'jszip'
import type { ExtractedPage, ExtractionProgressCallback } from './types'

/**
 * Extracts slide title and body text from PPTX slide XML
 */
const parseSlideXml = (
  xmlString: string,
  slideIndex: number
): { title: string; text: string } => {
  // Regex to extract all text nodes: <a:t>...</a:t>
  const textMatches: string[] = []
  const textRegex = /<a:t[^>]*>([^<]+)<\/a:t>/g
  let match: RegExpExecArray | null

  while ((match = textRegex.exec(xmlString)) !== null) {
    if (match[1]) {
      textMatches.push(match[1])
    }
  }

  // Attempt to isolate title text
  let title = `Slide ${slideIndex}`
  // Check for title shape
  const titleBlockMatch = xmlString.match(/<p:ph[^>]*type="(?:title|ctrTitle)"[^>]*>[\s\S]*?<\/p:sp>/)
  if (titleBlockMatch) {
    const titleTexts: string[] = []
    let tMatch: RegExpExecArray | null
    const subRegex = /<a:t[^>]*>([^<]+)<\/a:t>/g
    while ((tMatch = subRegex.exec(titleBlockMatch[0])) !== null) {
      titleTexts.push(tMatch[1])
    }
    const candidate = titleTexts.join(' ').trim()
    if (candidate.length > 2) {
      title = candidate
    }
  } else if (textMatches.length > 0) {
    // Fallback: first text snippet as slide title
    const firstLine = textMatches[0].trim()
    if (firstLine.length > 2 && firstLine.length <= 80) {
      title = firstLine
    }
  }

  const fullText = textMatches.join(' ').replace(/\s+/g, ' ').trim()

  return {
    title,
    text: fullText || `[Slide ${slideIndex}: Diagram or Visual Component]`,
  }
}

/**
 * Fallback text extraction for legacy binary .ppt files or corrupted archives
 */
const extractLegacyPptText = (buffer: ArrayBuffer): ExtractedPage[] => {
  const bytes = new Uint8Array(buffer)
  let raw = ''
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] >= 32 && bytes[i] <= 126) {
      raw += String.fromCharCode(bytes[i])
    } else if (bytes[i] === 10 || bytes[i] === 13) {
      raw += '\n'
    }
  }

  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 4 && !/^[0-9\s.,;]+$/.test(l))

  if (lines.length > 0) {
    return [
      {
        slideNumber: 1,
        title: lines[0] || 'Presentation Slide',
        text: lines.join('\n'),
      },
    ]
  }

  return [
    {
      slideNumber: 1,
      title: 'Presentation Slides',
      text: 'Extracted presentation content.',
    },
  ]
}

/**
 * Extracts slide-by-slide text from a PPT/PPTX file, preserving exact slide numbers
 */
export const extractPptxSlides = async (
  data: ArrayBuffer | Uint8Array,
  onProgress?: ExtractionProgressCallback
): Promise<ExtractedPage[]> => {
  try {
    const zip = await JSZip.loadAsync(data)
    const slideFiles: { name: string; index: number }[] = []

    // Locate all slide XML entries in ppt/slides/
    zip.forEach((relativePath) => {
      const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i)
      if (match) {
        slideFiles.push({
          name: relativePath,
          index: parseInt(match[1], 10),
        })
      }
    })

    // Sort slides in natural numerical order (slide1, slide2, ...)
    slideFiles.sort((a, b) => a.index - b.index)

    if (slideFiles.length === 0) {
      // If no PPTX slide xmls found, attempt fallback
      if (data instanceof ArrayBuffer) {
        return extractLegacyPptText(data)
      }
      return extractLegacyPptText(data.buffer)
    }

    const extractedSlides: ExtractedPage[] = []

    for (let i = 0; i < slideFiles.length; i++) {
      const slideFile = slideFiles[i]
      if (onProgress) {
        const percent = Math.round(((i + 1) / slideFiles.length) * 70)
        onProgress(`Extracting Slide ${slideFile.index} of ${slideFiles.length}...`, percent)
      }

      const fileObj = zip.file(slideFile.name)
      if (fileObj) {
        const xmlText = await fileObj.async('text')
        const { title, text } = parseSlideXml(xmlText, slideFile.index)

        let diagramDescription: string | undefined = undefined
        let visualElements: string[] | undefined = undefined
        let figureType: string | undefined = undefined

        // Look for image in media directory matching this slide if present
        const mediaFiles = zip.file(/^ppt\/media\/image\d+\.(png|jpe?g)/i)
        let imgBase64: string | undefined = undefined
        if (mediaFiles && mediaFiles.length > 0) {
          const matchingMedia = mediaFiles[i % mediaFiles.length]
          if (matchingMedia) {
            imgBase64 = await matchingMedia.async('base64')
          }
        }

        const hasFigureMarkers = /(figure|fig\.|diagram|architecture|flowchart|pipeline|workflow|schematic|network)\b/i.test(text)
        if (!text || text.length < 80 || imgBase64 || hasFigureMarkers) {
          try {
            const endpoint = typeof window !== 'undefined'
              ? '/api/ai/vision/describe'
              : (process.env.API_BASE_URL || 'http://localhost:5000') + '/api/ai/vision/describe'
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageBase64: imgBase64,
                mimeType: 'image/png',
                pageOrSlideNumber: slideFile.index,
                title,
                documentContext: text,
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
          ? (text ? `${text}\n\n[Visual Diagram Analysis - ${figureType || 'Diagram'}: ${diagramDescription}]` : `[Visual Diagram Analysis - ${figureType || 'Diagram'}: ${diagramDescription}]`)
          : text || `[Slide ${slideFile.index}: Structured visual presentation components]`

        extractedSlides.push({
          slideNumber: slideFile.index,
          title,
          text: fullText,
          diagramDescription,
          visualElements,
          figureType,
        })
      }
    }

    return extractedSlides
  } catch (error) {
    console.warn('PPTX zip reader fallback to legacy string extraction:', error)
    if (data instanceof ArrayBuffer) {
      return extractLegacyPptText(data)
    }
    return extractLegacyPptText(data.buffer)
  }
}
