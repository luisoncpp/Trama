import type { ProjectEditorModel } from './project-editor-types'
import { ConflictBanner } from './components/conflict-banner'
import { ConflictComparePanel } from './components/conflict-compare-panel'
import { EditorPanel } from './components/editor-panel'
import { FileListPanel } from './components/file-list-panel'

interface ProjectEditorViewProps {
  model: ProjectEditorModel
}

function ProjectEditorMainPane({ model }: ProjectEditorViewProps) {
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

      <EditorPanel
        selectedPath={state.selectedPath}
        saving={state.saving}
        isDirty={state.isDirty}
        loadingDocument={state.loadingDocument}
        editorValue={state.editorValue}
        onSaveNow={actions.saveNow}
        onEditorChange={actions.updateEditorValue}
      />
    </div>
  )
}

export function ProjectEditorView({ model }: ProjectEditorViewProps) {
  const { state, actions } = model

  return (
    <main class="editor-shell">
      <div class="editor-app">
        <section
          class="editor-workspace"
          style={{ '--sidebar-width': `${state.sidebarPanelCollapsed ? 72 : state.sidebarPanelWidth}px` }}
        >
          <FileListPanel
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
            apiAvailable={state.apiAvailable}
            loadingProject={state.loadingProject}
            rootPath={state.rootPath}
            statusMessage={state.statusMessage}
            onPickFolder={() => void actions.pickProjectFolder()}
          />
          <ProjectEditorMainPane model={model} />
        </section>
      </div>
    </main>
  )
}
