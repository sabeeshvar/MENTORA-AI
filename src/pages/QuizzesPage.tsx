import React, { useState } from 'react'
import { Award, Sparkles, Play } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import type { QuizDifficulty } from '@/types/quiz'

export const QuizzesPage: React.FC = () => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuizDifficulty>('adaptive')

  const availableQuizzes = [
    {
      id: 'quiz-1',
      title: 'Consensus & Raft Protocol Mastery Test',
      topic: 'Distributed Systems',
      questionsCount: 5,
      difficulty: 'adaptive' as QuizDifficulty,
      bestScore: '90%',
      attempts: 2,
    },
    {
      id: 'quiz-2',
      title: 'Neural Network Backpropagation & Gradients',
      topic: 'Deep Learning',
      questionsCount: 8,
      difficulty: 'intermediate' as QuizDifficulty,
      bestScore: '75%',
      attempts: 1,
    },
    {
      id: 'quiz-3',
      title: 'ACID Transactions & Two-Phase Locking',
      topic: 'Databases',
      questionsCount: 6,
      difficulty: 'advanced' as QuizDifficulty,
      bestScore: 'Unattempted',
      attempts: 0,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Adaptive Quizzes</h1>
          <p className="text-sm text-slate-400 mt-1">
            AI-generated questions calibrated to diagnose and eliminate conceptual gaps.
          </p>
        </div>

        <Button size="md" leftIcon={<Sparkles className="w-4 h-4" />}>
          Generate New Quiz
        </Button>
      </div>

      {/* Difficulty Modes Banner */}
      <Card className="p-6 bg-gradient-to-r from-purple-950/20 via-indigo-950/20 to-slate-900/40 border border-indigo-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" />
              Dynamic Adaptive Mode Enabled
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Questions start at your current mastery level and dynamically adjust difficulty based
              on your real-time responses.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(['adaptive', 'beginner', 'intermediate', 'advanced'] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                  selectedDifficulty === diff
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Quiz Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {availableQuizzes.map((quiz) => (
          <Card key={quiz.id} hover className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Badge variant="indigo" size="sm">
                  {quiz.topic}
                </Badge>
                <Badge
                  variant={
                    quiz.difficulty === 'advanced'
                      ? 'rose'
                      : quiz.difficulty === 'intermediate'
                        ? 'amber'
                        : 'purple'
                  }
                  size="sm"
                >
                  {quiz.difficulty}
                </Badge>
              </div>

              <h3 className="text-sm font-bold text-white mb-2 leading-snug">{quiz.title}</h3>
              <p className="text-xs text-slate-400">
                {quiz.questionsCount} questions with source citations
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Best Score
                </span>
                <span className="text-xs font-bold text-slate-200">{quiz.bestScore}</span>
              </div>

              <Button size="sm" variant="primary" rightIcon={<Play className="w-3.5 h-3.5" />}>
                Start Quiz
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
