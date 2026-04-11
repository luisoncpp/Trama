import { useState, useCallback } from 'preact/hooks'
import type { AiImportPreview } from '../../shared/ipc'

export function useAiImport(projectRoot: string | null) {
  const [open, setOpen] = useState(false)

  const handlePreview = useCallback(async (clipboardContent: string): Promise<AiImportPreview | null> => {
    if (!projectRoot || !window.tramaApi) return null

    const response = await window.tramaApi.aiImportPreview({
      clipboardContent,
      projectRoot,
    })

    if (!response.ok) {
      console.error('AI Import preview failed:', response.error)
      return null
    }

    return response.data
  }, [projectRoot])

  const handleExecute = useCallback(async (clipboardContent: string): Promise<boolean> => {
    if (!projectRoot || !window.tramaApi) return false

    const response = await window.tramaApi.aiImport({
      clipboardContent,
      projectRoot,
    })

    if (!response.ok) {
      console.error('AI Import execution failed:', response.error)
      return false
    }

    const { created, skipped, errors } = response.data
    console.log(`AI Import: ${created.length} created, ${skipped.length} skipped, ${errors.length} errors`)

    if (errors.length > 0) {
      console.warn('Import errors:', errors)
    }

    return true
  }, [projectRoot])

  return {
    open,
    setOpen,
    handlePreview,
    handleExecute,
  }
}
