import React from 'react'
import { Link } from 'react-router-dom'
import {
  BrainCircuit,
  FileText,
  Video,
  Presentation,
  Sparkles,
  Award,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/common/Button'

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="h-20 border-b border-white/5 backdrop-blur-md sticky top-0 z-40 bg-[#090D16]/80 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-indigo-100 to-slate-300 bg-clip-text text-transparent">
              MENTORA AI
            </span>
            <span className="hidden sm:inline-block ml-3 text-xs text-indigo-400 font-semibold uppercase tracking-wider">
              Learn • Adapt • Master
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Launch App
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 md:px-12 text-center max-w-5xl mx-auto flex-1 flex flex-col items-center justify-center">
        {/* Glow backdrop effect */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/15 blur-[120px] pointer-events-none rounded-full" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          Next-Gen Multimodal AI Learning Companion
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.15] max-w-4xl text-white">
          Turn Any Course Material Into{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
            Source-Grounded Mastery
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl font-normal leading-relaxed">
          Upload PDFs, slides, and lecture videos. Get AI answers with exact page citations,
          generate adaptive quizzes calibrated to your weak spots, and level up your mastery.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/register">
            <Button size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
              Start Learning Free
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg">
              Sign In to Workspace
            </Button>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <div className="flex gap-1">
                <FileText className="w-4 h-4" />
                <Presentation className="w-4 h-4" />
                <Video className="w-4 h-4" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Multimodal Ingestion</h2>
            <p className="text-sm text-slate-400">
              Seamlessly index textbooks, slide decks (PPT/PPTX), and video lecture transcripts in a
              unified knowledge base.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Source-Grounded Q&A</h2>
            <p className="text-sm text-slate-400">
              Zero hallucination risk. Every response is strictly linked to source page numbers and
              timestamped video markers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-4">
              <Award className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Adaptive Quizzes & Mastery</h2>
            <p className="text-sm text-slate-400">
              AI diagnoses your knowledge gaps dynamically, adjusting quiz difficulty and building a
              custom mastery roadmap.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-500">
        <p>MENTORA AI — Learn. Adapt. Master. • Production Hackathon Release</p>
      </footer>
    </div>
  )
}
