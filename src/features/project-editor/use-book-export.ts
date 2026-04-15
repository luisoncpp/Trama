import { useCallback, useEffect, useState } from 'preact/hooks'
import type { BookExportFormat } from '../../shared/ipc'

const EXPORT_TOAST_DURATION_MS = 3000

function resolveExportExtension(format: BookExportFormat): string {
  switch (format) {
    case 'markdown':
      return 'md'
    case 'html':
      return 'html'
    case 'docx':
      return 'docx'
    case 'epub':
      return 'epub'
    case 'pdf':
      return 'pdf'
  }
}

function buildDefaultOutputPath(projectRoot: string | null, format: BookExportFormat): string {
  if (!projectRoot) {
    return ''
  }

  return `${projectRoot.replace(/[\\/]+$/, '')}/exports/book.${resolveExportExtension(format)}`
}

function useBookExportState() {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<BookExportFormat>('markdown')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [outputPath, setOutputPath] = useState('')
  const [exporting, setExporting] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  return {
    open,
    setOpen,
    format,
    setFormat,
    title,
    setTitle,
    author,
    setAuthor,
    outputPath,
    setOutputPath,
    exporting,
    setExporting,
    lastError,
    setLastError,
    toastMessage,
    setToastMessage,
  }
}

function useBookExportDefaultPath(
  open: boolean,
  format: BookExportFormat,
  projectRoot: string | null,
  setOutputPath: (value: string | ((current: string) => string)) => void,
) {
  useEffect(/* syncDefaultOutputPath */ () => {
    if (!open) {
      return
    }

    setOutputPath((current) => current || buildDefaultOutputPath(projectRoot, format))
  }, [format, open, projectRoot, setOutputPath] /*Inputs for syncDefaultOutputPath*/)
}

function useBookExportToast(toastMessage: string | null, setToastMessage: (value: string | null) => void) {
  useEffect(/* clearToastAfterDelay */ () => {
    if (!toastMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null)
    }, EXPORT_TOAST_DURATION_MS)

    return () => window.clearTimeout(timeoutId)
  }, [toastMessage, setToastMessage] /*Inputs for clearToastAfterDelay*/)

  return useCallback(/* dismissToast */ () => {
    setToastMessage(null)
  }, [setToastMessage] /*Inputs for dismissToast*/)
}

function useBookExportHandlers(
  format: BookExportFormat,
  title: string,
  author: string,
  outputPath: string,
  projectRoot: string | null,
  setExporting: (value: boolean) => void,
  setLastError: (value: string | null) => void,
  setToastMessage: (value: string | null) => void,
  setOpen: (value: boolean) => void,
) {
  return useCallback(/* handleExport */ async (): Promise<boolean> => {
    if (!projectRoot || !window.tramaApi || !outputPath.trim()) {
      setLastError('Output path is required.')
      return false
    }

    setExporting(true)
    setLastError(null)

    try {
      const response = await window.tramaApi.bookExport({
        projectRoot,
        format,
        outputPath: outputPath.trim(),
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(author.trim() ? { author: author.trim() } : {}),
      })

      if (!response.ok) {
        setLastError(response.error.message || 'Book export failed')
        return false
      }

      setToastMessage(`Book exported to ${response.data.outputPath}`)
      setOpen(false)
      return true
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Book export failed')
      return false
    } finally {
      setExporting(false)
    }
  }, [author, format, outputPath, projectRoot, setExporting, setLastError, setOpen, setToastMessage, title] /*Inputs for handleExport*/)
}

export function useBookExport(projectRoot: string | null) {
  const state = useBookExportState()
  useBookExportDefaultPath(state.open, state.format, projectRoot, state.setOutputPath)
  const dismissToast = useBookExportToast(state.toastMessage, state.setToastMessage)
  const handleExport = useBookExportHandlers(
    state.format,
    state.title,
    state.author,
    state.outputPath,
    projectRoot,
    state.setExporting,
    state.setLastError,
    state.setToastMessage,
    state.setOpen,
  )

  return {
    open: state.open,
    setOpen: state.setOpen,
    format: state.format,
    setFormat: state.setFormat,
    title: state.title,
    setTitle: state.setTitle,
    author: state.author,
    setAuthor: state.setAuthor,
    outputPath: state.outputPath,
    setOutputPath: state.setOutputPath,
    exporting: state.exporting,
    lastError: state.lastError,
    toastMessage: state.toastMessage,
    handleExport,
    dismissToast,
  }
}
