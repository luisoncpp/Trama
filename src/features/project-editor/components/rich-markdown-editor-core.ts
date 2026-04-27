import { useEffect } from 'preact/hooks'
import type Quill from 'quill'
import type TurndownService from 'turndown'
import { registerTypographyHandler } from './rich-markdown-editor-typography'
import { WORKSPACE_CONTEXT_MENU_EVENT } from '../../../shared/workspace-context-menu'
import { registerWorkspaceCommandListener } from './rich-markdown-editor-commands'
import { syncCenteredLayoutArtifacts } from './rich-markdown-editor-layout-centering'
import { createQuillEditor, normalizeMarkdown, applyMarkdownToEditor, syncEditorSpellcheck, serializeEditorMarkdownFromRef } from './rich-markdown-editor-quill'
import type { EditorSerializationRefs } from '../project-editor-types'

export { normalizeMarkdown }

interface UseRichEditorLifecycleParams {
  documentId: string | null
  value: string
  disabled: boolean
  spellcheckEnabled: boolean
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  onChangeRef: { current: (value: string) => void }
  lastEditorValueRef: { current: string }
  isApplyingExternalValueRef: { current: boolean }
  turndownRef: { current: TurndownService }
  serializationRef: { current: EditorSerializationRefs }
  onDirtyRef: { current: () => void }
}

function registerEditorTextChangeHandler({
  editor,
  documentId,
  isApplyingExternalValueRef,
  turndownRef,
  lastEditorValueRef,
  onChangeRef,
  onDirtyRef,
  serializationRef,
}: {
  editor: Quill
  documentId: string
  isApplyingExternalValueRef: { current: boolean }
  turndownRef: { current: TurndownService }
  lastEditorValueRef: { current: string }
  onChangeRef: { current: (value: string) => void }
  onDirtyRef: { current: () => void }
  serializationRef: { current: EditorSerializationRefs }
}): () => void {
  let debounceTimer: number | null = null

  // flush is a closure over the EXACT editor and documentId captured at registration time.
  const flush = (): string | null => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (isApplyingExternalValueRef.current) return null
    const markdown = serializeEditorMarkdownFromRef(turndownRef, editor.root.innerHTML, documentId)
    // Update lastEditorValueRef BEFORE onChange so useSyncExternalValue skips re-application.
    lastEditorValueRef.current = markdown
    onChangeRef.current(markdown)
    return markdown
  }

  // Mutate the existing object so the parent ref sees the update.
  serializationRef.current.flush = flush

  editor.on('text-change', () => {
    if (isApplyingExternalValueRef.current) return
    syncCenteredLayoutArtifacts(editor)
    onDirtyRef.current()
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

function useInitializeEditor({
  documentId,
  value,
  spellcheckEnabled,
  hostRef,
  editorRef,
  isApplyingExternalValueRef,
  lastEditorValueRef,
  turndownRef,
  onChangeRef,
  serializationRef,
  onDirtyRef,
}: Omit<UseRichEditorLifecycleParams, 'disabled'>): void {
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const editor = createQuillEditor(host)
    editorRef.current = editor
    syncEditorSpellcheck(editor, spellcheckEnabled)
    applyMarkdownToEditor(editor, value, 'silent')
    lastEditorValueRef.current = normalizeMarkdown(value)
    const cleanupHandler = registerEditorTextChangeHandler({
      editor,
      documentId: documentId ?? '',
      isApplyingExternalValueRef,
      turndownRef,
      lastEditorValueRef,
      onChangeRef,
      onDirtyRef,
      serializationRef,
    })
    const workspaceHandler = registerWorkspaceCommandListener(editor, turndownRef)
    registerTypographyHandler(editor)
  return () => {
    cleanupHandler()
    window.removeEventListener(WORKSPACE_CONTEXT_MENU_EVENT, workspaceHandler as EventListener)
    editorRef.current = null
  }
  }, [documentId, editorRef, hostRef, isApplyingExternalValueRef, lastEditorValueRef, onChangeRef, turndownRef, serializationRef, onDirtyRef])
}

function useSyncExternalValue({
  value,
  editorRef,
  lastEditorValueRef,
  isApplyingExternalValueRef,
}: {
  value: string
  editorRef: { current: Quill | null }
  lastEditorValueRef: { current: string }
  isApplyingExternalValueRef: { current: boolean }
}): void {
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const nextNormalized = normalizeMarkdown(value)
    if (lastEditorValueRef.current === nextNormalized) return
    isApplyingExternalValueRef.current = true
    const selection = editor.getSelection()
    applyMarkdownToEditor(editor, value, 'silent')
    if (selection) { editor.setSelection(selection) }
    lastEditorValueRef.current = nextNormalized
    window.setTimeout(() => { isApplyingExternalValueRef.current = false }, 0)
  }, [editorRef, isApplyingExternalValueRef, lastEditorValueRef, value])
}

function useToggleDisabled({
  documentId,
  disabled,
  editorRef,
}: Pick<UseRichEditorLifecycleParams, 'documentId' | 'disabled' | 'editorRef'>): void {
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.enable(!disabled)
  }, [disabled, documentId, editorRef])
}

function useSyncSpellcheckEnabled({
  documentId,
  spellcheckEnabled,
  editorRef,
}: Pick<UseRichEditorLifecycleParams, 'documentId' | 'spellcheckEnabled' | 'editorRef'>): void {
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    syncEditorSpellcheck(editor, spellcheckEnabled)
  }, [documentId, editorRef, spellcheckEnabled])
}

export function useRichEditorLifecycle(params: UseRichEditorLifecycleParams): void {
  const {
    documentId,
    value,
    disabled,
    spellcheckEnabled,
    hostRef,
    editorRef,
    onChangeRef,
    lastEditorValueRef,
    isApplyingExternalValueRef,
    turndownRef,
    serializationRef,
    onDirtyRef,
  } = params

  useInitializeEditor({
    documentId,
    value,
    spellcheckEnabled,
    hostRef,
    editorRef,
    isApplyingExternalValueRef,
    lastEditorValueRef,
    turndownRef,
    onChangeRef,
    serializationRef,
    onDirtyRef,
  })

  useSyncExternalValue({
    value,
    editorRef,
    lastEditorValueRef,
    isApplyingExternalValueRef,
  })
  useToggleDisabled({ documentId, disabled, editorRef })
  useSyncSpellcheckEnabled({ documentId, spellcheckEnabled, editorRef })
}
