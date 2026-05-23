import { PROJECT_EDITOR_STRINGS } from '../project-editor-strings'
import type { EditorSerializationRefs, FocusScope, EditorZoomRef } from '../project-editor-types'
import { RichMarkdownEditor } from './rich-markdown-editor/rich-markdown-editor'
import type { RichEditorSyncState } from './rich-markdown-editor/rich-markdown-editor-toolbar'

interface EditorPanelProps {
  selectedPath: string | null
  saving: boolean
  isDirty: boolean
  reloadVersion: number
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

function renderEditorPanelBody(
  props: EditorPanelProps,
  state: {
    saveDisabled: boolean,
    saveLabel: string,
    revertDisabled: boolean,
    syncState: RichEditorSyncState,
    syncStateLabel: string
  }) {
  const { selectedPath, loadingDocument, onInteract } = props
  return (
    <article class="editor-panel-root" onPointerDownCapture={onInteract}>
      <div class={`editor-manuscript ${!selectedPath || loadingDocument ? 'is-muted' : ''}`}>
        <RichMarkdownEditor
          documentId={selectedPath} value={props.editorValue}
          forceApplyVersion={props.reloadVersion}
          disabled={!selectedPath || loadingDocument}
          spellcheckEnabled={props.spellcheckEnabled} onChange={props.onEditorChange}
          historyBackDisabled={props.historyBackDisabled}
          onHistoryBack={props.onHistoryBack}
          saveDisabled={state.saveDisabled} saveLabel={state.saveLabel}
          onSaveNow={props.onSaveNow}
          revertDisabled={state.revertDisabled} revertLabel={PROJECT_EDITOR_STRINGS.revertChanges}
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
  const panelState = {
    saveDisabled: !props.selectedPath || props.saving || !props.isDirty,
    saveLabel: getSaveLabel({ saving: props.saving, isDirty: props.isDirty }),
    revertDisabled: !props.selectedPath || props.saving || !props.isDirty,
    syncState: buildSyncState(props.selectedPath, props.loadingDocument, props.saving, props.isDirty),
    syncStateLabel: computeSyncStateLabel(props.selectedPath, props.loadingDocument, props.saving, props.isDirty),
  };
  return renderEditorPanelBody(props, panelState)
}
