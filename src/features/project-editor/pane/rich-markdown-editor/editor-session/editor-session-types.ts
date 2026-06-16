import type Quill from 'quill'
import type { EditorSession as EditorSessionCore, TagMatch } from '../../../project-editor-types.js'

export interface EditorSession extends EditorSessionCore {
  getEditor(): Quill | null
  getCanonicalValue(): string
  subscribeContentMutated(cb: () => void): () => void
  dispose(): void
  getHostRef(): { current: HTMLDivElement | null }
  getShellRef(): { current: HTMLDivElement | null }
  getFindBar(): preact.JSX.Element | null
  getTagMatches(): Array<TagMatch>
  isCtrlPressed(): boolean
  getHandleEditorMouseDown(): (e: MouseEvent) => void
}
