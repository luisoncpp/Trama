import { PROJECT_EDITOR_STRINGS } from '../project-editor-strings'
import { RichMarkdownEditor } from './rich-markdown-editor'

interface EditorPanelProps {
  selectedPath: string | null
  saving: boolean
  isDirty: boolean
  loadingDocument: boolean
  editorValue: string
  onSaveNow: () => void
  onEditorChange: (value: string) => void
}

export function EditorPanel({
  selectedPath,
  saving,
  isDirty,
  loadingDocument,
  editorValue,
  onSaveNow,
  onEditorChange,
}: EditorPanelProps) {
  const saveDisabled = !selectedPath || saving || !isDirty
  const saveLabel = saving
    ? PROJECT_EDITOR_STRINGS.saving
    : isDirty
      ? PROJECT_EDITOR_STRINGS.saveNow
      : PROJECT_EDITOR_STRINGS.noChanges

  const syncState = !selectedPath || loadingDocument ? 'disabled' : saving ? 'saving' : isDirty ? 'dirty' : 'clean'
  const syncStateLabel =
    syncState === 'saving'
      ? 'Guardando'
      : syncState === 'dirty'
        ? 'Cambios pendientes'
        : syncState === 'clean'
          ? 'Sincronizado'
          : PROJECT_EDITOR_STRINGS.noFileSelected

  return (
    <article class="editor-panel-root">
      <div class={`editor-manuscript ${!selectedPath || loadingDocument ? 'is-muted' : ''}`}>
        <RichMarkdownEditor
          documentId={selectedPath}
          value={editorValue}
          disabled={!selectedPath || loadingDocument}
          onChange={onEditorChange}
          saveDisabled={saveDisabled}
          saveLabel={saveLabel}
          onSaveNow={onSaveNow}
          syncState={syncState}
          syncStateLabel={syncStateLabel}
        />
      </div>
    </article>
  )
}
