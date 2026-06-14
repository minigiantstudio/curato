import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Returns the current authenticated user, or null if not signed in.
 * Routes are gated by middleware, so app-route callers always have a user;
 * a null here means the caller should fall back to the offline queue.
 */
export async function getOrCreateSession() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
}
