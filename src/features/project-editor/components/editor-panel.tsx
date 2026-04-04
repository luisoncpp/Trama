import { PROJECT_EDITOR_STRINGS } from '../project-editor-strings'

interface EditorPanelProps {
  selectedPath: string | null
  saving: boolean
  isDirty: boolean
  loadingDocument: boolean
  editorValue: string
  onSaveNow: () => void
  onEditorChange: (value: string) => void
}

export function EditorPanel({
  selectedPath,
  saving,
  isDirty,
  loadingDocument,
  editorValue,
  onSaveNow,
  onEditorChange,
}: EditorPanelProps) {
  return (
    <article class="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-slate-200">{PROJECT_EDITOR_STRINGS.editorTitle}</h2>
        <button
          type="button"
          disabled={!selectedPath || saving || !isDirty}
          onClick={onSaveNow}
          class="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-900 disabled:opacity-50"
        >
          {saving ? PROJECT_EDITOR_STRINGS.saving : isDirty ? PROJECT_EDITOR_STRINGS.saveNow : PROJECT_EDITOR_STRINGS.noChanges}
        </button>
      </div>
      <p class="mb-2 text-xs text-slate-400">{selectedPath ?? PROJECT_EDITOR_STRINGS.noFileSelected}</p>
      <textarea
        value={editorValue}
        onInput={(event) => onEditorChange(event.currentTarget.value)}
        disabled={!selectedPath || loadingDocument}
        class="h-[55vh] w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-sm text-slate-100 outline-none focus:border-emerald-400 disabled:opacity-70"
      />
    </article>
  )
}
