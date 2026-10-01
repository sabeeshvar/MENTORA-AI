import React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hover = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/5 p-5 shadow-xl',
        hover &&
          'transition-all duration-300 hover:border-indigo-500/30 hover:bg-slate-900/80 hover:-translate-y-1 hover:shadow-indigo-500/5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
