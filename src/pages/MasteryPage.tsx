import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Compass,
  BookOpen,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import {
  getUserTopicMasteries,
  getUserQuizAttempts,
  getUserRecommendations,
} from '@/lib/supabase/db'
import { getMasteryStatus, type TopicMastery, type PersonalizedRecommendation } from '@/types/mastery'
import type { QuizAttempt } from '@/types/quiz'

export const MasteryPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [masteries, setMasteries] = useState<TopicMastery[]>([])
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)

    Promise.all([
      getUserTopicMasteries(user.uid),
      getUserQuizAttempts(user.uid),
      getUserRecommendations(user.uid),
    ])
      .then(([mats, atts, recs]) => {
        setMasteries(mats)
        setAttempts(atts)
        setRecommendations(recs)
      })
      .catch((err) => console.warn('Failed to load progress analytics:', err))
      .finally(() => setLoading(false))
  }, [user])

  // Real Metric Aggregations from Supabase Data
  const totalQuizzes = attempts.length
  const totalQuestionsAttempted = attempts.reduce((acc, a) => acc + (a.totalQuestions || 0), 0)
  const totalCorrect = attempts.reduce((acc, a) => acc + (a.correctCount || 0), 0)
  const totalIncorrect = totalQuestionsAttempted - totalCorrect
  const overallAccuracy =
    totalQuestionsAttempted > 0 ? Math.round((totalCorrect / totalQuestionsAttempted) * 100) : 0

  const overallMasteryPct =
    masteries.length > 0
      ? Math.round(
          (masteries.reduce((acc, m) => acc + m.masteryScore, 0) / masteries.length) * 100
        )
      : 0

  const weakTopics = masteries.filter((m) => Math.round(m.masteryScore * 100) < 40)


  // Empty State if no quiz data exists yet
  if (!loading && totalQuizzes === 0 && masteries.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <div>
          <h1 className="text-2xl font-black text-white">Learning Progress & Mastery</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time analytics diagnosing conceptual gaps and tracking topic proficiency.
          </p>
        </div>

        <Card className="p-12 text-center space-y-5 bg-slate-900/40 border-dashed border-slate-800">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <TrendingUp className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-white">No Mastery Data Yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complete your first quiz to begin tracking topic-level mastery. As you answer questions,
              MENTORA AI will calculate real accuracy curves and prescribe high-yield study actions.
            </p>
          </div>

          <Button
            size="md"
            variant="primary"
            onClick={() => navigate('/quiz')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Take Your First Quiz
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">Learning Progress & Mastery</h1>
            <Badge variant="emerald" size="sm">
              Real-time Analytics
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Grounded metrics calculated from your real quiz attempts and learning sessions.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/quiz')}
          leftIcon={<Sparkles className="w-4 h-4" />}
        >
          Take Adaptive Quiz
        </Button>
      </div>

      {/* Top 4 KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Overall Mastery */}
        <Card className="p-5 flex items-center gap-4 bg-slate-900/70 border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Overall Mastery
            </p>
            <h3 className="text-2xl font-black text-white">{overallMasteryPct}%</h3>
            <p className="text-[10px] text-emerald-400 font-semibold">
              {masteries.length} topics tracked
            </p>
          </div>
        </Card>

        {/* 2. Questions Attempted */}
        <Card className="p-5 flex items-center gap-4 bg-slate-900/70 border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Questions Attempted
            </p>
            <h3 className="text-2xl font-black text-white">{totalQuestionsAttempted}</h3>
            <p className="text-[10px] text-teal-400 font-semibold">
              {totalCorrect} correct &bull; {totalIncorrect} incorrect
            </p>
          </div>
        </Card>

        {/* 3. Overall Accuracy */}
        <Card className="p-5 flex items-center gap-4 bg-slate-900/70 border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Average Accuracy
            </p>
            <h3 className="text-2xl font-black text-white">{overallAccuracy}%</h3>
            <p className="text-[10px] text-cyan-400 font-semibold">
              Across {totalQuizzes} completed quizzes
            </p>
          </div>
        </Card>

        {/* 4. Weak Topics Alert */}
        <Card className="p-5 flex items-center gap-4 bg-slate-900/70 border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Diagnosed Weak Spots
            </p>
            <h3 className="text-2xl font-black text-white">{weakTopics.length} Topics</h3>
            <p className="text-[10px] text-rose-400 font-semibold">
              {weakTopics.length > 0 ? 'Remedies recommended' : 'All topics stable'}
            </p>
          </div>
        </Card>
      </div>

      {/* Section: Accuracy Trend Over Recent Quizzes */}
      {attempts.length > 0 && (
        <Card className="p-6 bg-slate-900/70 border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Quiz Performance Trend (Recent Attempts)
            </h3>
            <span className="text-[11px] text-slate-400">
              Showing last {Math.min(attempts.length, 8)} quizzes
            </span>
          </div>

          {/* Responsive Visual Bar Chart */}
          <div className="h-44 flex items-end gap-3 pt-6 border-b border-slate-800 pb-2">
            {attempts
              .slice(0, 8)
              .reverse()
              .map((att, idx) => {
                const heightPct = Math.max(att.accuracyPercentage, 8)
                const isGood = att.accuracyPercentage >= 70

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {att.accuracyPercentage}%
                    </span>
                    <div
                      className={`w-full max-w-[48px] rounded-t-lg transition-all duration-300 ${
                        isGood
                          ? 'bg-gradient-to-t from-emerald-600 to-teal-400 group-hover:from-emerald-500 group-hover:to-teal-300'
                          : 'bg-gradient-to-t from-amber-600 to-rose-400 group-hover:from-amber-500 group-hover:to-rose-300'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[10px] text-slate-400 truncate w-full text-center">
                      Q{idx + 1}
                    </span>
                  </div>
                )
              })}
          </div>
        </Card>
      )}

      {/* Section: Topic-Level Mastery Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            Topic Mastery Breakdown ({masteries.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {masteries.map((m) => {
            const status = getMasteryStatus(m.masteryScore)
            const pct = Math.round(m.masteryScore * 100)

            return (
              <Card key={m.topicId} className="p-5 bg-slate-900/70 border-slate-800 space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-white leading-snug">{m.topicName}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {m.attempts} question attempts &bull; {m.correctAnswers} correct &bull;{' '}
                      {m.incorrectAnswers} errors
                    </p>
                  </div>

                  <Badge variant={status.color} size="sm">
                    {status.label}
                  </Badge>
                </div>

                {/* Mastery Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400 font-mono">
                    <span>Proficiency</span>
                    <span className="font-bold text-white">{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        pct >= 85
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : pct >= 70
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-400'
                          : pct >= 40
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                          : 'bg-gradient-to-r from-rose-500 to-orange-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Quick Action Button */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    Last active: {new Date(m.lastAttemptAt).toLocaleDateString()}
                  </span>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      navigate(
                        `/quiz?courseId=${m.courseId}&topic=${encodeURIComponent(m.topicName)}`
                      )
                    }
                    className="text-xs"
                    rightIcon={<ArrowRight className="w-3 h-3" />}
                  >
                    Targeted Quiz
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Section: Grounded Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              Active Personalized Recommendations ({recommendations.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec) => (
              <Card
                key={rec.recommendationId}
                className="p-5 bg-slate-900/60 border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant={
                        rec.type === 'REVISION'
                          ? 'rose'
                          : rec.type === 'QUIZ'
                          ? 'purple'
                          : rec.type === 'PRACTICE'
                          ? 'amber'
                          : 'emerald'
                      }
                      size="sm"
                    >
                      {rec.type}
                    </Badge>

                    {rec.estimatedMinutes && (
                      <span className="text-[10px] text-slate-500">
                        ~{rec.estimatedMinutes} mins
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white leading-snug">{rec.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{rec.reason}</p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex justify-end">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      if (rec.type === 'REVISION') {
                        navigate(
                          `/tutor?courseId=${rec.courseId}&topic=${encodeURIComponent(rec.title)}`
                        )
                      } else {
                        navigate(`/quiz?courseId=${rec.courseId}`)
                      }
                    }}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    {rec.actionLabel || 'Begin'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MasteryPage
