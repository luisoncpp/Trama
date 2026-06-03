import {
  formatStagingSkipMessage,
  hardenAbsolutePaths,
  mergeIntoStagingBasket,
  type StagingHardenReport,
} from './relative-path-hardening'
import { pickExportFilePaths, pickExportFolderPaths } from './native-file-picker'
import { handleStagingBasketKeyDown } from './staging-basket-keyboard'

export type StagingBasketFeedback = {
  setLastError: (message: string | null) => void
  setCopyToastMessage: (message: string | null) => void
}

export type StagingBasketControllerOptions = {
  projectRoot: string
  getSelectedPaths: () => string[]
  setSelectedPaths: (paths: string[]) => void
  feedback: StagingBasketFeedback
  getExporting: () => boolean
}

export class AiExportStagingController {
  private options: StagingBasketControllerOptions

  constructor(options: StagingBasketControllerOptions) {
    this.options = options
  }

  setOptions(options: StagingBasketControllerOptions): void {
    this.options = options
  }

  clearBasket(): void {
    if (this.options.getExporting()) {
      return
    }
    this.options.setSelectedPaths([])
    this.options.feedback.setLastError(null)
  }

  removePathAt(index: number): void {
    if (this.options.getExporting()) {
      return
    }
    const current = this.options.getSelectedPaths()
    if (index < 0 || index >= current.length) {
      return
    }
    this.options.setSelectedPaths(current.filter((_, pathIndex) => pathIndex !== index))
  }

  handleBasketKeyDown(event: KeyboardEvent, focusedIndex: number | null): {
    focusedIndex: number | null
    pathsChanged: boolean
  } {
    if (this.options.getExporting()) {
      return { focusedIndex, pathsChanged: false }
    }

    const itemCount = this.options.getSelectedPaths().length
    const result = handleStagingBasketKeyDown(event, focusedIndex, itemCount)

    if (result.removeIndex !== null) {
      this.removePathAt(result.removeIndex)
      return { focusedIndex: result.focusedIndex, pathsChanged: true }
    }

    return { focusedIndex: result.focusedIndex, pathsChanged: false }
  }

  async addFiles(): Promise<void> {
    if (this.options.getExporting()) {
      return
    }
    await this.addFromPicker('files', () => pickExportFilePaths(this.options.projectRoot))
  }

  async addFolder(): Promise<void> {
    if (this.options.getExporting()) {
      return
    }
    await this.addFromPicker('folder', () => pickExportFolderPaths(this.options.projectRoot))
  }

  private async addFromPicker(
    mode: 'files' | 'folder',
    pickPaths: () => Promise<{ canceled: boolean; absolutePaths: string[] }>,
  ): Promise<void> {
    const { feedback, projectRoot } = this.options

    try {
      const pickResult = await pickPaths()
      if (pickResult.canceled) {
        return
      }

      const absolutePaths = pickResult.absolutePaths
      if (absolutePaths.length === 0) {
        const message =
          mode === 'folder'
            ? 'No markdown files were found in the selected folder.'
            : 'No files were selected.'
        feedback.setLastError(message)
        return
      }

      const hardenReport = hardenAbsolutePaths(absolutePaths, projectRoot)
      this.applyHardenedPaths(hardenReport)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      const message = error instanceof Error ? error.message : 'Could not add files from picker'
      feedback.setLastError(message)
      console.error('AI export staging picker failed:', error)
    }
  }

  private applyHardenedPaths(hardenReport: StagingHardenReport): void {
    const mergeReport = mergeIntoStagingBasket(this.options.getSelectedPaths(), hardenReport.accepted)
    const combinedReport: StagingHardenReport = {
      ...hardenReport,
      skippedDuplicates: mergeReport.report.skippedDuplicates,
      accepted: mergeReport.report.accepted,
    }

    this.options.setSelectedPaths(mergeReport.paths)

    const skipMessage = formatStagingSkipMessage({
      ...combinedReport,
      accepted: [],
    })

    if (skipMessage) {
      this.options.feedback.setCopyToastMessage(skipMessage)
      console.info('AI export staging:', skipMessage)
    }

    if (combinedReport.accepted.length === 0 && !skipMessage) {
      this.options.feedback.setLastError('No exportable files were added. Choose files under book/, lore/, or outline/.')
      return
    }

    if (combinedReport.accepted.length > 0) {
      this.options.feedback.setLastError(null)
    }
  }
}
