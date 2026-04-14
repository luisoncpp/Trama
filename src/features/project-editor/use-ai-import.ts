import { useState, useCallback } from 'preact/hooks'
import type { AiImportMode, AiImportPreview } from '../../shared/ipc'

export function useAiImport(projectRoot: string | null) {
  const [open, setOpen] = useState(false)

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
      console.error('AI Import execution failed:', response.error)
      return false
    }

    const { created, appended, replaced, skipped, errors } = response.data
    console.log(`AI Import: ${created.length} created, ${appended.length} appended, ${replaced.length} replaced, ${skipped.length} skipped, ${errors.length} errors`)

    if (errors.length > 0) {
      console.warn('Import errors:', errors)
    }

    return true
  }, [projectRoot] /*Inputs for handleExecute*/)

  return {
    open,
    setOpen,
    handlePreview,
    handleExecute,
  }
}
