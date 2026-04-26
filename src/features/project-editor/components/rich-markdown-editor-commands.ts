import type Quill from 'quill'
import TurndownService from 'turndown'
import { marked } from 'marked'
import { WORKSPACE_CONTEXT_MENU_EVENT, type WorkspaceContextCommand } from '../../../shared/workspace-context-menu'
import { renderDirectiveArtifactsToMarkdown } from '../../../shared/markdown-layout-directives'
import { serializeEditorMarkdownFromRef } from './rich-markdown-editor-quill'

function getCopySourceHtml(editor: Quill): string {
  const selection = editor.getSelection()
  if (!selection || selection.length <= 0) {
    return editor.root.innerHTML
  }

  return editor.getSemanticHTML(selection.index, selection.length)
}

export function registerWorkspaceCommandListener(
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
        const { markdownWithArtifacts } = renderDirectiveArtifactsToMarkdown(clipboardText)
        editor.clipboard.dangerouslyPasteHTML(index, marked.parse(markdownWithArtifacts) as string, 'user')
      } else {
        const markdown = serializeEditorMarkdownFromRef(turndownRef, getCopySourceHtml(editor), '')
        await navigator.clipboard.writeText(markdown)
      }
    } catch {
      // ignore clipboard errors
    }
  }

  window.addEventListener(WORKSPACE_CONTEXT_MENU_EVENT, handler as EventListener)
  return handler
}
