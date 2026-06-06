export const RELEVANT_SECTION_NAMES = ['book', 'outline', 'lore'] as const

export const TRAMA_MANAGED_DIRECTORY_NAMES = ['book', 'outline', 'lore', 'res'] as const
export const TRAMA_INDEX_FILE_NAME = '.trama.index.json' as const

export const RELEVANT_SECTION_ROOTS: readonly string[] = RELEVANT_SECTION_NAMES.map(n => `${n}/`)
export const TRAMA_MANAGED_DIRECTORY_ROOTS: readonly string[] = TRAMA_MANAGED_DIRECTORY_NAMES.map((name) => `${name}/`)
