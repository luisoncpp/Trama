import type Quill from 'quill'
import type TurndownService from 'turndown'
import type { EditorSession as EditorSessionCore, TagMatch } from '../../../../project-editor-types.js'
import { WORKSPACE_CONTEXT_MENU_EVENT } from '../../../../../../shared/workspace-context-menu.js'
import { createTramaTurndownService, TurndownServiceFlags } from '../../../../../../shared/turndown-service-factory.js'
import { createQuillEditor, syncEditorSpellcheck, applyMarkdownToEditor } from '../../rich-markdown-editor-quill.js'
import { registerWorkspaceCommandListener } from '../../rich-markdown-editor-commands.js'
import { registerTypographyHandler } from '../../rich-markdown-editor-typography.js'
import { normalizeEditorDocumentValue } from '../../rich-markdown-editor-value-sync.js'
import { createFlush, registerTextChangeHandler } from './editor-session-serialization.js'
import { applyExternalValueToEditor } from './editor-session-external-sync.js'

export class EditorSessionImpl implements EditorSessionCore {
  private editor: Quill
  private documentId: string
  private lastEditorValueRef: { current: string }
  private isApplyingExternalValueRef: { current: boolean }
  private turndownRef: { current: TurndownService }
  private lastAppliedForceApplyVersionRef: { current: number }
  private cleanupTextChangeHandler: () => void
  private workspaceHandler: (event: Event) => void
  private contentMutatedSubscribers = new Set<() => void>()
  private disposed = false
  private flushFn: () => string | null

  constructor(params: {
    host: HTMLDivElement
    documentId: string
    value: string
    spellcheckEnabled: boolean
    onChangeRef: { current: (value: string) => void }
    onDirtyRef: { current: () => void }
  }) {
    this.editor = createQuillEditor(params.host)
    this.documentId = params.documentId
    this.lastEditorValueRef = { current: normalizeEditorDocumentValue(params.value, params.documentId) }
    this.isApplyingExternalValueRef = { current: false }
    this.turndownRef = { current: createTramaTurndownService(TurndownServiceFlags.None) }
    this.lastAppliedForceApplyVersionRef = { current: 0 }

    syncEditorSpellcheck(this.editor, params.spellcheckEnabled)
    applyMarkdownToEditor(this.editor, params.value, 'silent', params.documentId)

    this.flushFn = createFlush(
      this.editor,
      this.documentId,
      this.turndownRef,
      this.lastEditorValueRef,
      this.isApplyingExternalValueRef,
      params.onChangeRef,
    )

    this.cleanupTextChangeHandler = registerTextChangeHandler(
      this.editor,
      this.documentId,
      this.isApplyingExternalValueRef,
      params.onDirtyRef,
      () => this.notifyContentMutated(),
      () => this.flush(),
    )

    this.workspaceHandler = registerWorkspaceCommandListener(this.editor, this.turndownRef)
    registerTypographyHandler(this.editor)
  }

  flush(): string | null {
    if (this.disposed) return null
    return this.flushFn()
  }

  getEditor(): Quill | null {
    return this.disposed ? null : this.editor
  }

  getCanonicalValue(): string {
    return this.lastEditorValueRef.current
  }

  subscribeContentMutated(cb: () => void): () => void {
    this.contentMutatedSubscribers.add(cb)
    return () => { this.contentMutatedSubscribers.delete(cb) }
  }

  applyExternalValue(value: string, forceApplyVersion: number): void {
    if (this.disposed) return
    applyExternalValueToEditor(
      this.editor,
      this.documentId,
      value,
      forceApplyVersion,
      this.lastEditorValueRef,
      this.isApplyingExternalValueRef,
      this.lastAppliedForceApplyVersionRef,
      () => this.notifyContentMutated(),
    )
  }

  setDisabled(disabled: boolean, readOnlyPreview: boolean): void {
    if (this.disposed) return
    const editor = this.editor
    editor.enable(!(disabled || readOnlyPreview))
    if (readOnlyPreview) {
      editor.root.setAttribute('data-readonly-preview', 'true')
      editor.root.setAttribute('contenteditable', 'false')
      editor.root.spellcheck = false
      editor.root.setAttribute('spellcheck', 'false')
      return
    }

    editor.root.setAttribute('contenteditable', disabled ? 'false' : 'true')
    editor.root.removeAttribute('data-readonly-preview')
  }

  setSpellcheckEnabled(enabled: boolean): void {
    if (this.disposed) return
    syncEditorSpellcheck(this.editor, enabled)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.cleanupTextChangeHandler()
    window.removeEventListener(WORKSPACE_CONTEXT_MENU_EVENT, this.workspaceHandler as EventListener)
  }

  getHostRef(): { current: HTMLDivElement | null } {
    return { current: null }
  }

  getShellRef(): { current: HTMLDivElement | null } {
    return { current: null }
  }

  getFindBar(): preact.JSX.Element | null {
    return null
  }

  getTagMatches(): Array<TagMatch> {
    return []
  }

  isCtrlPressed(): boolean {
    return false
  }

  getHandleEditorMouseDown(): (e: MouseEvent) => void {
    return () => {}
  }

  private notifyContentMutated(): void {
    for (const cb of this.contentMutatedSubscribers) {
      cb()
    }
  }
}
