import { useEffect } from 'preact/hooks'
import type Quill from 'quill'
import {
  insertCenterDirectives,
  insertPagebreakDirective,
} from './rich-markdown-editor-layout-actions'

export type RichEditorSyncState = 'clean' | 'dirty' | 'saving' | 'disabled'

interface SyncToolbarControlsParams {
  documentId: string | null
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  saveDisabled: boolean
  saveLabel: string
  onSaveNow: () => void
  syncState: RichEditorSyncState
  syncStateLabel: string
}

interface ToolbarControls {
  centerButton: HTMLButtonElement
  pagebreakButton: HTMLButtonElement
  saveButton: HTMLButtonElement
  syncIcon: HTMLSpanElement
}

function isEditorInteractive(editor: Quill | null): boolean {
  if (!editor) {
    return false
  }

  const maybeEditor = editor as Quill & { isEnabled?: () => boolean }
  if (typeof maybeEditor.isEnabled === 'function') {
    return maybeEditor.isEnabled()
  }

  return true
}

function createToolbarIconButton(className: string, title: string, iconMarkup: string): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = className
  button.title = title
  button.setAttribute('aria-label', title)
  button.innerHTML = iconMarkup
  return button
}

function createCenterIconButton(): HTMLButtonElement {
  return createToolbarIconButton(
    'ql-center-layout',
    'Centrar bloque',
    [
      '<svg class="rich-toolbar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">',
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M8 12h8M6 18h12" />',
      '</svg>',
    ].join(''),
  )
}

function createPagebreakIconButton(): HTMLButtonElement {
  return createToolbarIconButton(
    'ql-pagebreak-layout',
    'Insertar salto de pagina',
    [
      '<svg class="rich-toolbar-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
      '<path d="M3 10h18" stroke-dasharray="4 4" />',
      '<path d="M19 14v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4" />',
      '<path d="M5 6V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" />',
      '</svg>',
    ].join(''),
  )
}

function ensureLayoutButtonsInListGroup(toolbar: HTMLElement): {
  centerButton: HTMLButtonElement
  pagebreakButton: HTMLButtonElement
} {
  let centerButton = toolbar.querySelector('button.ql-center-layout') as HTMLButtonElement | null
  let pagebreakButton = toolbar.querySelector('button.ql-pagebreak-layout') as HTMLButtonElement | null
  if (centerButton && pagebreakButton) {
    return { centerButton, pagebreakButton }
  }

  const formatGroups = Array.from(toolbar.querySelectorAll('.ql-formats'))
  const listGroup = formatGroups.find((group) => {
    const hasOrdered = Boolean(group.querySelector('button.ql-list[value="ordered"]'))
    const hasBullet = Boolean(group.querySelector('button.ql-list[value="bullet"]'))
    return hasOrdered && hasBullet
  })

  centerButton ??= createCenterIconButton()
  pagebreakButton ??= createPagebreakIconButton()

  if (listGroup) {
    if (!listGroup.contains(centerButton)) {
      listGroup.append(centerButton)
    }
    if (!listGroup.contains(pagebreakButton)) {
      listGroup.append(pagebreakButton)
    }
  } else {
    if (!toolbar.contains(centerButton)) {
      toolbar.append(centerButton)
    }
    if (!toolbar.contains(pagebreakButton)) {
      toolbar.append(pagebreakButton)
    }
  }

  return { centerButton, pagebreakButton }
}

function ensureToolbarControls(toolbar: HTMLElement): ToolbarControls {
  const { centerButton, pagebreakButton } = ensureLayoutButtonsInListGroup(toolbar)
  let controls = toolbar.querySelector('.rich-toolbar-controls') as HTMLDivElement | null
  if (!controls) {
    controls = document.createElement('div')
    controls.className = 'rich-toolbar-controls'

    const saveButton = document.createElement('button')
    saveButton.type = 'button'
    saveButton.className = 'editor-button editor-button--secondary editor-button--inline'
    saveButton.dataset.tramaAction = 'save'
    controls.append(saveButton)

    const syncIcon = document.createElement('span')
    syncIcon.className = 'rich-toolbar-sync is-disabled'
    syncIcon.setAttribute('role', 'status')
    controls.append(syncIcon)

    toolbar.append(controls)
  }

  const saveButton = controls.querySelector('button[data-trama-action="save"]') as HTMLButtonElement
  const syncIcon = controls.querySelector('.rich-toolbar-sync') as HTMLSpanElement

  return { centerButton, pagebreakButton, saveButton, syncIcon }
}

export function useSyncToolbarControls({
  documentId,
  hostRef,
  editorRef,
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

    const { centerButton, pagebreakButton, saveButton, syncIcon } = ensureToolbarControls(toolbar)
    const editor = editorRef.current
    const canUseLayoutActions = isEditorInteractive(editor)

    centerButton.disabled = !canUseLayoutActions
    centerButton.onclick = () => {
      const currentEditor = editorRef.current
      if (!currentEditor) return
      currentEditor.focus()
      insertCenterDirectives(currentEditor)
    }

    pagebreakButton.disabled = !canUseLayoutActions
    pagebreakButton.onclick = () => {
      const currentEditor = editorRef.current
      if (!currentEditor) return
      currentEditor.focus()
      insertPagebreakDirective(currentEditor)
    }

    saveButton.disabled = saveDisabled
    saveButton.textContent = saveLabel
    saveButton.onclick = onSaveNow

    syncIcon.className = `rich-toolbar-sync is-${syncState}`
    syncIcon.setAttribute('aria-label', syncStateLabel)
    syncIcon.title = syncStateLabel
  }, [documentId, editorRef, hostRef, onSaveNow, saveDisabled, saveLabel, syncState, syncStateLabel])
}
