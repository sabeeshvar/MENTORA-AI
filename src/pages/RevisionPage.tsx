import React, { useState, useEffect } from 'react'
import {
  RotateCcw,
  Sparkles,
  Award,
  CheckCircle2,
  Play,
  ArrowRight,
  Loader2,
  X,
  Send,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/context/LanguageContext'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import {
  getUserCourses,
  getUserTopicMasteries,
  getUserRevisionItems,
} from '@/lib/supabase/db'
import { RevisionService } from '@/services/revisionService'
import type { Course } from '@/types/course'
import type { TopicMastery } from '@/types/mastery'
import type { RevisionItem, RevisionRecap } from '@/types/revision'
import type { QuestionAnswerResult } from '@/types/quiz'

export const RevisionPage: React.FC = () => {
  const { user } = useAuth()
  const { t, language } = useTranslation()

  // State
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [revisionItems, setRevisionItems] = useState<RevisionItem[]>([])
  const [loading, setLoading] = useState(true)

  // Active Revision Session Modal
  const [activeTopic, setActiveTopic] = useState<RevisionItem | null>(null)
  const [sessionRecap, setSessionRecap] = useState<RevisionRecap | null>(null)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [sessionStep, setSessionStep] = useState<'recap' | 'quiz' | 'summary'>('recap')

  // Quiz Taking State inside Revision Modal
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null)
  const [inputAnswer, setInputAnswer] = useState('')
  const [quizResults, setQuizResults] = useState<QuestionAnswerResult[]>([])
  const [submittingQuiz, setSubmittingQuiz] = useState(false)
  const [newMasteryScore, setNewMasteryScore] = useState<number | null>(null)

  // 1. Load Courses and Topic Masteries
  useEffect(() => {
    if (!user) return
    setLoading(true)

    Promise.all([getUserCourses(user.uid), getUserTopicMasteries(user.uid)])
      .then(async ([cList, mList]) => {
        setCourses(cList)
        if (cList.length > 0) {
          const initCourseId = cList[0].courseId
          setSelectedCourseId(initCourseId)
          await loadRevisions(user.uid, initCourseId, mList)
        }
      })
      .catch((err) => console.warn('Error loading revision items:', err))
      .finally(() => setLoading(false))
  }, [user])

  // Helper to load or synthesize revision items from masteries
  const loadRevisions = async (uid: string, courseId: string, masteries: TopicMastery[]) => {
    const existing = await getUserRevisionItems(uid, courseId)
    if (existing.length > 0) {
      setRevisionItems(existing)
      return
    }

    // Synthesize initial revision items from masteries if not initialized
    const synthesized: RevisionItem[] = masteries
      .filter((m) => !m.courseId || m.courseId === courseId)
      .map((m) => {
        const pct = Math.round(m.masteryScore * 100)
        let status: RevisionItem['status'] = 'due_today'
        if (pct < 40) status = 'revise_now'
        else if (pct >= 85) status = 'mastered'

        return {
          topicId: m.topicId,
          topicName: m.topicName,
          courseId,
          userId: uid,
          masteryScore: m.masteryScore,
          lastStudiedAt: m.lastAttemptAt || new Date().toISOString(),
          lastQuizScore: pct,
          nextRevisionDue: new Date().toISOString(),
          attempts: m.attempts,
          revisionCount: 1,
          intervalDays: pct >= 85 ? 14 : pct >= 50 ? 3 : 1,
          status,
          weakAreas: m.incorrectAnswers > 0 ? [`Review errors in ${m.topicName}`] : [],
        }
      })

    setRevisionItems(synthesized)
  }

  // Handle Start Revision Click
  const handleStartRevision = async (item: RevisionItem) => {
    setActiveTopic(item)
    setSessionStep('recap')
    setSessionLoading(true)
    setCurrentQIndex(0)
    setSelectedOpt(null)
    setInputAnswer('')
    setQuizResults([])
    setNewMasteryScore(null)

    try {
      const recap = await RevisionService.getRevisionSession({
        courseId: selectedCourseId,
        topicId: item.topicId,
        topicName: item.topicName,
        preferredLanguage: language,
      })
      setSessionRecap(recap)
    } finally {
      setSessionLoading(false)
    }
  }

  // Submit Answer in Revision Quiz
  const handleQuizAnswerSubmit = () => {
    if (!sessionRecap) return
    const curQ = sessionRecap.quizQuestions[currentQIndex]
    if (!curQ) return

    const studentAns = curQ.type === 'mcq' ? selectedOpt || '' : inputAnswer.trim()
    if (!studentAns) return

    const isCorrect =
      curQ.type === 'mcq'
        ? studentAns.toLowerCase() === curQ.correctAnswer.toLowerCase()
        : studentAns.toLowerCase() === curQ.correctAnswer.toLowerCase() ||
          curQ.correctAnswer.toLowerCase().includes(studentAns.toLowerCase())

    const result: QuestionAnswerResult = {
      questionId: curQ.questionId,
      studentAnswer: studentAns,
      correctAnswer: curQ.correctAnswer,
      isCorrect,
      score: isCorrect ? 1.0 : 0.0,
      feedback: isCorrect ? 'Correct! Well done.' : 'Review concept recap.',
      explanation: curQ.explanation,
      source: curQ.source,
    }

    const updatedResults = [...quizResults, result]
    setQuizResults(updatedResults)
    setSelectedOpt(null)
    setInputAnswer('')

    if (currentQIndex + 1 < sessionRecap.quizQuestions.length) {
      setCurrentQIndex(currentQIndex + 1)
    } else {
      // Final question answered: submit whole quiz
      finalizeRevisionSession(updatedResults)
    }
  }

  // Finalize revision session and update mastery + spaced repetition schedule
  const finalizeRevisionSession = async (results: QuestionAnswerResult[]) => {
    if (!user || !activeTopic) return
    setSubmittingQuiz(true)

    try {
      const { updatedItem, newMastery } = await RevisionService.submitRevisionQuiz({
        userId: user.uid,
        courseId: selectedCourseId,
        topicId: activeTopic.topicId,
        topicName: activeTopic.topicName,
        results,
      })

      setNewMasteryScore(newMastery)
      setRevisionItems((prev) =>
        prev.map((i) => (i.topicId === updatedItem.topicId ? updatedItem : i))
      )
      setSessionStep('summary')
    } finally {
      setSubmittingQuiz(false)
    }
  }

  const { reviseNow, dueToday, upcoming, mastered } =
    RevisionService.groupRevisionItems(revisionItems)


  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {t('revision.title')}
            </h1>
            <Badge variant="amber" size="sm">
              Spaced Repetition
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            {t('revision.subtitle')}
          </p>
        </div>

        {/* Course selector */}
        {courses.length > 0 && (
          <select
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value)
              loadRevisions(user?.uid || '', e.target.value, [])
            }}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500 self-start md:self-auto"
          >
            {courses.map((c) => (
              <option key={c.courseId} value={c.courseId}>
                {c.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-xs text-slate-400">{t('common.loading')}</p>
        </div>
      ) : revisionItems.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/40 border-dashed border-slate-800 space-y-4 max-w-lg mx-auto">
          <RotateCcw className="w-12 h-12 text-slate-600 mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-white">No Revision Items Due</h3>
            <p className="text-xs text-slate-400 mt-1">
              Complete quizzes or study course materials to automatically schedule spaced-repetition
              reviews.
            </p>
          </div>
        </Card>
      ) : (
        /* 4 Revision Buckets */
        <div className="space-y-8">
          {/* Bucket 1: Revise Now */}
          {reviseNow.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <h3 className="text-sm font-black text-rose-300 uppercase tracking-wider">
                  {t('revision.reviseNow')} ({reviseNow.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reviseNow.map((item) => (
                  <RevisionCard
                    key={item.topicId}
                    item={item}
                    badgeVariant="rose"
                    onStart={() => handleStartRevision(item)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Bucket 2: Due Today */}
          {dueToday.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                  {t('revision.dueToday')} ({dueToday.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dueToday.map((item) => (
                  <RevisionCard
                    key={item.topicId}
                    item={item}
                    badgeVariant="amber"
                    onStart={() => handleStartRevision(item)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Bucket 3: Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <h3 className="text-sm font-black text-cyan-300 uppercase tracking-wider">
                  {t('revision.upcoming')} ({upcoming.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcoming.map((item) => (
                  <RevisionCard
                    key={item.topicId}
                    item={item}
                    badgeVariant="indigo"
                    onStart={() => handleStartRevision(item)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Bucket 4: Strong / Recently Mastered */}
          {mastered.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h3 className="text-sm font-black text-emerald-300 uppercase tracking-wider">
                  {t('revision.mastered')} ({mastered.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mastered.map((item) => (
                  <RevisionCard
                    key={item.topicId}
                    item={item}
                    badgeVariant="emerald"
                    onStart={() => handleStartRevision(item)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Guided Revision Modal */}
      {activeTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#0D1322] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{activeTopic.topicName}</h3>
                  <p className="text-xs text-slate-400">
                    {sessionStep === 'recap'
                      ? 'Step 1: Grounded Concept Recap'
                      : sessionStep === 'quiz'
                      ? `Step 2: Diagnostic Revision Quiz (${currentQIndex + 1}/${
                          sessionRecap?.quizQuestions.length || 5
                        })`
                      : 'Step 3: Mastery Updated'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTopic(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {sessionLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                <p className="text-xs text-slate-400">Synthesizing grounded revision recap...</p>
              </div>
            ) : sessionStep === 'recap' && sessionRecap ? (
              /* Step 1: Concept Recap & Key Points */
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('revision.recap')}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {sessionRecap.summary}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t('revision.keyPoints')}
                  </h4>
                  <ul className="space-y-1.5">
                    {sessionRecap.keyPoints.map((pt, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-300 flex items-start gap-2 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Previous Mistakes & Misconceptions */}
                {sessionRecap.previousMistakes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                      {t('revision.mistakes')}
                    </h4>
                    {sessionRecap.previousMistakes.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1.5"
                      >
                        <p className="font-semibold text-rose-300">Question: {m.question}</p>
                        <p className="text-rose-200/80">
                          <strong>Common Misconception:</strong> {m.misconception}
                        </p>
                        <p className="text-emerald-300 font-medium">
                          <strong>Correction:</strong> {m.groundedCorrection}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={() => setSessionStep('quiz')}
                    className="text-xs bg-gradient-to-r from-amber-500 to-teal-500 font-semibold"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Proceed to 5-Question Quiz
                  </Button>
                </div>
              </div>
            ) : sessionStep === 'quiz' && sessionRecap ? (
              /* Step 2: 5-Question Revision Quiz */
              <div className="space-y-6">
                {(() => {
                  const q = sessionRecap.quizQuestions[currentQIndex]
                  if (!q) return null

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>
                          Question {currentQIndex + 1} of {sessionRecap.quizQuestions.length}
                        </span>
                        <Badge variant="indigo" size="sm">
                          {q.type.toUpperCase()}
                        </Badge>
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-white leading-relaxed">
                        {q.question}
                      </h4>

                      {/* Options if MCQ */}
                      {q.type === 'mcq' && q.options && (
                        <div className="space-y-2">
                          {q.options.map((opt, optIdx) => (
                            <button
                              key={`opt_${optIdx}`}
                              onClick={() => setSelectedOpt(opt)}
                              className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all ${
                                selectedOpt === opt
                                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 font-semibold'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Text input if Short Answer or Numerical */}
                      {q.type !== 'mcq' && (
                        <div>
                          <input
                            type="text"
                            value={inputAnswer}
                            onChange={(e) => setInputAnswer(e.target.value)}
                            placeholder="Type your answer here..."
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      )}

                      <div className="pt-4 border-t border-slate-800 flex justify-end">
                        <Button
                          variant="primary"
                          disabled={submittingQuiz || (q.type === 'mcq' ? !selectedOpt : !inputAnswer.trim())}
                          onClick={handleQuizAnswerSubmit}
                          className="text-xs bg-amber-600 hover:bg-amber-500 font-semibold"
                          rightIcon={submittingQuiz ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        >
                          {submittingQuiz ? 'Evaluating...' : 'Submit Answer'}
                        </Button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            ) : (
              /* Step 3: Session Complete Summary */
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <Award className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Revision Session Complete!</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Your answers were evaluated and your spaced-repetition review interval has been
                    updated.
                  </p>
                </div>

                {newMasteryScore !== null && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 max-w-xs mx-auto">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Updated Topic Mastery
                    </span>
                    <span className="text-2xl font-black text-emerald-400">
                      {Math.round(newMasteryScore * 100)}%
                    </span>
                  </div>
                )}

                <Button
                  variant="primary"
                  onClick={() => setActiveTopic(null)}
                  className="text-xs bg-emerald-600 hover:bg-emerald-500 font-semibold mt-4"
                >
                  Return to Revision Dashboard
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface RevisionCardProps {
  item: RevisionItem
  badgeVariant: 'rose' | 'amber' | 'indigo' | 'emerald'
  onStart: () => void
}

const RevisionCard: React.FC<RevisionCardProps> = ({ item, badgeVariant, onStart }) => {
  const pct = Math.round(item.masteryScore * 100)

  return (
    <Card className="p-5 bg-slate-900/60 border-slate-800/80 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all">
      <div>
        <div className="flex items-center justify-between mb-2">
          <Badge variant={badgeVariant} size="sm">
            Mastery: {pct}%
          </Badge>
          <span className="text-[10px] text-slate-500">Interval: {item.intervalDays}d</span>
        </div>

        <h4 className="text-sm font-bold text-white line-clamp-1 mb-2">{item.topicName}</h4>

        <div className="space-y-1 text-[11px] text-slate-400 mb-4">
          <div className="flex justify-between">
            <span>Last studied:</span>
            <span className="text-slate-300">
              {new Date(item.lastStudiedAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Next review:</span>
            <span className="text-amber-400 font-semibold">
              {new Date(item.nextRevisionDue).toLocaleDateString()}
            </span>
          </div>
          {item.lastQuizScore !== undefined && (
            <div className="flex justify-between">
              <span>Last quiz:</span>
              <span className="text-slate-300">{item.lastQuizScore}%</span>
            </div>
          )}
        </div>
      </div>

      <Button
        variant="primary"
        size="sm"
        onClick={onStart}
        className="w-full text-xs font-semibold bg-gradient-to-r from-amber-500 to-teal-500 hover:from-amber-600 shadow-sm"
        leftIcon={<Play className="w-3.5 h-3.5" />}
      >
        Start Revision
      </Button>
    </Card>
  )
}

export default RevisionPage
