import { AiImportDialog } from './components/ai-import-dialog'
import { AiExportDialog } from './components/ai-export-dialog'
import { BookExportDialog } from './components/book-export-dialog'
import { ZuluImportDialog } from './components/zulu-import-dialog'
import { useAiImport } from './use-ai-import'
import { useAiExport } from './use-ai-export'
import { useBookExport } from './use-book-export'
import { useZuluImport } from './use-zulu-import'

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

interface ProjectEditorDialogsProps {
  rootPath: string
  visibleFiles: string[]
  aiImport: ReturnType<typeof useAiImport>
  bookExport: ReturnType<typeof useBookExport>
  aiExport: ReturnType<typeof useAiExport>
  zuluImport: ReturnType<typeof useZuluImport>
}

function ProjectEditorDialogPortals({ rootPath, visibleFiles, aiImport, bookExport, aiExport, zuluImport }: ProjectEditorDialogsProps) {
  const exportableFiles = visibleFiles.filter((path) => !path.endsWith('/'))

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
      <AiExportDialog
        open={aiExport.open}
        onClose={() => aiExport.setOpen(false)}
        onExport={aiExport.handleExport}
        selectedPaths={aiExport.selectedPaths}
        onSelectedPathsChange={aiExport.setSelectedPaths}
        includeFrontmatter={aiExport.includeFrontmatter}
        onIncludeFrontmatterChange={aiExport.setIncludeFrontmatter}
        visibleFiles={exportableFiles}
        exporting={aiExport.exporting}
        lastError={aiExport.lastError}
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

function ProjectEditorDialogToasts({ bookExport, aiExport }: Pick<ProjectEditorDialogsProps, 'bookExport' | 'aiExport'>) {
  return (
    <>
      {aiExport.copyToastMessage && (
        <ExportToast
          message={aiExport.copyToastMessage}
          dismissLabel="Dismiss export copied notification"
          onDismiss={aiExport.dismissCopyToast}
        />
      )}
      {bookExport.toastMessage && (
        <ExportToast
          message={bookExport.toastMessage}
          dismissLabel="Dismiss book export notification"
          onDismiss={bookExport.dismissToast}
        />
      )}
    </>
  )
}

export function ProjectEditorDialogs(props: ProjectEditorDialogsProps) {
  return (
    <>
      <ProjectEditorDialogPortals {...props} />
      <ProjectEditorDialogToasts aiExport={props.aiExport} bookExport={props.bookExport} />
    </>
  )
}
