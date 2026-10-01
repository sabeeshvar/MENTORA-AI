import React from 'react'
import { Award, TrendingUp, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { cn } from '@/lib/utils'

export interface MasteryBreakdown {
  mastered: number
  competent: number
  learning: number
  totalConcepts: number
}

export interface MasteryCardProps {
  overallMastery: number
  breakdown: MasteryBreakdown
  onViewDetails?: () => void
  className?: string
}

export const MasteryCard: React.FC<MasteryCardProps> = ({
  overallMastery,
  breakdown,
  onViewDetails,
  className,
}) => {
  // Mastery level description
  const getLevelLabel = (score: number) => {
    if (score >= 85) return { label: 'Advanced Master', variant: 'emerald' as const }
    if (score >= 70) return { label: 'Proficient Learner', variant: 'emerald' as const }
    if (score >= 50) return { label: 'Intermediate', variant: 'indigo' as const }
    return { label: 'Foundational Stage', variant: 'amber' as const }
  }

  const levelInfo = getLevelLabel(overallMastery)

  return (
    <Card
      className={cn(
        'relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-md',
        className
      )}
    >
      {/* Background Accent Gradient Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-teal-500/10 via-emerald-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Overall Mastery Index</h3>
              <p className="text-xs text-slate-400">Continuous diagnostic calibration</p>
            </div>
          </div>
          <Badge variant={levelInfo.variant} size="sm">
            {levelInfo.label}
          </Badge>
        </div>

        {/* Circular / Large Score Display */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            {/* SVG Progress Circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-slate-800"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="url(#masteryGradient)"
                strokeWidth="10"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * overallMastery) / 100}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="masteryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#14b8a6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-white">{overallMastery}%</span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                Mastery
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-emerald-400 font-semibold">
              <TrendingUp className="w-4 h-4" />
              <span>{breakdown.totalConcepts} Concepts Assessed</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Based on grounded Q&A queries and adaptive quiz performance across all enrolled
              materials.
            </p>
          </div>
        </div>

        {/* 3-Tier Status Breakdown */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-500/20 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-400 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mastered</span>
            </div>
            <p className="text-xl font-extrabold text-white">{breakdown.mastered}</p>
            <span className="text-[10px] text-slate-500">≥85% score</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-teal-500/20 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-teal-400 mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Competent</span>
            </div>
            <p className="text-xl font-extrabold text-white">{breakdown.competent}</p>
            <span className="text-[10px] text-slate-500">65-84% score</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-amber-500/20 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-amber-400 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Learning</span>
            </div>
            <p className="text-xl font-extrabold text-white">{breakdown.learning}</p>
            <span className="text-[10px] text-slate-500">&lt;65% score</span>
          </div>
        </div>

        {/* Action Link */}
        {onViewDetails && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="w-full text-xs text-slate-300 hover:text-white border-slate-800 hover:border-slate-700"
            rightIcon={<ArrowRight className="w-3.5 h-3.5 text-emerald-400" />}
          >
            Explore Detailed Topic Mastery Matrix
          </Button>
        )}
      </div>
    </Card>
  )
}
