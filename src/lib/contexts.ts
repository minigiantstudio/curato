import { createClient } from '@/lib/supabase'

export interface Context {
  id: string
  type: 'brand' | 'project'
  name: string
  description: string
}

export async function getContexts(): Promise<Context[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contexts')
    .select('id, type, name, description')
    .eq('archived', false)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as Context[]
}
