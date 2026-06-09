// src/app/capsule/[id]/page.tsx
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Capsule } from '@/types/capsule'
import type { Context } from '@/types/context'
import { PublicDossierClient } from '@/components/dossier/PublicDossierClient'

interface PageProps {
  params: { capsuleId: string }
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createSupabaseClient(url, key)
}

async function getData(id: string) {
  const supabase = createServiceClient()

  const { data: capsuleData } = await supabase
    .from('capsules')
    .select('*')
    .eq('id', id)
    .single()

  if (!capsuleData) return null
  const capsule = capsuleData as Capsule & { is_public?: boolean }
  if (!capsule.is_public) return null

  let context: Context | null = null
  if (capsule.context_id) {
    const { data: contextData } = await supabase
      .from('contexts')
      .select('*')
      .eq('id', capsule.context_id)
      .single()
    context = (contextData as Context) ?? null
  }

  if (!context) return null

  let parent: Context | null = null
  if (context.parent_context_id) {
    const { data: parentData } = await supabase
      .from('contexts')
      .select('*')
      .eq('id', context.parent_context_id)
      .single()
    parent = (parentData as Context) ?? null
  }

  return { capsule: capsule as Capsule, context, parent }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getData(params.capsuleId)
  if (!data) return { title: 'Capsule not found' }
  const { capsule, context } = data
  return {
    title: `${context.name} ${capsule.version} — Taste Capsule`,
    description: capsule.declaration,
    openGraph: {
      title: `${context.name} ${capsule.version}`,
      description: capsule.declaration,
      type: 'article',
    },
  }
}

export default async function PublicCapsulePage({ params }: PageProps) {
  const data = await getData(params.capsuleId)
  if (!data) notFound()
  const { capsule, context, parent } = data
  return <PublicDossierClient capsule={capsule} context={context} parent={parent} />
}
