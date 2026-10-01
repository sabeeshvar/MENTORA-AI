import React from 'react'
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'

export const MasteryPage: React.FC = () => {
  const topics = [
    {
      topic: 'Operating Systems & Concurrency',
      score: 92,
      level: 'mastered',
      quizzes: 4,
      accuracy: '94%',
      weakArea: 'Page Replacement Algorithms',
      recommendation: 'You have mastered basic concurrency primitives! Take an advanced review.',
    },
    {
      topic: 'Computer Networks & TCP/IP',
      score: 84,
      level: 'competent',
      quizzes: 3,
      accuracy: '86%',
      weakArea: 'CIDR Subnet Masking',
      recommendation: 'Practice 3 adaptive questions on CIDR subnet calculations.',
    },
    {
      topic: 'Database Systems & Storage Engines',
      score: 68,
      level: 'learning',
      quizzes: 2,
      accuracy: '65%',
      weakArea: 'B+ Tree Splitting & Merge Operations',
      recommendation: 'Review Chapter 4 in Database Storage slide deck before next quiz.',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white">Topic Mastery & Knowledge Graph</h1>
        <p className="text-sm text-slate-400 mt-1">
          Real-time analytics diagnosing your understanding and prescribing high-yield study actions.
        </p>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Overall Mastery
            </p>
            <h3 className="text-2xl font-extrabold text-white">81.3%</h3>
            <p className="text-[10px] text-emerald-400 font-medium">+6.4% this week</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Questions Answered
            </p>
            <h3 className="text-2xl font-extrabold text-white">48</h3>
            <p className="text-[10px] text-indigo-400 font-medium">85% overall accuracy</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Diagnosed Weak Spots
            </p>
            <h3 className="text-2xl font-extrabold text-white">2 Topics</h3>
            <p className="text-[10px] text-amber-400 font-medium">Actionable remedies ready</p>
          </div>
        </Card>
      </div>

      {/* Detailed Mastery Cards */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white">Subject Mastery Breakdown</h2>
        {topics.map((t) => (
          <Card key={t.topic} className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{t.topic}</h3>
                  <Badge
                    variant={
                      t.level === 'mastered'
                        ? 'emerald'
                        : t.level === 'competent'
                          ? 'indigo'
                          : 'amber'
                    }
                  >
                    {t.score}% • {t.level.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {t.quizzes} adaptive quizzes attempted • {t.accuracy} average accuracy
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  Review Weak Concepts
                </Button>
                <Button variant="primary" size="sm" className="text-xs">
                  Take Targeted Quiz
                </Button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full"
                style={{ width: `${t.score}%` }}
              />
            </div>

            {/* AI Recommendation Pill */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="text-slate-300 font-semibold">Remedy: </span>
                <span className="text-slate-400">{t.recommendation}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
