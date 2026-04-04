import { useEffect } from 'preact/hooks'
import type { ExternalFileEvent } from '../../shared/ipc'
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
  setConflictComparisonContent: (value: string | null) => void
  setStatusMessage: (message: string) => void
}

interface HandleExternalEventParams {
  event: ExternalFileEvent
  selectedPath: string | null
  snapshotRootPath: string
  isDirty: boolean
  clearEditor: () => void
  loadDocument: (path: string) => Promise<void>
  openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
  setExternalConflictPath: (path: string | null) => void
  setConflictComparisonContent: (value: string | null) => void
  setStatusMessage: (message: string) => void
}

function handleExternalEvent({
  event,
  selectedPath,
  snapshotRootPath,
  isDirty,
  clearEditor,
  loadDocument,
  openProject,
  setExternalConflictPath,
  setConflictComparisonContent,
  setStatusMessage,
}: HandleExternalEventParams): void {
  if (event.path === selectedPath) {
    if (event.event === 'unlink') {
      if (isDirty) {
        setExternalConflictPath(event.path)
        setConflictComparisonContent(null)
        setStatusMessage(`The active file was removed externally: ${event.path}.`)
        return
      }

      clearEditor()
      setConflictComparisonContent(null)
      void openProject(snapshotRootPath)
      setStatusMessage(`The active file was removed externally: ${event.path}`)
      return
    }

    if (isDirty) {
      setExternalConflictPath(event.path)
      setConflictComparisonContent(null)
      setStatusMessage(`External change detected in ${event.path}.`)
      return
    }

    setConflictComparisonContent(null)
    void loadDocument(event.path)
    setStatusMessage(`Automatically reloaded after external change: ${event.path}`)
    return
  }

  if (!shouldRefreshTreeOnExternalEvent(event.event)) {
    return
  }

  if (isDirty) {
    setStatusMessage(PROJECT_EDITOR_STRINGS.statusNeedSaveBeforeRefresh)
    return
  }

  void openProject(snapshotRootPath, selectedPath ?? undefined)
}

export function useProjectEditorExternalEventsEffect({
  snapshotRootPath,
  selectedPath,
  isDirty,
  clearEditor,
  loadDocument,
  openProject,
  setExternalConflictPath,
  setConflictComparisonContent,
  setStatusMessage,
}: UseProjectEditorExternalEventsEffectParams): void {
  useEffect(() => {
    if (!window.tramaApi?.onExternalFileEvent || !snapshotRootPath) {
      return
    }

    const unsubscribe = window.tramaApi.onExternalFileEvent((event) => {
      handleExternalEvent({
        event,
        selectedPath,
        snapshotRootPath,
        isDirty,
        clearEditor,
        loadDocument,
        openProject,
        setExternalConflictPath,
        setConflictComparisonContent,
        setStatusMessage,
      })
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
    setConflictComparisonContent,
    setStatusMessage,
    snapshotRootPath,
  ])
}
