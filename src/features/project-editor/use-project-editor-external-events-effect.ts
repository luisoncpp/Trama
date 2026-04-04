import { useEffect } from 'preact/hooks'
import { shouldRefreshTreeOnExternalEvent } from './project-editor-logic'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'

interface UseProjectEditorExternalEventsEffectParams {
  snapshotRootPath: string | null
  selectedPath: string | null
  isDirty: boolean
  clearEditor: () => void
  loadDocument: (path: string) => Promise<void>
  openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
  setExternalConflictPath: (path: string | null) => void
  setStatusMessage: (message: string) => void
}

export function useProjectEditorExternalEventsEffect({
  snapshotRootPath,
  selectedPath,
  isDirty,
  clearEditor,
  loadDocument,
  openProject,
  setExternalConflictPath,
  setStatusMessage,
}: UseProjectEditorExternalEventsEffectParams): void {
  useEffect(() => {
    if (!window.tramaApi?.onExternalFileEvent || !snapshotRootPath) {
      return
    }

    const unsubscribe = window.tramaApi.onExternalFileEvent((event) => {
      if (event.path === selectedPath) {
        if (event.event === 'unlink') {
          if (isDirty) {
            setExternalConflictPath(event.path)
            setStatusMessage(`El archivo activo fue eliminado externamente: ${event.path}.`)
            return
          }

          clearEditor()
          void openProject(snapshotRootPath)
          setStatusMessage(`El archivo activo fue eliminado externamente: ${event.path}`)
          return
        }

        if (isDirty) {
          setExternalConflictPath(event.path)
          setStatusMessage(`Cambio externo detectado en ${event.path}.`)
          return
        }

        void loadDocument(event.path)
        setStatusMessage(`Recargado automaticamente tras cambio externo: ${event.path}`)
        return
      }

      if (shouldRefreshTreeOnExternalEvent(event.event)) {
        if (isDirty) {
          setStatusMessage(PROJECT_EDITOR_STRINGS.statusNeedSaveBeforeRefresh)
          return
        }

        void openProject(snapshotRootPath, selectedPath ?? undefined)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [
    clearEditor,
    isDirty,
    loadDocument,
    openProject,
    selectedPath,
    setExternalConflictPath,
    setStatusMessage,
    snapshotRootPath,
  ])
}
