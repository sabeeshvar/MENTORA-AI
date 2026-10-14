import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'

const apiKey = process.env.GEMINI_API_KEY || ''
if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY is not set in .env')
  process.exit(1)
}

const client = new GoogleGenAI({ apiKey })

const candidateModels = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest',
]

async function run() {
  console.log('Testing live API connection with candidate models...')
  let success = false

  for (const model of candidateModels) {
    try {
      console.log(`Trying model: ${model}...`)
      const res = await client.models.generateContent({
        model,
        contents: 'Generate 1 sample multiple choice question on Linear Algebra.',
        config: {
          systemInstruction:
            'You are an expert tutor. Return JSON with format: {"question": string, "options": string[], "correctAnswer": string, "explanation": string}',
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      })

      console.log(`API Call Status: SUCCESS with ${model}`)
      const parsed = JSON.parse(res.text || '{}')
      console.log('Sample Generated Question:', parsed.question)
      console.log('Options Count:', parsed.options?.length)
      console.log('Explanation:', parsed.explanation?.substring(0, 80) + '...')
      success = true
      break
    } catch (err: any) {
      console.warn(`Model ${model} failed:`, err?.status, err?.message?.substring(0, 80))
      continue
    }
  }

  if (!success) {
    console.error('All candidate models failed.')
    process.exit(1)
  }
}

run()
