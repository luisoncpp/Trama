const CENTER_START = '<!-- trama:center:start -->'
const CENTER_END = '<!-- trama:center:end -->'
const PAGEBREAK = '<!-- trama:pagebreak -->'

interface DirectiveArtifactClassList {
  contains: (token: string) => boolean
  forEach: (callback: (token: string) => void) => void
}

interface DirectiveArtifactNode {
  getAttribute: (name: string) => string | null
  classList: DirectiveArtifactClassList
}

function decodeRawDirective(raw: string | null): string {
  if (!raw) return ''
  try {
    return decodeURIComponent(raw)
  } catch {
    return ''
  }
}

function getSpacerLinesClassToken(classList: DirectiveArtifactClassList): string | undefined {
  const tokens: string[] = []
  classList.forEach((token) => {
    tokens.push(token)
  })
  return tokens.find((className) => /^trama-spacer-(\d+)$/.test(className))
}

export function serializeDirectiveArtifactNode(node: DirectiveArtifactNode): string | null {
  const directive = node.getAttribute('data-trama-directive')
  const classList = node.classList
  if (!directive) {
    if (classList.contains('trama-pagebreak')) return PAGEBREAK
    if (classList.contains('trama-center-boundary')) {
      if (classList.contains('trama-center-end')) return CENTER_END
      return CENTER_START
    }
    if (classList.contains('trama-spacer')) {
      const classLines = getSpacerLinesClassToken(classList)
      const match = classLines?.match(/^trama-spacer-(\d+)$/)
      const lines = Number.parseInt(match?.[1] ?? '1', 10)
      const safeLines = Number.isInteger(lines) && lines >= 1 && lines <= 12 ? lines : 1
      return `<!-- trama:spacer lines=${safeLines} -->`
    }
    return null
  }

  if (directive === 'center') {
    const role = node.getAttribute('data-trama-role')
    if (role === 'start') return CENTER_START
    if (role === 'end') return CENTER_END
    return null
  }

  if (directive === 'spacer') {
    const lines = Number.parseInt(node.getAttribute('data-trama-lines') ?? '1', 10)
    const safeLines = Number.isInteger(lines) && lines >= 1 && lines <= 12 ? lines : 1
    return `<!-- trama:spacer lines=${safeLines} -->`
  }

  if (directive === 'pagebreak') {
    return PAGEBREAK
  }
  if (directive === 'unknown') {
    const raw = decodeRawDirective(node.getAttribute('data-trama-raw'))
    return raw || '<!-- trama:unknown -->'
  }

  return null
}
