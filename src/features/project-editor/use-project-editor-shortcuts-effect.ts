import { useEffect } from 'preact/hooks'

interface UseProjectEditorShortcutsEffectParams {
  onToggleSplitLayout: () => void
  onToggleFullscreen: () => void
  onToggleFocusMode: () => void
  onSwitchActivePane: () => void
  onSaveNow: () => void
  onEscapePressed: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
}

function isFormFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  const tagName = target.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}

function hasOpenModal(): boolean {
  return document.querySelector('[aria-modal="true"]') !== null
}

function handleZoomIn(onZoomIn: () => void, event: KeyboardEvent) {
  event.preventDefault()
  onZoomIn()
}

function handleZoomOut(onZoomOut: () => void, event: KeyboardEvent) {
  event.preventDefault()
  onZoomOut()
}

function handleZoomReset(onZoomReset: () => void, event: KeyboardEvent) {
  event.preventDefault()
  onZoomReset()
}

function handleSave(onSaveNow: () => void, event: KeyboardEvent) {
  event.preventDefault()
  onSaveNow()
}

function handleSwitchPane(onSwitchActivePane: () => void, event: KeyboardEvent) {
  event.preventDefault()
  onSwitchActivePane()
}

function handleToggleFocusMode(onToggleFocusMode: () => void, event: KeyboardEvent) {
  event.preventDefault()
  onToggleFocusMode()
}

function handleToggleFullscreen(onToggleFullscreen: () => void, event: KeyboardEvent) {
  event.preventDefault()
  onToggleFullscreen()
}

function handleToggleSplitLayout(onToggleSplitLayout: () => void, event: KeyboardEvent) {
  event.preventDefault()
  onToggleSplitLayout()
}

function makeKeydownHandler(params: UseProjectEditorShortcutsEffectParams) {
  return (event: KeyboardEvent) => {
    if (isFormFieldTarget(event.target)) return

    if (event.key === 'Escape' && !hasOpenModal()) {
      event.preventDefault()
      params.onEscapePressed()
      return
    }

    const isCommandKey = event.ctrlKey || event.metaKey

    if (isCommandKey && !event.altKey && event.code === 'Period') {
      handleToggleSplitLayout(params.onToggleSplitLayout, event)
      return
    }

    if (isCommandKey && event.shiftKey && event.code === 'KeyF') {
      handleToggleFullscreen(params.onToggleFullscreen, event)
      return
    }

    if (isCommandKey && event.shiftKey && event.code === 'KeyM') {
      handleToggleFocusMode(params.onToggleFocusMode, event)
      return
    }

    if (isCommandKey && event.shiftKey && event.code === 'Tab') {
      handleSwitchPane(params.onSwitchActivePane, event)
      return
    }

    if (isCommandKey && !event.altKey && !event.shiftKey && event.code === 'KeyS') {
      handleSave(params.onSaveNow, event)
      return
    }

    if (isCommandKey && !event.altKey && !event.shiftKey && (event.code === 'Equal' || event.key === '+')) {
      handleZoomIn(params.onZoomIn, event)
      return
    }

    if (isCommandKey && !event.altKey && !event.shiftKey && (event.code === 'Minus' || event.key === '-')) {
      handleZoomOut(params.onZoomOut, event)
      return
    }

    if (isCommandKey && !event.altKey && !event.shiftKey && event.key === '0') {
      handleZoomReset(params.onZoomReset, event)
      return
    }
  }
}

export function useProjectEditorShortcutsEffect(params: UseProjectEditorShortcutsEffectParams): void {
  useEffect(/* registerWorkspaceShortcuts */ () => {
    const onWindowKeyDown = makeKeydownHandler(params)
    window.addEventListener('keydown', onWindowKeyDown)
    return () => window.removeEventListener('keydown', onWindowKeyDown)
  }, [params.onSaveNow, params.onSwitchActivePane, params.onToggleFocusMode, params.onToggleFullscreen,
      params.onToggleSplitLayout, params.onEscapePressed, params.onZoomIn, params.onZoomOut,
      params.onZoomReset] /*Inputs for registerWorkspaceShortcuts*/)
}
