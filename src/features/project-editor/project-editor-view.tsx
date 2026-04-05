import type { ProjectEditorModel } from './project-editor-types'
import { ConflictBanner } from './components/conflict-banner'
import { ConflictComparePanel } from './components/conflict-compare-panel'
import { WorkspaceLayoutPanel } from './components/workspace-editor-panels.tsx'
import { SidebarPanel } from './components/sidebar/sidebar-panel.tsx'
import type { ResolvedTheme, ThemePreference } from '../../theme/theme-types'
import { useWorkspaceKeyboardShortcuts } from './use-workspace-keyboard-shortcuts'

interface ProjectEditorViewProps {
  model: ProjectEditorModel
  themePreference: ThemePreference
  resolvedTheme: ResolvedTheme
  onThemePreferenceChange: (preference: ThemePreference) => void
}

interface ProjectEditorMainPaneProps {
  model: ProjectEditorModel
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

export function ProjectEditorView({
  model,
  themePreference,
  resolvedTheme,
  onThemePreferenceChange,
}: ProjectEditorViewProps) {
  const { state, actions } = model
  const shellClassName = state.workspaceLayout.mode === 'split' ? 'editor-shell is-split' : 'editor-shell'

  // Enable keyboard shortcuts for workspace operations
  useWorkspaceKeyboardShortcuts({ model })

  return (
    <main class={shellClassName}>
      <div class="editor-app">
        <section
          class="editor-workspace"
          style={{ '--sidebar-width': `${state.sidebarPanelCollapsed ? 72 : state.sidebarPanelWidth}px` }}
        >
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
            themePreference={themePreference}
            resolvedTheme={resolvedTheme}
            onThemePreferenceChange={onThemePreferenceChange}
          />
          <ProjectEditorMainPane model={model} />
        </section>
      </div>
    </main>
  )
}
