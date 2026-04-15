import type { BookExportFormat } from '../../src/shared/ipc.js'

function stripLeadingFrontmatter(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n')
  if (!normalized.startsWith('---\n')) {
    return normalized
  }

  const endIndex = normalized.indexOf('\n---\n', 4)
  if (endIndex === -1) {
    return normalized
  }

  return normalized.slice(endIndex + 5)
}

function stripHtmlComments(content: string): string {
  return content.replace(/<!--([\s\S]*?)-->/g, '')
}

function normalizeWhitespace(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim()
}

export function sanitizeForBookExport(content: string, format: BookExportFormat): string {
  const withoutFrontmatter = stripLeadingFrontmatter(content)
  const withoutComments = format === 'markdown'
    ? stripHtmlComments(withoutFrontmatter)
    : withoutFrontmatter

  return normalizeWhitespace(withoutComments)
}
