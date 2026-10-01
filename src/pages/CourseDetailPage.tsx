import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  Presentation,
  Video,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ShieldAlert,
  Play,
  Clock,
  RefreshCw,
  Eye,
  Pencil,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import {
  getCourseById,
  getCourseMaterials,
  addCourseMaterial,
  deleteCourseMaterial,
  updateCourse,
} from '@/lib/supabase/db'
import { uploadCourseMaterialFile, isSupportedMaterialFile } from '@/lib/supabase/storage'
import { processUploadedMaterial } from '@/services/extraction'
import { ChunkViewerModal } from '@/components/materials/ChunkViewerModal'
import type { Course, CourseMaterial, CourseMaterialType } from '@/types/course'

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [course, setCourse] = useState<Course | null>(null)
  const [materials, setMaterials] = useState<CourseMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)

  // Upload States
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // Extraction Processing States
  const [processingStatusMap, setProcessingStatusMap] = useState<
    Record<string, { stage: string; percent: number }>
  >({})
  const [viewingChunksMaterial, setViewingChunksMaterial] = useState<CourseMaterial | null>(null)

  // Deleting Material ID
  const [deletingMaterialId, setDeletingMaterialId] = useState<string | null>(null)

  // Edit Course Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const openEditModal = () => {
    if (!course) return
    setEditTitle(course.title)
    setEditSubject(course.subject)
    setEditDescription(course.description || '')
    setEditError(null)
    setIsEditModalOpen(true)
  }

  const handleSaveCourseEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!course || !user || !courseId) return
    if (!editTitle.trim()) {
      setEditError('Please enter a course title.')
      return
    }
    if (!editSubject.trim()) {
      setEditError('Please enter a subject.')
      return
    }

    setIsSavingEdit(true)
    setEditError(null)
    try {
      const updated = await updateCourse(courseId, user.uid, {
        title: editTitle.trim(),
        subject: editSubject.trim(),
        description: editDescription.trim(),
      })
      setCourse(updated)
      setIsEditModalOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update course'
      setEditError(msg)
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Load Course and Materials
  const loadCourseData = async () => {
    if (!courseId || !user) return
    setLoading(true)
    setError(null)
    setAccessDenied(false)

    try {
      const courseData = await getCourseById(courseId, user.uid)
      if (!courseData) {
        setError('Course not found.')
        setLoading(false)
        return
      }

      setCourse(courseData)
      const materialsData = await getCourseMaterials(courseId, user.uid)
      setMaterials(materialsData)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading course details'
      if (msg.includes('Access denied') || msg.includes('permission')) {
        setAccessDenied(true)
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCourseData()
  }, [courseId, user])

  // Extraction Pipeline Trigger
  const handleProcessMaterial = async (material: CourseMaterial, fileData?: File) => {
    if (!courseId) return
    const matId = material.materialId

    setProcessingStatusMap((prev) => ({
      ...prev,
      [matId]: { stage: 'Initializing extraction pipeline...', percent: 5 },
    }))

    setMaterials((prev) =>
      prev.map((m) =>
        m.materialId === matId ? { ...m, processingStatus: 'processing', errorMessage: undefined } : m
      )
    )

    try {
      const result = await processUploadedMaterial({
        courseId,
        material,
        fileData,
        onProgress: (stage, percent) => {
          setProcessingStatusMap((prev) => ({
            ...prev,
            [matId]: { stage, percent },
          }))
        },
      })

      // Update state with processed counts
      setMaterials((prev) =>
        prev.map((m) =>
          m.materialId === matId
            ? {
                ...m,
                processingStatus: 'processed',
                chunksCount: result.totalChunks,
                errorMessage: undefined,
              }
            : m
        )
      )
    } catch (err: any) {
      const msg = err?.message || 'Processing failed'
      setMaterials((prev) =>
        prev.map((m) =>
          m.materialId === matId
            ? { ...m, processingStatus: 'failed', errorMessage: msg }
            : m
        )
      )
    } finally {
      setProcessingStatusMap((prev) => {
        const copy = { ...prev }
        delete copy[matId]
        return copy
      })
    }
  }

  // File Upload Handler
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !courseId || !user) return

    const file = files[0]
    setUploadError(null)

    const check = isSupportedMaterialFile(file)
    if (!check.valid) {
      setUploadError(
        check.error || 'Unsupported file type. Please upload a PDF (.pdf), PPT (.ppt), PPTX (.pptx), or MP4 (.mp4) file.'
      )
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // 1. Upload to Supabase Storage
      const { downloadURL, storagePath, fileType } = await uploadCourseMaterialFile(
        courseId,
        file,
        (progress: number) => setUploadProgress(progress)
      )

      // 2. Save document to courses/{courseId}/materials/{materialId}
      const newMaterial = await addCourseMaterial(courseId, {
        courseId,
        name: file.name,
        type: fileType,
        storagePath,
        downloadURL,
        fileSizeBytes: file.size,
        processingStatus: 'uploaded',
        uploadedAt: new Date().toISOString(),
      })

      // Update local state
      setMaterials((prev) => [newMaterial, ...prev])
      setUploadProgress(100)

      // 3. Automatically launch processing pipeline on the uploaded document
      handleProcessMaterial(newMaterial, file)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload material'
      setUploadError(msg)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // File Delete Handler
  const handleDeleteMaterial = async (materialId: string, _storagePath: string, name: string) => {
    if (!courseId || !user) return
    const confirmed = window.confirm(`Are you sure you want to delete "${name}"?`)
    if (!confirmed) return

    setDeletingMaterialId(materialId)
    try {
      await deleteCourseMaterial(courseId, materialId)
      setMaterials((prev) => prev.filter((m) => m.materialId !== materialId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete material')
    } finally {
      setDeletingMaterialId(null)
    }
  }

  // Drag and Drop listeners
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
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—'
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getTypeIcon = (type: CourseMaterialType) => {
    switch (type) {
      case 'PDF':
        return <FileText className="w-5 h-5 text-rose-400" />
      case 'PPT':
      case 'PPTX':
        return <Presentation className="w-5 h-5 text-amber-400" />
      case 'MP4':
        return <Video className="w-5 h-5 text-cyan-400" />
      default:
        return <FileText className="w-5 h-5 text-emerald-400" />
    }
  }

  const getTypeBadgeVariant = (type: CourseMaterialType) => {
    switch (type) {
      case 'PDF':
        return 'rose' as const
      case 'PPT':
      case 'PPTX':
        return 'amber' as const
      case 'MP4':
        return 'indigo' as const
      default:
        return 'emerald' as const
    }
  }

  const renderStatusBadge = (material: CourseMaterial) => {
    const active = processingStatusMap[material.materialId]
    if (active || material.processingStatus === 'processing') {
      return (
        <Badge variant="amber" size="sm" className="flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
          Processing {active ? `${active.percent}%` : '...'}
        </Badge>
      )
    }

    if (material.processingStatus === 'processed') {
      return (
        <Badge variant="emerald" size="sm" className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          Processed {material.chunksCount !== undefined ? `(${material.chunksCount} chunks)` : ''}
        </Badge>
      )
    }

    if (material.processingStatus === 'failed') {
      return (
        <Badge
          variant="rose"
          size="sm"
          className="flex items-center gap-1 cursor-help"
          title={material.errorMessage || 'Extraction failed'}
        >
          <AlertCircle className="w-3 h-3 text-rose-400" />
          Failed
        </Badge>
      )
    }

    return (
      <Badge variant="outline" size="sm" className="flex items-center gap-1 text-slate-400 border-slate-700">
        <Clock className="w-3 h-3" />
        Uploaded
      </Badge>
    )
  }

  if (accessDenied) {
    return (
      <div className="py-20 max-w-md mx-auto text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          You do not have permission to view or manage this course. Only the course owner can view
          its uploaded materials.
        </p>
        <Link to="/courses">
          <Button variant="outline" size="sm" className="mt-2 text-xs">
            Return to My Courses
          </Button>
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-xs text-slate-400">Loading course syllabus and indexed materials...</p>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">{error || 'Course not found'}</h3>
        <Link to="/courses">
          <Button variant="outline" size="sm" className="text-xs">
            Back to All Courses
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          to="/courses"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Courses</span>
        </Link>
      </div>

      {/* Course Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-emerald-950/40 border border-emerald-500/20 p-6 md:p-8 shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="emerald" size="sm">
                {course.subject}
              </Badge>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Created {new Date(course.createdAt).toLocaleDateString()}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {course.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {course.description || 'No course description provided.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="md"
              onClick={openEditModal}
              className="text-xs font-semibold border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/80 text-slate-200"
              leftIcon={<Pencil className="w-3.5 h-3.5 text-emerald-400" />}
            >
              Edit Course
            </Button>
            <Link to="/study">
              <Button
                variant="primary"
                size="md"
                className="text-xs font-semibold bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-600 shadow-md shadow-emerald-950/30"
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Ask Course Tutor
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <Card className="p-6 md:p-8 bg-slate-900/60 border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-emerald-400" />
              Upload Learning Materials
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload textbook PDFs or lecture slide decks (PPT/PPTX). Text, page numbers, and slide numbers
              are automatically extracted into structured grounding chunks.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Badge variant="rose" size="sm">PDF</Badge>
            <Badge variant="amber" size="sm">PPT / PPTX</Badge>
            <Badge variant="indigo" size="sm">MP4 Video</Badge>
          </div>
        </div>

        {uploadError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Drag & Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
              : 'border-slate-800 bg-slate-950/40 hover:border-emerald-500/40 hover:bg-slate-950/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.ppt,.pptx,.mp4"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />

          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                {isUploading ? 'Uploading & Processing Document...' : 'Click to upload or drag & drop files here'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports PDF textbooks, PPT/PPTX lecture slides, and MP4 videos (up to 200MB)
              </p>
            </div>

            {isUploading && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Uploading to course knowledgebase...</span>
                  <span className="font-bold text-emerald-400">{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Uploaded Materials List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              Structured Course Materials ({materials.length})
            </h3>
            <p className="text-xs text-slate-400">
              Preserves page numbers (PDF) and slide numbers (PPT/PPTX) for exact citation grounding
            </p>
          </div>
        </div>

        {materials.length === 0 ? (
          /* Empty Materials State */
          <Card className="p-8 text-center bg-slate-900/40 border-dashed border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">No materials uploaded yet</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Drag and drop your syllabus, presentation slides, or textbook chapter above to start
                grounding AI answers.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {materials.map((mat) => {
              const active = processingStatusMap[mat.materialId]
              const isProcessing = !!active || mat.processingStatus === 'processing'
              const isProcessed = mat.processingStatus === 'processed'
              const isFailed = mat.processingStatus === 'failed'

              return (
                <Card
                  key={mat.materialId}
                  hover
                  className="p-4 bg-slate-900/60 border-slate-800/80 flex flex-col gap-3 transition-all duration-200 hover:border-slate-700"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* File Icon & Info */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-center shrink-0">
                        {getTypeIcon(mat.type)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white truncate max-w-md">
                            {mat.name}
                          </h4>
                          <Badge variant={getTypeBadgeVariant(mat.type)} size="sm">
                            {mat.type}
                          </Badge>
                          {renderStatusBadge(mat)}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>{formatFileSize(mat.fileSizeBytes)}</span>
                          <span>•</span>
                          <span>Uploaded {new Date(mat.uploadedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
                      {/* View Chunks Button */}
                      {(isProcessed || (mat.chunksCount && mat.chunksCount > 0)) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingChunksMaterial(mat)}
                          className="text-xs px-3 py-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          View Chunks ({mat.chunksCount || 'Inspect'})
                        </Button>
                      )}

                      {/* Process / Reprocess Button */}
                      {!isProcessing && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleProcessMaterial(mat)}
                          className="text-xs px-2.5 py-1.5 border-slate-700 text-slate-300 hover:text-white hover:border-emerald-500/40"
                          leftIcon={
                            isProcessed ? (
                              <RefreshCw className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5 text-emerald-400" />
                            )
                          }
                          title={isProcessed ? 'Reprocess Material' : 'Extract Chunks'}
                        >
                          {isProcessed ? 'Reprocess' : 'Process Chunks'}
                        </Button>
                      )}

                      {/* Open Raw File */}
                      {mat.downloadURL && (
                        <a
                          href={mat.downloadURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex"
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs px-2.5 py-1.5 text-slate-400 hover:text-white"
                            rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                          >
                            File
                          </Button>
                        </a>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() =>
                          handleDeleteMaterial(mat.materialId, mat.storagePath, mat.name)
                        }
                        disabled={deletingMaterialId === mat.materialId}
                        title="Delete Material"
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        {deletingMaterialId === mat.materialId ? (
                          <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Processing Progress Bar */}
                  {isProcessing && active && (
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
                          {active.stage}
                        </span>
                        <span className="font-bold text-emerald-400">{active.percent}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-300"
                          style={{ width: `${active.percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error Message if Failed */}
                  {isFailed && mat.errorMessage && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{mat.errorMessage}</span>
                      </div>
                      <button
                        onClick={() => handleProcessMaterial(mat)}
                        className="font-semibold text-rose-200 underline hover:text-white"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Chunk Viewer Modal */}
      <ChunkViewerModal
        isOpen={!!viewingChunksMaterial}
        onClose={() => setViewingChunksMaterial(null)}
        material={viewingChunksMaterial}
        courseId={course.courseId}
      />

      {/* Edit Course Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#0D1322] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Edit Course Details</h3>
                  <p className="text-xs text-slate-400">
                    Update course title, discipline, or description.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCourseEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Course Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Subject / Discipline <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Course Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSavingEdit}
                  className="text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CourseDetailPage
