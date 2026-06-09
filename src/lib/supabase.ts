import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Returns the current user, signing in anonymously if no session exists.
 * Call this before any write operation that requires auth.uid() in RLS.
 */
export async function getOrCreateSession() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return user

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.error('getOrCreateSession: anon sign-in failed', error)
    return null
  }
  return data.user
}
