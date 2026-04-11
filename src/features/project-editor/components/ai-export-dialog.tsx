import { useCallback, useEffect, useState } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import { AiExportDialogBody } from './ai-export-dialog-body'

interface AiExportDialogProps {
  open: boolean
  onClose: () => void
  onExport: () => Promise<boolean>
  selectedPaths: string[]
  onSelectedPathsChange: (paths: string[]) => void
  includeFrontmatter: boolean
  onIncludeFrontmatterChange: (include: boolean) => void
  visibleFiles: string[]
  exporting: boolean
  lastError: string | null
}

function useAiExportDialogActions({
  canClose,
  onClose,
  onExport,
  open,
  selectedPaths,
}: Pick<AiExportDialogProps, 'onClose' | 'onExport' | 'open' | 'selectedPaths'> & { canClose: boolean }) {
  const closeDialog = useCallback(/* closeDialog */ () => {
    if (!canClose) {
      return
    }
    onClose()
  }, [canClose, onClose] /*Inputs for closeDialog*/)

  const handleExport = useCallback(/* handleExport */ async () => {
    if (selectedPaths.length === 0) return
    const success = await onExport()
    if (success) {
      closeDialog()
    }
  }, [selectedPaths, onExport, closeDialog] /*Inputs for handleExport*/)

  useEffect(/* closeOnEscape */ () => {
    if (!open) {
      return
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && canClose) {
        event.preventDefault()
        closeDialog()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canClose, closeDialog, open] /*Inputs for closeOnEscape*/)

  return { closeDialog, handleExport }
}

export function AiExportDialog({
  open,
  onClose,
  onExport,
  selectedPaths,
  onSelectedPathsChange,
  includeFrontmatter,
  onIncludeFrontmatterChange,
  visibleFiles,
  exporting,
  lastError,
}: AiExportDialogProps) {
  const [canClose, setCanClose] = useState(!exporting)

  useEffect(/* updateCanClose */ () => {
    setCanClose(!exporting)
  }, [exporting] /*Inputs for updateCanClose*/)

  const { closeDialog, handleExport } = useAiExportDialogActions({ canClose, onClose, onExport, open, selectedPaths })

  if (!open) {
    return null
  }

  return createPortal(
    <div class="ai-export-modal" onClick={closeDialog}>
      <AiExportDialogBody
        closeDialog={closeDialog}
        handleExport={handleExport}
        selectedPaths={selectedPaths}
        onSelectedPathsChange={onSelectedPathsChange}
        includeFrontmatter={includeFrontmatter}
        onIncludeFrontmatterChange={onIncludeFrontmatterChange}
        visibleFiles={visibleFiles}
        exporting={exporting}
        canClose={canClose}
        lastError={lastError}
      />
    </div>,
    document.body,
  )
}
