import { PROJECT_EDITOR_STRINGS } from '../project-editor-strings'

interface FileListPanelProps {
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => void
}

export function FileListPanel({
  visibleFiles,
  selectedPath,
  loadingDocument,
  onSelectFile,
}: FileListPanelProps) {
  return (
    <aside class="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
      <h2 class="text-sm font-semibold text-slate-200">{PROJECT_EDITOR_STRINGS.markdownFilesTitle}</h2>
      <p class="mt-1 text-xs text-slate-400">{visibleFiles.length} archivo(s)</p>
      <div class="mt-3 space-y-2 overflow-auto pr-1">
        {visibleFiles.map((filePath) => (
          <button
            key={filePath}
            type="button"
            onClick={() => onSelectFile(filePath)}
            disabled={loadingDocument}
            class={`w-full rounded-md border px-3 py-2 text-left text-xs ${
              selectedPath === filePath
                ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                : 'border-slate-700 bg-slate-950 text-slate-300'
            }`}
          >
            {filePath}
          </button>
        ))}
        {visibleFiles.length === 0 && <p class="text-xs text-slate-500">{PROJECT_EDITOR_STRINGS.noMarkdownFiles}</p>}
      </div>
    </aside>
  )
}
