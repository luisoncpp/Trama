import { useCallback } from 'preact/hooks'
import type { ProjectSnapshot } from '../../../shared/ipc'
import { reconcileWorkspaceLayout, resolvePreferredFile } from '../project-editor-logic'
import { PROJECT_EDITOR_STRINGS } from '../project-editor-strings'
import type { WorkspaceLayoutState, WorkspacePane } from '../project-editor-types'
import type { OpenProjectOptions } from '../open-project-types'

type PreferredPane = 'primary' | 'secondary'

interface OpenProjectSetters {
  setRootPath: (value: string) => void
  setSnapshot: (value: ProjectSnapshot | null) => void
  setLoadingProject: (value: boolean) => void
  setStatusMessage: (value: string) => void
  setWorkspaceLayout: (value: WorkspaceLayoutState | ((previous: WorkspaceLayoutState) => WorkspaceLayoutState)) => void
}

async function preloadInactiveSplitPane(
  resolvedLayout: ReturnType<typeof reconcileWorkspaceLayout>,
  activePath: string,
  loadDocument: (path: string, targetPane: WorkspacePane) => Promise<void>,
): Promise<void> {
  if (resolvedLayout.mode !== 'split') return

  const inactivePane: WorkspacePane = resolvedLayout.activePane === 'primary' ? 'secondary' : 'primary'
  const inactivePath = inactivePane === 'primary' ? resolvedLayout.primaryPath : resolvedLayout.secondaryPath
  if (inactivePath && inactivePath !== activePath) {
    await loadDocument(inactivePath, inactivePane)
  }
}

async function applyOpenedProject(
  snapshot: ProjectSnapshot,
  setters: OpenProjectSetters,
  clearEditor: () => void,
  loadDocument: (path: string, targetPane: WorkspacePane) => Promise<void>,
  preferredFilePath?: string,
  preferredPane?: PreferredPane,
): Promise<void> {
  setters.setRootPath(snapshot.rootPath)
  setters.setSnapshot(snapshot)
  setters.setStatusMessage(`Project opened: ${snapshot.rootPath}`)

  let nextLayout: ReturnType<typeof reconcileWorkspaceLayout> | null = null
  setters.setWorkspaceLayout((previous) => {
    const reconciled = reconcileWorkspaceLayout(previous, snapshot.markdownFiles, preferredFilePath)
    nextLayout = preferredPane && reconciled.mode === 'split'
      ? { ...reconciled, activePane: preferredPane }
      : reconciled
    return nextLayout
  })

  const resolvedLayout = nextLayout ?? reconcileWorkspaceLayout(
    { mode: 'single', ratio: 0.5, primaryPath: null, secondaryPath: null, activePane: 'primary', focusModeEnabled: false, focusScope: 'paragraph', zoomLevel: 1.0 },
    snapshot.markdownFiles,
    preferredFilePath,
  )
  const activePath = resolvedLayout.activePane === 'secondary' ? resolvedLayout.secondaryPath : resolvedLayout.primaryPath
  const nextFile = activePath ?? resolvePreferredFile(snapshot, preferredFilePath)
  if (!nextFile) {
    clearEditor()
    setters.setStatusMessage(PROJECT_EDITOR_STRINGS.projectWithoutMarkdown)
    return
  }

  await loadDocument(nextFile, resolvedLayout.activePane)
  await preloadInactiveSplitPane(resolvedLayout, nextFile, loadDocument)
}

export function useOpenProject(
  setters: OpenProjectSetters,
  clearEditor: () => void,
  loadDocument: (path: string, targetPane: WorkspacePane) => Promise<void>,
  resetPaneNavigationHistory: () => void,
): (projectRoot: string, options?: OpenProjectOptions) => Promise<void> {
  return useCallback(
    /* openProject */ async (projectRoot: string, options?: OpenProjectOptions): Promise<void> => {
      setters.setLoadingProject(true)
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.projectOpeningStatus)

      try {
        const response = await window.tramaApi.openProject({
          rootPath: projectRoot,
          incrementalUpdate: options?.incrementalUpdate,
        })
        if (!response.ok) {
          setters.setStatusMessage(`Could not open project: ${response.error.message}`)
          return
        }

        resetPaneNavigationHistory()
        await applyOpenedProject(
          response.data,
          setters,
          clearEditor,
          loadDocument,
          options?.preferredFilePath,
          options?.preferredPane,
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        setters.setStatusMessage(`Error opening project: ${message}`)
      } finally {
        setters.setLoadingProject(false)
      }
    },
    [clearEditor, loadDocument, resetPaneNavigationHistory, setters] /*Inputs for openProject*/,
  )
}
