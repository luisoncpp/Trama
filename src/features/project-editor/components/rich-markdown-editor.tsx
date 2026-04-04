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

export function RichMarkdownEditor({ documentId, value, disabled, onChange }: RichMarkdownEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<Quill | null>(null)
  const onChangeRef = useRef(onChange)
  const lastEditorValueRef = useRef(normalizeMarkdown(value))
  const isApplyingExternalValueRef = useRef(false)
  const turndownRef = useRef(new TurndownService())

  function normalizeMarkdown(input: string): string {
    return input.replace(/\r\n/g, '\n').trimEnd()
  }

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!hostRef.current) {
      return
    }

    hostRef.current.innerHTML = ''
    const toolbar = document.createElement('div')
    const editorHost = document.createElement('div')
    hostRef.current.append(toolbar, editorHost)

    const editor = new Quill(editorHost, {
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
      },
    })

    editorRef.current = editor

    const html = marked.parse(value) as string
    editor.clipboard.dangerouslyPasteHTML(html)
    lastEditorValueRef.current = normalizeMarkdown(value)

    editor.on('text-change', () => {
      if (isApplyingExternalValueRef.current) {
        return
      }

      const markdown = normalizeMarkdown(turndownRef.current.turndown(editor.root.innerHTML))
      lastEditorValueRef.current = markdown
      onChangeRef.current(markdown)
    })

    if (disabled) {
      editor.enable(false)
    }

    return () => {
      editorRef.current = null
    }
  }, [documentId])

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
    editor.setContents([])
    editor.clipboard.dangerouslyPasteHTML(marked.parse(value) as string)
    if (selection) {
      editor.setSelection(selection)
    }
    lastEditorValueRef.current = nextNormalized
    window.setTimeout(() => {
      isApplyingExternalValueRef.current = false
    }, 0)
  }, [value])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    if (disabled) {
      editor.enable(false)
      return
    }

    editor.enable(true)
  }, [disabled])

  return <div ref={hostRef} class="rich-editor w-full" />
}
