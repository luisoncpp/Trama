import { useEffect } from 'preact/hooks'
import type Quill from 'quill'
import { applyMarkdownToEditor } from './rich-markdown-editor-quill'
import { areEquivalentEditorValues, normalizeEditorDocumentValue } from './rich-markdown-editor-value-sync'

interface UseSyncExternalValueParams {
  documentId: string | null
  value: string
  editorRef: { current: Quill | null }
  lastEditorValueRef: { current: string }
  isApplyingExternalValueRef: { current: boolean }
  tagOverlayRecalcRef?: { current: boolean }
  triggerRender?: () => void
}

export function useSyncExternalValue({
  documentId,
  value,
  editorRef,
  lastEditorValueRef,
  isApplyingExternalValueRef,
  tagOverlayRecalcRef,
  triggerRender,
}: UseSyncExternalValueParams): void {
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const nextNormalized = normalizeEditorDocumentValue(value, documentId)
    if (areEquivalentEditorValues(lastEditorValueRef.current, value, documentId)) return

    isApplyingExternalValueRef.current = true
    const selection = editor.getSelection()
    applyMarkdownToEditor(editor, value, 'silent', documentId ?? undefined)
    if (tagOverlayRecalcRef) {
      tagOverlayRecalcRef.current = true
    }
    if (triggerRender) {
      triggerRender()
    }
    if (selection) {
      editor.setSelection(selection)
    }

    lastEditorValueRef.current = nextNormalized
    window.setTimeout(() => {
      isApplyingExternalValueRef.current = false
    }, 0)
  }, [documentId, editorRef, isApplyingExternalValueRef, lastEditorValueRef, value, tagOverlayRecalcRef, triggerRender])
}