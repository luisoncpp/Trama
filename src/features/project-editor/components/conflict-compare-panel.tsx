import { PROJECT_EDITOR_STRINGS } from '../project-editor-strings'

interface ConflictComparePanelProps {
  externalConflictPath: string
  diskContent: string
  localContent: string
  onClose: () => void
}

export function ConflictComparePanel({
  externalConflictPath,
  diskContent,
  localContent,
  onClose,
}: ConflictComparePanelProps) {
  return (
    <section class="editor-conflict-compare">
      <div class="editor-conflict-compare__header">
        <p class="editor-conflict-compare__title">
          {PROJECT_EDITOR_STRINGS.conflictTitlePrefix}{' '}
          <span class="editor-conflict-banner__path">{externalConflictPath}</span>
        </p>
        <button type="button" class="editor-button editor-button--secondary" onClick={onClose}>
          {PROJECT_EDITOR_STRINGS.conflictCompareClose}
        </button>
      </div>

      <div class="editor-conflict-compare__columns">
        <article class="editor-conflict-compare__column">
          <h3>{PROJECT_EDITOR_STRINGS.conflictDiskVersion}</h3>
          <pre>{diskContent}</pre>
        </article>
        <article class="editor-conflict-compare__column">
          <h3>{PROJECT_EDITOR_STRINGS.conflictLocalVersion}</h3>
          <pre>{localContent}</pre>
        </article>
      </div>
    </section>
  )
}
