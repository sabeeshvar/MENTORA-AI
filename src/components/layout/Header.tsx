import React from 'react'
import { Menu, Search, Bell, Sparkles, Flame } from 'lucide-react'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/common/Badge'

interface HeaderProps {
  onToggleMobileMenu: () => void
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { user } = useAuth()
  const isFbConnected = isFirebaseConfigured()
  const streakDays = user?.learningStats?.streakDays ?? 3

  return (
    <header className="h-16 bg-[#0D1322]/85 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile hamburger & search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative hidden sm:block w-64 md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notes, topics, or materials..."
            className="w-full pl-10 pr-4 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
          />
        </div>
      </div>

      {/* Right: Streak, status badge, notifications, and AI status */}
      <div className="flex items-center gap-3">
        {/* Learning Streak Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
          <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
          <span>{streakDays} {streakDays === 1 ? 'Day' : 'Days'} Streak</span>
        </div>

        {isFbConnected ? (
          <Badge variant="emerald" size="sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Cloud Synced
          </Badge>
        ) : (
          <Badge variant="amber" size="sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Local Mode
          </Badge>
        )}

        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>Groq LLaMA 3.3 Engine</span>
        </div>

        <button
          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400"></span>
        </button>
      </div>
    </header>
  )
}

