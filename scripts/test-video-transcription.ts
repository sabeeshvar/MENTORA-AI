import 'dotenv/config'
import { GeminiProvider } from '../server/services/ai/gemini.service'
import { createChunksFromExtractedPages } from '../src/services/extraction/chunkingService'
import type { ExtractedPage } from '../src/services/extraction/types'
import {
  saveMaterialChunks,
  getMaterialChunks,
  createCourse,
  addCourseMaterial,
} from '../src/lib/supabase/db'
import { registerWithEmail } from '../src/lib/supabase/auth'
import { supabase } from '../src/lib/supabase/client'

// Polyfill localStorage in node environment
const memStorage = new Map<string, string>()
globalThis.localStorage = {
  getItem: (key: string) => memStorage.get(key) || null,
  setItem: (key: string, val: string) => memStorage.set(key, String(val)),
  removeItem: (key: string) => memStorage.delete(key),
  clear: () => memStorage.clear(),
  key: (i: number) => Array.from(memStorage.keys())[i] || null,
  length: 0,
} as any

async function runVideoTranscriptionTest() {
  console.log('====================================================')
  console.log('TEST: PRIORITY 3 — VIDEO INGESTION & TIMESTAMPS')
  console.log('====================================================')

  const gemini = new GeminiProvider()

  // 1. Test transcription method returns structured timestamped segments
  console.log('\nStep 1: Testing backend Gemini audio/video transcription...')
  const dummyBase64 = 'AAAAHGZ0eXBtcDQyAAAAAWlzb21tcDQyAAACAG1vb3Y='
  const result = await gemini.transcribeAudioOrVideo({
    base64Data: dummyBase64,
    mimeType: 'video/mp4',
    fileName: 'Introduction_To_Deep_Learning.mp4',
  })
  const segments = result.segments

  console.log(`Received ${segments.length} timestamped segments from transcription engine:`)
  for (const seg of segments) {
    console.log(`  [${seg.startTimestamp} - ${seg.endTimestamp}] (${seg.startSeconds}s - ${seg.endSeconds}s): ${seg.text}`)
  }

  if (segments.length === 0) {
    throw new Error('FAILED: No segments returned from transcription!')
  }

  const firstSeg = segments[0]
  if (!firstSeg.startTimestamp || typeof firstSeg.startSeconds !== 'number' || !firstSeg.text) {
    throw new Error('FAILED: Segment missing timestamp, start offset, or text!')
  }

  // 2. Establish authenticated session & create a test course/material for RLS compliance
  console.log('\nStep 2: Authenticating and setting up test course/material in Supabase...')
  const testEmail = `videotest_${Date.now()}@mentora-test.com`
  const testPassword = 'Password123!'
  const regUser = await registerWithEmail(testEmail, testPassword, 'Video Auditor')
  console.log(`Authenticated test student: ${regUser.uid}`)

  const course = await createCourse(regUser.uid, {
    title: 'Computer Vision & Deep Learning Lectures',
    subject: 'AI & Data Science',
    description: 'Video lecture collection for Track D ingestion compliance test.',
  })
  console.log(`Created test course: ${course.courseId}`)

  const mat = await addCourseMaterial(course.courseId, {
    name: 'Introduction_To_Deep_Learning.mp4',
    type: 'VIDEO',
    storagePath: `courses/${course.courseId}/Introduction_To_Deep_Learning.mp4`,
    downloadURL: '',
    processingStatus: 'uploaded',
    ownerId: regUser.uid,
    size: 1048576,
  })
  console.log(`Created test course material: ${mat.materialId}`)

  // 3. Convert segments into course chunks with video timestamp metadata
  console.log('\nStep 3: Converting transcript segments into course chunks...')
  const pages: ExtractedPage[] = segments.map((seg, idx) => ({
    pageNumber: idx + 1,
    text: seg.text,
    videoTimestamp: `${seg.startTimestamp} - ${seg.endTimestamp}`,
    startTimestamp: String(seg.startSeconds),
    endTimestamp: String(seg.endSeconds),
    title: `Lecture Segment ${seg.startTimestamp}`,
  }))

  const chunks = createChunksFromExtractedPages(pages, {
    courseId: course.courseId,
    materialId: mat.materialId,
    sourceName: 'Introduction_To_Deep_Learning.mp4',
    sourceType: 'VIDEO',
  })

  console.log(`Created ${chunks.length} video lecture chunks.`)
  const testChunk = chunks[0]
  console.log('Video chunk verification:')
  console.log('  - Chunk ID:', testChunk.chunkId)
  console.log('  - Source Type:', testChunk.sourceType)
  console.log('  - Video Timestamp:', testChunk.videoTimestamp)
  console.log('  - Start Timestamp:', testChunk.startTimestamp)
  console.log('  - End Timestamp:', testChunk.endTimestamp)
  console.log('  - Section Title:', testChunk.sectionTitle)

  if (testChunk.sourceType !== 'VIDEO') {
    throw new Error(`FAILED: Chunk sourceType is not VIDEO: ${testChunk.sourceType}`)
  }
  if (!testChunk.videoTimestamp) {
    throw new Error('FAILED: Chunk videoTimestamp was not preserved!')
  }

  // 4. Test Remote Supabase Course Chunks insertion & retrieval
  console.log('\nStep 4: Persisting video chunks into remote Supabase database...')
  await saveMaterialChunks(course.courseId, mat.materialId, chunks)
  console.log('✓ Video chunks persisted successfully to public.course_chunks!')

  const retrieved = await getMaterialChunks(course.courseId, mat.materialId)
  console.log(`✓ Retrieved ${retrieved.length} chunks back from remote database.`)
  const found = retrieved.find((c) => c.videoTimestamp === testChunk.videoTimestamp)

  if (!found) {
    throw new Error('FAILED: Could not find persisted video chunk with matching timestamp!')
  }
  console.log(`✓ Confirmed remote timestamp preservation: "${found.videoTimestamp}"`)

  // 5. Cleanup test artifacts
  console.log('\nStep 5: Cleaning up test course...')
  await supabase.from('courses').delete().eq('id', course.courseId)
  console.log('Cleaned up test course.')

  console.log('\n[PASS] Priority 3: Video Ingestion & Timestamp Preservation completely verified!')
  console.log('====================================================\n')
}

runVideoTranscriptionTest().catch((err) => {
  console.error('[FAIL] Video transcription test failed:', err)
  process.exit(1)
})
