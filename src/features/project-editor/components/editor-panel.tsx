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
  return (
    <article class="workspace-panel workspace-panel--editor">
      <div class="workspace-panel__header workspace-panel__header--editor">
        <div>
          <p class="workspace-panel__eyebrow">Modo edicion</p>
          <h2 class="workspace-panel__title">{PROJECT_EDITOR_STRINGS.editorTitle}</h2>
        </div>
        <button
          type="button"
          disabled={!selectedPath || saving || !isDirty}
          onClick={onSaveNow}
          class="editor-button editor-button--secondary"
        >
          {saving ? PROJECT_EDITOR_STRINGS.saving : isDirty ? PROJECT_EDITOR_STRINGS.saveNow : PROJECT_EDITOR_STRINGS.noChanges}
        </button>
      </div>
      <div class="editor-document-meta">
        <p class="editor-document-meta__path">{selectedPath ?? PROJECT_EDITOR_STRINGS.noFileSelected}</p>
        <span class={`editor-document-meta__state ${isDirty ? 'is-dirty' : 'is-clean'}`}>
          {isDirty ? 'Cambios pendientes' : 'Sincronizado'}
        </span>
      </div>
      <div class={`editor-manuscript ${!selectedPath || loadingDocument ? 'is-muted' : ''}`}>
        <RichMarkdownEditor
          documentId={selectedPath}
          value={editorValue}
          disabled={!selectedPath || loadingDocument}
          onChange={onEditorChange}
        />
      </div>
    </article>
  )
}
