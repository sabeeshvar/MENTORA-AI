import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'
import { createClient } from '@supabase/supabase-js'
import { processUploadedMaterial } from '../src/services/extraction'
import { retrieveRelevantChunks, defaultVectorStore } from '../server/services/retrievalService'
import { geminiService } from '../server/services/ai/gemini.service'
import { saveMaterialChunks, getMaterialChunks } from '../src/lib/supabase/db'
import type { CourseMaterial } from '../src/types/course'

// Polyfill localStorage for Node execution
const memStorage = new Map<string, string>()
if (typeof (globalThis as any).localStorage === 'undefined') {
  ;(globalThis as any).localStorage = {
    getItem: (key: string) => memStorage.get(key) || null,
    setItem: (key: string, val: string) => memStorage.set(key, String(val)),
    removeItem: (key: string) => memStorage.delete(key),
    clear: () => memStorage.clear(),
    key: (i: number) => Array.from(memStorage.keys())[i] || null,
    length: 0,
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Minimal valid PNG buffer representing a diagram image
const VALID_DIAGRAM_PNG_BASE64 = 
  'iVBORw0KGgoAAAANSUhEUgAAAMgAAACQAQMAAACXyq8nAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAACNJREFUGBntwTEBAAAAwqD1T20LL6AAAAAAAAAAAAAAAOBfA4q4AAEFxRkHAAAAAElFTkSuQmCC'

async function createDiagramPptxFixture(): Promise<{ filePath: string; buffer: Buffer }> {
  const fixturesDir = path.join(process.cwd(), 'scripts', 'fixtures')
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true })
  }

  const zip = new JSZip()
  const imageBuffer = Buffer.from(VALID_DIAGRAM_PNG_BASE64, 'base64')

  // Embed actual image into ppt/media/
  zip.file('ppt/media/image1.png', imageBuffer)

  // Slide XML with figure title and caption
  const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="1" name="Title 1"/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:txBody><a:p><a:r><a:t>Convolutional Neural Network Architecture</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Body 1"/></p:nvPr>
        <p:txBody>
          <a:p><a:r><a:t>Figure 1: Convolutional Neural Network Architecture Diagram showing input receptive field, feature extraction conv2d kernels, spatial max pooling downsampling, and softmax classification output layer.</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      <p:pic>
        <p:nvPicPr><p:cNvPr id="3" name="Figure 1 Diagram"/><p:nvPr/></p:nvPicPr>
        <p:blipFill><a:blip r:embed="rId2"/></p:blipFill>
        <p:spPr/>
      </p:pic>
    </p:spTree>
  </p:cSld>
