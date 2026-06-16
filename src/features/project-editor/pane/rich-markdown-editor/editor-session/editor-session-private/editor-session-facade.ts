import type { TagMatch } from '../../../../project-editor-types.js'
import type { EditorSession } from '../editor-session-types.js'
import type { EditorSessionImpl } from './editor-session-lifecycle.js'

export interface EditorSessionRenderState {
  findBar: preact.JSX.Element | null
  ctrlPressed: boolean
  tagMatches: Array<TagMatch>
  handleEditorMouseDown: (e: MouseEvent) => void
}

export function buildEditorSessionFacade(
  lifecycleSession: EditorSessionImpl | null,
  hostRef: { current: HTMLDivElement | null },
  shellRef: { current: HTMLDivElement | null },
  renderState: EditorSessionRenderState,
): EditorSession | null {
  if (!lifecycleSession) return null
  return {
    flush: () => lifecycleSession.flush(),
    getEditor: () => lifecycleSession.getEditor(),
    getCanonicalValue: () => lifecycleSession.getCanonicalValue(),
    subscribeContentMutated: (cb) => lifecycleSession.subscribeContentMutated(cb),
    dispose: () => lifecycleSession.dispose(),
    getHostRef: () => hostRef,
    getShellRef: () => shellRef,
    getFindBar: () => renderState.findBar,
    getTagMatches: () => renderState.tagMatches,
    isCtrlPressed: () => renderState.ctrlPressed,
    getHandleEditorMouseDown: () => renderState.handleEditorMouseDown,
  }
}
