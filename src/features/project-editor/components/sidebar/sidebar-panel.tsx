import { SidebarPanelBody, buildSidebarPanelBodyProps } from './sidebar-panel-body.tsx'
import { SidebarRail } from './sidebar-rail'
import { useSidebarContentSection } from './sidebar-panel-logic'
import type { SidebarPanelCommonProps } from './sidebar-types'
import { useSidebarResponsiveCollapse } from './use-sidebar-responsive-collapse'

type SidebarPanelProps = SidebarPanelCommonProps

function buildSidebarPanelContentProps(props: SidebarPanelProps) {
  return {
    loadingDocument: props.loadingDocument,
    apiAvailable: props.apiAvailable,
    loadingProject: props.loadingProject,
    onPickFolder: props.onPickFolder,
    onImport: props.onImport,
    onExport: props.onExport,
    onSelectSidebarSection: props.onSelectSidebarSection,
    onToggleSidebarPanelCollapsed: props.onToggleSidebarPanelCollapsed,
    sidebarPanelCollapsed: props.sidebarPanelCollapsed,
    sidebarPanelWidth: props.sidebarPanelWidth,
    onSidebarPanelWidthChange: props.onSidebarPanelWidthChange,
    onCreateArticle: props.onCreateArticle,
    onCreateCategory: props.onCreateCategory,
    onRenameFile: props.onRenameFile,
    onDeleteFile: props.onDeleteFile,
    onEditFileTags: props.onEditFileTags,
    onSelectFile: props.onSelectFile,
    visibleFiles: props.visibleFiles,
    selectedPath: props.selectedPath,
    sidebarActiveSection: props.sidebarActiveSection,
    rootPath: props.rootPath,
    themePreference: props.themePreference,
    resolvedTheme: props.resolvedTheme,
    onThemePreferenceChange: props.onThemePreferenceChange,
    focusScope: props.focusScope,
    onFocusScopeChange: props.onFocusScopeChange,
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
    onEditFileTags: props.onEditFileTags,
    onImport: props.onImport,
    onExport: props.onExport,
    onSelectFile: props.onSelectFile,
    sidebarPanelWidth: props.sidebarPanelWidth,
    onSidebarPanelWidthChange: props.onSidebarPanelWidthChange,
    themePreference: props.themePreference,
    resolvedTheme: props.resolvedTheme,
    onThemePreferenceChange: props.onThemePreferenceChange,
    focusScope: props.focusScope,
    onFocusScopeChange: props.onFocusScopeChange,
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
        focusModeEnabled={props.focusModeEnabled}
        onSelectSection={props.onSelectSidebarSection}
        onToggleCollapsed={props.onToggleSidebarPanelCollapsed}
      />
      <SidebarPanelBody {...bodyProps} />
    </aside>
  )
}