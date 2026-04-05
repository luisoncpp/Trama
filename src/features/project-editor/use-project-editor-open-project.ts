import { useCallback } from 'preact/hooks'
import type { ProjectSnapshot } from '../../shared/ipc'
import { reconcileWorkspaceLayout, resolvePreferredFile } from './project-editor-logic'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import type { WorkspacePane } from './project-editor-types'
import type { UseProjectEditorStateResult } from './use-project-editor-state'

export type PreferredPane = 'primary' | 'secondary'

interface ApplyOpenedProjectParams {
  snapshot: ProjectSnapshot
  setters: UseProjectEditorStateResult['setters']
  clearEditor: () => void
  loadDocument: (path: string, targetPane: WorkspacePane) => Promise<void>
  preferredFilePath?: string
  preferredPane?: PreferredPane
}

async function preloadInactiveSplitPane(
  resolvedLayout: ReturnType<typeof reconcileWorkspaceLayout>,
  activePath: string,
  loadDocument: (path: string, targetPane: WorkspacePane) => Promise<void>,
): Promise<void> {
  if (resolvedLayout.mode !== 'split') {
    return
  }

  const inactivePane: WorkspacePane = resolvedLayout.activePane === 'primary' ? 'secondary' : 'primary'
  const inactivePath = inactivePane === 'primary' ? resolvedLayout.primaryPath : resolvedLayout.secondaryPath
  if (inactivePath && inactivePath !== activePath) {
    await loadDocument(inactivePath, inactivePane)
  }
}

async function applyOpenedProject({
  snapshot,
  setters,
  clearEditor,
  loadDocument,
  preferredFilePath,
  preferredPane,
}: ApplyOpenedProjectParams): Promise<void> {
  setters.setRootPath(snapshot.rootPath)
  setters.setSnapshot(snapshot)
  setters.setStatusMessage(`Project opened: ${snapshot.rootPath}`)

  let nextLayout = null as ReturnType<typeof reconcileWorkspaceLayout> | null
  setters.setWorkspaceLayout((previous) => {
    const reconciled = reconcileWorkspaceLayout(previous, snapshot.markdownFiles, preferredFilePath)
    const withPreferredPane = preferredPane && reconciled.mode === 'split'
      ? { ...reconciled, activePane: preferredPane }
      : reconciled
    nextLayout = withPreferredPane
    return withPreferredPane
  })

  const resolvedLayout = nextLayout ?? reconcileWorkspaceLayout(
    { mode: 'single', ratio: 0.5, primaryPath: null, secondaryPath: null, activePane: 'primary' },
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
  setters: UseProjectEditorStateResult['setters'],
  clearEditor: () => void,
  loadDocument: (path: string, targetPane: WorkspacePane) => Promise<void>,
): (
  projectRoot: string,
  preferredFilePath?: string,
  preferredPane?: PreferredPane,
) => Promise<void> {
  return useCallback(
    async (projectRoot: string, preferredFilePath?: string, preferredPane?: PreferredPane): Promise<void> => {
      setters.setLoadingProject(true)
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.projectOpeningStatus)

      try {
        const response = await window.tramaApi.openProject({ rootPath: projectRoot })
        if (!response.ok) {
          setters.setStatusMessage(`Could not open project: ${response.error.message}`)
          return
        }

        await applyOpenedProject({
          snapshot: response.data,
          setters,
          clearEditor,
          loadDocument,
          preferredFilePath,
          preferredPane,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        setters.setStatusMessage(`Error opening project: ${message}`)
      } finally {
        setters.setLoadingProject(false)
      }
    },
    [clearEditor, loadDocument, setters],
  )
}