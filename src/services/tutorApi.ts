import type { ProcessedChunk } from '@/types/chunk'
import type { SourceCitation, TutorResponse } from '@/types/tutor'
import { getApiEndpoint } from './apiConfig'

export type { SourceCitation, TutorResponse }

export interface AskTutorClientParams {
  courseId: string
  question: string
  courseTitle?: string
  chunks?: ProcessedChunk[]
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  preferredLanguage?: string
  topK?: number
}

const getEndpoint = (path: string) => getApiEndpoint(`/api/ai${path}`)

/**
 * Checks server-side Gemini AI engine configuration
 */
export const checkAIStatus = async (): Promise<{ configured: boolean; model: string; provider?: string }> => {
  try {
    const res = await fetch(getEndpoint('/status'))
    if (!res.ok) {
      return { configured: false, model: 'gemini-3.5-flash-lite', provider: 'Google Gemini' }
    }
    return await res.json()
  } catch (err) {
    console.warn('Could not contact AI status endpoint:', err)
    return { configured: false, model: 'gemini-3.5-flash-lite', provider: 'Google Gemini' }
  }
}

/**
 * Sends student question + course chunks to backend Gemini RAG pipeline
 */
export const askAITutor = async (params: AskTutorClientParams): Promise<TutorResponse> => {
  const res = await fetch(getEndpoint('/tutor'), {
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
  const res = await fetch(getEndpoint('/retrieve'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId, query, chunks, topK }),
  })
  if (!res.ok) {
    throw new Error('Retrieval request failed')
  }
  return await res.json()
}
