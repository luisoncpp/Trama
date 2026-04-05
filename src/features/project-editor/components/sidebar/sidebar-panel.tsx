import type { SidebarSection } from '../../project-editor-types'
import type { SidebarCreateInput } from '../../project-editor-types'
import { SidebarRail } from './sidebar-rail'
import { SidebarExplorerContent } from './sidebar-explorer-content'
import { SIDEBAR_SECTION_CONFIG, type ContentSidebarSection } from './sidebar-section-roots'
import { SidebarSettingsContent } from './sidebar-settings-content.tsx'
import { joinProjectPath, useSidebarContentSection } from './sidebar-panel-logic'

interface SidebarPanelProps {
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
  apiAvailable: boolean
  loadingProject: boolean
  rootPath: string
  onPickFolder: () => void
}

interface SidebarPanelBodyProps {
  sidebarPanelCollapsed: boolean
  sidebarActiveSection: SidebarSection
  sectionConfig: (typeof SIDEBAR_SECTION_CONFIG)[ContentSidebarSection] | null
  rootPath: string
  scopedFiles: string[]
  scopedSelectedPath: string | null
  activeFilterQuery: string
  onFilterQueryChange: (value: string) => void
  onCreateArticle: (input: SidebarCreateInput) => void
  onCreateCategory: (input: SidebarCreateInput) => void
  onSelectFile: (filePath: string) => void
  sidebarPanelWidth: number
  onSidebarPanelWidthChange: (width: number) => void
  contentProps: Omit<
    SidebarPanelProps,
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
    | 'onSelectFile'
    | 'rootPath'
  >
}

function SidebarPanelBody({
  sidebarPanelCollapsed,
  sidebarActiveSection,
  sectionConfig,
  rootPath,
  scopedFiles,
  scopedSelectedPath,
  activeFilterQuery,
  onFilterQueryChange,
  onCreateArticle,
  onCreateCategory,
  onSelectFile,
  sidebarPanelWidth,
  onSidebarPanelWidthChange,
  contentProps,
}: SidebarPanelBodyProps) {
  if (sidebarPanelCollapsed) {
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
        onSelectFile={(filePath) => onSelectFile(`${sectionConfig.root}${filePath}`)}
      />
    )
  }

  if (sidebarActiveSection === 'settings') {
    return (
      <SidebarSettingsContent
        panelWidth={sidebarPanelWidth}
        onPanelWidthChange={onSidebarPanelWidthChange}
      />
    )
  }

  return null
}

export function SidebarPanel({
  visibleFiles,
  selectedPath,
  onSelectFile,
  rootPath,
  sidebarActiveSection,
  sidebarPanelCollapsed,
  sidebarPanelWidth,
  onSelectSidebarSection,
  onToggleSidebarPanelCollapsed,
  onSidebarPanelWidthChange,
  onCreateArticle,
  onCreateCategory,
  ...props
}: SidebarPanelProps) {
  const { sectionConfig, scopedFiles, scopedSelectedPath, activeFilterQuery, onFilterQueryChange } =
    useSidebarContentSection(sidebarActiveSection, visibleFiles, selectedPath)

  return (
    <aside
      class={`sidebar-shell ${sidebarPanelCollapsed ? 'is-collapsed' : ''}`}
      style={{ width: `${sidebarPanelCollapsed ? 72 : sidebarPanelWidth}px` }}
    >
      <SidebarRail
        activeSection={sidebarActiveSection}
        collapsed={sidebarPanelCollapsed}
        onSelectSection={onSelectSidebarSection}
        onToggleCollapsed={onToggleSidebarPanelCollapsed}
      />
      <SidebarPanelBody
        sidebarPanelCollapsed={sidebarPanelCollapsed}
        sidebarActiveSection={sidebarActiveSection}
        sectionConfig={sectionConfig}
        rootPath={rootPath}
        scopedFiles={scopedFiles}
        scopedSelectedPath={scopedSelectedPath}
        activeFilterQuery={activeFilterQuery}
        onFilterQueryChange={onFilterQueryChange}
        onCreateArticle={onCreateArticle}
        onCreateCategory={onCreateCategory}
        onSelectFile={onSelectFile}
        sidebarPanelWidth={sidebarPanelWidth}
        onSidebarPanelWidthChange={onSidebarPanelWidthChange}
        contentProps={props}
      />
    </aside>
  )
}