// @Architecture(descriptionShort="Active section body composition")
import { SidebarExplorerContent } from './sidebar-explorer-content.tsx'
import { SidebarSectionScopeProvider } from '../../sidebar-section-scope-context.tsx'
import { useSidebarState } from '../../sidebar-state-context.tsx'
import { SIDEBAR_SECTION_CONFIG, type ContentSidebarSection } from '../../sidebar-section-roots.ts'
import { SidebarContentsContent } from './sidebar-contents-content.tsx'
import { SidebarSearchContent } from './sidebar-search-content.tsx'
import { SidebarSettingsContent } from './sidebar-settings.tsx'
import { SidebarTransferContent } from './sidebar-transfer-content.tsx'
import type {
  SidebarDialogOpenerProps,
  SidebarSpellcheckProps,
  SidebarThemeProps,
} from './sidebar-types.ts'

export interface SidebarPanelBodyProps {
  effectiveCollapsed: boolean
  sectionConfig: (typeof SIDEBAR_SECTION_CONFIG)[ContentSidebarSection] | null
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
  onImport: () => void
  onImportZulu: () => void
  onExportBook: SidebarDialogOpenerProps['onExportBook']
  onExport: () => void
}

function renderExplorer(props: SidebarPanelBodyProps) {
  const { sectionConfig, activeFilterQuery, onFilterQueryChange } = props
  if (!sectionConfig) return null
  return (
    <SidebarSectionScopeProvider root={sectionConfig.root}>
      <SidebarExplorerContent
        title={sectionConfig.title}
        filterQuery={activeFilterQuery}
        onFilterQueryChange={onFilterQueryChange}
      />
    </SidebarSectionScopeProvider>
  )
}

function renderSettings(props: SidebarPanelBodyProps) {
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
    />
  )
}

export function SidebarPanelBody(props: SidebarPanelBodyProps) {
  const { sidebarActiveSection } = useSidebarState()
  if (props.effectiveCollapsed) return null
  if (props.sectionConfig) return renderExplorer(props)
  if (sidebarActiveSection === 'contents') return <SidebarContentsContent />
  if (sidebarActiveSection === 'search') return <SidebarSearchContent />
  if (sidebarActiveSection === 'settings') return renderSettings(props)
  if (sidebarActiveSection === 'transfer') {
    return (
      <SidebarTransferContent
        onImport={props.onImport}
        onImportZulu={props.onImportZulu}
        onExportBook={props.onExportBook}
        onExport={props.onExport}
      />
    )
  }
  return null
}
