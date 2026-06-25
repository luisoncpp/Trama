// @Architecture(descriptionShort="Canonical editor-value helpers: normalize image-bearing markdown into placeholder form")
import { getDocumentContentSession } from '../../document-content/document-content-session'

function normalizeMarkdown(value: string): string {
  return value.replace(/\r\n/g, '\n').trimEnd()
}

export function normalizeEditorDocumentValue(value: string, documentId: string | null): string {
  if (!documentId) {
    return normalizeMarkdown(value)
  }
  return getDocumentContentSession(documentId).forCanonicalCompare(value)
}

export function areEquivalentEditorValues(
  left: string,
  right: string,
  documentId: string | null,
): boolean {
  return normalizeEditorDocumentValue(left, documentId) === normalizeEditorDocumentValue(right, documentId)
}
