import type { SidebarSection } from '../../project-editor-types'

export type ContentSidebarSection = Exclude<SidebarSection, 'settings'>

export interface SidebarSectionConfig {
  title: string
  root: string
}

export const SIDEBAR_SECTION_CONFIG: Record<ContentSidebarSection, SidebarSectionConfig> = {
  explorer: { title: 'Manuscript', root: 'book/' },
  outline: { title: 'Outline', root: 'outline/' },
  lore: { title: 'Lore', root: 'lore/' },
}