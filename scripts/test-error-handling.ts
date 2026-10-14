import { GeminiProvider, sanitizeError } from '../server/services/ai/gemini.service'
import { getGeminiApiKey } from '../server/config'

console.log('--- Testing Error Handling & Security Guarantees ---')

// 1. Verify Error Sanitizer strips API keys
const leakedError = 'GoogleGenAIError: Request failed with status 400. URL: https://generativelanguage.googleapis.com/v1beta/models?key=AQ.Ab8XYZ123SecretKey'
const sanitized = sanitizeError(leakedError)
console.log('1. Sanitize Error Output:', sanitized)
if (sanitized.includes('AQ.Ab8') || sanitized.includes('SecretKey')) {
  throw new Error('FAILED: sanitizeError leaked the key!')
}
console.log('   ✓ sanitizeError successfully redacted key to [REDACTED]')

// 2. Verify Provider behavior without key
const originalEnv = process.env.GEMINI_API_KEY
try {
  delete process.env.GEMINI_API_KEY
  delete process.env.GOOGLE_GENAI_API_KEY
  delete process.env.GOOGLE_API_KEY

  const unconfiguredProvider = new GeminiProvider()
  console.log('2. Unconfigured Provider status:', unconfiguredProvider.isConfigured())
  if (unconfiguredProvider.isConfigured()) {
    throw new Error('FAILED: Provider reports configured when key is deleted!')
  }
  console.log('   ✓ Provider safely reports configured=false when key is missing')
} finally {
  process.env.GEMINI_API_KEY = originalEnv
}

console.log('--- All Error Handling Tests Passed ---')
