import { PROJECT_EDITOR_STRINGS } from '../project-editor-strings'

interface ProjectHeaderProps {
  apiAvailable: boolean
  loadingProject: boolean
  rootPath: string
  statusMessage: string
  onPickFolder: () => void
}

export function ProjectHeader({
  apiAvailable,
  loadingProject,
  rootPath,
  statusMessage,
  onPickFolder,
}: ProjectHeaderProps) {
  return (
    <>
      <p class="text-xs uppercase tracking-[0.2em] text-emerald-300">{PROJECT_EDITOR_STRINGS.titleKicker}</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{PROJECT_EDITOR_STRINGS.title}</h1>
      <p class="mt-2 text-sm text-slate-300">
        Preload API: {apiAvailable ? PROJECT_EDITOR_STRINGS.preloadAvailable : PROJECT_EDITOR_STRINGS.preloadUnavailable}
      </p>

      <section class="mt-5 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <div class="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onPickFolder}
            disabled={loadingProject || !apiAvailable}
            class="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            {loadingProject ? PROJECT_EDITOR_STRINGS.opening : PROJECT_EDITOR_STRINGS.openFolder}
          </button>
          <div class="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
            {rootPath || PROJECT_EDITOR_STRINGS.noFolderSelected}
          </div>
        </div>
        <p class="mt-3 text-xs text-slate-400">{statusMessage}</p>
      </section>
    </>
  )
}
