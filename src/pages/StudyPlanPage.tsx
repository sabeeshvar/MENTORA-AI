import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Loader2,
  CalendarDays,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/context/LanguageContext'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { getUserCourses, getUserTopicMasteries, getStudyPlan } from '@/lib/supabase/db'
import { StudyPlanService } from '@/services/studyPlanService'
import type { Course } from '@/types/course'
import type { TopicMastery } from '@/types/mastery'
import type { StudyPlan } from '@/types/studyPlan'

export const StudyPlanPage: React.FC = () => {
  const { user } = useAuth()
  const { t, language } = useTranslation()

  // State
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [masteries, setMasteries] = useState<TopicMastery[]>([])
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [recalculatedMsg, setRecalculatedMsg] = useState<string | null>(null)

  // Creation Wizard Modal State
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().split('T')[0]
  })
  const [dailyMinutes, setDailyMinutes] = useState(60)
  const [preferredDays, setPreferredDays] = useState<string[]>([
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
  ])
  const [isGenerating, setIsGenerating] = useState(false)

  const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // Load Courses and Masteries
  useEffect(() => {
    if (!user) return
    setLoading(true)

    Promise.all([getUserCourses(user.uid), getUserTopicMasteries(user.uid)])
      .then(([cList, mList]) => {
        setCourses(cList)
        setMasteries(mList)
        if (cList.length > 0) {
          setSelectedCourseId(cList[0].courseId)
        }
      })
      .catch((err) => console.warn('Error loading study plan data:', err))
      .finally(() => setLoading(false))
  }, [user])

  // Load Active Plan when Course Changes
  useEffect(() => {
    if (!user || !selectedCourseId) return
    getStudyPlan(user.uid, selectedCourseId).then((plan) => {
      setActivePlan(plan)
    })
  }, [user, selectedCourseId])

  // Generate Plan Handler
  const handleCreatePlan = async () => {
    if (!user || !selectedCourseId) return
    const curCourse = courses.find((c) => c.courseId === selectedCourseId)

    setIsGenerating(true)
    try {
      const plan = await StudyPlanService.generatePlan({
        userId: user.uid,
        courseId: selectedCourseId,
        courseTitle: curCourse?.title || 'Selected Course',
        targetDate,
        dailyAvailableMinutes: dailyMinutes,
        preferredDays,
        masteries,
        preferredLanguage: language,
      })
      setActivePlan(plan)
      setShowWizard(false)
      setWizardStep(1)
    } catch (err) {
      alert('Failed to generate study plan. Please verify inputs.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Toggle Task Completion
  const handleToggleTask = async (dayIndex: number, taskId: string) => {
    if (!activePlan) return
    const updated = await StudyPlanService.toggleTask(activePlan, dayIndex, taskId)
    setActivePlan(updated)
  }

  // Recalculate Plan
  const handleRecalculate = async () => {
    if (!activePlan) return
    setRecalculating(true)
    setRecalculatedMsg(null)

    try {
      const { updatedPlan, carriedForwardCount } = await StudyPlanService.recalculatePlan(
        activePlan,
        masteries
      )
      setActivePlan(updatedPlan)
      setRecalculatedMsg(
        carriedForwardCount > 0
          ? `Your plan was adjusted based on your progress. ${carriedForwardCount} incomplete task(s) carried forward.`
          : 'Your plan is currently up to date with your learning progress.'
      )
    } finally {
      setRecalculating(false)
    }
  }

  // Compute Overall Progress
  const totalTasks =
    activePlan?.days.reduce((acc, d) => acc + d.tasks.length, 0) || 0
  const completedTasks =
    activePlan?.days.reduce((acc, d) => acc + d.tasks.filter((t) => t.completed).length, 0) || 0
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const selectedCourse = courses.find((c) => c.courseId === selectedCourseId)

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {t('studyPlan.title')}
            </h1>
            <Badge variant="emerald" size="sm">
              Adaptive Curriculum
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            {t('studyPlan.subtitle')}
          </p>
        </div>

        {/* Course selector & Create Button */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {courses.length > 0 && (
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {courses.map((c) => (
                <option key={c.courseId} value={c.courseId}>
                  {c.title}
                </option>
              ))}
            </select>
          )}

          <Button
            variant="primary"
            onClick={() => setShowWizard(true)}
            className="text-xs font-semibold bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-600 shadow-md shadow-emerald-950/30"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            {t('studyPlan.createButton')}
          </Button>
        </div>
      </div>

      {/* Recalculated Notification Banner */}
      {recalculatedMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{recalculatedMsg}</span>
          </div>
          <button
            onClick={() => setRecalculatedMsg(null)}
            className="text-slate-400 hover:text-white text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Plan Status Banner */}
      {activePlan && (
        <Card className="p-6 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-emerald-950/30 border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="emerald" size="sm">
                Target: {new Date(activePlan.targetDate).toLocaleDateString()}
              </Badge>
              <Badge variant="outline" size="sm" className="text-slate-400 border-slate-700">
                {activePlan.dailyAvailableMinutes} min/day
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-white">
              {activePlan.courseTitle || selectedCourse?.title || 'Active Curriculum'}
            </h3>
            <p className="text-xs text-slate-400">
              {completedTasks} of {totalTasks} tasks completed across {activePlan.days.length} planned days.
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-4">
            <div className="w-36 text-right">
              <span className="text-2xl font-black text-emerald-400">{progressPct}%</span>
              <div className="w-full bg-slate-800 rounded-full h-2 mt-1 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              isLoading={recalculating}
              className="text-xs border-slate-700 hover:border-emerald-500 text-slate-300"
              leftIcon={<RefreshCw className="w-3.5 h-3.5 text-emerald-400" />}
            >
              {t('studyPlan.recalculate')}
            </Button>
          </div>
        </Card>
      )}

      {/* Plan Days Grid or Empty State */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-xs text-slate-400">{t('common.loading')}</p>
        </div>
      ) : !activePlan ? (
        /* Empty State */
        <Card className="p-12 text-center bg-slate-900/40 border-dashed border-slate-800 space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <CalendarDays className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No Active Study Plan</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              Create a personalized day-by-day plan calibrated to your target exam date, daily available
              hours, and topic mastery gaps.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowWizard(true)}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 font-semibold"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            {t('studyPlan.createButton')}
          </Button>
        </Card>
      ) : (
        /* Calendar Days Timeline */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activePlan.days.map((day, dIdx) => {
              const dayCompleted = day.tasks.every((t) => t.completed)

              return (
                <Card
                  key={day.date}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                    dayCompleted
                      ? 'bg-emerald-950/15 border-emerald-500/30'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div>
                    {/* Day Header */}
                    <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          {day.dayLabel}
                        </h4>
                        <span className="text-[10px] text-slate-400">{day.date}</span>
                      </div>

                      <Badge
                        variant={dayCompleted ? 'emerald' : 'outline'}
                        size="sm"
                        className="text-[10px]"
                      >
                        {dayCompleted
                          ? 'Completed'
                          : `${day.tasks.filter((t) => t.completed).length}/${day.tasks.length} Done`}
                      </Badge>
                    </div>

                    {/* Task Items */}
                    <div className="space-y-3">
                      {day.tasks.map((task) => (
                        <div
                          key={task.taskId}
                          onClick={() => handleToggleTask(dIdx, task.taskId)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            task.completed
                              ? 'bg-emerald-500/10 border-emerald-500/30 opacity-75'
                              : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => {}} // handled by parent onClick
                              className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className={`text-xs font-bold truncate ${
                                    task.completed
                                      ? 'line-through text-slate-400'
                                      : 'text-slate-200'
                                  }`}
                                >
                                  {task.topicName}
                                </span>
                                <Badge
                                  variant={task.taskType === 'REVISION' ? 'amber' : 'indigo'}
                                  size="sm"
                                  className="text-[9px] py-0 px-1 shrink-0"
                                >
                                  {task.taskType}
                                </Badge>
                              </div>

                              <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                {task.reason}
                              </p>

                              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{task.durationMinutes} min</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Day Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {day.completedMinutes} / {day.totalMinutes} min logged
                    </span>
                    <span className="font-semibold text-emerald-400">
                      {Math.round((day.completedMinutes / Math.max(1, day.totalMinutes)) * 100)}%
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* 6-Step Plan Creation Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#0D1322] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Create Study Plan</h3>
                  <p className="text-xs text-slate-400">Step {wizardStep} of 4</p>
                </div>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Target Date */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-slate-300">
                  When is your target or exam date?
                </label>
                <input
                  type="date"
                  value={targetDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400">
                  The system will calculate the optimal spaced learning intervals between today and
                  your milestone.
                </p>
                <Button
                  variant="primary"
                  className="w-full mt-4"
                  onClick={() => setWizardStep(2)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Next: Study Hours
                </Button>
              </div>
            )}

            {/* Step 2: Available Study Time */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Daily Available Study Time
                  </label>
                  <span className="text-sm font-black text-emerald-400">{dailyMinutes} minutes</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="180"
                  step="10"
                  value={dailyMinutes}
                  onChange={(e) => setDailyMinutes(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex gap-2">
                  {[30, 45, 60, 90, 120].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDailyMinutes(m)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                        dailyMinutes === m
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setWizardStep(1)}>
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => setWizardStep(3)}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Next: Days
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Preferred Days */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-slate-300">
                  Select Preferred Study Days
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ALL_DAYS.map((d) => {
                    const active = preferredDays.includes(d)
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          if (active && preferredDays.length > 1) {
                            setPreferredDays(preferredDays.filter((x) => x !== d))
                          } else if (!active) {
                            setPreferredDays([...preferredDays, d])
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          active
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setWizardStep(2)}>
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => setWizardStep(4)}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Next: Review
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Review & Confirm */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Course:</span>
                    <span className="text-white font-semibold">{selectedCourse?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Date:</span>
                    <span className="text-white font-semibold">{targetDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Daily Study Time:</span>
                    <span className="text-emerald-400 font-semibold">{dailyMinutes} min/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Study Days:</span>
                    <span className="text-white font-semibold">{preferredDays.join(', ')}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setWizardStep(3)}>
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600"
                    isLoading={isGenerating}
                    onClick={handleCreatePlan}
                  >
                    Confirm & Activate
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default StudyPlanPage
