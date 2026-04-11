const FILE_HEADER = /^===\s*FILE:\s*(.+?)\s*===\r?\n/gim

interface ParsedFile {
  path: string
  content: string
}

export function parseClipboardContent(clipboardContent: string): ParsedFile[] {
  const files: ParsedFile[] = []
  let match: RegExpExecArray | null

  while ((match = FILE_HEADER.exec(clipboardContent)) !== null) {
    const filePath = match[1].trim()
    const contentStart = FILE_HEADER.lastIndex
    const nextMatch = FILE_HEADER.exec(clipboardContent)

    let contentEnd: number
    if (nextMatch) {
      contentEnd = nextMatch.index
      FILE_HEADER.lastIndex = nextMatch.index
    } else {
      contentEnd = clipboardContent.length
    }

    const content = clipboardContent.substring(contentStart, contentEnd).trim()

    if (filePath && content) {
      files.push({ path: filePath, content })
    }

    if (!nextMatch) break
  }

  // Reset regex state
  FILE_HEADER.lastIndex = 0

  return files
}
