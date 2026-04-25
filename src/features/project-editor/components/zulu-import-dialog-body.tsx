import type { ZuluTagMode, ZuluImportPreviewResponse } from '../../../shared/ipc'

const TAG_MODE_OPTIONS: Array<{ value: ZuluTagMode; label: string }> = [
  { value: 'none', label: 'No tags' },
  { value: 'single', label: 'Only single-word titles' },
  { value: 'all', label: 'All titles' },
]

interface ZuluImportDialogBodyProps {
  state: ReturnType<typeof import('./zulu-import-dialog').useZuluImportDialogState>
  projectRoot: string | null
  onSelectFile: () => void
  onPreview: () => void
  onExecute: () => void
  onClose: () => void
}

export function ZuluImportDialogBody({
  state,
  projectRoot,
  onSelectFile,
  onPreview,
  onExecute,
  onClose,
}: ZuluImportDialogBodyProps) {
  return (
    <>
      <p class="zulu-import-dialog__title">Import ZuluPad File</p>

      {!state.fileData ? (
        <div class="zulu-import-dialog__select-area">
          <p class="zulu-import-dialog__hint">
            Select a <code>.zulu</code> file to import its pages into the project.
          </p>
          <button
            type="button"
            class="editor-button editor-button--primary editor-button--inline"
            onClick={onSelectFile}
            disabled={!projectRoot || state.selectingFile}
          >
            {state.selectingFile ? 'Opening...' : 'Select .zulu file'}
          </button>
        </div>
      ) : (
        <ZuluImportForm
          state={state}
          onClose={onClose}
          onSelectFile={onSelectFile}
          onPreview={onPreview}
          onExecute={onExecute}
        />
      )}
    </>
  )
}

function ZuluImportForm({
  state,
  onClose,
  onSelectFile,
  onPreview,
  onExecute,
}: Omit<ZuluImportDialogBodyProps, 'projectRoot'>) {
  const disabled = state.loading || state.importing
  const previewDisabled = !state.targetFolder.trim() || disabled
  return (
    <>
      <div class="zulu-import-dialog__file-info">
        <span class="zulu-import-dialog__file-info-label">File</span>
        <span class="zulu-import-dialog__file-info-value">{state.fileData!.filePath}</span>
      </div>
      <div class="zulu-import-dialog__file-info">
        <span class="zulu-import-dialog__file-info-label">Pages</span>
        <span class="zulu-import-dialog__file-info-value">{state.fileData!.pageCount} pages found</span>
      </div>
      <label class="zulu-import-dialog__field">
        <span>Target folder</span>
        <input class="zulu-import-dialog__input" type="text" value={state.targetFolder}
          onInput={(e) => state.setTargetFolder((e.target as HTMLInputElement).value)} placeholder="lore/" />
      </label>
      <label class="zulu-import-dialog__field">
        <span>Add tags from titles</span>
        <select class="zulu-import-dialog__select" value={state.tagMode}
          onChange={(e) => state.setTagMode((e.currentTarget as HTMLSelectElement).value as ZuluTagMode)}>
          {TAG_MODE_OPTIONS.map((option) => <option value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <ZuluImportActions onClose={onClose} onSelectFile={onSelectFile} onPreview={onPreview}
        disabled={disabled} previewDisabled={previewDisabled} loading={state.loading} />
      {state.preview && <ZuluImportPreview preview={state.preview} importing={state.importing} onExecute={onExecute} />}
    </>
  )
}

function ZuluImportActions({
  onClose,
  onSelectFile,
  onPreview,
  disabled,
  previewDisabled,
  loading,
}: {
  onClose: () => void
  onSelectFile: () => void
  onPreview: () => void
  disabled: boolean
  previewDisabled: boolean
  loading: boolean
}) {
  return (
    <div class="zulu-import-dialog__actions">
      <button type="button" class="editor-button editor-button--secondary editor-button--inline" onClick={onClose} disabled={disabled}>
        Cancel
      </button>
      <button type="button" class="editor-button editor-button--secondary editor-button--inline" onClick={onSelectFile} disabled={disabled}>
        Change file
      </button>
      <button
        type="button"
        class="editor-button editor-button--primary editor-button--inline"
        onClick={onPreview}
        disabled={previewDisabled}
      >
        {loading ? 'Previewing...' : 'Preview'}
      </button>
    </div>
  )
}

function ZuluImportPreview({
  preview,
  importing,
  onExecute,
}: {
  preview: ZuluImportPreviewResponse
  importing: boolean
  onExecute: () => void
}) {
  return (
    <div class="zulu-import-dialog__preview">
      <p class="zulu-import-dialog__summary">
        <strong>{preview.totalFiles}</strong> pages will be created
      </p>
      {preview.files.length > 0 && (
        <ul class="zulu-import-dialog__file-list">
          {preview.files.map((file) => (
            <li key={file.path} class={file.exists ? 'exists' : 'new'}>
              <span class="zulu-import-dialog__file-path">{file.path}</span>
              <span class="zulu-import-dialog__file-title">{file.title}</span>
              {file.tagCount > 0 && (
                <span class="zulu-import-dialog__file-tags">{file.tagCount} tag{file.tagCount !== 1 ? 's' : ''}</span>
              )}
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
        {importing ? 'Importing...' : `Import ${preview.totalFiles} files`}
      </button>
    </div>
  )
}
