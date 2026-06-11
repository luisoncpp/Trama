import { SidebarPanelBody } from './sidebar-panel-body.tsx'
import { SidebarRail } from './sidebar-rail'
import { useSidebarContentSection } from './sidebar-panel-logic'
import type { SidebarPanelCommonProps } from './sidebar-types'

type SidebarPanelProps = SidebarPanelCommonProps

function buildSidebarBodyProps(props: SidebarPanelProps, effectiveCollapsed: boolean, sectionState: ReturnType<typeof useSidebarContentSection>) {
  return {
    effectiveCollapsed,
    sidebarActiveSection: props.sidebarActiveSection,
    sectionConfig: sectionState.sectionConfig,
    rootPath: props.rootPath,
    scopedFiles: sectionState.scopedFiles,
    scopedSelectedPath: sectionState.scopedSelectedPath,
    activeFilterQuery: sectionState.activeFilterQuery,
    onFilterQueryChange: sectionState.onFilterQueryChange,
    onImport: props.onImport,
    onImportZulu: props.onImportZulu,
    onExportBook: props.onExportBook,
    onExport: props.onExport,
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
    corkboardOrder: props.corkboardOrder,
    allVisibleFiles: props.visibleFiles,
    activeSectionForController: props.sidebarActiveSection,
    contentProps: props,
  }
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
        onOpenHelp={openHelpGettingStarted}
      />
      <SidebarPanelBody {...bodyProps} />
    </aside>
  )
}
