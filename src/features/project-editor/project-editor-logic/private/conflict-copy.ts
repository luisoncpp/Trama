export function buildConflictCopyPath(originalPath: string, existingPaths: string[]): string {
  const normalizedOriginal = originalPath.replace(/\\/g, '/')
  const existing = new Set(existingPaths.map((value) => value.replace(/\\/g, '/')))
  const extension = '.md'

  if (!normalizedOriginal.endsWith(extension)) {
    throw new Error('Only markdown files are supported for save-as-copy')
  }

  const withoutExtension = normalizedOriginal.slice(0, -extension.length)
  let attempt = `${withoutExtension}.conflict-copy${extension}`
  let sequence = 2

  while (existing.has(attempt)) {
    attempt = `${withoutExtension}.conflict-copy-${sequence}${extension}`
    sequence += 1
  }

  return attempt
}
