import { useState } from 'preact/hooks'
import type { BookExportFormat } from '../../../../shared/ipc'

const BOOK_EXPORT_FORMAT_OPTIONS: Array<{ value: BookExportFormat; label: string }> = [
  { value: 'markdown', label: 'Markdown (.md)' },
  { value: 'html', label: 'HTML (.html)' },
  { value: 'docx', label: 'DOCX (.docx)' },
  { value: 'epub', label: 'EPUB (.epub)' },
  { value: 'pdf', label: 'PDF (.pdf)' },
]

interface SidebarTransferContentProps {
  disabled: boolean
  onImport: () => void
  onExport: () => void
  onExportBook: (format: BookExportFormat) => void
  onImportZulu: () => void
}

function SidebarInterchangeActions({ disabled, onImport, onExport }: Pick<SidebarTransferContentProps, 'disabled' | 'onImport' | 'onExport'>) {
  return (
    <div class="project-menu__actions">
      <button
        type="button"
        class="editor-button editor-button--secondary"
        disabled={disabled}
        onClick={onImport}
      >
        Import AI Content
      </button>
      <button
        type="button"
        class="editor-button editor-button--secondary"
        disabled={disabled}
        onClick={onExport}
      >
        Export Files
      </button>
    </div>
  )
}

function SidebarBookExportActions({ disabled, onExportBook }: Pick<SidebarTransferContentProps, 'disabled' | 'onExportBook'>) {
  const [format, setFormat] = useState<BookExportFormat>('markdown')

  return (
    <div class="book-export-controls">
      <label class="ai-import-dialog__mode" for="book-export-format">
        <span>Format</span>
        <select
          id="book-export-format"
          class="book-export-controls__select"
          value={format}
          onChange={(event) => setFormat((event.currentTarget as HTMLSelectElement).value as BookExportFormat)}
          disabled={disabled}
        >
          {BOOK_EXPORT_FORMAT_OPTIONS.map((option) => (
            <option value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        class="editor-button editor-button--secondary"
        disabled={disabled}
        onClick={() => onExportBook(format)}
      >
        Export Book
      </button>
    </div>
  )
}

export function SidebarTransferContent({ disabled, onImport, onExport, onExportBook, onImportZulu }: SidebarTransferContentProps) {
  return (
    <div class="sidebar-panel-content">
      <aside class="workspace-panel workspace-panel--sidebar">
        <div class="workspace-panel__header">
          <div>
            <p class="workspace-panel__eyebrow">Import / Export</p>
          </div>
        </div>
        <div class="project-menu">
          <label class="project-menu__field">
            <span>ZuluPad import</span>
            <span class="project-menu__field-note">
              Import pages from a .zulu file exported from ZuluPad.
            </span>
          </label>
          <div class="project-menu__actions">
            <button
              type="button"
              class="editor-button editor-button--secondary"
              disabled={disabled}
              onClick={onImportZulu}
            >
              Import ZuluPad File
            </button>
          </div>
        </div>

        <div class="project-menu">
          <label class="project-menu__field">
            <span>Project interchange</span>
            <span class="project-menu__field-note">
              Import structured AI output into the project or export the current files for reuse elsewhere.
            </span>
          </label>
          <SidebarInterchangeActions disabled={disabled} onImport={onImport} onExport={onExport} />
        </div>

        <div class="project-menu project-menu--book-export">
          <label class="project-menu__field">
            <span>Book export</span>
            <span class="project-menu__field-note">
              Export the compiled manuscript from book/ as a single file.
            </span>
          </label>
          <SidebarBookExportActions disabled={disabled} onExportBook={onExportBook} />
        </div>
      </aside>
    </div>
  )
}