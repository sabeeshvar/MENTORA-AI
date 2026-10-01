import React, { useState } from 'react'
import {
  UploadCloud,
  FileText,
  Video,
  Presentation,
  CheckCircle2,
  Trash2,
} from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import type { MaterialType } from '@/types/material'

export const MaterialsPage: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | MaterialType>('all')
  const [dragActive, setDragActive] = useState(false)

  const sampleMaterials = [
    {
      id: 'mat-1',
      title: 'Distributed Systems & Consensus Algorithms.pdf',
      type: 'pdf' as MaterialType,
      size: '4.2 MB',
      pages: 42,
      status: 'ready',
      topics: ['Raft', 'Paxos', 'Byzantine Faults'],
      createdAt: '2 hours ago',
    },
    {
      id: 'mat-2',
      title: 'Neural Networks Architecture Lecture.pptx',
      type: 'pptx' as MaterialType,
      size: '18.6 MB',
      pages: 58,
      status: 'ready',
      topics: ['Backpropagation', 'Attention', 'Transformers'],
      createdAt: 'Yesterday',
    },
    {
      id: 'mat-3',
      title: 'Database Transactions & ACID Properties.mp4',
      type: 'video' as MaterialType,
      size: '142 MB',
      pages: 0,
      duration: '48m 12s',
      status: 'ready',
      topics: ['2PL Locking', 'Write-Ahead Log', 'Isolation Levels'],
      createdAt: '3 days ago',
    },
  ]

  const filtered =
    selectedFilter === 'all'
      ? sampleMaterials
      : sampleMaterials.filter((m) => m.type === selectedFilter)

  const getIcon = (type: MaterialType) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-indigo-400" />
      case 'pptx':
        return <Presentation className="w-5 h-5 text-amber-400" />
      case 'video':
        return <Video className="w-5 h-5 text-rose-400" />
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Course Materials</h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload PDFs, PPT/PPTX slides, and lecture videos for multimodal grounding.
          </p>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
        }}
        className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-300 ${
          dragActive
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
        }`}
      >
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/10">
          <UploadCloud className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">
          Drag and drop course documents here
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-5">
          Supports <span className="text-slate-300">PDF textbooks</span>,{' '}
          <span className="text-slate-300">PowerPoint slides (.ppt, .pptx)</span>, and{' '}
          <span className="text-slate-300">Lecture recordings (.mp4, .mov)</span>.
        </p>
        <label className="inline-block cursor-pointer">
          <input
            type="file"
            className="hidden"
            accept=".pdf,.ppt,.pptx,.mp4,.mov"
            multiple
          />
          <Button variant="primary" size="md">
            Browse Files
          </Button>
        </label>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(['all', 'pdf', 'pptx', 'video'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                selectedFilter === tab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900/70 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab === 'all' ? 'All Files' : tab.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="text-white font-medium">{filtered.length}</span> materials
        </div>
      </div>

      {/* Materials List */}
      <div className="space-y-3">
        {filtered.map((mat) => (
          <Card key={mat.id} hover className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                {getIcon(mat.type)}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{mat.title}</h4>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="default" size="sm">
                    {mat.size}
                  </Badge>
                  {mat.pages ? (
                    <Badge variant="outline" size="sm">
                      {mat.pages} Pages
                    </Badge>
                  ) : (
                    <Badge variant="outline" size="sm">
                      {mat.duration}
                    </Badge>
                  )}
                  <Badge variant="emerald" size="sm">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Indexed & Ready
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button variant="outline" size="sm" className="text-xs">
                Ask Questions
              </Button>
              <button
                className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Delete Material"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
