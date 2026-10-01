import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { BrainCircuit, Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'

export const ForgotPasswordPage: React.FC = () => {
  const { user, loading: authLoading, resetPassword } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Redirect authenticated users away from forgot-password
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, authLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await resetPassword(email)
      setIsSubmitted(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send password reset email.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#090D16] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

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
          <h1 className="text-xl font-bold text-white mt-2">Reset Password</h1>
          <p className="text-xs text-slate-400 mt-1">
            We will send a secure password reset link to your registered email.
          </p>
        </div>

        {/* Card */}
        <Card className="p-8 border-slate-800/80 bg-slate-900/70 backdrop-blur-xl">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isSubmitted ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Reset Email Dispatched</h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  If an account exists for <span className="text-indigo-300 font-medium">{email}</span>, you will receive password reset instructions shortly.
                </p>
                <p className="text-[11px] text-slate-500 mt-2">
                  Be sure to check your spam or promotions folder if it doesn't arrive within 2 minutes.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80">
                <Link to="/login">
                  <Button variant="outline" className="w-full text-xs">
                    Return to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
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

              <Button
                type="submit"
                className="w-full mt-2 font-semibold"
                isLoading={isLoading}
                rightIcon={<Send className="w-3.5 h-3.5" />}
              >
                Send Reset Link
              </Button>

              <div className="pt-4 border-t border-slate-800/80 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
