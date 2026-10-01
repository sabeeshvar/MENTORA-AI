import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Plus,
  Layers,
  ArrowRight,
  Trash2,
  Calendar,
  AlertCircle,
  Loader2,
  X,
  Search,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { getUserCourses, createCourse, deleteCourse } from '@/lib/supabase/db'
import type { Course } from '@/types/course'

const SUBJECT_SUGGESTIONS = [
  'Computer Science',
  'Artificial Intelligence',
  'Software Engineering',
  'Mathematics & Statistics',
  'Data Science',
  'Physics & Engineering',
  'Cybersecurity',
  'Business & Management',
]

export const CoursesPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState<string>('All')

  // Modal State for Course Creation
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Course Deletion State
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null)

  // Fetch courses owned by current student
  const loadCourses = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const data = await getUserCourses(user.uid)
      setCourses(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load courses'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCourses()
  }, [user])

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!title.trim()) {
      setModalError('Please enter a course name.')
      return
    }
    if (!subject.trim()) {
      setModalError('Please select or specify a subject.')
      return
    }

    setIsSubmitting(true)
    setModalError(null)

    try {
      const newCourse = await createCourse(user.uid, {
        title: title.trim(),
        description: description.trim(),
        subject: subject.trim(),
      })

      setCourses((prev) => [newCourse, ...prev])
      setIsModalOpen(false)
      setTitle('')
      setSubject('')
      setDescription('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not create course'
      setModalError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (!user) return
    const confirmed = window.confirm(
      `Are you sure you want to delete "${courseTitle}" and all of its uploaded materials? This action cannot be undone.`
    )
    if (!confirmed) return

    setDeletingCourseId(courseId)
    try {
      await deleteCourse(courseId, user.uid)
      setCourses((prev) => prev.filter((c) => c.courseId !== courseId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete course')
    } finally {
      setDeletingCourseId(null)
    }
  }

  // Filtered courses
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.subject.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSubject =
      selectedSubject === 'All' || course.subject.toLowerCase() === selectedSubject.toLowerCase()
    return matchesSearch && matchesSubject
  })

  // Unique subjects for filter chips
  const existingSubjects = Array.from(new Set(courses.map((c) => c.subject).filter(Boolean)))

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Course Management
            </h1>
            <Badge variant="emerald" size="sm">
              {courses.length} {courses.length === 1 ? 'Course' : 'Courses'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Organize your subjects, upload PDFs, PPT/PPTX slide decks, and lecture recordings.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-950/40 text-xs sm:text-sm font-semibold self-start md:self-auto shrink-0"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create New Course
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by course name, topic, or subject..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
          />
        </div>

        {existingSubjects.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedSubject('All')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                selectedSubject === 'All'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-900/40 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              All
            </button>
            {existingSubjects.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                  selectedSubject === sub
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-900/40 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button size="sm" variant="outline" onClick={loadCourses} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-xs text-slate-400">Loading your enrolled courses...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        /* Empty State */
        <Card className="p-10 text-center bg-slate-900/40 border-dashed border-slate-800/80 space-y-4 max-w-xl mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/20">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              {searchQuery ? 'No matching courses found' : 'No courses created yet'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? 'Try adjusting your search query or subject filter.'
                : 'Create your first course to begin uploading textbooks, lecture slides, and notes for AI grounding.'}
            </p>
          </div>

          {!searchQuery && (
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-xs px-4 py-2 font-semibold shadow-md shadow-emerald-950/30"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Course Now
            </Button>
          )}
        </Card>
      ) : (
        /* Courses Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card
              key={course.courseId}
              hover
              className="group relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 flex flex-col justify-between transition-all duration-300 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-950/20"
            >
              <div>
                {/* Subject & Delete Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Badge variant="emerald" size="sm">
                    {course.subject}
                  </Badge>

                  <button
                    onClick={() => handleDeleteCourse(course.courseId, course.title)}
                    disabled={deletingCourseId === course.courseId}
                    title="Delete Course"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    {deletingCourseId === course.courseId ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Title */}
                <h3
                  onClick={() => navigate(`/courses/${course.courseId}`)}
                  className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1 cursor-pointer mb-2"
                >
                  {course.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                  {course.description || 'No description provided.'}
                </p>
              </div>

              {/* Card Footer */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-medium">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    {course.materialsCount ?? 0}{' '}
                    {(course.materialsCount ?? 0) === 1 ? 'material' : 'materials'}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-600" />
                    {new Date(course.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate(`/courses/${course.courseId}`)}
                  className="text-xs px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-semibold"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Open Course
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#0D1322] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Create New Course</h3>
                  <p className="text-xs text-slate-400">
                    Add a course module to index your study materials.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCourse} className="space-y-4">
              {/* Course Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Course Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Distributed Systems & Consensus Protocols"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Subject / Discipline <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Computer Science, AI, Mathematics"
                  list="subjects-list"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
                <datalist id="subjects-list">
                  {SUBJECT_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {SUBJECT_SUGGESTIONS.slice(0, 4).map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setSubject(s)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-300 hover:border-emerald-500/40 transition-colors"
                    >
                      +{s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Course Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of course curriculum, key objectives, and exam milestones..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  className="text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                >
                  Create Course
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CoursesPage
