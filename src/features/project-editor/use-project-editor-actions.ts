import { useCallback } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
import type { PaneDocumentState, ProjectEditorActions, ProjectEditorUiState, WorkspacePane } from './project-editor-types'
import type { ProjectEditorLayoutState, ProjectEditorPaneState, ProjectEditorProjectState, ProjectEditorSidebarState } from './project-editor-types'
import type { ProjectEditorPanePersistence } from './use-project-editor-pane-persistence'
import { useOpenProject } from './use-project-editor-open-project'
import { useProjectEditorUiActions } from './use-project-editor-ui-actions'
import { hydrateMarkdownImages, stripBase64ImagesFromMarkdown } from '../../shared/markdown-image-placeholder'

interface CoreProjectEditorActions {
  clearEditor: () => void
  loadDocument: (path: string, targetPane: WorkspacePane) => Promise<void>
  openProject: (
    projectRoot: string,
    preferredFilePath?: string,
    preferredPane?: 'primary' | 'secondary',
  ) => Promise<void>
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
}

export interface UseProjectEditorActionsResult {
  actions: ProjectEditorActions
  core: CoreProjectEditorActions
}

export interface UseProjectEditorActionsParams {
  layoutState: ProjectEditorLayoutState
  paneState: ProjectEditorPaneState
  projectState: ProjectEditorProjectState
  uiState: ProjectEditorUiState
  sidebarState: ProjectEditorSidebarState
  setters: {
    setPrimaryPane: (value: PaneDocumentState | ((prev: PaneDocumentState) => PaneDocumentState)) => void
    setSecondaryPane: (value: PaneDocumentState | ((prev: PaneDocumentState) => PaneDocumentState)) => void
    setLoadingDocument: (value: boolean) => void
    setLoadingProject: (value: boolean) => void
    setSaving: (value: boolean) => void
    setStatusMessage: (value: string) => void
    setExternalConflictPath: (value: string | null) => void
    setConflictComparisonContent: (value: string | null) => void
    setWorkspaceLayout: (value: any) => void
    setSidebarPanelCollapsed: (value: boolean) => void
    setSidebarActiveSection: (value: import('./project-editor-types').SidebarSection) => void
    setSidebarPanelWidth: (value: number) => void
  }
  panePersistence: ProjectEditorPanePersistence
}

function useClearEditor(setters: UseProjectEditorActionsParams['setters']): () => void {
  return useCallback(/* clearEditorAction */ () => {
    const emptyPane: PaneDocumentState = { path: null, content: '', meta: {}, isDirty: false }
    setters.setPrimaryPane(emptyPane)
    setters.setSecondaryPane(emptyPane)
    setters.setExternalConflictPath(null)
    setters.setConflictComparisonContent(null)
    setters.setWorkspaceLayout((previous: any) => ({
      ...previous,
      primaryPath: null,
      secondaryPath: null,
      activePane: 'primary',
      mode: 'single',
    }))
  }, [setters] /*Inputs for clearEditorAction*/)
}

function useLoadDocument(setters: UseProjectEditorActionsParams['setters']): (path: string, targetPane: WorkspacePane) => Promise<void> {
  return useCallback(/* loadDocumentAction */ async (filePath: string, targetPane: WorkspacePane): Promise<void> => {
      setters.setLoadingDocument(true)

      try {
        const response = await window.tramaApi.readDocument({ path: filePath })
        if (!response.ok) {
          setters.setStatusMessage(`Could not read ${filePath}: ${response.error.message}`)
          return
        }

        const { markdownWithoutImages } = stripBase64ImagesFromMarkdown(response.data.content, response.data.path)

        const loadedPane: PaneDocumentState = {
          path: response.data.path,
          content: markdownWithoutImages,
          meta: response.data.meta,
          isDirty: false,
        }
        if (targetPane === 'secondary') {
          setters.setSecondaryPane(loadedPane)
        } else {
          setters.setPrimaryPane(loadedPane)
        }
        setters.setStatusMessage(`Loaded document: ${response.data.path}`)
      } finally {
        setters.setLoadingDocument(false)
      }
    },
    [setters] /*Inputs for loadDocumentAction*/)
}

function useSaveDocumentNow(
  setters: UseProjectEditorActionsParams['setters'],
): (path: string, content: string, meta: DocumentMeta) => Promise<void> {
  return useCallback(/* saveDocumentNowAction */ async (path: string, content: string, meta: DocumentMeta): Promise<void> => {
      setters.setSaving(true)

      try {
        const hydratedContent = hydrateMarkdownImages(content, path)
        const response = await window.tramaApi.saveDocument({ path, content: hydratedContent, meta })
        if (!response.ok) {
          setters.setStatusMessage(`Error saving ${path}: ${response.error.message}`)
          return
        }

        const savedPath = response.data.path
        setters.setPrimaryPane((prev) => prev.path === savedPath ? { ...prev, isDirty: false } : prev)
        setters.setSecondaryPane((prev) => prev.path === savedPath ? { ...prev, isDirty: false } : prev)
        setters.setStatusMessage(`Saved: ${response.data.path} (${response.data.version})`)
      } finally {
        setters.setSaving(false)
      }
    },
    [setters] /*Inputs for saveDocumentNowAction*/)
}

export function useProjectEditorActions({
  layoutState,
  paneState,
  projectState,
  uiState,
  sidebarState,
  setters,
  panePersistence,
}: UseProjectEditorActionsParams): UseProjectEditorActionsResult {
  const clearEditor = useClearEditor(setters)
  const loadDocument = useLoadDocument(setters)
  const openProject = useOpenProject(setters, clearEditor, loadDocument)
  const saveDocumentNow = useSaveDocumentNow(setters)
  const actions = useProjectEditorUiActions({
    layoutState,
    paneState,
    projectState,
    uiState,
    sidebarState,
    setters,
    openProject,
    loadDocument,
    panePersistence,
  })

  return {
    actions,
    core: {
      clearEditor,
      loadDocument,
      openProject,
      saveDocumentNow,
    },
  }
}
