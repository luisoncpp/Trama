import { useCallback, useEffect, useState } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import type { ZuluTagMode, ZuluImportPreviewResponse, ZuluSelectFileResponse } from '../../../shared/ipc'
import { ZuluImportDialogBody } from './zulu-import-dialog-body'

interface ZuluImportDialogProps {
  open: boolean
  onClose: () => void
  onSelectFile: () => Promise<ZuluSelectFileResponse | null>
  onPreview: (content: string, targetFolder: string) => Promise<ZuluImportPreviewResponse | null>
  onExecute: (content: string, targetFolder: string, tagMode: ZuluTagMode) => Promise<boolean>
  projectRoot: string | null
}

export function useZuluImportDialogState() {
  const [fileData, setFileData] = useState<ZuluSelectFileResponse | null>(null)
  const [targetFolder, setTargetFolder] = useState('lore/')
  const [tagMode, setTagMode] = useState<ZuluTagMode>('none')
  const [preview, setPreview] = useState<ZuluImportPreviewResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectingFile, setSelectingFile] = useState(false)
  return { fileData, setFileData, targetFolder, setTargetFolder, tagMode, setTagMode, preview, setPreview, loading, setLoading, importing, setImporting, selectingFile, setSelectingFile }
}

function useZuluImportDialogActions(
  state: ReturnType<typeof useZuluImportDialogState>,
  projectRoot: string | null,
  onSelectFile: () => Promise<ZuluSelectFileResponse | null>,
  onPreview: (content: string, targetFolder: string) => Promise<ZuluImportPreviewResponse | null>,
  onExecute: (content: string, targetFolder: string, tagMode: ZuluTagMode) => Promise<boolean>,
  onClose: () => void,
) {
  const { fileData, targetFolder, tagMode, setFileData, setLoading, setPreview, setImporting, setSelectingFile } = state

  const handleSelectFile = useCallback(/* handleSelectFile */ async () => {
    setSelectingFile(true)
    try {
      const result = await onSelectFile()
      if (result && result.content) { setFileData(result); setPreview(null) }
    } catch (error) { console.error('File select failed:', error) } finally { setSelectingFile(false) }
  }, [onSelectFile, setFileData, setPreview, setSelectingFile] /*Inputs for handleSelectFile*/)

  const handlePreview = useCallback(/* handlePreview */ async () => {
    if (!fileData?.content || !projectRoot) return
    setLoading(true)
    try { const result = await onPreview(fileData.content, targetFolder); setPreview(result) } catch (error) { console.error('Preview failed:', error) } finally { setLoading(false) }
  }, [fileData, targetFolder, onPreview, projectRoot, setLoading, setPreview] /*Inputs for handlePreview*/)

  const handleExecute = useCallback(/* handleExecute */ async () => {
    if (!fileData?.content || !projectRoot) return
    setImporting(true)
    try { const success = await onExecute(fileData.content, targetFolder, tagMode); if (success) onClose() } catch (error) { console.error('Import failed:', error) } finally { setImporting(false) }
  }, [fileData, targetFolder, tagMode, onClose, onExecute, projectRoot, setImporting] /*Inputs for handleExecute*/)

  return { handleSelectFile, handlePreview, handleExecute }
}

function useZuluImportDialogLifecycle(open: boolean, closeDialog: () => void) {
  useEffect(/* closeOnEscape */ () => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); closeDialog() } }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeDialog, open] /*Inputs for closeOnEscape*/)
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
