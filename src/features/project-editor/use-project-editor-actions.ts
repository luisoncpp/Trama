import { useCallback } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
import { resolvePreferredFile } from './project-editor-logic'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import type { ProjectEditorActions } from './project-editor-types'
import type { UseProjectEditorStateResult } from './use-project-editor-state'
import { useProjectEditorUiActions } from './use-project-editor-ui-actions'

interface CoreProjectEditorActions {
  clearEditor: () => void
  loadDocument: (path: string) => Promise<void>
  openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
}

export interface UseProjectEditorActionsResult {
  actions: ProjectEditorActions
  core: CoreProjectEditorActions
}

function useClearEditor(setters: UseProjectEditorStateResult['setters']): () => void {
  return useCallback(() => {
    setters.setSelectedPath(null)
    setters.setEditorValue('')
    setters.setEditorMeta({})
    setters.setIsDirty(false)
  }, [setters])
}

function useLoadDocument(setters: UseProjectEditorStateResult['setters']): (path: string) => Promise<void> {
  return useCallback(
    async (filePath: string): Promise<void> => {
      setters.setLoadingDocument(true)

      try {
        const response = await window.tramaApi.readDocument({ path: filePath })
        if (!response.ok) {
          setters.setStatusMessage(`No se pudo leer ${filePath}: ${response.error.message}`)
          return
        }

        setters.setSelectedPath(response.data.path)
        setters.setEditorValue(response.data.content)
        setters.setEditorMeta(response.data.meta)
        setters.setIsDirty(false)
        setters.setStatusMessage(`Documento cargado: ${response.data.path}`)
      } finally {
        setters.setLoadingDocument(false)
      }
    },
    [setters],
  )
}

function useOpenProject(
  setters: UseProjectEditorStateResult['setters'],
  clearEditor: () => void,
  loadDocument: (path: string) => Promise<void>,
): (projectRoot: string, preferredFilePath?: string) => Promise<void> {
  return useCallback(
    async (projectRoot: string, preferredFilePath?: string): Promise<void> => {
      setters.setLoadingProject(true)
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.projectOpeningStatus)

      try {
        const response = await window.tramaApi.openProject({ rootPath: projectRoot })
        if (!response.ok) {
          setters.setStatusMessage(`No se pudo abrir el proyecto: ${response.error.message}`)
          return
        }

        setters.setRootPath(response.data.rootPath)
        setters.setSnapshot(response.data)
        setters.setStatusMessage(`Proyecto abierto: ${response.data.rootPath}`)

        const nextFile = resolvePreferredFile(response.data, preferredFilePath)
        if (!nextFile) {
          clearEditor()
          setters.setStatusMessage(PROJECT_EDITOR_STRINGS.projectWithoutMarkdown)
          return
        }

        await loadDocument(nextFile)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido'
        setters.setStatusMessage(`Error al abrir proyecto: ${message}`)
      } finally {
        setters.setLoadingProject(false)
      }
    },
    [clearEditor, loadDocument, setters],
  )
}

function useSaveDocumentNow(
  setters: UseProjectEditorStateResult['setters'],
): (path: string, content: string, meta: DocumentMeta) => Promise<void> {
  return useCallback(
    async (path: string, content: string, meta: DocumentMeta): Promise<void> => {
      setters.setSaving(true)

      try {
        const response = await window.tramaApi.saveDocument({ path, content, meta })
        if (!response.ok) {
          setters.setStatusMessage(`Error guardando ${path}: ${response.error.message}`)
          return
        }

        setters.setIsDirty(false)
        setters.setStatusMessage(`Guardado: ${response.data.path} (${response.data.version})`)
      } finally {
        setters.setSaving(false)
      }
    },
    [setters],
  )
}

export function useProjectEditorActions(state: UseProjectEditorStateResult): UseProjectEditorActionsResult {
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
