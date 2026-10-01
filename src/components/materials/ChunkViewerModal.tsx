import React, { useState, useEffect } from 'react'
import {
  X,
  Layers,
  FileText,
  Presentation,
  BookOpen,
  Search,
  Check,
  Copy,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { getMaterialChunks } from '@/lib/firebase/firestore'
import type { ProcessedChunk } from '@/types/chunk'
import type { CourseMaterial } from '@/types/course'

interface ChunkViewerModalProps {
  isOpen: boolean
  onClose: () => void
  material: CourseMaterial | null
  courseId: string
}

export const ChunkViewerModal: React.FC<ChunkViewerModalProps> = ({
  isOpen,
  onClose,
  material,
  courseId,
}) => {
  const [chunks, setChunks] = useState<ProcessedChunk[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChunk, setSelectedChunk] = useState<ProcessedChunk | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !material) {
      setChunks([])
      setSelectedChunk(null)
      setSearchQuery('')
      setError(null)
      return
    }

    const fetchChunks = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getMaterialChunks(courseId, material.materialId)
        setChunks(data)
        if (data.length > 0) {
          setSelectedChunk(data[0])
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load chunks.')
      } finally {
        setLoading(false)
      }
    }

    fetchChunks()
  }, [isOpen, material, courseId])

  if (!isOpen || !material) return null

  const filteredChunks = chunks.filter((chk) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      chk.text.toLowerCase().includes(q) ||
      chk.sectionTitle.toLowerCase().includes(q) ||
      chk.chunkId.toLowerCase().includes(q) ||
      (chk.pageNumber !== undefined && `page ${chk.pageNumber}`.includes(q)) ||
      (chk.slideNumber !== undefined && `slide ${chk.slideNumber}`.includes(q))
    )
  })

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              {material.type === 'PDF' ? (
                <FileText className="w-5 h-5 text-rose-400" />
              ) : (
                <Presentation className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white truncate max-w-md">
                  {material.name}
                </h3>
                <Badge variant="emerald" size="sm">
                  {chunks.length} Chunks
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Grounding Knowledge Units with verified source citations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-xs text-slate-400">Loading structured chunks from Firestore...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
            <AlertCircle className="w-10 h-10 text-rose-400" />
            <p className="text-sm text-slate-300">{error}</p>
          </div>
        ) : chunks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
            <Layers className="w-10 h-10 text-slate-600" />
            <h4 className="text-base font-bold text-white">No Chunks Extracted Yet</h4>
            <p className="text-xs text-slate-400 max-w-md">
              This material has not been processed into chunks yet. Click &quot;Process Content&quot;
              on the course page to extract page and slide grounding units.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            {/* Sidebar: Chunk List */}
            <div className="w-full md:w-80 border-r border-slate-800 flex flex-col bg-slate-950/40">
              {/* Search Bar */}
              <div className="p-3 border-b border-slate-800">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search chunk text or page..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Chunk List Scrollable */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
                {filteredChunks.map((chunk) => {
                  const isSelected = selectedChunk?.chunkId === chunk.chunkId
                  return (
                    <button
                      key={chunk.chunkId}
                      onClick={() => setSelectedChunk(chunk)}
                      className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500'
                          : 'hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white truncate">
                          {chunk.sectionTitle}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          #{chunk.chunkIndex}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {chunk.pageNumber !== undefined && (
                          <span className="text-[10px] font-semibold text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded">
                            Page {chunk.pageNumber}
                          </span>
                        )}
                        {chunk.slideNumber !== undefined && (
                          <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            Slide {chunk.slideNumber}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {chunk.wordCount || chunk.text.split(/\s+/).length} words
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {chunk.text}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Chunk Detail Panel */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-900/30 overflow-y-auto p-6 space-y-6">
              {selectedChunk ? (
                <>
                  {/* Metadata Header */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="emerald" size="sm">
                          Chunk #{selectedChunk.chunkIndex}
                        </Badge>
                        {selectedChunk.pageNumber !== undefined && (
                          <Badge variant="rose" size="sm">
                            Page {selectedChunk.pageNumber}
                          </Badge>
                        )}
                        {selectedChunk.slideNumber !== undefined && (
                          <Badge variant="amber" size="sm">
                            Slide {selectedChunk.slideNumber}
                          </Badge>
                        )}
                        <Badge variant="outline" size="sm">
                          {selectedChunk.sourceType}
                        </Badge>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(selectedChunk.text, selectedChunk.chunkId)
                        }
                        className="text-xs px-2.5 py-1 border-slate-700 text-slate-300"
                        leftIcon={
                          copiedId === selectedChunk.chunkId ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )
                        }
                      >
                        {copiedId === selectedChunk.chunkId ? 'Copied' : 'Copy Text'}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1 border-t border-slate-800/60">
                      <div>
                        <span className="text-slate-500 block">Section Title</span>
                        <span className="font-semibold text-white truncate block">
                          {selectedChunk.sectionTitle}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Source Material</span>
                        <span className="font-semibold text-white truncate block">
                          {selectedChunk.sourceName}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Dimensions</span>
                        <span className="font-semibold text-white">
                          {selectedChunk.charCount || selectedChunk.text.length} chars (
                          {selectedChunk.wordCount || selectedChunk.text.split(/\s+/).length} words)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Chunk ID</span>
                        <span className="font-mono text-[11px] text-emerald-400 truncate block">
                          {selectedChunk.chunkId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cleaned Text Body */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                      Extracted Text Content (For Grounded AI Context)
                    </h4>
                    <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 font-sans text-sm text-slate-200 leading-relaxed whitespace-pre-wrap selection:bg-emerald-500/30">
                      {selectedChunk.text}
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Select a chunk from the sidebar to inspect its content and citation metadata.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>Grounded retrieval unit &bull; Preserves exact page/slide citations</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
