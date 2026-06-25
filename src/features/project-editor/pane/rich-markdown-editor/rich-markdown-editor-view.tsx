// @Architecture(descriptionShort="Presentational rich editor shell: host element, find bar mount point, and tag")
import { TagHighlights } from './editor-session/editor-session-internals'
import type { EditorSession } from './editor-session/editor-session'

interface RichMarkdownEditorViewProps {
  session: EditorSession | null
  hostRef: { current: HTMLDivElement | null }
  shellRef: { current: HTMLDivElement | null }
}

function isFindBarEventTarget(shell: HTMLElement, target: EventTarget | null): boolean {
  if (!(target instanceof Node)) {
    return false
  }

  return shell.querySelector('.editor-findbar')?.contains(target) ?? false
}

export function RichMarkdownEditorView({ session, hostRef, shellRef }: RichMarkdownEditorViewProps) {
  const editor = session?.getEditor() ?? null
  const findBar = session?.getFindBar() ?? null
  const ctrlPressed = session?.isCtrlPressed() ?? false
  const tagMatches = session?.getTagMatches() ?? []
  const handleEditorMouseDown = session?.getHandleEditorMouseDown() ?? (() => {})

  const editorContainerRect = editor?.container.getBoundingClientRect() ?? null
  const shellRect = shellRef.current?.getBoundingClientRect() ?? null
  const tagOffsetTop = editorContainerRect && shellRect ? editorContainerRect.top - shellRect.top : 0
  const tagOffsetLeft = editorContainerRect && shellRect ? editorContainerRect.left - shellRect.left : 0

  const handleShellMouseDownCapture = (event: MouseEvent) => {
    const shell = event.currentTarget
    if (shell instanceof HTMLElement && isFindBarEventTarget(shell, event.target)) {
      return
    }

    handleEditorMouseDown(event)
  }

  return (
    <div ref={shellRef} class="rich-editor-shell w-full" onMouseDownCapture={handleShellMouseDownCapture}>
      <div ref={hostRef} class="rich-editor w-full" />
      {findBar}
      {ctrlPressed && editor && <TagHighlights matches={tagMatches} editor={editor} offsetTop={tagOffsetTop} offsetLeft={tagOffsetLeft} />}
    </div>
  )
}
