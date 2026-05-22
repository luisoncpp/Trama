import type Quill from 'quill'
import {
  isEditorInteractive,
  normalizeZoomValue,
  type RichEditorSyncState,
} from './rich-markdown-editor-toolbar-helpers'
import { insertPagebreakDirective, toggleCenterDirectives } from '../rich-markdown-editor-layout-actions'
import { attachToolbarElements, type ToolbarElements } from './rich-markdown-editor-toolbar-dom'

export interface SyncToolbarControlsParams {
  documentId: string | null
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  historyBackDisabled: boolean
  onHistoryBack: () => void
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

export class RichEditorToolbarController {
  private toolbar: HTMLElement | null = null
  private elements: ToolbarElements | null = null

  sync(params: SyncToolbarControlsParams): void {
    const host = params.hostRef.current
    if (!host) return
    const toolbar = host.querySelector('.ql-toolbar')
    if (!(toolbar instanceof HTMLElement)) return
    if (this.toolbar !== toolbar) this.attach(toolbar)
    this.syncLayoutButtons(params.editorRef)
    this.syncDocumentControls(params)
    this.syncZoom(params.zoomLevel, params.onZoomChange)
  }

  private attach(toolbar: HTMLElement): void {
    this.toolbar = toolbar
    this.elements = attachToolbarElements(toolbar)
  }

  private syncLayoutButtons(editorRef: { current: Quill | null }): void {
    if (!this.elements) return
    const currentEditor = editorRef.current
    const canUseLayoutActions = isEditorInteractive(currentEditor)
    this.elements.centerButton.disabled = !canUseLayoutActions
    this.elements.centerButton.onclick = () => {
      if (!currentEditor) return
      currentEditor.focus()
      toggleCenterDirectives(currentEditor)
    }
    this.elements.pagebreakButton.disabled = !canUseLayoutActions
    this.elements.pagebreakButton.onclick = () => {
      if (!currentEditor) return
      currentEditor.focus()
      insertPagebreakDirective(currentEditor)
    }
  }

  private syncDocumentControls(params: SyncToolbarControlsParams): void {
    if (!this.elements) return
    this.syncButton(this.elements.historyBackButton, {
      disabled: params.historyBackDisabled,
      title: 'Previous Document',
      ariaLabel: 'Previous Document',
      onClick: params.onHistoryBack,
    })
    this.syncButton(this.elements.revertButton, {
      disabled: params.revertDisabled,
      title: params.revertLabel,
      ariaLabel: params.revertLabel,
      onClick: params.onRevertNow,
    })
    this.syncButton(this.elements.saveButton, {
      disabled: params.saveDisabled,
      label: params.saveLabel,
      onClick: params.onSaveNow,
    })
    this.elements.syncIcon.className = `rich-toolbar-sync is-${params.syncState}`
    this.elements.syncIcon.setAttribute('aria-label', params.syncStateLabel)
    this.elements.syncIcon.title = params.syncStateLabel
  }

  private syncZoom(zoomLevel: number | undefined, onZoomChange: ((level: number) => void) | undefined): void {
    if (!this.elements) return
    this.elements.zoomSelect.value = normalizeZoomValue(zoomLevel)
    this.elements.zoomSelect.onchange = onZoomChange
      ? () => {
          const nextLevel = Number.parseFloat(this.elements?.zoomSelect.value ?? '')
          if (!Number.isNaN(nextLevel)) onZoomChange(nextLevel)
        }
      : null
  }

  private syncButton(
    button: HTMLButtonElement,
    options: { disabled: boolean; label?: string; ariaLabel?: string; title?: string; onClick: () => void },
  ): void {
    button.disabled = options.disabled
    if (options.label) button.textContent = options.label
    if (options.ariaLabel) button.setAttribute('aria-label', options.ariaLabel)
    if (options.title) button.title = options.title
    button.onclick = options.onClick
  }
}
