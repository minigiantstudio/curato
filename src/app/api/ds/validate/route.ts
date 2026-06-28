import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { validateGitHubConnection, validateRawURL, extractSkillName } from '@/lib/github'
import type { DSValidationResult } from '@/lib/types/design-system'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { source, ...rest } = body as Record<string, string>

    if (source === 'github') {
      const { github_repo, github_branch, github_skill_path, github_tokens_path, github_pat } = rest

      if (!github_repo || github_repo.split('/').length !== 2) {
        const result: DSValidationResult = {
          valid: false,
          source: 'github',
          skill_md_url: null,
          tokens_css_url: null,
          skill_md_preview: null,
          ds_name_detected: null,
          error: 'github_repo must be in the format owner/repo',
        }
        return NextResponse.json(result)
      }

      const validation = await validateGitHubConnection(
        github_repo,
        github_branch || 'main',
        github_skill_path || 'SKILL.md',
        github_tokens_path || '',
        github_pat || undefined
      )

      const result: DSValidationResult = {
        valid: validation.valid,
        source: 'github',
        skill_md_url: validation.skill_md_url,
        tokens_css_url: validation.tokens_url,
        skill_md_preview: validation.skill_md_content,
        ds_name_detected: validation.skill_md_content
          ? extractSkillName(validation.skill_md_content)
          : null,
        error: validation.error,
      }
      return NextResponse.json(result)
    }

    if (source === 'url') {
      const { raw_skill_url, raw_tokens_url } = rest

      if (!raw_skill_url) {
        const result: DSValidationResult = {
          valid: false,
          source: 'url',
          skill_md_url: null,
          tokens_css_url: null,
          skill_md_preview: null,
          ds_name_detected: null,
          error: 'SKILL.md URL is required',
        }
        return NextResponse.json(result)
      }

      const validation = await validateRawURL(raw_skill_url)

      const result: DSValidationResult = {
        valid: validation.valid,
        source: 'url',
        skill_md_url: validation.skill_md_url,
        tokens_css_url: raw_tokens_url || null,
        skill_md_preview: validation.skill_md_content,
        ds_name_detected: validation.skill_md_content
          ? extractSkillName(validation.skill_md_content)
          : null,
        error: validation.error,
      }
      return NextResponse.json(result)
    }

    if (source === 'manual') {
      const result: DSValidationResult = {
        valid: true,
        source: 'manual',
        skill_md_url: null,
        tokens_css_url: null,
        skill_md_preview: null,
        ds_name_detected: null,
        error: null,
      }
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid source type' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
