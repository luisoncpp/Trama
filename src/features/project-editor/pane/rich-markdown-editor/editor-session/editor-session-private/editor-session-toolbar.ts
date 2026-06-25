// @Architecture(descriptionShort="Thin public toolbar hook")
import { useEffect, useRef } from 'preact/hooks'
import { RichEditorToolbarController, type SyncToolbarControlsParams } from './editor-session-toolbar-private/editor-session-toolbar-controller'

export type { RichEditorSyncState } from './editor-session-toolbar-private/editor-session-toolbar-helpers'
export { createZoomSelect, normalizeZoomValue } from './editor-session-toolbar-private/editor-session-toolbar-helpers'

export function useSyncToolbarControls({
  documentId,
  hostRef,
  session,
  historyBackDisabled,
  onHistoryBack,
  saveDisabled,
  saveLabel,
  onSaveNow,
  revertDisabled,
  revertLabel,
  onRevertNow,
  previewRestoreDisabled,
  previewRestoreLabel,
  onPreviewRestore,
  syncState,
  syncStateLabel,
  zoomLevel,
  onZoomChange,
}: SyncToolbarControlsParams): void {
  const controllerRef = useRef<RichEditorToolbarController | null>(null)

  useEffect(/* syncToolbarController */ () => {
    if (!controllerRef.current) controllerRef.current = new RichEditorToolbarController()
    controllerRef.current.sync({
      documentId,
      hostRef,
      session,
      historyBackDisabled,
      onHistoryBack,
      saveDisabled,
      saveLabel,
      onSaveNow,
      revertDisabled,
      revertLabel,
      onRevertNow,
      previewRestoreDisabled,
      previewRestoreLabel,
      onPreviewRestore,
      syncState,
      syncStateLabel,
      zoomLevel,
      onZoomChange,
    })
  }, [documentId, session, hostRef, historyBackDisabled, onHistoryBack, saveDisabled, saveLabel, onSaveNow,
      revertDisabled, revertLabel, onRevertNow, previewRestoreDisabled, previewRestoreLabel,
      onPreviewRestore, syncState, syncStateLabel, zoomLevel,
      onZoomChange] /*Inputs for syncToolbarController*/)
}
