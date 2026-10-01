import {
  DenseSemanticEmbeddingService,
  cosineSimilarity,
} from '../server/services/embeddingService'
import {
  CoursePartitionedVectorStore,
  retrieveRelevantChunks,
  formatGroundedContext,
  type ChunkCandidate,
} from '../server/services/retrievalService'

async function runRAGPipelineVerification() {
  console.log('=================================================================')
  console.log('MENTORA AI — RETRIEVAL-AUGMENTED GENERATION (RAG) PIPELINE TEST')
  console.log('=================================================================\n')

  let passed = 0
  let failed = 0

  const embeddingService = new DenseSemanticEmbeddingService()
  const vectorStore = new CoursePartitionedVectorStore(embeddingService)

  // -------------------------------------------------------------
  // Test 1: Embedding Service Dimensions & Determinism
  // -------------------------------------------------------------
  console.log('Test 1: Dense Semantic Vector Embedding Service')
  try {
    const text1 = 'Supervised machine learning algorithms learn mapping functions from input data.'
    const text2 = 'Supervised learning models predict output targets using labeled training samples.'
    const text3 = 'Italian pasta recipe with garlic, olive oil, and parmesan cheese.'

    const embed1 = await embeddingService.generateEmbedding(text1)
    const embed2 = await embeddingService.generateEmbedding(text2)
    const embed3 = await embeddingService.generateEmbedding(text3)

    console.log(`   Model: ${embeddingService.modelName}`)
    console.log(`   Dimensions: ${embed1.length} (Expected: 256)`)

    if (embed1.length !== 256) {
      throw new Error(`Embedding dimensions mismatch: got ${embed1.length}, expected 256`)
    }

    // Compute real cosine similarities
    const simSimilar = cosineSimilarity(embed1, embed2)
    const simDifferent = cosineSimilarity(embed1, embed3)

    console.log(`   Cosine Sim (ML vs ML paraphrase): ${simSimilar.toFixed(4)}`)
    console.log(`   Cosine Sim (ML vs Pasta recipe):  ${simDifferent.toFixed(4)}`)

    if (simSimilar <= simDifferent) {
      throw new Error('Semantic similarity failed: Similar texts should have higher cosine score than dissimilar texts!')
    }

    console.log('   ✓ Real mathematical dense vector embedding & cosine similarity PASSED\n')
    passed++
  } catch (err: any) {
    console.error('   ✗ Test 1 Failed:', err?.message || err)
    failed++
  }

  // -------------------------------------------------------------
  // Test 2: Chunk Storage with Embeddings in Course-Partitioned Store
  // -------------------------------------------------------------
  console.log('Test 2: Course Chunk Indexing & Vector Storage')
  const courseAI = 'course_cs401_ai'
  const courseBio = 'course_bio200_genetics'

  const aiChunks: ChunkCandidate[] = [
    {
      chunkId: 'chk_ai_1',
      courseId: courseAI,
      materialId: 'mat_dl_pdf',
      sourceType: 'PDF',
      sourceName: 'Deep_Learning_Textbook.pdf',
      pageNumber: 14,
      slideNumber: null,
      sectionTitle: 'Gradient Descent Optimization',
      chunkIndex: 0,
      text: 'Gradient descent minimizes the objective loss function by iteratively updating model parameters in opposite direction of the gradient.',
    },
    {
      chunkId: 'chk_ai_2',
      courseId: courseAI,
      materialId: 'mat_dl_pdf',
      sourceType: 'PDF',
      sourceName: 'Deep_Learning_Textbook.pdf',
      pageNumber: 28,
      slideNumber: null,
      sectionTitle: 'Backpropagation Algorithm',
      chunkIndex: 1,
      text: 'Backpropagation applies the calculus chain rule recursively backward through layers to compute partial derivatives for gradient updates.',
    },
    {
      chunkId: 'chk_ai_3',
      courseId: courseAI,
      materialId: 'mat_cnn_pptx',
      sourceType: 'PPTX',
      sourceName: 'Lecture_04_CNNs.pptx',
      pageNumber: null,
      slideNumber: 7,
      sectionTitle: 'Convolutional Kernels and Feature Maps',
      chunkIndex: 2,
      text: 'Convolution kernels slide over input receptive fields applying element-wise matrix multiplications to extract spatial features.',
    },
  ]

  const bioChunks: ChunkCandidate[] = [
    {
      chunkId: 'chk_bio_1',
      courseId: courseBio,
      materialId: 'mat_genetics_pdf',
      sourceType: 'PDF',
      sourceName: 'Molecular_Genetics.pdf',
      pageNumber: 52,
      slideNumber: null,
      sectionTitle: 'DNA Replication Forks',
      chunkIndex: 0,
      text: 'DNA helicase unwinds the double helix at replication forks, allowing DNA polymerase to synthesize leading and lagging strands.',
    },
  ]

  try {
    await vectorStore.indexChunks(courseAI, aiChunks)
    await vectorStore.indexChunks(courseBio, bioChunks)

    const indexedAI = await vectorStore.getAllCourseChunks(courseAI)
    const indexedBio = await vectorStore.getAllCourseChunks(courseBio)

    console.log(`   Indexed ${indexedAI.length} chunks for ${courseAI}`)
    console.log(`   Indexed ${indexedBio.length} chunks for ${courseBio}`)

    if (indexedAI.length !== 3 || indexedBio.length !== 1) {
      throw new Error('Indexing chunk count mismatch')
    }

    if (!indexedAI[0].embedding || indexedAI[0].embedding.length !== 256) {
      throw new Error('Indexed chunk is missing 256-dimensional embedding vector!')
    }

    console.log('   ✓ Course chunk indexing with vector embeddings PASSED\n')
    passed++
  } catch (err: any) {
    console.error('   ✗ Test 2 Failed:', err?.message || err)
    failed++
  }

  // -------------------------------------------------------------
  // Test 3: Course Isolation & Unrelated Content Prevention
  // -------------------------------------------------------------
  console.log('Test 3: Course Isolation & Unrelated Content Prevention')
  try {
    const query = 'How does backpropagation compute derivatives using chain rule?'

    // Query Course AI
    const aiResults = await retrieveRelevantChunks(courseAI, query, 5, {
      vectorStore,
      embeddingService,
    })

    console.log(`   AI Course Results Count: ${aiResults.length}`)
    if (aiResults.length === 0) {
      throw new Error('Expected at least 1 relevant chunk for AI query')
    }

    // Verify all chunks belong strictly to courseAI
    for (const r of aiResults) {
      if (r.courseId !== courseAI) {
        throw new Error(`Course isolation breached! Chunk from ${r.courseId} appeared in query for ${courseAI}`)
      }
    }

    // Top result should be the Backpropagation chunk
    if (aiResults[0].chunkId !== 'chk_ai_2') {
      throw new Error(`Expected top result to be Backpropagation chunk (chk_ai_2), got ${aiResults[0].chunkId}`)
    }

    // Verify Biology query never returns AI chunks
    const bioResults = await retrieveRelevantChunks(courseBio, query, 5, {
      vectorStore,
      embeddingService,
    })

    console.log(`   Bio Course Results Count for AI Query: ${bioResults.length} (Expected: 0 or low irrelevant score)`)
    for (const r of bioResults) {
      if (r.courseId !== courseBio) {
        throw new Error(`Course isolation breached in Bio query! Got ${r.courseId}`)
      }
    }

    console.log('   ✓ Course isolation and boundary prevention PASSED\n')
    passed++
  } catch (err: any) {
    console.error('   ✗ Test 3 Failed:', err?.message || err)
    failed++
  }

  // -------------------------------------------------------------
  // Test 4: Top-K Limiting and Source Citation Metadata Integrity
  // -------------------------------------------------------------
  console.log('Test 4: Top-K Limiting & Citation Metadata Integrity')
  try {
    const query = 'What does gradient descent do?'
    const topKResults = await retrieveRelevantChunks(courseAI, query, 2, {
      vectorStore,
      embeddingService,
    })

    console.log(`   Requested Top-2, returned: ${topKResults.length}`)
    if (topKResults.length > 2) {
      throw new Error(`Top-K limit exceeded: got ${topKResults.length}, max was 2`)
    }

    // Validate citation fields on top result
    const top = topKResults[0]
    const requiredProps = [
      'chunkId',
      'courseId',
      'materialId',
      'sourceName',
      'sourceType',
      'sectionTitle',
      'similarityScore',
      'text',
    ]

    for (const prop of requiredProps) {
      if ((top as any)[prop] === undefined) {
        throw new Error(`Retrieved chunk is missing metadata property: ${prop}`)
      }
    }

    if (top.pageNumber === undefined && top.slideNumber === undefined) {
      throw new Error('Retrieved chunk missing both pageNumber and slideNumber!')
    }

    console.log(`   Top Chunk: "${top.sectionTitle}" (${top.sourceName})`)
    console.log(`   Page: ${top.pageNumber}, Slide: ${top.slideNumber}`)
    console.log(`   Similarity Score: ${top.similarityScore}`)

    console.log('   ✓ Top-K limit and metadata integrity PASSED\n')
    passed++
  } catch (err: any) {
    console.error('   ✗ Test 4 Failed:', err?.message || err)
    failed++
  }

  // -------------------------------------------------------------
  // Test 5: Grounded Context Formatting
  // -------------------------------------------------------------
  console.log('Test 5: Grounded Context Construction')
  try {
    const query = 'What is convolution in CNNs?'
    const retrieved = await retrieveRelevantChunks(courseAI, query, 3, {
      vectorStore,
      embeddingService,
    })

    const context = formatGroundedContext(retrieved)
    console.log('   Generated Context Preview:')
    console.log('   ' + context.split('\n').slice(0, 7).join('\n   '))

    if (!context.includes('Lecture_04_CNNs.pptx') || !context.includes('Slide: 7')) {
      throw new Error('Grounded context missing expected PPTX slide citation!')
    }

    console.log('   ✓ Grounded context formatting PASSED\n')
    passed++
  } catch (err: any) {
    console.error('   ✗ Test 5 Failed:', err?.message || err)
    failed++
  }

  console.log('=================================================================')
  console.log(`RAG PIPELINE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('=================================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runRAGPipelineVerification().catch((err) => {
  console.error('RAG Verification error:', err)
  process.exit(1)
})
