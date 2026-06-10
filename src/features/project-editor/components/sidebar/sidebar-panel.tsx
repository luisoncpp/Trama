import { SidebarPanelBody, buildSidebarPanelBodyProps } from './sidebar-panel-body.tsx'
import { SidebarRail } from './sidebar-rail'
import { useSidebarContentSection } from './sidebar-panel-logic'
import type { SidebarPanelCommonProps } from './sidebar-types'

type SidebarPanelProps = SidebarPanelCommonProps & {
  onReorderFiles?: (folderPath: string, orderedIds: string[]) => Promise<void>
  onMoveFile?: (sourcePath: string, targetFolder: string) => Promise<void>
  onMoveFolder?: (sourcePath: string, targetParent: string) => Promise<void>
  corkboardOrder?: Record<string, string[]>
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
    onCreateMap: props.onCreateMap,
    onCreateCategory: props.onCreateCategory,
    onRenameFile: props.onRenameFile,
    onRenameFolder: props.onRenameFolder,
    onDeleteFolder: props.onDeleteFolder,
    onDeleteFile: props.onDeleteFile,
    onEditFileTags: props.onEditFileTags,
    onRevealPathInFileManager: props.onRevealPathInFileManager,
    onImport: props.onImport,
    onImportZulu: props.onImportZulu,
    onExportBook: props.onExportBook,
    onExport: props.onExport,
    onSelectFile: props.onSelectFile,
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
    onMoveFile: props.onMoveFile,
    onMoveFolder: props.onMoveFolder,
    corkboardOrder: props.corkboardOrder,
    allVisibleFiles: props.visibleFiles,
    activeSectionForController: props.sidebarActiveSection,
    contentProps: props,
  })
}

function openHelpGettingStarted() {
  if (window.tramaApi && typeof window.tramaApi.openHelp === 'function') {
    void window.tramaApi.openHelp({ page: 'getting-started' })
  }
}

export function SidebarPanel(props: SidebarPanelProps) {
  const sectionState = useSidebarContentSection(props.sidebarActiveSection, props.visibleFiles, props.selectedPath)
  const effectiveCollapsed = props.effectiveCollapsed
  const bodyProps = buildSidebarBodyProps(props, effectiveCollapsed, sectionState)

  return (
    <aside class={`sidebar-shell ${effectiveCollapsed ? 'is-collapsed' : ''}`}>
      <SidebarRail
        activeSection={props.sidebarActiveSection}
        collapsed={effectiveCollapsed}
        focusModeEnabled={props.focusModeEnabled}
        onSelectSection={props.onSelectSidebarSection}
        onToggleCollapsed={props.onToggleSidebarPanelCollapsed}
        onOpenHelp={openHelpGettingStarted}
      />
      <SidebarPanelBody {...bodyProps} />
    </aside>
  )
}
