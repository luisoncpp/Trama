import { useEffect } from 'preact/hooks'
import type { DocumentMeta } from '../../shared/ipc'
import type { PaneDocumentState } from './project-editor-types'

interface UseProjectEditorCloseEffectParams {
  primaryPane: PaneDocumentState
  secondaryPane: PaneDocumentState
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
}

export function useProjectEditorCloseEffect({
  primaryPane,
  secondaryPane,
  saveDocumentNow,
}: UseProjectEditorCloseEffectParams): void {
  useEffect(() => {
    const hasUnsavedChanges = primaryPane.isDirty || secondaryPane.isDirty
    if (window.tramaApi?.notifyCloseState) {
      void window.tramaApi.notifyCloseState({ hasUnsavedChanges })
    }
  }, [primaryPane.isDirty, secondaryPane.isDirty])

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>

    w.__tramaSaveAll = async (): Promise<void> => {
      const dirtyPanes: Array<{ path: string; content: string; meta: DocumentMeta }> = []

      if (primaryPane.isDirty && primaryPane.path) {
        dirtyPanes.push({ path: primaryPane.path, content: primaryPane.content, meta: primaryPane.meta })
      }

      if (secondaryPane.isDirty && secondaryPane.path) {
        dirtyPanes.push({ path: secondaryPane.path, content: secondaryPane.content, meta: secondaryPane.meta })
      }

      await Promise.all(dirtyPanes.map((p) => saveDocumentNow(p.path, p.content, p.meta)))
    }

    return () => {
      delete w.__tramaSaveAll
    }
  }, [primaryPane, secondaryPane, saveDocumentNow])
}