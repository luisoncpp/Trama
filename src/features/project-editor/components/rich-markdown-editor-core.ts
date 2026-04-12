import { useEffect } from 'preact/hooks'
import Quill from 'quill'
import TurndownService from 'turndown'
import { marked } from 'marked'
import { registerTypographyHandler } from './rich-markdown-editor-typography'
import { WORKSPACE_CONTEXT_MENU_EVENT, type WorkspaceContextCommand } from '../../../shared/workspace-context-menu'

type QuillChangeSource = 'api' | 'user' | 'silent'

interface UseRichEditorLifecycleParams {
  documentId: string | null
  value: string
  disabled: boolean
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  onChangeRef: { current: (value: string) => void }
  lastEditorValueRef: { current: string }
  isApplyingExternalValueRef: { current: boolean }
  turndownRef: { current: TurndownService }
}

export function normalizeMarkdown(input: string): string {
  return input.replace(/\r\n/g, '\n').trimEnd()
}

function createQuillEditor(host: HTMLDivElement): Quill {
  host.innerHTML = ''
  const toolbar = document.createElement('div')
  const editorHost = document.createElement('div')
  host.append(toolbar, editorHost)

  return new Quill(editorHost, {
    theme: 'snow',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['clean'],
      ],
      history: {
        userOnly: true,
      },
    },
  })
}

function applyMarkdownToEditor(editor: Quill, markdown: string, source: QuillChangeSource = 'api'): void {
  editor.setContents([], source)
  editor.clipboard.dangerouslyPasteHTML(marked.parse(markdown) as string, source)
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
    if (isApplyingExternalValueRef.current) {
      return
    }

    const markdown = normalizeMarkdown(turndownRef.current.turndown(editor.root.innerHTML))
    lastEditorValueRef.current = markdown
    onChangeRef.current(markdown)
  })
}

function registerWorkspaceCommandListener(
  editor: Quill,
  turndownRef: { current: TurndownService },
): (event: Event) => void {
  const handler = async (event: Event) => {
    const customEvent = event as CustomEvent<WorkspaceContextCommand | undefined>
    const command = customEvent.detail
    if (!command) return
    if (command.type !== 'paste-markdown' && command.type !== 'copy-as-markdown') return
    if (!editor.hasFocus()) return

    try {
      if (command.type === 'paste-markdown') {
        const clipboardText = await navigator.clipboard.readText()
        if (!clipboardText) return
        const index = editor.getSelection()?.index ?? editor.getLength() - 1
        editor.clipboard.dangerouslyPasteHTML(index, marked.parse(clipboardText) as string, 'user')
      } else {
        const markdown = normalizeMarkdown(turndownRef.current.turndown(editor.root.innerHTML))
        await navigator.clipboard.writeText(markdown)
      }
    } catch {
      // ignore clipboard errors
    }
  }

  window.addEventListener(WORKSPACE_CONTEXT_MENU_EVENT, handler as EventListener)
  return handler
}

function useInitializeEditor({
  documentId,
  value,
  hostRef,
  editorRef,
  isApplyingExternalValueRef,
  lastEditorValueRef,
  turndownRef,
  onChangeRef,
}: Omit<UseRichEditorLifecycleParams, 'disabled'>): void {
  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }

    const editor = createQuillEditor(host)
    editorRef.current = editor
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
  }, [documentId, hostRef, editorRef, isApplyingExternalValueRef, lastEditorValueRef, onChangeRef, turndownRef])
}

function useSyncExternalValue({
  value,
  editorRef,
  lastEditorValueRef,
  isApplyingExternalValueRef,
}: Omit<UseRichEditorLifecycleParams, 'documentId' | 'disabled' | 'hostRef' | 'onChangeRef' | 'turndownRef'> & {
  value: string
}): void {
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    const nextNormalized = normalizeMarkdown(value)
    if (lastEditorValueRef.current === nextNormalized) {
      return
    }

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
    if (!editor) {
      return
    }

    editor.enable(!disabled)
  }, [disabled, documentId, editorRef])
}

export function useRichEditorLifecycle(params: UseRichEditorLifecycleParams): void {
  const { documentId, value, disabled, hostRef, editorRef, onChangeRef, lastEditorValueRef, isApplyingExternalValueRef, turndownRef } =
    params

  useInitializeEditor({
    documentId,
    value,
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
}
