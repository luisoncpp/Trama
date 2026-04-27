import { useEffect } from 'preact/hooks'
import type Quill from 'quill'
import { normalizeMarkdown, applyMarkdownToEditor, syncEditorSpellcheck } from './rich-markdown-editor-quill'

interface UseSyncExternalValueParams {
  value: string
  editorRef: { current: Quill | null }
  lastEditorValueRef: { current: string }
  isApplyingExternalValueRef: { current: boolean }
}

export function useSyncExternalValue({
  value,
  editorRef,
  lastEditorValueRef,
  isApplyingExternalValueRef,
}: UseSyncExternalValueParams): void {
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const nextNormalized = normalizeMarkdown(value)
    if (lastEditorValueRef.current === nextNormalized) return

    isApplyingExternalValueRef.current = true
    const selection = editor.getSelection()
    applyMarkdownToEditor(editor, value, 'silent')
    if (selection) {
      editor.setSelection(selection)
    }

    lastEditorValueRef.current = nextNormalized
    window.setTimeout(() => {
      isApplyingExternalValueRef.current = false
    }, 0)
  }, [editorRef, isApplyingExternalValueRef, lastEditorValueRef, value])
}

interface UseToggleDisabledParams {
  documentId: string | null
  disabled: boolean
  editorRef: { current: Quill | null }
}

export function useToggleDisabled({
  documentId,
  disabled,
  editorRef,
}: UseToggleDisabledParams): void {
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.enable(!disabled)
  }, [disabled, documentId, editorRef])
}

interface UseSyncSpellcheckEnabledParams {
  documentId: string | null
  spellcheckEnabled: boolean
  editorRef: { current: Quill | null }
}

export function useSyncSpellcheckEnabled({
  documentId,
  spellcheckEnabled,
  editorRef,
}: UseSyncSpellcheckEnabledParams): void {
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    syncEditorSpellcheck(editor, spellcheckEnabled)
  }, [documentId, editorRef, spellcheckEnabled])
}
