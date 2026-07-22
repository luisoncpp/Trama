// @Architecture(descriptionShort="On-demand word count calculation service across project sections")
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { WordCountsResponse } from '../../src/shared/ipc.js'
import { parseMarkdownWithFrontmatter } from './frontmatter.js'

export function countWordsInText(markdown: string): number {
  const { content } = parseMarkdownWithFrontmatter(markdown)
  const trimmed = content.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

export async function calculateSectionWordCounts(
  projectRoot: string,
  markdownFiles: string[],
): Promise<WordCountsResponse> {
  let manuscript = 0
  let outline = 0
  let lore = 0

  for (const relativePath of markdownFiles) {
    const normalized = relativePath.replace(/\\/g, '/')
    if (!normalized.endsWith('.md')) continue

    try {
      const fullPath = path.resolve(projectRoot, relativePath)
      const text = await readFile(fullPath, 'utf8')
      const count = countWordsInText(text)

      if (normalized.startsWith('book/')) {
        manuscript += count
      } else if (normalized.startsWith('outline/')) {
        outline += count
      } else if (normalized.startsWith('lore/')) {
        lore += count
      }
    } catch {
      // Skip unreadable files
    }
  }

  return {
    manuscript,
    outline,
    lore,
    total: manuscript + outline + lore,
  }
}
