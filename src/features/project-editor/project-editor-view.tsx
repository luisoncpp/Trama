import type { ProjectEditorModel } from './project-editor-types'
import { ConflictBanner } from './components/conflict-banner'
import { ConflictComparePanel } from './components/conflict-compare-panel'
import { WorkspaceLayoutPanel } from './components/workspace-editor-panels.tsx'
import { SidebarPanel } from './components/sidebar/sidebar-panel.tsx'
import { ProjectEditorDialogs } from './project-editor-dialogs'
import { useAiImport } from './use-ai-import'
import { useAiExport } from './use-ai-export'
import { useBookExport } from './use-book-export'
import type { ResolvedTheme, ThemePreference } from '../../theme/theme-types'
import type { BookExportFormat } from '../../shared/ipc'

interface ProjectEditorViewProps {
  model: ProjectEditorModel
  themePreference: ThemePreference
  resolvedTheme: ResolvedTheme
  onThemePreferenceChange: (preference: ThemePreference) => void
  spellcheckEnabled: boolean
  spellcheckLanguage: string | null
  spellcheckLanguageOptions: string[]
  spellcheckLanguageSelectionSupported: boolean
  onSpellcheckEnabledChange: (enabled: boolean) => void
  onSpellcheckLanguageChange: (language: string) => void
}

interface SidebarExtraProps extends Omit<ProjectEditorViewProps, 'model'> {
  onImportClick: () => void
  onBookExportClick: (format: BookExportFormat) => void
  onExportClick: () => void
}

interface ProjectEditorMainPaneProps {
  model: ProjectEditorModel
  spellcheckEnabled: boolean
}

function buildShellClassName(model: ProjectEditorModel): string {
  const { state } = model
  return [
    'editor-shell',
    state.workspaceLayout.mode === 'split' ? 'is-split' : '',
    state.workspaceLayout.focusModeEnabled ? 'is-focus-mode' : '',
    state.isFullscreen ? 'is-fullscreen' : '',
    `focus-scope-${state.workspaceLayout.focusScope}`,
  ].filter(Boolean).join(' ')
}

function ProjectEditorMainPane({ model, spellcheckEnabled }: ProjectEditorMainPaneProps) {
  const { state, actions } = model

  return (
    <div class="editor-main">
      {state.externalConflictPath && (
        <ConflictBanner
          externalConflictPath={state.externalConflictPath}
          onReload={actions.resolveConflictReload}
          onKeep={actions.resolveConflictKeep}
          onSaveAsCopy={actions.resolveConflictSaveAsCopy}
          onCompare={actions.resolveConflictCompare}
        />
      )}

      {state.externalConflictPath && state.conflictComparisonContent !== null && (
        <ConflictComparePanel
          externalConflictPath={state.externalConflictPath}
          diskContent={state.conflictComparisonContent}
          localContent={state.editorValue}
          onClose={actions.closeConflictCompare}
        />
      )}

      <WorkspaceLayoutPanel model={model} spellcheckEnabled={spellcheckEnabled} />
    </div>
  )
}

function buildSidebarSectionProps(model: ProjectEditorModel, props: SidebarExtraProps) {
  const { state, actions } = model

  return {
    visibleFiles: state.visibleFiles,
    selectedPath: state.selectedPath,
    loadingDocument: state.loadingDocument,
    onSelectFile: actions.selectFile,
    sidebarActiveSection: state.sidebarActiveSection,
    sidebarPanelCollapsed: state.sidebarPanelCollapsed,
    sidebarPanelWidth: state.sidebarPanelWidth,
    onSelectSidebarSection: actions.setSidebarSection,
    onToggleSidebarPanelCollapsed: actions.toggleSidebarPanelCollapsed,
    onSidebarPanelWidthChange: actions.setSidebarPanelWidth,
    onCreateArticle: (input: Parameters<typeof actions.createArticle>[0]) => void actions.createArticle(input),
    onCreateCategory: (input: Parameters<typeof actions.createCategory>[0]) => void actions.createCategory(input),
    onRenameFile: (path: string, newName: string) => void actions.renameFile({ path, newName }),
    onRenameFolder: (path: string, newName: string) => void actions.renameFolder({ path, newName }),
    onDeleteFolder: (path: string) => void actions.deleteFolder(path),
    onDeleteFile: (path: string) => void actions.deleteFile(path),
    onEditFileTags: (path: string, tags: string[]) => void actions.editFileTags(path, tags),
    apiAvailable: state.apiAvailable,
    loadingProject: state.loadingProject,
    rootPath: state.rootPath,
    onPickFolder: () => void actions.pickProjectFolder(),
    onImport: props.onImportClick,
    onExportBook: props.onBookExportClick,
    onExport: props.onExportClick,
    themePreference: props.themePreference,
    resolvedTheme: props.resolvedTheme,
    onThemePreferenceChange: props.onThemePreferenceChange,
    spellcheckEnabled: props.spellcheckEnabled,
    spellcheckLanguage: props.spellcheckLanguage,
    spellcheckLanguageOptions: props.spellcheckLanguageOptions,
    spellcheckLanguageSelectionSupported: props.spellcheckLanguageSelectionSupported,
    onSpellcheckEnabledChange: props.onSpellcheckEnabledChange,
    onSpellcheckLanguageChange: props.onSpellcheckLanguageChange,
    focusModeEnabled: state.workspaceLayout.focusModeEnabled,
    focusScope: state.workspaceLayout.focusScope,
    onFocusScopeChange: actions.setFocusScope,
  }
}

