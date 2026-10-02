import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  Send,
  FileText,
  Presentation,
  BookOpen,
  Trash2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  Layers,
  ArrowRight,
  Info,
  ExternalLink,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { ChunkViewerModal } from '@/components/materials/ChunkViewerModal'
import {
  getUserCourses,
  getCourseMaterials,
  getMaterialChunks,
} from '@/lib/supabase/db'
import { MasteryService } from '@/services/masteryService'
import {
  askAITutor,
  checkAIStatus,
  type SourceCitation,
} from '@/services/tutorApi'
import { useTranslation } from '@/context/LanguageContext'
import type { Course, CourseMaterial } from '@/types/course'
import type { ProcessedChunk } from '@/types/chunk'

interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  timestamp: string
  sources?: SourceCitation[]
  grounded?: boolean
  confidence?: number
  retrievedCount?: number
  isError?: boolean
}

export const StudyPage: React.FC = () => {
  const { user } = useAuth()
  const { language } = useTranslation()

  // Course Selection & Data States
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [materials, setMaterials] = useState<CourseMaterial[]>([])
  const [courseChunks, setCourseChunks] = useState<ProcessedChunk[]>([])
  const [loadingCourseData, setLoadingCourseData] = useState(false)

  // AI Server Status
  const [isGeminiConfigured, setIsGeminiConfigured] = useState<boolean | null>(null)

  // Chat States
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputQuestion, setInputQuestion] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [thinkingStage, setThinkingStage] = useState('Consulting course materials...')
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const [masteryBanner, setMasteryBanner] = useState<string | null>(null)

  // Chunk Viewer Modal State for Click-to-Open Citations
  const [viewerModalState, setViewerModalState] = useState<{
    isOpen: boolean
    material: CourseMaterial | null
    initialChunkId?: string
    initialPageNumber?: number
    initialSlideNumber?: number
    initialVideoTimestamp?: string
    highlightText?: string
  }>({
    isOpen: false,
    material: null,
  })

  const handleCitationClick = (src: SourceCitation) => {
    // Attempt to match material by name
    const mat = materials.find(
      (m) =>
        m.name.toLowerCase() === src.materialName.toLowerCase() ||
        src.materialName.toLowerCase().includes(m.name.toLowerCase()) ||
        m.name.toLowerCase().includes(src.materialName.toLowerCase())
    ) || {
      materialId: (src as any).materialId || 'temp_mat',
      courseId: selectedCourseId,
      name: src.materialName,
      type: src.materialName.toLowerCase().endsWith('.pdf')
        ? 'PDF'
        : src.materialName.toLowerCase().endsWith('.pptx') || src.materialName.toLowerCase().endsWith('.ppt')
        ? 'PPTX'
        : 'VIDEO',
      sizeBytes: 0,
      downloadURL: '',
      storagePath: '',
      uploadedAt: new Date().toISOString(),
      processingStatus: 'ready' as const,
    }

    setViewerModalState({
      isOpen: true,
      material: mat,
      initialChunkId: (src as any).chunkId,
      initialPageNumber: src.pageNumber ?? undefined,
      initialSlideNumber: src.slideNumber ?? undefined,
      initialVideoTimestamp: src.videoTimestamp || (src as any).startTimestamp,
      highlightText: src.relevantText,
    })
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isThinking])

  // Check backend AI engine configuration status on mount
  useEffect(() => {
    checkAIStatus().then((status) => {
      setIsGeminiConfigured(status.configured)
    })
  }, [])

  // 1. Fetch User Courses
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return
      try {
        const userCourses = await getUserCourses(user.uid)
        setCourses(userCourses)
        if (userCourses.length > 0 && !selectedCourseId) {
          setSelectedCourseId(userCourses[0].courseId)
        }
      } catch (err) {
        console.warn('Error loading courses for study page:', err)
      }
    }
    fetchCourses()
  }, [user])

  // 2. Load Materials and Chunks for Selected Course
  useEffect(() => {
    if (!selectedCourseId || !user) return

    const loadData = async () => {
      setLoadingCourseData(true)
      try {
        const mats = await getCourseMaterials(selectedCourseId, user.uid)
        setMaterials(mats)

        // Aggregate all chunks across materials
        const allChunks: ProcessedChunk[] = []
        for (const mat of mats) {
          try {
            const chunks = await getMaterialChunks(selectedCourseId, mat.materialId)
            allChunks.push(...chunks)
          } catch {
            // Continue
          }
        }
        setCourseChunks(allChunks)
      } catch (err) {
        console.warn('Failed to load course materials for RAG:', err)
      } finally {
        setLoadingCourseData(false)
      }
    }

    loadData()
  }, [selectedCourseId, user])

  const selectedCourse = courses.find((c) => c.courseId === selectedCourseId)

  // Send Question to RAG Gemini Tutor
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuestion).trim()
    if (!query || isThinking || !selectedCourseId) return

    setInputQuestion('')
    setErrorBanner(null)

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsThinking(true)
    setThinkingStage('Searching indexed course chunks...')

    const thinkingTimer = setTimeout(() => {
      setThinkingStage('Google Gemini 2.5 Flash synthesizing cited explanation...')
    }, 900)

    try {
      // Build conversation history for context
      const history = messages.slice(-4).map((m) => ({
        role: m.sender,
        content: m.text,
      }))

      const result = await askAITutor({
        courseId: selectedCourseId,
        question: query,
        courseTitle: selectedCourse?.title,
        chunks: courseChunks,
        conversationHistory: history,
        preferredLanguage: language,
      })

      const assistantMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: result.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: result.sources,
        grounded: result.grounded,
        confidence: result.confidence,
        retrievedCount: result.retrievedChunksCount,
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Priority 7: Lightweight Conversational Mastery Signal
      // If student message looks explanatory rather than a basic question, evaluate asynchronously
      if (user && selectedCourseId && query.length >= 25) {
        const isPureQuestion =
          /^(what|how|why|when|where|who|can you|explain|tell me|give me|could you)\b/i.test(query.trim()) &&
          query.trim().endsWith('?')

        if (!isPureQuestion) {
          fetch('/api/ai/tutor/evaluate-understanding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: query,
              courseId: selectedCourseId,
              contextChunks: courseChunks.slice(0, 4).map((c) => ({
                content: c.text,
                metadata: {
                  pageNumber: c.pageNumber,
                  slideNumber: c.slideNumber,
                  videoTimestamp: c.videoTimestamp,
                  sectionTitle: c.sectionTitle,
                  diagramDescription: c.diagramDescription,
                },
              })),
            }),
          })
            .then((res) => res.json())
            .then(async (data) => {
              if (data.isExplanatory && data.confidence >= 0.7 && data.topic) {
                const updated = await MasteryService.processConversationalMastery(
                  user.uid,
                  selectedCourseId,
                  data.topic,
                  data.conceptualAccuracy ?? 0.8,
                  data.confidence
                )
                if (updated) {
                  setMasteryBanner(
                    `Topic Mastery calibrated from explanation: ${data.topic} (${Math.round(updated.masteryScore * 100)}%)`
                  )
                  setTimeout(() => setMasteryBanner(null), 6000)
                }
              }
            })
            .catch((err) => console.debug('Conversational mastery eval skipped:', err))
        }
      }
    } catch (err: any) {
      console.error('Tutor query error:', err)
      const errorMsg =
        err?.message ||
        'Failed to receive answer from Gemini tutor. Please check server logs and GEMINI_API_KEY.'

      if (err?.configured === false || err?.status === 503) {
        setErrorBanner(
          'GEMINI_API_KEY is not set on the server. Please add your Gemini API key in the .env file to enable live Gemini answers.'
        )
      } else {
        setErrorBanner(errorMsg)
      }

      const errorMessage: ChatMessage = {
        id: `ai_err_${Date.now()}`,
        sender: 'assistant',
        text: `Error: ${errorMsg}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      clearTimeout(thinkingTimer)
      setIsThinking(false)
    }
  }

  const handleClearConversation = () => {
    if (messages.length === 0) return
    const confirmed = window.confirm('Are you sure you want to clear this study session?')
    if (confirmed) {
      setMessages([])
      setErrorBanner(null)
    }
  }

  // Sample prompt suggestions based on course content
  const samplePrompts = [
    'What are the main principles explained in the uploaded material?',
    'Summarize the key formulas and core definitions.',
    'Explain the most challenging concept from the first section.',
  ]

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col max-w-6xl mx-auto space-y-3">
      {/* Top Bar: Grounding Label, Course Selector & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-md">
        {/* Left: Visible Grounding Label */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold text-white">
                MENTORA AI Tutor
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Grounded in your learning materials
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Only answers from uploaded textbooks & slides with verified page and slide citations
            </p>
          </div>
        </div>

        {/* Right: Course Selector & Clear Button */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {courses.length > 0 && (
            <div className="relative">
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value)
                  setMessages([])
                }}
                className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {courses.map((c) => (
                  <option key={c.courseId} value={c.courseId}>
                    {c.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>{materials.length} Materials &bull; {courseChunks.length} Chunks</span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearConversation}
            disabled={messages.length === 0}
            className="text-xs px-2.5 py-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
            title="Clear Conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Gemini Key Warning Banner if unconfigured on backend */}
      {isGeminiConfigured === false && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Gemini API Key Required:</strong> Add your <code>GEMINI_API_KEY</code> in the server{' '}
              <code>.env</code> file to enable live Google Gemini 2.5 Flash answers.
            </span>
          </div>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 underline text-amber-300 hover:text-white font-semibold"
          >
            Get API Key
          </a>
        </div>
      )}

      {/* Active Error Banner */}
      {errorBanner && (
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            className="text-slate-400 hover:text-white font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Priority 7: Conversational Mastery Live Feedback Banner */}
      {masteryBanner && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{masteryBanner}</span>
          </div>
          <button
            onClick={() => setMasteryBanner(null)}
            className="text-emerald-400 hover:text-white font-bold text-xs"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col bg-slate-900/60 border-slate-800/80 rounded-3xl overflow-hidden min-h-0 shadow-xl">
        {/* Messages Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.length === 0 ? (
            /* Empty / Welcome State */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-10 space-y-5">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/20">
                <Sparkles className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Ask Your Grounded Course Tutor
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every answer is mathematically synthesized from the{' '}
                  <span className="text-emerald-400 font-semibold">{courseChunks.length} chunks</span>{' '}
                  of your uploaded textbooks and slides. If the material does not state it, the tutor will never fabricate.
                </p>
              </div>

              {/* Sample Prompts */}
              {courseChunks.length > 0 && (
                <div className="w-full space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Suggested Questions
                  </span>
                  <div className="flex flex-col gap-2">
                    {samplePrompts.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(p)}
                        className="text-left p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-950 text-xs text-slate-300 transition-all flex items-center justify-between group"
                      >
                        <span className="truncate">{p}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {courseChunks.length === 0 && !loadingCourseData && (
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2 max-w-md">
                  <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    No materials have been uploaded for this course yet. Go to{' '}
                    <strong>My Courses</strong> and upload PDFs or slides to enable source grounding.
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Render Message Thread */
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                } space-y-1.5`}
              >
                {/* Sender Name & Timestamp */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 px-1">
                  <span>{msg.sender === 'user' ? user?.displayName || 'You' : 'MENTORA AI'}</span>
                  <span>&bull;</span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-2xl rounded-2xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md'
                      : msg.isError
                      ? 'bg-rose-950/40 border border-rose-500/30 text-rose-200'
                      : 'bg-slate-950/80 border border-slate-800/80 text-slate-200 shadow-sm'
                  }`}
                >
                  {/* Grounded Badge for AI responses */}
                  {msg.sender === 'assistant' && !msg.isError && (
                    <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-800/70">
                      <div className="flex items-center gap-1.5">
                        {msg.grounded ? (
                          <Badge variant="emerald" size="sm" className="text-[10px] font-extrabold tracking-wider">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 mr-1" />
                            GROUNDED
                          </Badge>
                        ) : (
                          <Badge variant="amber" size="sm" className="text-[10px] font-extrabold tracking-wider bg-amber-500/15 border-amber-500/30 text-amber-300">
                            <AlertCircle className="w-3 h-3 text-amber-400 mr-1" />
                            INSUFFICIENT COURSE EVIDENCE
                          </Badge>
                        )}
                        {msg.confidence !== undefined && (
                          <span className="text-[10px] font-mono text-slate-400">
                            Confidence: {Math.round(msg.confidence * 100)}%
                          </span>
                        )}
                      </div>

                      {msg.retrievedCount !== undefined && msg.retrievedCount > 0 && (
                        <span className="text-[10px] text-slate-500">
                          {msg.retrievedCount} chunks evaluated
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Text */}
                  <div className="whitespace-pre-wrap selection:bg-emerald-500/30 font-sans">
                    {msg.text}
                  </div>

                  {/* Source Citation Cards */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3.5 border-t border-slate-800/80 space-y-2">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        Verified Source Citations ({msg.sources.length})
                      </h4>

                      <div className="grid grid-cols-1 gap-2">
                        {msg.sources.map((src, i) => (
                          <div
                            key={i}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleCitationClick(src)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleCitationClick(src)
                              }
                            }}
                            className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/20 hover:border-emerald-400 hover:bg-slate-800/90 hover:shadow-lg hover:shadow-emerald-950/30 transition-all cursor-pointer space-y-1.5 group text-left"
                            title="Click to open source chunk viewer at this exact location"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                                {src.materialName.endsWith('.pdf') ? (
                                  <FileText className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                ) : src.materialName.endsWith('.mp4') || src.materialName.includes('Video') ? (
                                  <Presentation className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                ) : (
                                  <Presentation className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                )}
                                <span className="truncate group-hover:text-emerald-300 transition-colors">
                                  {src.materialName}
                                </span>
                              </div>

                              <div className="shrink-0 flex items-center gap-1.5">
                                {src.pageNumber !== null && src.pageNumber !== undefined && (
                                  <Badge variant="rose" size="sm" className="text-[10px]">
                                    Page {src.pageNumber}
                                  </Badge>
                                )}
                                {src.slideNumber !== null && src.slideNumber !== undefined && (
                                  <Badge variant="amber" size="sm" className="text-[10px]">
                                    Slide {src.slideNumber}
                                  </Badge>
                                )}
                                {(src as any).startTimestamp && (
                                  <Badge variant="indigo" size="sm" className="text-[10px]">
                                    {(src as any).startTimestamp}–{(src as any).endTimestamp || 'End'}
                                  </Badge>
                                )}
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 opacity-80 group-hover:opacity-100 font-semibold transition-opacity ml-1">
                                  <ExternalLink className="w-3 h-3" />
                                  <span>View Source</span>
                                </span>
                              </div>
                            </div>

                            {src.relevantText && (
                              <p className="text-[11px] text-slate-300 italic pl-2.5 border-l-2 border-emerald-500/60 leading-relaxed bg-slate-950/40 py-1 rounded-r-lg group-hover:text-white transition-colors">
                                &ldquo;{src.relevantText}&rdquo;
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Thinking / Loading State */}
          {isThinking && (
            <div className="flex flex-col items-start space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 px-1">
                <span>MENTORA AI</span>
                <span>&bull;</span>
                <span>Synthesizing</span>
              </div>
              <div className="max-w-md rounded-2xl p-4 bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                <span className="animate-pulse">{thinkingStage}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Question Input Form */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800/80 bg-slate-950/70">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              disabled={isThinking || courseChunks.length === 0}
              placeholder={
                courseChunks.length === 0
                  ? 'Please upload course materials to begin grounded tutoring...'
                  : `Ask a grounded question about ${selectedCourse?.title || 'your materials'}...`
              }
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isThinking || !inputQuestion.trim() || courseChunks.length === 0}
              className="rounded-xl px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 shadow-md"
              leftIcon={
                isThinking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )
              }
            >
              <span className="hidden sm:inline">Ask Tutor</span>
            </Button>
          </form>
        </div>
      </Card>

      {/* Click-to-Open Citation Chunk Viewer Modal */}
      <ChunkViewerModal
        isOpen={viewerModalState.isOpen}
        onClose={() => setViewerModalState((prev) => ({ ...prev, isOpen: false }))}
        material={viewerModalState.material}
        courseId={selectedCourseId}
        initialChunkId={viewerModalState.initialChunkId}
        initialPageNumber={viewerModalState.initialPageNumber}
        initialSlideNumber={viewerModalState.initialSlideNumber}
        initialVideoTimestamp={viewerModalState.initialVideoTimestamp}
        highlightText={viewerModalState.highlightText}
        fallbackChunks={courseChunks}
      />
    </div>
  )
}

export default StudyPage
