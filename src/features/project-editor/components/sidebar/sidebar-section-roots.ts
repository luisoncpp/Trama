import type { SidebarSection } from '../../project-editor-types'
import { defineSidebarSectionRoot, type SidebarSectionRoot } from './sidebar-path-scoping'

export type ContentSidebarSection = Exclude<SidebarSection, 'settings' | 'transfer'>

export interface SidebarSectionConfig {
  title: string
  root: SidebarSectionRoot
}

export const SIDEBAR_SECTION_CONFIG: Record<ContentSidebarSection, SidebarSectionConfig> = {
  explorer: { title: 'Manuscript', root: defineSidebarSectionRoot('book/') },
  outline: { title: 'Outline', root: defineSidebarSectionRoot('outline/') },
  lore: { title: 'Lore', root: defineSidebarSectionRoot('lore/') },
}
