import { SidebarPanelBody, buildSidebarPanelBodyProps } from './sidebar-panel-body.tsx'
import { SidebarRail } from './sidebar-rail'
import { useSidebarContentSection } from './sidebar-panel-logic'
import type { SidebarPanelCommonProps } from './sidebar-types'
import { useSidebarResponsiveCollapse } from './use-sidebar-responsive-collapse'

type SidebarPanelProps = SidebarPanelCommonProps & {
  onReorderFiles?: (folderPath: string, orderedIds: string[]) => Promise<void>
}

function buildSidebarPanelContentProps(props: SidebarPanelProps) {
  return {
    loadingDocument: props.loadingDocument,
    apiAvailable: props.apiAvailable,
    loadingProject: props.loadingProject,
    onPickFolder: props.onPickFolder,
    onImport: props.onImport,
    onExportBook: props.onExportBook,
    onExport: props.onExport,
    onSelectSidebarSection: props.onSelectSidebarSection,
    onToggleSidebarPanelCollapsed: props.onToggleSidebarPanelCollapsed,
    sidebarPanelCollapsed: props.sidebarPanelCollapsed,
    sidebarPanelWidth: props.sidebarPanelWidth,
    onSidebarPanelWidthChange: props.onSidebarPanelWidthChange,
    onCreateArticle: props.onCreateArticle,
    onCreateCategory: props.onCreateCategory,
    onRenameFile: props.onRenameFile,
    onRenameFolder: props.onRenameFolder,
    onDeleteFolder: props.onDeleteFolder,
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
    spellcheckEnabled: props.spellcheckEnabled,
    spellcheckLanguage: props.spellcheckLanguage,
    spellcheckLanguageOptions: props.spellcheckLanguageOptions,
    spellcheckLanguageSelectionSupported: props.spellcheckLanguageSelectionSupported,
    onSpellcheckEnabledChange: props.onSpellcheckEnabledChange,
    onSpellcheckLanguageChange: props.onSpellcheckLanguageChange,
    focusScope: props.focusScope,
    onFocusScopeChange: props.onFocusScopeChange,
    onReorderFiles: props.onReorderFiles,
  }
}

function useSidebarPanelRenderState(props: SidebarPanelProps) {
  const isResponsiveCollapsed = useSidebarResponsiveCollapse()
  const effectiveCollapsed = props.sidebarPanelCollapsed || isResponsiveCollapsed
  const sectionState = useSidebarContentSection(props.sidebarActiveSection, props.visibleFiles, props.selectedPath)
  return { effectiveCollapsed, sectionState }
}

function buildSidebarBodyProps(props: SidebarPanelProps, effectiveCollapsed: boolean, sectionState: ReturnType<typeof useSidebarContentSection>) {
  return buildSidebarPanelBodyProps({
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
    onRenameFolder: props.onRenameFolder,
    onDeleteFolder: props.onDeleteFolder,
    onDeleteFile: props.onDeleteFile,
    onEditFileTags: props.onEditFileTags,
    onImport: props.onImport,
    onExportBook: props.onExportBook,
    onExport: props.onExport,
    onSelectFile: props.onSelectFile,
    sidebarPanelWidth: props.sidebarPanelWidth,
    onSidebarPanelWidthChange: props.onSidebarPanelWidthChange,
    themePreference: props.themePreference,
    resolvedTheme: props.resolvedTheme,
    onThemePreferenceChange: props.onThemePreferenceChange,
    spellcheckEnabled: props.spellcheckEnabled,
    spellcheckLanguage: props.spellcheckLanguage,
    spellcheckLanguageOptions: props.spellcheckLanguageOptions,
    spellcheckLanguageSelectionSupported: props.spellcheckLanguageSelectionSupported,
    onSpellcheckEnabledChange: props.onSpellcheckEnabledChange,
    onSpellcheckLanguageChange: props.onSpellcheckLanguageChange,
    focusScope: props.focusScope,
    onFocusScopeChange: props.onFocusScopeChange,
    contentProps: buildSidebarPanelContentProps(props),
  })
}

export function SidebarPanel(props: SidebarPanelProps) {
  const { effectiveCollapsed, sectionState } = useSidebarPanelRenderState(props)
  const bodyProps = buildSidebarBodyProps(props, effectiveCollapsed, sectionState)

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