import type { SidebarSection } from '../../project-editor-types'
import { defineSidebarSectionRoot, type SidebarSectionRoot } from './sidebar-path-scoping'
import { RELEVANT_SECTION_ROOTS, TEMPLATES_SECTION_ROOT } from '../../../../shared/project-sections'

export type ContentSidebarSection = Exclude<SidebarSection, 'settings' | 'transfer'>

export interface SidebarSectionConfig {
  title: string
  root: SidebarSectionRoot
}

export const SIDEBAR_SECTION_CONFIG: Record<ContentSidebarSection, SidebarSectionConfig> = {
  explorer: { title: 'Manuscript', root: defineSidebarSectionRoot(RELEVANT_SECTION_ROOTS[0]) },
  outline: { title: 'Outline', root: defineSidebarSectionRoot(RELEVANT_SECTION_ROOTS[1]) },
  lore: { title: 'Lore', root: defineSidebarSectionRoot(RELEVANT_SECTION_ROOTS[2]) },
  templates: { title: 'Templates', root: defineSidebarSectionRoot(TEMPLATES_SECTION_ROOT) },
}
