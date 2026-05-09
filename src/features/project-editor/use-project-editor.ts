import { useEffect, useRef } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
import type { EditorSerializationRefs, ProjectEditorModel } from './project-editor-types'
import type { WorkspaceLayoutState } from './project-editor-types'
import { useProjectEditorActions } from './use-project-editor-actions'
import { useProjectEditorContextMenuEffect } from './use-project-editor-context-menu-effect'
import { useProjectEditorExternalEventsEffect, useReloadProjectShortcutEffect } from './use-project-editor-external-events-effect'
import { useProjectEditorFullscreenEffect } from './use-project-editor-fullscreen-effect'
import { useProjectEditorShortcutsEffect } from './use-project-editor-shortcuts-effect'
import { useProjectEditorState } from './use-project-editor-state'
import { usePaneWorkspace, useProjectEditorAutosaveEffect, useProjectEditorCloseEffect } from './pane'

function useAutoPickProjectFolderEffect(
  pickProjectFolder: () => Promise<void>,
  autoPickProjectFolderOnStart: boolean,
  apiAvailable: boolean,
  rootPath: string | null,
): void {
  const hasRequestedProjectFolderRef = useRef(false)
  useEffect(/* autoPickProjectFolderOnStartup */ () => {
    if (!autoPickProjectFolderOnStart || hasRequestedProjectFolderRef.current) return
    if (!apiAvailable || rootPath) return
    hasRequestedProjectFolderRef.current = true
    void pickProjectFolder()
  }, [pickProjectFolder, autoPickProjectFolderOnStart, apiAvailable, rootPath] /*Inputs for autoPickProjectFolderOnStartup*/)
}

function buildShortcutsEffectParams(
  actions: ReturnType<typeof useProjectEditorActions>['actions'],
  isFullscreen: boolean,
  workspaceLayout: WorkspaceLayoutState,
) {
  return {
    onToggleSplitLayout: actions.toggleWorkspaceLayoutMode,
    onToggleFullscreen: () => void actions.setFullscreenEnabled(!isFullscreen),
    onToggleFocusMode: actions.toggleFocusMode,
    onSwitchActivePane: () => {
      if (workspaceLayout.mode !== 'split') return
      actions.setWorkspaceActivePane(workspaceLayout.activePane === 'primary' ? 'secondary' : 'primary')
    },
    onSaveNow: () => actions.saveNow(),
    onEscapePressed: () => {
      if (isFullscreen) {
        void actions.setFullscreenEnabled(false)
      }
      if (workspaceLayout.focusModeEnabled) {
        actions.toggleFocusMode()
      }
    },
    onZoomIn: () => {
      const current = workspaceLayout.zoomLevel ?? 1.0
      actions.setZoomLevel(current + 0.1)
    },
    onZoomOut: () => {
      const current = workspaceLayout.zoomLevel ?? 1.0
      actions.setZoomLevel(current - 0.1)
    },
    onZoomReset: () => {
      actions.setZoomLevel(1.0)
    }
  }
}

function useProjectEditorEffects(
  uiState: ReturnType<typeof useProjectEditorState>['uiState'],
  projectState: ReturnType<typeof useProjectEditorState>['projectState'],
  documentState: ReturnType<typeof useProjectEditorState>['documentState'],
  layoutState: ReturnType<typeof useProjectEditorState>['layoutState'],
  setters: ReturnType<typeof useProjectEditorState>['setters'],
  actions: ReturnType<typeof useProjectEditorActions>['actions'],
  core: ReturnType<typeof useProjectEditorActions>['core'],
  autoPickProjectFolderOnStart: boolean,
  paneWorkspace: ReturnType<typeof usePaneWorkspace>,
): void {
  useAutoPickProjectFolderEffect(actions.pickProjectFolder, autoPickProjectFolderOnStart, uiState.apiAvailable, projectState.rootPath)
  useProjectEditorAutosaveEffect({
    selectedPath: documentState.selectedPath,
    isDirty: documentState.isDirty,
    activePane: layoutState.workspaceLayout.activePane,
    paneWorkspace,
  })
  useProjectEditorExternalEventsEffect({
    snapshotRootPath: projectState.snapshot?.rootPath ?? null,
    selectedPath: documentState.selectedPath, activePane: layoutState.workspaceLayout.activePane,
    isDirty: documentState.isDirty,
    clearEditor: core.clearEditor, loadDocument: core.loadDocument,
    openProject: core.openProject,
    setExternalConflictPath: setters.setExternalConflictPath,
    setConflictComparisonContent: setters.setConflictComparisonContent,
    setStatusMessage: setters.setStatusMessage,
  })
  useReloadProjectShortcutEffect(projectState.rootPath, () => { if (projectState.rootPath) void core.openProject(projectState.rootPath) })
  useProjectEditorFullscreenEffect({ setIsFullscreen: setters.setIsFullscreen })
  useProjectEditorShortcutsEffect(buildShortcutsEffectParams(actions, uiState.isFullscreen, layoutState.workspaceLayout))
  useProjectEditorCloseEffect({
    paneWorkspace,
  })
  useProjectEditorContextMenuEffect({
    isFullscreen: uiState.isFullscreen,
    toggleWorkspaceLayoutMode: actions.toggleWorkspaceLayoutMode,
    setFullscreenEnabled: actions.setFullscreenEnabled,
    toggleFocusMode: actions.toggleFocusMode, setFocusScope: actions.setFocusScope,
    setWorkspaceLayoutRatio: actions.setWorkspaceLayoutRatio,
  })
}

export function useProjectEditor(): ProjectEditorModel {
  const autoPickProjectFolderOnStart = import.meta.env.MODE !== 'test'
  const state = useProjectEditorState()
  const { values, setters, documentState, layoutState, sidebarState, projectState, uiState, paneBindings } = state

  const primarySerializationRef = useRef<EditorSerializationRefs>({
    flush: () => null,
    tagOverlayRecalcRef: { current: false },
    tagOverlayMatchesRef: { current: [] as Array<{ tag: string; start: number; end: number; filePath: string }> },
  })
  const secondarySerializationRef = useRef<EditorSerializationRefs>({
    flush: () => null,
    tagOverlayRecalcRef: { current: false },
    tagOverlayMatchesRef: { current: [] as Array<{ tag: string; start: number; end: number; filePath: string }> },
  })

  const saveDocumentNowRef = useRef<((path: string, content: string, meta: DocumentMeta) => Promise<void>) | null>(null)

  const paneWorkspace = usePaneWorkspace(
    layoutState.workspaceLayout,
    paneBindings,
    { primary: primarySerializationRef, secondary: secondarySerializationRef },
    (path, content, meta) => saveDocumentNowRef.current?.(path, content, meta) ?? Promise.resolve(),
  )

  const { actions, core } = useProjectEditorActions({
    layoutState,
    projectState,
    uiState,
    sidebarState,
    setters,
    paneWorkspace,
  })
  saveDocumentNowRef.current = core.saveDocumentNow

  useEffect(() => {
    return () => paneWorkspace.destroy()
  }, [paneWorkspace])

  useProjectEditorEffects(uiState, projectState, documentState, layoutState, setters, actions, core, autoPickProjectFolderOnStart, paneWorkspace)

  return {
    state: (({ snapshot, editorMeta, ...state }) => state)(values),
    actions,
    serializationRefs: {
      primary: primarySerializationRef,
      secondary: secondarySerializationRef,
    },
  }
}