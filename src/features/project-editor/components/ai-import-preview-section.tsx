import type { AiImportPreview } from '../../../shared/ipc'

interface AiImportPreviewSectionProps {
  preview: AiImportPreview
  importing: boolean
  onExecute: () => void
}

export function AiImportPreviewSection({ preview, importing, onExecute }: AiImportPreviewSectionProps) {
  return (
    <div class="ai-import-dialog__preview">
      <p class="ai-import-dialog__summary">
        <strong>{preview.totalFiles}</strong> files detected ({preview.newFiles} new, {preview.existingFiles} existing)
      </p>
      {preview.files.length > 0 && (
        <ul class="ai-import-dialog__file-list">
          {preview.files.map((file) => (
            <li key={file.path} class={file.exists ? 'exists' : 'new'}>
              {file.exists ? '⚠️' : '✅'} {file.path}
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
        {importing ? 'Importing...' : 'Import Files'}
      </button>
    </div>
  )
}
