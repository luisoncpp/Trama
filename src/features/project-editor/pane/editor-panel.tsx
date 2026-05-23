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
  historyBackDisabled: boolean
  onHistoryBack: () => void
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

function getSaveLabel({saving, isDirty}: {saving: boolean, isDirty: boolean}): string {
  if (saving) return PROJECT_EDITOR_STRINGS.saving
  if (isDirty) return PROJECT_EDITOR_STRINGS.saveNow
  return PROJECT_EDITOR_STRINGS.noChanges
}

function getRevertLabel({isDirty}: {isDirty: boolean}): string {
  if (isDirty) return PROJECT_EDITOR_STRINGS.revertChanges
  return PROJECT_EDITOR_STRINGS.noChanges
}

function buildSyncState(
  selectedPath: string | null,
  loadingDocument: boolean,
  saving: boolean,
  isDirty: boolean,
): RichEditorSyncState {
  if (!selectedPath || loadingDocument) return 'disabled'
  if (saving) return 'saving'
  if (isDirty) return 'dirty'
  return 'clean'
}

function buildEditorPanelState(
  selectedPath: string | null,
  loadingDocument: boolean,
  saving: boolean,
  isDirty: boolean,
) {
  return {
    saveDisabled: !selectedPath || saving || !isDirty,
    saveLabel: getSaveLabel({ saving, isDirty }),
    revertDisabled: !selectedPath || saving || !isDirty,
    revertLabel: getRevertLabel({ isDirty }),
    syncState: buildSyncState(selectedPath, loadingDocument, saving, isDirty),
    syncStateLabel: computeSyncStateLabel(selectedPath, loadingDocument, saving, isDirty),
  }
}

function renderEditorPanelBody(
  props: EditorPanelProps,
  state: ReturnType<typeof buildEditorPanelState>,
) {
  const { selectedPath, loadingDocument, onInteract } = props
  return (
    <article class="editor-panel-root" onPointerDownCapture={onInteract}>
      <div class={`editor-manuscript ${!selectedPath || loadingDocument ? 'is-muted' : ''}`}>
        <RichMarkdownEditor
          documentId={selectedPath} value={props.editorValue}
          disabled={!selectedPath || loadingDocument}
          spellcheckEnabled={props.spellcheckEnabled} onChange={props.onEditorChange}
          historyBackDisabled={props.historyBackDisabled}
          onHistoryBack={props.onHistoryBack}
          saveDisabled={state.saveDisabled} saveLabel={state.saveLabel}
          onSaveNow={props.onSaveNow}
          revertDisabled={state.revertDisabled} revertLabel={state.revertLabel}
          onRevertNow={props.onRevertNow}
          syncState={state.syncState} syncStateLabel={state.syncStateLabel}
          focusModeEnabled={props.focusModeEnabled} focusScope={props.focusScope}
          tagIndex={props.tagIndex} onTagClick={props.onTagClick} isActive={props.isActive}
          editorSerializationRef={props.editorSerializationRef}
          onMarkDirty={props.onMarkDirty}
          zoomRef={props.zoomRef}
          zoomLevel={props.zoomLevel}
          onZoomChange={props.onZoomChange}
        />
      </div>
    </article>
  )
}

export function EditorPanel(props: EditorPanelProps) {
  const panelState = buildEditorPanelState(
    props.selectedPath,
    props.loadingDocument,
    props.saving,
    props.isDirty,
  )
  return renderEditorPanelBody(props, panelState)
}
