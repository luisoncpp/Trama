import { useState } from 'preact/hooks'
import type { SidebarSection } from '../../project-editor-types'
import { SIDEBAR_SECTION_CONFIG, type ContentSidebarSection } from './sidebar-section-roots'

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/')
}

function getScopedFiles(files: string[], sectionRoot: string): string[] {
  return files
    .map(normalizePath)
    .filter((path) => path.startsWith(sectionRoot))
    .map((path) => path.slice(sectionRoot.length))
    .filter((path) => path.length > 0)
}

function getScopedSelectedPath(selectedPath: string | null, sectionRoot: string): string | null {
  if (!selectedPath) {
    return null
  }
  const normalized = normalizePath(selectedPath)
  if (!normalized.startsWith(sectionRoot)) {
    return null
  }
  const scopedPath = normalized.slice(sectionRoot.length)
  return scopedPath.length > 0 ? scopedPath : null
}

export function joinProjectPath(rootPath: string, sectionRoot: string): string {
  if (!rootPath) {
    return ''
  }
  return `${rootPath.replace(/[\\/]$/, '')}/${sectionRoot.replace(/\/$/, '')}`
}

export function useSidebarContentSection(
  sidebarActiveSection: SidebarSection,
  visibleFiles: string[],
  selectedPath: string | null,
) {
  const [sectionFilters, setSectionFilters] = useState<Record<ContentSidebarSection, string>>({
    explorer: '',
    outline: '',
    lore: '',
  })

  const contentSection = Object.hasOwn(SIDEBAR_SECTION_CONFIG, sidebarActiveSection)
    ? (sidebarActiveSection as ContentSidebarSection)
    : null
  const sectionConfig = contentSection ? SIDEBAR_SECTION_CONFIG[contentSection] : null

  return {
    sectionConfig,
    scopedFiles: sectionConfig ? getScopedFiles(visibleFiles, sectionConfig.root) : [],
    scopedSelectedPath: sectionConfig ? getScopedSelectedPath(selectedPath, sectionConfig.root) : null,
    activeFilterQuery: contentSection ? sectionFilters[contentSection] : '',
    onFilterQueryChange: (value: string) => {
      if (!contentSection) {
        return
      }
      setSectionFilters((current) => ({
        ...current,
        [contentSection]: value,
      }))
    },
  }
}
