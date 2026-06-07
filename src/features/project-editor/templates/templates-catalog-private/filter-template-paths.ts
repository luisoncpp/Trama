import { TEMPLATES_SECTION_ROOT } from '../../../../shared/project-sections'

export interface FilteredTemplate {
  path: string
  name: string
  relativePath: string
}

function extractName(fullPath: string): string {
  const segments = fullPath.split('/')
  const fileName = segments[segments.length - 1] ?? fullPath
  return fileName.replace(/\.md$/i, '')
}

function extractRelativePath(fullPath: string): string {
  const prefix = TEMPLATES_SECTION_ROOT
  if (fullPath.startsWith(prefix)) {
    return fullPath.slice(prefix.length)
  }
  return fullPath
}

export function filterTemplatePaths(paths: string[], query: string): FilteredTemplate[] {
  const normalizedPaths = paths.map((p) => p.replace(/\\/g, '/'))
  const templatePaths = normalizedPaths.filter(
    (p) => p.startsWith(TEMPLATES_SECTION_ROOT) && p.toLowerCase().endsWith('.md'),
  )

  const lowered = query.toLowerCase().trim()

  const results = templatePaths.map((p) => ({
    path: p,
    name: extractName(p),
    relativePath: extractRelativePath(p),
  }))

  if (!lowered) {
    return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'es'))
  }

  return results
    .filter(
      (t) =>
        t.name.toLowerCase().includes(lowered) ||
        t.relativePath.toLowerCase().includes(lowered),
    )
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'es'))
}
