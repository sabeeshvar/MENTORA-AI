import { Router, Request, Response } from 'express'
import { serverConfig } from '../config'

export const healthRouter = Router()

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'mentora-ai-api',
    timestamp: new Date().toISOString(),
    environment: serverConfig.nodeEnv,
    groqConfigured: serverConfig.isGroqConfigured,
  })
})
