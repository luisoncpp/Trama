import { useEffect, useState } from 'preact/hooks'
import Quill from 'quill'
import { buildTagOverlayMatches, useTagOverlay, findMatchAtPosition } from './rich-markdown-editor-tag-overlay'
import { useCtrlKeyState } from './rich-markdown-editor-ctrl-key'
import type { EditorSerializationRefs } from '../../project-editor-types'

export function useRichEditorOverlay(
  editorRef: { current: Quill | null },
  tagIndex: Record<string, string> | null,
  serializationRef: { current: EditorSerializationRefs },
  onTagClick?: (filePath: string) => void,
) {
  const ctrlPressed = useCtrlKeyState()
  const [, setTagScrollTick] = useState(0)
  const tagMatches = useTagOverlay({
    editorRef,
    tagIndex,
    ctrlPressed,
    tagOverlayRecalcRef: serializationRef.current.tagOverlayRecalcRef,
    tagOverlayMatchesRef: serializationRef.current.tagOverlayMatchesRef,
  })
  const handleEditorMouseDown = useTagClickHandler(editorRef, tagIndex, onTagClick)
  useTagOverlayScrollEffect(ctrlPressed, editorRef, setTagScrollTick)
  return { ctrlPressed, tagMatches, handleEditorMouseDown }
}

function useTagClickHandler(
  editorRef: { current: Quill | null },
  tagIndex: Record<string, string> | null,
  onTagClick?: (filePath: string) => void,
) {
  return (e: MouseEvent) => {
    const isModifierClick = e.ctrlKey || e.metaKey
    if (!isModifierClick || !onTagClick) return

    const editor = editorRef.current
    if (!editor) return

    const availableMatches = tagIndex && Object.keys(tagIndex).length > 0
      ? buildTagOverlayMatches(editor, tagIndex)
      : []
    if (availableMatches.length === 0) return

    const rect = editor.container.getBoundingClientRect()
    const match = findMatchAtPosition(availableMatches, e.clientX, e.clientY, rect)
    if (!match) return
    e.preventDefault()
    onTagClick(match.filePath)
  }
}

function useTagOverlayScrollEffect(
  ctrlPressed: boolean,
  editorRef: { current: Quill | null },
  setTagScrollTick: (f: (t: number) => number) => void,
) {
  useEffect(() => {
    if (!ctrlPressed || !editorRef.current) return
    const container = editorRef.current.container
    const onScroll = () => setTagScrollTick((t) => t + 1)
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => { container.removeEventListener('scroll', onScroll) }
  }, [ctrlPressed, editorRef.current, setTagScrollTick])
}
