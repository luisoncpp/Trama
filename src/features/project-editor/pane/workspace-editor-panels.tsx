import { useRef } from 'preact/hooks'
import type { ProjectEditorModel, EditorZoomRef } from '../project-editor-types'
import { EditorPanel } from './editor-panel'
import { useTagIndex } from '../use-tag-index'
import { PaneEditor } from './pane-editor'

interface LayoutControlsProps {
  model: ProjectEditorModel
  spellcheckEnabled: boolean
}

function clampRatio(value: number): number {
  return Math.min(0.8, Math.max(0.2, value))
}

interface ActiveEditorPanelProps {
  model: ProjectEditorModel
  spellcheckEnabled: boolean
  tagIndex: Record<string, string> | null
  onTagClick: (filePath: string) => void
  zoomRef: EditorZoomRef
  zoomLevel: number
  onZoomChange: (level: number) => void
}

function ActiveEditorPanel({ model, spellcheckEnabled, tagIndex, onTagClick, zoomRef, zoomLevel, onZoomChange }: ActiveEditorPanelProps) {
  const { state, actions, serializationRefs } = model
  const activePaneState = state.workspaceLayout.activePane === 'secondary' ? state.secondaryPane : state.primaryPane

  const onMarkDirty = () => {
    actions.updateEditorValue(state.editorValue)
  }

  return (
    <EditorPanel
      selectedPath={state.selectedPath}
      saving={state.saving}
      isDirty={state.isDirty}
      reloadVersion={activePaneState.reloadVersion}
      loadingDocument={state.loadingDocument}
      editorValue={state.editorValue}
      spellcheckEnabled={spellcheckEnabled}
      historyBackDisabled={!state.selectedPath}
      onHistoryBack={() => { void actions.openPreviousInPaneHistory() }}
      onSaveNow={actions.saveNow}
      onRevertNow={actions.revertChanges}
      onEditorChange={actions.updateEditorValue}
      focusModeEnabled={state.workspaceLayout.focusModeEnabled}
      focusScope={state.workspaceLayout.focusScope}
      tagIndex={tagIndex}
      onTagClick={onTagClick}
      editorSerializationRef={serializationRefs.primary}
      onMarkDirty={onMarkDirty}
      zoomRef={zoomRef}
      zoomLevel={zoomLevel}
      onZoomChange={onZoomChange}
    />
  )
}

interface WorkspaceSplitEditorPanelsProps {
  model: ProjectEditorModel
  spellcheckEnabled: boolean
  tagIndex: Record<string, string> | null
  onTagClick: (filePath: string) => void
  zoomRef: EditorZoomRef
  zoomLevel: number
  onZoomChange: (level: number) => void
}

function WorkspaceSplitEditorPanels({ model, spellcheckEnabled, tagIndex, onTagClick, zoomRef, zoomLevel, onZoomChange }: WorkspaceSplitEditorPanelsProps) {
  const { state, actions } = model
  const splitRef = useRef<HTMLDivElement | null>(null)

  const updateRatioFromClientX = (clientX: number) => {
    const splitElement = splitRef.current
    if (!splitElement) return
    const bounds = splitElement.getBoundingClientRect()
    if (bounds.width <= 0) return
    actions.setWorkspaceLayoutRatio(clampRatio((clientX - bounds.left) / bounds.width))
  }

  const startResizeDrag = (startClientX: number) => {
    updateRatioFromClientX(startClientX)
    const onMouseMove = (event: MouseEvent) => updateRatioFromClientX(event.clientX)
    const stopDrag = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', stopDrag)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stopDrag)
  }

  return (
    <div class="workspace-split" ref={splitRef} style={{ '--split-ratio': `${Math.round(state.workspaceLayout.ratio * 100)}%` }}>
      <PaneEditor model={model} spellcheckEnabled={spellcheckEnabled} pane="primary" tagIndex={tagIndex} onTagClick={onTagClick} zoomRef={zoomRef} zoomLevel={zoomLevel} onZoomChange={onZoomChange} />
      <div class="workspace-split-divider" role="separator" aria-orientation="vertical" aria-label="Resize panels"
        onMouseDown={(event) => { event.preventDefault(); startResizeDrag(event.clientX) }} />
      <PaneEditor model={model} spellcheckEnabled={spellcheckEnabled} pane="secondary" tagIndex={tagIndex} onTagClick={onTagClick} zoomRef={zoomRef} zoomLevel={zoomLevel} onZoomChange={onZoomChange} />
    </div>
  )
}

export function WorkspaceEditorPanels({ model, spellcheckEnabled }: LayoutControlsProps) {
  const { tagIndex } = useTagIndex(model.state.rootPath)
  const handleTagClick = (filePath: string) => { model.actions.openFileInPane(filePath, 'secondary') }
  const zoomRef = model.zoomRef
  const zoomLevel = model.state.workspaceLayout.zoomLevel
  const onZoomChange = (level: number) => { model.actions.setZoomLevel(level) }

  return model.state.workspaceLayout.mode === 'split'
    ? <WorkspaceSplitEditorPanels model={model} spellcheckEnabled={spellcheckEnabled} tagIndex={tagIndex} onTagClick={handleTagClick}
        zoomRef={zoomRef} zoomLevel={zoomLevel} onZoomChange={onZoomChange} />
    : <ActiveEditorPanel model={model} spellcheckEnabled={spellcheckEnabled} tagIndex={tagIndex} onTagClick={handleTagClick}
        zoomRef={zoomRef} zoomLevel={zoomLevel} onZoomChange={onZoomChange} />
}

export function WorkspaceLayoutPanel({ model, spellcheckEnabled }: LayoutControlsProps) {
  return <WorkspaceEditorPanels model={model} spellcheckEnabled={spellcheckEnabled} />
}
