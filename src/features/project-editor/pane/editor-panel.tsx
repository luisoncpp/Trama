/* eslint-disable max-lines-per-function */
import { PROJECT_EDITOR_STRINGS } from '../project-editor-strings'
import type { EditorSerializationRefs, FocusScope, EditorZoomRef, WorkspaceLayoutMode } from '../project-editor-types'
import { WORKSPACE_CONTEXT_MENU_STATE_GLOBAL, type WorkspaceContextMenuState } from '../../../shared/workspace-context-menu'
import { RichMarkdownEditor } from './rich-markdown-editor/rich-markdown-editor'
import { MapEditor } from './map-editor/map-editor'
import { RelationshipsEditor } from './relationships-editor/relationships-editor'
import { RevisionsRail } from './revisions/revisions-rail'
import type { RichEditorSyncState } from './rich-markdown-editor/rich-markdown-editor-toolbar'
import type { DocumentMeta } from '../../../shared/ipc'

interface EditorPanelProps {
  selectedPath: string | null
  projectRoot: string
  pane: 'primary' | 'secondary'
  layoutMode: WorkspaceLayoutMode
  gitAvailable: boolean
  saving: boolean
  isDirty: boolean
  reloadVersion: number
  previewReadOnly?: boolean
  previewVersion?: number
  loadingDocument: boolean
  editorValue: string
  editorMeta: DocumentMeta
  spellcheckEnabled: boolean
  historyBackDisabled: boolean
  onHistoryBack: () => void
  onSaveNow: () => void
  onRevertNow: () => void
  onEditorChange: (value: string) => void
  onEditorMetaChange: (meta: DocumentMeta) => void
  focusModeEnabled: boolean
  focusScope: FocusScope
  onInteract?: () => void
  onCloseRevisions: () => void
  onOpenRevisionsCurrent: () => void
  onOpenRevision: (commitSha: string) => void
  onLoadMoreRevisions: () => void
  onRequestLoadRevision: () => void
  onCancelLoadRevision: () => void
  onConfirmLoadRevision: () => void
  tagIndex?: Record<string, string> | null
  onTagClick?: (filePath: string) => void
  onMapMarkerNavigate?: (filePath: string, pane: 'primary' | 'secondary') => void
  isActive?: boolean
  editorSerializationRef?: { current: EditorSerializationRefs }
  onMarkDirty?: () => void
  zoomRef?: EditorZoomRef
  zoomLevel?: number
  onZoomChange?: (level: number) => void
  revisionRail: import('../project-editor-types').RevisionRailState
}

function syncWorkspaceContextMenuState(nextState: WorkspaceContextMenuState): void {
  ;(window as typeof window & Record<string, unknown>)[WORKSPACE_CONTEXT_MENU_STATE_GLOBAL] = nextState
}

function buildWorkspaceContextMenuState(props: EditorPanelProps): WorkspaceContextMenuState {
  return {
    gitAvailable: props.gitAvailable,
    pane: props.pane,
    path: props.selectedPath,
    previewReadOnly: Boolean(props.previewReadOnly),
  }
}

function renderRevisionsRail(props: EditorPanelProps): preact.JSX.Element {
  return (
    <RevisionsRail
      rail={props.revisionRail}
      onClose={props.onCloseRevisions}
      onSelectCurrent={props.onOpenRevisionsCurrent}
      onSelectRevision={props.onOpenRevision}
      onLoadMore={props.onLoadMoreRevisions}
      onCancelLoadRevision={props.onCancelLoadRevision}
      onConfirmLoadRevision={props.onConfirmLoadRevision}
    />
  )
}

function computeSyncStateLabel(selectedPath: string | null, loadingDocument: boolean, saving: boolean, isDirty: boolean): string {
  if (!selectedPath || loadingDocument) return PROJECT_EDITOR_STRINGS.noFileSelected
  if (saving) return 'Guardando'
  if (isDirty) return 'Cambios pendientes'
  return 'Sincronizado'
}

