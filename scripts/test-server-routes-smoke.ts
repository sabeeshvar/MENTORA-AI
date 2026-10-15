/**
 * API Route Smoke Test for Express Server
 * Verifies that all newly added and existing quiz endpoints respond correctly.
 */

import 'dotenv/config'
import app from '../server/index'
import type { Server } from 'http'

async function runRouteSmokeTest() {
  console.log('--- RUNNING API ROUTE SMOKE TESTS ---')
  const port = 5099
  const server: Server = app.listen(port)

  try {
    // 1. Test /api/health
    const healthRes = await fetch(`http://localhost:${port}/api/health`)
    const healthData = await healthRes.json()
    console.log(`✓ /api/health: HTTP ${healthRes.status}, status="${healthData.status}"`)
    if (healthRes.status !== 200) throw new Error('Health check failed')

    // 2. Test /api/ai/quiz/generate without chunks -> Expect 422 INSUFFICIENT_MATERIAL
    const genRes = await fetch(`http://localhost:${port}/api/ai/quiz/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: 'crs_empty_test',
        topic: 'Nonexistent Concept',
        chunks: [],
      }),
    })
    const genData = await genRes.json()
    console.log(`✓ /api/ai/quiz/generate with 0 chunks: HTTP ${genRes.status}, code="${genData.code || genData.error}"`)
    if (genRes.status !== 422) throw new Error(`Expected 422, got ${genRes.status}`)

    // 3. Test /api/ai/quiz/remedy -> Verify remedial explanation
    const remedyRes = await fetch(`http://localhost:${port}/api/ai/quiz/remedy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'explain_simply',
        question: 'What is a mutex lock?',
        studentAnswer: 'A network packet buffer',
        correctConcept: 'Mutual exclusion primitive ensuring only one thread executes a critical section',
        sourceContext: 'A mutex provides mutual exclusion by allowing only one lock owner at a time.',
      }),
    })
    const remedyData = await remedyRes.json()
    console.log(`✓ /api/ai/quiz/remedy: HTTP ${remedyRes.status}, text="${remedyData.text?.substring(0, 60)}..."`)
    if (remedyRes.status !== 200 || !remedyData.text) throw new Error('Remedy endpoint failed')

    // 4. Test /api/ai/quiz/submit -> Verify server-side evaluation & submission
    const submitRes = await fetch(`http://localhost:${port}/api/ai/quiz/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quizId: 'q_smoke_1',
        courseId: 'crs_smoke',
        userId: 'usr_smoke',
        topic: 'Concurrency',
        difficulty: 'medium',
        answers: [
          {
            questionId: 'q1',
            studentAnswer: 'wait()',
          },
        ],
        questions: [
          {
            questionId: 'q1',
            courseId: 'crs_smoke',
            topic: 'Concurrency',
            type: 'mcq',
            difficulty: 'medium',
            question: 'Which operation decrements the semaphore?',
            options: ['wait()', 'signal()', 'yield()', 'fork()'],
            correctAnswer: 'wait()',
            explanation: 'wait() decrements the semaphore count.',
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    })
    const submitData = await submitRes.json()
    console.log(
      `✓ /api/ai/quiz/submit: HTTP ${submitRes.status}, score=${submitData.attempt?.score}, nextDiff="${submitData.nextAdaptiveDifficulty}"`
    )
    if (submitRes.status !== 200 || !submitData.attempt) throw new Error('Submit endpoint failed')

    console.log('\nALL EXPRESS API ROUTE SMOKE TESTS PASSED!')
  } finally {
    server.close()
  }
}

runRouteSmokeTest().catch((err) => {
  console.error('Route smoke test failed:', err)
  process.exit(1)
})
