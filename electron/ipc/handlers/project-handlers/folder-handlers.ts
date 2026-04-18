import {
  deleteFolderRequestSchema,
  type DeleteFolderResponse,
  renameFolderRequestSchema,
  type IpcEnvelope,
  type RenameFolderResponse,
} from '../../../../src/shared/ipc.js'
import { errorEnvelope } from '../../../ipc-errors.js'
import { getActiveProjectRoot, markInternalWrite } from '../../../ipc-runtime.js'
import { scanProject } from '../../../services/project-scanner.js'
import { documentRepository, reconcileActiveProjectIndex } from './shared.js'

function withTrailingSlash(folderPath: string): string {
  return folderPath.endsWith('/') ? folderPath : `${folderPath}/`
}

function markdownFilesUnderFolder(markdownFiles: string[], folderPath: string): string[] {
  const folderPrefix = withTrailingSlash(folderPath)
  return markdownFiles.filter((filePath) => filePath.startsWith(folderPrefix))
}

function remapFolderFilePath(filePath: string, oldFolderPath: string, newFolderPath: string): string {
  const oldPrefix = withTrailingSlash(oldFolderPath)
  const newPrefix = withTrailingSlash(newFolderPath)
  return `${newPrefix}${filePath.slice(oldPrefix.length)}`
}

export async function handleRenameFolder(rawPayload: unknown): Promise<IpcEnvelope<RenameFolderResponse>> {
  const payload = renameFolderRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for folder rename', payload.error.flatten())
  }

  try {
    const projectRoot = getActiveProjectRoot()
    const { markdownFiles } = await scanProject(projectRoot)
    const oldFiles = markdownFilesUnderFolder(markdownFiles, payload.data.path)

    const result = await documentRepository.renameFolder(projectRoot, payload.data.path, payload.data.newName)

    for (const oldFilePath of oldFiles) {
      markInternalWrite(oldFilePath)
      markInternalWrite(remapFolderFilePath(oldFilePath, result.path, result.renamedTo))
    }

    await reconcileActiveProjectIndex(projectRoot)

    return {
      ok: true,
      data: result,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to rename folder'
    return errorEnvelope('FOLDER_RENAME_FAILED', message)
  }
}

export async function handleDeleteFolder(rawPayload: unknown): Promise<IpcEnvelope<DeleteFolderResponse>> {
  const payload = deleteFolderRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for folder delete', payload.error.flatten())
  }

  try {
    const projectRoot = getActiveProjectRoot()
    const { markdownFiles } = await scanProject(projectRoot)
    const filesToDelete = markdownFilesUnderFolder(markdownFiles, payload.data.path)

    const result = await documentRepository.deleteFolder(projectRoot, payload.data.path)

    for (const filePath of filesToDelete) {
      markInternalWrite(filePath)
    }

    await reconcileActiveProjectIndex(projectRoot)

    return {
      ok: true,
      data: result,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete folder'
    return errorEnvelope('FOLDER_DELETE_FAILED', message)
  }
}
