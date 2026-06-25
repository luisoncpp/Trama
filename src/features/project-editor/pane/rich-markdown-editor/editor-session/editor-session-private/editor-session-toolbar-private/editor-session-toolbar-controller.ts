// @Architecture(descriptionShort="Private toolbar controller class: owns toolbar state synchronization for layout")
import {
  isEditorInteractive,
  normalizeZoomValue,
  type RichEditorSyncState,
} from './editor-session-toolbar-helpers'
import { LayoutDirectiveController } from '../layout-directive-controller'
import { attachToolbarElements, type ToolbarElements } from './editor-session-toolbar-dom'

import type { EditorSession } from '../../editor-session'

export interface SyncToolbarControlsParams {
  documentId: string | null
  hostRef: { current: HTMLDivElement | null }
  session: EditorSession | null
  historyBackDisabled: boolean
  onHistoryBack: () => void
  saveDisabled: boolean
  saveLabel: string
  onSaveNow: () => void
  revertDisabled: boolean
  revertLabel: string
  onRevertNow: () => void
  previewRestoreDisabled?: boolean
  previewRestoreLabel?: string
  onPreviewRestore?: () => void
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
    this.syncLayoutButtons(params.session)
    this.syncDocumentControls(params)
    this.syncZoom(params.zoomLevel, params.onZoomChange)
  }

  private attach(toolbar: HTMLElement): void {
    this.toolbar = toolbar
    this.elements = attachToolbarElements(toolbar)
  }

  private syncLayoutButtons(session: EditorSession | null): void {
    if (!this.elements) return
    const currentEditor = session?.getEditor()
    const canUseLayoutActions = isEditorInteractive(currentEditor ?? null)
    this.elements.centerButton.disabled = !canUseLayoutActions
    this.elements.centerButton.onclick = () => {
      const editor = session?.getEditor()
      if (!editor) return
      editor.focus()
      LayoutDirectiveController.toggleCenter(editor)
    }
    this.elements.pagebreakButton.disabled = !canUseLayoutActions
    this.elements.pagebreakButton.onclick = () => {
      const editor = session?.getEditor()
      if (!editor) return
      editor.focus()
      LayoutDirectiveController.insertPagebreak(editor)
    }
  }

  private syncDocumentControls(params: SyncToolbarControlsParams): void {
    if (!this.elements) return
    const isPreview = params.syncState === 'preview'
    this.elements.toolbarRight.replaceChildren(...(isPreview
      ? [this.elements.restoreButton]
      : [this.elements.revertButton, this.elements.saveButton]))
    this.syncButton(this.elements.historyBackButton, {
      disabled: params.historyBackDisabled,
      title: 'Previous Document',
      ariaLabel: 'Previous Document',
      onClick: params.onHistoryBack,
    })
    this.syncButton(this.elements.revertButton, {
      disabled: params.revertDisabled || isPreview,
      title: params.revertLabel,
      ariaLabel: params.revertLabel,
      onClick: params.onRevertNow,
    })
    this.syncButton(this.elements.saveButton, {
      disabled: params.saveDisabled || isPreview,
      title: params.saveLabel,
      ariaLabel: params.saveLabel,
      onClick: params.onSaveNow,
    })
    this.syncButton(this.elements.restoreButton, {
      disabled: !isPreview || Boolean(params.previewRestoreDisabled),
      title: params.previewRestoreLabel ?? 'Restore revision',
      ariaLabel: params.previewRestoreLabel ?? 'Restore revision',
      onClick: params.onPreviewRestore ?? (() => {}),
    })
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
    options: { disabled: boolean; ariaLabel?: string; title?: string; onClick: () => void },
  ): void {
    button.disabled = options.disabled
    if (options.ariaLabel) button.setAttribute('aria-label', options.ariaLabel)
    if (options.title) button.title = options.title
    button.onclick = options.onClick
  }
}
