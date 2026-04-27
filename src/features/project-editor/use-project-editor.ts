import { useEffect, useRef } from 'preact/hooks'
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

function useAutoPickProjectFolderEffect(
  pickProjectFolder: () => Promise<void>,
  autoPickProjectFolderOnStart: boolean,
  apiAvailable: boolean,
  rootPath: string | null,
): void {
  const hasRequestedProjectFolderRef = useRef(false)
  useEffect(() => {
    if (!autoPickProjectFolderOnStart || hasRequestedProjectFolderRef.current) return
    if (!apiAvailable || rootPath) return
    hasRequestedProjectFolderRef.current = true
    void pickProjectFolder()
  }, [pickProjectFolder, autoPickProjectFolderOnStart, apiAvailable, rootPath])
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
  }
}

function useProjectEditorEffects(
  values: ReturnType<typeof useProjectEditorState>['values'],
  setters: ReturnType<typeof useProjectEditorState>['setters'],
  actions: ReturnType<typeof useProjectEditorActions>['actions'],
  core: ReturnType<typeof useProjectEditorActions>['core'],
  autoPickProjectFolderOnStart: boolean,
  primarySerializationRef: { current: EditorSerializationRefs },
  secondarySerializationRef: { current: EditorSerializationRefs },
): void {
  useAutoPickProjectFolderEffect(actions.pickProjectFolder, autoPickProjectFolderOnStart, values.apiAvailable, values.rootPath)
  useProjectEditorAutosaveEffect({
    selectedPath: values.selectedPath, isDirty: values.isDirty,
    editorValue: values.editorValue, editorMeta: values.editorMeta,
    saveDocumentNow: core.saveDocumentNow,
    activePane: values.workspaceLayout.activePane,
    primarySerializationRef, secondarySerializationRef,
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
  useProjectEditorShortcutsEffect(buildShortcutsEffectParams(actions, values.isFullscreen, values.workspaceLayout))
  useProjectEditorCloseEffect({
    primaryPane: values.primaryPane, secondaryPane: values.secondaryPane,
    saveDocumentNow: core.saveDocumentNow,
    primarySerializationRef, secondarySerializationRef,
  })
  useProjectEditorContextMenuEffect({
    isFullscreen: values.isFullscreen,
    toggleWorkspaceLayoutMode: actions.toggleWorkspaceLayoutMode,
    setFullscreenEnabled: actions.setFullscreenEnabled,
    toggleFocusMode: actions.toggleFocusMode, setFocusScope: actions.setFocusScope,
    setWorkspaceLayoutRatio: actions.setWorkspaceLayoutRatio,
  })
}

function buildProjectEditorModelState(values: ReturnType<typeof useProjectEditorState>['values']): ProjectEditorModel['state'] {
  return {
    apiAvailable: values.apiAvailable,
    rootPath: values.rootPath,
    statusMessage: values.statusMessage,
    sidebarActiveSection: values.sidebarActiveSection,
    sidebarPanelCollapsed: values.sidebarPanelCollapsed,
    sidebarPanelWidth: values.sidebarPanelWidth,
    workspaceLayout: values.workspaceLayout,
    externalConflictPath: values.externalConflictPath,
    conflictComparisonContent: values.conflictComparisonContent,
    visibleFiles: values.visibleFiles,
    corkboardOrder: values.corkboardOrder,
    primaryPane: values.primaryPane,
    secondaryPane: values.secondaryPane,
    selectedPath: values.selectedPath,
    editorValue: values.editorValue,
    isDirty: values.isDirty,
    loadingProject: values.loadingProject,
    loadingDocument: values.loadingDocument,
    saving: values.saving,
    isFullscreen: values.isFullscreen,
  }
}

export function useProjectEditor(): ProjectEditorModel {
  const autoPickProjectFolderOnStart = import.meta.env.MODE !== 'test'
  const state = useProjectEditorState()
  const { values, setters } = state

  const primarySerializationRef = useRef<EditorSerializationRefs>({ flush: () => null })
  const secondarySerializationRef = useRef<EditorSerializationRefs>({ flush: () => null })

  const { actions, core } = useProjectEditorActions(state, {
    primarySerializationRef,
    secondarySerializationRef,
  })
  useProjectEditorEffects(values, setters, actions, core, autoPickProjectFolderOnStart, primarySerializationRef, secondarySerializationRef)

  return {
    state: buildProjectEditorModelState(values),
    actions,
    serializationRefs: {
      primary: primarySerializationRef,
      secondary: secondarySerializationRef,
    },
  }
}
