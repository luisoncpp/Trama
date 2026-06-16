import type Quill from 'quill'
import type TurndownService from 'turndown'
import { hydrateMarkdownImages } from '../../../../../../shared/markdown-image-placeholder'
import { LayoutDirectiveController } from './layout-directive-controller'
import { serializeEditorMarkdownFromRef } from '../../rich-markdown-editor-quill'

export function createFlush(
  editor: Quill,
  documentId: string,
  turndownRef: { current: TurndownService },
  lastEditorValueRef: { current: string },
  isApplyingExternalValueRef: { current: boolean },
  onChangeRef: { current: (value: string) => void },
): () => string | null {
  return (): string | null => {
    if (isApplyingExternalValueRef.current) return null
    const markdown = serializeEditorMarkdownFromRef(turndownRef, editor.root.innerHTML, documentId)
    lastEditorValueRef.current = markdown
    const markdownForParent = hydrateMarkdownImages(markdown, documentId)
    onChangeRef.current(markdownForParent)
    return markdown
  }
}

export function registerTextChangeHandler(
  editor: Quill,
  _documentId: string,
  isApplyingExternalValueRef: { current: boolean },
  onDirtyRef: { current: () => void },
  notifyContentMutated: () => void,
  flush: () => string | null,
): () => void {
  let debounceTimer: number | null = null

  editor.on('text-change', () => {
    if (isApplyingExternalValueRef.current) return
    LayoutDirectiveController.syncOnTextChange(editor)
    onDirtyRef.current()
    notifyContentMutated()
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
