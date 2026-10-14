import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  UploadCloud,
  FileText,
  Presentation,
  Video,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
  Sparkles,
  BookOpen,
  Eye,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import {
  getAllUserMaterials,
  getUserCourses,
  createCourse,
  addCourseMaterial,
  deleteCourseMaterial,
} from '@/lib/supabase/db'
import { uploadCourseMaterialFile, isSupportedMaterialFile } from '@/lib/supabase/storage'
import { processUploadedMaterial } from '@/services/extraction'
import { ChunkViewerModal } from '@/components/materials/ChunkViewerModal'
import { UploadMaterialModal } from '@/components/materials/UploadMaterialModal'
import type { Course, CourseMaterial, CourseMaterialType } from '@/types/course'

export const MaterialsPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Data States
  const [materials, setMaterials] = useState<(CourseMaterial & { courseTitle?: string })[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFormat, setSelectedFormat] = useState<string>('All')
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('All')

  // Direct Ingestion Area States
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadPercent, setUploadPercent] = useState(0)
  const [statusStage, setStatusStage] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Inline Quick Course Creation
  const [isCreatingCourse, setIsCreatingCourse] = useState(false)
  const [newCourseTitle, setNewCourseTitle] = useState('')
  const [newCourseSubject, setNewCourseSubject] = useState('')

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(searchParams.get('upload') === 'true')
  const [viewingChunksMaterial, setViewingChunksMaterial] = useState<CourseMaterial | null>(null)
  const [deletingMaterialId, setDeletingMaterialId] = useState<string | null>(null)

  // Demo Materials for Hackathon Walkthrough
  const demoMaterials: (CourseMaterial & { courseTitle?: string })[] = [
    {
      materialId: 'demo_mat_raft',
      courseId: 'demo_cs452',
      courseTitle: 'CS 452: Distributed Systems',
      name: 'In Search of an Understandable Consensus Algorithm (Raft).pdf',
      type: 'PDF',
      storagePath: 'courses/demo_cs452/raft.pdf',
      downloadURL: 'https://raft.github.io/raft.pdf',
      size: 1024 * 480,
      processingStatus: 'processed',
      chunksCount: 28,
      uploadedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      materialId: 'demo_mat_backprop',
      courseId: 'demo_cs501',
      courseTitle: 'CS 501: Deep Learning Architectures',
      name: 'Lecture 04 - Backpropagation & Matrix Derivatives.pptx',
      type: 'PPTX',
      storagePath: 'courses/demo_cs501/lecture04.pptx',
      downloadURL: 'https://example.com/lecture04.pptx',
      size: 1024 * 1024 * 3.2,
      processingStatus: 'processed',
      chunksCount: 19,
      uploadedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      materialId: 'demo_mat_video',
      courseId: 'demo_cs452',
      courseTitle: 'CS 452: Distributed Systems',
      name: 'Lecture 12 - Two-Phase Commit Protocols.mp4',
      type: 'MP4',
      storagePath: 'courses/demo_cs452/lecture12.mp4',
      downloadURL: 'https://example.com/lecture12.mp4',
      size: 1024 * 1024 * 18.5,
      processingStatus: 'processed',
      chunksCount: 14,
      uploadedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
  ]

  // Load User Data
  const loadData = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [allMats, userCourses] = await Promise.all([
        getAllUserMaterials(user.uid),
        getUserCourses(user.uid),
      ])
      setMaterials(allMats)
      setCourses(userCourses)
      if (userCourses.length > 0 && !selectedCourseId) {
        setSelectedCourseId(userCourses[0].courseId)
      }
    } catch (err: any) {
      console.warn('Error loading materials:', err)
      setError(err?.message || 'Failed to load materials library.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  // Drag and drop handlers
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
      handleFileSelected(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0])
    }
  }

  const handleFileSelected = (file: File) => {
    setUploadError(null)
    const check = isSupportedMaterialFile(file)
    if (!check.valid) {
      setUploadError(
        check.error ||
          'Unsupported file format. Please upload a PDF (.pdf), PowerPoint (.pptx/.ppt), or MP4 video (.mp4).'
      )
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
  }

  // Quick Ingestion Trigger
  const handleProcessAndUpload = async () => {
    if (!user) {
      setUploadError('Please log in to upload materials.')
      return
    }
    if (!selectedFile) {
      setUploadError('Please choose a file to upload.')
      return
    }

    let targetCourseId = selectedCourseId

    if (isCreatingCourse || !targetCourseId) {
      if (!newCourseTitle.trim()) {
        setUploadError('Please enter a course name to assign this material to.')
        return
      }
      try {
        const created = await createCourse(user.uid, {
          title: newCourseTitle.trim(),
          subject: newCourseSubject.trim() || 'General Studies',
          description: `Course for ${newCourseTitle.trim()}`,
        })
        setCourses((prev) => [created, ...prev])
        targetCourseId = created.courseId
        setSelectedCourseId(created.courseId)
        setIsCreatingCourse(false)
      } catch (err: any) {
        setUploadError(err?.message || 'Could not create course.')
        return
      }
    }

    setIsUploading(true)
    setUploadError(null)
    setUploadPercent(10)
    setStatusStage('Uploading file to storage...')

    try {
      const { downloadURL, storagePath, fileType } = await uploadCourseMaterialFile(
        targetCourseId,
        selectedFile,
        (progress) => {
          setUploadPercent(10 + Math.round((progress / 100) * 35))
          setStatusStage(`Uploading file (${progress}%)...`)
        }
      )

      setStatusStage('Saving file metadata...')
      setUploadPercent(45)

      const courseObj = courses.find((c) => c.courseId === targetCourseId)
      const newMat = await addCourseMaterial(targetCourseId, {
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

      // Add to UI immediately
      const uiRecord = { ...newMat, courseTitle: courseObj?.title || 'Course' }
      setMaterials((prev) => [uiRecord, ...prev])

      setStatusStage('Extracting text & parsing slides/pages...')
      setUploadPercent(50)

      const result = await processUploadedMaterial({
        courseId: targetCourseId,
        material: newMat,
        fileData: selectedFile,
        onProgress: (stage, percent) => {
          setStatusStage(stage)
          setUploadPercent(50 + Math.round((percent / 100) * 48))
        },
      })

      // Update state with processed counts
      setMaterials((prev) =>
        prev.map((m) =>
          m.materialId === newMat.materialId
            ? {
                ...m,
                processingStatus: 'processed',
                chunksCount: result.totalChunks,
              }
            : m
        )
      )

      setUploadPercent(100)
      setStatusStage('Processing complete!')
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      console.error('Ingestion failed:', err)
      setUploadError(err?.message || 'Failed to process document.')
    } finally {
      setIsUploading(false)
    }
  }

  // Delete Material
  const handleDelete = async (mat: CourseMaterial & { courseTitle?: string }) => {
    if (!confirm(`Are you sure you want to delete "${mat.name}"?`)) return
    setDeletingMaterialId(mat.materialId)
    try {
      await deleteCourseMaterial(mat.courseId, mat.materialId)
      setMaterials((prev) => prev.filter((m) => m.materialId !== mat.materialId))
    } catch (err: any) {
      alert(err?.message || 'Could not delete material.')
    } finally {
      setDeletingMaterialId(null)
    }
  }

  // Format File Size
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

  // Filtered Materials
  const displayMaterials = materials.length > 0 ? materials : demoMaterials

  const filteredMaterials = displayMaterials.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.courseTitle && m.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesFormat =
      selectedFormat === 'All' ||
      m.type.toUpperCase() === selectedFormat.toUpperCase() ||
      (selectedFormat === 'PPTX' && (m.type === 'PPT' || m.type === 'PPTX'))
    const matchesCourse =
      selectedCourseFilter === 'All' || m.courseId === selectedCourseFilter

    return matchesSearch && matchesFormat && matchesCourse
  })

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 border border-emerald-500/20 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="emerald" size="sm" className="font-extrabold uppercase tracking-wider text-[10px]">
              Document Ingestion & RAG
            </Badge>
            <span className="text-xs text-slate-400">
              {displayMaterials.length} {displayMaterials.length === 1 ? 'Source Document' : 'Source Documents'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Learning Materials Library
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Upload textbooks, lecture slide decks, and class recordings. MENTORA AI extracts exact
            pages, slides, and video timestamps to generate ground-truth citations for tutoring and quizzes.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/courses')}
            leftIcon={<BookOpen className="w-4 h-4" />}
            className="text-xs border-slate-700"
          >
            Manage Courses
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsUploadModalOpen(true)}
            leftIcon={<UploadCloud className="w-4 h-4" />}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 text-xs sm:text-sm"
          >
            + Upload Material
          </Button>
        </div>
      </div>

      {/* 2. Direct Ingestion / Drag-and-Drop Dropzone Card */}
      <Card className="p-6 bg-slate-900/80 border-slate-800 rounded-3xl shadow-lg space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Direct Document Ingestion</h2>
              <p className="text-[11px] text-slate-400">
                Select a file to parse, chunk, embed, and index into your knowledge graph.
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Badge variant="rose" size="sm">PDF</Badge>
            <Badge variant="amber" size="sm">PPTX / PPT</Badge>
            <Badge variant="indigo" size="sm">MP4 Video</Badge>
            <span className="text-[10px] text-slate-500">Max 50MB</span>
          </div>
        </div>

        {/* Course Target Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            {isCreatingCourse || courses.length === 0 ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="New Course Name (e.g. CS 101)"
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Subject (e.g. Computer Science)"
                  value={newCourseSubject}
                  onChange={(e) => setNewCourseSubject(e.target.value)}
                  className="w-full sm:w-48 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
                {courses.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsCreatingCourse(false)}
                    className="text-xs text-slate-400"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 shrink-0 font-medium">Assign to Course:</span>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  disabled={isUploading}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {courses.map((c) => (
                    <option key={c.courseId} value={c.courseId}>
                      {c.title} ({c.subject})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsCreatingCourse(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-1 shrink-0"
                >
                  + New Course
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Drag and Drop Box */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-emerald-500 bg-emerald-500/10'
              : selectedFile
              ? 'border-emerald-500/40 bg-slate-950/60'
              : 'border-slate-800 hover:border-slate-700 bg-slate-950/30'
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs sm:text-sm font-bold text-white line-clamp-1">{selectedFile.name}</p>
                  <p className="text-[11px] text-emerald-400">{formatFileSize(selectedFile.size)} • Click or drop to replace</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleProcessAndUpload()
                  }}
                  disabled={isUploading}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs"
                  leftIcon={
                    isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />
                  }
                >
                  {isUploading ? 'Processing...' : 'Upload & Process Now'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              <p className="text-xs sm:text-sm font-bold text-slate-200">
                Drag and drop your document here, or <span className="text-emerald-400 underline">browse your device</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Supports PDF textbooks/papers, PPT/PPTX slides, and MP4 lecture videos (up to 50MB)
              </p>
            </div>
          )}
        </div>

        {/* Live Processing Progress Indicator */}
        {isUploading && (
          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span className="flex items-center gap-2 text-emerald-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {statusStage || 'Processing document...'}
              </span>
              <span>{uploadPercent}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Alert */}
        {uploadError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="flex-1">{uploadError}</span>
          </div>
        )}
      </Card>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search uploaded materials by filename or course..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Course Filter Dropdown if courses exist */}
        {courses.length > 0 && (
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 shrink-0"
          >
            <option value="All">All Courses</option>
            {courses.map((c) => (
              <option key={c.courseId} value={c.courseId}>
                {c.title}
              </option>
            ))}
          </select>
        )}

        {/* Format Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['All', 'PDF', 'PPTX', 'MP4'].map((fmt) => (
            <button
              key={fmt}
              onClick={() => setSelectedFormat(fmt)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                selectedFormat === fmt
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-900/40 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {fmt === 'All' ? 'All Formats' : fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert if load failed */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadData} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* 4. Materials Table / Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-xs text-slate-400">Loading your materials library...</p>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/40 border-dashed border-slate-800 space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No materials found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'No documents matched your search filter.'
                : 'Upload your first syllabus, lecture slides, or textbook to begin grounding your AI tutor.'}
            </p>
          </div>
          <Button
            size="md"
            variant="primary"
            onClick={() => setIsUploadModalOpen(true)}
            leftIcon={<UploadCloud className="w-4 h-4" />}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
          >
            Upload Document
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((mat) => (
            <Card
              key={mat.materialId}
              className="p-5 bg-slate-900/80 border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                      {getTypeIcon(mat.type)}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        {mat.courseTitle || 'Course Material'}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 group-hover:text-emerald-300 transition-colors">
                        {mat.name}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Metadata & Status */}
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 pt-1">
                  <Badge
                    variant={
                      mat.type === 'PDF'
                        ? 'rose'
                        : mat.type === 'PPTX' || mat.type === 'PPT'
                        ? 'amber'
                        : 'indigo'
                    }
                    size="sm"
                  >
                    {mat.type}
                  </Badge>

                  <span>{formatFileSize(mat.size)}</span>
                  <span>•</span>
                  <span>{new Date(mat.uploadedAt).toLocaleDateString()}</span>
                </div>

                {/* Processing Status Badge */}
                <div>
                  {mat.processingStatus === 'processed' ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ready for AI Grounding</span>
                      {mat.chunksCount !== undefined && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold ml-1">
                          {mat.chunksCount} chunks
                        </span>
                      )}
                    </div>
                  ) : mat.processingStatus === 'processing' ? (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting content...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{mat.errorMessage || 'Processing incomplete'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewingChunksMaterial(mat)}
                    className="text-xs px-2.5 py-1 border-slate-800 hover:border-slate-700"
                    title="Inspect extracted chunks and citations"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(mat)}
                    disabled={deletingMaterialId === mat.materialId}
                    className="text-xs px-2.5 py-1 border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400"
                    title="Delete material"
                  >
                    {deletingMaterialId === mat.materialId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate(`/tutor?courseId=${mat.courseId}&materialId=${mat.materialId}`)}
                    className="text-xs px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
                    leftIcon={<Sparkles className="w-3 h-3" />}
                  >
                    Ask Tutor
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/quiz?courseId=${mat.courseId}&materialId=${mat.materialId}`)}
                    className="text-xs px-2.5 py-1"
                  >
                    Quiz
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reusable Upload Modal */}
      <UploadMaterialModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => loadData()}
      />

      {/* Chunk Viewer Modal */}
      {viewingChunksMaterial && (
        <ChunkViewerModal
          isOpen={Boolean(viewingChunksMaterial)}
          onClose={() => setViewingChunksMaterial(null)}
          material={viewingChunksMaterial}
          courseId={viewingChunksMaterial.courseId}
        />
      )}
    </div>
  )
}

export default MaterialsPage
