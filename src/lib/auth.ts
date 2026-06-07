import { createClient } from '@/lib/supabase'

export async function getOrCreateAnonSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw new Error(`Auth failed: ${error.message}`)
  return data.session
}
