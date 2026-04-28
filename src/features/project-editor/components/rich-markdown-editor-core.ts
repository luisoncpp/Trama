import { useEffect } from 'preact/hooks'
import type Quill from 'quill'
import type TurndownService from 'turndown'
import { registerTypographyHandler } from './rich-markdown-editor-typography'
import { WORKSPACE_CONTEXT_MENU_EVENT } from '../../../shared/workspace-context-menu'
import { registerWorkspaceCommandListener } from './rich-markdown-editor-commands'
import { syncCenteredLayoutArtifacts } from './rich-markdown-editor-layout-centering'
import { createQuillEditor, normalizeMarkdown, applyMarkdownToEditor, syncEditorSpellcheck, serializeEditorMarkdownFromRef } from './rich-markdown-editor-quill'
import { stripBase64ImagesFromMarkdown } from '../../../shared/markdown-image-placeholder'
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

function normalizeEditorMarkdown(value: string, documentId: string | null): string {
  const { markdownWithoutImages } = stripBase64ImagesFromMarkdown(value, documentId ?? undefined)
  return normalizeMarkdown(markdownWithoutImages)
}

function registerEditorTextChangeHandler({
  editor, documentId, isApplyingExternalValueRef,
  turndownRef, lastEditorValueRef, onChangeRef, onDirtyRef, serializationRef,
}: {
  editor: Quill; documentId: string; isApplyingExternalValueRef: { current: boolean }
  turndownRef: { current: TurndownService }
  lastEditorValueRef: { current: string }; onChangeRef: { current: (value: string) => void }
  onDirtyRef: { current: () => void }; serializationRef: { current: EditorSerializationRefs }
}): () => void {
  let debounceTimer: number | null = null
  const flush = (): string | null => {
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null }
    if (isApplyingExternalValueRef.current) return null
    const markdown = serializeEditorMarkdownFromRef(turndownRef, editor.root.innerHTML, documentId)
    lastEditorValueRef.current = markdown
    onChangeRef.current(markdown)
    return markdown
  }
  serializationRef.current.flush = flush
  editor.on('text-change', () => {
    if (isApplyingExternalValueRef.current) return
    syncCenteredLayoutArtifacts(editor)
    onDirtyRef.current()
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(flush, 1000)
  })
  return () => { if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null } }
}

function useInitializeEditor({
  documentId, value, spellcheckEnabled, hostRef, editorRef,
  isApplyingExternalValueRef, lastEditorValueRef,
  turndownRef, onChangeRef, serializationRef, onDirtyRef,
}: Omit<UseRichEditorLifecycleParams, 'disabled'>): void {
  useEffect(/* initializeEditor */ () => {
    const host = hostRef.current
    if (!host) return
    const editor = createQuillEditor(host)
    editorRef.current = editor
    syncEditorSpellcheck(editor, spellcheckEnabled)
    applyMarkdownToEditor(editor, value, 'silent', documentId ?? undefined)
    lastEditorValueRef.current = normalizeEditorMarkdown(value, documentId)
    const cleanupHandler = registerEditorTextChangeHandler({
      editor, documentId: documentId ?? '', isApplyingExternalValueRef,
      turndownRef, lastEditorValueRef, onChangeRef, onDirtyRef, serializationRef,
    })
    const workspaceHandler = registerWorkspaceCommandListener(editor, turndownRef)
    registerTypographyHandler(editor)
    return () => {
      cleanupHandler()
      window.removeEventListener(WORKSPACE_CONTEXT_MENU_EVENT, workspaceHandler as EventListener)
      editorRef.current = null
    }
  }, [documentId, editorRef, hostRef, isApplyingExternalValueRef, lastEditorValueRef, onChangeRef, turndownRef, serializationRef, onDirtyRef] /*Inputs for initializeEditor*/)
}

function useSyncExternalValue({
  documentId, value, editorRef, lastEditorValueRef, isApplyingExternalValueRef,
}: {
  documentId: string | null
  value: string; editorRef: { current: Quill | null }; lastEditorValueRef: { current: string }
  isApplyingExternalValueRef: { current: boolean }
}): void {
  useEffect(/* syncExternalValue */ () => {
    const editor = editorRef.current
    if (!editor) return
    const nextNormalized = normalizeEditorMarkdown(value, documentId)
    if (lastEditorValueRef.current === nextNormalized) return
    isApplyingExternalValueRef.current = true
    const selection = editor.getSelection()
    applyMarkdownToEditor(editor, value, 'silent', documentId ?? undefined)
    if (selection) { editor.setSelection(selection) }
    lastEditorValueRef.current = nextNormalized
    window.setTimeout(() => { isApplyingExternalValueRef.current = false }, 0)
  }, [documentId, editorRef, isApplyingExternalValueRef, lastEditorValueRef, value] /*Inputs for syncExternalValue*/)
}

export function useRichEditorLifecycle(params: UseRichEditorLifecycleParams): void {
  const p = params
  useInitializeEditor({
    documentId: p.documentId, value: p.value, spellcheckEnabled: p.spellcheckEnabled,
    hostRef: p.hostRef, editorRef: p.editorRef, isApplyingExternalValueRef: p.isApplyingExternalValueRef,
    lastEditorValueRef: p.lastEditorValueRef, turndownRef: p.turndownRef, onChangeRef: p.onChangeRef,
    serializationRef: p.serializationRef, onDirtyRef: p.onDirtyRef,
  })

  useSyncExternalValue({
    documentId: p.documentId, value: p.value, editorRef: p.editorRef, lastEditorValueRef: p.lastEditorValueRef,
    isApplyingExternalValueRef: p.isApplyingExternalValueRef,
  })

  useEffect(/* toggleDisabled */ () => {
    const editor = p.editorRef.current
    if (!editor) return
    editor.enable(!p.disabled)
  }, [p.disabled, p.documentId, p.editorRef] /*Inputs for toggleDisabled*/)

  useEffect(/* syncSpellcheckEnabled */ () => {
    const editor = p.editorRef.current
    if (!editor) return
    syncEditorSpellcheck(editor, p.spellcheckEnabled)
  }, [p.documentId, p.editorRef, p.spellcheckEnabled] /*Inputs for syncSpellcheckEnabled*/)
}