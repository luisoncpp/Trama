import { stripBase64ImagesFromMarkdown } from '../../../shared/markdown-image-placeholder'
import { normalizeMarkdown } from './rich-markdown-editor-quill'

export function normalizeEditorDocumentValue(value: string, documentId: string | null): string {
  const { markdownWithoutImages } = stripBase64ImagesFromMarkdown(value, documentId ?? undefined)
  return normalizeMarkdown(markdownWithoutImages)
}

export function areEquivalentEditorValues(
  left: string,
  right: string,
  documentId: string | null,
): boolean {
  return normalizeEditorDocumentValue(left, documentId) === normalizeEditorDocumentValue(right, documentId)
}
