import { useState } from 'preact/hooks'
import type { SidebarSection } from '../../project-editor-types'
import { SIDEBAR_SECTION_CONFIG, type ContentSidebarSection } from './sidebar-section-roots'
import { getScopedFiles, getScopedSelectedPath } from './sidebar-path-scoping'

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
