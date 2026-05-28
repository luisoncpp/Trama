import { useCallback, useMemo } from 'preact/hooks'
import type { BookExportFormat } from '../../shared/ipc'
import type { ProjectEditorDialogsProps } from './project-editor-dialogs'
import { useAiExport } from './use-ai-export'
import { useAiImport } from './use-ai-import'
import { useBookExport } from './use-book-export'
import { useZuluImport } from './use-zulu-import'

function useStableAiImportDialogState(rootPath: string) {
  const aiImportState = useAiImport(rootPath)
  return useMemo(
    /* buildAiImportDialogState */ () => ({
      open: aiImportState.open,
      setOpen: aiImportState.setOpen,
      handlePreview: aiImportState.handlePreview,
      handleExecute: aiImportState.handleExecute,
    }),
    [
      aiImportState.open,
      aiImportState.setOpen,
      aiImportState.handlePreview,
      aiImportState.handleExecute,
    ] /*Inputs for buildAiImportDialogState*/,
  )
}

function useStableAiExportDialogState(rootPath: string) {
  const aiExportState = useAiExport(rootPath)
  return useMemo(
    /* buildAiExportDialogState */ () => ({
      open: aiExportState.open,
      setOpen: aiExportState.setOpen,
      selectedPaths: aiExportState.selectedPaths,
      setSelectedPaths: aiExportState.setSelectedPaths,
      includeFrontmatter: aiExportState.includeFrontmatter,
      setIncludeFrontmatter: aiExportState.setIncludeFrontmatter,
      exporting: aiExportState.exporting,
      lastError: aiExportState.lastError,
      handleExport: aiExportState.handleExport,
      copyToastMessage: aiExportState.copyToastMessage,
      dismissCopyToast: aiExportState.dismissCopyToast,
    }),
    [
      aiExportState.open,
      aiExportState.setOpen,
      aiExportState.selectedPaths,
      aiExportState.setSelectedPaths,
      aiExportState.includeFrontmatter,
      aiExportState.setIncludeFrontmatter,
      aiExportState.exporting,
      aiExportState.lastError,
      aiExportState.handleExport,
      aiExportState.copyToastMessage,
      aiExportState.dismissCopyToast,
    ] /*Inputs for buildAiExportDialogState*/,
  )
}

function useStableBookExportDialogState(rootPath: string) {
  const bookExportState = useBookExport(rootPath)
  return useMemo(
    /* buildBookExportDialogState */ () => ({
      open: bookExportState.open,
      setOpen: bookExportState.setOpen,
      format: bookExportState.format,
      setFormat: bookExportState.setFormat,
      title: bookExportState.title,
      setTitle: bookExportState.setTitle,
      author: bookExportState.author,
      setAuthor: bookExportState.setAuthor,
      outputPath: bookExportState.outputPath,
      setOutputPath: bookExportState.setOutputPath,
      exporting: bookExportState.exporting,
      lastError: bookExportState.lastError,
      toastMessage: bookExportState.toastMessage,
      handleExport: bookExportState.handleExport,
      dismissToast: bookExportState.dismissToast,
    }),
    [
      bookExportState.open,
      bookExportState.setOpen,
      bookExportState.format,
      bookExportState.setFormat,
      bookExportState.title,
      bookExportState.setTitle,
      bookExportState.author,
      bookExportState.setAuthor,
      bookExportState.outputPath,
      bookExportState.setOutputPath,
      bookExportState.exporting,
      bookExportState.lastError,
      bookExportState.toastMessage,
      bookExportState.handleExport,
      bookExportState.dismissToast,
    ] /*Inputs for buildBookExportDialogState*/,
  )
}

function useStableZuluImportDialogState(rootPath: string) {
  const zuluImportState = useZuluImport(rootPath)
  return useMemo(
    /* buildZuluImportDialogState */ () => ({
      open: zuluImportState.open,
      setOpen: zuluImportState.setOpen,
      handleSelectFile: zuluImportState.handleSelectFile,
      handlePreview: zuluImportState.handlePreview,
      handleExecute: zuluImportState.handleExecute,
    }),
    [
      zuluImportState.open,
      zuluImportState.setOpen,
      zuluImportState.handleSelectFile,
      zuluImportState.handlePreview,
      zuluImportState.handleExecute,
    ] /*Inputs for buildZuluImportDialogState*/,
  )
}

export function useProjectEditorViewDialogs(rootPath: string, visibleFiles: string[]) {
  const aiImport = useStableAiImportDialogState(rootPath)
  const aiExport = useStableAiExportDialogState(rootPath)
  const bookExport = useStableBookExportDialogState(rootPath)
  const zuluImport = useStableZuluImportDialogState(rootPath)

  const openAiImport = useCallback(/* openAiImport */ () => {
    aiImport.setOpen(true)
  }, [aiImport.setOpen] /*Inputs for openAiImport*/)

  const openZuluImport = useCallback(/* openZuluImport */ () => {
    zuluImport.setOpen(true)
  }, [zuluImport.setOpen] /*Inputs for openZuluImport*/)

  const openAiExport = useCallback(/* openAiExport */ () => {
    aiExport.setOpen(true)
  }, [aiExport.setOpen] /*Inputs for openAiExport*/)

  const openBookExport = useCallback(/* openBookExport */ (format: BookExportFormat) => {
    bookExport.setFormat(format)
    bookExport.setOutputPath('')
    bookExport.setOpen(true)
  }, [bookExport.setFormat, bookExport.setOpen, bookExport.setOutputPath] /*Inputs for openBookExport*/)

  const dialogsProps = useMemo(
    /* buildProjectEditorDialogsProps */ (): ProjectEditorDialogsProps => ({
      rootPath,
      visibleFiles,
      aiImport,
      bookExport,
      aiExport,
      zuluImport,
    }),
    [rootPath, visibleFiles, aiImport, bookExport, aiExport, zuluImport] /*Inputs for buildProjectEditorDialogsProps*/,
  )

  return {
    dialogsProps,
    openAiImport,
    openZuluImport,
    openAiExport,
    openBookExport,
  }
}
