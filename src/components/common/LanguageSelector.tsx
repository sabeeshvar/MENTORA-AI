import React from 'react'
import { Globe, ChevronDown } from 'lucide-react'
import { useTranslation } from '@/context/LanguageContext'
import type { SupportedLanguageCode } from '@/types/language'

interface LanguageSelectorProps {
  className?: string
  compact?: boolean
  showLabel?: boolean
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  compact = false,
  showLabel: _showLabel,
}) => {
  const { language, setLanguage, languages } = useTranslation()

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 text-slate-200 transition-colors shadow-sm">
        <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as SupportedLanguageCode)}
          className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer appearance-none pr-4"
          title="Select Learning Language"
        >
          {Object.values(languages).map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-slate-900 text-white py-1">
              {compact ? lang.nativeName : `${lang.nativeName} (${lang.name})`}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
      </div>
    </div>
  )
}
