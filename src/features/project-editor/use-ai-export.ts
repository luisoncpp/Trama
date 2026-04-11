import { useState, useCallback } from 'preact/hooks'

function useAiExportState() {
  const [open, setOpen] = useState(false)
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])
  const [includeFrontmatter, setIncludeFrontmatter] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  return { open, setOpen, selectedPaths, setSelectedPaths, includeFrontmatter, setIncludeFrontmatter, exporting, setExporting, lastError, setLastError }
}

function useAiExportHandlers(
  state: ReturnType<typeof useAiExportState>,
  projectRoot: string | null,
) {
  const { selectedPaths, includeFrontmatter, setExporting, setLastError, setSelectedPaths, setOpen } = state

  const handleExport = useCallback(/* handleExport */ async (): Promise<boolean> => {
    if (!projectRoot || !window.tramaApi || selectedPaths.length === 0) return false

    const exportablePaths = selectedPaths.filter((path) => !path.endsWith('/'))
    if (exportablePaths.length === 0) return false

    setExporting(true)
    setLastError(null)

    try {
      const response = await window.tramaApi.aiExport({
        filePaths: exportablePaths,
        projectRoot,
        includeFrontmatter,
      })

      if (!response.ok) {
        const message = response.error.message || 'Export failed'
        setLastError(message)
        console.error('AI Export failed:', response.error)
        return false
      }

      const { formattedContent, fileCount } = response.data
      await navigator.clipboard.writeText(formattedContent)
      console.log(`AI Export: ${fileCount} files copied`)
      setSelectedPaths([])
      setOpen(false)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed'
      setLastError(message)
      console.error('AI Export error:', error)
      return false
    } finally {
      setExporting(false)
    }
  }, [projectRoot, selectedPaths, includeFrontmatter, setExporting, setLastError, setSelectedPaths, setOpen] /*Inputs for handleExport*/)

  return { handleExport }
}

export function useAiExport(projectRoot: string | null) {
  const state = useAiExportState()
  const { handleExport } = useAiExportHandlers(state, projectRoot)

  return {
    open: state.open,
    setOpen: state.setOpen,
    selectedPaths: state.selectedPaths,
    setSelectedPaths: state.setSelectedPaths,
    includeFrontmatter: state.includeFrontmatter,
    setIncludeFrontmatter: state.setIncludeFrontmatter,
    exporting: state.exporting,
    lastError: state.lastError,
    handleExport,
  }
}
