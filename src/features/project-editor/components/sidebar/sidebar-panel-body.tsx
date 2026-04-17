import type { SidebarSection } from '../../project-editor-types'
import { SidebarExplorerContent } from './sidebar-explorer-content.tsx'
import { SIDEBAR_SECTION_CONFIG, type ContentSidebarSection } from './sidebar-section-roots'
import { SidebarSettingsContent } from './sidebar-settings-content.tsx'
import { SidebarTransferContent } from './sidebar-transfer-content.tsx'
import { joinProjectPath } from './sidebar-panel-logic'
import type {
  SidebarProjectContextProps,
  SidebarFileActions,
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
  onSelectFile: SidebarSelectionProps['onSelectFile']
  sidebarPanelWidth: number
  onSidebarPanelWidthChange: (width: number) => void
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
  onFocusScopeChange: SidebarWorkspacePrefsProps['onFocusScopeChange']
  onCreateArticle: SidebarFileActions['onCreateArticle']
  onCreateCategory: SidebarFileActions['onCreateCategory']
  onRenameFile: SidebarFileActions['onRenameFile']
  onRenameFolder: SidebarFileActions['onRenameFolder']
  onDeleteFolder: SidebarFileActions['onDeleteFolder']
  onDeleteFile: SidebarFileActions['onDeleteFile']
  onEditFileTags: SidebarFileActions['onEditFileTags']
  onImport: () => void
  onExportBook: SidebarProjectContextProps['onExportBook']
  onExport: () => void
  onReorderFiles?: (folderPath: string, orderedIds: string[]) => Promise<void>
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
  onRenameFolder,
  onDeleteFolder,
  onDeleteFile,
  onEditFileTags,
  onSelectFile,
  onReorderFiles,
}: SidebarPanelBodyProps) {
  if (!sectionConfig) {
    return null
  }

  const loadFileTags = async (path: string): Promise<string[]> => {
    const response = await window.tramaApi.readDocument({ path: `${sectionConfig.root}${path}` })
    if (!response.ok || !Array.isArray(response.data.meta.tags)) {
      return []
    }

    return response.data.meta.tags.filter((value): value is string => typeof value === 'string')
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
      onRenameFolder={(path, newName) => onRenameFolder(`${sectionConfig.root}${path}`, newName)}
      onDeleteFolder={(path) => onDeleteFolder(`${sectionConfig.root}${path}`)}
      onDeleteFile={(path) => onDeleteFile(`${sectionConfig.root}${path}`)}
      onEditFileTags={(path, tags) => onEditFileTags(`${sectionConfig.root}${path}`, tags)}
      onLoadFileTags={loadFileTags}
      onSelectFile={(filePath) => onSelectFile(`${sectionConfig.root}${filePath}`)}
      onReorderFiles={onReorderFiles}
    />
  )
}

function renderSidebarSettingsContent({
  sidebarPanelWidth,
  onSidebarPanelWidthChange,
  themePreference,
  resolvedTheme,
  onThemePreferenceChange,
  spellcheckEnabled,
  spellcheckLanguage,
  spellcheckLanguageOptions,
  spellcheckLanguageSelectionSupported,
  onSpellcheckEnabledChange,
  onSpellcheckLanguageChange,
  focusScope,
  onFocusScopeChange,
}: SidebarPanelBodyProps) {
  return (
    <SidebarSettingsContent
      panelWidth={sidebarPanelWidth}
      onPanelWidthChange={onSidebarPanelWidthChange}
      themePreference={themePreference}
      resolvedTheme={resolvedTheme}
      onThemePreferenceChange={onThemePreferenceChange}
      spellcheckEnabled={spellcheckEnabled}
      spellcheckLanguage={spellcheckLanguage}
      spellcheckLanguageOptions={spellcheckLanguageOptions}
      spellcheckLanguageSelectionSupported={spellcheckLanguageSelectionSupported}
      onSpellcheckEnabledChange={onSpellcheckEnabledChange}
      onSpellcheckLanguageChange={onSpellcheckLanguageChange}
      focusScope={focusScope}
      onFocusScopeChange={onFocusScopeChange}
    />
  )
}

function renderSidebarTransferContent({ contentProps, onImport, onExportBook, onExport }: SidebarPanelBodyProps) {
  return (
    <SidebarTransferContent
      disabled={contentProps.loadingProject || !contentProps.apiAvailable}
      onImport={onImport}
      onExportBook={onExportBook}
      onExport={onExport}
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

  if (props.sidebarActiveSection === 'transfer') {
    return renderSidebarTransferContent(props)
  }

  return null
}

export function buildSidebarPanelBodyProps(params: SidebarPanelBodyProps): SidebarPanelBodyProps {
  return params
}
