// @Architecture(descriptionShort="Centralized overlay/dialog composition for AI import/export and markdown book export")
import { memo } from 'preact/compat'
import { AiImportDialog } from './components/ai-import-dialog'
import { AiExportDialog } from './components/ai-export-dialog'
import { BookExportDialog } from './components/book-export-dialog'
import { ZuluImportDialog } from './components/zulu-import-dialog'
import { WordCountsDialog } from './components/word-counts-dialog'
import { useAiImport } from './use-ai-import'
import { useAiExport } from './use-ai-export'
import { useBookExport } from './use-book-export'
import { useZuluImport } from './use-zulu-import'
import { useWordCountsDialog } from './use-word-counts-dialog'

interface ExportToastProps {
  message: string
  dismissLabel: string
  onDismiss: () => void
}

function ExportToast({ message, dismissLabel, onDismiss }: ExportToastProps) {
  return (
    <div class="ai-export-toast" role="status" aria-live="polite">
      <span>{message}</span>
      <button type="button" class="ai-export-toast__dismiss" onClick={onDismiss} aria-label={dismissLabel}>
        Dismiss
      </button>
    </div>
  )
}

export interface ProjectEditorDialogsProps {
  rootPath: string
  visibleFiles: string[]
  aiImport: ReturnType<typeof useAiImport>
  bookExport: ReturnType<typeof useBookExport>
  aiExport: ReturnType<typeof useAiExport>
  zuluImport: ReturnType<typeof useZuluImport>
  wordCounts: ReturnType<typeof useWordCountsDialog>
}

function ImportPortals({ rootPath, aiImport, zuluImport, wordCounts }: Pick<ProjectEditorDialogsProps, 'rootPath' | 'aiImport' | 'zuluImport' | 'wordCounts'>) {
  return (
    <>
      <AiImportDialog
        open={aiImport.open}
        onClose={() => aiImport.setOpen(false)}
        onPreview={aiImport.handlePreview}
        onExecute={aiImport.handleExecute}
        projectRoot={rootPath}
      />
      <ZuluImportDialog
        open={zuluImport.open}
        onClose={() => zuluImport.setOpen(false)}
        onSelectFile={zuluImport.handleSelectFile}
        onPreview={zuluImport.handlePreview}
        onExecute={zuluImport.handleExecute}
        projectRoot={rootPath}
      />
      <WordCountsDialog
        open={wordCounts.isOpen}
        loading={wordCounts.loading}
        wordCounts={wordCounts.wordCounts}
        error={wordCounts.error}
        onClose={wordCounts.closeDialog}
      />
    </>
  )
}

function ExportPortals({ rootPath, bookExport, aiExport }: Pick<ProjectEditorDialogsProps, 'rootPath' | 'bookExport' | 'aiExport'>) {
  return (
    <>
      <AiExportDialog
        open={aiExport.open}
        onClose={() => aiExport.setOpen(false)}
        onExport={aiExport.handleExport}
        selectedPaths={aiExport.selectedPaths}
        onSelectedPathsChange={aiExport.setSelectedPaths}
        includeFrontmatter={aiExport.includeFrontmatter}
        onIncludeFrontmatterChange={aiExport.setIncludeFrontmatter}
        projectRoot={rootPath}
        exporting={aiExport.exporting}
        lastError={aiExport.lastError}
        setLastError={aiExport.setLastError}
        setCopyToastMessage={aiExport.setCopyToastMessage}
      />
      <BookExportDialog
        open={bookExport.open}
        onClose={() => bookExport.setOpen(false)}
        onExport={bookExport.handleExport}
        format={bookExport.format}
        title={bookExport.title}
        onTitleChange={bookExport.setTitle}
        author={bookExport.author}
        onAuthorChange={bookExport.setAuthor}
        outputPath={bookExport.outputPath}
        onOutputPathChange={bookExport.setOutputPath}
        exporting={bookExport.exporting}
        lastError={bookExport.lastError}
        projectRoot={rootPath}
      />
    </>
  )
}

function ProjectEditorDialogPortals(props: ProjectEditorDialogsProps) {
  return (
    <>
      <ImportPortals rootPath={props.rootPath} aiImport={props.aiImport} zuluImport={props.zuluImport} wordCounts={props.wordCounts} />
      <ExportPortals rootPath={props.rootPath} bookExport={props.bookExport} aiExport={props.aiExport} />
    </>
  )
}

function ProjectEditorDialogToasts({
  bookExport,
  aiExport,
  aiImport,
  zuluImport,
}: Pick<ProjectEditorDialogsProps, 'bookExport' | 'aiExport' | 'aiImport' | 'zuluImport'>) {
  return (
    <>
      {aiExport.copyToastMessage && (
        <ExportToast message={aiExport.copyToastMessage} dismissLabel="Dismiss export copied notification" onDismiss={aiExport.dismissCopyToast} />
      )}
      {bookExport.toastMessage && (
        <ExportToast message={bookExport.toastMessage} dismissLabel="Dismiss book export notification" onDismiss={bookExport.dismissToast} />
      )}
      {aiImport.toastMessage && (
        <ExportToast message={aiImport.toastMessage} dismissLabel="Dismiss AI import notification" onDismiss={aiImport.dismissToast} />
      )}
      {zuluImport.toastMessage && (
        <ExportToast message={zuluImport.toastMessage} dismissLabel="Dismiss Zulu import notification" onDismiss={zuluImport.dismissToast} />
      )}
    </>
  )
}

function ProjectEditorDialogsInner(props: ProjectEditorDialogsProps) {
  return (
    <>
      <ProjectEditorDialogPortals {...props} />
      <ProjectEditorDialogToasts aiExport={props.aiExport} bookExport={props.bookExport} aiImport={props.aiImport} zuluImport={props.zuluImport} />
    </>
  )
}

export const ProjectEditorDialogs = memo(ProjectEditorDialogsInner)
