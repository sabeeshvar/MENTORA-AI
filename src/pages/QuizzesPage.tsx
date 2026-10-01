import React, { useState, useEffect } from 'react'
import {
  Award,
  Sparkles,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Loader2,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import {
  getUserCourses,
  getCourseMaterials,
  getMaterialChunks,
  getCourseQuizzes,
  getUserQuizAttempts,
  saveQuiz,
} from '@/lib/firebase/firestore'
import {
  generateGroundedQuizApi,
  evaluateQuizAnswerApi,
  requestRemedyActionApi,
} from '@/services/quizApi'
import { MasteryService } from '@/services/masteryService'
import { getMasteryStatus, type TopicMastery } from '@/types/mastery'
import type { Course } from '@/types/course'
import type { ProcessedChunk } from '@/types/chunk'
import type {
  Quiz,
  QuestionAnswerResult,
  QuizDifficulty,
  QuestionType,
  QuizAttempt,
} from '@/types/quiz'

export const QuizzesPage: React.FC = () => {
  const { user } = useAuth()

  // State: Courses & Materials
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [_courseMaterials, setCourseMaterials] = useState<any[]>([])
  const [courseChunks, setCourseChunks] = useState<ProcessedChunk[]>([])

  // State: Quizzes & Attempts History
  const [savedQuizzes, setSavedQuizzes] = useState<Quiz[]>([])
  const [recentAttempts, setRecentAttempts] = useState<QuizAttempt[]>([])
  const [loading, setLoading] = useState(true)

  // State: Quiz Generator Modal
  const [showGenModal, setShowGenModal] = useState(false)
  const [genTopic, setGenTopic] = useState('')
  const [genDifficulty, setGenDifficulty] = useState<QuizDifficulty>('adaptive')
  const [genCount, setGenCount] = useState<number>(4)
  const [genTypes, setGenTypes] = useState<QuestionType[]>(['mcq', 'short_answer', 'numerical'])
  const [isGenerating, setIsGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  // State: Active Quiz Taking Mode
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [studentInput, setStudentInput] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evaluatedResult, setEvaluatedResult] = useState<QuestionAnswerResult | null>(null)
  const [quizResults, setQuizResults] = useState<QuestionAnswerResult[]>([])
  const [quizStartTime, setQuizStartTime] = useState<number>(0)

  // State: Interactive Remedy Action expansion
  const [remedyActionLoading, setRemedyActionLoading] = useState<string | null>(null)
  const [remedyActionResponse, setRemedyActionResponse] = useState<{
    action: string
    text: string
  } | null>(null)

  // State: Quiz Finished Summary
  const [quizFinished, setQuizFinished] = useState(false)
  const [savedAttempt, setSavedAttempt] = useState<QuizAttempt | null>(null)
  const [updatedMasteries, setUpdatedMasteries] = useState<TopicMastery[]>([])

  // Load User Courses on mount
  useEffect(() => {
    if (!user) return
    getUserCourses(user.uid)
      .then((data) => {
        setCourses(data)
        if (data.length > 0 && !selectedCourseId) {
          setSelectedCourseId(data[0].courseId)
        }
      })
      .catch((err) => console.warn('Failed to load courses for quiz:', err))
  }, [user])

  // Load Course Chunks & Quizzes when Course is selected
  useEffect(() => {
    if (!selectedCourseId || !user) return
    setLoading(true)

    Promise.all([
      getCourseMaterials(selectedCourseId, user.uid),
      getCourseQuizzes(user.uid, selectedCourseId),
      getUserQuizAttempts(user.uid, selectedCourseId),
    ])
      .then(async ([mats, quizzes, attempts]) => {
        setCourseMaterials(mats)
        setSavedQuizzes(quizzes)
        setRecentAttempts(attempts)

        // Aggregate chunks for grounding
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
      })
      .catch((err) => console.warn('Error loading quiz prerequisites:', err))
      .finally(() => setLoading(false))
  }, [selectedCourseId, user])

  // Generator: Toggle Question Type
  const toggleType = (t: QuestionType) => {
    if (genTypes.includes(t)) {
      if (genTypes.length > 1) {
        setGenTypes(genTypes.filter((x) => x !== t))
      }
    } else {
      setGenTypes([...genTypes, t])
    }
  }

  // Handle Quiz Generation
  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourseId || !user) return
    if (!genTopic.trim()) {
      setGenError('Please enter or select a topic from your course.')
      return
    }

    setIsGenerating(true)
    setGenError(null)

    try {
      const generated = await generateGroundedQuizApi({
        courseId: selectedCourseId,
        topic: genTopic.trim(),
        difficulty: genDifficulty,
        numberOfQuestions: genCount,
        questionTypes: genTypes,
        chunks: courseChunks,
      })

      const newQuiz: Quiz = {
        quizId: generated.quizId,
        courseId: selectedCourseId,
        userId: user.uid,
        topic: generated.topic,
        title: `${generated.topic} Adaptive Mastery Quiz`,
        difficulty: generated.difficulty,
        questions: generated.questions,
        createdAt: new Date().toISOString(),
      }

      await saveQuiz(newQuiz)
      setSavedQuizzes((prev) => [newQuiz, ...prev])
      setShowGenModal(false)

      // Automatically launch the generated quiz
      startQuiz(newQuiz)
    } catch (err: any) {
      console.error('Quiz generation error:', err)
      setGenError(err?.message || 'Failed to generate grounded quiz. Verify server and GROQ_API_KEY.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Start taking a quiz
  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz)
    setCurrentQuestionIndex(0)
    setStudentInput('')
    setSelectedOption(null)
    setEvaluatedResult(null)
    setQuizResults([])
    setQuizFinished(false)
    setSavedAttempt(null)
    setRemedyActionResponse(null)
    setQuizStartTime(Date.now())
  }

  // Submit current answer
  const handleSubmitAnswer = async () => {
    if (!activeQuiz) return
    const currentQ = activeQuiz.questions[currentQuestionIndex]
    const answerToSubmit = currentQ.type === 'mcq' ? selectedOption || '' : studentInput

    if (!answerToSubmit.trim() || isEvaluating) return

    setIsEvaluating(true)
    setRemedyActionResponse(null)

    try {
      const result = await evaluateQuizAnswerApi(currentQ, answerToSubmit.trim())
      setEvaluatedResult(result)
      setQuizResults((prev) => [...prev, result])
    } catch (err: any) {
      console.error('Evaluation failed:', err)
      // Fallback local evaluation
      const isCorrect =
        answerToSubmit.trim().toLowerCase() === currentQ.correctAnswer.toLowerCase()
      const fallbackResult: QuestionAnswerResult = {
        questionId: currentQ.questionId,
        studentAnswer: answerToSubmit,
        correctAnswer: currentQ.correctAnswer,
        isCorrect,
        score: isCorrect ? 1.0 : 0.0,
        feedback: isCorrect
          ? 'Correct! Solid recall of course material.'
          : `Incorrect. Expected: "${currentQ.correctAnswer}".`,
        explanation: currentQ.explanation,
        source: currentQ.source,
      }
      setEvaluatedResult(fallbackResult)
      setQuizResults((prev) => [...prev, fallbackResult])
    } finally {
      setIsEvaluating(false)
    }
  }

  // Handle Remedy Action (Explain Simply, Example, Follow-up)
  const handleRemedyAction = async (action: 'explain_simply' | 'give_example' | 'ask_followup') => {
    if (!activeQuiz || !evaluatedResult) return
    const currentQ = activeQuiz.questions[currentQuestionIndex]

    setRemedyActionLoading(action)
    try {
      const text = await requestRemedyActionApi({
        action,
        question: currentQ.question,
        studentAnswer: evaluatedResult.studentAnswer,
        correctConcept: evaluatedResult.wrongAnswerAnalysis?.correctConcept || currentQ.correctAnswer,
        sourceContext: currentQ.source?.relevantText || currentQ.explanation,
      })
      setRemedyActionResponse({ action, text })
    } catch (err: any) {
      console.warn('Remedy action error:', err)
      setRemedyActionResponse({
        action,
        text: 'Review the referenced page or slide in your course material for foundational context.',
      })
    } finally {
      setRemedyActionLoading(null)
    }
  }

  // Advance to next question or complete quiz
  const handleNextQuestion = async () => {
    if (!activeQuiz) return

    if (currentQuestionIndex + 1 < activeQuiz.questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1)
      setStudentInput('')
      setSelectedOption(null)
      setEvaluatedResult(null)
      setRemedyActionResponse(null)
    } else {
      // Complete Quiz: save attempt, compute mastery, generate recommendations!
      const correctCount = quizResults.filter((r) => r.isCorrect).length
      const totalCount = activeQuiz.questions.length
      const accuracyPct = Math.round((correctCount / totalCount) * 100)
      const durationSecs = Math.max(1, Math.round((Date.now() - quizStartTime) / 1000))

      const attempt: QuizAttempt = {
        attemptId: `att_${Date.now()}`,
        quizId: activeQuiz.quizId,
        courseId: activeQuiz.courseId,
        userId: user?.uid || 'guest',
        topic: activeQuiz.topic,
        difficulty: activeQuiz.difficulty,
        totalQuestions: totalCount,
        correctCount,
        accuracyPercentage: accuracyPct,
        timeSpentSeconds: durationSecs,
        completedAt: new Date().toISOString(),
        results: quizResults,
      }

      setSavedAttempt(attempt)
      setQuizFinished(true)

      // Trigger Mastery Engine and Adaptive Recommendation update
      if (user) {
        MasteryService.processQuizAttempt(attempt)
          .then(({ updatedMasteries: masteries }) => {
            setUpdatedMasteries(masteries)
            setRecentAttempts((prev) => [attempt, ...prev])
          })
          .catch((err) => console.warn('Mastery processing error:', err))
      }
    }
  }

  const selectedCourse = courses.find((c) => c.courseId === selectedCourseId)

  // -------------------------------------------------------------
  // RENDER: Active Quiz Taking Interface
  // -------------------------------------------------------------
  if (activeQuiz && !quizFinished) {
    const currentQ = activeQuiz.questions[currentQuestionIndex]
    const hasAnswered = evaluatedResult !== null

    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Quiz Header & Progress Bar */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              #{currentQuestionIndex + 1}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">{activeQuiz.topic}</h2>
                <Badge variant="indigo" size="sm">
                  {currentQ.difficulty.toUpperCase()}
                </Badge>
                <Badge variant="purple" size="sm">
                  {currentQ.type === 'mcq'
                    ? 'MCQ'
                    : currentQ.type === 'short_answer'
                    ? 'SHORT ANSWER'
                    : 'NUMERICAL'}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400">
                Question {currentQuestionIndex + 1} of {activeQuiz.questions.length} &bull; Verified
                Grounded Assessment
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (window.confirm('Quit current quiz? Unsaved progress will be lost.')) {
                setActiveQuiz(null)
              }
            }}
            className="text-xs text-slate-400 hover:text-rose-400"
          >
            Quit Quiz
          </Button>
        </div>

        {/* Progress Step Bar */}
        <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-300"
            style={{
              width: `${((currentQuestionIndex + (hasAnswered ? 1 : 0)) / activeQuiz.questions.length) * 100}%`,
            }}
          />
        </div>

        {/* Main Question Card */}
        <Card className="p-6 sm:p-8 space-y-6 bg-slate-900/90 border-slate-800/90 shadow-xl">
          <div className="space-y-3">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Source-Grounded Question
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
              {currentQ.question}
            </h3>
          </div>

          {/* Answering Form Depending on Question Type */}
          {!hasAnswered ? (
            <div className="space-y-4 pt-2">
              {/* 1. MCQ Options */}
              {currentQ.type === 'mcq' && currentQ.options && (
                <div className="space-y-2.5">
                  {currentQ.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedOption(opt)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-3 border ${
                        selectedOption === opt
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200 shadow-md'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 border ${
                          selectedOption === opt
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="leading-snug">{opt}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* 2. Short Answer Input */}
              {currentQ.type === 'short_answer' && (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={studentInput}
                    onChange={(e) => setStudentInput(e.target.value)}
                    placeholder="Type your explanation based on the course materials..."
                    className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Semantic AI evaluation will check for understanding of core course concepts.
                  </p>
                </div>
              )}

              {/* 3. Numerical Input */}
              {currentQ.type === 'numerical' && (
                <div className="space-y-2 max-w-sm">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={studentInput}
                      onChange={(e) => setStudentInput(e.target.value)}
                      placeholder="e.g. 42.5"
                      className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    {currentQ.unit && (
                      <span className="px-3 py-2.5 rounded-xl bg-slate-800/80 text-xs font-bold text-slate-300 border border-slate-700">
                        {currentQ.unit}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Tolerance ±{Math.round((currentQ.tolerance || 0.05) * 100)}% applied to numerical calculation.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4 flex justify-end">
                <Button
                  size="md"
                  variant="primary"
                  onClick={handleSubmitAnswer}
                  disabled={
                    isEvaluating ||
                    (currentQ.type === 'mcq' ? !selectedOption : !studentInput.trim())
                  }
                  leftIcon={isEvaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                >
                  {isEvaluating ? 'Evaluating with Groq...' : 'Submit Answer'}
                </Button>
              </div>
            </div>
          ) : (
            /* Evaluated Feedback & Wrong Answer Remediation */
            <div className="space-y-5 pt-2">
              {/* Feedback Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                  evaluatedResult.isCorrect
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                }`}
              >
                {evaluatedResult.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <h4 className="text-sm font-bold">
                    {evaluatedResult.isCorrect ? 'Correct Answer!' : 'Incorrect Response'}
                  </h4>
                  <p className="text-xs leading-relaxed">{evaluatedResult.feedback}</p>
                </div>
              </div>

              {/* Verified Source Citation */}
              {currentQ.source && (
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/20 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Grounded Course Source Citation
                    </span>
                    <div className="flex items-center gap-1">
                      {currentQ.source.pageNumber !== null && currentQ.source.pageNumber !== undefined && (
                        <Badge variant="emerald" size="sm" className="text-[10px]">
                          Page {currentQ.source.pageNumber}
                        </Badge>
                      )}
                      {currentQ.source.slideNumber !== null && currentQ.source.slideNumber !== undefined && (
                        <Badge variant="amber" size="sm" className="text-[10px]">
                          Slide {currentQ.source.slideNumber}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-slate-200">{currentQ.source.materialName}</p>
                  {currentQ.source.relevantText && (
                    <p className="text-[11px] text-slate-300 italic pl-2.5 border-l-2 border-emerald-500/60 leading-relaxed bg-slate-900/50 py-1 rounded-r">
                      &ldquo;{currentQ.source.relevantText}&rdquo;
                    </p>
                  )}
                </div>
              )}

              {/* Comprehensive Wrong Answer Breakdown */}
              {!evaluatedResult.isCorrect && evaluatedResult.wrongAnswerAnalysis && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-amber-500/30 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Grounded Remedy & Diagnostic Breakdown
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">
                        Correct Concept
                      </span>
                      <p className="text-slate-200">
                        {evaluatedResult.wrongAnswerAnalysis.correctConcept}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                      <span className="text-[10px] font-bold text-rose-400 uppercase">
                        Why Answer Was Incorrect
                      </span>
                      <p className="text-slate-300">
                        {evaluatedResult.wrongAnswerAnalysis.whyIncorrect}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase">
                      Simple Explanation
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      {evaluatedResult.wrongAnswerAnalysis.simpleExplanation}
                    </p>
                  </div>

                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] font-bold text-purple-400 uppercase">
                      Concrete Example
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      {evaluatedResult.wrongAnswerAnalysis.example}
                    </p>
                  </div>

                  {/* 3 Interactive Remedy Action Buttons */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Adaptive Remediation Actions
                    </span>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemedyAction('explain_simply')}
                        disabled={remedyActionLoading !== null}
                        className="text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                        leftIcon={
                          remedyActionLoading === 'explain_simply' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : undefined
                        }
                      >
                        Explain Simply
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemedyAction('give_example')}
                        disabled={remedyActionLoading !== null}
                        className="text-xs border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                        leftIcon={
                          remedyActionLoading === 'give_example' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : undefined
                        }
                      >
                        Give an Example
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemedyAction('ask_followup')}
                        disabled={remedyActionLoading !== null}
                        className="text-xs border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
                        leftIcon={
                          remedyActionLoading === 'ask_followup' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : undefined
                        }
                      >
                        Ask Me a Follow-up
                      </Button>
                    </div>

                    {/* Render Expanded AI Remedy Response */}
                    {remedyActionResponse && (
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 leading-relaxed animate-in fade-in duration-200">
                        <span className="text-[10px] font-bold text-emerald-400 block mb-1 uppercase">
                          MENTORA AI Tutor Remediation:
                        </span>
                        {remedyActionResponse.text}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Advance Button */}
              <div className="pt-3 flex justify-end">
                <Button
                  size="md"
                  variant="primary"
                  onClick={handleNextQuestion}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {currentQuestionIndex + 1 < activeQuiz.questions.length
                    ? 'Next Question'
                    : 'Finish & View Mastery Impact'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    )
  }

  // -------------------------------------------------------------
  // RENDER: Quiz Finished Mastery Impact & Results Screen
  // -------------------------------------------------------------
  if (activeQuiz && quizFinished && savedAttempt) {
    const isPassing = savedAttempt.accuracyPercentage >= 70

    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
        <Card className="p-8 text-center space-y-5 bg-gradient-to-b from-slate-900/90 to-slate-950 border-emerald-500/30 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border border-emerald-500/40 text-emerald-300 mx-auto flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="text-2xl font-black text-white">Quiz Completed!</h2>
            <p className="text-xs text-slate-400">
              Evaluated on {savedAttempt.totalQuestions} source-grounded questions in{' '}
              <strong className="text-slate-200">{savedAttempt.topic}</strong>.
            </p>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto py-2">
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Accuracy</span>
              <span
                className={`text-2xl font-black ${
                  isPassing ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {savedAttempt.accuracyPercentage}%
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Score</span>
              <span className="text-2xl font-black text-white">
                {savedAttempt.correctCount} / {savedAttempt.totalQuestions}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Time</span>
              <span className="text-2xl font-black text-slate-300">
                {savedAttempt.timeSpentSeconds}s
              </span>
            </div>
          </div>

          {/* Real Mastery Update Callout */}
          {updatedMasteries.length > 0 && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-left max-w-xl mx-auto space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  Topic Mastery Updated in Firestore
                </span>
                <Badge
                  variant={getMasteryStatus(updatedMasteries[0].masteryScore).color}
                  size="sm"
                >
                  {getMasteryStatus(updatedMasteries[0].masteryScore).label}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                <span>{updatedMasteries[0].topicName}</span>
                <span className="font-mono font-bold text-white">
                  {Math.round(updatedMasteries[0].masteryScore * 100)}%
                </span>
              </div>

              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                  style={{ width: `${Math.round(updatedMasteries[0].masteryScore * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="md"
              variant="outline"
              onClick={() => {
                setActiveQuiz(null)
                setQuizFinished(false)
              }}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Back to Quiz Hub
            </Button>

            <Button
              size="md"
              variant="primary"
              onClick={() => startQuiz(activeQuiz)}
              leftIcon={<Play className="w-4 h-4" />}
            >
              Retake Quiz
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // -------------------------------------------------------------
  // RENDER: Default Quizzes Hub (List, Generator & History)
  // -------------------------------------------------------------
  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">Adaptive Quizzes</h1>
            <Badge variant="emerald" size="sm">
              Source-Grounded
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Questions calibrated strictly to your course materials with page & slide citations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Course Selector */}
          {courses.length > 0 && (
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {courses.map((c) => (
                <option key={c.courseId} value={c.courseId}>
                  {c.title}
                </option>
              ))}
            </select>
          )}

          <Button
            size="md"
            variant="primary"
            onClick={() => setShowGenModal(true)}
            disabled={courseChunks.length === 0}
            leftIcon={<Sparkles className="w-4 h-4" />}
            className="shadow-lg shadow-emerald-950/30"
          >
            Generate Adaptive Quiz
          </Button>
        </div>
      </div>

      {/* No Materials Warning if course has zero chunks */}
      {courseChunks.length === 0 && !loading && (
        <Card className="p-6 bg-amber-500/10 border-amber-500/30 text-amber-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold">No Course Materials Uploaded Yet</h4>
              <p className="text-xs text-amber-300/90 mt-0.5">
                Upload PDFs or lecture slides for{' '}
                <strong>{selectedCourse?.title || 'this course'}</strong> in My Courses to allow
                Groq to generate grounded quizzes.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Section 1: Available Grounded Quizzes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            Available Quizzes ({savedQuizzes.length})
          </h2>
        </div>

        {savedQuizzes.length === 0 && !loading ? (
          <Card className="p-8 text-center space-y-3 bg-slate-900/40 border-dashed border-slate-800">
            <Award className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">No quizzes generated yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Click &ldquo;Generate Adaptive Quiz&rdquo; above to create a grounded assessment from your
              learning materials.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {savedQuizzes.map((quiz) => (
              <Card
                key={quiz.quizId}
                hover
                className="p-5 flex flex-col justify-between bg-slate-900/70 border-slate-800"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="indigo" size="sm">
                      {quiz.topic}
                    </Badge>
                    <Badge
                      variant={
                        quiz.difficulty === 'hard'
                          ? 'rose'
                          : quiz.difficulty === 'medium'
                          ? 'amber'
                          : 'emerald'
                      }
                      size="sm"
                    >
                      {quiz.difficulty.toUpperCase()}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white leading-snug">{quiz.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {quiz.questions.length} questions &bull; Grounded in course readings
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    {new Date(quiz.createdAt).toLocaleDateString()}
                  </span>

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => startQuiz(quiz)}
                    rightIcon={<Play className="w-3.5 h-3.5" />}
                  >
                    Start Quiz
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Recent Quiz Attempts History */}
      {recentAttempts.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            Recent Quiz Attempts ({recentAttempts.length})
          </h2>

          <div className="space-y-3">
            {recentAttempts.slice(0, 5).map((att) => (
              <Card
                key={att.attemptId}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50 border-slate-800/80"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      att.accuracyPercentage >= 70
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {att.accuracyPercentage}%
                  </div>

                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white">{att.topic}</h4>
                    <p className="text-[11px] text-slate-400">
                      {att.correctCount} of {att.totalQuestions} correct &bull; Completed in{' '}
                      {att.timeSpentSeconds}s &bull;{' '}
                      {new Date(att.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <Badge
                  variant={att.accuracyPercentage >= 70 ? 'emerald' : 'amber'}
                  size="sm"
                  className="self-start sm:self-auto"
                >
                  {att.accuracyPercentage >= 70 ? 'Mastery Reinforced' : 'Review Recommended'}
                </Badge>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal: Grounded Quiz Generator */}
      {/* ------------------------------------------------------------- */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 sm:p-7 bg-slate-900 border-slate-700/80 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Generate Adaptive Quiz</h3>
              </div>
              <button
                onClick={() => setShowGenModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                &times;
              </button>
            </div>

            {genError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{genError}</span>
              </div>
            )}

            <form onSubmit={handleGenerateQuiz} className="space-y-4">
              {/* Topic Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Target Topic or Concept
                </label>
                <input
                  type="text"
                  required
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder="e.g. Raft Consensus Algorithm, Backpropagation"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-500">
                  RAG will retrieve related excerpts from your {courseChunks.length} uploaded chunks.
                </p>
              </div>

              {/* Difficulty Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Difficulty Mode</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['adaptive', 'easy', 'medium', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setGenDifficulty(diff)}
                      className={`py-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                        genDifficulty === diff
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Number of Questions</label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 4, 6, 8].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setGenCount(count)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        genCount === count
                          ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {count} Questions
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Types Checkboxes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Question Types</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { key: 'mcq', label: 'MCQ' },
                      { key: 'short_answer', label: 'Short Answer' },
                      { key: 'numerical', label: 'Numerical' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => toggleType(t.key)}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                        genTypes.includes(t.key)
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit / Cancel */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setShowGenModal(false)}
                  disabled={isGenerating}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isGenerating || !genTopic.trim()}
                  leftIcon={
                    isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )
                  }
                >
                  {isGenerating ? 'Synthesizing with Groq...' : 'Generate Grounded Quiz'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

export default QuizzesPage
