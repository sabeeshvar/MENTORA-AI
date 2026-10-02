import 'dotenv/config'
import { GeminiProvider } from '../server/services/ai/gemini.service'

async function runQuizDedupTest() {
  console.log('====================================================')
  console.log('TEST: PRIORITY 4 — HISTORICAL QUESTION DEDUPLICATION')
  console.log('====================================================')

  const gemini = new GeminiProvider()

  // 1. Test normalized question hash computation
  console.log('\nStep 1: Testing normalized question hash computation...')
  const q1 = 'What is the primary objective of Backpropagation in neural networks?'
  const q1Variant = 'what is the primary objective of backpropagation in neural networks?  '
  const q2 = 'How does gradient descent update model weights?'

  const hash1 = gemini.computeQuestionHash(q1)
  const hash1Variant = gemini.computeQuestionHash(q1Variant)
  const hash2 = gemini.computeQuestionHash(q2)

  console.log(`  Hash 1:         ${hash1}`)
  console.log(`  Hash 1 Variant: ${hash1Variant}`)
  console.log(`  Hash 2:         ${hash2}`)

  if (hash1 !== hash1Variant) {
    throw new Error('FAILED: Normalized question hashes should be identical regardless of case/whitespace!')
  }
  if (hash1 === hash2) {
    throw new Error('FAILED: Different questions must produce distinct hashes!')
  }
  console.log('✓ Hash normalization deterministic and invariant to whitespace/casing.')

  // 2. Test Grounded Quiz Generation with prior question exclusion
  console.log('\nStep 2: Generating Quiz 1 (Batch of 2 questions)...')
  const mockChunks = [
    {
      text: 'Neural networks are optimized using gradient descent, where parameters are iteratively updated by calculating the gradient of the loss function with respect to weights through backpropagation. Activation functions like ReLU introduce non-linearity.',
      sourceName: 'DeepLearning_Textbook.pdf',
      pageNumber: 42,
    },
    {
      text: 'Convolutional neural networks use convolutional kernels with pooling layers to achieve translation invariance and parameter sharing in vision applications.',
      sourceName: 'DeepLearning_Textbook.pdf',
      pageNumber: 78,
    },
  ]

  const quiz1 = await gemini.generateGroundedQuiz({
    courseId: 'course_test_dedup',
    topic: 'Backpropagation and Optimization',
    difficulty: 'medium',
    numberOfQuestions: 2,
    chunks: mockChunks,
    questionTypes: ['mcq'],
  })

  console.log(`Quiz 1 generated with ${quiz1.questions.length} questions:`)
  const quiz1Questions = quiz1.questions.map((q) => q.question)
  const quiz1Hashes = quiz1.questions.map((q) => q.questionHash || gemini.computeQuestionHash(q.question))
  quiz1.questions.forEach((q, i) => {
    console.log(`  Q1.${i + 1}: "${q.question}" [Hash: ${q.questionHash}]`)
  })

  // 3. Generate Quiz 2 passing Quiz 1 prior questions and hashes
  console.log('\nStep 3: Generating Quiz 2 with strict deduplication against Quiz 1...')
  const quiz2 = await gemini.generateGroundedQuiz({
    courseId: 'course_test_dedup',
    topic: 'Backpropagation and Optimization',
    difficulty: 'medium',
    numberOfQuestions: 2,
    chunks: mockChunks,
    questionTypes: ['mcq'],
    priorQuestionTexts: quiz1Questions,
    priorQuestionHashes: quiz1Hashes,
  })

  console.log(`Quiz 2 generated with ${quiz2.questions.length} questions:`)
  quiz2.questions.forEach((q, i) => {
    console.log(`  Q2.${i + 1}: "${q.question}" [Hash: ${q.questionHash}]`)
  })

  // 4. Verify ZERO intersection between Quiz 1 and Quiz 2
  console.log('\nStep 4: Computing duplication overlap...')
  const quiz2Hashes = quiz2.questions.map((q) => q.questionHash || gemini.computeQuestionHash(q.question))
  const duplicates = quiz2Hashes.filter((h) => quiz1Hashes.includes(h))
  const repetitionRate = duplicates.length / quiz2.questions.length

  console.log(`  Prior question count:   ${quiz1Hashes.length}`)
  console.log(`  New questions count:     ${quiz2Hashes.length}`)
  console.log(`  Detected duplicates:     ${duplicates.length}`)
  console.log(`  Repetition Rate:         ${(repetitionRate * 100).toFixed(2)}%`)

  if (duplicates.length > 0) {
    throw new Error(`FAILED: Duplicate questions found in second generation! Repetition rate: ${repetitionRate}`)
  }

  console.log('\n[PASS] Priority 4: Historical Question Deduplication completely verified!')
  console.log('====================================================\n')
}

runQuizDedupTest().catch((err) => {
  console.error('[FAIL] Quiz dedup test failed:', err)
  process.exit(1)
})
