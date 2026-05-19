import { useEffect } from 'preact/hooks'
import type { ExternalFileEvent } from '../../shared/ipc'
import type { WorkspacePane } from './project-editor-types'
import { shouldRefreshTreeOnExternalEvent } from './project-editor-logic'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'

interface ExternalEventsEffectParams {
  snapshotRootPath: string | null
  selectedPath: string | null
  activePane: WorkspacePane
  isDirty: boolean
  clearEditor: () => void
  loadDocument: (path: string, pane: WorkspacePane) => Promise<void>
  openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
  setExternalConflictPath: (path: string | null) => void
  setConflictComparisonContent: (value: string | null) => void
  setStatusMessage: (message: string) => void
  checkExternalChangeMatchesSavedSnapshot: (path: string, externalContent: string) => Promise<boolean>
}

interface HandleExternalEventParams extends ExternalEventsEffectParams {
  event: ExternalFileEvent
}

function handleSelectedPath(
  event: ExternalFileEvent,
  isDirty: boolean,
  activePane: WorkspacePane,
  snapshotRootPath: string,
  checkSnapshot: (path: string, content: string) => Promise<boolean>,
  clearEditor: () => void,
  loadDocument: (path: string, pane: WorkspacePane) => Promise<void>,
  openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>,
  setExternalConflictPath: (path: string | null) => void,
  setConflictComparisonContent: (value: string | null) => void,
  setStatusMessage: (message: string) => void,
): void {
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
    if (event.event === 'change') {
      void (async () => {
        const response = await window.tramaApi.readDocument({ path: event.path })
        if (response.ok) {
          const matches = await checkSnapshot(event.path, response.data.content)
          if (matches) {
            setExternalConflictPath(null)
            setConflictComparisonContent(null)
            setStatusMessage(`External change matched last save; keeping your edits: ${event.path}`)
          }
        }
      })()
    }
    return
  }
  setConflictComparisonContent(null)
  void loadDocument(event.path, activePane)
  setStatusMessage(`Automatically reloaded after external change: ${event.path}`)
}

function handleExternalEvent(params: HandleExternalEventParams): void {
  const { event, selectedPath, activePane, snapshotRootPath, isDirty, clearEditor,
    loadDocument, openProject, setExternalConflictPath, setConflictComparisonContent,
    setStatusMessage, checkExternalChangeMatchesSavedSnapshot } = params

  if (event.path === selectedPath) {
    handleSelectedPath(
      event, isDirty, activePane, snapshotRootPath as string,
      checkExternalChangeMatchesSavedSnapshot, clearEditor, loadDocument,
      openProject, setExternalConflictPath, setConflictComparisonContent, setStatusMessage,
    )
    return
  }
  if (!shouldRefreshTreeOnExternalEvent(event.event)) return
  if (isDirty) {
    setStatusMessage(PROJECT_EDITOR_STRINGS.statusNeedSaveBeforeRefresh)
    return
  }
  void openProject(snapshotRootPath as string, selectedPath ?? undefined)
}

export function useProjectEditorExternalEventsEffect(params: ExternalEventsEffectParams): void {
  const { snapshotRootPath, selectedPath, activePane, isDirty, clearEditor,
    loadDocument, openProject, setExternalConflictPath, setConflictComparisonContent,
    setStatusMessage, checkExternalChangeMatchesSavedSnapshot } = params

  useEffect(() => {
    if (!window.tramaApi?.onExternalFileEvent || !snapshotRootPath) return

    const unsubscribe = window.tramaApi.onExternalFileEvent((event) => {
      handleExternalEvent({
        event, selectedPath, activePane, snapshotRootPath, isDirty, clearEditor,
        loadDocument, openProject, setExternalConflictPath, setConflictComparisonContent,
        setStatusMessage, checkExternalChangeMatchesSavedSnapshot,
      })
    })

    return () => { unsubscribe() }
  }, [
    clearEditor, isDirty, loadDocument, openProject, selectedPath,
    setExternalConflictPath, setConflictComparisonContent, setStatusMessage,
    snapshotRootPath, checkExternalChangeMatchesSavedSnapshot,
  ])
}

export function useReloadProjectShortcutEffect(
  rootPath: string | null,
  onRefreshTree: () => void,
): void {
  useEffect(() => {
    if (!window.tramaApi?.onReloadProjectRequested) return

    const unsubscribe = window.tramaApi.onReloadProjectRequested(() => {
      if (rootPath) onRefreshTree()
    })

    return () => { unsubscribe() }
  }, [rootPath, onRefreshTree])
}