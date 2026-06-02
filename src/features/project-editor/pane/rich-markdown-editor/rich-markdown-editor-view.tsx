import Quill from 'quill'
import { TagHighlights } from './rich-markdown-editor-tag-highlights'

type TagOverlayMatch = { tag: string; start: number; end: number; filePath: string }

interface RichMarkdownEditorViewProps {
  shellRef: { current: HTMLDivElement | null }
  hostRef: { current: HTMLDivElement | null }
  findBar: preact.JSX.Element | null
  ctrlPressed: boolean
  tagIndex: Record<string, string> | null | undefined
  editorRef: { current: Quill | null }
  tagMatches: Array<TagOverlayMatch>
  handleEditorMouseDown: (e: MouseEvent) => void
}

function isFindBarEventTarget(shell: HTMLElement, target: EventTarget | null): boolean {
  if (!(target instanceof Node)) {
    return false
  }

  return shell.querySelector('.editor-findbar')?.contains(target) ?? false
}

export function RichMarkdownEditorView({
  shellRef, hostRef, findBar, ctrlPressed, tagIndex, editorRef, tagMatches, handleEditorMouseDown,
}: RichMarkdownEditorViewProps) {
  const editorContainerRect = editorRef.current?.container.getBoundingClientRect() ?? null
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
      {ctrlPressed && tagIndex && editorRef.current && <TagHighlights matches={tagMatches} editor={editorRef.current} offsetTop={tagOffsetTop} offsetLeft={tagOffsetLeft} />}
    </div>
  )
}
