import { useEffect, useMemo, useRef } from 'preact/hooks'
import { useProjectEditorActions } from './project-editor-private/actions'
import { buildShortcutsEffectParams } from './project-editor-private/use-project-editor-model'
import { useProjectEditorState } from './project-editor-private/state'
import { usePaneWorkspace, useProjectEditorAutosaveEffect, useProjectEditorCloseEffect } from './pane'
import type { PaneBindings } from './pane'
import type { EditorZoomRef } from './project-editor-types'
import { restoreLastProjectOrPickFolder } from './startup-project-open'
import { syncGitHistoryState } from './git-history-actions'
import { useProjectEditorContextMenuEffect } from './use-project-editor-context-menu-effect'
import { useProjectEditorExternalEventsEffect, useReloadProjectShortcutEffect } from './use-project-editor-external-events-effect'
import { useProjectEditorFullscreenEffect } from './use-project-editor-fullscreen-effect'
import { useProjectEditorShortcutsEffect } from './use-project-editor-shortcuts-effect'

function useAutoPickProjectFolderEffect(
  openProject: (projectRoot: string) => Promise<void>,
  pickProjectFolder: () => Promise<void>,
  clearLastProjectRootPath: () => void,
  autoPickProjectFolderOnStart: boolean,
  apiAvailable: boolean,
  rootPath: string | null,
  lastProjectRootPath: string | null,
): void {
  const hasRequestedProjectFolderRef = useRef(false)

  useEffect(/* autoPickProjectFolderOnStartup */ () => {
    if (!autoPickProjectFolderOnStart || hasRequestedProjectFolderRef.current) return
    if (!apiAvailable || rootPath) return
    hasRequestedProjectFolderRef.current = true

    const restoreOrPickProjectFolder = async () => {
      await restoreLastProjectOrPickFolder({
        lastProjectRootPath,
        openProject,
        pickProjectFolder,
        clearLastProjectRootPath,
        validateProjectFolder: async (candidateRootPath: string) => {
          const validation = await window.tramaApi.validateProjectFolder({ rootPath: candidateRootPath })
          return validation.ok && validation.data.valid
        },
      })
    }

    void restoreOrPickProjectFolder()
  }, [openProject, pickProjectFolder, clearLastProjectRootPath, autoPickProjectFolderOnStart, apiAvailable, rootPath, lastProjectRootPath] /*Inputs for autoPickProjectFolderOnStartup*/)
}

function useProjectEditorStartupEffects(
  uiState: ReturnType<typeof useProjectEditorState>['uiState'],
  projectState: ReturnType<typeof useProjectEditorState>['projectState'],
  documentState: ReturnType<typeof useProjectEditorState>['documentState'],
  layoutState: ReturnType<typeof useProjectEditorState>['layoutState'],
  paneBindings: PaneBindings,
  setters: ReturnType<typeof useProjectEditorState>['setters'],
  actions: ReturnType<typeof useProjectEditorActions>['actions'],
  core: ReturnType<typeof useProjectEditorActions>['core'],
  autoPickProjectFolderOnStart: boolean,
  paneWorkspace: ReturnType<typeof usePaneWorkspace>,
  lastProjectRootPath: string | null,
  clearLastProjectRootPath: () => void,
): void {
  useAutoPickProjectFolderEffect(
    core.openProject,
    actions.pickProjectFolder,
    clearLastProjectRootPath,
    autoPickProjectFolderOnStart,
    uiState.apiAvailable,
    projectState.rootPath,
    lastProjectRootPath,
  )
  useProjectEditorAutosaveEffect({
    selectedPath: documentState.selectedPath,
    isDirty: documentState.isDirty,
    activePane: layoutState.workspaceLayout.activePane,
    paneWorkspace,
  })
  useProjectEditorCloseEffect({
    paneWorkspace,
    primaryIsDirty: paneBindings.primaryPane.isDirty,
    secondaryIsDirty: paneBindings.secondaryPane.isDirty,
  })
  useEffect(/* syncGitHistoryOnProjectRoot */ () => {
    void syncGitHistoryState({ projectState, setters })
  }, [projectState, setters] /*Inputs for syncGitHistoryOnProjectRoot*/)
}

