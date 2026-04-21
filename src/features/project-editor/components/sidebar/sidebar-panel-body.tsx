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
  onMoveFile?: (sourcePath: string, targetFolder: string) => Promise<void>
  corkboardOrder?: Record<string, string[]>
  contentProps: Omit<
    SidebarProjectContextProps & SidebarSelectionProps,
    | 'visibleFiles'
    | 'selectedPath'
    | 'rootPath'
  >
}

const makeRootPath = (root: string) => (path: string) => `${root}${path}`

export function scopeCorkboardOrder(order: Record<string, string[]> | undefined, sectionRoot: string): Record<string, string[]> | undefined {
  if (!order) return undefined
  const result: Record<string, string[]> = {}
  const rootPrefix = sectionRoot.replace(/\/+$/, '')

  for (const [key, ids] of Object.entries(order)) {
    const scopedKey = key === rootPrefix ? '' : key.startsWith(`${rootPrefix}/`) ? key.slice(rootPrefix.length + 1) : null
    if (scopedKey === null) continue
    const scopedIds = ids.map((id) => {
      const prefix = key ? `${key}/` : `${rootPrefix}/`
      return id.startsWith(prefix) ? id.slice(prefix.length) : id
    })
    result[scopedKey] = scopedIds
  }

  return result
}

function loadFileTags(root: string) {
  return async (path: string): Promise<string[]> => {
    const response = await window.tramaApi.readDocument({ path: `${root}${path}` })
    if (!response.ok || !Array.isArray(response.data.meta.tags)) return []
    return response.data.meta.tags.filter((value): value is string => typeof value === 'string')
  }
}

function buildScopedReorderHandler(
  onReorderFiles: ((folderPath: string, orderedIds: string[]) => Promise<void>) | undefined,
  withRoot: (path: string) => string,
  sectionRoot: string,
): ((folderPath: string, orderedIds: string[]) => Promise<void>) | undefined {
  if (!onReorderFiles) return undefined
  return (folderPath: string, orderedIds: string[]) => {
    const projectFolder = folderPath ? withRoot(folderPath) : sectionRoot.replace(/\/+$/, '')
    const projectIds = orderedIds.map((id) => withRoot(id))
    return onReorderFiles(projectFolder, projectIds)
  }
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
  onMoveFile,
  corkboardOrder,
}: SidebarPanelBodyProps) {
  if (!sectionConfig) return null

  const withRoot = makeRootPath(sectionConfig.root)
  const scopedOrder = scopeCorkboardOrder(corkboardOrder, sectionConfig.root)

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
      onRenameFile={(path, newName) => onRenameFile(withRoot(path), newName)}
      onRenameFolder={(path, newName) => onRenameFolder(withRoot(path), newName)}
      onDeleteFolder={(path) => onDeleteFolder(withRoot(path))}
      onDeleteFile={(path) => onDeleteFile(withRoot(path))}
      onEditFileTags={(path, tags) => onEditFileTags(withRoot(path), tags)}
      onLoadFileTags={loadFileTags(sectionConfig.root)}
      onSelectFile={(filePath) => onSelectFile(withRoot(filePath))}
      corkboardOrder={scopedOrder}
      onReorderFiles={buildScopedReorderHandler(onReorderFiles, withRoot, sectionConfig.root)}
      onMoveFile={onMoveFile ? (s, t) => onMoveFile(withRoot(s), withRoot(t)) : undefined}
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
