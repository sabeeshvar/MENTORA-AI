import { Router, Request, Response } from 'express'
import { geminiService } from '../services/ai/gemini.service'
import { serverConfig } from '../config'
import { retrieveRelevantChunks, defaultVectorStore } from '../services/retrievalService'

export const geminiRouter = Router()

/**
 * Status check for AI engine configuration
 */
geminiRouter.get('/status', (_req: Request, res: Response) => {
  res.json({
    configured: serverConfig.isGeminiConfigured,
    provider: 'Google Gemini',
    model: 'gemini-2.5-flash',
  })
})

/**
 * RAG Semantic Retrieval Endpoint
 */
geminiRouter.post('/retrieve', async (req: Request, res: Response) => {
  const { courseId, query, chunks, topK } = req.body

  if (!courseId || typeof courseId !== 'string') {
    return res.status(400).json({ error: 'courseId is required' })
  }
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query is required' })
  }

  try {
    if (Array.isArray(chunks) && chunks.length > 0) {
      await defaultVectorStore.indexChunks(courseId, chunks)
    }

    const results = await retrieveRelevantChunks(
      courseId.trim(),
      query.trim(),
      typeof topK === 'number' ? topK : 5
    )

    return res.json({
      courseId,
      query,
      retrievedCount: results.length,
      chunks: results,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Retrieval failed' })
  }
})

/**
 * Source-Grounded Multimodal Tutor Endpoint
 */
geminiRouter.post('/tutor', async (req: Request, res: Response) => {
  const { question, courseId, chunks, courseTitle, conversationHistory, preferredLanguage, topK } =
    req.body

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({
      error: 'Question is required and must be a non-empty string.',
    })
  }
  if (!courseId || typeof courseId !== 'string') {
    return res.status(400).json({
      error: 'courseId is required to scope retrieval.',
    })
  }

  try {
    const response = await geminiService.queryGroundedTutor({
      courseId: courseId.trim(),
      question: question.trim(),
      chunks: Array.isArray(chunks) ? chunks : [],
      courseTitle: typeof courseTitle === 'string' ? courseTitle : undefined,
      conversationHistory: Array.isArray(conversationHistory) ? conversationHistory : undefined,
      preferredLanguage: typeof preferredLanguage === 'string' ? preferredLanguage : 'en',
      topK: typeof topK === 'number' ? topK : 5,
    })

    return res.json(response)
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Failed to process question with Gemini AI',
    })
  }
})

/**
 * Adaptive Grounded Quiz Generator Endpoint
 */
geminiRouter.post('/quiz/generate', async (req: Request, res: Response) => {
  const {
    courseId,
    topic,
    difficulty,
    numberOfQuestions,
    questionTypes,
    chunks,
    preferredLanguage,
    priorQuestionTexts,
    priorQuestionHashes,
  } = req.body

  if (!courseId || !topic) {
    return res.status(400).json({ error: 'courseId and topic are required' })
  }

  try {
    const quiz = await geminiService.generateGroundedQuiz({
      courseId: courseId.trim(),
      topic: topic.trim(),
      difficulty: difficulty || 'medium',
      numberOfQuestions: typeof numberOfQuestions === 'number' ? numberOfQuestions : 4,
      questionTypes: Array.isArray(questionTypes) ? questionTypes : ['mcq', 'short_answer', 'numerical'],
      chunks: Array.isArray(chunks) ? chunks : undefined,
      preferredLanguage: typeof preferredLanguage === 'string' ? preferredLanguage : 'en',
      priorQuestionTexts: Array.isArray(priorQuestionTexts) ? priorQuestionTexts : undefined,
      priorQuestionHashes: Array.isArray(priorQuestionHashes) ? priorQuestionHashes : undefined,
    })

    return res.json(quiz)
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Failed to generate quiz',
    })
  }
})

/**
 * Question Verification Endpoint
 */
