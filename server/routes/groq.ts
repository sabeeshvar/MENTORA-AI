import { Router, Request, Response } from 'express'
import { serverConfig } from '../config'
import {
  queryGroqTutor,
  generateGroundedQuiz,
  evaluateQuestionAnswer,
  explainRemedyAction,
} from '../services/groqService'
import { retrieveRelevantChunks, defaultVectorStore } from '../services/retrievalService'

export const groqRouter = Router()

/**
 * Status check for Groq AI service configuration
 */
groqRouter.get('/status', (_req: Request, res: Response) => {
  res.json({
    configured: serverConfig.isGroqConfigured,
    model: 'llama-3.3-70b-versatile',
  })
})

/**
 * Standalone RAG Retrieval Endpoint:
 * Retrieves top-K relevant chunks for a question, filtered strictly by courseId
 */
groqRouter.post('/retrieve', async (req: Request, res: Response) => {
  const { courseId, query, chunks, topK } = req.body

  if (!courseId || typeof courseId !== 'string') {
    return res.status(400).json({ error: 'courseId is required' })
  }
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query is required' })
  }

  try {
    if (Array.isArray(chunks) && chunks.length > 0) {
      await defaultVectorStore.indexChunks(courseId, chunks)
    }

    const results = await retrieveRelevantChunks(
      courseId.trim(),
      query.trim(),
      typeof topK === 'number' ? topK : 5
    )

    return res.json({
      courseId,
      query,
      retrievedCount: results.length,
      chunks: results,
    })
  } catch (error: any) {
    console.error('Retrieval error:', error)
    return res.status(500).json({ error: error?.message || 'Retrieval failed' })
  }
})

/**
 * MENTORA AI Source-Grounded Tutor Endpoint:
 *
 * Student question
 * -> embedding
 * -> retrieval (filtered by courseId)
 * -> relevance filtering
 * -> context construction
 * -> Groq LLaMA 3.3 inference
 * -> return answer + source citations
 */
groqRouter.post('/tutor', async (req: Request, res: Response) => {
  const { question, courseId, chunks, courseTitle, conversationHistory, topK } = req.body

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({
      error: 'Question is required and must be a non-empty string.',
    })
  }

  if (!courseId || typeof courseId !== 'string') {
    return res.status(400).json({
      error: 'courseId is required to scope retrieval to the active course.',
    })
  }

  if (!serverConfig.isGroqConfigured) {
    return res.status(503).json({
      error:
        'GROQ_API_KEY is not configured on the server. Please set GROQ_API_KEY in your server environment or .env file to enable live AI tutor queries.',
      configured: false,
    })
  }

  try {
    const chunkList = Array.isArray(chunks) ? chunks : []
    const response = await queryGroqTutor({
      courseId: courseId.trim(),
      question: question.trim(),
      chunks: chunkList,
      courseTitle: typeof courseTitle === 'string' ? courseTitle : undefined,
      conversationHistory: Array.isArray(conversationHistory) ? conversationHistory : undefined,
      topK: typeof topK === 'number' ? topK : 5,
    })

    return res.json(response)
  } catch (error: any) {
    console.error('Groq Tutor inference error:', error)
    const status = error?.status || 500
    const msg = error?.message || 'Failed to process question with Groq AI'
    return res.status(status).json({
      error: msg,
      details: error?.error?.message || undefined,
    })
  }
})

/**
 * MENTORA AI Adaptive Quiz Generator Endpoint:
 * Retrieves course chunks and prompts Groq to generate grounded questions
 */
groqRouter.post('/quiz/generate', async (req: Request, res: Response) => {
  const { courseId, topic, difficulty, numberOfQuestions, questionTypes, chunks } = req.body

  if (!courseId || typeof courseId !== 'string') {
    return res.status(400).json({ error: 'courseId is required' })
  }
  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: 'topic is required' })
  }

  if (!serverConfig.isGroqConfigured) {
    return res.status(503).json({
      error: 'GROQ_API_KEY is not configured on the server.',
      configured: false,
    })
  }

  try {
    const quiz = await generateGroundedQuiz({
      courseId: courseId.trim(),
      topic: topic.trim(),
      difficulty: difficulty || 'medium',
      numberOfQuestions: typeof numberOfQuestions === 'number' ? numberOfQuestions : 4,
      questionTypes: Array.isArray(questionTypes) ? questionTypes : ['mcq', 'short_answer', 'numerical'],
      chunks: Array.isArray(chunks) ? chunks : undefined,
    })

    return res.json(quiz)
  } catch (error: any) {
    console.error('Quiz generation error:', error)
    return res.status(500).json({
      error: error?.message || 'Failed to generate quiz with Groq AI',
    })
  }
})

/**
 * MENTORA AI Question Answer Evaluation Endpoint:
 * Evaluates student answer and generates grounded wrong-answer remedies if needed
 */
groqRouter.post('/quiz/evaluate', async (req: Request, res: Response) => {
  const { question, studentAnswer } = req.body

  if (!question) {
    return res.status(400).json({ error: 'question object is required' })
  }
  if (studentAnswer === undefined || studentAnswer === null) {
    return res.status(400).json({ error: 'studentAnswer is required' })
  }

  try {
    const result = await evaluateQuestionAnswer({
      question,
      studentAnswer: String(studentAnswer),
    })

    return res.json(result)
  } catch (error: any) {
    console.error('Answer evaluation error:', error)
    return res.status(500).json({
      error: error?.message || 'Failed to evaluate answer',
    })
  }
})

/**
 * MENTORA AI Wrong Answer Remedy Action Endpoint:
 * Powers interactive buttons: Explain Simply, Give an Example, Ask Me a Follow-up
 */
groqRouter.post('/quiz/remedy', async (req: Request, res: Response) => {
  const { action, question, studentAnswer, correctConcept, sourceContext } = req.body

  if (!action || !['explain_simply', 'give_example', 'ask_followup'].includes(action)) {
    return res.status(400).json({ error: 'Valid action is required (explain_simply, give_example, ask_followup)' })
  }
  if (!question || !correctConcept) {
    return res.status(400).json({ error: 'question and correctConcept are required' })
  }

  try {
    const explanation = await explainRemedyAction({
      action,
      question,
      studentAnswer: String(studentAnswer || ''),
      correctConcept,
      sourceContext,
    })

    return res.json(explanation)
  } catch (error: any) {
    console.error('Remedy action error:', error)
    return res.status(500).json({
      error: error?.message || 'Failed to process remedy action',
    })
  }
})

