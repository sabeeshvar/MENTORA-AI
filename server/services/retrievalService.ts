import {
  defaultEmbeddingService,
  cosineSimilarity,
  type IEmbeddingService,
} from './embeddingService'

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
  embedding?: number[]
  embeddingModel?: string
  similarityScore?: number
  content?: string
  materialName?: string
  materialType?: string
  videoTimestamp?: string | null
  topicId?: string
  conceptId?: string
}

export interface RetrievedChunk {
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
  similarityScore: number
  embeddingModel?: string
  content?: string
  materialName?: string
  materialType?: string
  videoTimestamp?: string | null
  topicId?: string
  conceptId?: string
}

/**
 * Modular Vector Store Backend Interface.
 * Allows seamless replacement with external vector databases (e.g., Supabase pgvector, Pinecone, ChromaDB, Weaviate).
 */
export interface IVectorStoreBackend {
  indexChunks(courseId: string, chunks: ChunkCandidate[]): Promise<void>
  searchSimilar(
    courseId: string,
    queryEmbedding: number[],
    topK: number,
    minSimilarity?: number
  ): Promise<RetrievedChunk[]>
  getAllCourseChunks(courseId: string): Promise<ChunkCandidate[]>
  clearCourse(courseId: string): Promise<void>
}

/**
 * High-performance course-partitioned vector store
 */
export class CoursePartitionedVectorStore implements IVectorStoreBackend {
  private courseIndex = new Map<string, Map<string, ChunkCandidate>>()
  private embeddingService: IEmbeddingService

  constructor(embeddingService: IEmbeddingService = defaultEmbeddingService) {
    this.embeddingService = embeddingService
  }

  /**
   * Indexes chunks partitioned strictly by courseId
   */
  public async indexChunks(courseId: string, chunks: ChunkCandidate[]): Promise<void> {
    if (!courseId || !chunks || chunks.length === 0) return

    let courseMap = this.courseIndex.get(courseId)
    if (!courseMap) {
      courseMap = new Map<string, ChunkCandidate>()
      this.courseIndex.set(courseId, courseMap)
    }

    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = chunks[idx]
      const rawEmb: any = chunk.embedding
      if (typeof rawEmb === 'string') {
        try {
          chunk.embedding = JSON.parse(rawEmb)
        } catch {
          chunk.embedding = rawEmb
            .replace(/^\[|\]$/g, '')
            .split(',')
            .map((x: string) => Number(x.trim()))
        }
      }

      // If chunk is missing an embedding, compute it deterministically
      if (!chunk.embedding || !Array.isArray(chunk.embedding) || chunk.embedding.length === 0) {
        chunk.embedding = await this.embeddingService.generateEmbedding(
          `${chunk.sectionTitle || 'Section'}: ${chunk.text || chunk.content || ''}`
        )
        chunk.embeddingModel = this.embeddingService.modelName
      }

      const id = chunk.chunkId || (chunk as any).id || `chunk_${idx}`
      courseMap.set(id, chunk)
    }
  }

  /**
   * Searches for most similar chunks within a single course partition
   */
  public async searchSimilar(
    courseId: string,
    queryEmbedding: number[],
    topK: number = 5,
    minSimilarity: number = 0.15
  ): Promise<RetrievedChunk[]> {
    const courseMap = this.courseIndex.get(courseId)
    if (!courseMap || courseMap.size === 0) {
      return []
    }

    const scored: RetrievedChunk[] = []

    for (const chunk of courseMap.values()) {
      if (!chunk.embedding || chunk.embedding.length === 0) continue

      // Compute exact cosine similarity between query and chunk embedding
      const sim = cosineSimilarity(queryEmbedding, chunk.embedding)

      // Strict relevance filtering to prevent unrelated content from entering context
      if (sim >= minSimilarity) {
        scored.push({
          chunkId: chunk.chunkId,
          courseId: chunk.courseId,
          materialId: chunk.materialId,
          text: chunk.text,
          sourceType: chunk.sourceType,
          sourceName: chunk.sourceName,
          pageNumber: chunk.pageNumber ?? null,
          slideNumber: chunk.slideNumber ?? null,
          sectionTitle: chunk.sectionTitle,
          chunkIndex: chunk.chunkIndex,
          similarityScore: Math.round(sim * 10000) / 10000,
          embeddingModel: chunk.embeddingModel,
        })
      }
    }

    // Sort descending by cosine similarity score
    scored.sort((a, b) => b.similarityScore - a.similarityScore)

    // Return top-k relevant chunks
    return scored.slice(0, topK)
  }

  public async getAllCourseChunks(courseId: string): Promise<ChunkCandidate[]> {
    const map = this.courseIndex.get(courseId)
    return map ? Array.from(map.values()) : []
  }

  public async clearCourse(courseId: string): Promise<void> {
    this.courseIndex.delete(courseId)
  }
}