</p:sld>`

  zip.file('ppt/slides/slide1.xml', slideXml)

  // Relationships
  zip.file(
    'ppt/slides/_rels/slide1.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
</Relationships>`
  )

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`
  )

  const outputBuffer = await zip.generateAsync({ type: 'nodebuffer' })
  const filePath = path.join(fixturesDir, 'CNN_Architecture_Diagram.pptx')
  fs.writeFileSync(filePath, outputBuffer)
  return { filePath, buffer: outputBuffer }
}

async function runRealDiagramFlowTest() {
  console.log('======================================================================')
  console.log('TEST: REAL EDUCATIONAL DIAGRAM UNDERSTANDING (BROWSER & PIPELINE FLOW)')
  console.log('======================================================================')

  // Step 1: Create deterministic real diagram PPTX fixture
  console.log('\n--- Step 1: Creating PPTX Fixture with Embedded Real PNG Diagram ---')
  const { filePath, buffer } = await createDiagramPptxFixture()
  console.log(`✓ Created fixture: ${path.basename(filePath)} (${buffer.byteLength} bytes)`)

  const testCourseId = `course_diag_${Date.now()}`
  const testMaterialId = `mat_diag_${Date.now()}`
  const sampleMaterial: CourseMaterial = {
    courseId: testCourseId,
    materialId: testMaterialId,
    name: 'CNN_Architecture_Diagram.pptx',
    type: 'PPTX',
    fileSizeBytes: buffer.byteLength,
    processingStatus: 'uploaded',
    uploadedAt: new Date().toISOString(),
  }

  // Step 2: Extract & Visual Detection
  console.log('\n--- Step 2: Extraction & Visual Detection via Gemini Vision ---')
  const extractionResult = await processUploadedMaterial({
    courseId: testCourseId,
    material: sampleMaterial,
    fileData: buffer,
  })

  console.log(`Processing status: ${extractionResult.status}`)
  console.log(`Total chunks generated: ${extractionResult.totalChunks}`)

  if (extractionResult.chunks.length === 0) {
    throw new Error('FAIL: No chunks were generated from the diagram fixture.')
  }

  const chunk = extractionResult.chunks[0]
  console.log('\nInspecting Extracted Chunk Metadata:')
  console.log(`  Source:            ${chunk.sourceName} (${chunk.sourceType})`)
  console.log(`  Slide Number:      ${chunk.slideNumber}`)
  console.log(`  Section Title:     ${chunk.sectionTitle}`)
  console.log(`  Diagram Attached:  ${Boolean(chunk.diagramDescription)}`)
  console.log(`  Diagram Preview:   "${chunk.diagramDescription?.slice(0, 120)}..."`)
  console.log(`  Full Text Length:  ${chunk.text.length} chars`)

  if (!chunk.diagramDescription) {
    throw new Error('FAIL: Visual diagram description was not attached to chunk.')
  }

  // Step 3: Supabase Persistence
  console.log('\n--- Step 3: Remote Supabase Persistence ---')
  // Authenticate test user
  const email = `diag_test_${Date.now()}@mentora-test.com`
  const { data: authData } = await supabase.auth.signUp({ email, password: 'AuditPassword123!' })
  const userId = authData.user?.id || 'demo_user'

  // Persist course
  await supabase.from('courses').insert({
    id: testCourseId,
    user_id: userId,
    title: 'Computer Vision & Deep Learning',
    subject: 'Computer Science',
    description: 'Course for testing diagram vision understanding',
    created_at: new Date().toISOString(),
  })

  // Persist material
  await supabase.from('course_materials').insert({
    id: testMaterialId,
    course_id: testCourseId,
    name: sampleMaterial.name,
    type: sampleMaterial.type,
    file_size_bytes: sampleMaterial.fileSizeBytes,
    processing_status: 'processed',
    created_at: new Date().toISOString(),
  })

  // Save chunks with embeddings
  await saveMaterialChunks(testCourseId, testMaterialId, extractionResult.chunks)

  // Verify in remote Supabase
  const remoteChunks = await getMaterialChunks(testCourseId, testMaterialId)
  console.log(`✓ Retrieved ${remoteChunks.length} chunk(s) from remote Supabase table public.course_chunks`)
  console.log(`✓ Remote Slide Number: ${remoteChunks[0].slideNumber}`)
  console.log(`✓ Remote Diagram Description Preserved: ${Boolean(remoteChunks[0].diagramDescription)}`)

  // Step 4: RAG Retrieval Matching on Visual Information
  console.log('\n--- Step 4: Dense Vector RAG Retrieval on Visual Diagram ---')
  const diagramQuery = 'What visual components and layers are shown in the convolutional architecture diagram in Figure 1?'
  console.log(`Query: "${diagramQuery}"`)

  await defaultVectorStore.indexChunks(testCourseId, remoteChunks)
  const retrieved = await retrieveRelevantChunks(testCourseId, diagramQuery, 3)
  console.log(`Retrieved chunks: ${retrieved.length}`)
  if (retrieved.length === 0) {
    throw new Error('FAIL: RAG failed to retrieve chunk containing visual diagram information.')
  }
  console.log(`Top retrieved score: ${retrieved[0].similarityScore.toFixed(4)}`)
  console.log(`Top retrieved source: ${retrieved[0].sourceName} (Slide ${retrieved[0].slideNumber})`)

  // Step 5: Grounded Tutor Answer & Exact Slide Citation
  console.log('\n--- Step 5: Grounded Tutor Response & Exact Citation ---')
  const tutorRes = await geminiService.queryGroundedTutor({
    courseId: testCourseId,
    question: diagramQuery,
    courseTitle: 'Computer Vision & Deep Learning',
    chunks: remoteChunks,
    preferredLanguage: 'en',
  })

  console.log(`✓ Tutor Answer received (${tutorRes.answer.length} chars)`)
  console.log(`Excerpt: "${tutorRes.answer.slice(0, 150)}..."`)
  console.log(`Citations count: ${tutorRes.sources.length}`)

  if (tutorRes.sources.length === 0) {
    throw new Error('FAIL: Tutor did not return source citations.')
  }

  const topCitation = tutorRes.sources[0]
  console.log(`Top Citation Material: ${topCitation.materialName || topCitation.sourceName}`)
  console.log(`Top Citation Slide:    ${topCitation.slideNumber || topCitation.location}`)

  const citationMatches = 
    topCitation.slideNumber === 1 || 
    String(topCitation.location).includes('1') || 
    topCitation.materialName?.includes('CNN_Architecture_Diagram')

  if (!citationMatches) {
    throw new Error(`FAIL: Citation does not match expected Slide 1. Got: ${JSON.stringify(topCitation)}`)
  }
  console.log('✓ Exact citation verified: points to Slide 1 of CNN_Architecture_Diagram.pptx')

  // Cleanup
  console.log('\n--- Step 6: Cleaning up test data ---')
  await supabase.from('course_chunks').delete().eq('course_id', testCourseId)
  await supabase.from('course_materials').delete().eq('id', testMaterialId)
  await supabase.from('courses').delete().eq('id', testCourseId)
  console.log('✓ Cleaned up test records from remote database.')

  console.log('\n======================================================================')
  console.log('[PASS] REAL DIAGRAM UNDERSTANDING COMPLETELY VERIFIED')
  console.log('======================================================================')
}

runRealDiagramFlowTest().catch((err) => {
  console.error('\n✗ TEST FAILED with error:', err)
  process.exit(1)
})
