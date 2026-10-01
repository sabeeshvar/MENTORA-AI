import { Router, Request, Response } from 'express'
import Groq from 'groq-sdk'
import { serverConfig } from '../config'

export const groqRouter = Router()

// Safe lazy initialization of Groq client
const getGroqClient = () => {
  if (!serverConfig.groqApiKey) {
    return null
  }
  return new Groq({ apiKey: serverConfig.groqApiKey })
}

// Status check for Groq AI service
groqRouter.get('/status', (_req: Request, res: Response) => {
  res.json({
    configured: serverConfig.isGroqConfigured,
    model: 'llama-3.3-70b-versatile',
  })
})

// Grounded Query Endpoint skeleton (ready for full pipeline in subsequent tasks)
groqRouter.post('/grounded-query', async (req: Request, res: Response) => {
  if (!serverConfig.isGroqConfigured) {
    return res.status(503).json({
      error: 'GROQ_API_KEY is not configured in the environment (.env). Please set your Groq key.',
    })
  }

  const { prompt } = req.body
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt parameter' })
  }

  try {
    const groq = getGroqClient()
    if (!groq) {
      return res.status(500).json({ error: 'Groq client failed to initialize' })
    }

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
    })

    return res.json({
      response: completion.choices[0]?.message?.content || '',
      model: 'llama-3.3-70b-versatile',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error during inference'
    return res.status(500).json({ error: message })
  }
})
