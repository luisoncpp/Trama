import { isRelevantPath } from '../../../../../shared/project-sections'
import type { ProjectSnapshot, TreeItem, ProjectIndex } from '../../../../../shared/ipc'

export type StagingHardenReport = {
  accepted: string[]
  skippedOutsideProject: number
  skippedIrrelevant: number
  skippedDotSegment: number
  skippedDuplicates: number
}

function normalizeSlashes(path: string): string {
  return path.replace(/\\/g, '/')
}

function normalizeProjectRoot(projectRoot: string): string {
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

function idFromIndex(index: ProjectIndex, filePath: string): string {
  const meta = index.cache[filePath]
  if (meta && typeof meta.id === 'string' && meta.id.trim()) {
    return meta.id
  }
  return filePath
}

function sortTreeItems(items: TreeItem[], index: ProjectIndex, parentPath: string): TreeItem[] {
  const folders = items.filter((item) => item.type === 'folder')
  const files = items.filter((item) => item.type === 'file')

  if (parentPath === '') {
    const SECTION_ORDER = ['book', 'outline', 'lore']
    const getPriority = (item: TreeItem) => {
      const idx = SECTION_ORDER.indexOf(item.path)
      return idx === -1 ? 999 : idx
    }

    folders.sort((a, b) => {
      const pA = getPriority(a)
      const pB = getPriority(b)
      if (pA !== pB) return pA - pB
      return a.title.localeCompare(b.title, 'es')
    })
  } else {
    folders.sort((a, b) => a.title.localeCompare(b.title, 'es'))
  }

  const explicitOrder = index.corkboardOrder[parentPath] ?? []
  const rankById = new Map<string, number>()
  for (let i = 0; i < explicitOrder.length; i++) {
    rankById.set(explicitOrder[i], i)
  }

  files.sort((left, right) => {
    const leftId = idFromIndex(index, left.path)
    const rightId = idFromIndex(index, right.path)
    const leftRank = rankById.get(leftId)
    const rightRank = rankById.get(rightId)

    if (leftRank != null && rightRank != null) {
      return leftRank - rightRank
    }
    if (leftRank != null) {
      return -1
    }
    if (rightRank != null) {
      return 1
    }
    return left.title.localeCompare(right.title, 'es')
  })

  return [...folders, ...files]
}

function getSortedFilePaths(tree: TreeItem[], index: ProjectIndex): string[] {
  const result: string[] = []

  const visit = (items: TreeItem[], parentPath: string) => {
    const sorted = sortTreeItems(items, index, parentPath)
    for (const item of sorted) {
      if (item.type === 'file') {
        result.push(item.path)
      } else if (item.children) {
        visit(item.children, item.path)
      }
    }
  }

  visit(tree, '')
  return result
}

export function sortPathsByProjectIndex(
  basketPaths: string[],
  snapshot: ProjectSnapshot | null,
): string[] {
  if (!snapshot || !snapshot.tree || !snapshot.index) {
    return basketPaths
  }

  const sortedProjectFiles = getSortedFilePaths(snapshot.tree, snapshot.index)
  const fileToIndex = new Map<string, number>()
  for (let i = 0; i < sortedProjectFiles.length; i++) {
    fileToIndex.set(sortedProjectFiles[i], i)
  }

  return [...basketPaths].sort((left, right) => {
    const leftIndex = fileToIndex.get(left)
    const rightIndex = fileToIndex.get(right)

    if (leftIndex != null && rightIndex != null) {
      return leftIndex - rightIndex
    }
    if (leftIndex != null) {
      return -1
    }
    if (rightIndex != null) {
      return 1
    }
    return left.localeCompare(right)
  })
}

