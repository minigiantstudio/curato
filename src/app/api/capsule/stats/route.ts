import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { fetchCapsuleStats } from '@/lib/guidelines-generator'

export async function GET(req: NextRequest) {
  const capsuleId = req.nextUrl.searchParams.get('capsuleId')
  if (!capsuleId) return NextResponse.json({ error: 'capsuleId required' }, { status: 400 })

  const authed = await createServerSupabaseClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify user owns the capsule via RLS-scoped authed client
  const { data: cap } = await authed
    .from('capsules')
    .select('id')
    .eq('id', capsuleId)
    .single()
  if (!cap) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const stats = await fetchCapsuleStats(capsuleId)
    return NextResponse.json(stats)
  } catch (err) {
    console.error('capsule/stats: fetchCapsuleStats failed:', err)
    return NextResponse.json({ error: 'Stats unavailable' }, { status: 500 })
  }
}
