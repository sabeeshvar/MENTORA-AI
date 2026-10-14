import dotenv from 'dotenv'

dotenv.config()

export const getGeminiApiKey = (): string => {
  const raw =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''
  return raw.trim().replace(/^["']|["']$/g, '').trim()
}

export const serverConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  get geminiApiKey(): string {
    return getGeminiApiKey()
  },
  get isGeminiConfigured(): boolean {
    const key = getGeminiApiKey()
    return Boolean(
      key &&
      key.length > 5 &&
      !key.includes('your_') &&
      !key.includes('placeholder')
    )
  },
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  isSupabaseConfigured: Boolean(
    process.env.SUPABASE_URL &&
    !process.env.SUPABASE_URL.includes('your-project') &&
    process.env.SUPABASE_ANON_KEY &&
    !process.env.SUPABASE_ANON_KEY.includes('mock-')
  ),
  isServiceRoleConfigured: Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY.trim() !== '' &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('your_') &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')
  ),
}
