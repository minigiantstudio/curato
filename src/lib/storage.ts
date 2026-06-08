import { createClient } from '@/lib/supabase'

const BUCKET = 'capture-media'

/**
 * Upload a file to Supabase Storage under the authenticated user's folder.
 * Returns the storage path on success, null on failure.
 */
export async function uploadMedia(file: File, folder: 'photos' | 'audio'): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${user.id}/${folder}/${Date.now()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    console.error('Storage upload error:', error)
    return null
  }

  return path
}

/**
 * Get a signed URL (1 hour) for a private media path.
 */
export async function getMediaUrl(path: string): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}