function useProjectEditorWindowEffects(
  uiState: ReturnType<typeof useProjectEditorState>['uiState'],
  projectState: ReturnType<typeof useProjectEditorState>['projectState'],
  documentState: ReturnType<typeof useProjectEditorState>['documentState'],
  layoutState: ReturnType<typeof useProjectEditorState>['layoutState'],
  setters: ReturnType<typeof useProjectEditorState>['setters'],
  actions: ReturnType<typeof useProjectEditorActions>['actions'],
  core: ReturnType<typeof useProjectEditorActions>['core'],
  paneWorkspace: ReturnType<typeof usePaneWorkspace>,
): void {
  useProjectEditorExternalEventsEffect({
    snapshotRootPath: projectState.snapshot?.rootPath ?? null,
    selectedPath: documentState.selectedPath,
    activePane: layoutState.workspaceLayout.activePane,
    isDirty: documentState.isDirty,
    clearEditor: core.clearEditor,
    loadDocument: core.loadDocument,
    openProject: core.openProject,
    setExternalConflictPath: setters.setExternalConflictPath,
    setConflictComparisonContent: setters.setConflictComparisonContent,
    setStatusMessage: setters.setStatusMessage,
    checkExternalChangeMatchesSavedSnapshot: (path: string, externalContent: string) =>
      paneWorkspace.checkExternalChangeMatchesSavedSnapshot(path, externalContent),
  })
  useReloadProjectShortcutEffect(projectState.rootPath, () => {
    if (projectState.rootPath) void core.openProject(projectState.rootPath)
  })
  useProjectEditorFullscreenEffect({ setIsFullscreen: setters.setIsFullscreen })
  useProjectEditorShortcutsEffect(
    buildShortcutsEffectParams(actions, uiState.isFullscreen, layoutState.workspaceLayout),
  )
  useProjectEditorContextMenuEffect({
    isFullscreen: uiState.isFullscreen,
    gitAvailable: uiState.gitHistory.gitAvailable,
    toggleWorkspaceLayoutMode: actions.toggleWorkspaceLayoutMode,
    openPreviousInPaneHistory: actions.openPreviousInPaneHistory,
    openNextInPaneHistory: actions.openNextInPaneHistory,
    setFullscreenEnabled: actions.setFullscreenEnabled,
    toggleFocusMode: actions.toggleFocusMode,
    setFocusScope: actions.setFocusScope,
    setWorkspaceLayoutRatio: actions.setWorkspaceLayoutRatio,
    toggleDocumentRevisions: actions.toggleDocumentRevisions,
  })
}

export function useProjectEditorEffects(
  uiState: ReturnType<typeof useProjectEditorState>['uiState'],
  projectState: ReturnType<typeof useProjectEditorState>['projectState'],
  documentState: ReturnType<typeof useProjectEditorState>['documentState'],
  layoutState: ReturnType<typeof useProjectEditorState>['layoutState'],
  paneBindings: PaneBindings,
  setters: ReturnType<typeof useProjectEditorState>['setters'],
  actions: ReturnType<typeof useProjectEditorActions>['actions'],
  core: ReturnType<typeof useProjectEditorActions>['core'],
  autoPickProjectFolderOnStart: boolean,
  paneWorkspace: ReturnType<typeof usePaneWorkspace>,
  lastProjectRootPath: string | null,
  clearLastProjectRootPath: () => void,
): void {
  useProjectEditorStartupEffects(
    uiState,
    projectState,
    documentState,
    layoutState,
    paneBindings,
    setters,
    actions,
    core,
    autoPickProjectFolderOnStart,
    paneWorkspace,
    lastProjectRootPath,
    clearLastProjectRootPath,
  )
  useProjectEditorWindowEffects(
    uiState,
    projectState,
    documentState,
    layoutState,
    setters,
    actions,
    core,
    paneWorkspace,
  )
}

export function usePaneWorkspaceLifecycle(
  paneWorkspace: ReturnType<typeof usePaneWorkspace>,
  lastSavedContentMapRef: { current: Map<string, string> },
  rootPath: string | null,
): void {
  useEffect(/* destroyPaneWorkspaceOnUnmount */ () => {
    return () => paneWorkspace.destroy()
  }, [paneWorkspace] /*Inputs for destroyPaneWorkspaceOnUnmount*/)

  useEffect(/* clearSavedSnapshotMapWhenProjectCloses */ () => {
    if (!rootPath) {
      lastSavedContentMapRef.current.clear()
    }
  }, [rootPath] /*Inputs for clearSavedSnapshotMapWhenProjectCloses*/)
}

export function useProjectEditorActionSetters(
  setters: ReturnType<typeof useProjectEditorState>['setters'],
  setLastProjectRootPath: (value: string) => void,
) {
  return useMemo(
    /* buildActionSetters */ () => ({ ...setters, setLastProjectRootPath }),
    [setters, setLastProjectRootPath] /*Inputs for buildActionSetters*/,
  )
}

export function useZoomRefSync(zoomRef: EditorZoomRef, zoomLevel: number): void {
  useEffect(/* syncZoomRef */ () => {
    zoomRef.current = zoomLevel
  }, [zoomLevel] /*Inputs for syncZoomRef*/)
}
