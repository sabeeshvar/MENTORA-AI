import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  UploadCloud,
  FileText,
  Presentation,
  Video,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  BookOpen,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import {
  getUserCourses,
  createCourse,
  addCourseMaterial,
} from '@/lib/supabase/db'
import { uploadCourseMaterialFile, isSupportedMaterialFile } from '@/lib/supabase/storage'
import { processUploadedMaterial } from '@/services/extraction'
import type { Course, CourseMaterial } from '@/types/course'

export interface UploadMaterialModalProps {
  isOpen: boolean
  onClose: () => void
  initialCourseId?: string
  onSuccess?: (material: CourseMaterial, courseId: string) => void
}

export const UploadMaterialModal: React.FC<UploadMaterialModalProps> = ({
  isOpen,
  onClose,
  initialCourseId,
  onSuccess,
}) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId || '')
  
  // New Course Creation State inside modal
  const [isCreatingCourse, setIsCreatingCourse] = useState(false)
  const [newCourseTitle, setNewCourseTitle] = useState('')
  const [newCourseSubject, setNewCourseSubject] = useState('')

  // Drag and drop state
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Upload & Extraction Progress
  const [isUploading, setIsUploading] = useState(false)
  const [uploadPercent, setUploadPercent] = useState(0)
  const [statusStage, setStatusStage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [uploadedMaterial, setUploadedMaterial] = useState<CourseMaterial | null>(null)
  const [isDone, setIsDone] = useState(false)

  // Load user courses
  useEffect(() => {
    if (!isOpen || !user) return

    setError(null)
    setIsDone(false)
    setUploadedMaterial(null)
    setSelectedFile(null)
    setUploadPercent(0)
    setStatusStage('')

    getUserCourses(user.uid)
      .then((data) => {
        setCourses(data)
        if (initialCourseId && data.some((c) => c.courseId === initialCourseId)) {
          setSelectedCourseId(initialCourseId)
        } else if (data.length > 0) {
          setSelectedCourseId(data[0].courseId)
        } else {
          // If no courses exist, default to create course mode
          setIsCreatingCourse(true)
        }
      })
      .catch((err) => {
        console.warn('Could not load courses in upload modal:', err)
      })
      .finally(() => {})
  }, [isOpen, user, initialCourseId])

  if (!isOpen) return null

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelectFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelectFile(e.target.files[0])
    }
  }

  const validateAndSelectFile = (file: File) => {
    setError(null)
    const check = isSupportedMaterialFile(file)
    if (!check.valid) {
      setError(
        check.error ||
          'Unsupported file format. Please choose a PDF (.pdf), PowerPoint (.pptx/.ppt), or MP4 video (.mp4).'
      )
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
  }

  const handleSubmitUpload = async () => {
    if (!user) {
      setError('You must be signed in to upload course materials.')
      return
    }

    if (!selectedFile) {
      setError('Please select a file to upload.')
      return
    }

    let targetCourseId = selectedCourseId

    // If user is in "Create Course" mode, create it now
    if (isCreatingCourse || !targetCourseId) {
      if (!newCourseTitle.trim()) {
        setError('Please enter a course title to attach this material to.')
        return
      }
      try {
        const created = await createCourse(user.uid, {
          title: newCourseTitle.trim(),
          subject: newCourseSubject.trim() || 'General Studies',
          description: `Auto-created course for ${selectedFile.name}`,
        })
        setCourses((prev) => [created, ...prev])
        targetCourseId = created.courseId
        setSelectedCourseId(created.courseId)
        setIsCreatingCourse(false)
      } catch (err: any) {
        setError(err?.message || 'Could not create course.')
        return
      }
    }

    setIsUploading(true)
    setError(null)
    setUploadPercent(5)
    setStatusStage('Validating file & preparing storage...')

    try {
      // 1. Upload to Supabase Storage
      const { downloadURL, storagePath, fileType } = await uploadCourseMaterialFile(
        targetCourseId,
        selectedFile,
        (progress) => {
          // Map 0-100 to 5-40%
          setUploadPercent(5 + Math.round((progress / 100) * 35))
          setStatusStage(`Uploading file to secure storage (${progress}%)...`)
        }
      )

      // 2. Save metadata record in Supabase / Local DB
      setStatusStage('Saving document record...')
      setUploadPercent(45)

      const materialRecord = await addCourseMaterial(targetCourseId, {
        courseId: targetCourseId,
        ownerId: user.uid,
        name: selectedFile.name,
        type: fileType,
        storagePath,
        downloadURL,
        size: selectedFile.size,
        processingStatus: 'uploaded',
        uploadedAt: new Date().toISOString(),
      })

      // 3. Trigger Real Extraction Pipeline
      setStatusStage('Extracting text, slides & structure...')
      setUploadPercent(50)

      const result = await processUploadedMaterial({
        courseId: targetCourseId,
        material: materialRecord,
        fileData: selectedFile,
        onProgress: (stage, percent) => {
          setStatusStage(stage)
          // Map extraction percent (0-100) to 50-98%
          setUploadPercent(50 + Math.round((percent / 100) * 48))
        },
      })

      const finalized: CourseMaterial = {
        ...materialRecord,
        processingStatus: 'processed',
        chunksCount: result.totalChunks,
      }

      setUploadedMaterial(finalized)
      setUploadPercent(100)
      setStatusStage('Material processed and indexed into vector memory!')
      setIsDone(true)

      if (onSuccess) {
        onSuccess(finalized, targetCourseId)
      }
    } catch (err: any) {
      console.error('Upload & extraction pipeline failed:', err)
      setError(err?.message || 'Processing failed. You can retry from the materials library.')
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—'
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0D1322] border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between sticky top-0 bg-[#0D1322]/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Upload Learning Material</h2>
              <p className="text-xs text-slate-400">
                Ground your AI Tutor and Quizzes in your actual course materials.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Success Banner */}
          {isDone && uploadedMaterial ? (
            <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Upload & Processing Complete!</h3>
                <p className="text-xs text-slate-300">
                  <strong className="text-emerald-300">{uploadedMaterial.name}</strong> has been extracted,
                  chunked into <strong>{uploadedMaterial.chunksCount || 0} semantic units</strong>, and
                  indexed for AI grounding.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    onClose()
                    navigate(`/tutor?courseId=${uploadedMaterial.courseId}&materialId=${uploadedMaterial.materialId}`)
                  }}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
                >
                  Ask AI Tutor Now
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    onClose()
                    navigate(`/quiz?courseId=${uploadedMaterial.courseId}&materialId=${uploadedMaterial.materialId}`)
                  }}
                  leftIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Generate Quiz
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={onClose}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Course Selection / Creation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                    Target Course
                  </label>
                  {courses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingCourse(!isCreatingCourse)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                    >
                      {isCreatingCourse ? 'Select existing course' : '+ Create new course'}
                    </button>
                  )}
                </div>

                {isCreatingCourse || courses.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span>Create a new course for this material</span>
                      {courses.length === 0 && (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          Initial Setup
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          placeholder="e.g. CS 101: Intro to Python"
                          value={newCourseTitle}
                          onChange={(e) => setNewCourseTitle(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Subject (e.g. Computer Science)"
                          value={newCourseSubject}
                          onChange={(e) => setNewCourseSubject(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    disabled={isUploading}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {courses.map((course) => (
                      <option key={course.courseId} value={course.courseId}>
                        {course.title} ({course.subject})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Drag and Drop Zone */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">File Attachment</label>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 ${
                    dragActive
                      ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                      : selectedFile
                      ? 'border-emerald-500/40 bg-slate-900/90'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.pptx,.ppt,.mp4"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white line-clamp-1">{selectedFile.name}</p>
                        <p className="text-xs text-emerald-400 mt-0.5">{formatFileSize(selectedFile.size)}</p>
                      </div>
                      <p className="text-[11px] text-slate-400">Click or drag another file to replace</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          Drag and drop your file here, or <span className="text-emerald-400 underline">browse</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Supported: PDF textbooks/notes, PPT/PPTX slide decks, MP4 video lectures (max 50MB)
                        </p>
                      </div>

                      {/* Format Badges */}
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <Badge variant="rose" size="sm" className="flex items-center gap-1">
                          <FileText className="w-3 h-3" /> PDF
                        </Badge>
                        <Badge variant="amber" size="sm" className="flex items-center gap-1">
                          <Presentation className="w-3 h-3" /> PPTX / PPT
                        </Badge>
                        <Badge variant="indigo" size="sm" className="flex items-center gap-1">
                          <Video className="w-3 h-3" /> MP4 Video
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress & Status Stage Indicator */}
              {isUploading && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                    <span className="flex items-center gap-2 text-emerald-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {statusStage || 'Processing document...'}
                    </span>
                    <span>{uploadPercent}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="flex-1">{error}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isDone && (
          <div className="p-6 border-t border-slate-800/80 flex items-center justify-end gap-3 sticky bottom-0 bg-[#0D1322]">
            <Button
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmitUpload}
              disabled={isUploading || !selectedFile}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 font-bold shadow-lg shadow-emerald-950/40 text-xs sm:text-sm"
              leftIcon={
                isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )
              }
            >
              {isUploading ? 'Uploading & Processing...' : 'Upload & Process Material'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
