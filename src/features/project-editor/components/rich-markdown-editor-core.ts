import { useEffect } from 'preact/hooks'
import type Quill from 'quill'
import type TurndownService from 'turndown'
import { registerTypographyHandler } from './rich-markdown-editor-typography'
import { WORKSPACE_CONTEXT_MENU_EVENT } from '../../../shared/workspace-context-menu'
import { normalizeBlankLinesToSpacerDirectives } from '../../../shared/markdown-layout-directives-spacing'
import { registerWorkspaceCommandListener } from './rich-markdown-editor-commands'
import { syncCenteredLayoutArtifacts } from './rich-markdown-editor-layout-centering'
import { createQuillEditor, normalizeMarkdown, applyMarkdownToEditor, syncEditorSpellcheck } from './rich-markdown-editor-quill'

export { normalizeMarkdown }

type QuillChangeSource = 'api' | 'user' | 'silent'

interface UseRichEditorLifecycleParams {
  documentId: string | null
  value: string
  disabled: boolean
  spellcheckEnabled: boolean
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  onChangeRef: { current: (value: string) => void }
  lastEditorValueRef: { current: string }
  isApplyingExternalValueRef: { current: boolean }
  turndownRef: { current: TurndownService }
}

function serializeEditorMarkdown(turndownRef: { current: TurndownService }, html: string): string {
  const markdown = normalizeMarkdown(turndownRef.current.turndown(html))
  return normalizeBlankLinesToSpacerDirectives(markdown)
}

function registerEditorTextChangeHandler({
  editor,
  isApplyingExternalValueRef,
  turndownRef,
  lastEditorValueRef,
  onChangeRef,
}: {
  editor: Quill
  isApplyingExternalValueRef: { current: boolean }
  turndownRef: { current: TurndownService }
  lastEditorValueRef: { current: string }
  onChangeRef: { current: (value: string) => void }
}): void {
  editor.on('text-change', () => {
    if (isApplyingExternalValueRef.current) return
    syncCenteredLayoutArtifacts(editor)
    const markdown = serializeEditorMarkdown(turndownRef, editor.root.innerHTML)
    lastEditorValueRef.current = markdown
    onChangeRef.current(markdown)
  })
}

function useInitializeEditor({
  documentId,
  value,
  spellcheckEnabled,
  hostRef,
  editorRef,
  isApplyingExternalValueRef,
  lastEditorValueRef,
  turndownRef,
  onChangeRef,
}: Omit<UseRichEditorLifecycleParams, 'disabled'>): void {
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const editor = createQuillEditor(host)
    editorRef.current = editor
    syncEditorSpellcheck(editor, spellcheckEnabled)
    applyMarkdownToEditor(editor, value, 'silent')
    lastEditorValueRef.current = normalizeMarkdown(value)
    registerEditorTextChangeHandler({
      editor,
      isApplyingExternalValueRef,
      turndownRef,
      lastEditorValueRef,
      onChangeRef,
    })
    const workspaceHandler = registerWorkspaceCommandListener(editor, turndownRef)
    registerTypographyHandler(editor)

    return () => {
      window.removeEventListener(WORKSPACE_CONTEXT_MENU_EVENT, workspaceHandler as EventListener)
      editorRef.current = null
    }
  }, [documentId, editorRef, hostRef, isApplyingExternalValueRef, lastEditorValueRef, onChangeRef, turndownRef])
}

function useSyncExternalValue({
  value,
  editorRef,
  lastEditorValueRef,
  isApplyingExternalValueRef,
}: Omit<UseRichEditorLifecycleParams, 'documentId' | 'disabled' | 'spellcheckEnabled' | 'hostRef' | 'onChangeRef' | 'turndownRef'> & {
  value: string
}): void {
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const nextNormalized = normalizeMarkdown(value)
    if (lastEditorValueRef.current === nextNormalized) return

    isApplyingExternalValueRef.current = true
    const selection = editor.getSelection()
    applyMarkdownToEditor(editor, value, 'silent')
    if (selection) {
      editor.setSelection(selection)
    }

    lastEditorValueRef.current = nextNormalized
    window.setTimeout(() => {
      isApplyingExternalValueRef.current = false
    }, 0)
  }, [editorRef, isApplyingExternalValueRef, lastEditorValueRef, value])
}

function useToggleDisabled({
  documentId,
  disabled,
  editorRef,
}: Pick<UseRichEditorLifecycleParams, 'documentId' | 'disabled' | 'editorRef'>): void {
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.enable(!disabled)
  }, [disabled, documentId, editorRef])
}

function useSyncSpellcheckEnabled({
  documentId,
  spellcheckEnabled,
  editorRef,
}: Pick<UseRichEditorLifecycleParams, 'documentId' | 'spellcheckEnabled' | 'editorRef'>): void {
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    syncEditorSpellcheck(editor, spellcheckEnabled)
  }, [documentId, editorRef, spellcheckEnabled])
}

export function useRichEditorLifecycle(params: UseRichEditorLifecycleParams): void {
  const {
    documentId,
    value,
    disabled,
    spellcheckEnabled,
    hostRef,
    editorRef,
    onChangeRef,
    lastEditorValueRef,
    isApplyingExternalValueRef,
    turndownRef,
  } = params

  useInitializeEditor({
    documentId,
    value,
    spellcheckEnabled,
    hostRef,
    editorRef,
    isApplyingExternalValueRef,
    lastEditorValueRef,
    turndownRef,
    onChangeRef,
  })

  useSyncExternalValue({
    value,
    editorRef,
    lastEditorValueRef,
    isApplyingExternalValueRef,
  })

  useToggleDisabled({
    documentId,
    disabled,
    editorRef,
  })

  useSyncSpellcheckEnabled({
    documentId,
    spellcheckEnabled,
    editorRef,
  })
}