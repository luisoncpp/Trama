// @Architecture(descriptionShort="Find bar overlay view: binds search state to FindOverlay presentation props")
import { useMemo } from 'preact/hooks'
import type Quill from 'quill'
import { FindOverlay } from './editor-session-find-overlay'
import { computeActiveFindBounds, resolveFindReplacePresentation } from './editor-session-find-hooks'
import { formatMatchLabel, type SearchState } from './editor-session-find-state'

export interface RichEditorFindOverlayViewProps {
  readOnlyPreview: boolean
  isOpen: boolean
  state: SearchState
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  inputRef: { current: HTMLInputElement | null }
  replaceMode: boolean
  replaceValue: string
  onReplaceValueChange: (value: string) => void
  toggleFindOption: (key: keyof SearchState['options']) => void
  closeFind: () => void
  jumpPrevious: () => void
  jumpNext: () => void
  replaceCurrent: () => void
  replaceAll: () => void
  toggleReplaceMode: () => void
  updateMatches: (query: string) => void
}

export function RichEditorFindOverlayView(props: RichEditorFindOverlayViewProps) {
  const {
    readOnlyPreview,
    isOpen,
    state,
    hostRef,
    editorRef,
    inputRef,
    replaceMode,
    replaceValue,
    onReplaceValueChange,
    toggleFindOption,
    closeFind,
    jumpPrevious,
    jumpNext,
    replaceCurrent,
    replaceAll,
    toggleReplaceMode,
    updateMatches,
  } = props
  const matchLabel = useMemo(/* formatMatchLabel */ () => formatMatchLabel(state), [state] /*Inputs for formatMatchLabel*/)
  const activeBounds = computeActiveFindBounds(isOpen, state, hostRef, editorRef)
  const replacePresentation = resolveFindReplacePresentation(readOnlyPreview, replaceMode, replaceCurrent, replaceAll)

  if (!isOpen) return null

  return (
    <FindOverlay
      query={state.query}
      matchLabel={matchLabel}
      inputRef={inputRef}
      activeBounds={activeBounds}
      replaceValue={replaceValue}
      caseSensitive={state.options.caseSensitive}
      wholeWord={state.options.wholeWord}
      onToggleCaseSensitive={() => toggleFindOption('caseSensitive')}
      onToggleWholeWord={() => toggleFindOption('wholeWord')}
      onQueryChange={updateMatches}
      onReplaceValueChange={onReplaceValueChange}
      onClose={closeFind}
      onJumpPrevious={jumpPrevious}
      onJumpNext={jumpNext}
      onToggleReplaceMode={toggleReplaceMode}
      {...replacePresentation}
    />
  )
}
