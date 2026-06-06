import { useCallback } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import type { ZuluTagMode, ZuluImportPreviewResponse, ZuluSelectFileResponse } from '../../../shared/ipc'
import { useZuluImportDialogState } from './zulu-import-dialog-private/zulu-import-dialog-state'
import { useZuluImportDialogActions, useZuluImportDialogLifecycle } from './zulu-import-dialog-private/zulu-import-dialog-logic'
import { ZuluImportDialogBody } from './zulu-import-dialog-private/zulu-import-dialog-body'

export { useZuluImportDialogState } from './zulu-import-dialog-private/zulu-import-dialog-state'

interface ZuluImportDialogProps {
  open: boolean
  onClose: () => void
  onSelectFile: () => Promise<ZuluSelectFileResponse | null>
  onPreview: (content: string, targetFolder: string) => Promise<ZuluImportPreviewResponse | null>
  onExecute: (content: string, targetFolder: string, tagMode: ZuluTagMode) => Promise<boolean>
  projectRoot: string | null
}

export function ZuluImportDialog({ open, onClose, onSelectFile, onPreview, onExecute, projectRoot }: ZuluImportDialogProps) {
  const state = useZuluImportDialogState()
  const { loading, importing, setFileData, setPreview, setTargetFolder, setTagMode, setLoading, setImporting } = state
  const canClose = !loading && !importing

  const resetDialogState = useCallback(/* resetDialogState */ () => {
    setFileData(null); setTargetFolder('lore/'); setTagMode('none'); setPreview(null); setLoading(false); setImporting(false)
  }, [setFileData, setTargetFolder, setTagMode, setPreview, setLoading, setImporting] /*Inputs for resetDialogState*/)

  const closeDialog = useCallback(/* closeDialog */ () => { if (canClose) { resetDialogState(); onClose() } }, [canClose, onClose, resetDialogState] /*Inputs for closeDialog*/)

  const { handleSelectFile, handlePreview, handleExecute } = useZuluImportDialogActions(state, projectRoot, onSelectFile, onPreview, onExecute, closeDialog)
  useZuluImportDialogLifecycle(open, closeDialog)

  if (!open) return null

  return createPortal(
    <div class="zulu-import-modal" onClick={closeDialog}>
      <div class="zulu-import-dialog" role="dialog" aria-modal="true" aria-label="Import ZuluPad File" onClick={(e) => e.stopPropagation()}>
        <ZuluImportDialogBody state={state} projectRoot={projectRoot} onSelectFile={handleSelectFile} onPreview={handlePreview} onExecute={handleExecute} onClose={closeDialog} />
      </div>
    </div>,
    document.body,
  )
}
