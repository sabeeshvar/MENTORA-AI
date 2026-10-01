import Groq from 'groq-sdk'
import { serverConfig } from '../config'
import {
  retrieveRelevantChunks,
  formatGroundedContext,
  defaultVectorStore,
  type ChunkCandidate,
  type RetrievedChunk,
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
  retrievedChunks?: RetrievedChunk[]
}

export interface AskTutorParams {
  courseId: string
  question: string
  chunks?: ChunkCandidate[]
  courseTitle?: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  topK?: number
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
 * End-to-end RAG Tutor query:
 * Question
 * -> embedding
 * -> retrieval (filtered by courseId)
 * -> relevance filtering
 * -> context construction
 * -> Groq LLaMA 3.3
 * -> cited answer
 */
export const queryGroqTutor = async (params: AskTutorParams): Promise<TutorResponse> => {
  const { courseId, question, chunks, courseTitle, conversationHistory, topK = 5 } = params

  if (!question || question.trim().length === 0) {
    throw new Error('Question cannot be empty.')
  }

  // 1. Index any supplied course chunks into vector store if provided
  if (chunks && chunks.length > 0) {
    await defaultVectorStore.indexChunks(courseId, chunks)
  }

  // 2. Retrieve relevant chunks using dense semantic embedding vector search
  // Strictly filtered by courseId to prevent unrelated course content from entering
  const retrievedChunks = await retrieveRelevantChunks(courseId, question, topK)

  // If no chunks exist at all in this course
  const totalCourseChunks = await defaultVectorStore.getAllCourseChunks(courseId)
  if (totalCourseChunks.length === 0 && (!chunks || chunks.length === 0)) {
    return {
      answer:
        'No learning materials have been uploaded or processed for this course yet. Please upload course PDFs or lecture slides so I can provide grounded answers with exact page and slide citations.',
      sources: [],
      confidence: 0,
      grounded: false,
      retrievedChunksCount: 0,
      retrievedChunks: [],
    }
  }

  // 3. Format grounded context
  const contextString = formatGroundedContext(retrievedChunks)

  // 4. Build messages array for Groq
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
  ]

  // Add recent conversation history if provided
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
  const userPrompt = `COURSE: ${courseTitle || 'Current Course'} (ID: ${courseId})

SUPPLIED COURSE MATERIAL CONTEXT:
${contextString}

STUDENT QUESTION:
${question}

Remember: Answer ONLY using the supplied context above. If the context does not contain the answer, explicitly state that the material does not contain enough information and set grounded=false.`

  messages.push({
    role: 'user',
    content: userPrompt,
  })

  // 5. Invoke Groq API
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

  // 6. Parse and validate JSON structure
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
      retrievedChunksCount: retrievedChunks.length,
      retrievedChunks,
    }
  } catch (parseErr) {
    console.warn('Failed to parse Groq JSON response, extracting text fallback:', rawContent)
    return {
      answer: rawContent.replace(/```json|```/g, '').trim(),
      sources: [],
      confidence: 0.5,
      grounded: false,
      retrievedChunksCount: retrievedChunks.length,
      retrievedChunks,
    }
  }
}

export interface GenerateQuizParams {
  courseId: string
  topic: string
  difficulty?: 'easy' | 'medium' | 'hard' | 'adaptive'
  numberOfQuestions?: number
  questionTypes?: Array<'mcq' | 'short_answer' | 'numerical'>
  chunks?: ChunkCandidate[]
}

export interface GeneratedQuizResult {
  quizId: string
  courseId: string
  topic: string
  difficulty: 'easy' | 'medium' | 'hard' | 'adaptive'
  questions: any[]
  grounded: boolean
  sourceCount: number
}

/**
 * Server-side Grounded Quiz Generation:
 * 1. Retrieves relevant course chunks for the topic
 * 2. Prompts Groq to generate questions strictly grounded in those chunks
 * 3. Enforces MCQ, short_answer, and numerical structure
 * 4. Validates and returns typed question array with source citations
 */
