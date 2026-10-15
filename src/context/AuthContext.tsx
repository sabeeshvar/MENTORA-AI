import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { UserProfile } from '@/types/auth'
import {
  subscribeToAuth,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle as supabaseLoginWithGoogle,
  resetPassword as supabaseResetPassword,
  logoutUser,
  getAccessToken,
} from '@/lib/supabase/auth'

interface AuthContextType {
  user: UserProfile | null
  session: Session | null
  token: string | null
  loading: boolean
  login: (email: string, pass: string) => Promise<UserProfile>
  register: (email: string, pass: string, name?: string) => Promise<UserProfile>
  loginWithGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let mounted = true

    const unsubscribe = subscribeToAuth((currentUser, currentSession) => {
      if (!mounted) return
      setUser(currentUser)
      setSession(currentSession || null)
      setLoading(false)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  const login = async (email: string, pass: string): Promise<UserProfile> => {
    setLoading(true)
    try {
      const u = await loginWithEmail(email, pass)
      setUser(u)
      return u
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, pass: string, name?: string): Promise<UserProfile> => {
    setLoading(true)
    try {
      const u = await registerWithEmail(email, pass, name)
      if (!u.emailConfirmationRequired) {
        setUser(u)
      }
      return u
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = async () => {
    setLoading(true)
    try {
      const result = await supabaseLoginWithGoogle()
      // If a URL was returned, Supabase initiates browser redirect to Google.
      // Keep loading indicator active until navigation takes over.
      if (!result.isRedirecting) {
        setLoading(false)
      }
    } catch (err) {
      setLoading(false)
      throw err
    }
  }

  const resetPassword = async (email: string) => {
    await supabaseResetPassword(email)
  }

  const logout = async () => {
    setLoading(true)
    try {
      await logoutUser()
      setUser(null)
      setSession(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshSession = useCallback(async () => {
    const activeToken = await getAccessToken()
    if (!activeToken && !user) {
      setUser(null)
      setSession(null)
    }
  }, [user])

  const token = session?.access_token || null

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        token,
        loading,
        login,
        register,
        loginWithGoogle,
        resetPassword,
        logout,
        refreshSession,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

