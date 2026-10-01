import express from 'express'
import cors from 'cors'
import { serverConfig } from './config'
import { healthRouter } from './routes/health'
import { geminiRouter } from './routes/gemini'

const app = express()

// Middlewares
app.use(cors())
app.use(express.json())

// Mount Modular API Routes
app.use('/api/health', healthRouter)
app.use('/api/ai', geminiRouter)
app.use('/api/gemini', geminiRouter)

// Fallback 404 handler for API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API route not found' })
})

// Start server
app.listen(serverConfig.port, () => {
  console.log(`🚀 Mentora AI API Server listening on port ${serverConfig.port}`)
  console.log(`   Environment: ${serverConfig.nodeEnv}`)
  console.log(`   AI Engine: Google Gemini 2.5 Flash`)
  console.log(`   Gemini Configured: ${serverConfig.isGeminiConfigured ? 'Yes' : 'No (Pending Key)'}`)
  console.log(`   Supabase Configured: ${serverConfig.isSupabaseConfigured ? 'Yes' : 'No (Local/Mock Mode)'}`)
})

export default app
