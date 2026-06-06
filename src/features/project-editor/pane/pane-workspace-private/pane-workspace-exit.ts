import type { DocumentMeta } from '../../../../shared/ipc'
import type { PaneDocumentState } from '../../project-editor-types'

export type PaneExitReason = 'empty' | 'clean' | 'saved'

export type PreparePaneExitResult =
  | { kind: 'continued'; reason: PaneExitReason; path: string | null }
  | { kind: 'failed'; path: string | null; error: string }

export type PreparePaneRevertResult =
  | { kind: 'reverted'; path: string }
  | { kind: 'no-op'; path: string | null }

export type SavePaneNowResult =
  | { kind: 'saved'; path: string }
  | { kind: 'no-op'; path: string | null }
  | { kind: 'failed'; path: string | null; error: string }

function formatSaveError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown save error'
}

export async function savePaneIfDirtyIntent(
  paneDocument: PaneDocumentState,
  flushPaneContent: () => string | null,
  saveDocumentFn: (path: string, content: string, meta: DocumentMeta) => Promise<void>,
  markPaneSaved: (path: string, content: string) => void,
): Promise<void> {
  if (!paneDocument.isDirty || !paneDocument.path) return
  const contentToSave = flushPaneContent() ?? paneDocument.content
  await saveDocumentFn(paneDocument.path, contentToSave, paneDocument.meta)
  markPaneSaved(paneDocument.path, contentToSave)
}

export async function savePaneNowIntent(
  paneDocument: PaneDocumentState,
  savePaneIfDirty: () => Promise<void>,
): Promise<SavePaneNowResult> {
  if (!paneDocument.path || !paneDocument.isDirty) {
    return { kind: 'no-op', path: paneDocument.path }
  }
  try {
    await savePaneIfDirty()
    return { kind: 'saved', path: paneDocument.path }
  } catch (error) {
    return { kind: 'failed', path: paneDocument.path, error: formatSaveError(error) }
  }
}

export async function preparePaneExitIntent(
  paneDocument: PaneDocumentState,
  savePaneIfDirty: () => Promise<void>,
): Promise<PreparePaneExitResult> {
  const path = paneDocument.path
  if (!path) {
    return { kind: 'continued', reason: 'empty', path: null }
  }
  if (!paneDocument.isDirty) {
    return { kind: 'continued', reason: 'clean', path }
  }
  try {
    await savePaneIfDirty()
    return { kind: 'continued', reason: 'saved', path }
  } catch (error) {
    return { kind: 'failed', path, error: formatSaveError(error) }
  }
}

export function preparePaneRevertIntent(
  paneDocument: PaneDocumentState,
  flushPaneContent: () => string | null,
): PreparePaneRevertResult {
  if (!paneDocument.isDirty || !paneDocument.path) {
    return { kind: 'no-op', path: paneDocument.path }
  }
  flushPaneContent()
  return { kind: 'reverted', path: paneDocument.path }
}
