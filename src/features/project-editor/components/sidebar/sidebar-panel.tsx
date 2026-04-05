import type { SidebarSection } from '../../project-editor-types'
import type { SidebarCreateInput } from '../../project-editor-types'
import { SidebarPanelBody, buildSidebarPanelBodyProps } from './sidebar-panel-body.tsx'
import { SidebarRail } from './sidebar-rail'
import { useSidebarContentSection } from './sidebar-panel-logic'
import { useSidebarResponsiveCollapse } from './use-sidebar-responsive-collapse'

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
  onRenameFile: (path: string, newName: string) => void
  onDeleteFile: (path: string) => void
  apiAvailable: boolean
  loadingProject: boolean
  rootPath: string
  onPickFolder: () => void
}

function buildSidebarPanelContentProps(props: SidebarPanelProps) {
  return {
    loadingDocument: props.loadingDocument,
    apiAvailable: props.apiAvailable,
    loadingProject: props.loadingProject,
    onPickFolder: props.onPickFolder,
    onSelectSidebarSection: props.onSelectSidebarSection,
    onToggleSidebarPanelCollapsed: props.onToggleSidebarPanelCollapsed,
    sidebarPanelCollapsed: props.sidebarPanelCollapsed,
    sidebarPanelWidth: props.sidebarPanelWidth,
    onSidebarPanelWidthChange: props.onSidebarPanelWidthChange,
    onCreateArticle: props.onCreateArticle,
    onCreateCategory: props.onCreateCategory,
    onRenameFile: props.onRenameFile,
    onDeleteFile: props.onDeleteFile,
    onSelectFile: props.onSelectFile,
    visibleFiles: props.visibleFiles,
    selectedPath: props.selectedPath,
    sidebarActiveSection: props.sidebarActiveSection,
    rootPath: props.rootPath,
  }
}

function useSidebarPanelRenderState(props: SidebarPanelProps) {
  const isResponsiveCollapsed = useSidebarResponsiveCollapse()
  const effectiveCollapsed = props.sidebarPanelCollapsed || isResponsiveCollapsed
  const sectionState = useSidebarContentSection(props.sidebarActiveSection, props.visibleFiles, props.selectedPath)
  return { effectiveCollapsed, sectionState }
}

export function SidebarPanel(props: SidebarPanelProps) {
  const { effectiveCollapsed, sectionState } = useSidebarPanelRenderState(props)
  const bodyProps = buildSidebarPanelBodyProps({
    effectiveCollapsed,
    sidebarActiveSection: props.sidebarActiveSection,
    sectionConfig: sectionState.sectionConfig,
    rootPath: props.rootPath,
    scopedFiles: sectionState.scopedFiles,
    scopedSelectedPath: sectionState.scopedSelectedPath,
    activeFilterQuery: sectionState.activeFilterQuery,
    onFilterQueryChange: sectionState.onFilterQueryChange,
    onCreateArticle: props.onCreateArticle,
    onCreateCategory: props.onCreateCategory,
    onRenameFile: props.onRenameFile,
    onDeleteFile: props.onDeleteFile,
    onSelectFile: props.onSelectFile,
    sidebarPanelWidth: props.sidebarPanelWidth,
    onSidebarPanelWidthChange: props.onSidebarPanelWidthChange,
    contentProps: buildSidebarPanelContentProps(props),
  })

  return (
    <aside
      class={`sidebar-shell ${effectiveCollapsed ? 'is-collapsed' : ''}`}
      style={{ width: `${effectiveCollapsed ? 72 : props.sidebarPanelWidth}px` }}
    >
      <SidebarRail
        activeSection={props.sidebarActiveSection}
        collapsed={effectiveCollapsed}
        onSelectSection={props.onSelectSidebarSection}
        onToggleCollapsed={props.onToggleSidebarPanelCollapsed}
      />
      <SidebarPanelBody {...bodyProps} />
    </aside>
  )
}