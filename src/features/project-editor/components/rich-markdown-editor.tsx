import { useRef } from 'preact/hooks'
import TurndownService from 'turndown'
import Quill from 'quill'
import { normalizeMarkdown, useRichEditorLifecycle } from './rich-markdown-editor-core'
import { useRichEditorFind } from './rich-markdown-editor-find'
import { useFocusModeScopeEffect } from './rich-markdown-editor-focus-scope'
import { type RichEditorSyncState, useSyncToolbarControls } from './rich-markdown-editor-toolbar'
import { buildTagOverlayMatches, useTagOverlay, findMatchAtPosition } from './rich-markdown-editor-tag-overlay'
import { useCtrlKeyState } from './rich-markdown-editor-ctrl-key'
import { TagHighlights } from './rich-markdown-editor-tag-highlights'
import type { FocusScope } from '../project-editor-types'

interface RichMarkdownEditorProps {
  documentId: string | null
  value: string
  disabled: boolean
  onChange: (value: string) => void
  saveDisabled: boolean
  saveLabel: string
  onSaveNow: () => void
  syncState: RichEditorSyncState
  syncStateLabel: string
  focusModeEnabled?: boolean
  focusScope?: FocusScope
  tagIndex?: Record<string, string> | null
  onTagClick?: (filePath: string) => void
}

function useRichEditorRefs(value: string, onChange: (value: string) => void) {
  const shellRef = useRef<HTMLDivElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<Quill | null>(null)
  const onChangeRef = useRef(onChange)
  const lastEditorValueRef = useRef(normalizeMarkdown(value))
  const isApplyingExternalValueRef = useRef(false)
  const turndownRef = useRef(
    new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' }),
  )
  return { shellRef, hostRef, editorRef, onChangeRef, lastEditorValueRef, isApplyingExternalValueRef, turndownRef }
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
    if (match) {
      e.preventDefault()
      onTagClick(match.filePath)
    }
  }
}

export function RichMarkdownEditor(props: RichMarkdownEditorProps) {
  const { documentId, value, disabled, onChange, saveDisabled, saveLabel, onSaveNow, syncState, syncStateLabel, focusModeEnabled = false, focusScope = 'paragraph', tagIndex, onTagClick } = props
  const { shellRef, hostRef, editorRef, onChangeRef, lastEditorValueRef, isApplyingExternalValueRef, turndownRef } = useRichEditorRefs(value, onChange)
  const ctrlPressed = useCtrlKeyState()
  const safeTagIndex = tagIndex ?? null
  const tagMatches = useTagOverlay({ editorRef, tagIndex: safeTagIndex, ctrlPressed })
  const handleEditorMouseDown = useTagClickHandler(editorRef, safeTagIndex, onTagClick)

  useRichEditorLifecycle({ documentId, value, disabled, hostRef, editorRef, onChangeRef, isApplyingExternalValueRef, lastEditorValueRef, turndownRef })
  useSyncToolbarControls({ documentId, hostRef, saveDisabled, saveLabel, onSaveNow, syncState, syncStateLabel })
  useFocusModeScopeEffect(editorRef, hostRef, focusModeEnabled, focusScope)

  const findBar = useRichEditorFind({ documentId, hostRef, editorRef })
  const editorContainerRect = editorRef.current?.container.getBoundingClientRect() ?? null
  const shellRect = shellRef.current?.getBoundingClientRect() ?? null
  const tagOffsetTop = editorContainerRect && shellRect ? editorContainerRect.top - shellRect.top : 0
  const tagOffsetLeft = editorContainerRect && shellRect ? editorContainerRect.left - shellRect.left : 0

  return (
    <div ref={shellRef} class="rich-editor-shell w-full" onMouseDownCapture={handleEditorMouseDown}>
      <div ref={hostRef} class="rich-editor w-full" />
      {findBar}
      {ctrlPressed && tagIndex && <TagHighlights tagMatches={tagMatches} offsetTop={tagOffsetTop} offsetLeft={tagOffsetLeft} />}
    </div>
  )
}
