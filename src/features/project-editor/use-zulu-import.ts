import { useState, useCallback, useEffect, useMemo } from 'preact/hooks'
import type { ZuluTagMode, ZuluImportPreviewResponse } from '../../shared/ipc.js'

function useZuluImportState() {
  const [open, setOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  return { open, setOpen, toastMessage, setToastMessage }
}

function useZuluImportToast(state: ReturnType<typeof useZuluImportState>) {
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

function useZuluSelectFile() {
  return useCallback(/* handleSelectFile */ async () => {
    if (!window.tramaApi) return null
    const response = await window.tramaApi.zuluSelectFile()
    if (!response.ok) {
      console.error('Zulu file select failed:', response.error)
      return null
    }
    return response.data
  }, [] /*Inputs for handleSelectFile — stable*/)
}

function useZuluPreview() {
  return useCallback(/* handlePreview */ async (content: string, targetFolder: string): Promise<ZuluImportPreviewResponse | null> => {
    if (!window.tramaApi) return null

    const response = await window.tramaApi.zuluImportPreview({
      content,
      targetFolder,
    })

    if (!response.ok) {
      console.error('Zulu import preview failed:', response.error)
      return null
    }

    return response.data
  }, [] /*Inputs for handlePreview — stable*/)
}

function useZuluImportHandlers(
  state: ReturnType<typeof useZuluImportState>,
  projectRoot: string | null,
  onSuccess?: (createdFiles: string[]) => void,
) {
  const { setToastMessage } = state

  const handleExecute = useCallback(/* handleExecute */ async (content: string, targetFolder: string, tagMode: ZuluTagMode): Promise<boolean> => {
    if (!projectRoot || !window.tramaApi) return false

    const response = await window.tramaApi.zuluImport({
      content,
      targetFolder,
      tagMode,
      projectRoot,
    })

    if (!response.ok) {
      const errorMsg = response.error.message || 'Import failed'
      console.error('Zulu import execution failed:', response.error)
      setToastMessage(`Import failed: ${errorMsg}`)
      return false
    }

    const { created, errors } = response.data
    console.log(`Zulu Import: ${created.length} created, ${errors.length} errors`)

    if (errors.length > 0) {
      console.warn('Import errors:', errors)
      setToastMessage(`Import completed with ${errors.length} errors.`)
    } else {
      setToastMessage(`Import successful: ${created.length} file${created.length === 1 ? '' : 's'} imported.`)
    }

    if (onSuccess) {
      onSuccess(created)
    }

    return true
  }, [projectRoot, onSuccess, setToastMessage] /*Inputs for handleExecute*/)

  return { handleExecute }
}

export function useZuluImport(
  projectRoot: string | null,
  onSuccess?: (createdFiles: string[]) => void,
) {
  const state = useZuluImportState()
  const { toastMessage, dismissToast } = useZuluImportToast(state)
  const handleSelectFile = useZuluSelectFile()
  const handlePreview = useZuluPreview()
  const { handleExecute } = useZuluImportHandlers(state, projectRoot, onSuccess)

  return useMemo(
    /* buildZuluImportState */ () => ({
      open: state.open,
      setOpen: state.setOpen,
      handleSelectFile,
      handlePreview,
      handleExecute,
      toastMessage,
      dismissToast,
    }),
    [state.open, state.setOpen, handleSelectFile, handlePreview, handleExecute, toastMessage, dismissToast] /*Inputs for buildZuluImportState*/,
  )
}
