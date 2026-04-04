import type { ProjectEditorModel } from './project-editor-types'
import { ConflictBanner } from './components/conflict-banner'
import { EditorPanel } from './components/editor-panel'
import { FileListPanel } from './components/file-list-panel'
import { ProjectHeader } from './components/project-header'

interface ProjectEditorViewProps {
  model: ProjectEditorModel
}

export function ProjectEditorView({ model }: ProjectEditorViewProps) {
  const { state, actions } = model

  return (
    <main class="editor-shell">
      <div class="editor-app">
        <ProjectHeader
          apiAvailable={state.apiAvailable}
          loadingProject={state.loadingProject}
          rootPath={state.rootPath}
          statusMessage={state.statusMessage}
          onPickFolder={() => void actions.pickProjectFolder()}
        />

        {state.externalConflictPath && (
          <ConflictBanner
            externalConflictPath={state.externalConflictPath}
            onReload={actions.resolveConflictReload}
            onKeep={actions.resolveConflictKeep}
          />
        )}

        <section class="editor-workspace">
          <FileListPanel
            visibleFiles={state.visibleFiles}
            selectedPath={state.selectedPath}
            loadingDocument={state.loadingDocument}
            onSelectFile={actions.selectFile}
          />

          <EditorPanel
            selectedPath={state.selectedPath}
            saving={state.saving}
            isDirty={state.isDirty}
            loadingDocument={state.loadingDocument}
            editorValue={state.editorValue}
            onSaveNow={actions.saveNow}
            onEditorChange={actions.updateEditorValue}
          />
        </section>
      </div>
    </main>
  )
}
