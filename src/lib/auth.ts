import { createClient } from '@/lib/supabase'

/**
 * Returns the current session, or null if not signed in.
 * (Anonymous sign-in was removed in favour of magic-link auth.)
 */
export async function getOrCreateAnonSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
