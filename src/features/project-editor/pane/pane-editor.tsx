/* eslint-disable max-lines-per-function */
import type { ProjectEditorModel, EditorZoomRef, WorkspacePane } from '../project-editor-types'
import { EditorPanel } from './editor-panel'
import { toPaneTitle } from './pane-title'

interface PaneEditorProps {
  model: ProjectEditorModel
  spellcheckEnabled: boolean
  pane: 'primary' | 'secondary'
  tagIndex: Record<string, string> | null
  onTagClick: (filePath: string) => void
  zoomRef: EditorZoomRef
  zoomLevel: number
  onZoomChange: (level: number) => void
}

function buildPaneEditorPanelProps(props: PaneEditorProps) {
  const { model, spellcheckEnabled, pane, tagIndex, onTagClick, zoomRef, zoomLevel, onZoomChange } = props
  const { state, actions, serializationRefs } = model
  const paneState = pane === 'secondary' ? state.secondaryPane : state.primaryPane
  const isActive = state.workspaceLayout.activePane === pane
  return {
    paneState,
    isActive,
    panelProps: {
      selectedPath: paneState.path,
      projectRoot: state.rootPath,
      pane,
      layoutMode: state.workspaceLayout.mode,
      gitAvailable: state.gitHistory.gitAvailable,
      saving: state.saving && isActive,
      isDirty: paneState.isDirty,
      reloadVersion: paneState.reloadVersion,
      previewReadOnly: paneState.revisionRail.previewReadOnly,
      previewVersion: paneState.revisionRail.previewVersion,
      loadingDocument: state.loadingDocument && isActive,
      editorValue: paneState.revisionRail.previewReadOnly ? (paneState.revisionRail.previewValue ?? paneState.content) : paneState.content,
      editorMeta: paneState.meta,
      spellcheckEnabled,
      historyBackDisabled: !paneState.path,
      onHistoryBack: () => { void actions.openPreviousInPaneHistory(pane) },
      onSaveNow: () => { void actions.saveNow(pane) },
      onRevertNow: () => { actions.revertChanges(pane) },
      onCloseRevisions: () => { actions.closeDocumentRevisions(pane) },
      onOpenRevisionsCurrent: () => actions.selectRevisionCurrent(pane),
      onOpenRevision: (commitSha: string) => { void actions.selectDocumentRevision(commitSha, pane) },
      onLoadMoreRevisions: () => { void actions.loadMoreDocumentRevisions(pane) },
      onRequestLoadRevision: () => actions.requestLoadDocumentRevision(pane),
      onCancelLoadRevision: () => actions.cancelLoadDocumentRevision(pane),
      onConfirmLoadRevision: () => { void actions.confirmLoadDocumentRevision(pane) },
      onEditorChange: (nextValue: string) => { actions.updateEditorValue(nextValue, pane) },
      onEditorMetaChange: (nextMeta: typeof paneState.meta) => { actions.updateEditorMeta(nextMeta, pane) },
      focusModeEnabled: state.workspaceLayout.focusModeEnabled,
      focusScope: state.workspaceLayout.focusScope,
      onInteract: () => { if (!isActive) { void actions.setWorkspaceActivePane(pane) } },
      tagIndex,
      onTagClick,
      onMapMarkerNavigate: (filePath: string, targetPane: WorkspacePane) => { actions.openFileInPane(filePath, targetPane) },
      isActive,
      editorSerializationRef: pane === 'primary' ? serializationRefs.primary : serializationRefs.secondary,
      onMarkDirty: () => { actions.markEditorDirty(pane) },
      zoomRef,
      zoomLevel,
      onZoomChange,
      revisionRail: paneState.revisionRail,
    },
  }
}

export function PaneEditor({ model, spellcheckEnabled, pane, tagIndex, onTagClick, zoomRef, zoomLevel, onZoomChange }: PaneEditorProps) {
  const { paneState, isActive, panelProps } = buildPaneEditorPanelProps({ model, spellcheckEnabled, pane, tagIndex, onTagClick, zoomRef, zoomLevel, onZoomChange })

  return (
    <section class={`workspace-split-pane ${isActive ? 'is-active' : ''}`} onPointerDownCapture={panelProps.onInteract}>
      <PaneHeader paneState={paneState} isActive={isActive} />
      <div class="workspace-split-pane__body">
        <EditorPanel {...panelProps} />
      </div>
    </section>
  )
}

function PaneHeader({ paneState, isActive }: { paneState: { path: string | null; isDirty: boolean }; isActive: boolean }) {
  return (
    <header class="workspace-split-pane__header">
      <span class="workspace-split-pane__meta" title={paneState.path ?? undefined}>
        {paneState.isDirty && <span class="workspace-split-pane__dirty-badge" title="Unsaved changes"></span>}
        <span class="workspace-split-pane__label">{toPaneTitle(paneState.path)}</span>
        <span class={`workspace-split-pane__path-inline ${paneState.path ? '' : 'is-empty'}`}>
          {paneState.path ?? 'Click a file to assign it to this pane.'}
        </span>
      </span>
      <span class={`workspace-split-pane__active-indicator ${isActive ? 'is-active' : ''}`}>{isActive ? 'Active' : 'Inactive'}</span>
    </header>
  )
}

