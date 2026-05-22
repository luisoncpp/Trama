import { useRef } from 'preact/hooks'
import type { ProjectEditorModel, EditorZoomRef } from '../project-editor-types'
import { EditorPanel } from './editor-panel'
import { useTagIndex } from '../use-tag-index'

interface LayoutControlsProps {
  model: ProjectEditorModel
  spellcheckEnabled: boolean
}

function clampRatio(value: number): number {
  return Math.min(0.8, Math.max(0.2, value))
}

function toPaneTitle(path: string | null): string {
  if (!path) {
    return 'No file selected'
  }

  const normalized = path.replace(/\\/g, '/')
  const segments = normalized.split('/')
  return segments[segments.length - 1] ?? normalized
}

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

function PaneEditor({ model, spellcheckEnabled, pane, tagIndex, onTagClick, zoomRef, zoomLevel, onZoomChange }: PaneEditorProps) {
  const { state, actions, serializationRefs } = model
  const paneState = pane === 'secondary' ? state.secondaryPane : state.primaryPane
  const isActive = state.workspaceLayout.activePane === pane
  const serializationRef = pane === 'primary' ? serializationRefs.primary : serializationRefs.secondary
  const historyBackDisabled = !paneState.path
  const onMarkDirty = () => { actions.updateEditorValue(paneState.content, pane) }
  const onPaneEditorChange = (nextValue: string) => { actions.updateEditorValue(nextValue, pane) }
  const onPaneHistoryBack = () => { void actions.openPreviousInPaneHistory(pane) }
  const onPaneSaveNow = () => { actions.saveNow(pane) }
  const onPaneRevertNow = () => { actions.revertChanges(pane) }
  const onActivate = () => { if (!isActive) { void actions.setWorkspaceActivePane(pane) } }

  return (
    <section class={`workspace-split-pane ${isActive ? 'is-active' : ''}`} onPointerDownCapture={onActivate}>
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
      <div class="workspace-split-pane__body">
        <EditorPanel
          selectedPath={paneState.path}
          saving={state.saving && isActive}
          isDirty={paneState.isDirty}
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

  const onMarkDirty = () => {
    actions.updateEditorValue(state.editorValue)
  }

  return (
    <EditorPanel
      selectedPath={state.selectedPath}
      saving={state.saving}
      isDirty={state.isDirty}
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
    if (!splitElement) {
      return
    }

    const bounds = splitElement.getBoundingClientRect()
    if (bounds.width <= 0) {
      return
    }

    const nextRatio = clampRatio((clientX - bounds.left) / bounds.width)
    actions.setWorkspaceLayoutRatio(nextRatio)
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
      <div
        class="workspace-split-divider"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panels"
        onMouseDown={(event) => {
          event.preventDefault()
          startResizeDrag(event.clientX)
        }}
      />
      <PaneEditor model={model} spellcheckEnabled={spellcheckEnabled} pane="secondary" tagIndex={tagIndex} onTagClick={onTagClick} zoomRef={zoomRef} zoomLevel={zoomLevel} onZoomChange={onZoomChange} />
    </div>
  )
}

export function WorkspaceEditorPanels({ model, spellcheckEnabled }: LayoutControlsProps) {
  const { tagIndex } = useTagIndex(model.state.rootPath)
  const handleTagClick = (filePath: string) => {
    model.actions.openFileInPane(filePath, 'secondary')
  }
  const zoomRef = model.zoomRef
  const zoomLevel = model.state.workspaceLayout.zoomLevel
  const onZoomChange = (level: number) => {
    model.actions.setZoomLevel(level)
  }

  return model.state.workspaceLayout.mode === 'split'
    ? <WorkspaceSplitEditorPanels
        model={model}
        spellcheckEnabled={spellcheckEnabled}
        tagIndex={tagIndex}
        onTagClick={handleTagClick}
        zoomRef={zoomRef}
        zoomLevel={zoomLevel}
        onZoomChange={onZoomChange}
      />
    : <ActiveEditorPanel
        model={model}
        spellcheckEnabled={spellcheckEnabled}
        tagIndex={tagIndex}
        onTagClick={handleTagClick}
        zoomRef={zoomRef}
        zoomLevel={zoomLevel}
        onZoomChange={onZoomChange}
      />
}

export function WorkspaceLayoutPanel({ model, spellcheckEnabled }: LayoutControlsProps) {
  return <WorkspaceEditorPanels model={model} spellcheckEnabled={spellcheckEnabled} />
}
