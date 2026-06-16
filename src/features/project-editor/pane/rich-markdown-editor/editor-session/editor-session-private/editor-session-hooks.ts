import { useEffect } from 'preact/hooks'
import type Quill from 'quill'
import type { EditorZoomRef } from '../../../../project-editor-types.js'
import { EditorSessionImpl } from './editor-session-lifecycle.js'
import type { UseEditorSessionProps } from '../editor-session.js'
import { useRichEditorFind } from './editor-session-find.js'
import { useFocusModeScopeEffect } from './editor-session-focus.js'
import { useRichEditorOverlay } from './editor-session-tag-overlay.js'
import { useEditorZoom } from './editor-session-zoom.js'
import { useSyncToolbarControls } from './editor-session-toolbar.js'

interface UseEditorSessionLifecycleEffectsParams {
  props: UseEditorSessionProps
  hostRef: { current: HTMLDivElement | null }
  onChangeRef: { current: (value: string) => void }
  onDirtyRef: { current: () => void }
  lifecycleSession: EditorSessionImpl | null
  setLifecycleSession: (session: EditorSessionImpl | null) => void
}

export function useEditorSessionLifecycleEffects({
  props,
  hostRef,
  onChangeRef,
  onDirtyRef,
  lifecycleSession,
  setLifecycleSession,
}: UseEditorSessionLifecycleEffectsParams) {
  useEffect(() => { onChangeRef.current = props.onChange }, [props.onChange, onChangeRef])
  useEffect(() => { onDirtyRef.current = props.onMarkDirty ?? (() => {}) }, [props.onMarkDirty, onDirtyRef])

  useEffect(/* initializeEditorSession */ () => {
    const host = hostRef.current
    const documentId = props.documentId
    if (!host || !documentId) return

    const nextSession = new EditorSessionImpl({
      host,
      documentId,
      value: props.value,
      spellcheckEnabled: props.spellcheckEnabled ?? true,
      onChangeRef,
      onDirtyRef,
    })
    setLifecycleSession(nextSession)
    props.onSessionReady?.(nextSession)

    return () => {
      nextSession.dispose()
      setLifecycleSession(null)
      props.onSessionReady?.(null)
    }
  }, [props.documentId] /*Inputs for initializeEditorSession*/)

  useEffect(/* applyExternalValue */ () => {
    lifecycleSession?.applyExternalValue(props.value, props.forceApplyVersion ?? 0)
  }, [lifecycleSession, props.value, props.forceApplyVersion])

  useEffect(/* setDisabled */ () => {
    lifecycleSession?.setDisabled(props.disabled, Boolean(props.readOnlyPreview))
  }, [lifecycleSession, props.disabled, props.readOnlyPreview])

  useEffect(/* setSpellcheckEnabled */ () => {
    lifecycleSession?.setSpellcheckEnabled(props.spellcheckEnabled ?? true)
  }, [lifecycleSession, props.spellcheckEnabled])
}

interface UseEditorSessionRenderHooksParams {
  props: UseEditorSessionProps
  lifecycleSession: EditorSessionImpl | null
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  triggerTagOverlayRender: () => void
}

const DEFAULT_ZOOM_REF: EditorZoomRef = { current: 1.0 }

export function useEditorSessionRenderHooks({
  props,
  lifecycleSession,
  hostRef,
  editorRef,
  triggerTagOverlayRender,
}: UseEditorSessionRenderHooksParams) {
  const findBar = useRichEditorFind({
    documentId: props.documentId,
    hostRef,
    editorRef,
    readOnlyPreview: props.readOnlyPreview,
  })
  useFocusModeScopeEffect(
    lifecycleSession?.getEditor() ?? null,
    hostRef,
    props.focusModeEnabled ?? false,
    props.focusScope ?? 'paragraph',
    props.isActive ?? true,
  )
  const { ctrlPressed, tagMatches, handleEditorMouseDown } = useRichEditorOverlay(
    editorRef,
    props.tagIndex ?? null,
    lifecycleSession,
    props.onTagClick,
  )
  useEditorZoom({
    editorRef,
    hostRef,
    zoomRef: props.zoomRef ?? DEFAULT_ZOOM_REF,
    triggerTagOverlayRender,
  })
  useEditorSessionToolbarSync(props, hostRef, lifecycleSession)

  return { findBar, ctrlPressed, tagMatches, handleEditorMouseDown }
}

function useEditorSessionToolbarSync(
  props: UseEditorSessionProps,
  hostRef: { current: HTMLDivElement | null },
  lifecycleSession: EditorSessionImpl | null,
) {
  useSyncToolbarControls({
    documentId: props.documentId,
    hostRef,
    session: lifecycleSession,
    historyBackDisabled: props.historyBackDisabled,
    onHistoryBack: props.onHistoryBack,
    saveDisabled: props.saveDisabled,
    saveLabel: props.saveLabel,
    onSaveNow: props.onSaveNow,
    revertDisabled: props.revertDisabled,
    revertLabel: props.revertLabel,
    onRevertNow: props.onRevertNow,
    previewRestoreDisabled: props.previewRestoreDisabled,
    previewRestoreLabel: props.previewRestoreLabel,
    onPreviewRestore: props.onPreviewRestore,
    syncState: props.syncState,
    syncStateLabel: props.syncStateLabel,
    zoomLevel: props.zoomLevel ?? 1.0,
    onZoomChange: props.onZoomChange,
  })
}
