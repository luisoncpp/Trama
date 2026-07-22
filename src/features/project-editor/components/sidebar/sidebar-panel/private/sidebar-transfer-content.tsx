// @Architecture(descriptionShort="Sidebar UI component for project explorer workflow")
import { useState } from 'preact/hooks'
import { useEditorActions } from '../../../../project-editor-actions-context.tsx'
import { useSidebarState } from '../../sidebar-state-context.tsx'
import type { BookExportFormat } from '../../../../../../shared/ipc'

const BOOK_EXPORT_FORMAT_OPTIONS: Array<{ value: BookExportFormat; label: string }> = [
  { value: 'markdown', label: 'Markdown (.md)' },
  { value: 'html', label: 'HTML (.html)' },
  { value: 'docx', label: 'DOCX (.docx)' },
  { value: 'epub', label: 'EPUB (.epub)' },
  { value: 'pdf', label: 'PDF (.pdf)' },
]

interface SidebarTransferContentProps {
  onImport: () => void
  onExport: () => void
  onExportBook: (format: BookExportFormat) => void
  onImportZulu: () => void
  onCountWords: () => void
}

interface SidebarTransferFlags {
  disabled: boolean
  gitAvailable: boolean
  savingSnapshot: boolean
}

function SidebarInterchangeActions({ disabled, onImport, onExport }: Pick<SidebarTransferFlags, 'disabled'> & Pick<SidebarTransferContentProps, 'onImport' | 'onExport'>) {
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

function SidebarBookExportActions({ disabled, onExportBook }: Pick<SidebarTransferFlags, 'disabled'> & Pick<SidebarTransferContentProps, 'onExportBook'>) {
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

function SidebarWordCountActions({ disabled, onCountWords }: Pick<SidebarTransferFlags, 'disabled'> & Pick<SidebarTransferContentProps, 'onCountWords'>) {
  return (
    <div class="project-menu">
      <label class="project-menu__field">
        <span>Word counts</span>
        <span class="project-menu__field-note">
          Calculate word totals for manuscript, outline, and lore sections on demand.
        </span>
      </label>
      <div class="project-menu__actions">
        <button
          type="button"
          class="editor-button editor-button--secondary"
          disabled={disabled}
          onClick={onCountWords}
        >
          Count Words
        </button>
      </div>
    </div>
  )
}

function SidebarGitActions({ disabled, savingSnapshot = false }: Pick<SidebarTransferFlags, 'disabled' | 'savingSnapshot'>) {
  const { saveSnapshot } = useEditorActions()
  return (
    <div class="project-menu">
      <label class="project-menu__field">
        <span>Project history</span>
        <span class="project-menu__field-note">
          Save a local Git snapshot of Trama-managed project content.
        </span>
      </label>
      <div class="project-menu__actions">
        <button
          type="button"
          class="editor-button editor-button--secondary"
          disabled={disabled || savingSnapshot}
          onClick={saveSnapshot}
        >
          {savingSnapshot ? 'Saving Snapshot...' : 'Save Snapshot'}
        </button>
      </div>
    </div>
  )
}

function SidebarZuluImport({ disabled, onImportZulu }: Pick<SidebarTransferFlags, 'disabled'> & Pick<SidebarTransferContentProps, 'onImportZulu'>) {
  return (
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
  )
}

function useSidebarTransferFlags(): SidebarTransferFlags {
  const { loadingProject, apiAvailable, gitHistory } = useSidebarState()
  return {
    disabled: loadingProject || !apiAvailable,
    gitAvailable: gitHistory.gitAvailable,
    savingSnapshot: gitHistory.loading,
  }
}

export function SidebarTransferContent({ onImport, onExport, onExportBook, onImportZulu, onCountWords }: SidebarTransferContentProps) {
  const { disabled, gitAvailable, savingSnapshot } = useSidebarTransferFlags()
  return (
    <div class="sidebar-panel-content">
      <aside class="workspace-panel workspace-panel--sidebar">
        <div class="workspace-panel__header">
          <div>
            <p class="workspace-panel__eyebrow">Import / Export</p>
          </div>
        </div>
        <SidebarWordCountActions disabled={disabled} onCountWords={onCountWords} />
        <SidebarZuluImport disabled={disabled} onImportZulu={onImportZulu} />

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
        {gitAvailable ? <SidebarGitActions disabled={disabled} savingSnapshot={savingSnapshot} /> : null}
      </aside>
    </div>
  )
}
