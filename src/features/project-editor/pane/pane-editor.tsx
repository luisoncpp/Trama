import type { ProjectEditorModel, EditorZoomRef } from '../project-editor-types'
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

export function PaneEditor({ model, spellcheckEnabled, pane, tagIndex, onTagClick, zoomRef, zoomLevel, onZoomChange }: PaneEditorProps) {
  const { state, actions, serializationRefs } = model
  const paneState = pane === 'secondary' ? state.secondaryPane : state.primaryPane
  const isActive = state.workspaceLayout.activePane === pane
  const serializationRef = pane === 'primary' ? serializationRefs.primary : serializationRefs.secondary
  const historyBackDisabled = !paneState.path
  const onMarkDirty = () => { actions.markEditorDirty(pane) }
  const onPaneEditorChange = (nextValue: string) => { actions.updateEditorValue(nextValue, pane) }
  const onPaneHistoryBack = () => { void actions.openPreviousInPaneHistory(pane) }
  const onPaneSaveNow = () => { actions.saveNow(pane) }
  const onPaneRevertNow = () => { actions.revertChanges(pane) }
  const onActivate = () => { if (!isActive) { void actions.setWorkspaceActivePane(pane) } }

  return (
    <section class={`workspace-split-pane ${isActive ? 'is-active' : ''}`} onPointerDownCapture={onActivate}>
      <PaneHeader paneState={paneState} isActive={isActive} />
      <div class="workspace-split-pane__body">
        <EditorPanel
          selectedPath={paneState.path}
          saving={state.saving && isActive}
          isDirty={paneState.isDirty}
          reloadVersion={paneState.reloadVersion}
          loadingDocument={state.loadingDocument && isActive}
          editorValue={paneState.content}
          spellcheckEnabled={spellcheckEnabled}
          historyBackDisabled={historyBackDisabled}
          onHistoryBack={onPaneHistoryBack}
          onSaveNow={onPaneSaveNow}
          onRevertNow={onPaneRevertNow}
          onEditorChange={onPaneEditorChange}
          focusModeEnabled={state.workspaceLayout.focusModeEnabled}
          focusScope={state.workspaceLayout.focusScope}
          onInteract={onActivate}
          tagIndex={tagIndex}
          onTagClick={onTagClick}
          isActive={isActive}
          editorSerializationRef={serializationRef}
          onMarkDirty={onMarkDirty}
          zoomRef={zoomRef}
          zoomLevel={zoomLevel}
          onZoomChange={onZoomChange}
        />
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
