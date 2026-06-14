import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateGuidelines } from '@/lib/guidelines-generator'
import type { GuidelinesFormat } from '@/types/guidelines'

const EXT: Record<GuidelinesFormat, string> = { markdown: 'md', text: 'txt', json: 'json' }
const MIME: Record<GuidelinesFormat, string> = {
  markdown: 'text/markdown; charset=utf-8',
  text: 'text/plain; charset=utf-8',
  json: 'application/json; charset=utf-8',
}

/** Lowercase-kebab, alnum only; falls back to 'capsule'. */
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'capsule'
}

export async function GET(
  req: NextRequest,
  { params }: { params: { capsuleId: string } },
) {
  const { capsuleId } = params
  const fmtParam = req.nextUrl.searchParams.get('format')
  const format: GuidelinesFormat =
    fmtParam === 'text' || fmtParam === 'json' ? fmtParam : 'markdown'
  const slug = slugify(req.nextUrl.searchParams.get('filename') ?? 'capsule')

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const out = await generateGuidelines(capsuleId, [format], { supabase })

    const body =
      format === 'json' ? JSON.stringify(out.json ?? {}, null, 2)
      : format === 'text' ? (out.text ?? '')
      : (out.markdown ?? '')

    const filename = `${slug}-guidelines.${EXT[format]}`
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': MIME[format],
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const notFound = msg.startsWith('Capsule not found')
    if (!notFound) console.error('guidelines export failed:', msg)
    return NextResponse.json(
      { error: notFound ? 'Capsule not found' : 'Export failed' },
      { status: notFound ? 404 : 500 },
    )
  }
}