export const generateGroundedQuiz = async (
  params: GenerateQuizParams
): Promise<GeneratedQuizResult> => {
  const {
    courseId,
    topic,
    difficulty = 'medium',
    numberOfQuestions = 4,
    questionTypes = ['mcq', 'short_answer', 'numerical'],
    chunks,
  } = params

  if (!courseId) throw new Error('courseId is required')
  if (!topic) throw new Error('topic is required')

  // 1. Index any supplied chunks
  if (chunks && chunks.length > 0) {
    await defaultVectorStore.indexChunks(courseId, chunks)
  }

  // 2. Retrieve top-k relevant chunks
  const retrievedChunks = await retrieveRelevantChunks(courseId, topic, 8)
  const contextString = formatGroundedContext(retrievedChunks)

  const quizId = `quiz_${Date.now()}`
  const groq = getGroqClient()

  const QUIZ_GEN_SYSTEM_PROMPT = `You are MENTORA AI, an expert adaptive educational assessment architect.
Your job is to generate high-yield, academically rigorous quiz questions strictly grounded in the provided Course Material Context.

RULES:
1. Every question must be directly answerable from the provided context. Never invent facts outside the text.
2. For each question, cite the exact source ("materialName", "pageNumber" or "slideNumber", and "relevantText" excerpt).
3. Generate a balanced mix of requested question types: ${questionTypes.join(', ')}.
4. For 'mcq', provide exactly 4 distinct options in the "options" array, and set "correctAnswer" to the exact matching text of the correct option.
5. For 'short_answer', provide a clear "correctAnswer" model answer and a list of "expectedConcepts" (2 to 4 keywords/concepts required).
6. For 'numerical', provide "expectedNumericValue" (number), "tolerance" (e.g. 0.05), "unit" (if applicable), and "correctAnswer" (string representation).
7. Calibrate difficulty to: ${difficulty}.
8. Return ONLY valid JSON matching the schema below. No markdown wrappers or preamble.

OUTPUT JSON SCHEMA:
{
  "questions": [
    {
      "question": "string",
      "type": "mcq" | "short_answer" | "numerical",
      "difficulty": "easy" | "medium" | "hard",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": "string",
      "expectedConcepts": ["concept1", "concept2"],
      "expectedNumericValue": number,
      "tolerance": number,
      "unit": "string",
      "explanation": "string (pedagogical explanation of why this answer is correct)",
      "source": {
        "materialName": "string",
        "pageNumber": number | null,
        "slideNumber": number | null,
        "relevantText": "string"
      }
    }
  ]
}`

  const userPrompt = `TOPIC: ${topic}
REQUESTED QUESTIONS COUNT: ${numberOfQuestions}
TARGET DIFFICULTY: ${difficulty}

SUPPLIED COURSE CONTEXT:
${contextString}

Generate ${numberOfQuestions} rigorous, source-grounded questions testing deep understanding of ${topic}.`

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: QUIZ_GEN_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 2500,
    response_format: { type: 'json_object' },
  })

  const raw = completion.choices[0]?.message?.content || '{}'
  let parsed: any = {}
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    console.warn('JSON parse error in quiz generator, attempting extraction:', err)
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      parsed = JSON.parse(match[0])
    }
  }

  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : []
  const validatedQuestions = rawQuestions.map((q: any, idx: number) => {
    const qType = ['mcq', 'short_answer', 'numerical'].includes(q.type) ? q.type : 'mcq'
    const qDiff = ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : difficulty === 'adaptive' ? 'medium' : difficulty

    // Fallback source citation from top retrieved chunk if model omitted it
    const defaultSource = retrievedChunks[idx % (retrievedChunks.length || 1)]
    const sourceObj = q.source || {}

    return {
      questionId: `q_${Date.now()}_${idx}`,
      courseId,
      topic,
      difficulty: qDiff,
      type: qType,
      question: String(q.question || `Question on ${topic}`).trim(),
      options: qType === 'mcq' && Array.isArray(q.options) && q.options.length >= 2
        ? q.options.slice(0, 4).map(String)
        : qType === 'mcq'
        ? ['Option A', 'Option B', 'Option C', 'Option D']
        : undefined,
      correctAnswer: String(q.correctAnswer || (qType === 'mcq' ? q.options?.[0] || 'Option A' : 'Correct Concept')).trim(),
      expectedConcepts: Array.isArray(q.expectedConcepts) ? q.expectedConcepts.map(String) : undefined,
      expectedNumericValue: typeof q.expectedNumericValue === 'number' ? q.expectedNumericValue : undefined,
      tolerance: typeof q.tolerance === 'number' ? q.tolerance : 0.05,
      unit: typeof q.unit === 'string' ? q.unit : undefined,
      explanation: String(q.explanation || 'Verified from course reading material.').trim(),
      source: {
        materialName: String(sourceObj.materialName || defaultSource?.sourceName || 'Course Material'),
        pageNumber: typeof sourceObj.pageNumber === 'number' ? sourceObj.pageNumber : defaultSource?.pageNumber ?? null,
        slideNumber: typeof sourceObj.slideNumber === 'number' ? sourceObj.slideNumber : defaultSource?.slideNumber ?? null,
        relevantText: String(sourceObj.relevantText || defaultSource?.text || '').trim(),
      },
      createdAt: new Date().toISOString(),
    }
  })

  return {
    quizId,
    courseId,
    topic,
    difficulty,
    questions: validatedQuestions,
    grounded: retrievedChunks.length > 0,
    sourceCount: retrievedChunks.length,
  }
}

