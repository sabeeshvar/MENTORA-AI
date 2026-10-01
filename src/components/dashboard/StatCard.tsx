import React from 'react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { cn } from '@/lib/utils'

export interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  subtitle?: string
  trend?: {
    value: string
    isPositive: boolean
  }
  badge?: {
    text: string
    variant?: 'emerald' | 'indigo' | 'amber' | 'default'
  }
  accent?: 'emerald' | 'cyan' | 'blue' | 'indigo' | 'purple'
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  trend,
  badge,
  accent = 'emerald',
  className,
}) => {
  const accentGradients = {
    emerald: 'from-emerald-500/15 via-teal-500/5 to-transparent text-emerald-400 border-emerald-500/20',
    cyan: 'from-cyan-500/15 via-blue-500/5 to-transparent text-cyan-400 border-cyan-500/20',
    blue: 'from-blue-500/15 via-indigo-500/5 to-transparent text-blue-400 border-blue-500/20',
    indigo: 'from-indigo-500/15 via-purple-500/5 to-transparent text-indigo-400 border-indigo-500/20',
    purple: 'from-purple-500/15 via-pink-500/5 to-transparent text-purple-400 border-purple-500/20',
  }

  const iconBgStyles = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  }

  return (
    <Card
      hover
      className={cn(
        'relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-md transition-all duration-300',
        className
      )}
    >
      {/* Subtle Accent Glow */}
      <div
        className={cn(
          'absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl rounded-bl-full pointer-events-none opacity-40',
          accentGradients[accent]
        )}
      />

      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {value}
            </span>
            {trend && (
              <span
                className={cn(
                  'text-xs font-semibold flex items-center',
                  trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
                )}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-400 pt-0.5">{subtitle}</p>}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center border shadow-sm shrink-0',
              iconBgStyles[accent]
            )}
          >
            {icon}
          </div>
          {badge && (
            <Badge variant={badge.variant || 'emerald'} size="sm">
              {badge.text}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  )
}
