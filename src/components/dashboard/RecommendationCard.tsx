import React from 'react'
import { Sparkles, Clock, ArrowRight, FileText, HelpCircle, Flame } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { cn } from '@/lib/utils'

export interface RecommendationItem {
  id: string
  type: 'quiz' | 'material' | 'review' | 'concept'
  title: string
  course: string
  reason: string
  estimatedMinutes: number
  priority: 'high-yield' | 'recommended' | 'refresher'
  actionLabel: string
}

export interface RecommendationCardProps {
  item: RecommendationItem
  onAction?: (item: RecommendationItem) => void
  className?: string
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  item,
  onAction,
  className,
}) => {
  const typeIcons = {
    quiz: HelpCircle,
    material: FileText,
    review: Flame,
    concept: Sparkles,
  }

  const Icon = typeIcons[item.type] || Sparkles

  const priorityStyles = {
    'high-yield': {
      label: 'High Yield',
      badgeVariant: 'emerald' as const,
      border: 'border-emerald-500/30',
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    recommended: {
      label: 'Recommended',
      badgeVariant: 'indigo' as const,
      border: 'border-cyan-500/30',
      iconColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
    refresher: {
      label: 'Quick Refresher',
      badgeVariant: 'amber' as const,
      border: 'border-slate-800',
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
  }

  const currentPriority = priorityStyles[item.priority] || priorityStyles.recommended

  return (
    <Card
      hover
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-950/20 flex flex-col justify-between',
        className
      )}
    >
      <div>
        {/* Top Badges & Type */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-lg border flex items-center justify-center shrink-0',
                currentPriority.iconColor
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-400">{item.course}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {item.estimatedMinutes}m
            </span>
            <Badge variant={currentPriority.badgeVariant} size="sm">
              {currentPriority.label}
            </Badge>
          </div>
        </div>

        {/* Title */}
        <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors mb-1.5">
          {item.title}
        </h4>

        {/* Reason / Context */}
        <p className="text-xs text-slate-400 leading-relaxed mb-4">{item.reason}</p>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between mt-auto">
        <span className="text-[11px] text-emerald-400/90 font-medium">
          Source-grounded step
        </span>

        <Button
          size="sm"
          variant="primary"
          onClick={() => onAction && onAction(item)}
          className="text-xs px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm shadow-emerald-600/20"
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          {item.actionLabel}
        </Button>
      </div>
    </Card>
  )
}
