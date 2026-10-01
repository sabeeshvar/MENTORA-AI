/**
 * MENTORA AI Semantic Vector Embedding Service
 *
 * Provides dense mathematical vector embeddings (256-dimensional)
 * with subword n-gram hashing, semantic projection, and L2 unit normalization.
 * Fully compatible with cosine similarity vector search.
 */

export interface IEmbeddingService {
  readonly modelName: string
  readonly dimensions: number
  generateEmbedding(text: string): Promise<number[]>
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>
}

const DEFAULT_DIMENSIONS = 256

/**
 * Murmur/FNV-style 32-bit hash function for deterministic projection
 */
const hashStringToSeed = (str: string, seed: number = 0): number => {
  let h = 0x811c9dc5 ^ seed
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0)
}

/**
 * Deterministic pseudo-random normal distribution using Box-Muller transform
 */
const pseudoRandomWeight = (seed: number, index: number): number => {
  const h1 = hashStringToSeed(`${index}_a`, seed) / 4294967296
  const h2 = hashStringToSeed(`${index}_b`, seed) / 4294967296
  const u1 = Math.max(h1, 1e-10)
  const u2 = h2
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
}

/**
 * Stopwords to de-emphasize during semantic vector projection
 */
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'could', 'did', 'do', 'does', 'doing', 'down',
  'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having',
  'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i',
  'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
  'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only',
  'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she',
  'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to',
  'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your',
])

export class DenseSemanticEmbeddingService implements IEmbeddingService {
  public readonly modelName = 'mentora-dense-embed-v1'
  public readonly dimensions = DEFAULT_DIMENSIONS

  /**
   * Generates a 256-dimensional normalized semantic vector embedding for text
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      return new Array(this.dimensions).fill(0)
    }

    const vector = new Float64Array(this.dimensions)
    const normalized = text.toLowerCase().trim()

    // 1. Extract words and character 3-grams
    const tokens = normalized
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 0)

    if (tokens.length === 0) {
      return new Array(this.dimensions).fill(0)
    }

    // 2. Accumulate subword and token projections
    for (let pos = 0; pos < tokens.length; pos++) {
      const token = tokens[pos]
      const isStopword = STOP_WORDS.has(token)
      const tokenWeight = isStopword ? 0.15 : 1.0 + Math.min(token.length * 0.1, 1.0)
      const tokenSeed = hashStringToSeed(token, 42)

      // Project whole token
      for (let d = 0; d < this.dimensions; d++) {
        const weight = pseudoRandomWeight(tokenSeed, d)
        vector[d] += weight * tokenWeight
      }

      // Project character n-grams (3-grams) for robust morphological matching
      if (!isStopword && token.length >= 3) {
        const bounded = `<${token}>`
        for (let i = 0; i <= bounded.length - 3; i++) {
          const ngram = bounded.substring(i, i + 3)
          const ngramSeed = hashStringToSeed(ngram, 101)
          for (let d = 0; d < this.dimensions; d++) {
            const weight = pseudoRandomWeight(ngramSeed, d)
            vector[d] += weight * 0.4
          }
        }
      }
    }

    // 3. L2 Unit Normalization: ||v|| = 1.0
    let sumSquares = 0
    for (let d = 0; d < this.dimensions; d++) {
      sumSquares += vector[d] * vector[d]
    }

    const magnitude = Math.sqrt(sumSquares)
    const output: number[] = new Array(this.dimensions)

    if (magnitude === 0) {
      return output.fill(0)
    }

    for (let d = 0; d < this.dimensions; d++) {
      // Rounded to 6 decimal places for optimal storage
      output[d] = Math.round((vector[d] / magnitude) * 1000000) / 1000000
    }

    return output
  }

  /**
   * Generates embeddings in batch
   */
  public async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.generateEmbedding(t)))
  }
}

/**
 * Computes exact cosine similarity between two unit-normalized vectors:
 * dotProduct(A, B) / (||A|| * ||B||)
 */
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0
  const len = Math.min(vecA.length, vecB.length)

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  if (normA === 0 || normB === 0) return 0
  const sim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))

  // Clamp to [-1, 1]
  return Math.max(-1, Math.min(1, sim))
}

// Singleton default embedding service
export const defaultEmbeddingService = new DenseSemanticEmbeddingService()
