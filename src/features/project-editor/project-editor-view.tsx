import type { ProjectEditorModel } from './project-editor-types'
import { ConflictBanner } from './components/conflict-banner'
import { EditorPanel } from './components/editor-panel'
import { FileListPanel } from './components/file-list-panel'

interface ProjectEditorViewProps {
  model: ProjectEditorModel
}

export function ProjectEditorView({ model }: ProjectEditorViewProps) {
  const { state, actions } = model

  return (
    <main class="editor-shell">
      <div class="editor-app">
        <section class="editor-workspace">
          <FileListPanel
            visibleFiles={state.visibleFiles}
            selectedPath={state.selectedPath}
            loadingDocument={state.loadingDocument}
            onSelectFile={actions.selectFile}
            apiAvailable={state.apiAvailable}
            loadingProject={state.loadingProject}
            rootPath={state.rootPath}
            statusMessage={state.statusMessage}
            onPickFolder={() => void actions.pickProjectFolder()}
          />

          <div class="editor-main">
            {state.externalConflictPath && (
              <ConflictBanner
                externalConflictPath={state.externalConflictPath}
                onReload={actions.resolveConflictReload}
                onKeep={actions.resolveConflictKeep}
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
        </section>
      </div>
    </main>
  )
}
