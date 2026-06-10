import type { SidebarSection } from '../../project-editor-types'
import { SidebarExplorerContent } from './sidebar-explorer-content.tsx'
import { SIDEBAR_SECTION_CONFIG, type ContentSidebarSection } from './sidebar-section-roots'
import { SidebarSettingsContent } from './sidebar-settings.tsx'
import { SidebarTransferContent } from './sidebar-transfer-content.tsx'
import {
  buildScopedReorderHandler,
  buildScopedMoveFileHandler,
  buildScopedMoveFolderHandler,
  scopeCorkboardOrder,
  toProjectPath,
  toSectionRelativePath,
} from './sidebar-path-scoping'
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
  onCreateMap: SidebarFileActions['onCreateMap']
  onCreateCategory: SidebarFileActions['onCreateCategory']
  onRenameFile: SidebarFileActions['onRenameFile']
  onRenameFolder: SidebarFileActions['onRenameFolder']
  onDeleteFolder: SidebarFileActions['onDeleteFolder']
  onDeleteFile: SidebarFileActions['onDeleteFile']
  onEditFileTags: SidebarFileActions['onEditFileTags']
  onRevealPathInFileManager: SidebarFileActions['onRevealPathInFileManager']
  onImport: () => void
  onImportZulu: () => void
  onExportBook: SidebarProjectContextProps['onExportBook']
  onExport: () => void
  onReorderFiles?: (folderPath: string, orderedIds: string[]) => Promise<void>
  onMoveFile?: (sourcePath: string, targetFolder: string) => Promise<void>
  onMoveFolder?: (sourcePath: string, targetParent: string) => Promise<void>
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
function loadFileTags(sectionRoot: (typeof SIDEBAR_SECTION_CONFIG)[ContentSidebarSection]['root']) {
  return async (path: string): Promise<string[]> => {
    const response = await window.tramaApi.readDocument({
      path: toProjectPath(toSectionRelativePath(path), sectionRoot),
    })
    if (!response.ok || !Array.isArray(response.data.meta.tags)) return []
    return response.data.meta.tags.filter((value): value is string => typeof value === 'string')
  }
}

function loadFileDeleteInfo(sectionRoot: (typeof SIDEBAR_SECTION_CONFIG)[ContentSidebarSection]['root']) {
  return async (path: string): Promise<{ linkedImagePaths: string[] }> => {
    const response = await window.tramaApi.readDocument({
      path: toProjectPath(toSectionRelativePath(path), sectionRoot),
    })
    return { linkedImagePaths: response.ok ? (response.data.linkedImagePaths ?? []) : [] }
  }
}

function renderExplorer(props: SidebarPanelBodyProps) {
  const {
    contentProps, sectionConfig, rootPath, scopedFiles, scopedSelectedPath,
    activeFilterQuery, onFilterQueryChange, onCreateArticle, onCreateMap, onCreateCategory,
    onRenameFile, onRenameFolder, onDeleteFolder, onDeleteFile, onEditFileTags,
    onRevealPathInFileManager,
    onSelectFile, onReorderFiles, onMoveFile, onMoveFolder, corkboardOrder,
  } = props
  if (!sectionConfig) return null
  const root = sectionConfig.root
  const scopePath = (p: string) => toProjectPath(toSectionRelativePath(p), root)
  return (
    <SidebarExplorerContent
      {...contentProps}
      title={sectionConfig.title}
      projectRootPath={rootPath}
      onPickFolder={contentProps.onPickFolder}
      onCloseProject={contentProps.onCloseProject}
      onRevealInFileManager={contentProps.onRevealInFileManager}
      pickFolderDisabled={contentProps.loadingProject || !contentProps.apiAvailable}
      visibleFiles={scopedFiles}
      selectedPath={scopedSelectedPath}
      filterQuery={activeFilterQuery}
      onFilterQueryChange={onFilterQueryChange}
      allVisibleFiles={props.allVisibleFiles}
      activeSection={props.activeSectionForController}
      onCreateArticle={onCreateArticle}
      onCreateMap={onCreateMap}
      onCreateCategory={onCreateCategory}
      onRenameFile={(path, newName) => onRenameFile(scopePath(path), newName)}
      onRenameFolder={(path, newName) => onRenameFolder(scopePath(path), newName)}
      onDeleteFolder={(path) => onDeleteFolder(scopePath(path))}
      onDeleteFile={(path, options) => onDeleteFile(scopePath(path), options)}
      onEditFileTags={(path, tags) => onEditFileTags(scopePath(path), tags)}
      onRevealPathInFileManager={(path) => onRevealPathInFileManager(scopePath(path))}
      onLoadFileTags={loadFileTags(root)}
      onLoadFileDeleteInfo={loadFileDeleteInfo(root)}
      onSelectFile={(filePath) => onSelectFile(scopePath(filePath))}
      corkboardOrder={scopeCorkboardOrder(corkboardOrder, root)}
      onReorderFiles={buildScopedReorderHandler(onReorderFiles, root)}
      onMoveFile={buildScopedMoveFileHandler(onMoveFile, root)}
      onMoveFolder={buildScopedMoveFolderHandler(onMoveFolder, root)}
    />
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
        onFocusScopeChange={props.onFocusScopeChange}
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
        onSaveSnapshot={props.contentProps.onSaveSnapshot}
      />
    )
  }
  return null
}

export function buildSidebarPanelBodyProps(params: SidebarPanelBodyProps): SidebarPanelBodyProps { return params }