geminiRouter.post('/quiz/verify', async (req: Request, res: Response) => {
  const { question, context } = req.body

  if (!question) {
    return res.status(400).json({ error: 'question is required' })
  }

  try {
    const result = await geminiService.verifyQuestionQualityAndCorrectness(question, context || '')
    return res.json(result)
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Question verification failed',
    })
  }
})

/**
 * Multimodal Diagram & Figure Understanding Endpoint
 */
geminiRouter.post('/vision/describe', async (req: Request, res: Response) => {
  const { imageBase64, mimeType, pageOrSlideNumber, documentContext, title } = req.body

  try {
    const result = await geminiService.describeDiagramOrVisual({
      imageBase64,
      mimeType,
      pageOrSlideNumber,
      documentContext,
      title,
    })
    return res.json(result)
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Diagram vision description failed',
    })
  }
})

/**
 * Multimodal Speech-to-Text Transcription Endpoint
 */
geminiRouter.post('/transcribe', async (req: Request, res: Response) => {
  const { audioBase64, mimeType, fileName } = req.body

  try {
    const result = await geminiService.transcribeAudioOrVideo({
      base64Data: audioBase64,
      mimeType,
      fileName,
    })
    return res.json(result)
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Video/audio transcription failed',
    })
  }
})

/**
 * Conversational Mastery Understanding Endpoint
 */
geminiRouter.post('/tutor/evaluate-understanding', async (req: Request, res: Response) => {
  const { courseId, studentStatement, courseTitle, chunks } = req.body

  if (!courseId || !studentStatement) {
    return res.status(400).json({ error: 'courseId and studentStatement are required' })
  }

  try {
    const result = await geminiService.evaluateConversationalUnderstanding({
      courseId: courseId.trim(),
      studentStatement: String(studentStatement).trim(),
      courseTitle,
      chunks: Array.isArray(chunks) ? chunks : undefined,
    })
    return res.json(result)
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Conversational mastery evaluation failed',
    })
  }
})

/**
 * Answer Evaluation Endpoint
 */
geminiRouter.post('/quiz/evaluate', async (req: Request, res: Response) => {
  const { question, studentAnswer, preferredLanguage } = req.body

  if (!question || studentAnswer === undefined) {
    return res.status(400).json({ error: 'question and studentAnswer are required' })
  }

  try {
    const result = await geminiService.evaluateQuestionAnswer({
      question,
      studentAnswer: String(studentAnswer),
      preferredLanguage,
    })

    return res.json(result)
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Failed to evaluate answer',
    })
  }
})

/**
 * Study Plan Generation Endpoint
 */
geminiRouter.post('/study-plan/generate', async (req: Request, res: Response) => {
  const { courseId, courseTitle, targetDate, dailyAvailableMinutes, preferredDays, topics, preferredLanguage } =
    req.body

  if (!courseId || !targetDate) {
    return res.status(400).json({ error: 'courseId and targetDate are required' })
  }

  try {
    const days = await geminiService.generateStudyPlan({
      courseId,
      courseTitle: courseTitle || 'Course',
      targetDate,
      dailyAvailableMinutes: dailyAvailableMinutes || 60,
      preferredDays: preferredDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      topics: topics || [],
      preferredLanguage,
    })

    return res.json({ days })
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Failed to generate study plan',
    })
  }
})

/**
 * Revision Session Recap Endpoint
 */
geminiRouter.post('/revision/session', async (req: Request, res: Response) => {
  const { courseId, topicId, topicName, chunks, preferredLanguage } = req.body

  if (!courseId || !topicName) {
    return res.status(400).json({ error: 'courseId and topicName are required' })
  }

  try {
    const session = await geminiService.generateRevisionRecap({
      courseId,
      topicId: topicId || 'topic',
      topicName,
      chunks: Array.isArray(chunks) ? chunks : undefined,
      preferredLanguage,
    })

    return res.json(session)
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Failed to generate revision session',
    })
  }
})
