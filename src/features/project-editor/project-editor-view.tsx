import type { ProjectEditorModel } from './project-editor-types'
import { ConflictBanner } from './components/conflict-banner'
import { EditorPanel } from './components/editor-panel'
import { FileListPanel } from './components/file-list-panel'
import { ProjectHeader } from './components/project-header'

interface ProjectEditorViewProps {
  model: ProjectEditorModel
}

export function ProjectEditorView({ model }: ProjectEditorViewProps) {
  const {
    state: {
      apiAvailable,
      rootPath,
      statusMessage,
      externalConflictPath,
      visibleFiles,
      selectedPath,
      editorValue,
      isDirty,
      loadingProject,
      loadingDocument,
      saving,
    },
    actions: {
      pickProjectFolder,
      selectFile,
      updateEditorValue,
      saveNow,
      resolveConflictReload,
      resolveConflictKeep,
    },
  } = model

  return (
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <div class="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6">
        <ProjectHeader
          apiAvailable={apiAvailable}
          loadingProject={loadingProject}
          rootPath={rootPath}
          statusMessage={statusMessage}
          onPickFolder={() => void pickProjectFolder()}
        />

        {externalConflictPath && (
          <ConflictBanner
            externalConflictPath={externalConflictPath}
            onReload={resolveConflictReload}
            onKeep={resolveConflictKeep}
          />
        )}

        <section class="mt-4 grid min-h-[60vh] grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <FileListPanel
            visibleFiles={visibleFiles}
            selectedPath={selectedPath}
            loadingDocument={loadingDocument}
            onSelectFile={selectFile}
          />

          <EditorPanel
            selectedPath={selectedPath}
            saving={saving}
            isDirty={isDirty}
            loadingDocument={loadingDocument}
            editorValue={editorValue}
            onSaveNow={saveNow}
            onEditorChange={updateEditorValue}
          />
        </section>
      </div>
    </main>
  )
}
