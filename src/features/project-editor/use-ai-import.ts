import { useState, useCallback, useEffect, useMemo } from 'preact/hooks'
import type { AiImportMode, AiImportPreview } from '../../shared/ipc.js'

function useAiImportState() {
  const [open, setOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  return { open, setOpen, toastMessage, setToastMessage }
}

function useAiImportToast(state: ReturnType<typeof useAiImportState>) {
  const { toastMessage, setToastMessage } = state

  useEffect(/* clearToastAfterDelay */ () => {
    if (!toastMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null)
    }, 3000)

    return () => window.clearTimeout(timeoutId)
  }, [toastMessage, setToastMessage] /*Inputs for clearToastAfterDelay*/)

  const dismissToast = useCallback(/* dismissToast */ () => {
    setToastMessage(null)
  }, [setToastMessage] /*Inputs for dismissToast*/)

  return { toastMessage, dismissToast }
}

function useAiImportHandlers(
  state: ReturnType<typeof useAiImportState>,
  projectRoot: string | null,
  onSuccess?: (createdFiles: string[]) => void,
) {
  const { setToastMessage } = state

  const handlePreview = useCallback(/* handlePreview */ async (clipboardContent: string, importMode: AiImportMode): Promise<AiImportPreview | null> => {
    if (!projectRoot || !window.tramaApi) return null

    const response = await window.tramaApi.aiImportPreview({
      clipboardContent,
      projectRoot,
      importMode,
    })

    if (!response.ok) {
      console.error('AI Import preview failed:', response.error)
      return null
    }

    return response.data
  }, [projectRoot] /*Inputs for handlePreview*/)

  const handleExecute = useCallback(/* handleExecute */ async (clipboardContent: string, importMode: AiImportMode): Promise<boolean> => {
    if (!projectRoot || !window.tramaApi) return false

    const response = await window.tramaApi.aiImport({
      clipboardContent,
      projectRoot,
      importMode,
    })

    if (!response.ok) {
      const errorMsg = response.error.message || 'Import failed'
      console.error('AI Import execution failed:', response.error)
      setToastMessage(`Import failed: ${errorMsg}`)
      return false
    }

    const { created, appended, replaced, skipped, errors } = response.data
    console.log(`AI Import: ${created.length} created, ${appended.length} appended, ${replaced.length} replaced, ${skipped.length} skipped, ${errors.length} errors`)

    if (errors.length > 0) {
      console.warn('Import errors:', errors)
      setToastMessage(`Import completed with ${errors.length} errors.`)
    } else {
      const totalImported = created.length + appended.length + replaced.length
      setToastMessage(`Import successful: ${totalImported} file${totalImported === 1 ? '' : 's'} imported.`)
    }

    if (onSuccess) {
      onSuccess(created)
    }

    return true
  }, [projectRoot, onSuccess, setToastMessage] /*Inputs for handleExecute*/)

  return { handlePreview, handleExecute }
}

export function useAiImport(
  projectRoot: string | null,
  onSuccess?: (createdFiles: string[]) => void,
) {
  const state = useAiImportState()
  const { toastMessage, dismissToast } = useAiImportToast(state)
  const { handlePreview, handleExecute } = useAiImportHandlers(state, projectRoot, onSuccess)

  return useMemo(
    /* buildAiImportState */ () => ({
      open: state.open,
      setOpen: state.setOpen,
      handlePreview,
      handleExecute,
      toastMessage,
      dismissToast,
    }),
    [state.open, state.setOpen, handlePreview, handleExecute, toastMessage, dismissToast] /*Inputs for buildAiImportState*/,
  )
}
