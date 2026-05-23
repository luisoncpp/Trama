import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'
import { notifyTagIndexRefresh } from '../../tag-index-events'
import { normalizeName, isInvalidRenameInput, deduplicateTags } from '../../../../shared/sidebar-utils'
import { ensureMarkdownEmbeddedImagesArePng } from '../../project-editor-image-save'
import type { SidebarRenameInput, ProjectEditorProjectState } from '../../project-editor-types'
import type { OpenProjectOptions } from '../../open-project-types'
import type { PaneWorkspace } from '../../pane'

export async function renameFile(
  input: SidebarRenameInput,
  deps: {
    projectState: ProjectEditorProjectState
    setStatusMessage: (value: string) => void
    openProject: (projectRoot: string, options?: OpenProjectOptions) => Promise<void>
  },
): Promise<void> {
  if (!deps.projectState.rootPath) {
    deps.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
    return
  }

  if (isInvalidRenameInput(input)) {
    deps.setStatusMessage('Provide a valid file name without path separators.')
    return
  }

  const response = await window.tramaApi.renameDocument({
    path: input.path,
    newName: normalizeName(input.newName),
  })
  if (!response.ok) {
    deps.setStatusMessage(`Could not rename file: ${response.error.message}`)
    return
  }

  deps.setStatusMessage(`Renamed file: ${response.data.renamedTo}`)
  await deps.openProject(deps.projectState.rootPath, {
    preferredFilePath: response.data.renamedTo,
    incrementalUpdate: { renamedFiles: [{ from: input.path, to: response.data.renamedTo }] },
  })
}

export async function deleteFile(
  path: string,
  options: { deleteAssociatedImages?: boolean } | undefined,
  deps: {
    projectState: ProjectEditorProjectState
    setStatusMessage: (value: string) => void
    openProject: (projectRoot: string, options?: OpenProjectOptions) => Promise<void>
  },
): Promise<void> {
  if (!deps.projectState.rootPath) {
    deps.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
    return
  }

  const response = await window.tramaApi.deleteDocument({
    path,
    deleteAssociatedImages: options?.deleteAssociatedImages,
  })
  if (!response.ok) {
    deps.setStatusMessage(`Could not delete file: ${response.error.message}`)
    return
  }

  deps.setStatusMessage(`Deleted file: ${response.data.path}`)
  await deps.openProject(deps.projectState.rootPath, {
    incrementalUpdate: { deletedFiles: [path] },
  })
}

export async function editFileTags(
  path: string,
  tags: string[],
  deps: {
    workspace: PaneWorkspace
    projectState: ProjectEditorProjectState
    setStatusMessage: (value: string) => void
  },
): Promise<void> {
  if (!deps.projectState.rootPath) {
    deps.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
    return
  }

  const isTargetDirty =
    (deps.workspace.primary.path === path && deps.workspace.primary.isDirty) ||
    (deps.workspace.secondary.path === path && deps.workspace.secondary.isDirty)
  if (isTargetDirty) {
    deps.setStatusMessage('Save or wait for autosave before editing tags on this file.')
    return
  }

  const readResponse = await window.tramaApi.readDocument({ path })
  if (!readResponse.ok) {
    deps.setStatusMessage(`Could not load file tags: ${readResponse.error.message}`)
    return
  }

  const normalizedTags = deduplicateTags(tags)
  const nextMeta = { ...readResponse.data.meta }
  if (normalizedTags.length === 0) {
    delete nextMeta.tags
  } else {
    nextMeta.tags = normalizedTags
  }

  const pngNormalizedContent = await ensureMarkdownEmbeddedImagesArePng(readResponse.data.content)
  const saveResponse = await window.tramaApi.saveDocument({
    path,
    content: pngNormalizedContent,
    meta: nextMeta,
  })
  if (!saveResponse.ok) {
    deps.setStatusMessage(`Could not update tags: ${saveResponse.error.message}`)
    return
  }

  deps.workspace.updatePaneMeta(path, nextMeta)
  notifyTagIndexRefresh()
  deps.setStatusMessage(`Updated tags: ${saveResponse.data.path}`)
}
