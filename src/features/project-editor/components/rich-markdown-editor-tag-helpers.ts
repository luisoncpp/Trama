export interface TagMatch {
  tag: string
  start: number
  end: number
  filePath: string
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function findTagMatchesInText(
  text: string,
  tagIndex: Record<string, string>,
): TagMatch[] {
  if (!tagIndex || Object.keys(tagIndex).length === 0) {
    return []
  }

  const matches: TagMatch[] = []
  const sortedTags = Object.keys(tagIndex).sort((a, b) => b.length - a.length)

  for (const tag of sortedTags) {
    const filePath = tagIndex[tag]
    const escapedTag = escapeRegExp(tag)
    const regex = new RegExp(`\\b${escapedTag}\\b`, 'gi')
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      const start = match.index
      const end = regex.lastIndex

      const isOverlapping = matches.some(
        (m) =>
          (start >= m.start && start < m.end) ||
          (end > m.start && end <= m.end) ||
          (start <= m.start && end >= m.end),
      )

      if (!isOverlapping) {
        matches.push({
          tag,
          start,
          end,
          filePath,
        })
      }
    }
  }

  return matches.sort((a, b) => a.start - b.start)
}

export function isInsideCodeBlock(text: string, position: number): boolean {
  const beforePosition = text.substring(0, position)
  const codeBlockOpenCount = (beforePosition.match(/```/g) || []).length
  if (codeBlockOpenCount % 2 === 1) {
    return true
  }

  const lastNewlineBefore = beforePosition.lastIndexOf('\n')
  const currentLine = beforePosition.substring(lastNewlineBefore + 1)
  if (currentLine.startsWith('    ') || currentLine.startsWith('\t')) {
    return true
  }

  return false
}

export function filterMatchesOutsideCode(text: string, matches: TagMatch[]): TagMatch[] {
  return matches.filter((match) => !isInsideCodeBlock(text, match.start))
}
