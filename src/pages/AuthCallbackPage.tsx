import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { BrainCircuit, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { handleOAuthCallback } from '@/lib/supabase/auth'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'

export const AuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setUser } = useAuth()

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const processAuth = async () => {
      // 1. Check for error parameters from OAuth provider
      const errorParam = searchParams.get('error')
      const errorDesc = searchParams.get('error_description')
      if (errorParam) {
        if (!isMounted) return
        setStatus('error')
        setErrorMessage(
          errorDesc || errorParam || 'Authentication provider reported an authorization error.'
        )
        return
      }

      // 2. Extract PKCE authorization code
      const code = searchParams.get('code')

      try {
        const { user: profile, error } = await handleOAuthCallback(code)

        if (!isMounted) return

        if (error || !profile) {
          setStatus('error')
          setErrorMessage(error || 'Could not verify your authentication session. Please try signing in again.')
          return
        }

        // Successfully authenticated
        setUser(profile)
        setStatus('success')

        // Check if there is an intended destination
        const destination = sessionStorage.getItem('mentora_auth_redirect') || '/dashboard'
        sessionStorage.removeItem('mentora_auth_redirect')

        setTimeout(() => {
          if (isMounted) {
            navigate(destination, { replace: true })
          }
        }, 600)
      } catch (err: any) {
        if (!isMounted) return
        setStatus('error')
        setErrorMessage(err?.message || 'Failed to complete authentication exchange.')
      }
    }

    processAuth()

    return () => {
      isMounted = false
    }
  }, [searchParams, navigate, setUser])

  return (
    <div className="min-h-screen bg-[#090D16] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 text-center">
        {/* Brand Header */}
        <div className="inline-flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <BrainCircuit className="w-7 h-7 text-white" />
          </div>
          <div className="text-left">
            <span className="font-extrabold text-2xl tracking-tight text-white block">
              MENTORA AI
            </span>
            <span className="text-[11px] tracking-widest text-emerald-400 font-semibold uppercase block">
              Learn • Adapt • Master
            </span>
          </div>
        </div>

        <Card className="p-8 border-slate-800/80 bg-slate-900/70 backdrop-blur-xl">
          {status === 'processing' && (
            <div className="flex flex-col items-center py-6 space-y-4">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
              <div>
                <h2 className="text-base font-bold text-white">Verifying Authentication</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Exchanging secure tokens and restoring your learner profile...
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Session Established!</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Welcome to MENTORA AI. Redirecting to your dashboard...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center py-4 space-y-4 text-left">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center self-center">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="text-center w-full">
                <h2 className="text-base font-bold text-white">Authentication Failed</h2>
                <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl mt-3 text-left">
                  {errorMessage}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 w-full flex flex-col gap-2">
                <Link to="/login" className="w-full">
                  <Button variant="primary" className="w-full text-xs" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                    Return to Sign In
                  </Button>
                </Link>
                <Link to="/" className="w-full text-center">
                  <span className="text-xs text-slate-400 hover:text-slate-300">
                    Go to Homepage
                  </span>
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default AuthCallbackPage
