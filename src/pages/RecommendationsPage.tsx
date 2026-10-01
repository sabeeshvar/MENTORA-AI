import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Compass,
  ArrowRight,
  RotateCcw,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { getUserRecommendations, getUserCourses } from '@/lib/supabase/db'
import { MasteryService } from '@/services/masteryService'
import type { PersonalizedRecommendation } from '@/types/mastery'
import type { Course } from '@/types/course'

export const RecommendationsPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [recs, userCourses] = await Promise.all([
        getUserRecommendations(user.uid),
        getUserCourses(user.uid),
      ])
      setRecommendations(recs)
      setCourses(userCourses)
    } catch (err) {
      console.warn('Error loading recommendations:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleRefreshRecommendations = async () => {
    if (!user) return
    setRefreshing(true)
    try {
      const updated = await MasteryService.generateRecommendations(user.uid, '')
      setRecommendations(updated)
    } catch (err) {
      console.warn('Failed to regenerate recommendations:', err)
    } finally {
      setRefreshing(false)
    }
  }

  const highPriority = recommendations.filter((r) => r.priority === 'high')
  const standardPriority = recommendations.filter((r) => r.priority !== 'high')

  const getCourseName = (courseId: string) => {
    const match = courses.find((c) => c.courseId === courseId)
    return match ? match.title : 'Course Study'
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">Personalized Recommendations</h1>
            <Badge variant="emerald" size="sm">
              Adaptive Learning Loop
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Data-driven learning prescriptions calibrated directly to your quiz accuracy and topic mastery.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleRefreshRecommendations}
          disabled={refreshing}
          leftIcon={<RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
        >
          {refreshing ? 'Analyzing Mastery...' : 'Refresh Insights'}
        </Button>
      </div>

      {/* Empty State */}
      {recommendations.length === 0 && !loading && (
        <Card className="p-12 text-center space-y-4 bg-slate-900/40 border-dashed border-slate-800">
          <Compass className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-200">
              No recommendations generated yet
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complete a few learning activities or take a quiz, and MENTORA AI will diagnose your
              strengths and weaknesses to prescribe targeted study actions.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate('/quiz')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Start an Adaptive Quiz
          </Button>
        </Card>
      )}

      {/* Section 1: Urgent / High Yield Remedies */}
      {highPriority.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-rose-300">
              High-Yield Priority Interventions ({highPriority.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {highPriority.map((rec) => (
              <Card
                key={rec.recommendationId}
                className="p-5 bg-slate-900/80 border-rose-500/30 flex flex-col justify-between space-y-4 shadow-lg shadow-rose-950/20"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="rose" size="sm">
                      {rec.type}
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {getCourseName(rec.courseId)}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                    {rec.title}
                  </h3>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                    <strong className="text-rose-300 block mb-0.5">Learner Data Diagnostic:</strong>
                    {rec.reason}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    ~{rec.estimatedMinutes || 5} min investment
                  </span>

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
                    {rec.actionLabel || 'Follow Prescription'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Standard Recommendations (Practice, Advance) */}
      {standardPriority.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Personalized Practice & Advancement ({standardPriority.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {standardPriority.map((rec) => (
              <Card
                key={rec.recommendationId}
                className="p-5 bg-slate-900/60 border-slate-800 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant={
                        rec.type === 'ADVANCE'
                          ? 'emerald'
                          : rec.type === 'PRACTICE'
                          ? 'amber'
                          : 'indigo'
                      }
                      size="sm"
                    >
                      {rec.type}
                    </Badge>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {getCourseName(rec.courseId)}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                    {rec.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed">{rec.reason}</p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    ~{rec.estimatedMinutes || 8} min
                  </span>

                  <Button
                    size="sm"
                    variant="outline"
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
                    {rec.actionLabel || 'Start'}
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

export default RecommendationsPage
