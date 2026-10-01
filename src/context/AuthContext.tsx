import React, { createContext, useContext, useEffect, useState } from 'react'
import type { UserProfile } from '@/types/auth'
import {
  subscribeToAuth,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle as firebaseLoginWithGoogle,
  resetPassword as firebaseResetPassword,
  logoutUser,
} from '@/lib/firebase/auth'

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  login: (email: string, pass: string) => Promise<void>
  register: (email: string, pass: string, name?: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const login = async (email: string, pass: string) => {
    setLoading(true)
    try {
      const u = await loginWithEmail(email, pass)
      setUser(u)
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, pass: string, name?: string) => {
    setLoading(true)
    try {
      const u = await registerWithEmail(email, pass, name)
      setUser(u)
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = async () => {
    setLoading(true)
    try {
      const u = await firebaseLoginWithGoogle()
      setUser(u)
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    await firebaseResetPassword(email)
  }

  const logout = async () => {
    setLoading(true)
    try {
      await logoutUser()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        loginWithGoogle,
        resetPassword,
        logout,
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
