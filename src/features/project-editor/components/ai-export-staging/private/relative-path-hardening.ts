import { isRelevantPath } from '../../../../../shared/project-sections'

export type StagingHardenReport = {
  accepted: string[]
  skippedOutsideProject: number
  skippedIrrelevant: number
  skippedDotSegment: number
  skippedDuplicates: number
}

export function normalizeSlashes(path: string): string {
  return path.replace(/\\/g, '/')
}

export function normalizeProjectRoot(projectRoot: string): string {
  return normalizeSlashes(projectRoot).replace(/\/+$/, '')
}

export function absoluteToProjectRelative(absolutePath: string, projectRoot: string): string | null {
  const abs = normalizeSlashes(absolutePath)
  const root = normalizeProjectRoot(projectRoot)
  const absLower = abs.toLowerCase()
  const rootLower = root.toLowerCase()
  const prefixLower = `${rootLower}/`

  if (absLower !== rootLower && !absLower.startsWith(prefixLower)) {
    return null
  }

  const relative = abs.slice(root.length).replace(/^\/+/, '')
  return relative || null
}

function hasDotPathSegment(relativePath: string): boolean {
  return relativePath.split('/').some((segment) => segment.startsWith('.'))
}

export function hardenAbsolutePaths(absolutePaths: string[], projectRoot: string): StagingHardenReport {
  const accepted: string[] = []
  let skippedOutsideProject = 0
  let skippedIrrelevant = 0
  let skippedDotSegment = 0

  for (const absolutePath of absolutePaths) {
    const relative = absoluteToProjectRelative(absolutePath, projectRoot)
    if (relative === null) {
      skippedOutsideProject += 1
      continue
    }

    if (hasDotPathSegment(relative)) {
      skippedDotSegment += 1
      continue
    }

    if (!isRelevantPath(relative) || relative.endsWith('/')) {
      skippedIrrelevant += 1
      continue
    }

    accepted.push(relative)
  }

  return {
    accepted,
    skippedOutsideProject,
    skippedIrrelevant,
    skippedDotSegment,
    skippedDuplicates: 0,
  }
}

export function mergeIntoStagingBasket(currentPaths: string[], incomingPaths: string[]): {
  paths: string[]
  report: Pick<StagingHardenReport, 'accepted' | 'skippedDuplicates'>
} {
  const seen = new Set(currentPaths)
  const accepted: string[] = []
  let skippedDuplicates = 0

  for (const path of incomingPaths) {
    if (seen.has(path)) {
      skippedDuplicates += 1
      continue
    }
    seen.add(path)
    accepted.push(path)
  }

  return {
    paths: [...currentPaths, ...accepted],
    report: { accepted, skippedDuplicates },
  }
}

export function formatStagingSkipMessage(report: StagingHardenReport): string | null {
  const parts: string[] = []
  if (report.skippedOutsideProject > 0) {
    parts.push(`${report.skippedOutsideProject} outside project`)
  }
  if (report.skippedIrrelevant > 0) {
    parts.push(`${report.skippedIrrelevant} not in book/lore/outline`)
  }
  if (report.skippedDotSegment > 0) {
    parts.push(`${report.skippedDotSegment} hidden path`)
  }
  if (report.skippedDuplicates > 0) {
    parts.push(`${report.skippedDuplicates} duplicate${report.skippedDuplicates === 1 ? '' : 's'}`)
  }

  if (parts.length === 0) {
    return null
  }

  return `Skipped: ${parts.join(', ')}.`
}
