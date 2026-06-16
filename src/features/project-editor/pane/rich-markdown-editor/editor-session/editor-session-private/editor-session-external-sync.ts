import type Quill from 'quill'
import { applyMarkdownToEditor } from '../../rich-markdown-editor-quill'
import { areEquivalentEditorValues, normalizeEditorDocumentValue } from '../../rich-markdown-editor-value-sync'

export function applyExternalValueToEditor(
  editor: Quill,
  documentId: string | null,
  value: string,
  forceApplyVersion: number,
  lastEditorValueRef: { current: string },
  isApplyingExternalValueRef: { current: boolean },
  lastAppliedForceApplyVersionRef: { current: number },
  notifyContentMutated: () => void,
): void {
  const nextNormalized = normalizeEditorDocumentValue(value, documentId)
  const shouldForceApply = forceApplyVersion > lastAppliedForceApplyVersionRef.current
  if (!shouldForceApply && areEquivalentEditorValues(lastEditorValueRef.current, value, documentId)) return

  isApplyingExternalValueRef.current = true
  const selection = editor.getSelection()
  const scrollTop = editor.root.scrollTop
  applyMarkdownToEditor(editor, value, 'silent', documentId ?? undefined)
  notifyContentMutated()
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
}
