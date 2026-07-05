// @Architecture(descriptionShort="Section scoping + filter-state helpers")
import { useState } from 'preact/hooks'
import type { SidebarSection } from '../../../../project-editor-types'
import { SIDEBAR_SECTION_CONFIG, type ContentSidebarSection } from '../../sidebar-section-roots.ts'

export function formatProjectRootBreadcrumbLabel(projectRootPath: string): string {
  return projectRootPath.replace(/\\/g, '/').replace(/\/$/, '')
}

export function useSidebarContentSection(sidebarActiveSection: SidebarSection) {
  const [sectionFilters, setSectionFilters] = useState<Record<ContentSidebarSection, string>>({
    explorer: '',
    outline: '',
    lore: '',
    templates: '',
  })

  const contentSection = Object.hasOwn(SIDEBAR_SECTION_CONFIG, sidebarActiveSection)
    ? (sidebarActiveSection as ContentSidebarSection)
    : null
  const sectionConfig = contentSection ? SIDEBAR_SECTION_CONFIG[contentSection] : null

  return {
    sectionConfig,
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
