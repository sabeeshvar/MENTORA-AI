import { Router, Request, Response } from 'express'
import { serverConfig } from '../config'
import { queryGroqTutor } from '../services/groqService'

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
 * MENTORA AI Source-Grounded Tutor Endpoint:
 *
 * Student question
 * -> retrieve relevant course chunks
 * -> construct grounded context
 * -> send context + question to Groq
 * -> receive answer
 * -> return answer + source citations
 */
groqRouter.post('/tutor', async (req: Request, res: Response) => {
  const { question, chunks, courseTitle, conversationHistory } = req.body

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({
      error: 'Question is required and must be a non-empty string.',
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
      question: question.trim(),
      chunks: chunkList,
      courseTitle: typeof courseTitle === 'string' ? courseTitle : undefined,
      conversationHistory: Array.isArray(conversationHistory) ? conversationHistory : undefined,
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
