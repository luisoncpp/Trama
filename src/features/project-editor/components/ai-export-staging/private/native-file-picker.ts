import type { AiExportPickStagingMode } from '../../../../../shared/ipc'

export type StagingPickerResult = {
  canceled: boolean
  absolutePaths: string[]
}

async function invokeStagingPicker(
  projectRoot: string,
  mode: AiExportPickStagingMode,
): Promise<StagingPickerResult> {
  if (!window.tramaApi?.aiExportPickStaging) {
    throw new Error('Export staging picker is not available.')
  }

  const response = await window.tramaApi.aiExportPickStaging({ projectRoot, mode })
  if (!response.ok) {
    throw new Error(response.error.message || 'Could not open export staging picker')
  }

  return response.data
}

export async function pickExportFilePaths(projectRoot: string): Promise<StagingPickerResult> {
  return invokeStagingPicker(projectRoot, 'files')
}

export async function pickExportFolderPaths(projectRoot: string): Promise<StagingPickerResult> {
  return invokeStagingPicker(projectRoot, 'folder')
}
