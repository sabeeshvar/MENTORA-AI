import React from 'react'
import { Shield, Key, Database, CheckCircle, AlertCircle } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { useAuth } from '@/context/AuthContext'
import { isFirebaseConfigured } from '@/lib/firebase/config'

export const SettingsPage: React.FC = () => {
  const { user } = useAuth()
  const isFbConfigured = isFirebaseConfigured()

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Platform Settings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your account profile, cloud synchronization, and AI engine status.
        </p>
      </div>

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
          Cloud & AI Engine Status
        </h3>

        <div className="space-y-3">
          {/* Firebase Status */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isFbConfigured ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400" />
              )}
              <div>
                <h4 className="text-xs font-bold text-white">Firebase Authentication & Firestore</h4>
                <p className="text-[11px] text-slate-400">
                  {isFbConfigured
                    ? 'Connected to Firebase cloud production services.'
                    : 'Running in local fallback mode. Add real keys to .env to sync with cloud.'}
                </p>
              </div>
            </div>

            <Badge variant={isFbConfigured ? 'emerald' : 'amber'}>
              {isFbConfigured ? 'Connected' : 'Local Fallback'}
            </Badge>
          </div>

          {/* Groq AI Status */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-indigo-400" />
              <div>
                <h4 className="text-xs font-bold text-white">Groq AI Inference Engine</h4>
                <p className="text-[11px] text-slate-400">
                  Target Model: LLaMA 3.3 70B Versatile (Configured in server/config.ts)
                </p>
              </div>
            </div>

            <Badge variant="indigo">Configured</Badge>
          </div>
        </div>
      </Card>
    </div>
  )
}
