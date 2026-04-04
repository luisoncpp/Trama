import { useEffect } from 'preact/hooks'

export type RichEditorSyncState = 'clean' | 'dirty' | 'saving' | 'disabled'

interface SyncToolbarControlsParams {
  documentId: string | null
  hostRef: { current: HTMLDivElement | null }
  saveDisabled: boolean
  saveLabel: string
  onSaveNow: () => void
  syncState: RichEditorSyncState
  syncStateLabel: string
}

function ensureToolbarControls(toolbar: HTMLElement) {
  let controls = toolbar.querySelector('.rich-toolbar-controls') as HTMLDivElement | null
  if (!controls) {
    controls = document.createElement('div')
    controls.className = 'rich-toolbar-controls'

    const saveButton = document.createElement('button')
    saveButton.type = 'button'
    saveButton.className = 'editor-button editor-button--secondary editor-button--inline'
    controls.append(saveButton)

    const syncIcon = document.createElement('span')
    syncIcon.className = 'rich-toolbar-sync is-disabled'
    syncIcon.setAttribute('role', 'status')
    controls.append(syncIcon)

    toolbar.append(controls)
  }

  const saveButton = controls.querySelector('button') as HTMLButtonElement
  const syncIcon = controls.querySelector('.rich-toolbar-sync') as HTMLSpanElement
  return { saveButton, syncIcon }
}

export function useSyncToolbarControls({
  documentId,
  hostRef,
  saveDisabled,
  saveLabel,
  onSaveNow,
  syncState,
  syncStateLabel,
}: SyncToolbarControlsParams): void {
  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }

    const toolbar = host.querySelector('.ql-toolbar')
    if (!(toolbar instanceof HTMLElement)) {
      return
    }

    const { saveButton, syncIcon } = ensureToolbarControls(toolbar)
    saveButton.disabled = saveDisabled
    saveButton.textContent = saveLabel
    saveButton.onclick = onSaveNow

    syncIcon.className = `rich-toolbar-sync is-${syncState}`
    syncIcon.setAttribute('aria-label', syncStateLabel)
    syncIcon.title = syncStateLabel
  }, [documentId, hostRef, onSaveNow, saveDisabled, saveLabel, syncState, syncStateLabel])
}
