import TurndownService from 'turndown'
import { serializeDirectiveArtifactNode } from './markdown-layout-directives.js'
import { normalizeBlankLinesToSpacerDirectives } from './markdown-layout-directives-spacing.js'
import { imagePlaceholderToComment } from './markdown-image-placeholder.js'
import type { DirectiveArtifactNode } from './markdown-layout-directives-artifact-node.js'

const IMAGE_PLACEHOLDER_PROTOCOL = 'trama-image-placeholder:'

export function createTramaTurndownService(imageMap?: Map<string, string>): TurndownService {
  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' })

  td.addRule('trama-layout-directives', {
    filter: (node) =>
      Boolean(
        (node as { getAttribute?: (name: string) => string | null }).getAttribute?.(
          'data-trama-directive',
        ),
      ),
    replacement: (_content, node) => {
      const directiveComment = serializeDirectiveArtifactNode(node as DirectiveArtifactNode)
      return directiveComment ? `\n${directiveComment}\n` : ''
    },
  })

  td.addRule('tramaImagePlaceholder', {
    filter: (node) => {
      if (node.nodeName !== 'IMG') return false
      const src =
        (node as { getAttribute?: (name: string) => string | null }).getAttribute?.('src') ?? ''
      return src.startsWith(IMAGE_PLACEHOLDER_PROTOCOL)
    },
    replacement: (_content, node) => {
      const src =
        (node as { getAttribute?: (name: string) => string | null }).getAttribute?.('src') ?? ''
      const uuid = src.slice(IMAGE_PLACEHOLDER_PROTOCOL.length)
      return imagePlaceholderToComment(uuid)
    },
  })

  return td
}

export function normalizeMarkdownOutput(markdown: string): string {
  return normalizeBlankLinesToSpacerDirectives(markdown.replace(/\r\n/g, '\n').trimEnd())
}