// Global default vector store instance
export const defaultVectorStore = new CoursePartitionedVectorStore()

/**
 * Main RAG Retrieval Service:
 *
 * Question
 * -> embedding
 * -> retrieval
 * -> relevance filtering
 * -> logging (query, retrieved chunks, count, response time)
 * -> returns topK relevant chunks with source metadata
 */
export const retrieveRelevantChunks = async (
  courseId: string,
  query: string,
  topK: number = 5,
  options?: {
    vectorStore?: IVectorStoreBackend
    embeddingService?: IEmbeddingService
    minSimilarity?: number
  }
): Promise<RetrievedChunk[]> => {
  const startTime = Date.now()
  const store = options?.vectorStore || defaultVectorStore
  const embedService = options?.embeddingService || defaultEmbeddingService
  const minSimilarity = options?.minSimilarity ?? 0.15

  if (!courseId) {
    console.warn('[RAG Retrieval] Empty courseId supplied to retrieveRelevantChunks')
    return []
  }

  if (!query || query.trim().length === 0) {
    return []
  }

  // 1. Generate query embedding
  const queryEmbedding = await embedService.generateEmbedding(query.trim())

  // 2. Perform vector cosine similarity search filtered strictly by courseId
  const retrievedChunks = await store.searchSimilar(
    courseId,
    queryEmbedding,
    topK,
    minSimilarity
  )

  const responseTimeMs = Date.now() - startTime

  // 3. Structured Logging as required
  console.log('------------------------------------------------------------')
  console.log(`[RAG Retrieval] Query: "${query.trim()}"`)
  console.log(`[RAG Retrieval] Course ID: ${courseId}`)
  console.log(`[RAG Retrieval] Retrieval Count: ${retrievedChunks.length} chunks (Top-${topK})`)
  console.log(`[RAG Retrieval] Response Time: ${responseTimeMs} ms`)
  if (retrievedChunks.length > 0) {
    console.log('[RAG Retrieved Chunks]:')
    retrievedChunks.forEach((c, idx) => {
      const loc = c.pageNumber !== null ? `Page ${c.pageNumber}` : c.slideNumber !== null ? `Slide ${c.slideNumber}` : 'N/A'
      console.log(`  ${idx + 1}. [Score: ${c.similarityScore.toFixed(4)}] ${c.sourceName} | ${loc} | "${c.sectionTitle}" (${c.chunkId})`)
    })
  } else {
    console.log('[RAG Retrieved Chunks]: None matched minimum similarity threshold.')
  }
  console.log('------------------------------------------------------------')

  return retrievedChunks
}

/**
 * Formats retrieved chunks into clean, cited course context blocks for Gemini LLM
 */
export const formatGroundedContext = (retrievedChunks: RetrievedChunk[]): string => {
  if (retrievedChunks.length === 0) {
    return 'NO RELEVANT COURSE MATERIAL FOUND FOR THIS QUERY.'
  }

  return retrievedChunks
    .map((chunk, idx) => {
      const locParts: string[] = []
      if (chunk.pageNumber !== null && chunk.pageNumber !== undefined) {
        locParts.push(`Page: ${chunk.pageNumber}`)
      }
      if (chunk.slideNumber !== null && chunk.slideNumber !== undefined) {
        locParts.push(`Slide: ${chunk.slideNumber}`)
      }
      const locStr = locParts.length > 0 ? locParts.join(', ') : 'Location: General Section'

      return `--- CONTEXT ITEM [${idx + 1}] ---
Source Material: ${chunk.sourceName} (${chunk.sourceType})
${locStr}
Section Title: ${chunk.sectionTitle || 'Overview'}
Relevance Similarity Score: ${chunk.similarityScore}
Content:
${chunk.text}`
    })
    .join('\n\n')
}
