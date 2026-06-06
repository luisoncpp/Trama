import { useEffect } from 'preact/hooks'

interface UseProjectEditorShortcutsEffectParams {
  onToggleSplitLayout: () => void
  onToggleFullscreen: () => void
  onToggleFocusMode: () => void
  onSwitchActivePane: () => void
  onSaveNow: () => void
  onOpenPreviousHistory: () => void
  onOpenNextHistory: () => void
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

function handleOpenPreviousHistory(onOpenPreviousHistory: () => void, event: KeyboardEvent) {
  event.preventDefault()
  onOpenPreviousHistory()
}

function handleOpenNextHistory(onOpenNextHistory: () => void, event: KeyboardEvent) {
  event.preventDefault()
  onOpenNextHistory()
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

function handleCommandShortcut(
  params: UseProjectEditorShortcutsEffectParams,
  event: KeyboardEvent,
  isCommandKey: boolean,
): boolean {
  if (isCommandKey && !event.altKey && event.code === 'Period') {
    handleToggleSplitLayout(params.onToggleSplitLayout, event)
    return true
  }

  if (isCommandKey && event.shiftKey && event.code === 'KeyF') {
    handleToggleFullscreen(params.onToggleFullscreen, event)
    return true
  }

  if (isCommandKey && event.shiftKey && event.code === 'KeyM') {
    handleToggleFocusMode(params.onToggleFocusMode, event)
    return true
  }

  if (isCommandKey && event.shiftKey && event.code === 'Tab') {
    handleSwitchPane(params.onSwitchActivePane, event)
    return true
  }

  if (isCommandKey && !event.altKey && !event.shiftKey && event.code === 'KeyS') {
    handleSave(params.onSaveNow, event)
    return true
  }

  return false
}

function handleNavigationAndZoomShortcut(
  params: UseProjectEditorShortcutsEffectParams,
  event: KeyboardEvent,
  isCommandKey: boolean,
): boolean {
  if (event.altKey && !isCommandKey && !event.shiftKey && event.code === 'ArrowLeft') {
    handleOpenPreviousHistory(params.onOpenPreviousHistory, event)
    return true
  }

  if (event.altKey && !isCommandKey && !event.shiftKey && event.code === 'ArrowRight') {
    handleOpenNextHistory(params.onOpenNextHistory, event)
    return true
  }

  if (isCommandKey && !event.altKey && !event.shiftKey && (event.code === 'Equal' || event.key === '+')) {
    handleZoomIn(params.onZoomIn, event)
    return true
  }

  if (isCommandKey && !event.altKey && !event.shiftKey && (event.code === 'Minus' || event.key === '-')) {
    handleZoomOut(params.onZoomOut, event)
    return true
  }

  if (isCommandKey && !event.altKey && !event.shiftKey && event.key === '0') {
    handleZoomReset(params.onZoomReset, event)
    return true
  }

  return false
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

    if (handleCommandShortcut(params, event, isCommandKey)) {
      return
    }

    if (handleNavigationAndZoomShortcut(params, event, isCommandKey)) {
      return
    }
  }
}

// Exported for testing
export { isFormFieldTarget, hasOpenModal, handleCommandShortcut, handleNavigationAndZoomShortcut }

export function useProjectEditorShortcutsEffect(params: UseProjectEditorShortcutsEffectParams): void {
  useEffect(/* registerWorkspaceShortcuts */ () => {
    const onWindowKeyDown = makeKeydownHandler(params)
    window.addEventListener('keydown', onWindowKeyDown)
    return () => window.removeEventListener('keydown', onWindowKeyDown)
  }, [params.onSaveNow, params.onOpenPreviousHistory, params.onOpenNextHistory,
      params.onSwitchActivePane, params.onToggleFocusMode, params.onToggleFullscreen,
      params.onToggleSplitLayout, params.onEscapePressed, params.onZoomIn, params.onZoomOut,
      params.onZoomReset] /*Inputs for registerWorkspaceShortcuts*/)
}
