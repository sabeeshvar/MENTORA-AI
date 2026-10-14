import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'

function diagnoseKey() {
  const geminiKey = process.env.GEMINI_API_KEY
  const googleGenaiKey = process.env.GOOGLE_GENAI_API_KEY
  const googleKey = process.env.GOOGLE_API_KEY
  const viteGeminiKey = process.env.VITE_GEMINI_API_KEY

  console.log('--- Environment Variable Inspection ---')
  console.log('GEMINI_API_KEY defined:', Boolean(geminiKey))
  console.log('GOOGLE_GENAI_API_KEY defined:', Boolean(googleGenaiKey))
  console.log('GOOGLE_API_KEY defined:', Boolean(googleKey))
  console.log('VITE_GEMINI_API_KEY defined:', Boolean(viteGeminiKey))

  const activeKey = (geminiKey || googleGenaiKey || googleKey || viteGeminiKey || '').trim()

  if (!activeKey) {
    console.error('ERROR: No Gemini API Key found in environment variables.')
    process.exit(1)
  }

  console.log('Active key length:', activeKey.length)
  console.log('Active key prefix:', activeKey.substring(0, 6) + '...')
  console.log('Has whitespace:', /\s/.test(activeKey))
  console.log('Has surrounding quotes:', /^["'].*["']$/.test(activeKey))

  return activeKey.replace(/^["']|["']$/g, '').trim()
}

async function testModels(apiKey: string) {
  console.log('\n--- Live Model Connectivity Test ---')
  const client = new GoogleGenAI({ apiKey })

  const candidateModels = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-flash-lite-latest',
    'gemini-3.8-flash',
    'gemini-2.5-flash',
  ]

  for (const model of candidateModels) {
    try {
      console.log(`Testing model: ${model}...`)
      const res = await client.models.generateContent({
        model,
        contents: 'Say hello in 3 words.',
        config: {
          temperature: 0.1,
        },
      })
      console.log(`✓ Model ${model} SUCCESS! Response: "${res.text?.trim()}"`)
      return model
    } catch (err: any) {
      const status = err?.status || err?.code || 'UNKNOWN'
      const msg = (err?.message || '').replace(/key=[^&\s]+/gi, 'key=[REDACTED]')
      console.warn(`✗ Model ${model} FAILED (${status}): ${msg.substring(0, 100)}`)
    }
  }

  throw new Error('All candidate models failed.')
}

async function run() {
  try {
    const key = diagnoseKey()
    const workingModel = await testModels(key)
    console.log(`\nVerified working model: ${workingModel}`)
  } catch (err: any) {
    console.error('Diagnosis failed:', err.message)
    process.exit(1)
  }
}

run()