export interface EvaluateAnswerParams {
  question: any
  studentAnswer: string
}

/**
 * Evaluates student answer:
 * - MCQ: Exact string match
 * - Numerical: Range / tolerance check + optional unit
 * - Short Answer: Semantic evaluation via Groq
 * - On mistake: Generates comprehensive wrong-answer explanation & remediation
 */
export const evaluateQuestionAnswer = async (
  params: EvaluateAnswerParams
): Promise<any> => {
  const { question, studentAnswer } = params
  const cleanAns = String(studentAnswer || '').trim()
  const qType = question.type || 'mcq'

  let isCorrect = false
  let score = 0.0
  let feedback = ''

  if (qType === 'mcq') {
    const normStudent = cleanAns.toLowerCase().replace(/^[a-d][.)]\s*/i, '').trim()
    const normCorrect = String(question.correctAnswer || '').toLowerCase().replace(/^[a-d][.)]\s*/i, '').trim()
    isCorrect = normStudent === normCorrect || cleanAns === question.correctAnswer
    score = isCorrect ? 1.0 : 0.0
    feedback = isCorrect
      ? 'Correct! Excellent recall of the course material.'
      : `Incorrect. The correct answer is: "${question.correctAnswer}".`
  } else if (qType === 'numerical') {
    const studentNum = parseFloat(cleanAns.replace(/[^0-9.-]/g, ''))
    const targetNum = typeof question.expectedNumericValue === 'number'
      ? question.expectedNumericValue
      : parseFloat(String(question.correctAnswer).replace(/[^0-9.-]/g, ''))

    if (isNaN(studentNum) || isNaN(targetNum)) {
      isCorrect = cleanAns.toLowerCase() === String(question.correctAnswer).toLowerCase()
      score = isCorrect ? 1.0 : 0.0
    } else {
      const tolerance = question.tolerance ?? 0.05
      const diff = Math.abs(studentNum - targetNum)
      const allowedDelta = Math.max(Math.abs(targetNum) * tolerance, 0.001)
      isCorrect = diff <= allowedDelta
      score = isCorrect ? 1.0 : 0.0
      feedback = isCorrect
        ? `Correct numerical calculation (${studentNum}${question.unit ? ' ' + question.unit : ''}).`
        : `Incorrect. Expected approximately ${targetNum}${question.unit ? ' ' + question.unit : ''} (got ${cleanAns}).`
    }
  } else {
    // Short Answer: Semantic evaluation with Groq
    const groq = getGroqClient()
    const evalPrompt = `Evaluate the student's short answer against the model answer and expected concepts.
QUESTION: ${question.question}
MODEL CORRECT ANSWER: ${question.correctAnswer}
EXPECTED KEY CONCEPTS: ${JSON.stringify(question.expectedConcepts || [])}
STUDENT ANSWER: ${cleanAns}

Output JSON with:
{
  "isCorrect": boolean,
  "score": number (0.0 to 1.0),
  "feedback": "string (concise pedagogical feedback on what was correct or missing)"
}`

    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: evalPrompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      })
      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
      score = typeof parsed.score === 'number' ? Math.max(0, Math.min(1, parsed.score)) : 0.5
      isCorrect = Boolean(parsed.isCorrect ?? score >= 0.7)
      feedback = String(parsed.feedback || (isCorrect ? 'Good conceptual answer.' : 'Partially incorrect answer.'))
    } catch {
      // Fallback keyword check
      const concepts: string[] = question.expectedConcepts || [question.correctAnswer]
      const matches = concepts.filter((c) => cleanAns.toLowerCase().includes(c.toLowerCase())).length
      score = concepts.length > 0 ? matches / concepts.length : 0.5
      isCorrect = score >= 0.6
      feedback = isCorrect ? 'Answer demonstrates understanding of required concepts.' : 'Answer is missing critical course concepts.'
    }
  }

  let wrongAnswerAnalysis: any = undefined

  // If student made a mistake, generate the 6-point pedagogical wrong answer breakdown
  if (!isCorrect) {
    try {
      const groq = getGroqClient()
      const remedyPrompt = `A student answered a question incorrectly. Generate a clear, grounded remedy explanation.
QUESTION: ${question.question}
STUDENT INCORRECT ANSWER: ${cleanAns}
CORRECT ANSWER: ${question.correctAnswer}
EXPLANATION: ${question.explanation}
SOURCE EXCERPT: ${question.source?.relevantText || ''}

Return valid JSON with:
{
  "correctConcept": "string (the core concept the student should remember)",
  "whyIncorrect": "string (why the student's answer was incorrect without sounding harsh)",
  "simpleExplanation": "string (a very simple 2-sentence plain English breakdown)",
  "example": "string (a real-world concrete example or analogy)",
  "followUpQuestion": "string (a quick diagnostic follow-up question to test if they now understand)"
}`

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: remedyPrompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      })
      const parsedRemedy = JSON.parse(completion.choices[0]?.message?.content || '{}')
      wrongAnswerAnalysis = {
        correctConcept: parsedRemedy.correctConcept || question.correctAnswer,
        whyIncorrect: parsedRemedy.whyIncorrect || 'The provided response does not match the principles in the learning material.',
        simpleExplanation: parsedRemedy.simpleExplanation || question.explanation,
        example: parsedRemedy.example || 'Consider how this applies in standard problem cases.',
        source: question.source,
        followUpQuestion: parsedRemedy.followUpQuestion || 'Can you identify the primary factor governing this behavior?',
      }
    } catch (err) {
      console.warn('Could not generate wrong answer remedy analysis:', err)
      wrongAnswerAnalysis = {
        correctConcept: question.correctAnswer,
        whyIncorrect: 'Response diverged from the documented course material.',
        simpleExplanation: question.explanation,
        example: 'Review the referenced section in the material.',
        source: question.source,
        followUpQuestion: 'What is the primary definition stated in the material?',
      }
    }
  }

  return {
    questionId: question.questionId,
    studentAnswer: cleanAns,
    correctAnswer: question.correctAnswer,
    isCorrect,
    score,
    feedback,
    explanation: question.explanation,
    source: question.source,
    wrongAnswerAnalysis,
  }
}

