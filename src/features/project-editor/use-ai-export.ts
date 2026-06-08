import { useState, useCallback, useEffect, useMemo } from 'preact/hooks'
import { sortPathsByProjectIndex } from './components/ai-export-staging'
import type { ProjectSnapshot } from '../../shared/ipc'

const COPY_TOAST_DURATION_MS = 3000

function useAiExportState() {
  const [open, setOpen] = useState(false)
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])
  const [includeFrontmatter, setIncludeFrontmatter] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [copyToastMessage, setCopyToastMessage] = useState<string | null>(null)
  return {
    open,
    setOpen,
    selectedPaths,
    setSelectedPaths,
    includeFrontmatter,
    setIncludeFrontmatter,
    exporting,
    setExporting,
    lastError,
    setLastError,
    copyToastMessage,
    setCopyToastMessage,
  }
}

function useAiExportHandlers(
  state: ReturnType<typeof useAiExportState>,
  projectRoot: string | null,
) {
  const { selectedPaths, includeFrontmatter, setExporting, setLastError, setSelectedPaths, setOpen, setCopyToastMessage } = state

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
      setCopyToastMessage(`Copied ${fileCount} file${fileCount === 1 ? '' : 's'} to clipboard.`)
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
  }, [projectRoot, selectedPaths, includeFrontmatter, setExporting, setLastError, setSelectedPaths, setOpen, setCopyToastMessage] /*Inputs for handleExport*/)

  return { handleExport }
}

function useAiExportCopyToast(state: ReturnType<typeof useAiExportState>) {
  const { copyToastMessage, setCopyToastMessage } = state

  useEffect(/* clearCopyToastAfterDelay */ () => {
    if (!copyToastMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setCopyToastMessage(null)
    }, COPY_TOAST_DURATION_MS)

    return () => window.clearTimeout(timeoutId)
  }, [copyToastMessage, setCopyToastMessage] /*Inputs for clearCopyToastAfterDelay*/)

  const dismissCopyToast = useCallback(/* dismissCopyToast */ () => {
    setCopyToastMessage(null)
  }, [setCopyToastMessage] /*Inputs for dismissCopyToast*/)

  return { copyToastMessage, dismissCopyToast }
}

export function useAiExport(projectRoot: string | null, snapshot: ProjectSnapshot | null = null) {
  const state = useAiExportState()
  const { handleExport } = useAiExportHandlers(state, projectRoot)
  const { copyToastMessage, dismissCopyToast } = useAiExportCopyToast(state)

  const setSelectedPaths = useCallback(
    /* setSelectedPathsSorted */ (paths: string[]) => {
      const sorted = sortPathsByProjectIndex(paths, snapshot)
      state.setSelectedPaths(sorted)
    },
    [snapshot, state.setSelectedPaths] /*Inputs for setSelectedPathsSorted*/,
  )

  return useMemo(
    /* buildAiExportState */ () => ({
      open: state.open,
      setOpen: state.setOpen,
      selectedPaths: state.selectedPaths,
      setSelectedPaths: setSelectedPaths,
      includeFrontmatter: state.includeFrontmatter,
      setIncludeFrontmatter: state.setIncludeFrontmatter,
      exporting: state.exporting,
      lastError: state.lastError,
      setLastError: state.setLastError,
      setCopyToastMessage: state.setCopyToastMessage,
      handleExport,
      copyToastMessage,
      dismissCopyToast,
    }),
    [
      state.open,
      state.setOpen,
      state.selectedPaths,
      setSelectedPaths,
      state.includeFrontmatter,
      state.setIncludeFrontmatter,
      state.exporting,
      state.lastError,
      state.setLastError,
      state.setCopyToastMessage,
      handleExport,
      copyToastMessage,
      dismissCopyToast,
    ] /*Inputs for buildAiExportState*/,
  )
}
