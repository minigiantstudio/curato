export function buildGitHubRawUrl(repo: string, branch: string, filePath: string): string {
  const normalised = filePath.startsWith('/') ? filePath.slice(1) : filePath
  return `https://raw.githubusercontent.com/${repo}/${branch}/${normalised}`
}

export async function validateGitHubConnection(
  repo: string,
  branch: string,
  skillPath: string,
  tokensPath: string,
  pat?: string
): Promise<{
  valid: boolean
  skill_md_url: string | null
  skill_md_content: string | null
  tokens_url: string | null
  error: string | null
}> {
  try {
    const skill_md_url = buildGitHubRawUrl(repo, branch, skillPath)
    const headers: Record<string, string> = pat ? { Authorization: `Bearer ${pat}` } : {}

    const res = await fetch(skill_md_url, { headers })

    if (res.status === 404) {
      return { valid: false, skill_md_url: null, skill_md_content: null, tokens_url: null,
        error: `SKILL.md not found at ${skillPath} in ${repo}` }
    }
    if (res.status === 401 || res.status === 403) {
      return { valid: false, skill_md_url: null, skill_md_content: null, tokens_url: null,
        error: 'Repository is private. Add a GitHub PAT.' }
    }
    if (!res.ok) {
      return { valid: false, skill_md_url: null, skill_md_content: null, tokens_url: null,
        error: `Fetch failed with status ${res.status}` }
    }

    const content = await res.text()
    if (!content.trimStart().startsWith('---')) {
      return { valid: false, skill_md_url: null, skill_md_content: null, tokens_url: null,
        error: 'Not a valid SKILL.md' }
    }

    // Try to detect tokens file at {tokensPath}colors.css
    const tokensBase = tokensPath.endsWith('/') ? tokensPath : `${tokensPath}/`
    const tokens_url_candidate = buildGitHubRawUrl(repo, branch, `${tokensBase}colors.css`)
    let tokens_url: string | null = null
    try {
      const tokensRes = await fetch(tokens_url_candidate, { headers })
      if (tokensRes.ok) tokens_url = tokens_url_candidate
    } catch {
      // tokens not required — silently ignore
    }

    return {
      valid: true,
      skill_md_url,
      skill_md_content: content.slice(0, 500),
      tokens_url,
      error: null,
    }
  } catch (err) {
    return { valid: false, skill_md_url: null, skill_md_content: null, tokens_url: null,
      error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function validateRawURL(url: string): Promise<{
  valid: boolean
  skill_md_url: string | null
  skill_md_content: string | null
  tokens_url: string | null
  error: string | null
}> {
  try {
    const res = await fetch(url)

    if (!res.ok) {
      return { valid: false, skill_md_url: null, skill_md_content: null, tokens_url: null,
        error: `URL returned ${res.status}` }
    }

    const content = await res.text()
    if (!content.trimStart().startsWith('---') && !content.includes('name:')) {
      return { valid: false, skill_md_url: null, skill_md_content: null, tokens_url: null,
        error: 'Does not look like a valid SKILL.md' }
    }

    return {
      valid: true,
      skill_md_url: url,
      skill_md_content: content.slice(0, 500),
      tokens_url: null,
      error: null,
    }
  } catch (err) {
    return { valid: false, skill_md_url: null, skill_md_content: null, tokens_url: null,
      error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export function extractSkillName(content: string): string | null {
  const match = content.match(/^---[\s\S]*?name:\s*['"]?([^'"\n]+)['"]?/m)
  return match ? match[1].trim() : null
}

export async function fetchGitHubFile(
  repo: string,
  branch: string,
  filePath: string,
  pat?: string
): Promise<string | null> {
  try {
    const url = buildGitHubRawUrl(repo, branch, filePath)
    const headers: Record<string, string> = pat ? { Authorization: `Bearer ${pat}` } : {}
    const res = await fetch(url, { headers })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}
