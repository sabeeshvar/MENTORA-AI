import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Flame,
  Award,
  BookOpen,
  ArrowRight,
  TrendingUp,
  FolderUp,
  BrainCircuit,
  CheckCircle2,
  Calendar,
  HelpCircle,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { StatCard } from '@/components/dashboard/StatCard'
import { CourseCard, type CourseData } from '@/components/dashboard/CourseCard'
import { MasteryCard, type MasteryBreakdown } from '@/components/dashboard/MasteryCard'
import { TopicCard, type WeakTopicData } from '@/components/dashboard/TopicCard'
import {
  RecommendationCard,
  type RecommendationItem,
} from '@/components/dashboard/RecommendationCard'

export const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Toggle for reviewers to inspect both populated dashboard and pristine empty states
  const [showEmptyState, setShowEmptyState] = useState(false)

  // Realistic Sample Data for Hackathon Demo
  const defaultCourses: CourseData[] = [
    {
      id: 'course-1',
      title: 'Distributed Systems & Consensus Protocols',
      code: 'CS 452',
      category: 'Systems',
      progress: 78,
      materialsCount: 4,
      lastStudied: 'Today, 2:15 PM',
      topics: ['Raft Algorithm', 'Paxos Consensus', 'Byzantine Faults', 'Vector Clocks'],
    },
    {
      id: 'course-2',
      title: 'Machine Learning & Deep Architectures',
      code: 'CS 501',
      category: 'AI & Data',
      progress: 64,
      materialsCount: 6,
      lastStudied: 'Yesterday',
      topics: ['Backpropagation', 'Attention Heads', 'Loss Surfaces', 'Transformers'],
    },
    {
      id: 'course-3',
      title: 'Database Internals & Index Optimization',
      code: 'CS 320',
      category: 'Databases',
      progress: 89,
      materialsCount: 3,
      lastStudied: '3 days ago',
      topics: ['B+ Tree Splitting', 'WAL Protocol', 'Concurrency Control', 'LSM Trees'],
    },
  ]

  const defaultWeakTopics: WeakTopicData[] = [
    {
      id: 'wt-1',
      name: 'Raft Log Compaction & Snapshotting',
      course: 'Distributed Systems',
      accuracy: 42,
      questionsAttempted: 12,
      status: 'critical',
      recommendedAction: 'Review Lecture 8 (Slides 18-24)',
    },
    {
      id: 'wt-2',
      name: 'Multi-Head Attention Query-Key Scaling',
      course: 'Deep Architectures',
      accuracy: 58,
      questionsAttempted: 15,
      status: 'needs-review',
      recommendedAction: 'Take 5-min diagnostic quiz',
    },
    {
      id: 'wt-3',
      name: 'Write-Ahead Logging Buffer Eviction',
      course: 'Database Internals',
      accuracy: 66,
      questionsAttempted: 9,
      status: 'improving',
      recommendedAction: 'Verified in last quiz attempt',
    },
  ]

  const defaultRecentQuizzes = [
    {
      id: 'quiz-1',
      title: 'Consensus Algorithms Diagnostic',
      course: 'Distributed Systems',
      score: 85,
      totalQuestions: 10,
      correctQuestions: 8,
      timeAgo: '2 hours ago',
      badge: 'Competent',
    },
    {
      id: 'quiz-2',
      title: 'Transformer Self-Attention Check',
      course: 'Deep Architectures',
      score: 60,
      totalQuestions: 10,
      correctQuestions: 6,
      timeAgo: 'Yesterday',
      badge: 'Review Needed',
    },
    {
      id: 'quiz-3',
      title: 'B+ Tree Indexing Diagnostic',
      course: 'Database Internals',
      score: 90,
      totalQuestions: 10,
      correctQuestions: 9,
      timeAgo: '3 days ago',
      badge: 'Mastered',
    },
  ]

  const defaultRecommendations: RecommendationItem[] = [
    {
      id: 'rec-1',
      type: 'review',
      title: 'Review Raft Leader Election Timeout Rules',
      course: 'Distributed Systems',
      reason: 'Diagnosed 2 missed questions in the last adaptive quiz session.',
      estimatedMinutes: 6,
      priority: 'high-yield',
      actionLabel: 'Study Slides',
    },
    {
      id: 'rec-2',
      type: 'quiz',
      title: 'Targeted Assessment: Attention Scaling Factor',
      course: 'Deep Architectures',
      reason: 'Calculated 58% accuracy. 4 calibrated questions will reinforce understanding.',
      estimatedMinutes: 5,
      priority: 'high-yield',
      actionLabel: 'Start Quiz',
    },
    {
      id: 'rec-3',
      type: 'material',
      title: 'Compare LSM Tree vs B+ Tree Write Amplification',
      course: 'Database Internals',
      reason: 'Core prerequisite topic before upcoming exam milestone.',
      estimatedMinutes: 10,
      priority: 'recommended',
      actionLabel: 'Read Notes',
    },
  ]

  const defaultMasteryBreakdown: MasteryBreakdown = {
    mastered: 18,
    competent: 14,
    learning: 8,
    totalConcepts: 40,
  }

  // Active dataset depending on reviewer toggle
  const courses = showEmptyState ? [] : defaultCourses
  const weakTopics = showEmptyState ? [] : defaultWeakTopics
  const recentQuizzes = showEmptyState ? [] : defaultRecentQuizzes
  const recommendations = showEmptyState ? [] : defaultRecommendations
  const overallMastery = showEmptyState ? 0 : 74
  const streakDays = showEmptyState ? 0 : user?.learningStats?.streakDays || 5

  // 7-day activity mock (Mon to Sun)
  const weekDays = [
    { day: 'Mon', completed: !showEmptyState },
    { day: 'Tue', completed: !showEmptyState },
    { day: 'Wed', completed: !showEmptyState },
    { day: 'Thu', completed: !showEmptyState },
    { day: 'Fri', completed: !showEmptyState },
    { day: 'Sat', completed: false },
    { day: 'Sun', completed: false },
  ]

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Welcome Section & Quick Launcher */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-emerald-950/40 border border-emerald-500/20 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-emerald-500/10 via-teal-500/5 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                Adaptive AI Session Active
              </span>
              <span className="text-xs text-slate-400 font-medium">
                • Source-Grounded Learning Engine
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Welcome back,{' '}
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                {user?.name || user?.displayName || 'Learner'}
              </span>
              ! 👋
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
              <strong className="text-emerald-300">Learn. Adapt. Master.</strong> Your knowledge
              model indicates <span className="text-emerald-300 font-bold">{courses.length} courses</span>{' '}
              are synced. Address your weak areas today to boost topic mastery.
            </p>
          </div>

          {/* Quick Actions & Demo Switch */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <Link to="/study" className="flex-1">
                <Button
                  size="md"
                  variant="primary"
                  className="w-full text-xs font-semibold bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 shadow-emerald-950/40"
                  leftIcon={<BrainCircuit className="w-4 h-4" />}
                >
                  Ask AI Tutor
                </Button>
              </Link>
              <Link to="/courses" className="flex-1">
                <Button
                  size="md"
                  variant="secondary"
                  className="w-full text-xs font-semibold border-slate-700 hover:border-emerald-500/40"
                  leftIcon={<FolderUp className="w-4 h-4 text-emerald-400" />}
                >
                  Upload Material
                </Button>
              </Link>
            </div>

            {/* Reviewer Toggle for Fresh vs Populated State */}
            <button
              onClick={() => setShowEmptyState(!showEmptyState)}
              className="text-[11px] font-medium text-slate-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between transition-colors"
            >
              <span>Demo Mode View:</span>
              <span className="font-bold ml-1 text-emerald-400">
                {showEmptyState ? 'Pristine Empty State' : 'Preloaded Coursework'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics & Learning Streak Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Learning Streak StatCard */}
        <StatCard
          title="Daily Study Streak"
          value={`${streakDays} Days`}
          icon={<Flame className="w-5 h-5 fill-amber-400 text-amber-400" />}
          subtitle={
            streakDays > 0 ? 'Study 15m today to keep streak active' : 'Start your first daily study'
          }
          trend={streakDays > 0 ? { value: '+1 day', isPositive: true } : undefined}
          badge={{ text: streakDays >= 5 ? 'On Fire 🔥' : 'Active', variant: 'amber' }}
          accent="emerald"
        />

        {/* Overall Mastery StatCard */}
        <StatCard
          title="Mastery Index"
          value={`${overallMastery}%`}
          icon={<Award className="w-5 h-5 text-emerald-400" />}
          subtitle={`${defaultMasteryBreakdown.totalConcepts} Key topics calibrated`}
          trend={{ value: '+4.2%', isPositive: true }}
          badge={{ text: overallMastery >= 70 ? 'Proficient' : 'Foundational', variant: 'emerald' }}
          accent="emerald"
        />

        {/* Active Courses StatCard */}
        <StatCard
          title="Course Modules"
          value={courses.length}
          icon={<BookOpen className="w-5 h-5 text-cyan-400" />}
          subtitle={courses.length > 0 ? '13 PDFs & lecture slides indexed' : '0 materials indexed'}
          badge={{ text: `${courses.length} Active`, variant: 'indigo' }}
          accent="cyan"
        />

        {/* Practice Quizzes StatCard */}
        <StatCard
          title="Adaptive Quizzes"
          value={recentQuizzes.length}
          icon={<TrendingUp className="w-5 h-5 text-teal-400" />}
          subtitle="Average diagnostic score: 78%"
          trend={{ value: '+12%', isPositive: true }}
          badge={{ text: 'Calibrated', variant: 'emerald' }}
          accent="blue"
        />
      </div>

      {/* 2b. Weekly Streak Visual Calendar */}
      <Card className="p-5 bg-slate-900/60 border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                Weekly Study Consistency
                <span className="text-xs font-normal text-slate-400">
                  (Goal: 5 active sessions / week)
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                Grounded questions asked and practice problems attempted count toward your goal.
              </p>
            </div>
          </div>

          {/* 7 Day Dots */}
          <div className="flex items-center gap-2 self-center sm:self-auto">
            {weekDays.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                    item.completed
                      ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-slate-950 border border-slate-800 text-slate-500'
                  }`}
                >
                  {item.completed ? <CheckCircle2 className="w-4 h-4" /> : item.day[0]}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{item.day}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* 3 & 8. Continue Learning & Overall Mastery Dual Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 8. Continue Learning Featured Hero Card */}
        <div className="lg:col-span-2 flex flex-col justify-between">
          <Card className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-emerald-950/30 border border-emerald-500/30 p-6 flex flex-col justify-between h-full shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Flame className="w-3.5 h-3.5 fill-emerald-400" />
                  Continue Where You Left Off
                </span>
                <span className="text-xs text-slate-400">Last active: 25 mins ago</span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white hover:text-emerald-300 transition-colors">
                  Distributed Systems & Consensus Protocols
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Currently reading:{' '}
                  <span className="font-semibold text-emerald-300">
                    Section 4.2 — Raft Safety Properties & Invariants
                  </span>
                </p>
              </div>

              {/* Progress metric */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Progress in active module</span>
                  <span className="font-bold text-emerald-400">Page 28 of 42 (66%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400"
                    style={{ width: '66%' }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 mt-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-mono">
                  CS 452
                </span>
                <span>• 4 questions left in current chapter check</span>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/study')}
                className="text-xs px-4 py-2 font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-950/40"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Resume Study Session
              </Button>
            </div>
          </Card>
        </div>

        {/* 3. Overall Mastery Card */}
        <div className="lg:col-span-1">
          <MasteryCard
            overallMastery={overallMastery}
            breakdown={defaultMasteryBreakdown}
            onViewDetails={() => navigate('/progress')}
          />
        </div>
      </div>

      {/* 4. My Courses Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              My Enrolled Courses & Materials
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Active learning subjects with source-grounded indexing.
            </p>
          </div>

          <Link to="/courses">
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-slate-700 text-slate-300 hover:text-white"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View All Courses
            </Button>
          </Link>
        </div>

        {courses.length === 0 ? (
          /* Realistic Empty State for Courses */
          <Card className="p-8 text-center bg-slate-900/40 border-dashed border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <FolderUp className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-base font-bold text-white">No Learning Materials Indexed Yet</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Upload your course syllabus, lecture slides (PPTX), or PDF textbooks to activate
                grounded question-answering and adaptive diagnostic quizzes.
              </p>
            </div>
            <Link to="/courses">
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-xs px-4"
                leftIcon={<FolderUp className="w-4 h-4" />}
              >
                Upload First Material
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onContinue={() => navigate(`/study`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 5 & 6. Weak Topics & Recent Quiz Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 5. Weak Topics Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
                Targeted Weak Areas
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Concepts requiring review based on recent assessment accuracy.
              </p>
            </div>
            <Badge variant="rose" size="sm">
              {weakTopics.length} Focus Areas
            </Badge>
          </div>

          {weakTopics.length === 0 ? (
            /* Realistic Empty State for Weak Topics */
            <Card className="p-8 text-center bg-slate-900/40 border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">No Critical Knowledge Gaps</h4>
                <p className="text-xs text-slate-400 mt-1">
                  You have not demonstrated weak spots yet. Take an adaptive quiz to identify areas
                  for improvement.
                </p>
              </div>
              <Link to="/quiz">
                <Button variant="outline" size="sm" className="text-xs">
                  Take Calibration Quiz
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {weakTopics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  onPractice={() => navigate('/quiz')}
                />
              ))}
            </div>
          )}
        </div>

        {/* 6. Recent Quiz Performance Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-teal-400" />
                Recent Quiz Performance
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Adaptive diagnostic assessments and scorecards.
              </p>
            </div>
            <Link to="/quiz">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-slate-800 text-slate-300"
              >
                All Quizzes
              </Button>
            </Link>
          </div>

          {recentQuizzes.length === 0 ? (
            /* Realistic Empty State for Quizzes */
            <Card className="p-8 text-center bg-slate-900/40 border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">No Diagnostic Attempts Yet</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Generate adaptive practice tests from your indexed materials to evaluate mastery.
                </p>
              </div>
              <Link to="/quiz">
                <Button variant="primary" size="sm" className="text-xs">
                  Generate Adaptive Quiz
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentQuizzes.map((quiz) => (
                <Card
                  key={quiz.id}
                  hover
                  className="p-4 bg-slate-900/60 border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-bold text-xs border ${
                        quiz.score >= 80
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : quiz.score >= 65
                          ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      <span>{quiz.score}%</span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">{quiz.title}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{quiz.course}</span>
                        <span>•</span>
                        <span>
                          {quiz.correctQuestions}/{quiz.totalQuestions} correct
                        </span>
                        <span>•</span>
                        <span className="text-slate-500">{quiz.timeAgo}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        quiz.score >= 80
                          ? 'emerald'
                          : quiz.score >= 65
                          ? 'indigo'
                          : 'amber'
                      }
                      size="sm"
                    >
                      {quiz.badge}
                    </Badge>
                  </div>
                </Card>
              ))}

              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-center">
                <p className="text-xs text-slate-400">
                  Adaptive engine calibrates question difficulty according to your accuracy.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 7. Recommended Learning Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              High-Yield Learning Recommendations
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Personalized interventions automatically generated from your weak spots.
            </p>
          </div>

          <Badge variant="emerald" size="sm">
            AI Prescribed
          </Badge>
        </div>

        {recommendations.length === 0 ? (
          /* Realistic Empty State for Recommendations */
          <Card className="p-8 text-center bg-slate-900/40 border-slate-800 space-y-3">
            <p className="text-xs text-slate-400">
              Upload course material or take a quiz to activate personalized study recommendations.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recommendations.map((item) => (
              <RecommendationCard
                key={item.id}
                item={item}
                onAction={(rec) => {
                  if (rec.type === 'quiz') navigate('/quiz')
                  else navigate('/study')
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
