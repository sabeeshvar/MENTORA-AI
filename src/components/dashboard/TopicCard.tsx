import React from 'react'
import { AlertCircle, Target, ArrowRight, BookOpen } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { cn } from '@/lib/utils'

export interface WeakTopicData {
  id: string
  name: string
  course: string
  accuracy: number
  questionsAttempted: number
  status: 'critical' | 'needs-review' | 'improving'
  recommendedAction?: string
}

export interface TopicCardProps {
  topic: WeakTopicData
  onPractice?: (topicId: string) => void
  className?: string
}

export const TopicCard: React.FC<TopicCardProps> = ({
  topic,
  onPractice,
  className,
}) => {
  const statusConfig = {
    critical: {
      label: 'Needs Priority Focus',
      badgeVariant: 'rose' as const,
      textColor: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/20',
      barColor: 'bg-rose-500',
    },
    'needs-review': {
      label: 'Needs Review',
      badgeVariant: 'amber' as const,
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      barColor: 'bg-amber-400',
    },
    improving: {
      label: 'Strengthening',
      badgeVariant: 'emerald' as const,
      textColor: 'text-teal-400',
      bgColor: 'bg-teal-500/10 border-teal-500/20',
      barColor: 'bg-teal-400',
    },
  }

  const currentStatus = statusConfig[topic.status] || statusConfig['needs-review']

  return (
    <Card
      hover
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 transition-all duration-300 hover:border-slate-700',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>{topic.course}</span>
          </div>
          <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
            {topic.name}
          </h4>
        </div>
        <Badge variant={currentStatus.badgeVariant} size="sm">
          {currentStatus.label}
        </Badge>
      </div>

      {/* Accuracy & Progress Bar */}
      <div className="my-3 space-y-1.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-slate-500" />
            Accuracy Rate
          </span>
          <span className={cn('font-bold', currentStatus.textColor)}>{topic.accuracy}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', currentStatus.barColor)}
            style={{ width: `${Math.min(100, Math.max(0, topic.accuracy))}%` }}
          />
        </div>
        <div className="flex justify-between items-center pt-0.5 text-[10px] text-slate-500">
          <span>{topic.questionsAttempted} questions attempted</span>
          <span>Target: ≥80%</span>
        </div>
      </div>

      {/* Suggested remedy & Practice button */}
      <div className="flex items-center justify-between gap-3 pt-1">
        {topic.recommendedAction ? (
          <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="truncate">{topic.recommendedAction}</span>
          </p>
        ) : (
          <span />
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={() => onPractice && onPractice(topic.id)}
          className="text-xs px-2.5 py-1 text-slate-200 border-slate-700 hover:bg-slate-800 hover:text-white shrink-0 ml-auto"
          rightIcon={<ArrowRight className="w-3 h-3 text-cyan-400" />}
        >
          Practice
        </Button>
      </div>
    </Card>
  )
}
