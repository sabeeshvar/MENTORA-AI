export type SupportedLanguageCode =
  | 'en'
  | 'ta'
  | 'hi'
  | 'te'
  | 'ml'
  | 'kn'
  | 'bn'
  | 'mr'

export interface LanguageConfig {
  code: SupportedLanguageCode
  name: string
  nativeName: string
  locale: string
  direction: 'ltr' | 'rtl'
  greeting: string
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguageCode, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    locale: 'en-US',
    direction: 'ltr',
    greeting: 'Welcome back',
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    locale: 'ta-IN',
    direction: 'ltr',
    greeting: 'வணக்கம்',
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    locale: 'hi-IN',
    direction: 'ltr',
    greeting: 'नमस्ते',
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    locale: 'te-IN',
    direction: 'ltr',
    greeting: 'నమస్కారం',
  },
  ml: {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    locale: 'ml-IN',
    direction: 'ltr',
    greeting: 'നമസ്കാരം',
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    locale: 'kn-IN',
    direction: 'ltr',
    greeting: 'ನಮಸ್ಕಾರ',
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    locale: 'bn-IN',
    direction: 'ltr',
    greeting: 'নমস্কার',
  },
  mr: {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    locale: 'mr-IN',
    direction: 'ltr',
    greeting: 'नमस्कार',
  },
}
