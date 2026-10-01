import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Network,
  Sparkles,
  Award,
  ArrowRight,
  FileText,
  Presentation,
  Compass,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import {
  getUserCourses,
  getCourseMaterials,
  getMaterialChunks,
  getUserTopicMasteries,
} from '@/lib/firebase/firestore'
import { KnowledgeMapService } from '@/services/knowledgeMapService'
import { getMasteryStatus } from '@/types/mastery'
import type { CourseKnowledgeMap, TopicNode, ConceptNode } from '@/types/knowledgeMap'
import type { Course } from '@/types/course'
import type { ProcessedChunk } from '@/types/chunk'

export const KnowledgeMapPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [chunks, setChunks] = useState<ProcessedChunk[]>([])
  const [knowledgeMap, setKnowledgeMap] = useState<CourseKnowledgeMap | null>(null)
  const [loading, setLoading] = useState(true)

  // Drawer / Inspector for clicked node
  const [selectedNode, setSelectedNode] = useState<{
    topic: TopicNode
    concept?: ConceptNode
  } | null>(null)

  // Load User Courses on mount
  useEffect(() => {
    if (!user) return
    getUserCourses(user.uid)
      .then((data) => {
        setCourses(data)
        if (data.length > 0 && !selectedCourseId) {
          setSelectedCourseId(data[0].courseId)
        }
      })
      .catch((err) => console.warn('Failed to load courses for knowledge map:', err))
  }, [user])

  // Load Course Chunks & Masteries when course changes
  useEffect(() => {
    if (!selectedCourseId || !user) return
    setLoading(true)

    Promise.all([
      getCourseMaterials(selectedCourseId, user.uid),
      getUserTopicMasteries(user.uid),
    ])
      .then(async ([mats, userMasteries]) => {
        const allChunks: ProcessedChunk[] = []
        for (const mat of mats) {
          try {
            const matChunks = await getMaterialChunks(selectedCourseId, mat.materialId)
            allChunks.push(...matChunks)
          } catch {
            // Continue
          }
        }
        setChunks(allChunks)

        const currentCourse = courses.find((c) => c.courseId === selectedCourseId)
        const map = KnowledgeMapService.buildKnowledgeMap(
          selectedCourseId,
          currentCourse?.title || 'Current Course',
          allChunks,
          userMasteries
        )
        setKnowledgeMap(map)
      })
      .catch((err) => console.warn('Error constructing knowledge map:', err))
      .finally(() => setLoading(false))
  }, [selectedCourseId, user, courses])

  const selectedCourse = courses.find((c) => c.courseId === selectedCourseId)

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">Course Knowledge Map</h1>
            <Badge variant="emerald" size="sm">
              Hierarchical Architecture
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Interactive prerequisite and mastery graph synthesized from your course reading materials.
          </p>
        </div>

        {/* Course Selector */}
        {courses.length > 0 && (
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500 self-start sm:self-auto"
          >
            {courses.map((c) => (
              <option key={c.courseId} value={c.courseId}>
                {c.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Empty State if Course has no chunks */}
      {chunks.length === 0 && !loading && (
        <Card className="p-8 text-center space-y-4 bg-slate-900/40 border-dashed border-slate-800">
          <Network className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-200">No Learning Materials Indexed</h3>
            <p className="text-xs text-slate-400">
              Upload PDF textbooks or presentation slides to{' '}
              <strong>{selectedCourse?.title || 'your course'}</strong> to automatically generate a
              structured, interactive course knowledge graph.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate(`/courses/${selectedCourseId}`)}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Upload Course Materials
          </Button>
        </Card>
      )}

      {/* Main Hierarchy Grid & Inspector */}
      {knowledgeMap && knowledgeMap.modules.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left 2 Cols: Hierarchical Map */}
          <div className="lg:col-span-2 space-y-6">
            {knowledgeMap.modules.map((module) => (
              <div key={module.id} className="space-y-3">
                {/* Module Heading */}
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
                    {module.title}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    ({module.topics.length} topics)
                  </span>
                </div>

                {/* Topics in Module */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {module.topics.map((topic) => {
                    const statusInfo = getMasteryStatus(topic.masteryScore)
                    const isSelected = selectedNode?.topic.id === topic.id

                    return (
                      <Card
                        key={topic.id}
                        hover
                        onClick={() => setSelectedNode({ topic })}
                        className={`p-4 cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/40'
                            : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant={statusInfo.color} size="sm">
                              {statusInfo.label}
                            </Badge>

                            {topic.attempts > 0 ? (
                              <span className="text-[10px] text-slate-400">
                                {topic.attempts} attempts
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Unattempted</span>
                            )}
                          </div>

                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2">
                              {topic.name}
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-1 truncate">
                              Source: {topic.sourceMaterials.join(', ')}
                            </p>
                          </div>

                          {/* Mastery Bar */}
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                              <span>Mastery</span>
                              <span className="font-bold text-white">
                                {Math.round(topic.masteryScore * 100)}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                                style={{ width: `${Math.round(topic.masteryScore * 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Prerequisites tag if available */}
                          {topic.prerequisites && topic.prerequisites.length > 0 && (
                            <div className="text-[10px] text-slate-500 pt-1 flex items-center gap-1 truncate">
                              <span className="text-slate-400 font-semibold">Prereq:</span>
                              <span className="truncate">{topic.prerequisites.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Right Col: Node Inspector & Instant Action Panel */}
          <div className="lg:col-span-1 sticky top-6 space-y-4">
            {selectedNode ? (
              <Card className="p-6 bg-slate-900 border-slate-700/80 shadow-2xl space-y-5 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5" />
                      Topic Node Inspector
                    </span>
                    <Badge
                      variant={getMasteryStatus(selectedNode.topic.masteryScore).color}
                      size="sm"
                    >
                      {getMasteryStatus(selectedNode.topic.masteryScore).label}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1.5 leading-snug">
                    {selectedNode.topic.name}
                  </h3>
                </div>

                {/* Mastery Overview */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Current Mastery Level</span>
                    <span className="font-bold text-white font-mono">
                      {Math.round(selectedNode.topic.masteryScore * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                      style={{ width: `${Math.round(selectedNode.topic.masteryScore * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                    <span>{selectedNode.topic.attempts} question attempts</span>
                    <span>Status: {selectedNode.topic.status}</span>
                  </div>
                </div>

                {/* Grounded Source References */}
                <div className="space-y-2 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Source Material References
                  </span>
                  {selectedNode.topic.sourceMaterials.map((src, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center gap-2 text-slate-300"
                    >
                      {src.endsWith('.pdf') ? (
                        <FileText className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      ) : (
                        <Presentation className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="truncate">{src}</span>
                    </div>
                  ))}
                </div>

                {/* Subtopics & Concepts */}
                {selectedNode.topic.subtopics.length > 0 && (
                  <div className="space-y-2 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Indexed Subtopics & Concepts
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {selectedNode.topic.subtopics[0].concepts.map((conc) => (
                        <div
                          key={conc.id}
                          className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-1"
                        >
                          <span className="font-semibold text-slate-200 block text-[11px]">
                            {conc.name}
                          </span>
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            {conc.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct Adaptive Actions */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <Button
                    size="md"
                    variant="primary"
                    className="w-full justify-center"
                    onClick={() =>
                      navigate(
                        `/tutor?courseId=${selectedCourseId}&topic=${encodeURIComponent(
                          selectedNode.topic.name
                        )}`
                      )
                    }
                    leftIcon={<Sparkles className="w-4 h-4" />}
                  >
                    Ask AI Tutor About This
                  </Button>

                  <Button
                    size="md"
                    variant="outline"
                    className="w-full justify-center"
                    onClick={() =>
                      navigate(
                        `/quiz?courseId=${selectedCourseId}&topic=${encodeURIComponent(
                          selectedNode.topic.name
                        )}`
                      )
                    }
                    leftIcon={<Award className="w-4 h-4" />}
                  >
                    Take Targeted Quiz
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center space-y-3 bg-slate-900/40 border-dashed border-slate-800">
                <Compass className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-xs font-bold text-slate-300">No Topic Selected</h4>
                <p className="text-[11px] text-slate-500">
                  Click any topic node in the hierarchy to inspect its grounded AI overview,
                  verified citations, and take a targeted quiz.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default KnowledgeMapPage
