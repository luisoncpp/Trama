import { useEffect, useRef } from 'preact/hooks'
import type { ProjectEditorModel } from './project-editor-types'
import { useProjectEditorActions } from './use-project-editor-actions'
import { useProjectEditorAutosaveEffect } from './use-project-editor-autosave-effect'
import { useProjectEditorContextMenuEffect } from './use-project-editor-context-menu-effect'
import { useProjectEditorExternalEventsEffect } from './use-project-editor-external-events-effect'
import { useProjectEditorFullscreenEffect } from './use-project-editor-fullscreen-effect'
import { useProjectEditorShortcutsEffect } from './use-project-editor-shortcuts-effect'
import { useProjectEditorState } from './use-project-editor-state'

function useProjectEditorEffects(
  values: ReturnType<typeof useProjectEditorState>['values'],
  setters: ReturnType<typeof useProjectEditorState>['setters'],
  actions: ReturnType<typeof useProjectEditorActions>['actions'],
  core: ReturnType<typeof useProjectEditorActions>['core'],
  autoPickProjectFolderOnStart: boolean,
): void {
  const hasRequestedProjectFolderRef = useRef(false)

  useEffect(/* autoPickProjectFolderOnStart */ () => {
    if (!autoPickProjectFolderOnStart || hasRequestedProjectFolderRef.current) {
      return
    }

    if (!values.apiAvailable || values.rootPath) {
      return
    }

    hasRequestedProjectFolderRef.current = true
    void actions.pickProjectFolder()
  }, [actions.pickProjectFolder, autoPickProjectFolderOnStart, values.apiAvailable, values.rootPath] /*Inputs for autoPickProjectFolderOnStart*/)

  useProjectEditorAutosaveEffect({
    selectedPath: values.selectedPath,
    isDirty: values.isDirty,
    editorValue: values.editorValue,
    editorMeta: values.editorMeta,
    saveDocumentNow: core.saveDocumentNow,
  })

  useProjectEditorExternalEventsEffect({
    snapshotRootPath: values.snapshot?.rootPath ?? null,
    selectedPath: values.selectedPath,
    activePane: values.workspaceLayout.activePane,
    isDirty: values.isDirty,
    clearEditor: core.clearEditor,
    loadDocument: core.loadDocument,
    openProject: core.openProject,
    setExternalConflictPath: setters.setExternalConflictPath,
    setConflictComparisonContent: setters.setConflictComparisonContent,
    setStatusMessage: setters.setStatusMessage,
  })

  useProjectEditorFullscreenEffect({
    setIsFullscreen: setters.setIsFullscreen,
  })

  useProjectEditorShortcutsEffect({
    onToggleSplitLayout: actions.toggleWorkspaceLayoutMode,
    onToggleFullscreen: () => void actions.setFullscreenEnabled(!values.isFullscreen),
    onToggleFocusMode: actions.toggleFocusMode,
    onSwitchActivePane: () => {
      if (values.workspaceLayout.mode !== 'split') {
        return
      }

      const nextPane = values.workspaceLayout.activePane === 'primary' ? 'secondary' : 'primary'
      actions.setWorkspaceActivePane(nextPane)
    },
  })

  useProjectEditorContextMenuEffect({
    isFullscreen: values.isFullscreen,
    toggleWorkspaceLayoutMode: actions.toggleWorkspaceLayoutMode,
    setFullscreenEnabled: actions.setFullscreenEnabled,
    toggleFocusMode: actions.toggleFocusMode,
    setFocusScope: actions.setFocusScope,
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
  const { actions, core } = useProjectEditorActions(state)
  useProjectEditorEffects(values, setters, actions, core, autoPickProjectFolderOnStart)

  return {
    state: buildProjectEditorModelState(values),
    actions,
  }
}
