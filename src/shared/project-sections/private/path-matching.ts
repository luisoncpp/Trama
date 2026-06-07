import {
  RELEVANT_SECTION_ROOTS,
  TEMPLATES_SECTION_ROOT,
  TRAMA_INDEX_FILE_NAME,
  TRAMA_MANAGED_DIRECTORY_ROOTS,
} from './constants.js'

export function isRelevantPath(projectRelativePath: string): boolean {
  const normalized = projectRelativePath.replace(/\\/g, '/')
  return RELEVANT_SECTION_ROOTS.some(root => normalized.startsWith(root))
}

export function isTemplatePath(projectRelativePath: string): boolean {
  const normalized = projectRelativePath.replace(/\\/g, '/')
  return normalized.startsWith(TEMPLATES_SECTION_ROOT)
}

export function isManagedPath(projectRelativePath: string): boolean {
  const normalized = projectRelativePath.replace(/\\/g, '/')
  return normalized === TRAMA_INDEX_FILE_NAME || TRAMA_MANAGED_DIRECTORY_ROOTS.some((root) => normalized.startsWith(root))
}
