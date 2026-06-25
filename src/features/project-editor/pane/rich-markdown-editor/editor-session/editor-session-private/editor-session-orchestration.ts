// @Architecture(descriptionShort="Lifecycle effects, feature hooks (find, focus, tags, zoom, toolbar), and public")
import { useEffect } from 'preact/hooks'
import type Quill from 'quill'
import type { EditorZoomRef } from '../../../../project-editor-types.js'
import type { EditorSession } from '../editor-session-types.js'
import type { UseEditorSessionProps } from '../editor-session.js'
import { EditorSessionImpl } from './editor-session-lifecycle.js'
import { useRichEditorFind } from './editor-session-find.js'
import { useFocusModeScopeEffect } from './editor-session-focus.js'
import { useRichEditorOverlay } from './editor-session-tag-overlay.js'
import { useEditorZoom } from './editor-session-zoom.js'
import { useSyncToolbarControls } from './editor-session-toolbar.js'

const DEFAULT_ZOOM_REF: EditorZoomRef = { current: 1.0 }

interface OrchestrationContext {
  props: UseEditorSessionProps
  hostRef: { current: HTMLDivElement | null }
  shellRef: { current: HTMLDivElement | null }
  onChangeRef: { current: (value: string) => void }
  onDirtyRef: { current: () => void }
  lifecycleSession: EditorSessionImpl | null
  setLifecycleSession: (session: EditorSessionImpl | null) => void
  editorRef: { current: Quill | null }
  triggerTagOverlayRender: () => void
}

export function useEditorSessionOrchestration(ctx: OrchestrationContext): EditorSession | null {
  useEditorSessionLifecycleEffects(ctx)
  const renderState = useEditorSessionFeatureHooks(ctx)
  return buildEditorSessionFacade(ctx.lifecycleSession, ctx.hostRef, ctx.shellRef, renderState)
}

function useEditorSessionLifecycleEffects({
  props,
  hostRef,
  onChangeRef,
  onDirtyRef,
  lifecycleSession,
  setLifecycleSession,
}: OrchestrationContext): void {
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

function useEditorSessionFeatureHooks(ctx: OrchestrationContext) {
  const { props, hostRef, lifecycleSession, editorRef, triggerTagOverlayRender } = ctx
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
): void {
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

function buildEditorSessionFacade(
  lifecycleSession: EditorSessionImpl | null,
  hostRef: { current: HTMLDivElement | null },
  shellRef: { current: HTMLDivElement | null },
  renderState: {
    findBar: preact.JSX.Element | null
    ctrlPressed: boolean
    tagMatches: import('../../../../project-editor-types.js').TagMatch[]
    handleEditorMouseDown: (e: MouseEvent) => void
  },
): EditorSession | null {
  if (!lifecycleSession) return null
  return {
    flush: () => lifecycleSession.flush(),
    getEditor: () => lifecycleSession.getEditor(),
    getCanonicalValue: () => lifecycleSession.getCanonicalValue(),
    subscribeContentMutated: (cb) => lifecycleSession.subscribeContentMutated(cb),
    dispose: () => lifecycleSession.dispose(),
    getHostRef: () => hostRef,
    getShellRef: () => shellRef,
    getFindBar: () => renderState.findBar,
    getTagMatches: () => renderState.tagMatches,
    isCtrlPressed: () => renderState.ctrlPressed,
    getHandleEditorMouseDown: () => renderState.handleEditorMouseDown,
  }
}
