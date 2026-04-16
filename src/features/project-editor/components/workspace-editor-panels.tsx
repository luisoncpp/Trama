import { useRef } from 'preact/hooks'
import type { ProjectEditorModel } from '../project-editor-types'
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
}

function PaneEditor({ model, spellcheckEnabled, pane, tagIndex, onTagClick }: PaneEditorProps) {
  const { state, actions } = model
  const paneState = pane === 'secondary' ? state.secondaryPane : state.primaryPane
  const isActive = state.workspaceLayout.activePane === pane
  const onPaneEditorChange = (nextValue: string) => {
    actions.updateEditorValue(nextValue, pane)
  }
  const onPaneSaveNow = () => {
    actions.saveNow(pane)
  }
  const onActivate = () => {
    if (!isActive) {
      void actions.setWorkspaceActivePane(pane)
    }
  }

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
          onSaveNow={onPaneSaveNow}
          onEditorChange={onPaneEditorChange}
          focusModeEnabled={state.workspaceLayout.focusModeEnabled}
          focusScope={state.workspaceLayout.focusScope}
          onInteract={onActivate}
          tagIndex={tagIndex}
          onTagClick={onTagClick}
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
}

function ActiveEditorPanel({ model, spellcheckEnabled, tagIndex, onTagClick }: ActiveEditorPanelProps) {
  const { state, actions } = model

  return (
    <EditorPanel
      selectedPath={state.selectedPath}
      saving={state.saving}
      isDirty={state.isDirty}
      loadingDocument={state.loadingDocument}
      editorValue={state.editorValue}
      spellcheckEnabled={spellcheckEnabled}
      onSaveNow={actions.saveNow}
      onEditorChange={actions.updateEditorValue}
      focusModeEnabled={state.workspaceLayout.focusModeEnabled}
      focusScope={state.workspaceLayout.focusScope}
      tagIndex={tagIndex}
      onTagClick={onTagClick}
    />
  )
}

interface WorkspaceSplitEditorPanelsProps {
  model: ProjectEditorModel
  spellcheckEnabled: boolean
  tagIndex: Record<string, string> | null
  onTagClick: (filePath: string) => void
}

function WorkspaceSplitEditorPanels({ model, spellcheckEnabled, tagIndex, onTagClick }: WorkspaceSplitEditorPanelsProps) {
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
      <PaneEditor model={model} spellcheckEnabled={spellcheckEnabled} pane="primary" tagIndex={tagIndex} onTagClick={onTagClick} />
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
      <PaneEditor model={model} spellcheckEnabled={spellcheckEnabled} pane="secondary" tagIndex={tagIndex} onTagClick={onTagClick} />
    </div>
  )
}

export function WorkspaceEditorPanels({ model, spellcheckEnabled }: LayoutControlsProps) {
  const { tagIndex } = useTagIndex(model.state.rootPath)
  const handleTagClick = (filePath: string) => {
    model.actions.openFileInPane(filePath, 'secondary')
  }

  return model.state.workspaceLayout.mode === 'split'
    ? <WorkspaceSplitEditorPanels model={model} spellcheckEnabled={spellcheckEnabled} tagIndex={tagIndex} onTagClick={handleTagClick} />
    : <ActiveEditorPanel model={model} spellcheckEnabled={spellcheckEnabled} tagIndex={tagIndex} onTagClick={handleTagClick} />
}

export function WorkspaceLayoutPanel({ model, spellcheckEnabled }: LayoutControlsProps) {
  return <WorkspaceEditorPanels model={model} spellcheckEnabled={spellcheckEnabled} />
}
