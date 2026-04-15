import { useCallback, useEffect, useState } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import { BookExportDialogBody } from './book-export-dialog-body'
import type { BookExportFormat } from '../../../shared/ipc'

interface BookExportDialogProps {
  open: boolean
  onClose: () => void
  onExport: () => Promise<boolean>
  format: BookExportFormat
  title: string
  onTitleChange: (value: string) => void
  author: string
  onAuthorChange: (value: string) => void
  outputPath: string
  onOutputPathChange: (value: string) => void
  exporting: boolean
  lastError: string | null
  projectRoot: string | null
}

function useBookExportDialogActions({
  canClose,
  onClose,
  open,
}: Pick<BookExportDialogProps, 'onClose' | 'open'> & { canClose: boolean }) {
  const closeDialog = useCallback(/* closeDialog */ () => {
    if (!canClose) {
      return
    }

    onClose()
  }, [canClose, onClose] /*Inputs for closeDialog*/)

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

  return { closeDialog }
}

export function BookExportDialog({
  open,
  onClose,
  onExport,
  format,
  title,
  onTitleChange,
  author,
  onAuthorChange,
  outputPath,
  onOutputPathChange,
  exporting,
  lastError,
  projectRoot,
}: BookExportDialogProps) {
  const [canClose, setCanClose] = useState(!exporting)

  useEffect(/* updateCanClose */ () => {
    setCanClose(!exporting)
  }, [exporting] /*Inputs for updateCanClose*/)

  const { closeDialog } = useBookExportDialogActions({ canClose, onClose, open })

  if (!open) {
    return null
  }

  return createPortal(
    <div class="ai-import-modal" onClick={closeDialog}>
      <BookExportDialogBody
        closeDialog={closeDialog}
        handleExport={() => void onExport()}
        format={format}
        title={title}
        onTitleChange={onTitleChange}
        author={author}
        onAuthorChange={onAuthorChange}
        outputPath={outputPath}
        onOutputPathChange={onOutputPathChange}
        exporting={exporting}
        canClose={canClose}
        lastError={lastError}
        projectRoot={projectRoot}
      />
    </div>,
    document.body,
  )
}
