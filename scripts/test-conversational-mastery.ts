import 'dotenv/config'
import { GeminiProvider } from '../server/services/ai/gemini.service'
import { MasteryService } from '../src/services/masteryService'
import { getTopicMastery } from '../src/lib/supabase/db'

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

async function runConversationalMasteryTest() {
  console.log('====================================================')
  console.log('TEST: PRIORITY 7 — CONVERSATIONAL MASTERY')
  console.log('====================================================')

  const gemini = new GeminiProvider()
  const testUserId = `learner_cm_${Date.now()}`
  const testCourseId = `course_cm_${Date.now()}`

  const mockCourseChunks = [
    {
      text: 'Backpropagation computes the gradient of the loss function with respect to each weight in a multi-layer neural network using the chain rule of calculus.',
      sourceName: 'DeepLearning_Textbook.pdf',
      sectionTitle: 'Backpropagation Algorithm',
      pageNumber: 34,
    },
  ]

  // Test Case 1: Pure Student Question -> Must NOT produce mastery update
  console.log('\nCase 1: Student asks an informational question ("What is backpropagation?")...')
  const questionInput = 'What is backpropagation?'
  const eval1 = await gemini.evaluateConversationalUnderstanding({
    courseId: testCourseId,
    studentStatement: questionInput,
    courseTitle: 'Deep Learning',
    chunks: mockCourseChunks as any,
  })

  console.log('  Evaluation result for question:')
  console.log(`    - isExplanatory: ${eval1.isExplanatory}`)
  console.log(`    - confidence:    ${eval1.confidence}`)
  console.log(`    - feedback:      "${eval1.feedback}"`)

  if (eval1.isExplanatory) {
    throw new Error('FAILED Case 1: Pure questions must NOT be evaluated as explanatory mastery signals!')
  }

  const masteryAttempt1 = await MasteryService.processConversationalMastery(
    testUserId,
    testCourseId,
    eval1.topicName || '',
    eval1.isCorrect ? 1.0 : 0.0,
    eval1.confidence
  )

  if (masteryAttempt1 !== null) {
    throw new Error('FAILED Case 1: Mastery update was erroneously produced for a question!')
  }
  console.log('✓ Verified: Pure questions do NOT alter topic mastery.')

  // Test Case 2: Student Explanation -> Valid Mastery Signal
  console.log('\nCase 2: Student provides an explanatory conceptual statement...')
  const explanationInput =
    'Backpropagation works by calculating the gradient of the loss with respect to each weight using the chain rule of calculus backward through network layers.'

  const eval2 = await gemini.evaluateConversationalUnderstanding({
    courseId: testCourseId,
    studentStatement: explanationInput,
    courseTitle: 'Deep Learning',
    chunks: mockCourseChunks as any,
  })

  console.log('  Evaluation result for explanation:')
  console.log(`    - isExplanatory: ${eval2.isExplanatory}`)
  console.log(`    - topicName:     "${eval2.topicName}"`)
  console.log(`    - isCorrect:     ${eval2.isCorrect}`)
  console.log(`    - confidence:    ${eval2.confidence}`)
  console.log(`    - feedback:      "${eval2.feedback}"`)

  if (!eval2.isExplanatory) {
    throw new Error('FAILED Case 2: Substantive student explanation was not recognized as explanatory!')
  }
  if (eval2.confidence < 0.7) {
    throw new Error(`FAILED Case 2: Confidence too low for accurate explanation: ${eval2.confidence}`)
  }

  // Process mastery update
  const updatedMastery = await MasteryService.processConversationalMastery(
    testUserId,
    testCourseId,
    eval2.topicName || 'Backpropagation Algorithm',
    eval2.isCorrect ? 0.9 : 0.3,
    eval2.confidence
  )

  if (!updatedMastery) {
    throw new Error('FAILED Case 2: Failed to record conversational mastery update!')
  }

  console.log('  Mastery calibrated from conversation:')
  console.log(`    - Topic ID:     ${updatedMastery.topicId}`)
  console.log(`    - Mastery Score:${Math.round(updatedMastery.masteryScore * 100)}%`)
  console.log(`    - Total Attempts: ${updatedMastery.attempts}`)
  console.log(`    - Trend:        ${updatedMastery.trend}`)

  // Verify stored in DB/cache
  const stored = await getTopicMastery(testUserId, updatedMastery.topicId)
  if (!stored) {
    throw new Error('FAILED Case 2: Topic mastery not found in persistent store!')
  }
  console.log(`✓ Topic mastery verified in store: ${stored.topicName} (${Math.round(stored.masteryScore * 100)}%)`)

  console.log('\n[PASS] Priority 7: Conversational Mastery completely verified!')
  console.log('====================================================\n')
}

runConversationalMasteryTest().catch((err) => {
  console.error('[FAIL] Conversational mastery test failed:', err)
  process.exit(1)
})
