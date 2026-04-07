import { useEffect, useRef } from 'preact/hooks'
import TurndownService from 'turndown'
import Quill from 'quill'
import { normalizeMarkdown, useRichEditorLifecycle } from './rich-markdown-editor-core'
import { useRichEditorFind } from './rich-markdown-editor-find'
import { useFocusModeScopeEffect } from './rich-markdown-editor-focus-scope'
import { type RichEditorSyncState, useSyncToolbarControls } from './rich-markdown-editor-toolbar'
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
}

function useRichEditorRefs(value: string, onChange: (value: string) => void) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<Quill | null>(null)
  const onChangeRef = useRef(onChange)
  const lastEditorValueRef = useRef(normalizeMarkdown(value))
  const isApplyingExternalValueRef = useRef(false)
  const turndownRef = useRef(new TurndownService())

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  return { hostRef, editorRef, onChangeRef, lastEditorValueRef, isApplyingExternalValueRef, turndownRef }
}

export function RichMarkdownEditor({
  documentId,
  value,
  disabled,
  onChange,
  saveDisabled,
  saveLabel,
  onSaveNow,
  syncState,
  syncStateLabel,
  focusModeEnabled = false,
  focusScope = 'paragraph',
}: RichMarkdownEditorProps) {
  const { hostRef, editorRef, onChangeRef, lastEditorValueRef, isApplyingExternalValueRef, turndownRef } = useRichEditorRefs(value, onChange)

  useRichEditorLifecycle({
    documentId,
    value,
    disabled,
    hostRef,
    editorRef,
    onChangeRef,
    isApplyingExternalValueRef,
    lastEditorValueRef,
    turndownRef,
  })

  useSyncToolbarControls({
    documentId,
    hostRef,
    saveDisabled,
    saveLabel,
    onSaveNow,
    syncState,
    syncStateLabel,
  })

  useFocusModeScopeEffect(editorRef, hostRef, focusModeEnabled, focusScope)

  const findBar = useRichEditorFind({
    documentId,
    hostRef,
    editorRef,
  })

  return (
    <div class="rich-editor-shell w-full">
      <div ref={hostRef} class="rich-editor w-full" />
      {findBar}
    </div>
  )
}
