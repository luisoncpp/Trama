import Quill from 'quill'
import TurndownService from 'turndown'
import { marked } from 'marked'
import { renderDirectiveArtifactsToMarkdown } from '../../../../shared/markdown-layout-directives'
import { LayoutDirectiveController } from './editor-session/editor-session-private/layout-directive-controller'
import {
  hydrateMarkdownImages,
  renderBrokenImageCommentsAsHtml,
  stripBase64ImagesFromHtml,
} from '../../../../shared/markdown-image-placeholder'
import { getDocumentContentSession } from '../../document-content/document-content-session'
import { createTramaTurndownService, normalizeMarkdownOutput, TurndownServiceFlags } from '../../../../shared/turndown-service-factory'

type QuillChangeSource = 'api' | 'user' | 'silent'

export function normalizeMarkdown(input: string): string {
  return input.replace(/\r\n/g, '\n').trimEnd()
}

export function createQuillEditor(host: HTMLDivElement): Quill {
  LayoutDirectiveController.register()
  host.innerHTML = ''
  const toolbar = document.createElement('div')
  const editorHost = document.createElement('div')
  host.append(toolbar, editorHost)
  const editor = new Quill(editorHost, {
    theme: 'snow',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'strike'],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['clean'],
      ],
      history: {
        userOnly: true,
      },
      keyboard: {
        bindings: LayoutDirectiveController.getKeyboardBindings(),
      },
    },
  })
  LayoutDirectiveController.addClipboardMatchers(editor)
  return editor
}

export function syncEditorSpellcheck(editor: Quill, spellcheckEnabled: boolean): void {
  editor.root.spellcheck = spellcheckEnabled
  editor.root.setAttribute('spellcheck', spellcheckEnabled ? 'true' : 'false')
}

function restoreImagesAfterMarkedparsing(html: string, _imageMap: Map<string, string>): string {
  const regex = /<!--\s*IMAGE_PLACEHOLDER:([^:]+):(data:image\/[^>]+)\s*-->/gi
  return html.replace(regex, (_match, _uuid, dataUrl) => {
    return `<img src="${dataUrl}">`
  })
}

export function applyMarkdownToEditor(
  editor: Quill,
  markdown: string,
  source: QuillChangeSource = 'api',
  documentId?: string,
): void {
  const root = editor.root as HTMLDivElement
  const previousEditable = root.contentEditable
  root.contentEditable = 'false'
  try {
    const hydratedMarkdown = documentId ? hydrateMarkdownImages(markdown, documentId) : markdown
    const markdownWithBrokenImagePlaceholders = renderBrokenImageCommentsAsHtml(hydratedMarkdown)
    const { markdownWithArtifacts } = renderDirectiveArtifactsToMarkdown(markdownWithBrokenImagePlaceholders)
    const parsed = marked.parse(markdownWithArtifacts) as string
    const withImages = restoreImagesAfterMarkedparsing(parsed, new Map())
    editor.clipboard.dangerouslyPasteHTML(withImages, source)
    LayoutDirectiveController.syncOnTextChange(editor)
  } finally {
    root.contentEditable = previousEditable
  }
}

function serializeEditorMarkdown(
  _turndownService: unknown,
  html: string,
  documentId: string,
): string {
  const { htmlWithoutImages, imageMap } = stripBase64ImagesFromHtml(html)

  if (documentId) {
    const session = getDocumentContentSession(documentId)
    session.recordSerializedImageMap(imageMap)
  }

  const serviceFlags = imageMap.size > 0 ? TurndownServiceFlags.HasImages : TurndownServiceFlags.None
  const service = createTramaTurndownService(serviceFlags)

  return normalizeMarkdownOutput(service.turndown(htmlWithoutImages))
}

export function serializeEditorMarkdownFromRef(
  turndownRef: { current: TurndownService },
  html: string,
  documentId: string,
): string {
  return serializeEditorMarkdown(turndownRef.current, html, documentId)
}
