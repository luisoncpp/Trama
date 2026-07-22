// @Architecture(descriptionShort="Core Quill lifecycle class (`EditorSessionImpl`): initialize Quill, apply markdown,")
import type Quill from 'quill'
import type TurndownService from 'turndown'
import type { EditorSession as EditorSessionCore, HeadingRevealTarget, TagMatch } from '../../../../project-editor-types.js'
import { revealQuillHeading } from '../../../../document-contents/index.js'
import { WORKSPACE_CONTEXT_MENU_EVENT } from '../../../../../../shared/workspace-context-menu.js'
import { createTramaTurndownService, TurndownServiceFlags } from '../../../../../../shared/turndown-service-factory.js'
import { createQuillEditor, syncEditorSpellcheck, applyMarkdownToEditor } from '../../rich-markdown-editor-quill.js'
import { registerWorkspaceCommandListener } from '../../rich-markdown-editor-commands.js'
import { registerTypographyHandler } from '../../rich-markdown-editor-typography.js'
import { EditorContentLoop } from './editor-session-content.js'

export class EditorSessionImpl implements EditorSessionCore {
  private editor: Quill
  private host: HTMLDivElement
  private documentId: string
  private turndownRef: { current: TurndownService }
  private contentLoop: EditorContentLoop
  private onChangeRef: { current: (value: string) => void }
  private workspaceHandler: (event: Event) => void
  private contentMutatedSubscribers = new Set<() => void>()
  private disposed = false

  constructor(params: {
    host: HTMLDivElement
    documentId: string
    value: string
    spellcheckEnabled: boolean
    onChangeRef: { current: (value: string) => void }
    onDirtyRef: { current: () => void }
  }) {
    this.editor = createQuillEditor(params.host)
    this.host = params.host
    this.documentId = params.documentId
    this.turndownRef = { current: createTramaTurndownService(TurndownServiceFlags.None) }
    this.onChangeRef = params.onChangeRef

    syncEditorSpellcheck(this.editor, params.spellcheckEnabled)
    applyMarkdownToEditor(this.editor, params.value, 'silent', params.documentId)

    this.contentLoop = new EditorContentLoop({
      editor: this.editor,
      documentId: params.documentId,
      initialValue: params.value,
      turndownRef: this.turndownRef,
      onChangeRef: params.onChangeRef,
      onDirtyRef: params.onDirtyRef,
      notifyContentMutated: () => this.notifyContentMutated(),
    })

    this.workspaceHandler = registerWorkspaceCommandListener(this.editor, this.turndownRef)
    registerTypographyHandler(this.editor)
  }

  flush(): string | null {
    if (this.disposed) return null
    return this.contentLoop.flush(this.editor, this.documentId, this.turndownRef, this.onChangeRef)
  }

  revealHeading(target: HeadingRevealTarget): void {
    if (this.disposed) return
    revealQuillHeading(this.host, this.editor, target)
  }

  getEditor(): Quill | null {
    return this.disposed ? null : this.editor
  }

  getCanonicalValue(): string {
    return this.contentLoop.getCanonicalValue()
  }

  subscribeContentMutated(cb: () => void): () => void {
    this.contentMutatedSubscribers.add(cb)
    return () => { this.contentMutatedSubscribers.delete(cb) }
  }

  applyExternalValue(value: string, forceApplyVersion: number): void {
    if (this.disposed) return
    this.contentLoop.applyExternalValue(
      this.editor,
      this.documentId,
      value,
      forceApplyVersion,
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
    this.contentLoop.dispose()
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
