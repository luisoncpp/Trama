import { useState, useCallback } from 'preact/hooks'
import type { ZuluTagMode, ZuluImportPreviewResponse } from '../../shared/ipc'

export function useZuluImport(projectRoot: string | null) {
  const [open, setOpen] = useState(false)

  const handleSelectFile = useCallback(/* handleSelectFile */ async () => {
    if (!window.tramaApi) return null
    const response = await window.tramaApi.zuluSelectFile()
    if (!response.ok) {
      console.error('Zulu file select failed:', response.error)
      return null
    }
    return response.data
  }, [] /*Inputs for handleSelectFile — stable*/)

  const handlePreview = useCallback(/* handlePreview */ async (content: string, targetFolder: string): Promise<ZuluImportPreviewResponse | null> => {
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

  const handleExecute = useCallback(/* handleExecute */ async (content: string, targetFolder: string, tagMode: ZuluTagMode): Promise<boolean> => {
    if (!projectRoot || !window.tramaApi) return false

    const response = await window.tramaApi.zuluImport({
      content,
      targetFolder,
      tagMode,
      projectRoot,
    })

    if (!response.ok) {
      console.error('Zulu import execution failed:', response.error)
      return false
    }

    const { created, errors } = response.data
    console.log(`Zulu Import: ${created.length} created, ${errors.length} errors`)

    if (errors.length > 0) {
      console.warn('Import errors:', errors)
    }

    return true
  }, [projectRoot] /*Inputs for handleExecute*/)

  return {
    open,
    setOpen,
    handleSelectFile,
    handlePreview,
    handleExecute,
  }
}
