import type Quill from 'quill'
import type TurndownService from 'turndown'
import type { EditorSerializationRefs } from '../project-editor-types'
import { hydrateMarkdownImages } from '../../../shared/markdown-image-placeholder'
import { syncCenteredLayoutArtifacts } from './rich-markdown-editor-layout-centering'
import { serializeEditorMarkdownFromRef } from './rich-markdown-editor-quill'

export function registerEditorTextChangeHandler({
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
    const markdownForParent = hydrateMarkdownImages(markdown, documentId)
    onChangeRef.current(markdownForParent)
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