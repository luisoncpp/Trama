import { storeImageMap } from '../../../shared/markdown-image-placeholder'
import { ensureMarkdownEmbeddedImagesArePng } from '../project-editor-image-save'
import { expandBrokenForSave } from './document-content-session-private/document-content-broken-track'
import {
  forCanonicalCompare,
  forEditorLoad,
  hydrateImagePlaceholdersForSave,
} from './document-content-session-private/document-content-phases'

export class DocumentContentSession {
  constructor(private readonly documentPath: string) {}

  forEditorLoad(portableMarkdown: string): string {
    return forEditorLoad(portableMarkdown, this.documentPath)
  }

  forCanonicalCompare(markdown: string): string {
    return forCanonicalCompare(markdown, this.documentPath)
  }

  async forIpcSave(editorInternalMarkdown: string): Promise<string> {
    const hydrated = hydrateImagePlaceholdersForSave(editorInternalMarkdown, this.documentPath)
    const withBrokenRestored = expandBrokenForSave(hydrated)
    return ensureMarkdownEmbeddedImagesArePng(withBrokenRestored)
  }

  recordSerializedImageMap(imageMap: Map<string, string>): void {
    if (imageMap.size > 0) {
      storeImageMap(this.documentPath, imageMap)
    }
  }
}

const sessions = new Map<string, DocumentContentSession>()

export function getDocumentContentSession(documentPath: string): DocumentContentSession {
  let session = sessions.get(documentPath)
  if (!session) {
    session = new DocumentContentSession(documentPath)
    sessions.set(documentPath, session)
  }
  return session
}

export function clearDocumentContentSession(documentPath: string): void {
  sessions.delete(documentPath)
}
