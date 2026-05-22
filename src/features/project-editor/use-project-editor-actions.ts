import { useCallback, useMemo } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
import type { ProjectEditorActions, ProjectEditorUiState, WorkspacePane } from './project-editor-types'
import type { ProjectEditorLayoutState, ProjectEditorProjectState, ProjectEditorSidebarState } from './project-editor-types'
import type { OpenProjectOptions } from './use-project-editor-actions-types'
import type { PaneWorkspace } from './pane'
import { useOpenProject } from './use-project-editor-open-project'
import {
  hydrateBrokenImageComments,
  hydrateMarkdownImages,
  stripBase64ImagesFromMarkdown,
} from '../../shared/markdown-image-placeholder'
import { ensureMarkdownEmbeddedImagesArePng } from './project-editor-image-save'
import { buildActions } from './use-project-editor-actions-builder'

interface CoreProjectEditorActions {
  clearEditor: () => void
  loadDocument: (path: string, targetPane: WorkspacePane) => Promise<void>
  openProject: (projectRoot: string, options?: OpenProjectOptions) => Promise<void>
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
}

export interface UseProjectEditorActionsResult {
  actions: ProjectEditorActions
  core: CoreProjectEditorActions
}

export interface UseProjectEditorActionsParams {
  layoutState: ProjectEditorLayoutState
  projectState: ProjectEditorProjectState
  uiState: ProjectEditorUiState
  sidebarState: ProjectEditorSidebarState
  setters: {
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
    setIsFullscreen?: (value: boolean) => void
  }
  paneWorkspace: PaneWorkspace
}

function useClearEditor(
  setters: UseProjectEditorActionsParams['setters'],
  paneWorkspace: PaneWorkspace,
): () => void {
  return useCallback(() => {
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
  }, [setters, paneWorkspace])
}

function useLoadDocument(
  setters: UseProjectEditorActionsParams['setters'],
  paneWorkspace: PaneWorkspace,
): (path: string, targetPane: WorkspacePane) => Promise<void> {
  return useCallback(async (filePath: string, targetPane: WorkspacePane): Promise<void> => {
    setters.setLoadingDocument(true)

    try {
      const response = await window.tramaApi.readDocument({ path: filePath })
      if (!response.ok) {
        setters.setStatusMessage(`Could not read ${filePath}: ${response.error.message}`)
        return
      }

      const { markdownWithoutImages } = stripBase64ImagesFromMarkdown(response.data.content, response.data.path)

      paneWorkspace.loadPaneDocument(targetPane, response.data.path, markdownWithoutImages, response.data.meta)
      setters.setStatusMessage(`Loaded document: ${response.data.path}`)
    } finally {
      setters.setLoadingDocument(false)
    }
  }, [setters, paneWorkspace])
}

function useSaveDocumentNow(
  setters: UseProjectEditorActionsParams['setters'],
): (path: string, content: string, meta: DocumentMeta) => Promise<void> {
  return useCallback(async (path: string, content: string, meta: DocumentMeta): Promise<void> => {
    setters.setSaving(true)

    try {
      const hydratedContent = hydrateBrokenImageComments(hydrateMarkdownImages(content, path))
      const pngNormalizedContent = await ensureMarkdownEmbeddedImagesArePng(hydratedContent)
      const response = await window.tramaApi.saveDocument({ path, content: pngNormalizedContent, meta })
      if (!response.ok) {
        setters.setStatusMessage(`Error saving ${path}: ${response.error.message}`)
        return
      }

      setters.setStatusMessage(`Saved: ${response.data.path} (${response.data.version})`)
    } finally {
      setters.setSaving(false)
    }
  }, [setters])
}

export function useProjectEditorActions({
  layoutState,
  projectState,
  uiState,
  sidebarState,
  setters,
  paneWorkspace,
}: UseProjectEditorActionsParams): UseProjectEditorActionsResult {
  const clearEditor = useClearEditor(setters, paneWorkspace)
  const loadDocument = useLoadDocument(setters, paneWorkspace)
  const openProject = useOpenProject(setters, clearEditor, loadDocument)
  const saveDocumentNow = useSaveDocumentNow(setters)

  const actions = useMemo<ProjectEditorActions>(
    () => buildActions({
      layoutState, projectState, uiState, sidebarState,
      setters, paneWorkspace, loadDocument, openProject,
    }),
    [
      layoutState, projectState, uiState, sidebarState,
      setters, paneWorkspace, loadDocument, openProject, saveDocumentNow, clearEditor,
    ],
  )

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
