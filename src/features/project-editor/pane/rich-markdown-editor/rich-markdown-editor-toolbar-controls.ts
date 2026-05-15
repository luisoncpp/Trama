import {
  createCenterIconButton,
  createPagebreakIconButton,
  createRevertIconButton,
  createZoomSelect,
  isEditorInteractive,
} from './rich-markdown-editor-toolbar-helpers'
import type Quill from 'quill'
import {
  insertPagebreakDirective,
  toggleCenterDirectives,
} from './rich-markdown-editor-layout-actions'
import type { RichEditorSyncState } from './rich-markdown-editor-toolbar-helpers'
import { syncZoomSelect } from './zoom-select-sync'

export function ensureLayoutButtonsInListGroup(toolbar: HTMLElement): {
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

export function ensureZoomSelect(toolbar: HTMLElement): HTMLSelectElement {
  let zoomSelect = toolbar.querySelector('select.ql-zoom-level') as HTMLSelectElement | null
  if (!zoomSelect) {
    zoomSelect = createZoomSelect()
    const controls = toolbar.querySelector('.rich-toolbar-controls')
    if (controls) {
      toolbar.insertBefore(zoomSelect, controls)
    } else {
      toolbar.appendChild(zoomSelect)
    }
  } else {
    const zoomOptions = [
      { value: '0.5', label: '50%' },
      { value: '0.75', label: '75%' },
      { value: '1.0', label: '100%' },
      { value: '1.25', label: '125%' },
      { value: '1.5', label: '150%' },
      { value: '1.75', label: '175%' },
      { value: '2.0', label: '200%' },
    ]
    zoomSelect.innerHTML = ''
    for (const option of zoomOptions) {
      const opt = document.createElement('option')
      opt.value = option.value
      opt.textContent = option.label
      zoomSelect.appendChild(opt)
    }
  }
  return zoomSelect
}

export function ensureSaveButton(controls: HTMLDivElement): HTMLButtonElement {
  let saveButton = controls.querySelector('button[data-trama-action="save"]') as HTMLButtonElement | null
  if (!saveButton) {
    saveButton = document.createElement('button')
    saveButton.type = 'button'
    saveButton.className = 'editor-button editor-button--secondary editor-button--inline'
    saveButton.dataset.tramaAction = 'save'
    controls.append(saveButton)
  }
  return saveButton
}

export function ensureSyncIcon(controls: HTMLDivElement): HTMLSpanElement {
  let syncIcon = controls.querySelector('.rich-toolbar-sync') as HTMLSpanElement | null
  if (!syncIcon) {
    syncIcon = document.createElement('span')
    syncIcon.className = 'rich-toolbar-sync is-disabled'
    syncIcon.setAttribute('role', 'status')
    controls.append(syncIcon)
  }
  return syncIcon
}

export function ensureRevertButton(controls: HTMLDivElement): HTMLButtonElement {
  let revertButton = controls.querySelector('button.ql-revert-changes') as HTMLButtonElement | null
  if (!revertButton) {
    revertButton = createRevertIconButton()
  }
  if (!controls.contains(revertButton)) {
    controls.prepend(revertButton)
  }
  return revertButton
}

export interface ToolbarControls {
  centerButton: HTMLButtonElement
  pagebreakButton: HTMLButtonElement
  saveButton: HTMLButtonElement
  revertButton: HTMLButtonElement
  syncIcon: HTMLSpanElement
  zoomSelect: HTMLSelectElement
}

export function ensureToolbarControls(toolbar: HTMLElement): ToolbarControls {
  const { centerButton, pagebreakButton } = ensureLayoutButtonsInListGroup(toolbar)
  let controls = toolbar.querySelector('.rich-toolbar-controls') as HTMLDivElement | null

  if (!controls) {
    controls = document.createElement('div')
    controls.className = 'rich-toolbar-controls'
    controls.append(createRevertIconButton())
    controls.append(ensureSaveButton(controls))
    controls.append(ensureSyncIcon(controls))
    toolbar.append(controls)
  }

  return {
    centerButton,
    pagebreakButton,
    saveButton: controls.querySelector('button[data-trama-action="save"]') as HTMLButtonElement,
    revertButton: ensureRevertButton(controls),
    syncIcon: controls.querySelector('.rich-toolbar-sync') as HTMLSpanElement,
    zoomSelect: ensureZoomSelect(toolbar),
  }
}

export function syncButton(
  button: HTMLButtonElement,
  options: { disabled: boolean; label?: string; ariaLabel?: string; title?: string; onClick?: () => void },
) {
  button.disabled = options.disabled
  if (options.label) button.textContent = options.label
  if (options.ariaLabel) button.setAttribute('aria-label', options.ariaLabel)
  if (options.title) button.title = options.title
  if (options.onClick) button.onclick = options.onClick
}

export function syncLayoutButtons(
  centerButton: HTMLButtonElement,
  pagebreakButton: HTMLButtonElement,
  editorRef: { current: Quill | null },
): void {
  const currentEditor = editorRef.current
  const canUseLayoutActions = isEditorInteractive(currentEditor)

  centerButton.disabled = !canUseLayoutActions
  centerButton.onclick = () => {
    if (!currentEditor) return
    currentEditor.focus()
    toggleCenterDirectives(currentEditor)
  }

  pagebreakButton.disabled = !canUseLayoutActions
  pagebreakButton.onclick = () => {
    if (!currentEditor) return
    currentEditor.focus()
    insertPagebreakDirective(currentEditor)
  }
}

export function syncToolbarSaveControls(
  saveButton: HTMLButtonElement,
  revertButton: HTMLButtonElement,
  syncIcon: HTMLSpanElement,
  params: {
    saveDisabled: boolean
    saveLabel: string
    onSaveNow: () => void
    revertDisabled: boolean
    revertLabel: string
    onRevertNow: () => void
    syncState: RichEditorSyncState
    syncStateLabel: string
  },
): void {
  syncButton(saveButton, { disabled: params.saveDisabled, label: params.saveLabel, onClick: params.onSaveNow })
  syncButton(revertButton, { disabled: params.revertDisabled, title: params.revertLabel, ariaLabel: params.revertLabel, onClick: params.onRevertNow })
  syncIcon.className = `rich-toolbar-sync is-${params.syncState}`
  syncIcon.setAttribute('aria-label', params.syncStateLabel)
  syncIcon.title = params.syncStateLabel
}
