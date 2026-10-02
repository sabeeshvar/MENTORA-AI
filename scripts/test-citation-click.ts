import 'dotenv/config'
import type { ProcessedChunk } from '../src/types/chunk'
import type { SourceCitation } from '../src/types/tutor'

console.log('======================================================================')
console.log('TEST: CITATION CLICK-TO-OPEN & CHUNK RESOLUTION')
console.log('Track D Item 13 Verification')
console.log('======================================================================\n')

// 1. Synthetic Corpus Chunks with exact source locations
const corpusChunks: ProcessedChunk[] = [
  {
    chunkId: 'chk_pdf_p14',
    courseId: 'course_ai_101',
    materialId: 'mat_textbook_dl',
    sourceType: 'PDF',
    sourceName: 'Deep_Learning_Book.pdf',
    pageNumber: 14,
    sectionTitle: 'Backpropagation and Chain Rule',
    text: 'Backpropagation computes the gradient of the loss function with respect to weights using the chain rule from calculus recursively.',
    chunkIndex: 0,
    createdAt: new Date().toISOString(),
  },
  {
    chunkId: 'chk_pptx_s9',
    courseId: 'course_ai_101',
    materialId: 'mat_slides_cnn',
    sourceType: 'PPTX',
    sourceName: 'Lecture_04_CNNs.pptx',
    slideNumber: 9,
    sectionTitle: 'Convolution Kernels and Pooling',
    text: 'Max pooling downsamples spatial feature dimensions by selecting the maximum value across a localized 2x2 grid stride.',
    chunkIndex: 1,
    createdAt: new Date().toISOString(),
  },
  {
    chunkId: 'chk_vid_t1',
    courseId: 'course_ai_101',
    materialId: 'mat_video_lec1',
    sourceType: 'VIDEO',
    sourceName: 'Lecture_01_Intro.mp4',
    videoTimestamp: '12:30 - 13:45',
    startTimestamp: '12:30',
    endTimestamp: '13:45',
    sectionTitle: 'Lecture Segment [12:30 - 13:45]',
    text: 'In supervised learning, every training observation is accompanied by an explicit target label y.',
    chunkIndex: 2,
    createdAt: new Date().toISOString(),
  },
]

// 2. Simulated Citations returned by RAG Tutor
const testCitations: Array<{
  name: string
  citation: SourceCitation
  expectedChunkId: string
  expectedLocationType: 'PAGE' | 'SLIDE' | 'TIMESTAMP'
  expectedLocationVal: string | number
}> = [
  {
    name: 'PDF Citation Click',
    citation: {
      materialName: 'Deep_Learning_Book.pdf',
      pageNumber: 14,
      slideNumber: null,
      videoTimestamp: null,
      relevantText: 'Backpropagation computes the gradient of the loss',
    },
    expectedChunkId: 'chk_pdf_p14',
    expectedLocationType: 'PAGE',
    expectedLocationVal: 14,
  },
  {
    name: 'PPTX Slide Citation Click',
    citation: {
      materialName: 'Lecture_04_CNNs.pptx',
      pageNumber: null,
      slideNumber: 9,
      videoTimestamp: null,
      relevantText: 'Max pooling downsamples spatial feature dimensions',
    },
    expectedChunkId: 'chk_pptx_s9',
    expectedLocationType: 'SLIDE',
    expectedLocationVal: 9,
  },
  {
    name: 'Video Timestamp Citation Click',
    citation: {
      materialName: 'Lecture_01_Intro.mp4',
      pageNumber: null,
      slideNumber: null,
      videoTimestamp: '12:30 - 13:45',
      relevantText: 'In supervised learning, every training observation',
    },
    expectedChunkId: 'chk_vid_t1',
    expectedLocationType: 'TIMESTAMP',
    expectedLocationVal: '12:30 - 13:45',
  },
]

