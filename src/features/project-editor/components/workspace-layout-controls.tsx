import type { ProjectEditorModel } from '../project-editor-types'

interface LayoutControlsProps {
  model: ProjectEditorModel
}

const FOCUS_SCOPE_OPTIONS = [
  { value: 'line', label: 'Line' },
  { value: 'sentence', label: 'Sentence' },
  { value: 'paragraph', label: 'Paragraph' },
] as const

function clampRatio(value: number): number {
  return Math.min(0.8, Math.max(0.2, value))
}

function FocusScopeControl({ model }: LayoutControlsProps) {
  const { state, actions } = model
  return (
    <>
      <label class="workspace-layout-controls__ratio" for="focus-scope-select">Focus Scope</label>
      <select
        id="focus-scope-select"
        value={state.workspaceLayout.focusScope}
        disabled={!state.workspaceLayout.focusModeEnabled}
        onChange={(event) => {
          const nextScope = (event.currentTarget as HTMLSelectElement).value as 'line' | 'sentence' | 'paragraph'
          actions.setFocusScope(nextScope)
        }}
      >
        {FOCUS_SCOPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </>
  )
}

function SplitRatioControl({ model }: LayoutControlsProps) {
  const { state, actions } = model
  if (state.workspaceLayout.mode !== 'split') {
    return null
  }

  return (
    <>
      <label class="workspace-layout-controls__ratio" for="split-ratio-range">Split Ratio</label>
      <input
        id="split-ratio-range"
        type="range"
        min="20"
        max="80"
        step="1"
        value={Math.round(state.workspaceLayout.ratio * 100)}
        onInput={(event) => {
          const value = Number((event.currentTarget as HTMLInputElement).value)
          actions.setWorkspaceLayoutRatio(clampRatio(value / 100))
        }}
      />
    </>
  )
}

export function WorkspaceLayoutControls({ model }: LayoutControlsProps) {
  const { state, actions } = model
  const isSplit = state.workspaceLayout.mode === 'split'

  return (
    <div class="workspace-layout-controls">
      <button
        type="button"
        class={`editor-button editor-button--secondary editor-button--inline ${isSplit ? 'is-active' : ''}`}
        onClick={actions.toggleWorkspaceLayoutMode}
      >
        {isSplit ? 'Split On' : 'Split Off'}
      </button>
      <button
        type="button"
        class={`editor-button editor-button--secondary editor-button--inline ${state.isFullscreen ? 'is-active' : ''}`}
        onClick={() => {
          void actions.setFullscreenEnabled(!state.isFullscreen)
        }}
      >
        {state.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      </button>
      <button
        type="button"
        class={`editor-button editor-button--secondary editor-button--inline ${state.workspaceLayout.focusModeEnabled ? 'is-active' : ''}`}
        onClick={actions.toggleFocusMode}
      >
        {state.workspaceLayout.focusModeEnabled ? 'Focus On' : 'Focus Off'}
      </button>
      <FocusScopeControl model={model} />
      <SplitRatioControl model={model} />
    </div>
  )
}
