import type { ProjectEditorModel } from './project-editor-types'
import { ConflictBanner } from './components/conflict-banner'
import { ConflictComparePanel } from './components/conflict-compare-panel'
import { WorkspaceLayoutPanel } from './components/workspace-editor-panels.tsx'
import { SidebarPanel } from './components/sidebar/sidebar-panel.tsx'
import { AiImportDialog } from './components/ai-import-dialog'
import { AiExportDialog } from './components/ai-export-dialog'
import { useAiImport } from './use-ai-import'
import { useAiExport } from './use-ai-export'
import type { ResolvedTheme, ThemePreference } from '../../theme/theme-types'

interface ProjectEditorViewProps {
  model: ProjectEditorModel
  themePreference: ThemePreference
  resolvedTheme: ResolvedTheme
  onThemePreferenceChange: (preference: ThemePreference) => void
}

interface ProjectEditorMainPaneProps {
  model: ProjectEditorModel
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

function ProjectEditorMainPane({ model }: ProjectEditorMainPaneProps) {
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

      <WorkspaceLayoutPanel model={model} />
    </div>
  )
}

function SidebarSection({
  model,
  themePreference,
  resolvedTheme,
  onThemePreferenceChange,
  onImportClick,
  onExportClick,
}: Pick<ProjectEditorViewProps, 'model' | 'themePreference' | 'resolvedTheme' | 'onThemePreferenceChange'> & { onImportClick: () => void; onExportClick: () => void }) {
  const { state, actions } = model

  return (
    <SidebarPanel
      visibleFiles={state.visibleFiles}
      selectedPath={state.selectedPath}
      loadingDocument={state.loadingDocument}
      onSelectFile={actions.selectFile}
      sidebarActiveSection={state.sidebarActiveSection}
      sidebarPanelCollapsed={state.sidebarPanelCollapsed}
      sidebarPanelWidth={state.sidebarPanelWidth}
      onSelectSidebarSection={actions.setSidebarSection}
      onToggleSidebarPanelCollapsed={actions.toggleSidebarPanelCollapsed}
      onSidebarPanelWidthChange={actions.setSidebarPanelWidth}
      onCreateArticle={(input) => void actions.createArticle(input)}
      onCreateCategory={(input) => void actions.createCategory(input)}
      onRenameFile={(path, newName) => void actions.renameFile({ path, newName })}
      onDeleteFile={(path) => void actions.deleteFile(path)}
      apiAvailable={state.apiAvailable}
      loadingProject={state.loadingProject}
      rootPath={state.rootPath}
      onPickFolder={() => void actions.pickProjectFolder()}
      onImport={onImportClick}
      onExport={onExportClick}
      themePreference={themePreference}
      resolvedTheme={resolvedTheme}
      onThemePreferenceChange={onThemePreferenceChange}
      focusModeEnabled={state.workspaceLayout.focusModeEnabled}
      focusScope={state.workspaceLayout.focusScope}
      onFocusScopeChange={actions.setFocusScope}
    />
  )
}

function ProjectEditorDialogs({
  rootPath,
  visibleFiles,
  aiImport,
  aiExport,
}: {
  rootPath: string
  visibleFiles: string[]
  aiImport: ReturnType<typeof useAiImport>
  aiExport: ReturnType<typeof useAiExport>
}) {
  const exportableFiles = visibleFiles.filter((path) => !path.endsWith('/'))

  return (
    <>
      <AiImportDialog
        open={aiImport.open}
        onClose={() => aiImport.setOpen(false)}
        onPreview={aiImport.handlePreview}
        onExecute={aiImport.handleExecute}
        projectRoot={rootPath}
      />
      <AiExportDialog
        open={aiExport.open}
        onClose={() => aiExport.setOpen(false)}
        onExport={aiExport.handleExport}
        selectedPaths={aiExport.selectedPaths}
        onSelectedPathsChange={aiExport.setSelectedPaths}
        includeFrontmatter={aiExport.includeFrontmatter}
        onIncludeFrontmatterChange={aiExport.setIncludeFrontmatter}
        visibleFiles={exportableFiles}
        exporting={aiExport.exporting}
        lastError={aiExport.lastError}
      />
    </>
  )
}

export function ProjectEditorView({
  model,
  themePreference,
  resolvedTheme,
  onThemePreferenceChange,
}: ProjectEditorViewProps) {
  const { state } = model
  const aiImport = useAiImport(state.rootPath)
  const aiExport = useAiExport(state.rootPath)

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
            onImportClick={() => aiImport.setOpen(true)}
            onExportClick={() => aiExport.setOpen(true)}
          />
          <ProjectEditorMainPane model={model} />
        </section>
      </div>
      <ProjectEditorDialogs rootPath={state.rootPath} visibleFiles={state.visibleFiles} aiImport={aiImport} aiExport={aiExport} />
    </main>
  )
}
