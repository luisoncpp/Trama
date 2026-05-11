export const RELEVANT_SECTION_NAMES = ['book', 'outline', 'lore'] as const

export const RELEVANT_SECTION_ROOTS: readonly string[] = RELEVANT_SECTION_NAMES.map(n => `${n}/`)

export function isRelevantPath(projectRelativePath: string): boolean {
  const normalized = projectRelativePath.replace(/\\/g, '/')
  return RELEVANT_SECTION_ROOTS.some(root => normalized.startsWith(root))
}
