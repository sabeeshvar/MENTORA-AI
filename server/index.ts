import express from 'express'
import cors from 'cors'
import { serverConfig } from './config'
import { healthRouter } from './routes/health'
import { geminiRouter } from './routes/gemini'

const app = express()

// Middlewares
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Mount Modular API Routes
app.use('/api/health', healthRouter)
app.use('/api/ai', geminiRouter)
app.use('/api/gemini', geminiRouter)

// Fallback 404 handler for API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API route not found' })
})

// Start server when run directly (guard against calling listen in Vercel serverless runtime or when imported)
const isMainScript = Boolean(
  process.argv[1] && (
    process.argv[1].endsWith('server/index.ts') ||
    process.argv[1].endsWith('server\\index.ts') ||
    process.argv[1].endsWith('server/index.js') ||
    process.argv[1].endsWith('server\\index.js')
  )
)

if (!process.env.VERCEL && !process.env.NOW_REGION && isMainScript) {
  app.listen(serverConfig.port, () => {
    console.log(`🚀 Mentora AI API Server listening on port ${serverConfig.port}`)
    console.log(`   Environment: ${serverConfig.nodeEnv}`)
    console.log(`   AI Engine: Google Gemini 3.5 Flash Lite`)
    console.log(`   Gemini Configured: ${serverConfig.isGeminiConfigured ? 'Yes' : 'No (Pending Key)'}`)
    console.log(`   Supabase Configured: ${serverConfig.isSupabaseConfigured ? 'Yes' : 'No (Local/Mock Mode)'}`)
    console.log(`   Supabase Service Role: ${serverConfig.isServiceRoleConfigured ? 'Configured (Admin Enabled)' : 'Unset (Admin Tasks Restricted)'}`)
  })
}

export default app
