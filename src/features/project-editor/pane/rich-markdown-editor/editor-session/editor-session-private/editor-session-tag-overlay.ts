// @Architecture(descriptionShort="Tag overlay interaction hook cluster: Ctrl/Cmd state, overlay match recomputation,")
import type Quill from 'quill'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { TagMatch } from './editor-session-tag-helpers'
import { findTagMatchesInText, filterMatchesOutsideCode } from './editor-session-tag-helpers'
import type { EditorSession } from '../editor-session.js'
import { useCtrlKeyState } from './editor-session-ctrl-key'
import { buildTagOverlayMatches, findMatchAtPosition } from './editor-session-tag-math'

interface UseTagOverlayParams {
  editorRef: { current: Quill | null }
  tagIndex: Record<string, string> | null
  ctrlPressed: boolean
  tagOverlayRecalcRef: { current: boolean }
  tagOverlayMatchesRef: { current: TagMatch[] }
}

export function useTagOverlay({ editorRef, tagIndex, ctrlPressed, tagOverlayRecalcRef, tagOverlayMatchesRef }: UseTagOverlayParams): TagMatch[] {
  const editor = editorRef.current
  if (!editor || !tagIndex || Object.keys(tagIndex).length === 0) {
    return []
  }

  if (ctrlPressed) {
    if (tagOverlayRecalcRef.current || tagOverlayMatchesRef.current.length === 0) {
      const text = editor.getText()
      const allMatches = findTagMatchesInText(text, tagIndex)
      tagOverlayMatchesRef.current = filterMatchesOutsideCode(text, allMatches)
      tagOverlayRecalcRef.current = false
    }
  }

  return tagOverlayMatchesRef.current
}

export function useRichEditorOverlay(
  editorRef: { current: Quill | null },
  tagIndex: Record<string, string> | null,
  session: EditorSession | null,
  onTagClick?: (filePath: string) => void,
) {
  const ctrlPressed = useCtrlKeyState()
  const [, setTagScrollTick] = useState(0)
  const recalcRef = useRef(true)
  const matchesRef = useRef<TagMatch[]>([])

  useEffect(/* recalcOnSessionChange */ () => {
    if (!session) return
    recalcRef.current = true
    setTagScrollTick((t) => t + 1)
    return session.subscribeContentMutated(() => {
      recalcRef.current = true
      setTagScrollTick((t) => t + 1)
    })
  }, [session])

  const tagMatches = useTagOverlay({
    editorRef,
    tagIndex,
    ctrlPressed,
    tagOverlayRecalcRef: recalcRef,
    tagOverlayMatchesRef: matchesRef,
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
