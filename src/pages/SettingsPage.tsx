import React from 'react'
import { Shield, Key, Database, CheckCircle, AlertCircle, Globe, HardDrive } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { useAuth } from '@/context/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { LanguageSelector } from '@/components/common/LanguageSelector'
import { useTranslation } from '@/context/LanguageContext'

export const SettingsPage: React.FC = () => {
  const { user } = useAuth()
  const { currentLanguage, t } = useTranslation()
  const isSbConfigured = isSupabaseConfigured()

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white">{t('settings')}</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your account profile, language preferences, Supabase cloud infrastructure, and Gemini AI status.
        </p>
      </div>

      {/* Language Preference Card */}
      <Card className="p-6 space-y-4 border border-indigo-500/20 bg-gradient-to-r from-slate-900 to-indigo-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t('preferredLanguage')}</h3>
              <p className="text-xs text-slate-400">
                Select your preferred Indian language for tutor responses, quizzes, study plans, and revision
              </p>
            </div>
          </div>
          <LanguageSelector showLabel={true} />
        </div>
        <div className="text-xs text-slate-500 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
          Current Active Learning Language: <strong className="text-indigo-400">{currentLanguage.nativeName} ({currentLanguage.name})</strong>.
          Source citations, page numbers, and slide metadata remain anchored to the original uploaded course materials.
        </div>
      </Card>

      {/* User Profile Card */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            Learner Profile
          </h3>
          <Badge variant="indigo" size="sm">
            Role: {user?.role || 'student'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Name</span>
            <span className="text-sm font-semibold text-slate-200">
              {user?.name || user?.displayName || 'Student Learner'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Email</span>
            <span className="text-sm font-semibold text-slate-200 truncate block">
              {user?.email || 'learner@mentora.ai'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Materials Indexed</span>
            <span className="text-sm font-semibold text-indigo-400">
              {user?.learningStats?.materialsCount ?? 0} files
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Last Active</span>
            <span className="text-sm font-semibold text-slate-300">
              {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Active Now'}
            </span>
          </div>
        </div>
      </Card>

      {/* Service Integrations & Diagnostics */}
      <Card className="p-6 space-y-5">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-400" />
          Cloud Infrastructure & AI Provider
        </h3>

        <div className="space-y-3">
          {/* Supabase Status */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSbConfigured ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400" />
              )}
              <div>
                <h4 className="text-xs font-bold text-white">Supabase PostgreSQL, Auth & Storage</h4>
                <p className="text-[11px] text-slate-400">
                  {isSbConfigured
                    ? 'Connected to Supabase cloud database with Row Level Security & pgvector.'
                    : 'Running in safe local offline-first fallback mode. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env to sync with cloud.'}
                </p>
              </div>
            </div>

            <Badge variant={isSbConfigured ? 'emerald' : 'amber'}>
              {isSbConfigured ? 'Connected' : 'Local Fallback'}
            </Badge>
          </div>

          {/* Google Gemini AI Status */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-indigo-400" />
              <div>
                <h4 className="text-xs font-bold text-white">Google Gemini 2.5 Flash Engine</h4>
                <p className="text-[11px] text-slate-400">
                  Multimodal RAG, grounded tutor responses, quiz generation & evaluation, misconception detection.
                </p>
              </div>
            </div>

            <Badge variant="indigo">Gemini 2.5 Flash</Badge>
          </div>

          {/* Supabase Storage Status */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-teal-400" />
              <div>
                <h4 className="text-xs font-bold text-white">Supabase Storage Bucket</h4>
                <p className="text-[11px] text-slate-400">
                  Bucket: <code className="text-slate-300">course-materials</code> for PDF, PPTX, MP4, and Diagram uploads.
                </p>
              </div>
            </div>

            <Badge variant="indigo">course-materials</Badge>
          </div>
        </div>
      </Card>
    </div>
  )
}
