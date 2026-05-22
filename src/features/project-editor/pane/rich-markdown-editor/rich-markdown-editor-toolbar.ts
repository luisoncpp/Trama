import { useEffect, useRef } from 'preact/hooks'
import { RichEditorToolbarController, type SyncToolbarControlsParams } from './toolbar-private/rich-markdown-editor-toolbar-controller'

export type { RichEditorSyncState } from './toolbar-private/rich-markdown-editor-toolbar-helpers'
export { createZoomSelect, normalizeZoomValue } from './toolbar-private/rich-markdown-editor-toolbar-helpers'

export function useSyncToolbarControls({
  documentId,
  hostRef,
  editorRef,
  historyBackDisabled,
  onHistoryBack,
  saveDisabled,
  saveLabel,
  onSaveNow,
  revertDisabled,
  revertLabel,
  onRevertNow,
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
      editorRef,
      historyBackDisabled,
      onHistoryBack,
      saveDisabled,
      saveLabel,
      onSaveNow,
      revertDisabled,
      revertLabel,
      onRevertNow,
      syncState,
      syncStateLabel,
      zoomLevel,
      onZoomChange,
    })
  }, [documentId, editorRef, hostRef, historyBackDisabled, onHistoryBack, saveDisabled, saveLabel, onSaveNow,
      revertDisabled, revertLabel, onRevertNow, syncState, syncStateLabel, zoomLevel,
      onZoomChange] /*Inputs for syncToolbarController*/)
}
