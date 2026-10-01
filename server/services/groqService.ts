import Groq from 'groq-sdk'
import { serverConfig } from '../config'
import {
  retrieveRelevantChunks,
  formatGroundedContext,
  type ChunkCandidate,
} from './retrievalService'

export interface SourceCitation {
  materialName: string
  pageNumber?: number | null
  slideNumber?: number | null
  relevantText: string
}

export interface TutorResponse {
  answer: string
  sources: SourceCitation[]
  confidence: number
  grounded: boolean
  retrievedChunksCount?: number
}

export interface AskTutorParams {
  question: string
  chunks: ChunkCandidate[]
  courseTitle?: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}

/**
 * Lazy initialization of Groq SDK
 */
let groqClientInstance: Groq | null = null

export const getGroqClient = (): Groq => {
  if (!serverConfig.groqApiKey) {
    throw new Error(
      'GROQ_API_KEY is not configured on the server. Please set GROQ_API_KEY in your server environment or .env file.'
    )
  }
  if (!groqClientInstance) {
    groqClientInstance = new Groq({ apiKey: serverConfig.groqApiKey })
  }
  return groqClientInstance
}

const SYSTEM_PROMPT = `You are MENTORA AI, an expert, source-grounded academic tutor.

CRITICAL INSTRUCTIONS YOU MUST STRICTLY FOLLOW:
1. Answer the student's question ONLY using the supplied Course Material Context items below.
2. Do NOT invent, assume, extrapolate, or hallucinate information outside the supplied context.
3. If the answer is NOT supported or NOT contained in the supplied material, you MUST:
   - Explicitly state in the "answer" field that the supplied learning materials do not contain enough information to answer this question.
   - Set "grounded" to false.
   - Set "confidence" to 0.0 (or below 0.2).
   - Set "sources" to an empty array [].
4. When the question IS answered from the context:
   - Set "grounded" to true.
   - Cite the exact source material in the "sources" array for every factual point.
   - For PDF sources, provide the exact "pageNumber" from the context item.
   - For PPT/PPTX sources, provide the exact "slideNumber" from the context item.
   - NEVER fabricate, guess, or invent page or slide numbers. If not specified, leave as null.
   - In "relevantText", quote the exact excerpt or sentence from the source that verifies your answer.
   - Provide a confidence score between 0.0 and 1.0 indicating how strongly the context supports the answer.
5. Return your output ONLY as a valid JSON object matching the JSON schema below. Do not wrap in markdown backticks or add any conversational filler.

OUTPUT JSON SCHEMA:
{
  "answer": "string (your clear, helpful, grounded explanation)",
  "sources": [
    {
      "materialName": "string (name of the file, e.g. Lecture_01.pptx)",
      "pageNumber": number | null,
      "slideNumber": number | null,
      "relevantText": "string (exact excerpt from context)"
    }
  ],
  "confidence": number,
  "grounded": boolean
}`

/**
 * Calls Groq API with retrieved course context and student question
 */
export const queryGroqTutor = async (params: AskTutorParams): Promise<TutorResponse> => {
  const { question, chunks, courseTitle, conversationHistory } = params

  if (!question || question.trim().length === 0) {
    throw new Error('Question cannot be empty.')
  }

  // 1. Retrieve only relevant chunks to avoid sending entire documents unnecessarily
  const scoredChunks = retrieveRelevantChunks(question, chunks, {
    topK: 6,
    maxChars: 12000,
  })

  // If no chunks exist at all in the course
  if (chunks.length === 0) {
    return {
      answer:
        'No learning materials have been uploaded or processed for this course yet. Please upload course PDFs or lecture slides so I can provide grounded answers with exact page and slide citations.',
      sources: [],
      confidence: 0,
      grounded: false,
      retrievedChunksCount: 0,
    }
  }

  // 2. Format grounded context
  const contextString = formatGroundedContext(scoredChunks)

  // 3. Build messages array for Groq
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
  ]

  // Add recent conversation history if provided (up to last 4 turns)
  if (conversationHistory && conversationHistory.length > 0) {
    const recent = conversationHistory.slice(-4)
    for (const h of recent) {
      messages.push({
        role: h.role,
        content: h.content,
      })
    }
  }

  // Final user message containing course context + current question
  const userPrompt = `COURSE: ${courseTitle || 'Current Course'}

SUPPLIED COURSE MATERIAL CONTEXT:
${contextString}

STUDENT QUESTION:
${question}

Remember: Answer ONLY using the supplied context above. If the context does not contain the answer, explicitly state that the material does not contain enough information and set grounded=false.`

  messages.push({
    role: 'user',
    content: userPrompt,
  })

  // 4. Invoke Groq API
  const groq = getGroqClient()
  const modelName = 'llama-3.3-70b-versatile'

  const completion = await groq.chat.completions.create({
    model: modelName,
    messages,
    temperature: 0.1, // Low temperature for high factual precision and grounding
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  })

  const rawContent = completion.choices[0]?.message?.content
  if (!rawContent) {
    throw new Error('Groq model returned an empty response.')
  }

  // 5. Parse and validate JSON structure
  try {
    const parsed = JSON.parse(rawContent) as Partial<TutorResponse>

    // Enforce schema compliance
    const answer = typeof parsed.answer === 'string' && parsed.answer.trim().length > 0
      ? parsed.answer.trim()
      : 'The course materials do not contain sufficient information to answer this question.'

    const sources: SourceCitation[] = Array.isArray(parsed.sources)
      ? parsed.sources.map((s) => ({
          materialName: String(s.materialName || 'Course Material'),
          pageNumber: typeof s.pageNumber === 'number' ? s.pageNumber : null,
          slideNumber: typeof s.slideNumber === 'number' ? s.slideNumber : null,
          relevantText: String(s.relevantText || '').trim(),
        }))
      : []

    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : (parsed.grounded ? 0.9 : 0.1)

    const grounded = Boolean(parsed.grounded && sources.length > 0)

    return {
      answer,
      sources,
      confidence,
      grounded,
      retrievedChunksCount: scoredChunks.length,
    }
  } catch (parseErr) {
    console.warn('Failed to parse Groq JSON response, extracting text fallback:', rawContent)
    return {
      answer: rawContent.replace(/```json|```/g, '').trim(),
      sources: [],
      confidence: 0.5,
      grounded: false,
      retrievedChunksCount: scoredChunks.length,
    }
  }
}
