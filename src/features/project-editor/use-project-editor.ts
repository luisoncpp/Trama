import { useEffect, useRef } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
import type {
  EditorSerializationRefs,
  EditorZoomRef,
  ProjectEditorModel,
} from './project-editor-types'
import type { WorkspaceLayoutState } from './project-editor-types'
import { useProjectEditorActions } from './project-editor-private/actions'
import { useProjectEditorContextMenuEffect } from './use-project-editor-context-menu-effect'
import { useProjectEditorExternalEventsEffect, useReloadProjectShortcutEffect } from './use-project-editor-external-events-effect'
import { useProjectEditorFullscreenEffect } from './use-project-editor-fullscreen-effect'
import { useProjectEditorShortcutsEffect } from './use-project-editor-shortcuts-effect'
import { useProjectEditorState } from './project-editor-private/state'
import { usePaneWorkspace, useProjectEditorAutosaveEffect, useProjectEditorCloseEffect } from './pane'
import type { PaneBindings } from './pane'
import {
  buildShortcutsEffectParams,
  createEditorSerializationRefs,
  createNavigationHistoryStore,
  createSaveDocumentProxy,
} from './project-editor-private/use-project-editor-model'

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

function useProjectEditorEffects(
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
    checkExternalChangeMatchesSavedSnapshot: (path: string, externalContent: string) =>
      paneWorkspace.checkExternalChangeMatchesSavedSnapshot(path, externalContent),
  })
  useReloadProjectShortcutEffect(projectState.rootPath, () => { if (projectState.rootPath) void core.openProject(projectState.rootPath) })
  useProjectEditorFullscreenEffect({ setIsFullscreen: setters.setIsFullscreen })
  useProjectEditorShortcutsEffect(buildShortcutsEffectParams(actions, uiState.isFullscreen, layoutState.workspaceLayout))
  useProjectEditorCloseEffect({
    paneWorkspace,
    primaryIsDirty: paneBindings.primaryPane.isDirty,
    secondaryIsDirty: paneBindings.secondaryPane.isDirty,
  })
  useProjectEditorContextMenuEffect({
    isFullscreen: uiState.isFullscreen,
    toggleWorkspaceLayoutMode: actions.toggleWorkspaceLayoutMode,
    openPreviousInPaneHistory: actions.openPreviousInPaneHistory,
    openNextInPaneHistory: actions.openNextInPaneHistory,
    setFullscreenEnabled: actions.setFullscreenEnabled,
    toggleFocusMode: actions.toggleFocusMode, setFocusScope: actions.setFocusScope,
    setWorkspaceLayoutRatio: actions.setWorkspaceLayoutRatio,
  })
}

function usePaneWorkspaceLifecycle(
  paneWorkspace: ReturnType<typeof usePaneWorkspace>,
  lastSavedContentMapRef: { current: Map<string, string> },
  rootPath: string | null,
  workspaceLayout: WorkspaceLayoutState,
): void {
  useEffect(() => {
    return () => paneWorkspace.destroy()
  }, [paneWorkspace])

  useEffect(/* seedPrimaryNavigationHistory */ () => {
    if (workspaceLayout.primaryPath) {
      paneWorkspace.recordPaneNavigation('primary', workspaceLayout.primaryPath)
    }
  }, [paneWorkspace, workspaceLayout.primaryPath] /*Inputs for seedPrimaryNavigationHistory*/)

  useEffect(/* seedSecondaryNavigationHistory */ () => {
    if (workspaceLayout.secondaryPath) {
      paneWorkspace.recordPaneNavigation('secondary', workspaceLayout.secondaryPath)
    }
  }, [paneWorkspace, workspaceLayout.secondaryPath] /*Inputs for seedSecondaryNavigationHistory*/)

  useEffect(() => {
    if (!rootPath) {
      lastSavedContentMapRef.current.clear()
    }
  }, [rootPath])
}

export function useProjectEditor(): ProjectEditorModel {
  const autoPickProjectFolderOnStart = import.meta.env.MODE !== 'test'
  const state = useProjectEditorState()
  const { values, setters, documentState, layoutState, sidebarState, projectState, uiState, paneBindings } = state
  const primarySerializationRef = useRef<EditorSerializationRefs>(createEditorSerializationRefs())
  const secondarySerializationRef = useRef<EditorSerializationRefs>(createEditorSerializationRefs())
  const saveDocumentNowRef = useRef<((path: string, content: string, meta: DocumentMeta) => Promise<void>) | null>(null)
  const lastSavedContentMapRef = useRef(new Map<string, string>())
  const navigationHistoryRef = useRef(createNavigationHistoryStore())

  const zoomRef: EditorZoomRef = { current: layoutState.workspaceLayout.zoomLevel ?? 1.0 }

  const paneWorkspace = usePaneWorkspace(
    layoutState.workspaceLayout,
    paneBindings,
    { primary: primarySerializationRef, secondary: secondarySerializationRef },
    createSaveDocumentProxy(saveDocumentNowRef),
    navigationHistoryRef.current,
    lastSavedContentMapRef.current,
  )

  usePaneWorkspaceLifecycle(
    paneWorkspace,
    lastSavedContentMapRef,
    projectState.rootPath,
    layoutState.workspaceLayout,
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
    zoomRef.current = layoutState.workspaceLayout.zoomLevel ?? 1.0
  }, [layoutState.workspaceLayout.zoomLevel])


  useProjectEditorEffects(uiState, projectState, documentState, layoutState, paneBindings, setters, actions, core, autoPickProjectFolderOnStart, paneWorkspace)

  return {
    state: (({ snapshot, editorMeta, ...state }) => state)(values),
    actions,
    serializationRefs: {
      primary: primarySerializationRef,
      secondary: secondarySerializationRef,
    },
    zoomRef,
  }
}
