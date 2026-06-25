// @Architecture(descriptionShort="Public pane editor seam")
import { useRef } from 'preact/hooks'
import { RichMarkdownEditorView } from './rich-markdown-editor-view'
import { useEditorSession, type UseEditorSessionProps } from './editor-session/editor-session'

export type RichMarkdownEditorProps = UseEditorSessionProps

export function RichMarkdownEditor(props: RichMarkdownEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const session = useEditorSession({ ...props, hostRef, shellRef })
  return <RichMarkdownEditorView session={session} hostRef={hostRef} shellRef={shellRef} />
}
