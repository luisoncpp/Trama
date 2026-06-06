import { dialog } from 'electron'
import path from 'node:path'
import { mkdir, stat } from 'node:fs/promises'
import {
  type IpcEnvelope,
  type SelectProjectFolderResponse,
  type ValidateProjectFolderResponse,
} from '../../../../src/shared/ipc.js'
import { validateProjectFolderRequestSchema } from '../../../../src/shared/ipc-project.js'
import { RELEVANT_SECTION_NAMES } from '../../../../src/shared/project-sections.js'
import { errorEnvelope } from '../../../ipc-errors.js'

async function getMissingProjectFolders(rootPath: string): Promise<string[]> {
  const checks = await Promise.all(
    RELEVANT_SECTION_NAMES.map(async (folder) => {
      try {
        const folderStats = await stat(path.join(rootPath, folder))
        return folderStats.isDirectory() ? null : folder
      } catch {
        return folder
      }
    }),
  )

  return checks.filter(
    (folder): folder is (typeof RELEVANT_SECTION_NAMES)[number] => folder !== null,
  )
}

async function isProjectFolderStructureValid(rootPath: string): Promise<boolean> {
  return (await getMissingProjectFolders(rootPath)).length === 0
}

async function ensureRequiredProjectFolders(rootPath: string, missingFolders: string[]): Promise<void> {
  await Promise.all(missingFolders.map((folder) => mkdir(path.join(rootPath, folder), { recursive: true })))
}

async function promptForMissingFolders(rootPath: string, missingFolders: string[]): Promise<'create' | 'reselect' | 'cancel'> {
  const result = await dialog.showMessageBox({
    type: 'warning',
    title: 'Incomplete project structure',
    message: 'Selected folder does not contain Trama base structure.',
    detail: `Missing folders: ${missingFolders.join(', ')}\n\n${rootPath}`,
    buttons: ['Create folders and continue', 'Choose another folder', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
  })

  if (result.response === 0) {
    return 'create'
  }

  if (result.response === 1) {
    return 'reselect'
  }

  return 'cancel'
}

async function showFolderDialog(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Trama project folder',
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
}

export async function handleSelectProjectFolder(): Promise<IpcEnvelope<SelectProjectFolderResponse>> {
  try {
    while (true) {
      const selectedPath = await showFolderDialog()
      if (!selectedPath) {
        return {
          ok: true,
          data: { rootPath: null },
        }
      }

      const missingFolders = await getMissingProjectFolders(selectedPath)
      if (missingFolders.length === 0) {
        return {
          ok: true,
          data: { rootPath: selectedPath },
        }
      }

      const selectionAction = await promptForMissingFolders(selectedPath, missingFolders)
      if (selectionAction === 'create') {
        await ensureRequiredProjectFolders(selectedPath, missingFolders)
        return {
          ok: true,
          data: { rootPath: selectedPath },
        }
      }

      if (selectionAction === 'cancel') {
        return {
          ok: true,
          data: { rootPath: null },
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to select project folder'
    return errorEnvelope('PROJECT_PICKER_FAILED', message)
  }
}

export async function handleValidateProjectFolder(
  rawPayload: unknown,
): Promise<IpcEnvelope<ValidateProjectFolderResponse>> {
  const payload = validateProjectFolderRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for project folder validation', payload.error.flatten())
  }

  try {
    return {
      ok: true,
      data: {
        valid: await isProjectFolderStructureValid(payload.data.rootPath),
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to validate project folder'
    return errorEnvelope('PROJECT_VALIDATION_FAILED', message)
  }
}
