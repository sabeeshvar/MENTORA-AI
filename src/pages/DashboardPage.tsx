import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Flame,
  Award,
  BookOpen,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Play,
  Compass,
  CalendarDays,
  RotateCcw,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/context/LanguageContext'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import {
  getUserCourses,
  getUserTopicMasteries,
  getUserQuizAttempts,
  getUserRecommendations,
  getStudyPlan,
  getUserRevisionItems,
} from '@/lib/supabase/db'
import { StudyPlanService } from '@/services/studyPlanService'
import type { TopicMastery, PersonalizedRecommendation } from '@/types/mastery'
import type { Course } from '@/types/course'
import type { QuizAttempt } from '@/types/quiz'
import type { StudyPlan } from '@/types/studyPlan'
import type { RevisionItem } from '@/types/revision'

export const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  // DEMO MODE Toggle for Hackathon Judges
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Real Data States
  const [realCourses, setRealCourses] = useState<Course[]>([])
  const [realMasteries, setRealMasteries] = useState<TopicMastery[]>([])
  const [realAttempts, setRealAttempts] = useState<QuizAttempt[]>([])
  const [realRecs, setRealRecs] = useState<PersonalizedRecommendation[]>([])
  const [realPlan, setRealPlan] = useState<StudyPlan | null>(null)
  const [realRevisions, setRealRevisions] = useState<RevisionItem[]>([])
  const [_loading, setLoading] = useState(true)

  // Load Real Data on Mount
  useEffect(() => {
    if (!user) return
    setLoading(true)

    Promise.all([
      getUserCourses(user.uid),
      getUserTopicMasteries(user.uid),
      getUserQuizAttempts(user.uid),
      getUserRecommendations(user.uid),
    ])
      .then(async ([courses, masteries, attempts, recs]) => {
        setRealCourses(courses)
        setRealMasteries(masteries)
        setRealAttempts(attempts)
        setRealRecs(recs)

        if (courses.length > 0) {
          const firstCourseId = courses[0].courseId
          const [plan, revs] = await Promise.all([
            getStudyPlan(user.uid, firstCourseId),
            getUserRevisionItems(user.uid, firstCourseId),
          ])
          setRealPlan(plan)
          setRealRevisions(revs)
        }
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

  const demoPlan: StudyPlan = {
    planId: 'demo_plan',
    userId: 'demo',
    courseId: 'demo_cs452',
    courseTitle: 'CS 452: Distributed Systems',
    targetDate: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
    dailyAvailableMinutes: 90,
    preferredDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    status: 'active',
    days: [
      {
        date: new Date().toISOString().split('T')[0],
        dayLabel: 'Day 1 (Today)',
        tasks: [
          {
            taskId: 't1',
            topicId: 'raft_compaction',
            topicName: 'Raft Log Compaction Revision',
            taskType: 'REVISION',
            durationMinutes: 30,
            reason: 'Weak topic with 38% mastery.',
            completed: true,
          },
          {
            taskId: 't2',
            topicId: 'consensus_quiz',
            topicName: 'Paxos vs Raft Quiz',
            taskType: 'QUIZ',
            durationMinutes: 20,
            reason: 'Verify understanding of leader election.',
            completed: true,
          },
          {
            taskId: 't3',
            topicId: 'two_phase_commit',
            topicName: '2PC & Distributed Transactions',
            taskType: 'READING',
            durationMinutes: 40,
            reason: 'Prepare for atomic commit protocols.',
            completed: false,
          },
        ],
        totalMinutes: 90,
        completedMinutes: 50,
        status: 'partial',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const demoRevisions: RevisionItem[] = [
    {
      topicId: 'raft_compaction',
      topicName: 'Raft Log Compaction & Snapshotting',
      courseId: 'demo_cs452',
      userId: 'demo',
      masteryScore: 0.38,
      lastStudiedAt: new Date().toISOString(),
      lastQuizScore: 40,
      nextRevisionDue: new Date().toISOString(),
      attempts: 8,
      revisionCount: 2,
      intervalDays: 1,
      status: 'revise_now',
      weakAreas: ['State machine snapshots'],
    },
    {
      topicId: 'probability_inference',
      topicName: 'Markov Decision Processes',
      courseId: 'demo_cs501',
      userId: 'demo',
      masteryScore: 0.51,
      lastStudiedAt: new Date().toISOString(),
      lastQuizScore: 50,
      nextRevisionDue: new Date().toISOString(),
      attempts: 6,
      revisionCount: 1,
      intervalDays: 3,
      status: 'due_today',
      weakAreas: ['Bellman expectation equations'],
    },
    {
      topicId: 'backprop_calculus',
      topicName: 'Backpropagation Chain Rule Derivatives',
      courseId: 'demo_cs501',
      userId: 'demo',
      masteryScore: 0.56,
      lastStudiedAt: new Date().toISOString(),
      lastQuizScore: 60,
      nextRevisionDue: new Date().toISOString(),
      attempts: 12,
      revisionCount: 3,
      intervalDays: 7,
      status: 'due_today',
      weakAreas: ['Jacobian matrix dimensions'],
    },
  ]

  // Active Dataset based on Demo Toggle
  const courses = isDemoMode ? demoCourses : realCourses
  const masteries = isDemoMode ? demoMasteries : realMasteries
  const recommendations = isDemoMode
    ? [
        {
          recommendationId: 'demo_rec_1',
          userId: 'demo',
          courseId: 'demo_cs452',
          topicId: 'raft_compaction',
          type: 'REVISION' as const,
          title: 'Review Raft Log Compaction & Snapshotting',
          reason: 'Your mastery is 38% and your last two quiz attempts contained errors on snapshotting states.',
          priority: 'high' as const,
          estimatedMinutes: 6,
          actionLabel: 'Ask Tutor',
          createdAt: new Date().toISOString(),
        },
      ]
    : realRecs
  const attempts = isDemoMode ? [] : realAttempts
  const studyPlan = isDemoMode ? demoPlan : realPlan
  const revisionItems = isDemoMode ? demoRevisions : realRevisions

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

  // Today's Study Plan calculations
  const todayDateStr = new Date().toISOString().split('T')[0]
  const todayDay = studyPlan?.days.find((d) => d.date === todayDateStr) || studyPlan?.days[0]
  const todayCompletedMins = todayDay?.completedMinutes || 0
  const todayTotalMins = todayDay?.totalMinutes || 60
  const todayPct = todayTotalMins > 0 ? Math.round((todayCompletedMins / todayTotalMins) * 100) : 0

  // Urgent Revision Topics (Top 3)
  const urgentRevisions = revisionItems.filter((i) => i.masteryScore < 0.7).slice(0, 3)

  const currentCourse = courses.length > 0 ? courses[0] : null

  const handleToggleTask = async (taskId: string) => {
    if (!studyPlan || isDemoMode) return
    const dayIdx = studyPlan.days.findIndex((d) => d.date === (todayDay?.date || ''))
    if (dayIdx >= 0) {
      const updated = await StudyPlanService.toggleTask(studyPlan, dayIdx, taskId)
      setRealPlan(updated)
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header with Welcome & Hackathon DEMO MODE Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-emerald-950/40 border border-emerald-500/20 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              {t('dashboard.tagline')}
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
              : 'Grounded in your real uploaded materials, Supabase mastery, and Gemini AI.'}
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

      {/* 2. Top Metric Cards: Real Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Mastery */}
        <Card className="p-5 flex items-center gap-4 bg-slate-900/70 border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t('dashboard.overallMastery')}
              </span>
              {isDemoMode && <Badge variant="amber" size="sm" className="text-[8px] py-0 px-1">DEMO</Badge>}
            </div>
            <h3 className="text-2xl font-black text-white">{overallMasteryPct}%</h3>
            <p className="text-[10px] text-emerald-400 font-semibold">
              {masteries.length > 0 ? `${masteries.length} ${t('dashboard.topicsTracked')}` : 'No quiz data yet'}
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
                {t('dashboard.questionsAttempted')}
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
                {t('dashboard.quizAccuracy')}
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

      {/* 3. FEATURE 3 & 4: TODAY'S STUDY PLAN + REVISION DUE SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Study Plan Section (Feature 3) */}
        <Card className="p-6 bg-slate-900/70 border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">{t('dashboard.todaysPlan')}</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/study-plan')}
                className="text-xs border-slate-700"
              >
                View Full Plan
              </Button>
            </div>

            {todayDay ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>
                    Today's Goal: {Math.round(todayCompletedMins / 60 * 10) / 10}h /{' '}
                    {Math.round(todayTotalMins / 60 * 10) / 10}h completed
                  </span>
                  <span className="font-bold text-emerald-400">{todayPct}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${todayPct}%` }}
                  />
                </div>

                {/* Task Checklist */}
                <div className="space-y-2 pt-2">
                  {todayDay.tasks.map((task) => (
                    <div
                      key={task.taskId}
                      onClick={() => handleToggleTask(task.taskId)}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        task.completed
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-400'
                          : 'bg-slate-950/60 border-slate-800 text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={task.completed ? 'text-emerald-400' : 'text-slate-500'}>
                          {task.completed ? '✓' : '○'}
                        </span>
                        <span className={task.completed ? 'line-through' : 'font-semibold'}>
                          {task.topicName}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{task.durationMinutes} min</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                <p>No study tasks scheduled for today.</p>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate('/study-plan')}
                  className="text-xs"
                >
                  {t('dashboard.createPlan')}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Revision Due Section (Feature 4) */}
        <Card className="p-6 bg-slate-900/70 border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">{t('dashboard.revisionDue')}</h3>
              </div>
              <Badge variant="amber" size="sm">
                {urgentRevisions.length} topics due
              </Badge>
            </div>

            {urgentRevisions.length > 0 ? (
              <div className="space-y-2.5 pt-1">
                {urgentRevisions.map((item) => (
                  <div
                    key={item.topicId}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{item.topicName}</h4>
                      <span className="text-[10px] text-slate-400">
                        Last studied: {new Date(item.lastStudiedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge variant={item.masteryScore < 0.4 ? 'rose' : 'amber'} size="sm">
                      {Math.round(item.masteryScore * 100)}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                All reviewed topics are currently on track!
              </div>
            )}
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              onClick={() => navigate('/revision')}
              className="w-full text-xs font-semibold bg-gradient-to-r from-amber-500 to-teal-500 hover:from-amber-600 shadow-md"
              leftIcon={<Play className="w-3.5 h-3.5" />}
            >
              {t('dashboard.startRevision')}
            </Button>
          </div>
        </Card>
      </div>

      {/* 4. Active Course Banner */}
      {currentCourse && (
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
      )}

      {/* 5. Two-Column Layout: Weak Topics & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Weak Topics */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            {t('dashboard.weakAreas')} ({weakTopics.length})
          </h3>

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
              No weak spots detected! All active topics are developing or mastered.
            </Card>
          )}
        </div>

        {/* Right Column: Personalized Next Steps */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-teal-400" />
            {t('dashboard.recommendations')}
          </h3>

          <div className="space-y-3">
            {recommendations.slice(0, 3).map((rec) => (
              <Card
                key={rec.recommendationId}
                className="p-4 bg-slate-900/70 border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-white">{rec.title}</h4>
                  <Badge variant="emerald" size="sm">
                    {rec.type}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400">{rec.reason}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
