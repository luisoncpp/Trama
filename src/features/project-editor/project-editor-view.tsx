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
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <div class="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6">
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

        <section class="mt-4 grid min-h-[60vh] grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
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
