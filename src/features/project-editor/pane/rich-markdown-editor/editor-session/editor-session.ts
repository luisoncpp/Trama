import { useCallback, useRef, useState } from 'preact/hooks'
import type Quill from 'quill'
import type { EditorZoomRef, FocusScope, TagMatch } from '../../../project-editor-types.js'
import type { EditorSessionImpl } from './editor-session-private/editor-session-lifecycle.js'
import type { RichEditorSyncState } from './editor-session-private/editor-session-toolbar.js'
import {
  useEditorSessionLifecycleEffects,
  useEditorSessionRenderHooks,
} from './editor-session-private/editor-session-hooks.js'
import { buildEditorSessionFacade } from './editor-session-private/editor-session-facade.js'

export type { EditorSession } from './editor-session-types.js'
export type { TagMatch }

export interface UseEditorSessionProps {
  documentId: string | null
  value: string
  forceApplyVersion?: number
  disabled: boolean
  readOnlyPreview?: boolean
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
  previewRestoreDisabled?: boolean
  previewRestoreLabel?: string
  onPreviewRestore?: () => void
  syncState: RichEditorSyncState
  syncStateLabel: string
  focusModeEnabled?: boolean
  focusScope?: FocusScope
  tagIndex?: Record<string, string> | null
  onTagClick?: (filePath: string) => void
  isActive?: boolean
  onMarkDirty?: () => void
  onSessionReady?: (session: import('./editor-session-types.js').EditorSession | null) => void
  hostRef?: { current: HTMLDivElement | null }
  shellRef?: { current: HTMLDivElement | null }
  zoomRef?: EditorZoomRef
  zoomLevel?: number
  onZoomChange?: (level: number) => void
}

export function useEditorSession(props: UseEditorSessionProps): import('./editor-session-types.js').EditorSession | null {
  const internalHostRef = useRef<HTMLDivElement | null>(null)
  const internalShellRef = useRef<HTMLDivElement | null>(null)
  const hostRef = props.hostRef ?? internalHostRef
  const shellRef = props.shellRef ?? internalShellRef
  const onChangeRef = useRef(props.onChange)
  const onDirtyRef = useRef(props.onMarkDirty ?? (() => {}))
  const [, setTagOverlayTick] = useState(0)
  const triggerTagOverlayRender = useCallback(() => { setTagOverlayTick((c) => c + 1) }, [])
  const [lifecycleSession, setLifecycleSession] = useState<EditorSessionImpl | null>(null)

  useEditorSessionLifecycleEffects({
    props,
    hostRef,
    onChangeRef,
    onDirtyRef,
    lifecycleSession,
    setLifecycleSession,
  })

  const editorRef = useRef<Quill | null>(lifecycleSession?.getEditor() ?? null)
  editorRef.current = lifecycleSession?.getEditor() ?? null

  const { findBar, ctrlPressed, tagMatches, handleEditorMouseDown } = useEditorSessionRenderHooks({
    props,
    lifecycleSession,
    hostRef,
    editorRef,
    triggerTagOverlayRender,
  })

  return buildEditorSessionFacade(lifecycleSession, hostRef, shellRef, {
    findBar,
    ctrlPressed,
    tagMatches,
    handleEditorMouseDown,
  })
}
