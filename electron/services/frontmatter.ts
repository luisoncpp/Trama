import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

export interface ParsedFrontmatter {
  meta: Record<string, unknown>
  content: string
  hadFrontmatter: boolean
  parseError?: string
}

export function parseMarkdownWithFrontmatter(markdown: string): ParsedFrontmatter {
  const lines = markdown.split(/\r?\n/)

  if (lines[0]?.trim() !== '---') {
    return {
      meta: {},
      content: markdown,
      hadFrontmatter: false,
    }
  }

  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
  if (endIndex === -1) {
    return {
      meta: {},
      content: markdown,
      hadFrontmatter: false,
    }
  }

  const block = lines.slice(1, endIndex).join('\n')
  const body = lines.slice(endIndex + 1).join('\n').replace(/^\r?\n/, '')

  try {
    const parsed = parseYaml(block)
    const meta = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}

    return {
      meta,
      content: body,
      hadFrontmatter: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Frontmatter parse error'

    return {
      meta: {},
      content: body,
      hadFrontmatter: true,
      parseError: message,
    }
  }
}

export function serializeMarkdownWithFrontmatter(meta: Record<string, unknown>, content: string): string {
  const entries = Object.entries(meta).filter(([, value]) => value !== undefined)

  if (entries.length === 0) {
    return content
  }

  const normalized = Object.fromEntries(entries)
  const yaml = stringifyYaml(normalized).trimEnd()
  return `---\n${yaml}\n---\n\n${content}`
}
