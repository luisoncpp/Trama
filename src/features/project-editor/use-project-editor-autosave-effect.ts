import { useEffect } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'

interface UseProjectEditorAutosaveEffectParams {
  selectedPath: string | null
  isDirty: boolean
  editorValue: string
  editorMeta: DocumentMeta
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
}

export function useProjectEditorAutosaveEffect({
  selectedPath,
  isDirty,
  editorValue,
  editorMeta,
  saveDocumentNow,
}: UseProjectEditorAutosaveEffectParams): void {
  useEffect(/* autosaveOnDirty */ () => {
    if (!selectedPath || !isDirty) {
      return
    }

    const timer = window.setTimeout(() => {
      void saveDocumentNow(selectedPath, editorValue, editorMeta)
    }, /*timeout*/ 10 * 60 * 1000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [editorMeta, editorValue, isDirty, saveDocumentNow, selectedPath] /*Inputs for autosaveOnDirty*/)
}
