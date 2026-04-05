import type { SidebarSection } from '../../project-editor-types'
import { SidebarExplorerContent } from './sidebar-explorer-content'
import { SIDEBAR_SECTION_CONFIG, type ContentSidebarSection } from './sidebar-section-roots'
import { SidebarSettingsContent } from './sidebar-settings-content.tsx'
import { joinProjectPath } from './sidebar-panel-logic'
import type {
  SidebarFileActions,
  SidebarProjectContextProps,
  SidebarSelectionProps,
  SidebarThemeProps,
} from './sidebar-types'

export interface SidebarPanelBodyProps {
  effectiveCollapsed: boolean
  sidebarActiveSection: SidebarSection
  sectionConfig: (typeof SIDEBAR_SECTION_CONFIG)[ContentSidebarSection] | null
  rootPath: string
  scopedFiles: string[]
  scopedSelectedPath: string | null
  activeFilterQuery: string
  onFilterQueryChange: (value: string) => void
  onSelectFile: SidebarSelectionProps['onSelectFile']
  sidebarPanelWidth: number
  onSidebarPanelWidthChange: (width: number) => void
  themePreference: SidebarThemeProps['themePreference']
  resolvedTheme: SidebarThemeProps['resolvedTheme']
  onThemePreferenceChange: SidebarThemeProps['onThemePreferenceChange']
  onCreateArticle: SidebarFileActions['onCreateArticle']
  onCreateCategory: SidebarFileActions['onCreateCategory']
  onRenameFile: SidebarFileActions['onRenameFile']
  onDeleteFile: SidebarFileActions['onDeleteFile']
  contentProps: Omit<
    SidebarProjectContextProps & SidebarSelectionProps,
    | 'visibleFiles'
    | 'selectedPath'
    | 'rootPath'
  >
}

function renderSidebarExplorerContent({
  contentProps,
  sectionConfig,
  rootPath,
  scopedFiles,
  scopedSelectedPath,
  activeFilterQuery,
  onFilterQueryChange,
  onCreateArticle,
  onCreateCategory,
  onRenameFile,
  onDeleteFile,
  onSelectFile,
}: SidebarPanelBodyProps) {
  if (!sectionConfig) {
    return null
  }

  return (
    <SidebarExplorerContent
      {...contentProps}
      title={sectionConfig.title}
      scopePathLabel={joinProjectPath(rootPath, sectionConfig.root)}
      visibleFiles={scopedFiles}
      selectedPath={scopedSelectedPath}
      filterQuery={activeFilterQuery}
      onFilterQueryChange={onFilterQueryChange}
      onCreateArticle={onCreateArticle}
      onCreateCategory={onCreateCategory}
      onRenameFile={(path, newName) => onRenameFile(`${sectionConfig.root}${path}`, newName)}
      onDeleteFile={(path) => onDeleteFile(`${sectionConfig.root}${path}`)}
      onSelectFile={(filePath) => onSelectFile(`${sectionConfig.root}${filePath}`)}
    />
  )
}

function renderSidebarSettingsContent({
  sidebarPanelWidth,
  onSidebarPanelWidthChange,
  themePreference,
  resolvedTheme,
  onThemePreferenceChange,
}: SidebarPanelBodyProps) {
  return (
    <SidebarSettingsContent
      panelWidth={sidebarPanelWidth}
      onPanelWidthChange={onSidebarPanelWidthChange}
      themePreference={themePreference}
      resolvedTheme={resolvedTheme}
      onThemePreferenceChange={onThemePreferenceChange}
    />
  )
}

export function SidebarPanelBody(props: SidebarPanelBodyProps) {
  if (props.effectiveCollapsed) {
    return null
  }

  if (props.sectionConfig) {
    return renderSidebarExplorerContent(props)
  }

  if (props.sidebarActiveSection === 'settings') {
    return renderSidebarSettingsContent(props)
  }

  return null
}

export function buildSidebarPanelBodyProps(params: {
  effectiveCollapsed: boolean
  sidebarActiveSection: SidebarSection
  sectionConfig: (typeof SIDEBAR_SECTION_CONFIG)[ContentSidebarSection] | null
  rootPath: string
  scopedFiles: string[]
  scopedSelectedPath: string | null
  activeFilterQuery: string
  onFilterQueryChange: (value: string) => void
  onCreateArticle: SidebarFileActions['onCreateArticle']
  onCreateCategory: SidebarFileActions['onCreateCategory']
  onRenameFile: SidebarFileActions['onRenameFile']
  onDeleteFile: SidebarFileActions['onDeleteFile']
  onSelectFile: SidebarSelectionProps['onSelectFile']
  sidebarPanelWidth: number
  onSidebarPanelWidthChange: (width: number) => void
  themePreference: SidebarThemeProps['themePreference']
  resolvedTheme: SidebarThemeProps['resolvedTheme']
  onThemePreferenceChange: SidebarThemeProps['onThemePreferenceChange']
  contentProps: SidebarPanelBodyProps['contentProps']
}): SidebarPanelBodyProps {
  return {
    effectiveCollapsed: params.effectiveCollapsed,
    sidebarActiveSection: params.sidebarActiveSection,
    sectionConfig: params.sectionConfig,
    rootPath: params.rootPath,
    scopedFiles: params.scopedFiles,
    scopedSelectedPath: params.scopedSelectedPath,
    activeFilterQuery: params.activeFilterQuery,
    onFilterQueryChange: params.onFilterQueryChange,
    onCreateArticle: params.onCreateArticle,
    onCreateCategory: params.onCreateCategory,
    onRenameFile: params.onRenameFile,
    onDeleteFile: params.onDeleteFile,
    onSelectFile: params.onSelectFile,
    sidebarPanelWidth: params.sidebarPanelWidth,
    onSidebarPanelWidthChange: params.onSidebarPanelWidthChange,
    themePreference: params.themePreference,
    resolvedTheme: params.resolvedTheme,
    onThemePreferenceChange: params.onThemePreferenceChange,
    contentProps: params.contentProps,
  }
}
