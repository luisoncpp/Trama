import { useEffect, useRef } from 'preact/hooks'
import type Quill from 'quill'
import { applyMarkdownToEditor } from './rich-markdown-editor-quill'
import { areEquivalentEditorValues, normalizeEditorDocumentValue } from './rich-markdown-editor-value-sync'

interface UseSyncExternalValueParams {
  documentId: string | null
  value: string
  forceApplyVersion: number
  editorRef: { current: Quill | null }
  lastEditorValueRef: { current: string }
  isApplyingExternalValueRef: { current: boolean }
  tagOverlayRecalcRef?: { current: boolean }
  triggerRender?: () => void
}

export function useSyncExternalValue({
  documentId,
  value,
  forceApplyVersion,
  editorRef,
  lastEditorValueRef,
  isApplyingExternalValueRef,
  tagOverlayRecalcRef,
  triggerRender,
}: UseSyncExternalValueParams): void {
  const lastAppliedForceApplyVersionRef = useRef(0)
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const nextNormalized = normalizeEditorDocumentValue(value, documentId)
    const shouldForceApply = forceApplyVersion > lastAppliedForceApplyVersionRef.current
    if (!shouldForceApply && areEquivalentEditorValues(lastEditorValueRef.current, value, documentId)) return

    isApplyingExternalValueRef.current = true
    const selection = editor.getSelection()
    const scrollTop = editor.root.scrollTop
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
    editor.root.scrollTop = scrollTop

    lastEditorValueRef.current = nextNormalized
    if (shouldForceApply) {
      lastAppliedForceApplyVersionRef.current = forceApplyVersion
    }
    window.setTimeout(() => {
      isApplyingExternalValueRef.current = false
    }, 0)
  }, [documentId, editorRef, isApplyingExternalValueRef, lastEditorValueRef, value, forceApplyVersion, tagOverlayRecalcRef, triggerRender])
}
