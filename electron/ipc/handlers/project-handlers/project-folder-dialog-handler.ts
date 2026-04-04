import { dialog } from 'electron'
import type { IpcEnvelope, SelectProjectFolderResponse } from '../../../../src/shared/ipc.js'
import { errorEnvelope } from '../../../ipc-errors.js'

export async function handleSelectProjectFolder(): Promise<IpcEnvelope<SelectProjectFolderResponse>> {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Selecciona carpeta de proyecto Trama',
    })

    if (result.canceled || result.filePaths.length === 0) {
      return {
        ok: true,
        data: { rootPath: null },
      }
    }

    return {
      ok: true,
      data: { rootPath: result.filePaths[0] },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to select project folder'
    return errorEnvelope('PROJECT_PICKER_FAILED', message)
  }
}