function SidebarSection({
  model,
  themePreference,
  resolvedTheme,
  onThemePreferenceChange,
  spellcheckEnabled,
  spellcheckLanguage,
  spellcheckLanguageOptions,
  spellcheckLanguageSelectionSupported,
  onSpellcheckEnabledChange,
  onSpellcheckLanguageChange,
  onImportClick,
  onBookExportClick,
  onExportClick,
}: Pick<ProjectEditorViewProps, 'model' | 'themePreference' | 'resolvedTheme' | 'onThemePreferenceChange' | 'spellcheckEnabled' | 'spellcheckLanguage' | 'spellcheckLanguageOptions' | 'spellcheckLanguageSelectionSupported' | 'onSpellcheckEnabledChange' | 'onSpellcheckLanguageChange'> & {
  onImportClick: () => void
  onBookExportClick: (format: BookExportFormat) => void
  onExportClick: () => void
}) {
  const sidebarProps = buildSidebarSectionProps(model, {
    themePreference, resolvedTheme, onThemePreferenceChange,
    spellcheckEnabled, spellcheckLanguage, spellcheckLanguageOptions,
    spellcheckLanguageSelectionSupported, onSpellcheckEnabledChange,
    onSpellcheckLanguageChange, onImportClick, onBookExportClick, onExportClick,
  })
  return <SidebarPanel {...sidebarProps} />
}

export function ProjectEditorView({
  model,
  themePreference,
  resolvedTheme,
  onThemePreferenceChange,
  spellcheckEnabled,
  spellcheckLanguage,
  spellcheckLanguageOptions,
  spellcheckLanguageSelectionSupported,
  onSpellcheckEnabledChange,
  onSpellcheckLanguageChange,
}: ProjectEditorViewProps) {
  const { state } = model
  const aiImport = useAiImport(state.rootPath)
  const aiExport = useAiExport(state.rootPath)
  const bookExport = useBookExport(state.rootPath)

  return (
    <main class={buildShellClassName(model)}>
      <div class="editor-app">
        <section
          class="editor-workspace"
          style={{ '--sidebar-width': `${state.sidebarPanelCollapsed ? 72 : state.sidebarPanelWidth}px` }}
        >
          <SidebarSection
            model={model}
            themePreference={themePreference}
            resolvedTheme={resolvedTheme}
            onThemePreferenceChange={onThemePreferenceChange}
            spellcheckEnabled={spellcheckEnabled}
            spellcheckLanguage={spellcheckLanguage}
            spellcheckLanguageOptions={spellcheckLanguageOptions}
            spellcheckLanguageSelectionSupported={spellcheckLanguageSelectionSupported}
            onSpellcheckEnabledChange={onSpellcheckEnabledChange}
            onSpellcheckLanguageChange={onSpellcheckLanguageChange}
            onImportClick={() => aiImport.setOpen(true)}
            onBookExportClick={(format) => {
              bookExport.setFormat(format)
              bookExport.setOutputPath('')
              bookExport.setOpen(true)
            }}
            onExportClick={() => aiExport.setOpen(true)}
          />
          <ProjectEditorMainPane model={model} spellcheckEnabled={spellcheckEnabled} />
        </section>
      </div>
      <ProjectEditorDialogs rootPath={state.rootPath} visibleFiles={state.visibleFiles} aiImport={aiImport} bookExport={bookExport} aiExport={aiExport} />
    </main>
  )
}
