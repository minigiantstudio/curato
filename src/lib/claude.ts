import type { AgentResponse } from '@/types/agent'
import type { CaptureType } from '@/types/capture'

const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY
const CLAUDE_MODEL = 'claude-sonnet-4-6'

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

async function callClaude(messages: ClaudeMessage[]): Promise<string> {
  if (!CLAUDE_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      messages,
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error: ${response.status} ${error}`)
  }

  const data = (await response.json()) as { content: Array<{ type: string; text: string }> }
  const textBlock = data.content.find(b => b.type === 'text')
  if (!textBlock) throw new Error('No text response from Claude')
  return textBlock.text
}

export async function analyzeCapture(
  captureType: CaptureType,
  content: string,
  existingTags: string[],
  existingContexts: Array<{ id: string; name: string; type: string; description: string }>
): Promise<AgentResponse> {
  const tagsList = existingTags.slice(0, 30).join(', ')
  const contextsList = existingContexts
    .map(c => `${c.name} (${c.type}): ${(c.description ?? '').slice(0, 200)}`)
    .join('\n')

  const prompt = `You are the organization agent for Taste, an Art Director's aesthetic capture system.

Given this capture:
Type: ${captureType}
Content: ${content}

Existing tags in this library (top 30): ${tagsList || 'none yet'}
Existing contexts (brands/projects):
${contextsList || 'none yet'}

Return ONLY a JSON object (no markdown, no explanation):
{
  "suggested_tags": ["tag1", "tag2"],
  "suggested_domains": ["domain1"],
  "suggested_context_ids": ["context-id-1"],
  "extracted_rule": null
}

Rules for suggestions:
- Tags: 2-5 tags, prefer existing ones if they fit the content
- Domains: from this list only: Spatial, Type, Color, Garments, Objects, Sound, Print
- Contexts: only include if the content clearly belongs to a brand/project
- Set extracted_rule to a {"verb": "ALWAYS|NEVER|PREFER|AVOID", "text": "..."} object only when the content contains a hard constraint; otherwise null
- Return valid JSON only`

  const response = await callClaude([{ role: 'user', content: prompt }])
  try {
    return JSON.parse(response) as AgentResponse
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${response}`)
  }
}
