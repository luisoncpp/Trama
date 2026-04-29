import { useEffect } from 'preact/hooks'
import type Quill from 'quill'
import type TurndownService from 'turndown'
import { registerTypographyHandler } from './rich-markdown-editor-typography'
import { WORKSPACE_CONTEXT_MENU_EVENT } from '../../../shared/workspace-context-menu'
import { registerWorkspaceCommandListener } from './rich-markdown-editor-commands'
import { createQuillEditor, applyMarkdownToEditor, syncEditorSpellcheck } from './rich-markdown-editor-quill'
import { registerEditorTextChangeHandler } from './rich-markdown-editor-serialization'
import { useSyncExternalValue } from './rich-markdown-editor-external-sync'
import { normalizeEditorDocumentValue } from './rich-markdown-editor-value-sync'
import type { EditorSerializationRefs } from '../project-editor-types'

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
    lastEditorValueRef.current = normalizeEditorDocumentValue(value, documentId)
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