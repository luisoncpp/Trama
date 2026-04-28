import { useCallback } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
import type { EditorSerializationRefs, PaneDocumentState, ProjectEditorActions, WorkspacePane } from './project-editor-types'
import type { UseProjectEditorStateResult } from './use-project-editor-state'
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

export interface SerializationRefsForActions {
  primarySerializationRef: { current: EditorSerializationRefs }
  secondarySerializationRef: { current: EditorSerializationRefs }
}

function useClearEditor(setters: UseProjectEditorStateResult['setters']): () => void {
  return useCallback(/* clearEditorAction */ () => {
    const emptyPane: PaneDocumentState = { path: null, content: '', meta: {}, isDirty: false }
    setters.setPrimaryPane(emptyPane)
    setters.setSecondaryPane(emptyPane)
    setters.setExternalConflictPath(null)
    setters.setConflictComparisonContent(null)
    setters.setWorkspaceLayout((previous) => ({
      ...previous,
      primaryPath: null,
      secondaryPath: null,
      activePane: 'primary',
      mode: 'single',
    }))
  }, [setters] /*Inputs for clearEditorAction*/)
}

function useLoadDocument(setters: UseProjectEditorStateResult['setters']): (path: string, targetPane: WorkspacePane) => Promise<void> {
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
  setters: UseProjectEditorStateResult['setters'],
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

export function useProjectEditorActions(state: UseProjectEditorStateResult, refs: SerializationRefsForActions): UseProjectEditorActionsResult {
  const { values, setters } = state
  const clearEditor = useClearEditor(setters)
  const loadDocument = useLoadDocument(setters)
  const openProject = useOpenProject(setters, clearEditor, loadDocument)
  const saveDocumentNow = useSaveDocumentNow(setters)
  const actions = useProjectEditorUiActions({
    values,
    setters,
    openProject,
    loadDocument,
    saveDocumentNow,
    primarySerializationRef: refs.primarySerializationRef,
    secondarySerializationRef: refs.secondarySerializationRef,
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