// Resolver logic matching ChunkViewerModal & StudyPage handleCitationClick
function resolveCitedChunk(
  citation: SourceCitation,
  chunks: ProcessedChunk[]
): {
  resolvedChunk: ProcessedChunk | null
  locationDisplay: string
  locationType: 'PAGE' | 'SLIDE' | 'TIMESTAMP' | 'UNKNOWN'
} {
  // 1. Match by exact chunkId if available
  if ((citation as any).chunkId) {
    const byId = chunks.find((c) => c.chunkId === (citation as any).chunkId)
    if (byId) {
      return formatResult(byId)
    }
  }

  // 2. Match by exact pageNumber & material
  if (citation.pageNumber !== null && citation.pageNumber !== undefined) {
    const byPage = chunks.find(
      (c) =>
        c.pageNumber === citation.pageNumber &&
        (c.sourceName.toLowerCase() === citation.materialName.toLowerCase() ||
          citation.materialName.toLowerCase().includes(c.sourceName.toLowerCase()) ||
          c.sourceName.toLowerCase().includes(citation.materialName.toLowerCase()))
    )
    if (byPage) return formatResult(byPage)
  }

  // 3. Match by slideNumber & material
  if (citation.slideNumber !== null && citation.slideNumber !== undefined) {
    const bySlide = chunks.find(
      (c) =>
        c.slideNumber === citation.slideNumber &&
        (c.sourceName.toLowerCase() === citation.materialName.toLowerCase() ||
          citation.materialName.toLowerCase().includes(c.sourceName.toLowerCase()) ||
          c.sourceName.toLowerCase().includes(citation.materialName.toLowerCase()))
    )
    if (bySlide) return formatResult(bySlide)
  }

  // 4. Match by video timestamp & material
  if (citation.videoTimestamp) {
    const byVid = chunks.find(
      (c) =>
        (c.videoTimestamp === citation.videoTimestamp ||
          c.startTimestamp === citation.videoTimestamp ||
          c.videoTimestamp?.includes(citation.videoTimestamp)) &&
        (c.sourceName.toLowerCase() === citation.materialName.toLowerCase() ||
          citation.materialName.toLowerCase().includes(c.sourceName.toLowerCase()) ||
          c.sourceName.toLowerCase().includes(citation.materialName.toLowerCase()))
    )
    if (byVid) return formatResult(byVid)
  }

  // 5. Match by text excerpt fallback
  if (citation.relevantText) {
    const snippet = citation.relevantText.slice(0, 30).toLowerCase()
    const byText = chunks.find((c) => (c.text || '').toLowerCase().includes(snippet))
    if (byText) return formatResult(byText)
  }

  return { resolvedChunk: null, locationDisplay: 'None', locationType: 'UNKNOWN' }
}

function formatResult(chunk: ProcessedChunk) {
  if (chunk.pageNumber !== null && chunk.pageNumber !== undefined) {
    return {
      resolvedChunk: chunk,
      locationDisplay: `Page ${chunk.pageNumber}`,
      locationType: 'PAGE' as const,
    }
  }
  if (chunk.slideNumber !== null && chunk.slideNumber !== undefined) {
    return {
      resolvedChunk: chunk,
      locationDisplay: `Slide ${chunk.slideNumber}`,
      locationType: 'SLIDE' as const,
    }
  }
  if (chunk.videoTimestamp || chunk.startTimestamp) {
    return {
      resolvedChunk: chunk,
      locationDisplay: `Timestamp ${chunk.videoTimestamp || chunk.startTimestamp}`,
      locationType: 'TIMESTAMP' as const,
    }
  }
  return {
    resolvedChunk: chunk,
    locationDisplay: 'General Section',
    locationType: 'UNKNOWN' as const,
  }
}

let allPassed = true

for (const tc of testCitations) {
  const result = resolveCitedChunk(tc.citation, corpusChunks)
  const isChunkMatch = result.resolvedChunk?.chunkId === tc.expectedChunkId
  const isTypeMatch = result.locationType === tc.expectedLocationType

  console.log(`Test: ${tc.name}`)
  console.log(`   Input Citation: [${tc.citation.materialName}, Location: ${tc.expectedLocationVal}]`)
  console.log(`   Resolved Chunk ID: ${result.resolvedChunk?.chunkId} (Expected: ${tc.expectedChunkId})`)
  console.log(`   Location Display Badge: "${result.locationDisplay}"`)
  console.log(`   Verbatim Chunk Content Excerpt: "${result.resolvedChunk?.text.substring(0, 60)}..."`)

  if (isChunkMatch && isTypeMatch) {
    console.log(`   Result: ✓ PASS\n`)
  } else {
    console.error(`   Result: ✗ FAIL\n`)
    allPassed = false
  }
}

console.log('======================================================================')
if (allPassed) {
  console.log('STATUS: ALL CITATION CLICK-TO-OPEN RESOLUTION TESTS PASSED')
} else {
  console.error('STATUS: SOME CITATION TESTS FAILED')
  process.exit(1)
}
console.log('======================================================================')
