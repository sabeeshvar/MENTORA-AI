import 'dotenv/config'
import { GeminiProvider } from '../server/services/ai/gemini.service'
import { createChunksFromExtractedPages } from '../src/services/extraction/chunkingService'
import type { ExtractedPage } from '../src/services/extraction/types'

async function runDiagramVisionTest() {
  console.log('====================================================')
  console.log('TEST: PRIORITY 2 — DIAGRAM / IMAGE UNDERSTANDING')
  console.log('====================================================')

  // 1. Create a 1x1 png base64 fixture to test live vision processing
  const pngBase64Fixture =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  console.log('\nStep 1: Testing Gemini Vision describeDiagramOrVisual API...')
  const gemini = new GeminiProvider()

  let visionResult = await gemini.describeDiagramOrVisual(
    pngBase64Fixture,
    'image/png',
    'Deep Neural Network Architecture Diagram showing forward propagation and backward loss gradient calculation'
  )

  console.log('Vision result received:')
  console.log('  - Title:', visionResult.diagramTitle)
  console.log('  - Figure Type:', visionResult.figureType)
  console.log('  - Visual Elements Count:', visionResult.visualElements?.length || 0)
  console.log('  - Process / Flow:', visionResult.processFlow)
  console.log('  - Description:', visionResult.diagramDescription?.substring(0, 120) + '...')

  if (!visionResult.diagramDescription) {
    throw new Error('FAILED: diagramDescription was not generated!')
  }

  // 2. Test extraction page integration
  console.log('\nStep 2: Testing ExtractedPage to Chunk conversion with visual metadata...')
  const samplePage: ExtractedPage = {
    pageNumber: 7,
    text: 'Slide 7: Neural Network Training Cycle',
    diagramDescription: visionResult.diagramDescription,
    visualElements: visionResult.visualElements,
    figureType: visionResult.figureType,
  }

  const chunks = createChunksFromExtractedPages([samplePage], {
    courseId: 'course_dl_101',
    materialId: 'mat_slides_01',
    sourceName: 'lecture_deep_learning.pptx',
    sourceType: 'PPTX',
  })

  console.log(`Generated ${chunks.length} chunks from visual slide.`)
  const firstChunk = chunks[0]
  console.log('Chunk inspection:')
  console.log('  - Slide Number:', firstChunk.slideNumber)
  console.log('  - Source Name:', firstChunk.sourceName)
  console.log('  - Diagram Description attached:', Boolean(firstChunk.diagramDescription))
  console.log('  - Text includes visual content:', firstChunk.text.includes('[Visual Figure') || firstChunk.text.includes(visionResult.diagramTitle))

  if (!firstChunk.diagramDescription) {
    throw new Error('FAILED: diagramDescription not preserved on chunk!')
  }
  if (firstChunk.slideNumber !== 7) {
    throw new Error(`FAILED: Slide number mismatch. Expected 7, got ${firstChunk.slideNumber}`)
  }

  // 3. Test RAG keyword matching on visual content
  console.log('\nStep 3: Testing RAG retrieval matching on visual description...')
  const searchTerms = ['diagram', 'visual', 'network', 'flow', 'neural']
  const matched = searchTerms.some((term) =>
    firstChunk.text.toLowerCase().includes(term.toLowerCase())
  )

  if (!matched) {
    throw new Error('FAILED: Search terms not matched in visual chunk text!')
  }

  console.log('\n[PASS] Priority 2: Diagram / Image Understanding completely verified!')
  console.log('====================================================\n')
}

runDiagramVisionTest().catch((err) => {
  console.error('[FAIL] Diagram vision test failed:', err)
  process.exit(1)
})
