export const SCOPED_ROOT_KEY = ''

type BrandedPath<T extends string> = string & { readonly __pathBrand: T }

export type ProjectRelativePath = BrandedPath<'ProjectRelativePath'>
export type SectionRelativePath = BrandedPath<'SectionRelativePath'>
export type SidebarSectionRoot = BrandedPath<'SidebarSectionRoot'>
export type SectionRelativeFolderPath = SectionRelativePath | typeof SCOPED_ROOT_KEY

type CorkboardOrder = Record<string, string[]>

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/')
}

function stripTrailingSlash(path: string): string {
  return path.replace(/\/+$/, '')
}

function asSectionRelativePath(path: string): SectionRelativePath {
  return normalizePath(path) as SectionRelativePath
}

function asProjectRelativePath(path: string): ProjectRelativePath {
  return normalizePath(path) as ProjectRelativePath
}

export function defineSidebarSectionRoot(path: string): SidebarSectionRoot {
  const normalized = normalizePath(path)
  const rootPath = normalized.endsWith('/') ? normalized : `${normalized}/`
  return rootPath as SidebarSectionRoot
}

export function getProjectRootPath(sectionRoot: SidebarSectionRoot): ProjectRelativePath {
  return asProjectRelativePath(stripTrailingSlash(sectionRoot))
}

export function getScopedFiles(files: string[], sectionRoot: SidebarSectionRoot): SectionRelativePath[] {
  return files
    .map(normalizePath)
    .filter((path) => path.startsWith(sectionRoot))
    .map((path) => path.slice(sectionRoot.length))
    .filter((path) => path.length > 0)
    .map(asSectionRelativePath)
}

export function getScopedSelectedPath(selectedPath: string | null, sectionRoot: SidebarSectionRoot): SectionRelativePath | null {
  if (!selectedPath) {
    return null
  }
  const normalized = normalizePath(selectedPath)
  if (!normalized.startsWith(sectionRoot)) {
    return null
  }
  const scopedPath = normalized.slice(sectionRoot.length)
  return scopedPath.length > 0 ? asSectionRelativePath(scopedPath) : null
}

export function toSectionRelativePath(path: string): SectionRelativePath {
  return asSectionRelativePath(path)
}

export function toSectionRelativeFolderPath(path: string): SectionRelativeFolderPath {
  const normalized = stripTrailingSlash(normalizePath(path))
  return normalized.length > 0 ? asSectionRelativePath(normalized) : SCOPED_ROOT_KEY
}

export function toProjectPath(path: SectionRelativePath, sectionRoot: SidebarSectionRoot): ProjectRelativePath {
  return asProjectRelativePath(`${sectionRoot}${path}`)
}

export function toProjectFolderPath(path: SectionRelativeFolderPath, sectionRoot: SidebarSectionRoot): ProjectRelativePath {
  return path === SCOPED_ROOT_KEY ? getProjectRootPath(sectionRoot) : toProjectPath(path, sectionRoot)
}

export function buildProjectCandidatePath(
  sectionRoot: SidebarSectionRoot,
  directory: string,
  baseName: string,
  attempt: number,
  asMarkdown: boolean,
): ProjectRelativePath {
  const suffix = attempt === 0 ? '' : `-${attempt + 1}`
  const sectionDirectory = toSectionRelativeFolderPath(directory)
  const sectionLeaf = `${baseName}${suffix}${asMarkdown ? '.md' : ''}`
  const sectionPath = sectionDirectory === SCOPED_ROOT_KEY
    ? asSectionRelativePath(sectionLeaf)
    : asSectionRelativePath(`${sectionDirectory}/${sectionLeaf}`)
  return toProjectPath(sectionPath, sectionRoot)
}

export function scopeCorkboardOrder(order: CorkboardOrder | undefined, sectionRoot: SidebarSectionRoot): CorkboardOrder | undefined {
  if (!order) {
    return undefined
  }
  const result: CorkboardOrder = {}
  const rootPath = getProjectRootPath(sectionRoot)

  for (const [key, ids] of Object.entries(order)) {
    const normalizedKey = normalizePath(key)
    const scopedKey = normalizedKey === rootPath ? SCOPED_ROOT_KEY
      : normalizedKey.startsWith(`${rootPath}/`) ? normalizedKey.slice(rootPath.length + 1)
        : null
    if (scopedKey === null) {
      continue
    }
    const prefix = normalizedKey ? `${normalizedKey}/` : `${rootPath}/`
    result[scopedKey] = ids.map((id) => {
      const normalizedId = normalizePath(id)
      return normalizedId.startsWith(prefix) ? normalizedId.slice(prefix.length) : normalizedId
    })
  }

  return result
}

export function buildScopedReorderHandler(
  onReorderFiles: ((folderPath: string, orderedIds: string[]) => Promise<void>) | undefined,
  sectionRoot: SidebarSectionRoot,
): ((folderPath: string, orderedIds: string[]) => Promise<void>) | undefined {
  if (!onReorderFiles) {
    return undefined
  }
  return (folderPath: string, orderedIds: string[]) => onReorderFiles(
    toProjectFolderPath(toSectionRelativeFolderPath(folderPath), sectionRoot),
    orderedIds.map((path) => toProjectPath(toSectionRelativePath(path), sectionRoot)),
  )
}
