import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Flame,
  Award,
  BookOpen,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Play,
  Compass,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import {
  getUserCourses,
  getUserTopicMasteries,
  getUserQuizAttempts,
  getUserRecommendations,
} from '@/lib/firebase/firestore'
import type { TopicMastery, PersonalizedRecommendation } from '@/types/mastery'
import type { Course } from '@/types/course'
import type { QuizAttempt } from '@/types/quiz'

export const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  // DEMO MODE Toggle for Hackathon Judges
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Real Data States from Firebase
  const [realCourses, setRealCourses] = useState<Course[]>([])
  const [realMasteries, setRealMasteries] = useState<TopicMastery[]>([])
  const [realAttempts, setRealAttempts] = useState<QuizAttempt[]>([])
  const [realRecs, setRealRecs] = useState<PersonalizedRecommendation[]>([])
  const [_loading, setLoading] = useState(true)

  // Load Real Firebase Data on Mount
  useEffect(() => {
    if (!user) return
    setLoading(true)

    Promise.all([
      getUserCourses(user.uid),
      getUserTopicMasteries(user.uid),
      getUserQuizAttempts(user.uid),
      getUserRecommendations(user.uid),
    ])
      .then(([courses, masteries, attempts, recs]) => {
        setRealCourses(courses)
        setRealMasteries(masteries)
        setRealAttempts(attempts)
        setRealRecs(recs)
      })
      .catch((err) => console.warn('Dashboard data fetch error:', err))
      .finally(() => setLoading(false))
  }, [user])

  // Realistic Pre-computed Demo Dataset (Clearly labelled as DEMO DATA)
  const demoCourses: Course[] = [
    {
      courseId: 'demo_cs452',
      ownerId: 'demo',
      title: 'CS 452: Distributed Systems & Consensus',
      description: 'Distributed consensus algorithms, Paxos, Raft, and replication models.',
      subject: 'Computer Science',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      materialsCount: 3,
    },
    {
      courseId: 'demo_cs501',
      ownerId: 'demo',
      title: 'CS 501: Deep Learning Architectures',
      description: 'Neural backpropagation, convolutional layers, and self-attention transformers.',
      subject: 'Artificial Intelligence',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      materialsCount: 2,
    },
  ]

  const demoMasteries: TopicMastery[] = [
    {
      topicId: 'raft_compaction',
      courseId: 'demo_cs452',
      userId: 'demo',
      topicName: 'Raft Log Compaction & Snapshotting',
      masteryScore: 0.38,
      attempts: 8,
      correctAnswers: 3,
      incorrectAnswers: 5,
      lastAttemptAt: new Date().toISOString(),
      difficultyLevel: 'medium',
      trend: 'down',
      updatedAt: new Date().toISOString(),
    },
    {
      topicId: 'backprop_calculus',
      courseId: 'demo_cs501',
      userId: 'demo',
      topicName: 'Backpropagation Chain Rule Derivatives',
      masteryScore: 0.76,
      attempts: 12,
      correctAnswers: 9,
      incorrectAnswers: 3,
      lastAttemptAt: new Date().toISOString(),
      difficultyLevel: 'medium',
      trend: 'up',
      updatedAt: new Date().toISOString(),
    },
    {
      topicId: 'bplus_trees',
      courseId: 'demo_cs452',
      userId: 'demo',
      topicName: 'Two-Phase Locking & Serializable Isolation',
      masteryScore: 0.88,
      attempts: 10,
      correctAnswers: 9,
      incorrectAnswers: 1,
      lastAttemptAt: new Date().toISOString(),
      difficultyLevel: 'hard',
      trend: 'up',
      updatedAt: new Date().toISOString(),
    },
  ]

  const demoRecommendations: PersonalizedRecommendation[] = [
    {
      recommendationId: 'demo_rec_1',
      userId: 'demo',
      courseId: 'demo_cs452',
      topicId: 'raft_compaction',
      type: 'REVISION',
      title: "Review Raft Log Compaction & Snapshotting",
      reason: "Your mastery is 38% and your last two quiz attempts contained errors on snapshotting states.",
      priority: 'high',
      estimatedMinutes: 6,
      actionLabel: 'Ask Tutor',
      createdAt: new Date().toISOString(),
    },
    {
      recommendationId: 'demo_rec_2',
      userId: 'demo',
      courseId: 'demo_cs452',
      topicId: 'raft_compaction',
      type: 'QUIZ',
      title: "Targeted Diagnostic Quiz on Consensus",
      reason: "Take a 4-question adaptive quiz to repair conceptual gaps before advancing.",
      priority: 'high',
      estimatedMinutes: 5,
      actionLabel: 'Start Quiz',
      createdAt: new Date().toISOString(),
    },
  ]

  // Active Dataset based on Demo Toggle
  const courses = isDemoMode ? demoCourses : realCourses
  const masteries = isDemoMode ? demoMasteries : realMasteries
  const recommendations = isDemoMode ? demoRecommendations : realRecs
  const attempts = isDemoMode ? [] : realAttempts

  // Computed Real Metrics
  const totalQuestionsAttempted = isDemoMode
    ? 30
    : attempts.reduce((acc, a) => acc + (a.totalQuestions || 0), 0)
  const totalCorrect = isDemoMode
    ? 21
    : attempts.reduce((acc, a) => acc + (a.correctCount || 0), 0)
  const quizAccuracyPct =
    totalQuestionsAttempted > 0 ? Math.round((totalCorrect / totalQuestionsAttempted) * 100) : 0

  const overallMasteryPct =
    masteries.length > 0
      ? Math.round(
          (masteries.reduce((acc, m) => acc + m.masteryScore, 0) / masteries.length) * 100
        )
      : 0

  const weakTopics = masteries.filter((m) => Math.round(m.masteryScore * 100) < 40)
  const strongTopics = masteries.filter((m) => Math.round(m.masteryScore * 100) >= 85)

  const currentCourse = courses.length > 0 ? courses[0] : null

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header with Welcome & Hackathon DEMO MODE Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-emerald-950/40 border border-emerald-500/20 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Source-Grounded AI Learning Companion
            </span>
            {isDemoMode && (
              <Badge variant="amber" size="sm">
                DEMO MODE ACTIVE
              </Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome back,{' '}
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
              {user?.name || user?.displayName || 'Learner'}
            </span>
            !
          </h1>

          <p className="text-xs sm:text-sm text-slate-300">
            {isDemoMode
              ? 'Showing clearly labelled demo walkthrough data for hackathon judges.'
              : 'Grounded in your real uploaded materials and live Firebase mastery history.'}
          </p>
        </div>

        {/* Demo Mode Toggle for Judges */}
        <div className="flex items-center gap-3 bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800 self-start sm:self-auto">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Judge Demo</span>
            <span className="text-xs font-bold text-emerald-400">
              {isDemoMode ? 'Demo Mode [ON]' : 'Real Data [LIVE]'}
            </span>
          </div>
          <button
            onClick={() => setIsDemoMode(!isDemoMode)}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              isDemoMode ? 'bg-emerald-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                isDemoMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards: Real Firebase Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Mastery */}
        <Card className="p-5 flex items-center gap-4 bg-slate-900/70 border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Overall Mastery
              </span>
              {isDemoMode && <Badge variant="amber" size="sm" className="text-[8px] py-0 px-1">DEMO</Badge>}
            </div>
            <h3 className="text-2xl font-black text-white">{overallMasteryPct}%</h3>
            <p className="text-[10px] text-emerald-400 font-semibold">
              {masteries.length > 0 ? `${masteries.length} topics tracked` : 'No quiz data yet'}
            </p>
          </div>
        </Card>

        {/* Questions Attempted */}
        <Card className="p-5 flex items-center gap-4 bg-slate-900/70 border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Questions Attempted
              </span>
              {isDemoMode && <Badge variant="amber" size="sm" className="text-[8px] py-0 px-1">DEMO</Badge>}
            </div>
            <h3 className="text-2xl font-black text-white">{totalQuestionsAttempted}</h3>
            <p className="text-[10px] text-teal-400 font-semibold">
              {totalCorrect} correct answers
            </p>
          </div>
        </Card>

        {/* Quiz Accuracy */}
        <Card className="p-5 flex items-center gap-4 bg-slate-900/70 border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Quiz Accuracy
              </span>
              {isDemoMode && <Badge variant="amber" size="sm" className="text-[8px] py-0 px-1">DEMO</Badge>}
            </div>
            <h3 className="text-2xl font-black text-white">{quizAccuracyPct}%</h3>
            <p className="text-[10px] text-cyan-400 font-semibold">
              {attempts.length > 0 || isDemoMode ? 'Adaptive evaluations' : 'Unattempted'}
            </p>
          </div>
        </Card>

        {/* Learning Streak */}
        <Card className="p-5 flex items-center gap-4 bg-slate-900/70 border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Learning Streak
            </span>
            <h3 className="text-2xl font-black text-white">
              {user?.learningStats?.streakDays || 1} Days
            </h3>
            <p className="text-[10px] text-amber-400 font-semibold">Active study companion</p>
          </div>
        </Card>
      </div>

      {/* 3. Continue Learning / Current Course Banner */}
      {currentCourse ? (
        <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Active Learning Course
                </span>
                {isDemoMode && <Badge variant="amber" size="sm">DEMO COURSE</Badge>}
              </div>
              <h3 className="text-lg font-bold text-white">{currentCourse.title}</h3>
              <p className="text-xs text-slate-400 max-w-xl">{currentCourse.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="md"
                variant="outline"
                onClick={() => navigate(`/courses/${currentCourse.courseId}`)}
                leftIcon={<BookOpen className="w-4 h-4" />}
              >
                Course Details
              </Button>
              <Button
                size="md"
                variant="primary"
                onClick={() => navigate(`/tutor?courseId=${currentCourse.courseId}`)}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Ask AI Tutor
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* Meaningful Empty State for Courses */
        <Card className="p-8 text-center space-y-3 bg-slate-900/40 border-dashed border-slate-800">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">
            Create your first course to start learning with MENTORA
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Upload a PDF, presentation or lecture video to build your source-grounded knowledge base.
          </p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate('/courses')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Create Course
          </Button>
        </Card>
      )}

      {/* 4. Two-Column Layout: Weak/Strong Topics & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Weak & Strong Topics */}
        <div className="space-y-6">
          {/* Weak Topics Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Diagnosed Weak Topics ({weakTopics.length})
              </h3>
              {isDemoMode && <Badge variant="amber" size="sm">DEMO DATA</Badge>}
            </div>

            {weakTopics.length > 0 ? (
              <div className="space-y-3">
                {weakTopics.map((topic) => (
                  <Card
                    key={topic.topicId}
                    className="p-4 bg-slate-900/70 border-rose-500/20 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-white">{topic.topicName}</h4>
                      <Badge variant="rose" size="sm">
                        {Math.round(topic.masteryScore * 100)}% Mastery
                      </Badge>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      {topic.incorrectAnswers} incorrect answers out of {topic.attempts} attempts.
                    </p>

                    <div className="pt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          navigate(
                            `/quiz?courseId=${topic.courseId}&topic=${encodeURIComponent(
                              topic.topicName
                            )}`
                          )
                        }
                        className="text-xs border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                        rightIcon={<Play className="w-3 h-3" />}
                      >
                        Targeted Remediation Quiz
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center text-xs text-slate-500 bg-slate-900/30 border-slate-800">
                {masteries.length === 0
                  ? 'Complete your first quiz to start building your mastery profile and detect weak spots.'
                  : 'No weak spots detected! All active topics are developing or mastered.'}
              </Card>
            )}
          </div>

          {/* Strong Topics Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Mastered Strong Topics ({strongTopics.length})
            </h3>

            {strongTopics.length > 0 ? (
              <div className="space-y-3">
                {strongTopics.map((topic) => (
                  <Card
                    key={topic.topicId}
                    className="p-4 bg-slate-900/70 border-emerald-500/20 flex items-center justify-between gap-2"
                  >
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">{topic.topicName}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {topic.correctAnswers} of {topic.attempts} correct answers
                      </p>
                    </div>
                    <Badge variant="emerald" size="sm">
                      {Math.round(topic.masteryScore * 100)}% Mastered
                    </Badge>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center text-xs text-slate-500 bg-slate-900/30 border-slate-800">
                {masteries.length === 0
                  ? 'Complete quizzes with high accuracy to advance topics into Mastered status.'
                  : 'Topics will move here as mastery reaches 85%+.'}
              </Card>
            )}
          </div>
        </div>

        {/* Right Column: Personalized Recommendations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              Personalized Recommendations ({recommendations.length})
            </h3>
            {isDemoMode && <Badge variant="amber" size="sm">DEMO DATA</Badge>}
          </div>

          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <Card
                  key={rec.recommendationId}
                  className="p-4 sm:p-5 bg-slate-900/80 border-slate-800 space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant={
                          rec.type === 'REVISION'
                            ? 'rose'
                            : rec.type === 'QUIZ'
                            ? 'purple'
                            : 'amber'
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
                    <h4 className="text-sm font-bold text-white">{rec.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{rec.reason}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-end">
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
                      {rec.actionLabel || 'Follow Recommendation'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            /* Meaningful Empty State for Recommendations */
            <Card className="p-8 text-center space-y-3 bg-slate-900/30 border-slate-800">
              <Compass className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="text-xs font-bold text-slate-300">No Recommendations Generated</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Complete a few learning activities and MENTORA will personalize your next study steps.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
