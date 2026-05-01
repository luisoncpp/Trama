import { useEffect, useRef } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
import type { EditorSerializationRefs, ProjectEditorModel } from './project-editor-types'
import type { WorkspaceLayoutState } from './project-editor-types'
import { useProjectEditorActions } from './use-project-editor-actions'
import { useProjectEditorAutosaveEffect } from './use-project-editor-autosave-effect'
import { useProjectEditorContextMenuEffect } from './use-project-editor-context-menu-effect'
import { useProjectEditorExternalEventsEffect } from './use-project-editor-external-events-effect'
import { useProjectEditorFullscreenEffect } from './use-project-editor-fullscreen-effect'
import { useProjectEditorCloseEffect } from './use-project-editor-close-effect'
import { useProjectEditorShortcutsEffect } from './use-project-editor-shortcuts-effect'
import { useProjectEditorState } from './use-project-editor-state'
import { useProjectEditorPanePersistence } from './use-project-editor-pane-persistence'

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
  core: ReturnType<typeof useProjectEditorActions>['core'],
  isFullscreen: boolean,
  workspaceLayout: WorkspaceLayoutState,
  rootPath: string,
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
    onRefreshTree: () => { if (rootPath) void core.openProject(rootPath) },
    onEscapePressed: () => {
      if (isFullscreen) {
        void actions.setFullscreenEnabled(false)
      }
      if (workspaceLayout.focusModeEnabled) {
        actions.toggleFocusMode()
      }
    },
  }
}

function useProjectEditorEffects(
  values: ReturnType<typeof useProjectEditorState>['values'],
  setters: ReturnType<typeof useProjectEditorState>['setters'],
  actions: ReturnType<typeof useProjectEditorActions>['actions'],
  core: ReturnType<typeof useProjectEditorActions>['core'],
  autoPickProjectFolderOnStart: boolean,
  panePersistence: ReturnType<typeof useProjectEditorPanePersistence>,
): void {
  useAutoPickProjectFolderEffect(actions.pickProjectFolder, autoPickProjectFolderOnStart, values.apiAvailable, values.rootPath)
  useProjectEditorAutosaveEffect({
    selectedPath: values.selectedPath, isDirty: values.isDirty,
    activePane: values.workspaceLayout.activePane,
    panePersistence,
  })
  useProjectEditorExternalEventsEffect({
    snapshotRootPath: values.snapshot?.rootPath ?? null,
    selectedPath: values.selectedPath, activePane: values.workspaceLayout.activePane,
    isDirty: values.isDirty,
    clearEditor: core.clearEditor, loadDocument: core.loadDocument,
    openProject: core.openProject,
    setExternalConflictPath: setters.setExternalConflictPath,
    setConflictComparisonContent: setters.setConflictComparisonContent,
    setStatusMessage: setters.setStatusMessage,
  })
  useProjectEditorFullscreenEffect({ setIsFullscreen: setters.setIsFullscreen })
  useProjectEditorShortcutsEffect(buildShortcutsEffectParams(actions, core, values.isFullscreen, values.workspaceLayout, values.rootPath))
  useProjectEditorCloseEffect({
    primaryPane: values.primaryPane, secondaryPane: values.secondaryPane,
    panePersistence,
  })
  useProjectEditorContextMenuEffect({
    isFullscreen: values.isFullscreen,
    toggleWorkspaceLayoutMode: actions.toggleWorkspaceLayoutMode,
    setFullscreenEnabled: actions.setFullscreenEnabled,
    toggleFocusMode: actions.toggleFocusMode, setFocusScope: actions.setFocusScope,
    setWorkspaceLayoutRatio: actions.setWorkspaceLayoutRatio,
  })
}

export function useProjectEditor(): ProjectEditorModel {
  const autoPickProjectFolderOnStart = import.meta.env.MODE !== 'test'
  const state = useProjectEditorState()
  const { values, setters } = state

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
  const panePersistence = useProjectEditorPanePersistence({
    values,
    saveDocumentNow: (path, content, meta) => saveDocumentNowRef.current?.(path, content, meta) ?? Promise.resolve(),
    primarySerializationRef,
    secondarySerializationRef,
  })

  const { actions, core } = useProjectEditorActions({
    state,
    panePersistence,
  })
  saveDocumentNowRef.current = core.saveDocumentNow

  useProjectEditorEffects(values, setters, actions, core, autoPickProjectFolderOnStart, panePersistence)

  return {
    state: (({ snapshot, editorMeta, ...state }) => state)(values),
    actions,
    serializationRefs: {
      primary: primarySerializationRef,
      secondary: secondarySerializationRef,
    },
  }
}
