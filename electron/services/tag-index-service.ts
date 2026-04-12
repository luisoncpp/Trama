import path from 'node:path'
import type { DocumentMeta } from '../../src/shared/ipc.js'

export class TagIndexService {
  private tagToPath = new Map<string, string>()

  constructor(private readonly projectRoot: string) {}

  async buildIndex(markdownFiles: string[], metaByPath: Record<string, DocumentMeta>): Promise<void> {
    this.tagToPath.clear()

    for (const filePath of markdownFiles) {
      const meta = metaByPath[filePath]
      if (!meta) continue

      const tags = meta.tags as unknown as string[] | undefined

      if (Array.isArray(tags)) {
        for (const tag of tags) {
          const normalizedTag = tag.trim().toLowerCase()
          if (normalizedTag) {
            if (this.tagToPath.has(normalizedTag)) {
              const existingPath = this.tagToPath.get(normalizedTag)!
              const newPath = filePath
              if (newPath < existingPath) {
                console.warn(`[TagIndexService] Duplicate tag found: "${normalizedTag}" in ${filePath} and ${existingPath}. Keeping alphabetically first: ${newPath}`)
                this.tagToPath.set(normalizedTag, newPath)
              } else {
                console.warn(`[TagIndexService] Duplicate tag found: "${normalizedTag}" in ${filePath} and ${existingPath}. Keeping alphabetically first: ${existingPath}`)
              }
              continue
            }
            this.tagToPath.set(normalizedTag, filePath)
          }
        }
      }
    }
  }

  resolveMatches(text: string): Array<{
    tag: string
    start: number
    end: number
    filePath: string
  }> {
    const matches: Array<{
      tag: string
      start: number
      end: number
      filePath: string
      length: number
    }> = []

    const sortedTags = Array.from(this.tagToPath.keys()).sort((a, b) => b.length - a.length)

    for (const tag of sortedTags) {
      const regex = new RegExp(`\\b${this.escapeRegExp(tag)}\\b`, 'gi')
      let match: RegExpExecArray | null

      while ((match = regex.exec(text)) !== null) {
        const start = match.index
        const end = regex.lastIndex
        const filePath = this.tagToPath.get(tag)!

        const isOverlapping = matches.some(m =>
          (start >= m.start && start < m.end) ||
          (end > m.start && end <= m.end) ||
          (start <= m.start && end >= m.end)
        )

        if (!isOverlapping) {
          matches.push({
            tag,
            start,
            end,
            filePath,
            length: tag.length
          })
        }
      }
    }

    return matches
      .sort((a, b) => a.start - b.start)
      .map(({ tag, start, end, filePath }) => ({ tag, start, end, filePath }))
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  async clearIndex(): Promise<void> {
    this.tagToPath.clear()
  }

  get size(): number {
    return this.tagToPath.size
  }
}
