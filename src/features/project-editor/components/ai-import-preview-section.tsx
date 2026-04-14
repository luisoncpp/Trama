import type { AiImportMode, AiImportPreview } from '../../../shared/ipc'

interface AiImportPreviewSectionProps {
  preview: AiImportPreview
  importMode: AiImportMode
  importing: boolean
  onExecute: () => void
}

function getExistingFileActionLabel(importMode: AiImportMode): string {
  return importMode === 'append' ? 'will append' : 'will replace'
}

export function AiImportPreviewSection({ preview, importMode, importing, onExecute }: AiImportPreviewSectionProps) {
  return (
    <div class="ai-import-dialog__preview">
      <p class="ai-import-dialog__summary">
        <strong>{preview.totalFiles}</strong> files detected ({preview.newFiles} new, {preview.existingFiles} existing)
      </p>
      {preview.existingFiles > 0 && (
        <p class="ai-import-dialog__mode-note">
          Existing files {getExistingFileActionLabel(importMode)}.
        </p>
      )}
      {preview.files.length > 0 && (
        <ul class="ai-import-dialog__file-list">
          {preview.files.map((file) => (
            <li key={file.path} class={file.exists ? 'exists' : 'new'}>
              {file.exists ? `[${importMode === 'append' ? 'append' : 'replace'}]` : '[new]'} {file.path}
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        class="editor-button editor-button--primary editor-button--inline"
        onClick={onExecute}
        disabled={importing}
      >
        {importing ? 'Importing...' : `Import Files (${importMode})`}
      </button>
    </div>
  )
}
