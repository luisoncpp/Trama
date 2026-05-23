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

export function RichMarkdownEditorView({
  shellRef, hostRef, findBar, ctrlPressed, tagIndex, editorRef, tagMatches, handleEditorMouseDown,
}: RichMarkdownEditorViewProps) {
  const editorContainerRect = editorRef.current?.container.getBoundingClientRect() ?? null
  const shellRect = shellRef.current?.getBoundingClientRect() ?? null
  const tagOffsetTop = editorContainerRect && shellRect ? editorContainerRect.top - shellRect.top : 0
  const tagOffsetLeft = editorContainerRect && shellRect ? editorContainerRect.left - shellRect.left : 0

  return (
    <div ref={shellRef} class="rich-editor-shell w-full" onMouseDownCapture={handleEditorMouseDown}>
      <div ref={hostRef} class="rich-editor w-full" />
      {findBar}
      {ctrlPressed && tagIndex && editorRef.current && <TagHighlights matches={tagMatches} editor={editorRef.current} offsetTop={tagOffsetTop} offsetLeft={tagOffsetLeft} />}
    </div>
  )
}
