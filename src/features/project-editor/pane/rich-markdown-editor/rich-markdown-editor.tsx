import { useEffect, useRef, useState, useCallback } from 'preact/hooks'
import Quill from 'quill'
import { useRichEditorLifecycle } from './rich-markdown-editor-core'
import { useRichEditorFind } from './rich-markdown-editor-find'
import { useFocusModeScopeEffect } from './rich-markdown-editor-focus-scope'
import { type RichEditorSyncState, useSyncToolbarControls } from './rich-markdown-editor-toolbar'
import { useRichEditorOverlay } from './rich-markdown-editor-overlay'
import { RichMarkdownEditorView } from './rich-markdown-editor-view'
import type { FocusScope } from '../../project-editor-types'
import type { EditorSerializationRefs, EditorZoomRef } from '../../project-editor-types'
import { normalizeEditorDocumentValue } from './rich-markdown-editor-value-sync'
import { createTramaTurndownService, TurndownServiceFlags } from '../../../../shared/turndown-service-factory'
import { useEditorZoom } from './use-editor-zoom'

type TagOverlayMatch = { tag: string; start: number; end: number; filePath: string }

const DEFAULT_ZOOM_REF: EditorZoomRef = { current: 1.0 }

interface RichMarkdownEditorProps {
  documentId: string | null
  value: string
  forceApplyVersion?: number
  disabled: boolean
  spellcheckEnabled?: boolean
  onChange: (value: string) => void
  historyBackDisabled: boolean
  onHistoryBack: () => void
  saveDisabled: boolean
  saveLabel: string
  onSaveNow: () => void
  revertDisabled: boolean
  revertLabel: string
  onRevertNow: () => void
  syncState: RichEditorSyncState
  syncStateLabel: string
  focusModeEnabled?: boolean
  focusScope?: FocusScope
  tagIndex?: Record<string, string> | null
  onTagClick?: (filePath: string) => void
  isActive?: boolean
  editorSerializationRef?: { current: EditorSerializationRefs }
  onMarkDirty?: () => void
  zoomRef?: EditorZoomRef
  zoomLevel?: number
  onZoomChange?: (level: number) => void
}

function useRichEditorRefs(
  documentId: string | null,
  value: string,
  tagIndex: Record<string, string> | null,
  onChange: (value: string) => void,
  triggerTagOverlayRender?: () => void,
  onMarkDirty?: () => void,
) {
  const shellRef = useRef<HTMLDivElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<Quill | null>(null)
  const onChangeRef = useRef(onChange)
  const lastEditorValueRef = useRef(normalizeEditorDocumentValue(value, documentId))
  const isApplyingExternalValueRef = useRef(false)
  const turndownRef = useRef(createTramaTurndownService(TurndownServiceFlags.None))
  const serializationRef = useRef<EditorSerializationRefs>({
    flush: () => null,
    tagOverlayRecalcRef: { current: false },
    tagOverlayMatchesRef: { current: [] as Array<TagOverlayMatch> },
  })

  useEffect(/* resetTagOverlayOnDocChange */ () => {
    if (documentId) {
      serializationRef.current.tagOverlayMatchesRef.current = []
      serializationRef.current.tagOverlayRecalcRef.current = true
      if (triggerTagOverlayRender) {
        triggerTagOverlayRender()
      }
    }
  }, [documentId, tagIndex, triggerTagOverlayRender])
  const onDirtyRef = useRef<() => void>(onMarkDirty ?? (() => {}))

  useEffect(() => { onChangeRef.current = onChange }, [onChange] /*Inputs for syncOnChangeRef*/)
  useEffect(() => { onDirtyRef.current = onMarkDirty ?? (() => {}) }, [onMarkDirty] /*Inputs for syncOnDirtyRef*/)

  return {
    shellRef,
    hostRef,
    editorRef,
    onChangeRef,
    lastEditorValueRef,
    isApplyingExternalValueRef,
    turndownRef,
    onDirtyRef,
    serializationRef,
  }
}

function useRichEditorBehaviors(
  props: RichMarkdownEditorProps,
  refs: ReturnType<typeof useRichEditorRefs>,
  triggerTagOverlayRender: () => void,
) {
  const {
    documentId, value, disabled, spellcheckEnabled = true,
    historyBackDisabled, onHistoryBack,
    saveDisabled, saveLabel, onSaveNow,
    revertDisabled, revertLabel, onRevertNow,
    syncState, syncStateLabel,
    focusModeEnabled = false, focusScope = 'paragraph',
    isActive = true, editorSerializationRef,
    zoomRef, zoomLevel = 1.0, onZoomChange,
  } = props
  const {
    hostRef,
    editorRef,
    onChangeRef,
    lastEditorValueRef,
    isApplyingExternalValueRef,
    turndownRef,
    onDirtyRef,
    serializationRef,
  } = refs
  useRichEditorLifecycle({
    documentId, value, forceApplyVersion: props.forceApplyVersion ?? 0, disabled, spellcheckEnabled, hostRef, editorRef,
    onChangeRef, isApplyingExternalValueRef,
    lastEditorValueRef, turndownRef, onDirtyRef, serializationRef,
    triggerTagOverlayRender,
  })
  useSyncToolbarControls({
    documentId, hostRef, editorRef, historyBackDisabled, onHistoryBack,
    saveDisabled, saveLabel, onSaveNow,
    revertDisabled, revertLabel, onRevertNow,
    syncState, syncStateLabel, zoomLevel, onZoomChange,
  })
  useFocusModeScopeEffect(editorRef, hostRef, focusModeEnabled, focusScope, isActive)
  useEditorZoom({ editorRef, hostRef, zoomRef: zoomRef ?? DEFAULT_ZOOM_REF, triggerTagOverlayRender })
  if (editorSerializationRef) editorSerializationRef.current = serializationRef.current
  return useRichEditorFind({ documentId, hostRef, editorRef })
}

function useRichEditorHooks(props: RichMarkdownEditorProps) {
  const {
    documentId, value, onChange, tagIndex,
    onTagClick, onMarkDirty,
  } = props
  const safeTagIndex = tagIndex ?? null
  const [, setTagOverlayTick] = useState(0)
  const triggerTagOverlayRender = useCallback(() => setTagOverlayTick((c) => c + 1), [])
  const refs = useRichEditorRefs(documentId, value, safeTagIndex, onChange, triggerTagOverlayRender, onMarkDirty)
  const { shellRef, hostRef, editorRef, serializationRef } = refs
  const overlay = useRichEditorOverlay(editorRef, safeTagIndex, serializationRef, onTagClick)
  const findBar = useRichEditorBehaviors(props, refs, triggerTagOverlayRender)
  return {
    shellRef,
    hostRef,
    findBar,
    ctrlPressed: overlay.ctrlPressed,
    tagIndex: safeTagIndex,
    editorRef,
    tagMatches: overlay.tagMatches,
    handleEditorMouseDown: overlay.handleEditorMouseDown,
  }
}

export function RichMarkdownEditor(props: RichMarkdownEditorProps) {
  return <RichMarkdownEditorView {...useRichEditorHooks(props)} />
}
