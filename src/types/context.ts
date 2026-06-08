export interface Context {
  id: string
  user_id: string
  created_at: string
  type: 'brand' | 'project'
  name: string
  description: string
  parent_context_id: string | null
  cover_capture_id: string | null
  archived: boolean
}

export interface ContextInsert {
  type: 'brand' | 'project'
  name: string
  description?: string
  parent_context_id?: string | null
  cover_capture_id?: string | null
}