function computePreviewAwareSyncStateLabel(
  selectedPath: string | null,
  loadingDocument: boolean,
  saving: boolean,
  isDirty: boolean,
  previewReadOnly: boolean,
): string {
  if (previewReadOnly) return 'Revision preview'
  return computeSyncStateLabel(selectedPath, loadingDocument, saving, isDirty)
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
  previewReadOnly: boolean,
): RichEditorSyncState {
  if (!selectedPath || loadingDocument) return 'disabled'
  if (previewReadOnly) return 'preview'
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
  const contextMenuState = buildWorkspaceContextMenuState(props)
  return (
    <article
      class="editor-panel-root"
      onPointerDownCapture={() => {
        syncWorkspaceContextMenuState(contextMenuState)
        onInteract?.()
      }}
      onContextMenuCapture={() => syncWorkspaceContextMenuState(contextMenuState)}
    >
      <div class={`editor-manuscript editor-fill-column ${!selectedPath || loadingDocument ? 'is-muted' : ''}`}>
        {props.editorMeta.type === 'map'
          ? <MapEditor
              projectRoot={props.projectRoot}
              meta={props.editorMeta}
              pane={props.pane}
              layoutMode={props.layoutMode}
              readOnlyPreview={Boolean(props.previewReadOnly)}
              tagIndex={props.tagIndex}
              onMetaChange={props.onEditorMetaChange}
              onNavigate={(filePath, pane) => props.onMapMarkerNavigate?.(filePath, pane)}
            />
          : props.editorMeta.type === 'relationships'
          ? <RelationshipsEditor
              meta={props.editorMeta}
              pane={props.pane}
              layoutMode={props.layoutMode}
              readOnlyPreview={Boolean(props.previewReadOnly)}
              tagIndex={props.tagIndex}
              onMetaChange={props.onEditorMetaChange}
              onNavigate={(filePath, pane) => props.onMapMarkerNavigate?.(filePath, pane)}
            />
          : <RichMarkdownEditor
              documentId={selectedPath} value={props.editorValue}
              forceApplyVersion={(props.previewVersion ?? 0) > 0 ? (props.previewVersion ?? 0) : props.reloadVersion}
              disabled={!selectedPath || loadingDocument}
              readOnlyPreview={Boolean(props.previewReadOnly)}
              spellcheckEnabled={props.spellcheckEnabled} onChange={props.onEditorChange}
              historyBackDisabled={props.historyBackDisabled}
              onHistoryBack={props.onHistoryBack}
              saveDisabled={state.saveDisabled} saveLabel={state.saveLabel}
              onSaveNow={props.onSaveNow}
              revertDisabled={state.revertDisabled} revertLabel={PROJECT_EDITOR_STRINGS.revertChanges}
              onRevertNow={props.onRevertNow}
              previewRestoreDisabled={props.saving || !props.selectedPath || props.revisionRail.selected.kind !== 'revision'}
              previewRestoreLabel="Restore revision"
              onPreviewRestore={props.onRequestLoadRevision}
              syncState={state.syncState} syncStateLabel={state.syncStateLabel}
              focusModeEnabled={props.focusModeEnabled} focusScope={props.focusScope}
              tagIndex={props.tagIndex} onTagClick={props.onTagClick} isActive={props.isActive}
              editorSerializationRef={props.editorSerializationRef}
              onMarkDirty={props.onMarkDirty}
              zoomRef={props.zoomRef}
              zoomLevel={props.zoomLevel}
              onZoomChange={props.onZoomChange}
            />}
      </div>
      {renderRevisionsRail(props)}
    </article>
  )
}

export function EditorPanel(props: EditorPanelProps) {
  const panelState = {
    saveDisabled: !props.selectedPath || props.saving || !props.isDirty || Boolean(props.previewReadOnly),
    saveLabel: getSaveLabel({ saving: props.saving, isDirty: props.isDirty }),
    revertDisabled: !props.selectedPath || props.saving || !props.isDirty || Boolean(props.previewReadOnly),
    syncState: buildSyncState(props.selectedPath, props.loadingDocument, props.saving, props.isDirty, Boolean(props.previewReadOnly)),
    syncStateLabel: computePreviewAwareSyncStateLabel(
      props.selectedPath,
      props.loadingDocument,
      props.saving,
      props.isDirty,
      Boolean(props.previewReadOnly),
    ),
  }
  return renderEditorPanelBody(props, panelState)
}

