import { useCallback, useMemo, useState } from 'preact/hooks'
import type { DocumentMeta, ProjectSnapshot } from '../../shared/ipc'
import { canSelectFile, resolvePreferredFile } from './project-editor-logic'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import type { ProjectEditorModel } from './project-editor-types'
import { useProjectEditorAutosaveEffect } from './use-project-editor-autosave-effect'
import { useProjectEditorExternalEventsEffect } from './use-project-editor-external-events-effect'

export function useProjectEditor(): ProjectEditorModel {
  const [rootPath, setRootPath] = useState('')
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [editorValue, setEditorValue] = useState('')
  const [editorMeta, setEditorMeta] = useState<DocumentMeta>({})
  const [isDirty, setIsDirty] = useState(false)
  const [loadingProject, setLoadingProject] = useState(false)
  const [loadingDocument, setLoadingDocument] = useState(false)
  const [saving, setSaving] = useState(false)
  const [externalConflictPath, setExternalConflictPath] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>(PROJECT_EDITOR_STRINGS.initialStatus)

  const apiAvailable = Boolean(window.tramaApi?.openProject)
  const visibleFiles = useMemo(() => snapshot?.markdownFiles ?? [], [snapshot])

  const clearEditor = useCallback(() => {
    setSelectedPath(null)
    setEditorValue('')
    setEditorMeta({})
    setIsDirty(false)
  }, [])

  const loadDocument = useCallback(async (filePath: string): Promise<void> => {
    setLoadingDocument(true)

    try {
      const response = await window.tramaApi.readDocument({ path: filePath })
      if (!response.ok) {
        setStatusMessage(`No se pudo leer ${filePath}: ${response.error.message}`)
        return
      }

      setSelectedPath(response.data.path)
      setEditorValue(response.data.content)
      setEditorMeta(response.data.meta)
      setIsDirty(false)
      setStatusMessage(`Documento cargado: ${response.data.path}`)
    } finally {
      setLoadingDocument(false)
    }
  }, [])

  const openProject = useCallback(
    async (projectRoot: string, preferredFilePath?: string): Promise<void> => {
      setLoadingProject(true)
      setStatusMessage(PROJECT_EDITOR_STRINGS.projectOpeningStatus)

      try {
        const response = await window.tramaApi.openProject({ rootPath: projectRoot })
        if (!response.ok) {
          setStatusMessage(`No se pudo abrir el proyecto: ${response.error.message}`)
          return
        }

        setRootPath(response.data.rootPath)
        setSnapshot(response.data)
        setStatusMessage(`Proyecto abierto: ${response.data.rootPath}`)

        const nextFile = resolvePreferredFile(response.data, preferredFilePath)

        if (!nextFile) {
          clearEditor()
          setStatusMessage(PROJECT_EDITOR_STRINGS.projectWithoutMarkdown)
          return
        }

        await loadDocument(nextFile)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido'
        setStatusMessage(`Error al abrir proyecto: ${message}`)
      } finally {
        setLoadingProject(false)
      }
    },
    [clearEditor, loadDocument],
  )

  const saveDocumentNow = useCallback(async (path: string, content: string, meta: DocumentMeta): Promise<void> => {
    setSaving(true)

    try {
      const response = await window.tramaApi.saveDocument({ path, content, meta })
      if (!response.ok) {
        setStatusMessage(`Error guardando ${path}: ${response.error.message}`)
        return
      }

      setIsDirty(false)
      setStatusMessage(`Guardado: ${response.data.path} (${response.data.version})`)
    } finally {
      setSaving(false)
    }
  }, [])

  const pickProjectFolder = useCallback(async (): Promise<void> => {
    const selected = await window.tramaApi.selectProjectFolder()
    if (!selected.ok) {
      setStatusMessage(`No se pudo abrir el selector: ${selected.error.message}`)
      return
    }

    if (!selected.data.rootPath) {
      setStatusMessage(PROJECT_EDITOR_STRINGS.folderSelectionCanceled)
      return
    }

    await openProject(selected.data.rootPath)
  }, [openProject])

  const selectFile = useCallback(
    (filePath: string) => {
      if (!canSelectFile(isDirty, selectedPath, filePath)) {
        setStatusMessage(PROJECT_EDITOR_STRINGS.statusNeedSaveBeforeSwitch)
        return
      }

      void loadDocument(filePath)
    },
    [isDirty, loadDocument, selectedPath],
  )

  const updateEditorValue = useCallback((value: string) => {
    setEditorValue(value)
    setIsDirty(true)
  }, [])

  const saveNow = useCallback(() => {
    if (!selectedPath || saving || !isDirty) {
      return
    }

    void saveDocumentNow(selectedPath, editorValue, editorMeta)
  }, [editorMeta, editorValue, isDirty, saveDocumentNow, saving, selectedPath])

  const resolveConflictReload = useCallback(() => {
    if (externalConflictPath) {
      void loadDocument(externalConflictPath)
    }

    setExternalConflictPath(null)
    setStatusMessage(PROJECT_EDITOR_STRINGS.statusReloadDiscarded)
  }, [externalConflictPath, loadDocument])

  const resolveConflictKeep = useCallback(() => {
    setExternalConflictPath(null)
    setStatusMessage(PROJECT_EDITOR_STRINGS.statusSaveAsCopyHint)
  }, [])

  useProjectEditorAutosaveEffect({
    selectedPath,
    isDirty,
    editorValue,
    editorMeta,
    saveDocumentNow,
  })

  useProjectEditorExternalEventsEffect({
    snapshotRootPath: snapshot?.rootPath ?? null,
    selectedPath,
    isDirty,
    clearEditor,
    loadDocument,
    openProject,
    setExternalConflictPath,
    setStatusMessage,
  })

  return {
    state: {
      apiAvailable,
      rootPath,
      statusMessage,
      externalConflictPath,
      visibleFiles,
      selectedPath,
      editorValue,
      isDirty,
      loadingProject,
      loadingDocument,
      saving,
    },
    actions: {
      pickProjectFolder,
      selectFile,
      updateEditorValue,
      saveNow,
      resolveConflictReload,
      resolveConflictKeep,
    },
  }
}
