import { useCallback, useEffect } from 'preact/hooks'
import type { ZuluTagMode, ZuluImportPreviewResponse, ZuluSelectFileResponse } from '../../../../shared/ipc'
import { useZuluImportDialogState } from './zulu-import-dialog-state'

export function useZuluImportDialogActions(
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

export function useZuluImportDialogLifecycle(open: boolean, closeDialog: () => void) {
  useEffect(/* closeOnEscape */ () => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); closeDialog() } }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeDialog, open] /*Inputs for closeOnEscape*/)
}
