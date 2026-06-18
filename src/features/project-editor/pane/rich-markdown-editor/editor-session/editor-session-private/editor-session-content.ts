import type Quill from 'quill'
import type TurndownService from 'turndown'
import { applyMarkdownToEditor, serializeEditorMarkdownFromRef } from '../../rich-markdown-editor-quill'
import {
  areEquivalentEditorValues,
  normalizeEditorDocumentValue,
} from '../../rich-markdown-editor-value-sync'
import { LayoutDirectiveController } from './layout-directive-controller'

/**
 * Owns the editor content loop: outbound debounced flush, inbound external apply,
 * canonical value tracking, and the isApplyingExternalValue apply-lock.
 */
export class EditorContentLoop {
  private readonly lastEditorValueRef: { current: string }
  private readonly isApplyingExternalValueRef: { current: boolean }
  private readonly lastAppliedForceApplyVersionRef: { current: number }
  private readonly cleanupTextChangeHandler: () => void

  constructor(params: {
    editor: Quill
    documentId: string
    initialValue: string
    turndownRef: { current: TurndownService }
    onChangeRef: { current: (value: string) => void }
    onDirtyRef: { current: () => void }
    notifyContentMutated: () => void
  }) {
    const { editor, documentId } = params
    this.lastEditorValueRef = { current: normalizeEditorDocumentValue(params.initialValue, documentId) }
    this.isApplyingExternalValueRef = { current: false }
    this.lastAppliedForceApplyVersionRef = { current: 0 }

    this.cleanupTextChangeHandler = this.registerTextChangeHandler(
      editor,
      params.onDirtyRef,
      params.notifyContentMutated,
      () => this.flush(editor, documentId, params.turndownRef, params.onChangeRef),
    )
  }

  flush(
    editor: Quill,
    documentId: string,
    turndownRef: { current: TurndownService },
    onChangeRef: { current: (value: string) => void },
  ): string | null {
    if (this.isApplyingExternalValueRef.current) return null
    const markdown = serializeEditorMarkdownFromRef(turndownRef, editor.root.innerHTML, documentId)
    this.lastEditorValueRef.current = markdown
    onChangeRef.current(markdown)
    return markdown
  }

  applyExternalValue(
    editor: Quill,
    documentId: string,
    value: string,
    forceApplyVersion: number,
    notifyContentMutated: () => void,
  ): void {
    const nextNormalized = normalizeEditorDocumentValue(value, documentId)
    const shouldForceApply = forceApplyVersion > this.lastAppliedForceApplyVersionRef.current
    if (!shouldForceApply && areEquivalentEditorValues(this.lastEditorValueRef.current, value, documentId)) {
      return
    }

    this.isApplyingExternalValueRef.current = true
    const selection = editor.getSelection()
    const scrollTop = editor.root.scrollTop
    const hadEditorFocus = editor.root === document.activeElement || editor.root.contains(document.activeElement)
    applyMarkdownToEditor(editor, value, 'silent', documentId)
    notifyContentMutated()
    if (selection) {
      editor.setSelection(selection.index, selection.length, 'silent')
    }
    if (hadEditorFocus) {
      editor.focus()
    }
    editor.root.scrollTop = scrollTop

    this.lastEditorValueRef.current = nextNormalized
    if (shouldForceApply) {
      this.lastAppliedForceApplyVersionRef.current = forceApplyVersion
    }
    window.setTimeout(() => {
      this.isApplyingExternalValueRef.current = false
    }, 0)
  }

  getCanonicalValue(): string {
    return this.lastEditorValueRef.current
  }

  dispose(): void {
    this.cleanupTextChangeHandler()
  }

  private registerTextChangeHandler(
    editor: Quill,
    onDirtyRef: { current: () => void },
    notifyContentMutated: () => void,
    flush: () => string | null,
  ): () => void {
    let debounceTimer: number | null = null

    editor.on('text-change', () => {
      if (this.isApplyingExternalValueRef.current) return
      LayoutDirectiveController.syncOnTextChange(editor)
      onDirtyRef.current()
      notifyContentMutated()
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = window.setTimeout(flush, 1000)
    })

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }
    }
  }
}
