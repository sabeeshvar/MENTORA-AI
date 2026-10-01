import express from 'express'
import cors from 'cors'
import { serverConfig } from './config'
import { healthRouter } from './routes/health'
import { groqRouter } from './routes/groq'

const app = express()

// Middlewares
app.use(cors())
app.use(express.json())

// Mount Modular API Routes
app.use('/api/health', healthRouter)
app.use('/api/groq', groqRouter)

// Fallback 404 handler for API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API route not found' })
})

// Start server
app.listen(serverConfig.port, () => {
  console.log(`🚀 Mentora AI API Server listening on port ${serverConfig.port}`)
  console.log(`   Environment: ${serverConfig.nodeEnv}`)
  console.log(`   Groq AI Configured: ${serverConfig.isGroqConfigured ? 'Yes' : 'No (Pending Key)'}`)
})

export default app
