import type { SidebarRenameInput } from '../features/project-editor/project-editor-types.js'

export function normalizeName(value: string): string {
  return value.trim().replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '')
}

export function isInvalidRenameInput(input: SidebarRenameInput): boolean {
  const normalizedName = normalizeName(input.newName)
  return !input.path || normalizedName.length === 0 || normalizedName.includes('/')
}

export function getBaseName(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments.at(-1) ?? path
}

export function deduplicateTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const value of tags) {
    const next = value.trim()
    if (!next) {
      continue
    }

    const key = next.toLocaleLowerCase()
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    normalized.push(next)
  }

  return normalized
}

export function parseStringAsTags(rawValue: string): string[] {
  const tags: string[] = []
  for (const entry of rawValue.split(/[\n,]/g)) {
    const next = entry.trim()
    if (next) {
      tags.push(next)
    }
  }

  return deduplicateTags(tags)
}

export function serializeTags(tags: unknown): string {
  if (!Array.isArray(tags)) {
    return ''
  }

  return tags
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(', ')
}