import { PROJECT_EDITOR_STRINGS } from '../project-editor-strings'
import type { EditorSerializationRefs, FocusScope, EditorZoomRef } from '../project-editor-types'
import { RichMarkdownEditor } from './rich-markdown-editor/rich-markdown-editor'
import type { RichEditorSyncState } from './rich-markdown-editor/rich-markdown-editor-toolbar'

interface EditorPanelProps {
  selectedPath: string | null
  saving: boolean
  isDirty: boolean
  loadingDocument: boolean
  editorValue: string
  spellcheckEnabled: boolean
  onSaveNow: () => void
  onRevertNow: () => void
  onEditorChange: (value: string) => void
  focusModeEnabled: boolean
  focusScope: FocusScope
  onInteract?: () => void
  tagIndex?: Record<string, string> | null
  onTagClick?: (filePath: string) => void
  isActive?: boolean
  editorSerializationRef?: { current: EditorSerializationRefs }
  onMarkDirty?: () => void
  zoomRef?: EditorZoomRef
  zoomLevel?: number
  onZoomChange?: (level: number) => void
}

function computeSyncStateLabel(selectedPath: string | null, loadingDocument: boolean, saving: boolean, isDirty: boolean): string {
  if (!selectedPath || loadingDocument) return PROJECT_EDITOR_STRINGS.noFileSelected
  if (saving) return 'Guardando'
  if (isDirty) return 'Cambios pendientes'
  return 'Sincronizado'
}

interface EditorPanelLabels {
  saveDisabled: boolean
  saveLabel: string
  revertDisabled: boolean
  revertLabel: string
  syncState: RichEditorSyncState
  syncStateLabel: string
}

function useEditorPanelLabels(
  selectedPath: string | null,
  loadingDocument: boolean,
  saving: boolean,
  isDirty: boolean,
): EditorPanelLabels {
  const saveDisabled = !selectedPath || saving || !isDirty
  const saveLabel = saving
    ? PROJECT_EDITOR_STRINGS.saving
    : isDirty
      ? PROJECT_EDITOR_STRINGS.saveNow
      : PROJECT_EDITOR_STRINGS.noChanges

  const revertDisabled = !selectedPath || saving || !isDirty
  const revertLabel = isDirty
    ? PROJECT_EDITOR_STRINGS.revertChanges
    : PROJECT_EDITOR_STRINGS.noChanges

  const syncState: RichEditorSyncState = !selectedPath || loadingDocument ? 'disabled' : saving ? 'saving' : isDirty ? 'dirty' : 'clean'
  const syncStateLabel = computeSyncStateLabel(selectedPath, loadingDocument, saving, isDirty)
  return { saveDisabled, saveLabel, revertDisabled, revertLabel, syncState, syncStateLabel }
}

export function EditorPanel({
  selectedPath,
  saving,
  isDirty,
  loadingDocument,
  editorValue,
  spellcheckEnabled,
  onSaveNow,
  onRevertNow,
  onEditorChange,
  focusModeEnabled,
  focusScope,
  onInteract,
  tagIndex,
  onTagClick,
  isActive = true,
  editorSerializationRef,
  onMarkDirty,
  zoomRef,
  zoomLevel,
  onZoomChange,
}: EditorPanelProps) {
  const { saveDisabled, saveLabel, revertDisabled, revertLabel, syncState, syncStateLabel } = useEditorPanelLabels(selectedPath, loadingDocument, saving, isDirty)

  return (
    <article class="editor-panel-root" onPointerDownCapture={onInteract}>
      <div class={`editor-manuscript ${!selectedPath || loadingDocument ? 'is-muted' : ''}`}>
        <RichMarkdownEditor
          documentId={selectedPath} value={editorValue}
          disabled={!selectedPath || loadingDocument}
          spellcheckEnabled={spellcheckEnabled} onChange={onEditorChange}
          saveDisabled={saveDisabled} saveLabel={saveLabel}
          onSaveNow={onSaveNow}
          revertDisabled={revertDisabled} revertLabel={revertLabel}
          onRevertNow={onRevertNow}
          syncState={syncState} syncStateLabel={syncStateLabel}
          focusModeEnabled={focusModeEnabled} focusScope={focusScope}
          tagIndex={tagIndex} onTagClick={onTagClick} isActive={isActive}
          editorSerializationRef={editorSerializationRef}
          onMarkDirty={onMarkDirty}
          zoomRef={zoomRef}
          zoomLevel={zoomLevel}
          onZoomChange={onZoomChange}
        />
      </div>
    </article>
  )
}
