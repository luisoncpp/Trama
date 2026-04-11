interface AiExportDialogBodyProps {
  closeDialog: () => void
  handleExport: () => void
  selectedPaths: string[]
  onSelectedPathsChange: (paths: string[]) => void
  includeFrontmatter: boolean
  onIncludeFrontmatterChange: (include: boolean) => void
  visibleFiles: string[]
  exporting: boolean
  canClose: boolean
  lastError: string | null
}

interface AiExportFileListProps {
  selectedPaths: string[]
  onSelectedPathsChange: (paths: string[]) => void
  visibleFiles: string[]
  exporting: boolean
}

interface AiExportActionsProps {
  closeDialog: () => void
  handleExport: () => void
  canClose: boolean
  exporting: boolean
  selectedCount: number
}

function useAiExportDialogSelection({
  selectedPaths,
  onSelectedPathsChange,
  visibleFiles,
}: Pick<AiExportFileListProps, 'selectedPaths' | 'onSelectedPathsChange' | 'visibleFiles'>) {
  const allSelected = selectedPaths.length === visibleFiles.length && visibleFiles.length > 0
  const someSelected = selectedPaths.length > 0 && selectedPaths.length < visibleFiles.length

  const toggleFileSelection = (filePath: string) => {
    if (selectedPaths.includes(filePath)) {
      onSelectedPathsChange(selectedPaths.filter((p) => p !== filePath))
      return
    }
    onSelectedPathsChange([...selectedPaths, filePath])
  }

  const toggleAllFiles = () => {
    if (selectedPaths.length === visibleFiles.length) {
      onSelectedPathsChange([])
      return
    }
    onSelectedPathsChange(visibleFiles)
  }

  return { allSelected, someSelected, toggleFileSelection, toggleAllFiles }
}

function AiExportFileList({
  selectedPaths,
  onSelectedPathsChange,
  visibleFiles,
  exporting,
}: AiExportFileListProps) {
  const { allSelected, someSelected, toggleFileSelection, toggleAllFiles } = useAiExportDialogSelection({
    selectedPaths,
    onSelectedPathsChange,
    visibleFiles,
  })

  return (
    <div class="ai-export-dialog__file-list">
      <label class="ai-export-dialog__select-all">
        <input
          type="checkbox"
          checked={allSelected}
          indeterminate={someSelected}
          onChange={toggleAllFiles}
          disabled={visibleFiles.length === 0 || exporting}
        />
        <span>
          Select all files <span class="ai-export-dialog__file-count">({selectedPaths.length} of {visibleFiles.length})</span>
        </span>
      </label>

      <div class="ai-export-dialog__files">
        {visibleFiles.length === 0 ? (
          <p class="ai-export-dialog__no-files">No files available</p>
        ) : (
          visibleFiles.map((filePath) => (
            <label key={filePath} class="ai-export-dialog__file-item">
              <input
                type="checkbox"
                checked={selectedPaths.includes(filePath)}
                onChange={() => toggleFileSelection(filePath)}
                disabled={exporting}
              />
              <span>{filePath}</span>
            </label>
          ))
        )}
      </div>
    </div>
  )
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
  visibleFiles,
  exporting,
  canClose,
  lastError,
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

      <AiExportFileList
        selectedPaths={selectedPaths}
        onSelectedPathsChange={onSelectedPathsChange}
        visibleFiles={visibleFiles}
        exporting={exporting}
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
