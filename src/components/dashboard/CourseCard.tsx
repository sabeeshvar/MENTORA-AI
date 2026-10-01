import React from 'react'
import { BookOpen, ArrowRight, Clock, Layers } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { cn } from '@/lib/utils'

export interface CourseData {
  id: string
  title: string
  code?: string
  category?: string
  progress: number
  materialsCount: number
  lastStudied?: string
  topicsCount?: number
  topics?: string[]
}

export interface CourseCardProps {
  course: CourseData
  onContinue?: (courseId: string) => void
  className?: string
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onContinue,
  className,
}) => {
  return (
    <Card
      hover
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 flex flex-col justify-between transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-950/20',
        className
      )}
    >
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            {course.code && (
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60">
                {course.code}
              </span>
            )}
          </div>
          {course.category && (
            <Badge variant="emerald" size="sm">
              {course.category}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1 mb-2">
          {course.title}
        </h3>

        {/* Topic Chips */}
        {course.topics && course.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {course.topics.slice(0, 3).map((topic, i) => (
              <span
                key={i}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-950/70 border border-slate-800 text-slate-400"
              >
                {topic}
              </span>
            ))}
            {course.topics.length > 3 && (
              <span className="text-[10px] text-slate-500 px-1 py-0.5">
                +{course.topics.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Mastery Progress</span>
            <span className="font-bold text-emerald-400">{course.progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-400 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, course.progress))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            {course.materialsCount} {course.materialsCount === 1 ? 'file' : 'files'}
          </span>
          {course.lastStudied && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Clock className="w-3 h-3 text-slate-600" />
              {course.lastStudied}
            </span>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onContinue && onContinue(course.id)}
          className="text-xs px-2.5 py-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500/50"
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          Study
        </Button>
      </div>
    </Card>
  )
}
