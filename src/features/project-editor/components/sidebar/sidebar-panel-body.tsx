import type { SidebarSection } from '../../project-editor-types'
import { SidebarExplorerContent } from './sidebar-explorer-content.tsx'
import { SidebarSectionScopeProvider } from './sidebar-section-scope-context'
import { SIDEBAR_SECTION_CONFIG, type ContentSidebarSection } from './sidebar-section-roots'
import { SidebarSettingsContent } from './sidebar-settings.tsx'
import { SidebarTransferContent } from './sidebar-transfer-content.tsx'
import {
  scopeCorkboardOrder,
} from './sidebar-path-scoping'
import type {
  SidebarProjectContextProps,
  SidebarSelectionProps,
  SidebarSpellcheckProps,
  SidebarThemeProps,
  SidebarWorkspacePrefsProps,
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
  themePreference: SidebarThemeProps['themePreference']
  resolvedTheme: SidebarThemeProps['resolvedTheme']
  onThemePreferenceChange: SidebarThemeProps['onThemePreferenceChange']
  spellcheckEnabled: SidebarSpellcheckProps['spellcheckEnabled']
  spellcheckLanguage: SidebarSpellcheckProps['spellcheckLanguage']
  spellcheckLanguageOptions: SidebarSpellcheckProps['spellcheckLanguageOptions']
  spellcheckLanguageSelectionSupported: SidebarSpellcheckProps['spellcheckLanguageSelectionSupported']
  onSpellcheckEnabledChange: SidebarSpellcheckProps['onSpellcheckEnabledChange']
  onSpellcheckLanguageChange: SidebarSpellcheckProps['onSpellcheckLanguageChange']
  focusScope: SidebarWorkspacePrefsProps['focusScope']
  onImport: () => void
  onImportZulu: () => void
  onExportBook: SidebarProjectContextProps['onExportBook']
  onExport: () => void
  corkboardOrder?: Record<string, string[]>
  contentProps: Omit<
    SidebarProjectContextProps & SidebarSelectionProps,
    | 'visibleFiles'
    | 'selectedPath'
    | 'rootPath'
  >
  allVisibleFiles: string[]
  activeSectionForController: string
}

function renderExplorer(props: SidebarPanelBodyProps) {
  const {
    contentProps, sectionConfig, rootPath, scopedFiles, scopedSelectedPath,
    activeFilterQuery, onFilterQueryChange, corkboardOrder,
  } = props
  if (!sectionConfig) return null
  const root = sectionConfig.root
  return (
    <SidebarSectionScopeProvider root={root}>
      <SidebarExplorerContent
        {...contentProps}
        title={sectionConfig.title}
        projectRootPath={rootPath}
        pickFolderDisabled={contentProps.loadingProject || !contentProps.apiAvailable}
        visibleFiles={scopedFiles}
        selectedPath={scopedSelectedPath}
        filterQuery={activeFilterQuery}
        onFilterQueryChange={onFilterQueryChange}
        allVisibleFiles={props.allVisibleFiles}
        activeSection={props.activeSectionForController}
        corkboardOrder={scopeCorkboardOrder(corkboardOrder, root)}
      />
    </SidebarSectionScopeProvider>
  )
}

export function SidebarPanelBody(props: SidebarPanelBodyProps) {
  if (props.effectiveCollapsed) return null
  if (props.sectionConfig) return renderExplorer(props)
  if (props.sidebarActiveSection === 'settings') {
    return (
      <SidebarSettingsContent
        themePreference={props.themePreference}
        resolvedTheme={props.resolvedTheme}
        onThemePreferenceChange={props.onThemePreferenceChange}
        spellcheckEnabled={props.spellcheckEnabled}
        spellcheckLanguage={props.spellcheckLanguage}
        spellcheckLanguageOptions={props.spellcheckLanguageOptions}
        spellcheckLanguageSelectionSupported={props.spellcheckLanguageSelectionSupported}
        onSpellcheckEnabledChange={props.onSpellcheckEnabledChange}
        onSpellcheckLanguageChange={props.onSpellcheckLanguageChange}
        focusScope={props.focusScope}
      />
    )
  }
  if (props.sidebarActiveSection === 'transfer') {
    return (
      <SidebarTransferContent
        disabled={props.contentProps.loadingProject || !props.contentProps.apiAvailable}
        gitAvailable={props.contentProps.gitHistory.gitAvailable}
        savingSnapshot={props.contentProps.gitHistory.loading}
        onImport={props.onImport}
        onImportZulu={props.onImportZulu}
        onExportBook={props.onExportBook}
        onExport={props.onExport}
      />
    )
  }
  return null
}


