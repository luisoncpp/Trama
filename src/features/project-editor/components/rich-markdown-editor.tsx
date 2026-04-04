import { useEffect, useRef } from 'preact/hooks'
import Quill from 'quill'
import TurndownService from 'turndown'
import { marked } from 'marked'

interface RichMarkdownEditorProps {
  documentId: string | null
  value: string
  disabled: boolean
  onChange: (value: string) => void
}

type QuillChangeSource = 'api' | 'user' | 'silent'

function normalizeMarkdown(input: string): string {
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

function useSyncOnChangeRef(
  onChange: (value: string) => void,
  onChangeRef: { current: (value: string) => void },
): void {
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange, onChangeRef])
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
}: {
  documentId: string | null
  value: string
  hostRef: { current: HTMLDivElement | null }
  editorRef: { current: Quill | null }
  isApplyingExternalValueRef: { current: boolean }
  lastEditorValueRef: { current: string }
  turndownRef: { current: TurndownService }
  onChangeRef: { current: (value: string) => void }
}): void {
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

    return () => {
      editorRef.current = null
    }
  }, [documentId])
}

function useSyncExternalValue({
  value,
  editorRef,
  lastEditorValueRef,
  isApplyingExternalValueRef,
}: {
  value: string
  editorRef: { current: Quill | null }
  lastEditorValueRef: { current: string }
  isApplyingExternalValueRef: { current: boolean }
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
}: {
  documentId: string | null
  disabled: boolean
  editorRef: { current: Quill | null }
}): void {
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    editor.enable(!disabled)
  }, [disabled, documentId, editorRef])
}

export function RichMarkdownEditor({ documentId, value, disabled, onChange }: RichMarkdownEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<Quill | null>(null)
  const onChangeRef = useRef(onChange)
  const lastEditorValueRef = useRef(normalizeMarkdown(value))
  const isApplyingExternalValueRef = useRef(false)
  const turndownRef = useRef(new TurndownService())

  useSyncOnChangeRef(onChange, onChangeRef)
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

  return <div ref={hostRef} class="rich-editor w-full" />
}
