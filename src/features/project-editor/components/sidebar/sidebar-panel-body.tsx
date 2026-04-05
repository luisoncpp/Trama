import type { SidebarSection } from '../../project-editor-types'
import type { SidebarCreateInput } from '../../project-editor-types'
import { SidebarExplorerContent } from './sidebar-explorer-content'
import { SIDEBAR_SECTION_CONFIG, type ContentSidebarSection } from './sidebar-section-roots'
import { SidebarSettingsContent } from './sidebar-settings-content.tsx'
import { joinProjectPath } from './sidebar-panel-logic'

interface SidebarPanelBaseProps {
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => void
  sidebarActiveSection: SidebarSection
  sidebarPanelCollapsed: boolean
  sidebarPanelWidth: number
  onSelectSidebarSection: (section: SidebarSection) => void
  onToggleSidebarPanelCollapsed: () => void
  onSidebarPanelWidthChange: (width: number) => void
  onCreateArticle: (input: SidebarCreateInput) => void
  onCreateCategory: (input: SidebarCreateInput) => void
  onRenameFile: (path: string, newName: string) => void
  onDeleteFile: (path: string) => void
  apiAvailable: boolean
  loadingProject: boolean
  rootPath: string
  onPickFolder: () => void
}

export interface SidebarPanelBodyProps {
  effectiveCollapsed: boolean
  sidebarActiveSection: SidebarSection
  sectionConfig: (typeof SIDEBAR_SECTION_CONFIG)[ContentSidebarSection] | null
  rootPath: string
  scopedFiles: string[]
  scopedSelectedPath: string | null
  activeFilterQuery: string
  onFilterQueryChange: (value: string) => void
  onCreateArticle: (input: SidebarCreateInput) => void
  onCreateCategory: (input: SidebarCreateInput) => void
  onRenameFile: (path: string, newName: string) => void
  onDeleteFile: (path: string) => void
  onSelectFile: (filePath: string) => void
  sidebarPanelWidth: number
  onSidebarPanelWidthChange: (width: number) => void
  contentProps: Omit<
    SidebarPanelBaseProps,
    | 'visibleFiles'
    | 'selectedPath'
    | 'sidebarActiveSection'
    | 'sidebarPanelCollapsed'
    | 'sidebarPanelWidth'
    | 'onSelectSidebarSection'
    | 'onToggleSidebarPanelCollapsed'
    | 'onSidebarPanelWidthChange'
    | 'onCreateArticle'
    | 'onCreateCategory'
    | 'onRenameFile'
    | 'onDeleteFile'
    | 'onSelectFile'
    | 'rootPath'
  >
}

export function SidebarPanelBody({
  effectiveCollapsed,
  sidebarActiveSection,
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
  sidebarPanelWidth,
  onSidebarPanelWidthChange,
  contentProps,
}: SidebarPanelBodyProps) {
  if (effectiveCollapsed) {
    return null
  }

  if (sectionConfig) {
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

  if (sidebarActiveSection === 'settings') {
    return <SidebarSettingsContent panelWidth={sidebarPanelWidth} onPanelWidthChange={onSidebarPanelWidthChange} />
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
  onCreateArticle: (input: SidebarCreateInput) => void
  onCreateCategory: (input: SidebarCreateInput) => void
  onRenameFile: (path: string, newName: string) => void
  onDeleteFile: (path: string) => void
  onSelectFile: (filePath: string) => void
  sidebarPanelWidth: number
  onSidebarPanelWidthChange: (width: number) => void
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
    contentProps: params.contentProps,
  }
}
