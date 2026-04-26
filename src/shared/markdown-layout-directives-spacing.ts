const MAX_SPACER_LINES = 12
const IMAGE_PLACEHOLDER_PREFIX = '<!-- IMAGE_PLACEHOLDER:'

function isBlankLine(line: string): boolean {
  return line.trim().length === 0
}

function renderSpacerDirectiveLines(blankCount: number): string[] {
  if (blankCount <= 1) {
    return ['']
  }

  const output: string[] = ['']
  let remaining = blankCount - 1

  while (remaining > 0) {
    const spacerLines = Math.min(MAX_SPACER_LINES, remaining)
    output.push(`<!-- trama:spacer lines=${spacerLines} -->`)
    output.push('')
    remaining -= spacerLines
  }

  return output
}

export function normalizeBlankLinesToSpacerDirectives(markdown: string): string {
  const lines = markdown.split('\n')
  const output: string[] = []
  let index = 0

  while (index < lines.length) {
    const currentLine = lines[index] ?? ''
    if (currentLine.startsWith(IMAGE_PLACEHOLDER_PREFIX)) {
      output.push(currentLine)
      index += 1
      continue
    }
    output.push(currentLine)

    if (isBlankLine(currentLine)) {
      index += 1
      continue
    }

    let blankCount = 0
    let cursor = index + 1
    while (cursor < lines.length && isBlankLine(lines[cursor] ?? '')) {
      blankCount += 1
      cursor += 1
    }

    if (blankCount > 0 && cursor < lines.length) {
      output.push(...renderSpacerDirectiveLines(blankCount))
      index = cursor
      continue
    }

    index += 1
  }

  return output.join('\n')
}