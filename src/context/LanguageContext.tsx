import React, { createContext, useContext, useState, useEffect } from 'react'
import type { SupportedLanguageCode } from '@/types/language'
import { SUPPORTED_LANGUAGES } from '@/types/language'
import { getTranslation, type TranslationDictionary } from '@/locales'
import { useAuth } from './AuthContext'
import { syncUserDocument } from '@/lib/supabase/db'

interface LanguageContextType {
  language: SupportedLanguageCode
  setLanguage: (lang: SupportedLanguageCode) => void
  t: (path: string) => string
  languages: typeof SUPPORTED_LANGUAGES
  currentLanguageConfig: typeof SUPPORTED_LANGUAGES[SupportedLanguageCode]
  currentLanguage: typeof SUPPORTED_LANGUAGES[SupportedLanguageCode]
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [language, setLanguageState] = useState<SupportedLanguageCode>(() => {
    const saved = localStorage.getItem('mentora_language') as SupportedLanguageCode
    if (saved && SUPPORTED_LANGUAGES[saved]) {
      return saved
    }
    return 'en'
  })

  // Sync language with user profile if present
  useEffect(() => {
    if (user?.preferredLanguage && SUPPORTED_LANGUAGES[user.preferredLanguage as SupportedLanguageCode]) {
      setLanguageState(user.preferredLanguage as SupportedLanguageCode)
      localStorage.setItem('mentora_language', user.preferredLanguage)
    }
  }, [user])

  const setLanguage = (lang: SupportedLanguageCode) => {
    if (!SUPPORTED_LANGUAGES[lang]) return
    setLanguageState(lang)
    localStorage.setItem('mentora_language', lang)

    if (user) {
      syncUserDocument(
        { ...user, email: user.email || undefined, displayName: user.displayName || undefined },
        { preferredLanguage: lang }
      ).catch(() => {})
    }
  }

  const t = (path: string): string => {
    const parts = path.split('.')
    if (parts.length === 2) {
      const [section, key] = parts
      return getTranslation(language, section as keyof TranslationDictionary, key)
    }
    return path
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
        currentLanguageConfig: SUPPORTED_LANGUAGES[language],
        currentLanguage: SUPPORTED_LANGUAGES[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export const useTranslation = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }
  return context
}
