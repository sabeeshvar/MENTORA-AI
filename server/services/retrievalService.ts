export interface ChunkCandidate {
  chunkId: string
  courseId: string
  materialId: string
  text: string
  sourceType: string
  sourceName: string
  pageNumber?: number | null
  slideNumber?: number | null
  sectionTitle: string
  chunkIndex: number
}

export interface ScoredChunk {
  chunk: ChunkCandidate
  score: number
  matchedTokens: string[]
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'what', 'how', 'when', 'where',
  'who', 'why', 'can', 'could', 'should', 'would', 'does', 'do', 'did',
  'explain', 'describe', 'tell', 'me', 'about', 'give', 'overview',
])

/**
 * Tokenizes text into normalized words, excluding common stop words
 */
export const tokenize = (text: string): string[] => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
}

/**
 * Scores and retrieves top-K most relevant chunks for a question.
 * Ensures the entire document is NOT sent to Groq unnecessarily.
 */
export const retrieveRelevantChunks = (
  question: string,
  chunks: ChunkCandidate[],
  options?: { topK?: number; maxChars?: number }
): ScoredChunk[] => {
  if (!chunks || chunks.length === 0) return []

  const topK = options?.topK || 6
  const maxChars = options?.maxChars || 12000

  const questionTokens = tokenize(question)
  const normalizedQuestion = question.toLowerCase().trim()

  const scored: ScoredChunk[] = chunks.map((chunk) => {
    let score = 0
    const matchedTokens: string[] = []
    const chunkTextLower = chunk.text.toLowerCase()
    const titleLower = (chunk.sectionTitle || '').toLowerCase()
    const sourceNameLower = (chunk.sourceName || '').toLowerCase()

    // 1. Exact query substring match (strongest signal)
    if (normalizedQuestion.length > 5 && chunkTextLower.includes(normalizedQuestion)) {
      score += 10.0
    }

    // 2. Token matches in body text
    for (const token of questionTokens) {
      if (chunkTextLower.includes(token)) {
        score += 1.5
        matchedTokens.push(token)

        // Boost if token matches multiple times (term frequency)
        const regex = new RegExp(`\\b${token}\\b`, 'gi')
        const occurrences = (chunkTextLower.match(regex) || []).length
        if (occurrences > 1) {
          score += Math.min(occurrences * 0.3, 2.0)
        }
      }

      // 3. Section Title match (extra relevance boost)
      if (titleLower.includes(token)) {
        score += 2.0
      }

      // 4. Source Name match
      if (sourceNameLower.includes(token)) {
        score += 0.5
      }
    }

    return {
      chunk,
      score,
      matchedTokens: Array.from(new Set(matchedTokens)),
    }
  })

  // Filter out completely irrelevant chunks (score <= 0), or if all are 0, take first few
  let filtered = scored.filter((s) => s.score > 0)
  if (filtered.length === 0 && chunks.length > 0) {
    // Fallback: take initial sequential chunks if question is very generic (e.g. "what is this about?")
    filtered = scored.slice(0, 3)
  }

  // Sort descending by score
  filtered.sort((a, b) => b.score - a.score)

  // Cap at topK and cumulative char limit to keep Groq prompt concise and token-efficient
  const selected: ScoredChunk[] = []
  let cumulativeChars = 0

  for (const item of filtered.slice(0, topK)) {
    if (cumulativeChars + item.chunk.text.length > maxChars && selected.length > 0) {
      break
    }
    selected.push(item)
    cumulativeChars += item.chunk.text.length
  }

  return selected
}

/**
 * Builds clean, structured course context string for Groq
 */
export const formatGroundedContext = (scoredChunks: ScoredChunk[]): string => {
  if (scoredChunks.length === 0) {
    return 'NO COURSE MATERIAL CONTEXT AVAILABLE. (No matching chunks found in the course materials)'
  }

  return scoredChunks
    .map((item, idx) => {
      const c = item.chunk
      const locInfo: string[] = []
      if (c.pageNumber !== undefined && c.pageNumber !== null) {
        locInfo.push(`Page: ${c.pageNumber}`)
      }
      if (c.slideNumber !== undefined && c.slideNumber !== null) {
        locInfo.push(`Slide: ${c.slideNumber}`)
      }
      const locStr = locInfo.length > 0 ? locInfo.join(', ') : 'Location: N/A'

      return `--- CONTEXT ITEM [${idx + 1}] ---
Source Material: ${c.sourceName} (${c.sourceType})
${locStr}
Section Title: ${c.sectionTitle || 'General'}
Relevant Content:
${c.text}
`
    })
    .join('\n\n')
}
