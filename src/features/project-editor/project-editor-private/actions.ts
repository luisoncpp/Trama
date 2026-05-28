import { useCallback, useMemo } from 'preact/hooks'
import type { DocumentMeta } from '../../../shared/ipc'
import {
  hydrateBrokenImageComments,
  hydrateMarkdownImages,
  stripBase64ImagesFromMarkdown,
} from '../../../shared/markdown-image-placeholder'
import { ensureMarkdownEmbeddedImagesArePng } from '../project-editor-image-save'
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
        const { markdownWithoutImages } = stripBase64ImagesFromMarkdown(
          response.data.content,
          response.data.path,
        )
        paneWorkspace.loadPaneDocument(
          targetPane,
          response.data.path,
          markdownWithoutImages,
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
        const hydratedContent = hydrateBrokenImageComments(hydrateMarkdownImages(content, path))
        const pngNormalizedContent = await ensureMarkdownEmbeddedImagesArePng(hydratedContent)
        const response = await window.tramaApi.saveDocument({ path, content: pngNormalizedContent, meta })
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

export function useProjectEditorActions({
  layoutState,
  projectState,
  uiState,
  sidebarState,
  setters,
  paneWorkspace,
}: {
  layoutState: ProjectEditorLayoutState
  projectState: ProjectEditorProjectState
  uiState: ProjectEditorUiState
  sidebarState: ProjectEditorSidebarState
  setters: ProjectEditorActionSetters & { setLastProjectRootPath: (value: string) => void }
  paneWorkspace: PaneWorkspace
}) {
  const clearEditor = useClearEditor(setters, paneWorkspace)
  const loadDocument = useLoadDocument(setters, paneWorkspace)
  const resetPaneNavigationHistory = useCallback(
    /* resetPaneNavigationHistory */ () => paneWorkspace.clearNavigationHistory(),
    [paneWorkspace] /*Inputs for resetPaneNavigationHistory*/,
  )
  const seedPaneNavigationHistory = useCallback(
    /* seedPaneNavigationHistory */ (pane: WorkspacePane, path: string) => paneWorkspace.recordPaneNavigation(pane, path),
    [paneWorkspace] /*Inputs for seedPaneNavigationHistory*/,
  )
  const openProject = useOpenProject(
    setters,
    clearEditor,
    loadDocument,
    resetPaneNavigationHistory,
    seedPaneNavigationHistory,
  )
  const saveDocumentNow = useSaveDocumentNow(setters)
  const actionParams = { layoutState, projectState, uiState, sidebarState, setters, paneWorkspace, loadDocument, openProject }
  const sidebarActions = useSidebarProjectEditorActions(actionParams)
  const workspaceActions = useWorkspaceProjectEditorActions(actionParams)
  const conflictActions = useConflictProjectEditorActions(actionParams)

  const actions = useMemo<ProjectEditorActions>(
    /* buildProjectEditorActions */ () => ({
      ...sidebarActions,
      ...workspaceActions,
      ...conflictActions,
    }),
    [sidebarActions, workspaceActions, conflictActions] /*Inputs for buildProjectEditorActions*/,
  )

  return { actions, core: { clearEditor, loadDocument, openProject, saveDocumentNow } as CoreProjectEditorActions }
}