export interface ExplainRemedyActionParams {
  action: 'explain_simply' | 'give_example' | 'ask_followup'
  question: string
  studentAnswer: string
  correctConcept: string
  sourceContext?: string
}

/**
 * Handles the 3 interactive remedy action buttons:
 * - "Explain Simply"
 * - "Give an Example"
 * - "Ask Me a Follow-up"
 */
export const explainRemedyAction = async (
  params: ExplainRemedyActionParams
): Promise<{ text: string }> => {
  const { action, question, studentAnswer, correctConcept, sourceContext } = params
  const groq = getGroqClient()

  let prompt = ''
  if (action === 'explain_simply') {
    prompt = `The student is struggling with this concept:
QUESTION: ${question}
STUDENT ANSWER: ${studentAnswer}
CORRECT CONCEPT: ${correctConcept}
COURSE CONTEXT: ${sourceContext || ''}

Explain this concept simply and intuitively in 3-4 sentences. Use simple words and avoid dense jargon.`
  } else if (action === 'give_example') {
    prompt = `Provide a concrete, memorable real-world example or practical application illustrating:
CONCEPT: ${correctConcept}
IN THE CONTEXT OF: ${question}
SOURCE CONTEXT: ${sourceContext || ''}

Make the example crystal clear and intuitive.`
  } else {
    prompt = `Create an interactive diagnostic follow-up question to help the student verify they understand:
CONCEPT: ${correctConcept}
QUESTION DISCUSSED: ${question}

Provide the follow-up question and briefly explain what insight they should look for.`
  }

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 800,
  })

  return {
    text: completion.choices[0]?.message?.content || 'No explanation generated.',
  }
}

