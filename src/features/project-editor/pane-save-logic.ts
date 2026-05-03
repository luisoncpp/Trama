import type { DocumentMeta } from '../../shared/ipc'
import type { PaneDocumentState } from './project-editor-types'

export async function executePaneSave(
  paneDocument: PaneDocumentState,
  flushResult: string | null,
  saveDocumentNow: (path: string, content: string, meta: DocumentMeta) => Promise<void>
): Promise<void> {
  if (!paneDocument.isDirty || !paneDocument.path) {
    return
  }

  const content = flushResult ?? paneDocument.content
  await saveDocumentNow(paneDocument.path, content, paneDocument.meta)
}
