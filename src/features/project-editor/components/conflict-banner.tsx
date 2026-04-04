import { PROJECT_EDITOR_STRINGS } from '../project-editor-strings'

interface ConflictBannerProps {
  externalConflictPath: string
  onReload: () => void
  onKeep: () => void
}

export function ConflictBanner({ externalConflictPath, onReload, onKeep }: ConflictBannerProps) {
  return (
    <section class="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
      <p>
        {PROJECT_EDITOR_STRINGS.conflictTitlePrefix} <span class="font-mono">{externalConflictPath}</span>
      </p>
      <div class="mt-2 flex gap-2">
        <button
          type="button"
          class="rounded-md bg-amber-300 px-3 py-1 text-xs font-semibold text-slate-900"
          onClick={onReload}
        >
          {PROJECT_EDITOR_STRINGS.conflictReload}
        </button>
        <button
          type="button"
          class="rounded-md border border-amber-300/70 px-3 py-1 text-xs font-semibold text-amber-100"
          onClick={onKeep}
        >
          {PROJECT_EDITOR_STRINGS.conflictKeep}
        </button>
      </div>
    </section>
  )
}
