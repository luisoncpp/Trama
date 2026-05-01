import { useCallback } from 'preact/hooks'
import { buildConflictCopyPath } from './project-editor-logic'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import type { ProjectEditorActions } from './project-editor-types'
import type {
  ProjectEditorDocumentState,
  ProjectEditorLayoutState,
  ProjectEditorProjectState,
  ProjectEditorUiState,
} from './project-editor-types'

export function useResolveConflictReloadAction({
  documentState,
  layoutState,
  uiState,
  setters,
  loadDocument,
}: {
  documentState: ProjectEditorDocumentState
  layoutState: ProjectEditorLayoutState
  uiState: ProjectEditorUiState
  setters: {
    setExternalConflictPath: (value: string | null) => void
    setConflictComparisonContent: (value: string | null) => void
    setStatusMessage: (value: string) => void
  }
  loadDocument: (path: string, pane: 'primary' | 'secondary') => Promise<void>
}): ProjectEditorActions['resolveConflictReload'] {
  return useCallback(/* resolveConflictReloadAction */ () => {
    if (uiState.externalConflictPath) {
      void loadDocument(uiState.externalConflictPath, layoutState.workspaceLayout.activePane)
    }

    setters.setExternalConflictPath(null)
    setters.setConflictComparisonContent(null)
    setters.setStatusMessage(PROJECT_EDITOR_STRINGS.statusReloadDiscarded)
  }, [loadDocument, setters, uiState.externalConflictPath, layoutState.workspaceLayout.activePane] /*Inputs for resolveConflictReloadAction*/)
}

export function useResolveConflictKeepAction(
  setters: {
    setExternalConflictPath: (value: string | null) => void
    setConflictComparisonContent: (value: string | null) => void
    setStatusMessage: (value: string) => void
  },
): ProjectEditorActions['resolveConflictKeep'] {
  return useCallback(/* resolveConflictKeepAction */ () => {
    setters.setExternalConflictPath(null)
    setters.setConflictComparisonContent(null)
    setters.setStatusMessage(PROJECT_EDITOR_STRINGS.statusSaveAsCopyHint)
  }, [setters] /*Inputs for resolveConflictKeepAction*/)
}

export function useResolveConflictSaveAsCopyAction({
  documentState,
  projectState,
  setters,
  openProject,
  layoutState,
}: {
  documentState: ProjectEditorDocumentState
  projectState: ProjectEditorProjectState
  layoutState: ProjectEditorLayoutState
  setters: {
    setStatusMessage: (value: string) => void
    setExternalConflictPath: (value: string | null) => void
    setConflictComparisonContent: (value: string | null) => void
  }
  openProject: (projectRoot: string, preferredFilePath?: string, preferredPane?: 'primary' | 'secondary') => Promise<void>
}): ProjectEditorActions['resolveConflictSaveAsCopy'] {
  return useCallback(/* resolveConflictSaveAsCopyAction */ () => {
    if (!documentState.selectedPath || !projectState.rootPath) {
      return
    }

    const copyPath = buildConflictCopyPath(documentState.selectedPath, projectState.visibleFiles)
    void (async () => {
      const response = await window.tramaApi.saveDocument({
        path: copyPath,
        content: documentState.editorValue,
        meta: documentState.editorMeta,
      })

      if (!response.ok) {
        setters.setStatusMessage(`${PROJECT_EDITOR_STRINGS.statusSaveAsCopyFailed} ${response.error.message}`)
        return
      }

      setters.setExternalConflictPath(null)
      setters.setConflictComparisonContent(null)
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.statusSaveAsCopyCreated)
      await openProject(projectState.rootPath, response.data.path, layoutState.workspaceLayout.activePane)
    })()
  }, [
    openProject,
    setters,
    documentState.editorMeta,
    documentState.editorValue,
    projectState.rootPath,
    documentState.selectedPath,
    projectState.visibleFiles,
    layoutState.workspaceLayout.activePane,
  ] /*Inputs for resolveConflictSaveAsCopyAction*/)
}

export function useResolveConflictCompareAction({
  uiState,
  setters,
}: {
  uiState: ProjectEditorUiState
  setters: {
    setStatusMessage: (value: string) => void
    setConflictComparisonContent: (value: string | null) => void
  }
}): ProjectEditorActions['resolveConflictCompare'] {
  return useCallback(/* resolveConflictCompareAction */ () => {
    const conflictPath = uiState.externalConflictPath
    if (!conflictPath) {
      return
    }

    void (async () => {
      const response = await window.tramaApi.readDocument({ path: conflictPath })
      if (!response.ok) {
        setters.setStatusMessage(`${PROJECT_EDITOR_STRINGS.statusCompareFailed} ${response.error.message}`)
        return
      }

      setters.setConflictComparisonContent(response.data.content)
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.statusCompareReady)
    })()
  }, [setters, uiState.externalConflictPath] /*Inputs for resolveConflictCompareAction*/)
}

export function useCloseConflictCompareAction(
  setters: {
    setConflictComparisonContent: (value: string | null) => void
  },
): ProjectEditorActions['closeConflictCompare'] {
  return useCallback(/* closeConflictCompareAction */ () => {
    setters.setConflictComparisonContent(null)
  }, [setters] /*Inputs for closeConflictCompareAction*/)
}
