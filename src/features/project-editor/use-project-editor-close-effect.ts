import { useEffect } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
import type { EditorSerializationRefs, PaneDocumentState } from './project-editor-types'

interface UseProjectEditorCloseEffectParams {
  primaryPane: PaneDocumentState
  secondaryPane: PaneDocumentState
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
  primarySerializationRef: { current: EditorSerializationRefs }
  secondarySerializationRef: { current: EditorSerializationRefs }
}

export function useProjectEditorCloseEffect({
  primaryPane,
  secondaryPane,
  saveDocumentNow,
  primarySerializationRef,
  secondarySerializationRef,
}: UseProjectEditorCloseEffectParams): void {
  useEffect(/* notifyCloseStateDirtyFlag */ () => {
    const hasUnsavedChanges = primaryPane.isDirty || secondaryPane.isDirty
    if (window.tramaApi?.notifyCloseState) {
      void window.tramaApi.notifyCloseState({ hasUnsavedChanges })
    }
  }, [primaryPane.isDirty, secondaryPane.isDirty] /*Inputs for notifyCloseStateDirtyFlag*/)

  useEffect(/* registerSaveAllGlobalHandler */ () => {
    const w = window as unknown as Record<string, unknown>

    w.__tramaSaveAll = async (): Promise<void> => {
      const dirtyPanes: Array<{ path: string; content: string; meta: DocumentMeta }> = []

      if (primaryPane.isDirty && primaryPane.path) {
        const flushed = primarySerializationRef.current.flush() ?? primaryPane.content
        dirtyPanes.push({ path: primaryPane.path, content: flushed, meta: primaryPane.meta })
      }

      if (secondaryPane.isDirty && secondaryPane.path) {
        const flushed = secondarySerializationRef.current.flush() ?? secondaryPane.content
        dirtyPanes.push({ path: secondaryPane.path, content: flushed, meta: secondaryPane.meta })
      }

      await Promise.all(dirtyPanes.map((p) => saveDocumentNow(p.path, p.content, p.meta)))
    }

    return () => {
      delete w.__tramaSaveAll
    }
  }, [primaryPane, secondaryPane, saveDocumentNow, primarySerializationRef, secondarySerializationRef] /*Inputs for registerSaveAllGlobalHandler*/)
}
