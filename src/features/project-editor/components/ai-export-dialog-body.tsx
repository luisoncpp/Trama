import { AiExportStagingBasket } from './ai-export-staging-basket'

interface AiExportDialogBodyProps {
  closeDialog: () => void
  handleExport: () => void
  selectedPaths: string[]
  onSelectedPathsChange: (paths: string[]) => void
  includeFrontmatter: boolean
  onIncludeFrontmatterChange: (include: boolean) => void
  projectRoot: string
  exporting: boolean
  canClose: boolean
  lastError: string | null
  setLastError: (message: string | null) => void
  setCopyToastMessage: (message: string | null) => void
}

interface AiExportActionsProps {
  closeDialog: () => void
  handleExport: () => void
  canClose: boolean
  exporting: boolean
  selectedCount: number
}

function AiExportActions({ closeDialog, handleExport, canClose, exporting, selectedCount }: AiExportActionsProps) {
  return (
    <div class="ai-export-dialog__actions">
      <button type="button" class="editor-button editor-button--secondary editor-button--inline" onClick={closeDialog} disabled={!canClose}>
        Cancel
      </button>
      <button
        type="button"
        class="editor-button editor-button--primary editor-button--inline"
        onClick={handleExport}
        disabled={selectedCount === 0 || exporting}
      >
        {exporting ? 'Exporting & Copying...' : 'Export & Copy'}
      </button>
    </div>
  )
}

export function AiExportDialogBody({
  closeDialog,
  handleExport,
  selectedPaths,
  onSelectedPathsChange,
  includeFrontmatter,
  onIncludeFrontmatterChange,
  projectRoot,
  exporting,
  canClose,
  lastError,
  setLastError,
  setCopyToastMessage,
}: AiExportDialogBodyProps) {
  return (
    <div class="ai-export-dialog" role="dialog" aria-modal="true" aria-label="Export Files" onClick={(e) => e.stopPropagation()}>
      <p class="ai-export-dialog__title">Export Files</p>

      {lastError && <p class="ai-export-dialog__error">{lastError}</p>}

      <div class="ai-export-dialog__options">
        <label class="ai-export-dialog__option">
          <input
            type="checkbox"
            checked={includeFrontmatter}
            onChange={(e) => onIncludeFrontmatterChange((e.target as HTMLInputElement).checked)}
            disabled={exporting}
          />
          <span>Include frontmatter</span>
        </label>
      </div>

      <AiExportStagingBasket
        projectRoot={projectRoot}
        selectedPaths={selectedPaths}
        onSelectedPathsChange={onSelectedPathsChange}
        exporting={exporting}
        setLastError={setLastError}
        setCopyToastMessage={setCopyToastMessage}
      />

      <AiExportActions
        closeDialog={closeDialog}
        handleExport={handleExport}
        canClose={canClose}
        exporting={exporting}
        selectedCount={selectedPaths.length}
      />
    </div>
  )
}
