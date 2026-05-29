export const RELEVANT_SECTION_NAMES = ['book', 'outline', 'lore'] as const

export const TRAMA_MANAGED_DIRECTORY_NAMES = ['book', 'outline', 'lore', 'res'] as const
export const TRAMA_INDEX_FILE_NAME = '.trama.index.json' as const

export const RELEVANT_SECTION_ROOTS: readonly string[] = RELEVANT_SECTION_NAMES.map(n => `${n}/`)
export const TRAMA_MANAGED_DIRECTORY_ROOTS: readonly string[] = TRAMA_MANAGED_DIRECTORY_NAMES.map((name) => `${name}/`)

export function isRelevantPath(projectRelativePath: string): boolean {
  const normalized = projectRelativePath.replace(/\\/g, '/')
  return RELEVANT_SECTION_ROOTS.some(root => normalized.startsWith(root))
}

export function isManagedPath(projectRelativePath: string): boolean {
  const normalized = projectRelativePath.replace(/\\/g, '/')
  return normalized === TRAMA_INDEX_FILE_NAME || TRAMA_MANAGED_DIRECTORY_ROOTS.some((root) => normalized.startsWith(root))
}
