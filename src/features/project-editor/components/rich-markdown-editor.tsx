import { useEffect, useRef } from 'preact/hooks'
import TurndownService from 'turndown'
import Quill from 'quill'
import { useRichEditorLifecycle } from './rich-markdown-editor-core'
import { useRichEditorFind } from './rich-markdown-editor-find'
import { useFocusModeScopeEffect } from './rich-markdown-editor-focus-scope'
import { type RichEditorSyncState, useSyncToolbarControls } from './rich-markdown-editor-toolbar'
import { buildTagOverlayMatches, useTagOverlay, findMatchAtPosition } from './rich-markdown-editor-tag-overlay'
import { useCtrlKeyState } from './rich-markdown-editor-ctrl-key'
import { TagHighlights } from './rich-markdown-editor-tag-highlights'
import type { FocusScope } from '../project-editor-types'
import type { EditorSerializationRefs } from '../project-editor-types'
import { serializeDirectiveArtifactNode } from '../../../shared/markdown-layout-directives'
import { normalizeEditorDocumentValue } from './rich-markdown-editor-value-sync'

interface RichMarkdownEditorProps {
  documentId: string | null
  value: string
  disabled: boolean
  spellcheckEnabled?: boolean
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
  isActive?: boolean
  editorSerializationRef?: { current: EditorSerializationRefs }
  onMarkDirty?: () => void
}

function createTurndownService(): TurndownService {
  const service = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' })

  service.addRule('trama-layout-directives', {
    filter: (node) => Boolean((node as Element).getAttribute?.('data-trama-directive')),
    replacement: (_content, node) => {
      const directiveComment = serializeDirectiveArtifactNode(node as Element)
      return directiveComment ? `\n${directiveComment}\n` : ''
    },
  })

  return service
}

function useRichEditorRefs(
  documentId: string | null,
  value: string,
  onChange: (value: string) => void,
  onMarkDirty?: () => void,
) {
  const shellRef = useRef<HTMLDivElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<Quill | null>(null)
  const onChangeRef = useRef(onChange)
  const lastEditorValueRef = useRef(normalizeEditorDocumentValue(value, documentId))
  const isApplyingExternalValueRef = useRef(false)
  const turndownRef = useRef(createTurndownService())
  const serializationRef = useRef<EditorSerializationRefs>({ flush: () => null })
  const onDirtyRef = useRef<() => void>(onMarkDirty ?? (() => {}))

  useEffect(() => { onChangeRef.current = onChange }, [onChange] /*Inputs for syncOnChangeRef*/)
  useEffect(() => { onDirtyRef.current = onMarkDirty ?? (() => {}) }, [onMarkDirty] /*Inputs for syncOnDirtyRef*/)

  return { shellRef, hostRef, editorRef, onChangeRef, lastEditorValueRef, isApplyingExternalValueRef, turndownRef, onDirtyRef, serializationRef }
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
  const {
    documentId, value, disabled, spellcheckEnabled = true, onChange,
    saveDisabled, saveLabel, onSaveNow, syncState, syncStateLabel,
    focusModeEnabled = false, focusScope = 'paragraph', tagIndex,
    onTagClick, isActive = true, editorSerializationRef, onMarkDirty,
  } = props
  const refs = useRichEditorRefs(documentId, value, onChange, onMarkDirty)
  const {
    shellRef, hostRef, editorRef, onChangeRef, lastEditorValueRef,
    isApplyingExternalValueRef, turndownRef,
    onDirtyRef, serializationRef,
  } = refs
  const ctrlPressed = useCtrlKeyState()
  const safeTagIndex = tagIndex ?? null
  const tagMatches = useTagOverlay({ editorRef, tagIndex: safeTagIndex })
  const handleEditorMouseDown = useTagClickHandler(editorRef, safeTagIndex, onTagClick)

  const lifecycleParams = {
    documentId, value, disabled, spellcheckEnabled, hostRef, editorRef,
    onChangeRef, isApplyingExternalValueRef,
    lastEditorValueRef, turndownRef, onDirtyRef, serializationRef,
  }
  useRichEditorLifecycle(lifecycleParams)
  useSyncToolbarControls({ documentId, hostRef, editorRef, saveDisabled, saveLabel, onSaveNow, syncState, syncStateLabel })
  useFocusModeScopeEffect(editorRef, hostRef, focusModeEnabled, focusScope, isActive)

  // Sync the serialization ref into the parent-provided prop ref.
  // Because registerEditorTextChangeHandler mutates serializationRef.current.flush
  // (rather than replacing the object), the parent ref always sees the real function.
  if (editorSerializationRef) {
    editorSerializationRef.current = serializationRef.current
  }

  const findBar = useRichEditorFind({ documentId, hostRef, editorRef })
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
