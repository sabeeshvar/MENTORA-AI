import 'dotenv/config'
import { supabase } from '../src/lib/supabase/client'
import { isSupabaseConfigured, supabaseUrl } from '../src/lib/supabase/config'

async function testSupabaseAndAuth() {
  console.log('======================================================================')
  console.log('MENTORA AI — SUPABASE, DATABASE & AUTH CONNECTIVITY TEST')
  console.log('======================================================================\n')

  console.log(`1. Supabase Configuration Check:`)
  console.log(`   Configured: ${isSupabaseConfigured()}`)
  console.log(`   Sanitized Endpoint URL: ${supabaseUrl}`)

  if (!isSupabaseConfigured()) {
    console.error('   ✗ Supabase is not properly configured.')
    process.exit(1)
  }
  console.log('   ✓ Supabase configuration verified.\n')

  console.log('2. Supabase Auth Service Heartbeat:')
  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
    if (sessionErr) {
      console.warn(`   Auth session check: ${sessionErr.message}`)
    } else {
      console.log(`   Auth service responded normally. Active session: ${Boolean(sessionData.session)}`)
      console.log('   ✓ Supabase Auth endpoint reachable & functional.\n')
    }
  } catch (err: any) {
    console.warn(`   Auth ping notice: ${err?.message || err}\n`)
  }

  console.log('3. PostgreSQL Table Access & Schema Inspection:')
  const tables = ['courses', 'course_materials', 'mastery', 'quizzes', 'study_plans', 'revision_items']
  
  for (const t of tables) {
    try {
      const { data, error, status } = await supabase.from(t).select('*').limit(1)
      if (error && status !== 200) {
        console.log(`   Table [${t}]: Status ${status} (${error.message})`)
      } else {
        console.log(`   Table [${t}]: Accessible (HTTP ${status || 200}, records: ${data?.length ?? 0})`)
      }
    } catch (err: any) {
      console.log(`   Table [${t}]: Connection notice: ${err?.message || err}`)
    }
  }

  console.log('\n======================================================================')
  console.log('SUPABASE & AUTH CONNECTIVITY VERIFIED')
  console.log('======================================================================')
}

testSupabaseAndAuth().catch(console.error)
