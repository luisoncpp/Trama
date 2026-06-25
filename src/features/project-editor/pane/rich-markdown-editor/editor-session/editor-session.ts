// @Architecture(descriptionShort="Public `EditorSession` hook (`useEditorSession`) and `UseEditorSessionProps` type")
import { useCallback, useRef, useState } from 'preact/hooks'
import type Quill from 'quill'
import type { EditorSession as EditorSessionCore, EditorZoomRef, FocusScope, TagMatch } from '../../../project-editor-types.js'
import type { EditorSessionImpl } from './editor-session-private/editor-session-lifecycle.js'
import type { RichEditorSyncState } from './editor-session-private/editor-session-toolbar.js'
import { useEditorSessionOrchestration } from './editor-session-private/editor-session-orchestration.js'

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
  onSessionReady?: (session: EditorSessionCore | null) => void
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

  const editorRef = useRef<Quill | null>(lifecycleSession?.getEditor() ?? null)
  editorRef.current = lifecycleSession?.getEditor() ?? null

  return useEditorSessionOrchestration({
    props,
    hostRef,
    shellRef,
    onChangeRef,
    onDirtyRef,
    lifecycleSession,
    setLifecycleSession,
    editorRef,
    triggerTagOverlayRender,
  })
}
