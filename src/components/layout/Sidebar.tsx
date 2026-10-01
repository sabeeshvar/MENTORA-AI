import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  Sparkles,
  Award,
  TrendingUp,
  Compass,
  Settings,
  LogOut,
  BrainCircuit,
  GraduationCap,
  Network,
  BarChart3,
  CalendarDays,
  RotateCcw,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'

interface SidebarProps {
  onCloseMobile?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navItems = [
    { label: t('nav.dashboard'), to: '/dashboard', icon: LayoutDashboard },
    { label: t('nav.courses'), to: '/courses', icon: BookOpen },
    { label: t('nav.tutor'), to: '/tutor', icon: Sparkles },
    { label: t('nav.quiz'), to: '/quiz', icon: Award },
    { label: t('nav.studyPlan'), to: '/study-plan', icon: CalendarDays },
    { label: t('nav.revision'), to: '/revision', icon: RotateCcw },
    { label: t('nav.progress'), to: '/progress', icon: TrendingUp },
    { label: t('nav.recommendations'), to: '/recommendations', icon: Compass },
    { label: t('nav.knowledgeMap'), to: '/knowledge-map', icon: Network },
    { label: t('nav.evaluation'), to: '/evaluation', icon: BarChart3 },
    { label: t('nav.settings'), to: '/settings', icon: Settings },
  ]

  return (
    <aside className="w-64 h-full bg-[#0D1322] border-r border-slate-800/80 flex flex-col justify-between select-none">
      {/* Brand Header */}
      <div>
        <div className="p-6 border-b border-slate-800/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-emerald-100 to-teal-200 bg-clip-text text-transparent">
                MENTORA AI
              </span>
            </div>
            <p className="text-[10px] tracking-widest text-emerald-400 font-semibold uppercase">
              Learn • Adapt • Master
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-12rem)]">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/5 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-950/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'w-4 h-4 transition-transform group-hover:scale-110',
                        isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                      )}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>

      {/* User info & Logout Footer */}
      <div className="p-4 border-t border-slate-800/60">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {user?.name || user?.displayName || 'Student Learner'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.email || 'learner@mentora.ai'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
