import { PROJECT_EDITOR_STRINGS } from '../project-editor-strings'
import type { FocusScope } from '../project-editor-types'
import { RichMarkdownEditor } from './rich-markdown-editor'
import type { RichEditorSyncState } from './rich-markdown-editor-toolbar'

interface EditorPanelProps {
  selectedPath: string | null
  saving: boolean
  isDirty: boolean
  loadingDocument: boolean
  editorValue: string
  onSaveNow: () => void
  onEditorChange: (value: string) => void
  focusModeEnabled: boolean
  focusScope: FocusScope
  onInteract?: () => void
  tagIndex?: Record<string, string> | null
  onTagClick?: (filePath: string) => void
}

function computeSyncStateLabel(selectedPath: string | null, loadingDocument: boolean, saving: boolean, isDirty: boolean): string {
  if (!selectedPath || loadingDocument) return PROJECT_EDITOR_STRINGS.noFileSelected
  if (saving) return 'Guardando'
  if (isDirty) return 'Cambios pendientes'
  return 'Sincronizado'
}

export function EditorPanel({
  selectedPath,
  saving,
  isDirty,
  loadingDocument,
  editorValue,
  onSaveNow,
  onEditorChange,
  focusModeEnabled,
  focusScope,
  onInteract,
  tagIndex,
  onTagClick,
}: EditorPanelProps) {
  const saveDisabled = !selectedPath || saving || !isDirty
  const saveLabel = saving
    ? PROJECT_EDITOR_STRINGS.saving
    : isDirty
      ? PROJECT_EDITOR_STRINGS.saveNow
      : PROJECT_EDITOR_STRINGS.noChanges

  const syncState: RichEditorSyncState = !selectedPath || loadingDocument ? 'disabled' : saving ? 'saving' : isDirty ? 'dirty' : 'clean'
  const syncStateLabel = computeSyncStateLabel(selectedPath, loadingDocument, saving, isDirty)

  return (
    <article class="editor-panel-root" onPointerDownCapture={onInteract}>
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
          focusModeEnabled={focusModeEnabled}
          focusScope={focusScope}
          tagIndex={tagIndex}
          onTagClick={onTagClick}
        />
      </div>
    </article>
  )
}
