import type { ProcessedChunk } from '@/types/chunk'

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
  retrievedChunks?: any[]
}

export interface AskTutorClientParams {
  courseId: string
  question: string
  courseTitle?: string
  chunks?: ProcessedChunk[]
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  topK?: number
}

const API_BASE = '/api/groq'

/**
 * Checks server-side Groq API key configuration
 */
export const checkGroqStatus = async (): Promise<{ configured: boolean; model: string }> => {
  try {
    const res = await fetch(`${API_BASE}/status`)
    if (!res.ok) {
      return { configured: false, model: 'llama-3.3-70b-versatile' }
    }
    return await res.json()
  } catch (err) {
    console.warn('Could not contact Groq status endpoint:', err)
    return { configured: false, model: 'llama-3.3-70b-versatile' }
  }
}

/**
 * Sends student question + course chunks to backend RAG pipeline
 */
export const askGroqTutor = async (params: AskTutorClientParams): Promise<TutorResponse> => {
  const res = await fetch(`${API_BASE}/tutor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  const data = await res.json()

  if (!res.ok) {
    const errorMsg = data?.error || `Server returned ${res.status}: ${res.statusText}`
    const errorObj = new Error(errorMsg) as any
    errorObj.status = res.status
    errorObj.configured = data?.configured
    throw errorObj
  }

  return data as TutorResponse
}

/**
 * Queries RAG retrieval service directly
 */
export const retrieveChunksDirect = async (
  courseId: string,
  query: string,
  chunks?: ProcessedChunk[],
  topK: number = 5
) => {
  const res = await fetch(`${API_BASE}/retrieve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId, query, chunks, topK }),
  })
  if (!res.ok) {
    throw new Error('Retrieval request failed')
  }
  return await res.json()
}
