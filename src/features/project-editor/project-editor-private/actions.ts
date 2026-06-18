import { useCallback, useMemo } from 'preact/hooks'
import type { DocumentMeta } from '../../../shared/ipc'
import { getDocumentContentSession } from '../document-content/document-content-session'
import type {
  ProjectEditorActions,
  ProjectEditorLayoutState,
  ProjectEditorProjectState,
  ProjectEditorSidebarState,
  ProjectEditorUiState,
  WorkspacePane,
} from '../project-editor-types'
import type { OpenProjectOptions } from '../open-project-types'
import type { PaneWorkspace } from '../pane'
import {
  type ProjectEditorActionSetters,
} from './action-group-types'
import {
  useConflictProjectEditorActions,
  useSidebarProjectEditorActions,
  useWorkspaceProjectEditorActions,
} from './action-group-memos'
import { useOpenProject } from './open-project'

interface CoreProjectEditorActions {
  clearEditor: () => void
  loadDocument: (path: string, targetPane: WorkspacePane) => Promise<void>
  openProject: (projectRoot: string, options?: OpenProjectOptions) => Promise<void>
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
}

function useClearEditor(
  setters: ProjectEditorActionSetters,
  paneWorkspace: PaneWorkspace,
): () => void {
  return useCallback(/* clearEditor */ () => {
    paneWorkspace.clearNavigationHistory()
    paneWorkspace.clearPanes()
    setters.setExternalConflictPath(null)
    setters.setConflictComparisonContent(null)
    setters.setWorkspaceLayout((previous: any) => ({
      ...previous,
      primaryPath: null,
      secondaryPath: null,
      activePane: 'primary',
      mode: 'single',
    }))
  }, [setters, paneWorkspace] /*Inputs for clearEditor*/)
}

function useLoadDocument(
  setters: ProjectEditorActionSetters,
  paneWorkspace: PaneWorkspace,
): (path: string, targetPane: WorkspacePane) => Promise<void> {
  return useCallback(
    /* loadDocument */ async (filePath: string, targetPane: WorkspacePane): Promise<void> => {
      setters.setLoadingDocument(true)
      try {
        const response = await window.tramaApi.readDocument({ path: filePath })
        if (!response.ok) {
          setters.setStatusMessage(`Could not read ${filePath}: ${response.error.message}`)
          return
        }
        const session = getDocumentContentSession(response.data.path)
        const editorInternalContent = session.forEditorLoad(response.data.content)
        paneWorkspace.loadPaneDocument(
          targetPane,
          response.data.path,
          editorInternalContent,
          response.data.meta,
        )
        setters.setStatusMessage(`Loaded document: ${response.data.path}`)
      } finally {
        setters.setLoadingDocument(false)
      }
    },
    [setters, paneWorkspace] /*Inputs for loadDocument*/,
  )
}

function useSaveDocumentNow(
  setters: ProjectEditorActionSetters,
): (path: string, content: string, meta: DocumentMeta) => Promise<void> {
  return useCallback(
    /* saveDocumentNow */ async (path: string, content: string, meta: DocumentMeta): Promise<void> => {
      setters.setSaving(true)
      try {
        const session = getDocumentContentSession(path)
        const portableContent = await session.forIpcSave(content)
        const response = await window.tramaApi.saveDocument({ path, content: portableContent, meta })
        setters.setStatusMessage(
          response.ok
            ? `Saved: ${response.data.path} (${response.data.version})`
            : `Error saving ${path}: ${response.error.message}`,
        )
      } finally {
        setters.setSaving(false)
      }
    },
    [setters] /*Inputs for saveDocumentNow*/,
  )
}

function usePaneNavigationCallbacks(paneWorkspace: PaneWorkspace) {
  const reset = useCallback(
    /* resetPaneNavigationHistory */ () => paneWorkspace.clearNavigationHistory(),
    [paneWorkspace] /*Inputs for resetPaneNavigationHistory*/,
  )
  const seed = useCallback(
    /* seedPaneNavigationHistory */ (pane: WorkspacePane, path: string) => paneWorkspace.recordPaneNavigation(pane, path),
    [paneWorkspace] /*Inputs for seedPaneNavigationHistory*/,
  )
  return { reset, seed }
}

export function useProjectEditorActions(options: {
  layoutState: ProjectEditorLayoutState
  projectState: ProjectEditorProjectState
  uiState: ProjectEditorUiState
  sidebarState: ProjectEditorSidebarState
  setters: ProjectEditorActionSetters & {
    setLastProjectRootPath: (value: string) => void
    clearLastProjectRootPath: () => void
  }
  paneWorkspace: PaneWorkspace
}) {
  const { layoutState, projectState, uiState, sidebarState, setters, paneWorkspace } = options
  const clearEditor = useClearEditor(setters, paneWorkspace)
  const loadDocument = useLoadDocument(setters, paneWorkspace)
  const { reset, seed } = usePaneNavigationCallbacks(paneWorkspace)
  const openProject = useOpenProject(setters, clearEditor, loadDocument, reset, seed)
  const saveDocumentNow = useSaveDocumentNow(setters)
  const actionParams = {
    layoutState,
    projectState,
    uiState,
    sidebarState,
    setters,
    paneWorkspace,
    loadDocument,
    openProject,
    clearEditor,
  }
  const sidebarActions = useSidebarProjectEditorActions(actionParams)
  const workspaceActions = useWorkspaceProjectEditorActions(actionParams)
  const conflictActions = useConflictProjectEditorActions(actionParams)

  const actions = useMemo<ProjectEditorActions>(
    /* buildProjectEditorActions */ () => ({
      ...sidebarActions,
      ...workspaceActions,
      ...conflictActions,
      openProject,
    }),
    [sidebarActions, workspaceActions, conflictActions, openProject] /*Inputs for buildProjectEditorActions*/,
  )

  return { actions, core: { clearEditor, loadDocument, openProject, saveDocumentNow } as CoreProjectEditorActions }
}
