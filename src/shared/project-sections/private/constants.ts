export const RELEVANT_SECTION_NAMES = ['book', 'outline', 'lore'] as const

export const TEMPLATES_DIRECTORY_NAME = 'templates' as const
export const TEMPLATES_SECTION_ROOT = `${TEMPLATES_DIRECTORY_NAME}/` as const

export const TRAMA_MANAGED_DIRECTORY_NAMES = ['book', 'outline', 'lore', 'res', 'templates'] as const
export const TRAMA_INDEX_FILE_NAME = '.trama.index.json' as const

export const RELEVANT_SECTION_ROOTS: readonly string[] = RELEVANT_SECTION_NAMES.map(n => `${n}/`)
export const TRAMA_MANAGED_DIRECTORY_ROOTS: readonly string[] = TRAMA_MANAGED_DIRECTORY_NAMES.map((name) => `${name}/`)
