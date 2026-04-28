import { useEffect } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
import type { EditorSerializationRefs, WorkspacePane } from './project-editor-types'

interface UseProjectEditorAutosaveEffectParams {
  selectedPath: string | null
  isDirty: boolean
  editorValue: string
  editorMeta: DocumentMeta
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
  activePane: WorkspacePane
  primarySerializationRef: { current: EditorSerializationRefs }
  secondarySerializationRef: { current: EditorSerializationRefs }
}

export function useProjectEditorAutosaveEffect({
  selectedPath,
  isDirty,
  editorValue,
  editorMeta,
  saveDocumentNow,
  activePane,
  primarySerializationRef,
  secondarySerializationRef,
}: UseProjectEditorAutosaveEffectParams): void {
  useEffect(/* autosaveOnDirty */ () => {
    if (!selectedPath || !isDirty) {
      return
    }

    const timer = window.setTimeout(() => {
      const ref = activePane === 'secondary' ? secondarySerializationRef : primarySerializationRef
      const latestContent = ref.current.flush() ?? editorValue
      void saveDocumentNow(selectedPath, latestContent, editorMeta)
    }, /*timeout*/ 10 * 60 * 1000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [selectedPath, isDirty, editorValue, editorMeta, saveDocumentNow, activePane, primarySerializationRef, secondarySerializationRef] /*Inputs for autosaveOnDirty*/)
}
