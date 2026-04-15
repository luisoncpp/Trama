import type { BookExportFormat } from '../../../shared/ipc'

interface BookExportDialogBodyProps {
  closeDialog: () => void
  handleExport: () => void
  format: BookExportFormat
  title: string
  onTitleChange: (value: string) => void
  author: string
  onAuthorChange: (value: string) => void
  outputPath: string
  onOutputPathChange: (value: string) => void
  exporting: boolean
  canClose: boolean
  lastError: string | null
  projectRoot: string | null
}

interface BookExportMetadataFieldsProps {
  title: string
  onTitleChange: (value: string) => void
  author: string
  onAuthorChange: (value: string) => void
  exporting: boolean
}

interface BookExportPathFieldsProps {
  projectRoot: string | null
  outputPath: string
  onOutputPathChange: (value: string) => void
  exporting: boolean
}

function getFormatLabel(format: BookExportFormat): string {
  switch (format) {
    case 'markdown':
      return 'Markdown'
    case 'html':
      return 'HTML'
    case 'docx':
      return 'DOCX'
    case 'epub':
      return 'EPUB'
    case 'pdf':
      return 'PDF'
  }
}

function BookExportMetadataFields({
  title,
  onTitleChange,
  author,
  onAuthorChange,
  exporting,
}: BookExportMetadataFieldsProps) {
  return (
    <>
      <label class="ai-import-dialog__mode">
        <span>Title (optional)</span>
        <input
          class="book-export-dialog__input"
          type="text"
          value={title}
          onInput={(event) => onTitleChange((event.currentTarget as HTMLInputElement).value)}
          placeholder="Book title"
          disabled={exporting}
        />
      </label>

      <label class="ai-import-dialog__mode">
        <span>Author (optional)</span>
        <input
          class="book-export-dialog__input"
          type="text"
          value={author}
          onInput={(event) => onAuthorChange((event.currentTarget as HTMLInputElement).value)}
          placeholder="Author"
          disabled={exporting}
        />
      </label>
    </>
  )
}

function BookExportPathFields({
  projectRoot,
  outputPath,
  onOutputPathChange,
  exporting,
}: BookExportPathFieldsProps) {
  return (
    <>
      <label class="ai-import-dialog__mode">
        <span>Project root</span>
        <input class="book-export-dialog__input" type="text" value={projectRoot ?? ''} disabled />
      </label>

      <label class="ai-import-dialog__mode">
        <span>Output path</span>
        <input
          class="book-export-dialog__input"
          type="text"
          value={outputPath}
          onInput={(event) => onOutputPathChange((event.currentTarget as HTMLInputElement).value)}
          placeholder="C:/path/to/exports/book.md"
          disabled={exporting}
        />
      </label>
    </>
  )
}

export function BookExportDialogBody({
  closeDialog,
  handleExport,
  format,
  title,
  onTitleChange,
  author,
  onAuthorChange,
  outputPath,
  onOutputPathChange,
  exporting,
  canClose,
  lastError,
  projectRoot,
}: BookExportDialogBodyProps) {
  const formatLabel = getFormatLabel(format)

  return (
    <div class="ai-import-dialog" role="dialog" aria-modal="true" aria-label={`Export Book as ${formatLabel}`} onClick={(event) => event.stopPropagation()}>
      <p class="ai-import-dialog__title">Export Book</p>
      <p class="ai-import-dialog__hint">Export the compiled manuscript from the <code>book/</code> tree to a {formatLabel.toLowerCase()} file on disk.</p>

      {lastError && <p class="ai-export-dialog__error">{lastError}</p>}

      <BookExportPathFields
        projectRoot={projectRoot}
        outputPath={outputPath}
        onOutputPathChange={onOutputPathChange}
        exporting={exporting}
      />

      <BookExportMetadataFields
        title={title}
        onTitleChange={onTitleChange}
        author={author}
        onAuthorChange={onAuthorChange}
        exporting={exporting}
      />

      <div class="ai-import-dialog__actions">
        <button type="button" class="editor-button editor-button--secondary editor-button--inline" onClick={closeDialog} disabled={!canClose}>
          Cancel
        </button>
        <button
          type="button"
          class="editor-button editor-button--primary editor-button--inline"
          onClick={handleExport}
          disabled={!outputPath.trim() || exporting}
        >
          {exporting ? 'Exporting...' : `Export ${formatLabel}`}
        </button>
      </div>
    </div>
  )
}
