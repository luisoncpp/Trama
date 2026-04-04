import { PROJECT_EDITOR_STRINGS } from '../project-editor-strings'

interface ConflictBannerProps {
  externalConflictPath: string
  onReload: () => void
  onKeep: () => void
  onSaveAsCopy: () => void
  onCompare: () => void
}

export function ConflictBanner({
  externalConflictPath,
  onReload,
  onKeep,
  onSaveAsCopy,
  onCompare,
}: ConflictBannerProps) {
  return (
    <section class="editor-conflict-banner">
      <p class="editor-conflict-banner__text">
        {PROJECT_EDITOR_STRINGS.conflictTitlePrefix} <span class="editor-conflict-banner__path">{externalConflictPath}</span>
      </p>
      <div class="editor-conflict-banner__actions">
        <button type="button" class="editor-button editor-button--secondary" onClick={onCompare}>
          {PROJECT_EDITOR_STRINGS.conflictCompare}
        </button>
        <button type="button" class="editor-button editor-button--secondary" onClick={onSaveAsCopy}>
          {PROJECT_EDITOR_STRINGS.conflictSaveAsCopy}
        </button>
        <button type="button" class="editor-button editor-button--warning" onClick={onReload}>
          {PROJECT_EDITOR_STRINGS.conflictReload}
        </button>
        <button type="button" class="editor-button editor-button--ghost-warning" onClick={onKeep}>
          {PROJECT_EDITOR_STRINGS.conflictKeep}
        </button>
      </div>
    </section>
  )
}
