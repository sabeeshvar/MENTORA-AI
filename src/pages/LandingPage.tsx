import React from 'react'
import { Link } from 'react-router-dom'
import {
  BrainCircuit,
  Sparkles,
  Award,
  ArrowRight,
  ShieldCheck,
  FileText,
  Presentation,
  Video,
  TrendingUp,
  Compass,
  BarChart3,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0A0F1D] text-slate-100 flex flex-col selection:bg-emerald-500/30">
      {/* Top Navbar */}
      <header className="h-20 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-40 bg-[#0A0F1D]/80 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-emerald-100 to-teal-200 bg-clip-text text-transparent">
              MENTORA AI
            </span>
            <span className="hidden sm:inline-block ml-3 text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
              Learn &bull; Adapt &bull; Master
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
              Sign In
            </Button>
          </Link>
          <Link to="/register">
            <Button
              variant="primary"
              size="sm"
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 shadow-md shadow-emerald-950/30"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Start Learning
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 md:px-12 text-center max-w-5xl mx-auto flex flex-col items-center justify-center">
        {/* Ambient glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-emerald-600/15 via-teal-600/10 to-cyan-600/5 blur-[120px] pointer-events-none rounded-full" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          Personalized Tutoring & Adaptive Learning Track
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.15] max-w-4xl text-white">
          MENTORA AI —{' '}
          <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
            Learn. Adapt. Master.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl font-normal leading-relaxed">
          &ldquo;Your learning companion that understands what you study, how you perform, and what
          you should learn next.&rdquo;
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/register">
            <Button
              size="lg"
              variant="primary"
              className="rounded-2xl px-7 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 shadow-xl shadow-emerald-950/40"
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Start Learning
            </Button>
          </Link>

          <Link to="/dashboard">
            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl px-7 border-slate-700 hover:bg-slate-900 text-slate-200"
              rightIcon={<Sparkles className="w-4 h-4 text-emerald-400" />}
            >
              Explore Demo
            </Button>
          </Link>
        </div>

        {/* Live Product Preview Frame */}
        <div className="mt-16 w-full max-w-4xl rounded-3xl bg-slate-900/90 border border-slate-800 p-4 sm:p-6 shadow-2xl backdrop-blur-xl text-left">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs font-mono text-slate-400">
                mentora-ai.internal &bull; Live RAG & Mastery Engine
              </span>
            </div>
            <Badge variant="emerald" size="sm">
              GROUNDED IN COURSE MATERIAL
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tutor Excerpt */}
            <div className="md:col-span-2 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="font-bold text-white">Student:</span>
                <span>How does Raft leader election prevent split votes?</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/20 text-xs text-slate-200 leading-relaxed">
                <p className="font-sans">
                  Raft utilizes randomized election timeouts (typically 150–300ms) across nodes.
                  This ensures that in split vote scenarios, one follower times out first, increments
                  the term, and collects majority votes before others awake.
                </p>
                <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> Source: Distributed_Systems_Raft.pdf
                  </span>
                  <Badge variant="rose" size="sm" className="text-[9px] py-0 px-1.5">
                    Page 18
                  </Badge>
                </div>
              </div>
            </div>

            {/* Live Mastery Gauge */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Active Topic Mastery
              </span>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">Raft Consensus</span>
                  <span className="font-mono font-bold text-emerald-400">82%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-[82%]" />
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300">
                Next: Take calibrated application quiz on snapshotting.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Sections: 6 Core Pillars Required */}
      <section className="py-20 px-6 md:px-12 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Engineered for Deep Academic Mastery
          </h2>
          <p className="text-sm text-slate-400">
            Every feature connects to real Firebase data, dense semantic vector retrieval, and live
            Groq LLaMA 3.3 inference.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Source-Grounded AI Tutor */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Source-Grounded AI Tutor</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every answer is synthesized strictly from your uploaded materials with exact page and slide citations.
              Never hallucinates unsupported model knowledge.
            </p>
          </div>

          {/* 2. Adaptive Quizzes */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Adaptive Quizzes</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates rigorous MCQ, Short Answer, and Numerical questions grounded in course chunks.
              Includes interactive wrong-answer explanations with examples and follow-ups.
            </p>
          </div>

          {/* 3. Topic Mastery */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Topic Mastery Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dampened exponential scoring updates after every question. Visualizes progress across
              Needs Attention, Developing, Good, and Mastered bands.
            </p>
          </div>

          {/* 4. Personalized Recommendations */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Personalized Recommendations</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Prescribes targeted revision, diagnostic quizzes, and advancement steps with concrete
              reasons derived from your actual learner diagnostic data.
            </p>
          </div>

          {/* 5. Multimodal Learning */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <div className="flex gap-1">
                <FileText className="w-4 h-4" />
                <Presentation className="w-4 h-4" />
                <Video className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-base font-bold text-white">Multimodal Learning Ingestion</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Indexes PDF textbooks, PowerPoint slide decks (PPT/PPTX), and video lecture transcripts
              retaining page, slide, and timestamp metadata.
            </p>
          </div>

          {/* 6. Learning Analytics */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Learning Analytics</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time charts tracking accuracy trends, quiz history, weak-spot diagnosis, and streak
              consistency computed directly from live Firestore records.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500 mt-auto">
        <p>
          MENTORA AI &bull; Learn. Adapt. Master. &bull; Production Hackathon Release &bull; Powered
          by Groq LLaMA 3.3 & Firebase
        </p>
      </footer>
    </div>
  )
}

export default LandingPage
