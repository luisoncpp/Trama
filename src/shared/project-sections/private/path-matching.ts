import {
  RELEVANT_SECTION_ROOTS,
  TRAMA_INDEX_FILE_NAME,
  TRAMA_MANAGED_DIRECTORY_ROOTS,
} from './constants.js'

export function isRelevantPath(projectRelativePath: string): boolean {
  const normalized = projectRelativePath.replace(/\\/g, '/')
  return RELEVANT_SECTION_ROOTS.some(root => normalized.startsWith(root))
}

export function isManagedPath(projectRelativePath: string): boolean {
  const normalized = projectRelativePath.replace(/\\/g, '/')
  return normalized === TRAMA_INDEX_FILE_NAME || TRAMA_MANAGED_DIRECTORY_ROOTS.some((root) => normalized.startsWith(root))
}
