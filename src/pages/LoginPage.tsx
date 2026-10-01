import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { BrainCircuit, Mail, Lock, ArrowRight, Sparkles, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'

export const LoginPage: React.FC = () => {
  const { user, loading: authLoading, login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Redirect authenticated users away from the login page
  useEffect(() => {
    if (user && !authLoading) {
      navigate(from, { replace: true })
    }
  }, [user, authLoading, navigate, from])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please try again.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setIsLoading(true)
    try {
      await loginWithGoogle()
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google authentication failed'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setError(null)
    setIsLoading(true)
    try {
      await login('student@mentora.ai', 'demo1234')
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Demo sign-in failed'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#090D16] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-300">
              <BrainCircuit className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <span className="font-extrabold text-2xl tracking-tight text-white block">
                MENTORA AI
              </span>
              <span className="text-[11px] tracking-widest text-indigo-400 font-semibold uppercase block">
                Learn • Adapt • Master
              </span>
            </div>
          </Link>
          <h1 className="text-xl font-bold text-white mt-2">Welcome Back, Learner</h1>
          <p className="text-xs text-slate-400 mt-1">
            Sign in to continue your source-grounded mastery path.
          </p>
        </div>

        {/* Hackathon Reviewer Fast Access Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-900/30 to-purple-900/25 border border-indigo-500/30 flex items-center justify-between shadow-lg shadow-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-200">Hackathon Reviewer Access</p>
              <p className="text-[11px] text-slate-400">One-click instant login to review features</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={handleDemoLogin}
            isLoading={isLoading}
            className="text-xs px-3 py-1.5 shrink-0"
          >
            Enter Demo
          </Button>
        </div>

        {/* Login Form Card */}
        <Card className="p-8 border-slate-800/80 bg-slate-900/70 backdrop-blur-xl">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-3 font-semibold"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          {/* Google Sign-In Provider */}
          <div className="mt-6 pt-6 border-t border-slate-800/80">
            <Button
              type="button"
              variant="outline"
              className="w-full text-xs font-medium flex items-center justify-center gap-2 border-slate-800 hover:bg-slate-800/50"
              onClick={handleGoogleLogin}
              isLoading={isLoading}
              leftIcon={
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.6 6.4C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.6l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"
                  />
                </svg>
              }
            >
              Continue with Google
            </Button>

            <div className="mt-5 text-center">
              <p className="text-xs text-slate-400">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors ml-1"
                >
                  Create Student Account
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage
