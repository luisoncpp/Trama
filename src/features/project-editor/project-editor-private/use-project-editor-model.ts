import type { DocumentMeta } from '../../../shared/ipc'
import type {
  EditorSerializationRefs,
  PaneNavigationHistoryStore,
  WorkspaceLayoutState,
} from '../project-editor-types'

export function createEditorSerializationRefs(): EditorSerializationRefs {
  return {
    flush: () => null,
    tagOverlayRecalcRef: { current: false },
    tagOverlayMatchesRef: {
      current: [] as Array<{ tag: string; start: number; end: number; filePath: string }>,
    },
  }
}

export function createNavigationHistoryStore(): PaneNavigationHistoryStore {
  return {
    primary: { entries: [], index: -1 },
    secondary: { entries: [], index: -1 },
  }
}

export function createSaveDocumentProxy(
  saveDocumentNowRef: { current: ((path: string, content: string, meta: DocumentMeta) => Promise<void>) | null },
) {
  return (path: string, content: string, meta: DocumentMeta) =>
    saveDocumentNowRef.current?.(path, content, meta) ?? Promise.resolve()
}

export function buildShortcutsEffectParams(
  actions: {
    toggleWorkspaceLayoutMode: () => void
    setFullscreenEnabled: (enabled: boolean) => Promise<void>
    toggleFocusMode: () => void
    setWorkspaceActivePane: (pane: 'primary' | 'secondary') => Promise<void>
    saveNow: () => Promise<void>
    openPreviousInPaneHistory: () => Promise<void>
    openNextInPaneHistory: () => Promise<void>
    setZoomLevel: (level: number) => void
  },
  isFullscreen: boolean,
  workspaceLayout: WorkspaceLayoutState,
) {
  return {
    onToggleSplitLayout: actions.toggleWorkspaceLayoutMode,
    onToggleFullscreen: () => void actions.setFullscreenEnabled(!isFullscreen),
    onToggleFocusMode: actions.toggleFocusMode,
    onSwitchActivePane: () => {
      if (workspaceLayout.mode !== 'split') return
      actions.setWorkspaceActivePane(
        workspaceLayout.activePane === 'primary' ? 'secondary' : 'primary',
      )
    },
    onSaveNow: () => actions.saveNow(),
    onOpenPreviousHistory: () => void actions.openPreviousInPaneHistory(),
    onOpenNextHistory: () => void actions.openNextInPaneHistory(),
    onEscapePressed: () => {
      if (isFullscreen) {
        void actions.setFullscreenEnabled(false)
      }
      if (workspaceLayout.focusModeEnabled) {
        actions.toggleFocusMode()
      }
    },
    onZoomIn: () => actions.setZoomLevel((workspaceLayout.zoomLevel ?? 1.0) + 0.25),
    onZoomOut: () => actions.setZoomLevel((workspaceLayout.zoomLevel ?? 1.0) - 0.25),
    onZoomReset: () => actions.setZoomLevel(1.0),
  }
}
