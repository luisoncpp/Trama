import { buildConflictCopyPath } from './project-editor-logic'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import { ensureMarkdownEmbeddedImagesArePng } from './project-editor-image-save'
import type { ProjectEditorDocumentState, ProjectEditorProjectState, ProjectEditorUiState } from './project-editor-types'
import type { OpenProjectOptions } from './use-project-editor-actions-types'
import type { PaneWorkspace } from './pane'

export function resolveConflictReload(
  deps: {
    workspace: PaneWorkspace
    uiState: ProjectEditorUiState
    setExternalConflictPath: (value: string | null) => void
    setConflictComparisonContent: (value: string | null) => void
    setStatusMessage: (value: string) => void
    loadDocument: (path: string, pane: 'primary' | 'secondary') => Promise<void>
  },
): void {
  if (deps.uiState.externalConflictPath) {
    void deps.loadDocument(deps.uiState.externalConflictPath, deps.workspace.layout.activePane)
  }

  deps.setExternalConflictPath(null)
  deps.setConflictComparisonContent(null)
  deps.setStatusMessage(PROJECT_EDITOR_STRINGS.statusReloadDiscarded)
}

export function resolveConflictKeep(
  deps: {
    setExternalConflictPath: (value: string | null) => void
    setConflictComparisonContent: (value: string | null) => void
    setStatusMessage: (value: string) => void
  },
): void {
  deps.setExternalConflictPath(null)
  deps.setConflictComparisonContent(null)
  deps.setStatusMessage(PROJECT_EDITOR_STRINGS.statusSaveAsCopyHint)
}

export function resolveConflictSaveAsCopy(
  deps: {
    documentState: ProjectEditorDocumentState
    projectState: ProjectEditorProjectState
    setStatusMessage: (value: string) => void
    setExternalConflictPath: (value: string | null) => void
    setConflictComparisonContent: (value: string | null) => void
    openProject: (projectRoot: string, options?: OpenProjectOptions) => Promise<void>
    workspace: PaneWorkspace
  },
): void {
  if (!deps.documentState.selectedPath || !deps.projectState.rootPath) {
    return
  }

  const copyPath = buildConflictCopyPath(deps.documentState.selectedPath, deps.projectState.visibleFiles)
  void (async () => {
    const pngNormalizedContent = await ensureMarkdownEmbeddedImagesArePng(deps.documentState.editorValue)
    const response = await window.tramaApi.saveDocument({
      path: copyPath,
      content: pngNormalizedContent,
      meta: deps.documentState.editorMeta,
    })

    if (!response.ok) {
      deps.setStatusMessage(`${PROJECT_EDITOR_STRINGS.statusSaveAsCopyFailed} ${response.error.message}`)
      return
    }

    deps.setExternalConflictPath(null)
    deps.setConflictComparisonContent(null)
    deps.setStatusMessage(PROJECT_EDITOR_STRINGS.statusSaveAsCopyCreated)
    await deps.openProject(deps.projectState.rootPath, {
      preferredFilePath: response.data.path,
      preferredPane: deps.workspace.layout.activePane,
      incrementalUpdate: { createdFiles: [response.data.path] },
    })
  })()
}

export function resolveConflictCompare(
  deps: {
    uiState: ProjectEditorUiState
    setStatusMessage: (value: string) => void
    setConflictComparisonContent: (value: string | null) => void
  },
): void {
  const conflictPath = deps.uiState.externalConflictPath
  if (!conflictPath) {
    return
  }

  void (async () => {
    const response = await window.tramaApi.readDocument({ path: conflictPath })
    if (!response.ok) {
      deps.setStatusMessage(`${PROJECT_EDITOR_STRINGS.statusCompareFailed} ${response.error.message}`)
      return
    }

    deps.setConflictComparisonContent(response.data.content)
    deps.setStatusMessage(PROJECT_EDITOR_STRINGS.statusCompareReady)
  })()
}

export function closeConflictCompare(
  deps: {
    setConflictComparisonContent: (value: string | null) => void
  },
): void {
  deps.setConflictComparisonContent(null)
}
