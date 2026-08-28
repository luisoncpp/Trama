// @Architecture(descriptionShort="In-document find controller; suppresses replace affordances during read-only revision")
import { useCallback, useRef, useState } from 'preact/hooks'
import type Quill from 'quill'
import { useFindBarActions, useRichEditorFindEffects } from './editor-session-find-hooks'
import { buildKeepFindFocus } from './editor-session-find-focus'
import { RichEditorFindOverlayView, type RichEditorFindOverlayViewProps } from './editor-session-find-overlay-view'
import { buildToggleFindOption, type FindContentSession } from './editor-session-find-preset'
import { useSearchState, useReplaceActions } from './editor-session-find-state'

interface UseRichEditorFindParams {
  documentId: string | null
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  readOnlyPreview?: boolean
  contentSession?: FindContentSession | null
  editorDisabled?: boolean
}

function buildFindOverlayViewProps(
  readOnlyPreview: boolean,
  barActions: ReturnType<typeof useFindBarActions>,
  replaceActions: ReturnType<typeof useReplaceActions>,
  shared: Omit<
    RichEditorFindOverlayViewProps,
    | 'readOnlyPreview'
    | 'isOpen'
    | 'replaceMode'
    | 'closeFind'
    | 'jumpPrevious'
    | 'jumpNext'
    | 'replaceCurrent'
    | 'replaceAll'
    | 'toggleReplaceMode'
  >,
): RichEditorFindOverlayViewProps {
  return {
    readOnlyPreview,
    isOpen: barActions.isOpen,
    replaceMode: barActions.replaceMode,
    closeFind: barActions.closeFind,
    jumpPrevious: barActions.jumpPrevious,
    jumpNext: barActions.jumpNext,
    replaceCurrent: replaceActions.replaceCurrent,
    replaceAll: replaceActions.replaceAll,
    toggleReplaceMode: barActions.toggleReplaceMode,
    ...shared,
  }
}

export function useRichEditorFind({
  documentId,
  hostRef,
  editorRef,
  readOnlyPreview = false,
  contentSession = null,
  editorDisabled = false,
}: UseRichEditorFindParams) {
  const [replaceValue, setReplaceValue] = useState('')
  const { state, updateMatches, applySearch, refreshMatches, setMatches, jumpMatch, stateRef } =
    useSearchState(editorRef)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const keepFindFocus = useCallback(buildKeepFindFocus(hostRef, inputRef), [hostRef])

  const barActions = useFindBarActions({ inputRef, jumpMatch, keepFindFocus })
  const handleOpenReplace = readOnlyPreview ? barActions.openFind : barActions.openReplace
  const replaceActions = useReplaceActions({
    editorRef, stateRef, replaceValue, keepFindFocus, setMatches,
  })
  const toggleFindOption = buildToggleFindOption({ stateRef, applySearch, keepFindFocus })

  useRichEditorFindEffects({
    documentId,
    closeFind: barActions.closeFind,
    setReplaceValue,
    openFind: barActions.openFind,
    applySearch,
    isOpen: barActions.isOpen,
    contentSession,
    state,
    stateRef,
    editorDisabled,
    refreshMatches,
    hostRef,
    editorRef,
    inputRef,
    keepFindFocus,
    handleOpenReplace,
  })

  return <RichEditorFindOverlayView {...buildFindOverlayViewProps(readOnlyPreview, barActions, replaceActions, {
    state,
    hostRef,
    editorRef,
    inputRef,
    replaceValue,
    onReplaceValueChange: setReplaceValue,
    toggleFindOption,
    updateMatches,
  })} />
}
