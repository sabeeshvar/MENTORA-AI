import dotenv from 'dotenv'

dotenv.config()

export const serverConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  isGeminiConfigured: Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY.trim() !== '' &&
    !process.env.GEMINI_API_KEY.includes('your_')
  ),
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  isSupabaseConfigured: Boolean(
    process.env.SUPABASE_URL &&
    !process.env.SUPABASE_URL.includes('your-project') &&
    process.env.SUPABASE_ANON_KEY &&
    !process.env.SUPABASE_ANON_KEY.includes('mock-')
  ),
}
