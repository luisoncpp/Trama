import { useEffect } from 'preact/hooks'
import type Quill from 'quill'
import { type RichEditorSyncState } from './rich-markdown-editor-toolbar-helpers'
import { syncZoomSelect } from './zoom-select-sync'
import {
  ensureToolbarControls,
  syncLayoutButtons,
  syncToolbarSaveControls,
} from './rich-markdown-editor-toolbar-controls'

export type { RichEditorSyncState } from './rich-markdown-editor-toolbar-helpers'

interface SyncToolbarControlsParams {
  documentId: string | null
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  saveDisabled: boolean
  saveLabel: string
  onSaveNow: () => void
  revertDisabled: boolean
  revertLabel: string
  onRevertNow: () => void
  syncState: RichEditorSyncState
  syncStateLabel: string
  zoomLevel?: number
  onZoomChange?: (level: number) => void
}

export function useSyncToolbarControls({
  documentId,
  hostRef,
  editorRef,
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
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const toolbar = host.querySelector('.ql-toolbar')
    if (!(toolbar instanceof HTMLElement)) return

    const { centerButton, pagebreakButton, saveButton, revertButton, syncIcon, zoomSelect } =
      ensureToolbarControls(toolbar)

    syncLayoutButtons(centerButton, pagebreakButton, editorRef)
    syncToolbarSaveControls(saveButton, revertButton, syncIcon, {
      saveDisabled, saveLabel, onSaveNow,
      revertDisabled, revertLabel, onRevertNow,
      syncState, syncStateLabel,
    })
    syncZoomSelect(zoomSelect, zoomLevel, onZoomChange)
  }, [documentId, editorRef, hostRef, onSaveNow, saveDisabled, saveLabel,
      onRevertNow, revertDisabled, revertLabel,
      syncState, syncStateLabel, zoomLevel, onZoomChange])
}
