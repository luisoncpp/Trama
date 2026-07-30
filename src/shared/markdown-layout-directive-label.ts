// @Architecture(descriptionShort="Canonical optional labels for invisible layout directives")

export interface ParsedDirectiveLabel {
  base: string
  label?: string
  warning?: string
}

function normalizeLabel(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : undefined
}

function escapeCommentJson(value: string): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
}

export function parseDirectiveLabelSuffix(value: string, line: number): ParsedDirectiveLabel {
  const markerIndex = value.indexOf(' label=')
  if (markerIndex < 0) {
    return { base: value }
  }

  const base = value.slice(0, markerIndex)
  const encoded = value.slice(markerIndex + 7)
  try {
    const parsed: unknown = JSON.parse(encoded)
    if (typeof parsed !== 'string' || /[\r\n]/.test(parsed)) {
      return { base, warning: `Invalid directive label on line ${line}; label omitted.` }
    }
    return { base, label: normalizeLabel(parsed) }
  } catch {
    return { base, warning: `Invalid directive label on line ${line}; label omitted.` }
  }
}

export function serializeDirectiveLabelSuffix(label: string | undefined): string {
  const normalized = normalizeLabel(label)
  return normalized ? ` label=${escapeCommentJson(normalized)}` : ''
}

export function normalizeDirectiveLabel(value: string | null | undefined): string | undefined {
  return normalizeLabel(value ?? undefined)
}

export function escapeDirectiveHtmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll("'", '&#39;')
}

export function decodeDirectiveHtmlAttribute(value: string | null): string | undefined {
  if (value === null) {
    return undefined
  }

  return normalizeLabel(value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&'))
}
