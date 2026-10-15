import 'dotenv/config'
import { supabase } from '../src/lib/supabase/client'
import {
  isSupabaseConfigured,
  supabaseUrl,
  supabaseProjectRef,
  checkSupabaseReachability,
} from '../src/lib/supabase/config'

async function testSupabaseAndAuth() {
  console.log('======================================================================')
  console.log('MENTORA AI — SUPABASE, DATABASE & AUTH CONNECTIVITY DIAGNOSTIC')
  console.log('======================================================================\n')

  console.log(`1. Supabase Client Configuration:`)
  console.log(`   Configured: ${isSupabaseConfigured()}`)
  console.log(`   Project Ref: ${supabaseProjectRef || 'unknown'}`)
  console.log(`   Sanitized Endpoint URL: ${supabaseUrl}`)

  if (!isSupabaseConfigured()) {
    console.error('   ✗ Supabase is not configured (missing URL or Anon key).')
    return
  }
  console.log('   ✓ Supabase URL & Key format configured.\n')

  console.log('2. Live Endpoint DNS & Network Reachability Probe:')
  const reachability = await checkSupabaseReachability(3500)
  if (!reachability.reachable) {
    console.log(`   ✗ Reachability Status: UNREACHABLE`)
    console.log(`   ✗ Detail: ${reachability.error}`)
    if (reachability.isDnsFailure) {
      console.log(`\n   [CRITICAL DIAGNOSIS]`)
      console.log(`   Hostname ${supabaseProjectRef}.supabase.co does NOT resolve in DNS (NXDOMAIN).`)
      console.log(`   This occurs when a Supabase project has been paused (after inactivity) or deleted.`)
      console.log(`   To restore:`)
      console.log(`     1. Navigate to: https://supabase.com/dashboard/project/${supabaseProjectRef}`)
      console.log(`     2. Click "Restore project"`)
      console.log(`     3. Wait 1-2 minutes for Cloudflare DNS propagation.`)
    }
    console.log('\n======================================================================')
    console.log('DIAGNOSTIC COMPLETED — PAUSED/UNREACHABLE PROJECT IDENTIFIED')
    console.log('======================================================================')
    return
  }

  console.log(`   ✓ Endpoint Reachable (HTTP Status: ${reachability.status || 200})\n`)

  console.log('3. Supabase Auth Service Heartbeat:')
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

  console.log('4. PostgreSQL Table Access & Schema Inspection:')
  const tables = [
    'profiles',
    'courses',
    'course_materials',
    'course_chunks',
    'course_topics',
    'mastery',
    'quizzes',
    'quiz_attempts',
    'study_plans',
    'revision_items',
    'recommendations',
    'evaluation_results',
  ]

  let accessibleCount = 0
  for (const t of tables) {
    try {
      const { data, error, status } = await supabase.from(t).select('*').limit(1)
      if (error && status !== 200) {
        console.log(`   Table [${t}]: Status ${status} (${error.message})`)
      } else {
        accessibleCount++
        console.log(`   Table [${t}]: Accessible (HTTP ${status || 200}, records: ${data?.length ?? 0})`)
      }
    } catch (err: any) {
      console.log(`   Table [${t}]: Connection notice: ${err?.message || err}`)
    }
  }

  console.log(`\n5. pgvector RPC (match_course_chunks) Inspection:`)
  try {
    const dummyEmbedding = new Array(256).fill(0.01)
    const { data: rpcData, error: rpcError, status: rpcStatus } = await supabase.rpc('match_course_chunks', {
      p_course_id: '00000000-0000-0000-0000-000000000000',
      query_embedding: dummyEmbedding,
      match_threshold: 0.1,
      match_count: 1,
    })
    if (rpcError) {
      console.log(`   RPC [match_course_chunks]: Status ${rpcStatus} (${rpcError.message})`)
    } else {
      console.log(`   RPC [match_course_chunks]: Accessible & Functional (results: ${rpcData?.length ?? 0})`)
    }
  } catch (err: any) {
    console.log(`   RPC [match_course_chunks]: Notice: ${err?.message || err}`)
  }

  console.log('\n======================================================================')
  console.log('SUPABASE & AUTH CONNECTIVITY DIAGNOSTIC COMPLETE')
  console.log('======================================================================')
}

testSupabaseAndAuth().catch(console.error)
