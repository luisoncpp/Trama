import TurndownService from 'turndown'
import { serializeDirectiveArtifactNode } from './markdown-layout-directives.js'
import { normalizeBlankLinesToSpacerDirectives } from './markdown-layout-directives-spacing.js'
import { brokenImagePlaceholderToComment, imagePlaceholderToComment } from './markdown-image-placeholder.js'
import type { DirectiveArtifactNode } from './markdown-layout-directives-artifact-node.js'

const IMAGE_PLACEHOLDER_PROTOCOL = 'trama-image-placeholder:'

function getNodeAttribute(node: unknown, name: string): string | null {
  if (!node || typeof node !== 'object') {
    return null
  }

  const candidate = node as { getAttribute?: (attributeName: string) => string | null }
  return typeof candidate.getAttribute === 'function' ? candidate.getAttribute(name) : null
}

export enum TurndownServiceFlags {
  None = 0,
  HasImages = 1 << 0
}

export function createTramaTurndownService(flags : number): TurndownService {
  const service = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' })

  service.addRule('trama-layout-directives', {
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

  if ((flags & TurndownServiceFlags.HasImages) !== 0) {
    service.addRule('tramaImagePlaceholder', {
      filter: (node) => {
        if (node.nodeName !== 'IMG') return false
        const src = getNodeAttribute(node, 'src') ?? ''
        return src.startsWith(IMAGE_PLACEHOLDER_PROTOCOL)
      },
      replacement: (_content, node) => {
        const src = getNodeAttribute(node, 'src') ?? ''
        const uuid = src.slice(IMAGE_PLACEHOLDER_PROTOCOL.length)
        return imagePlaceholderToComment(uuid)
      },
    })
  }

  service.addRule('tramaBrokenImagePlaceholder', {
    filter: (node) => Boolean(getNodeAttribute(node, 'data-trama-broken-image-source')),
    replacement: (_content, node) => {
      const source = getNodeAttribute(node, 'data-trama-broken-image-source') ?? ''
      const alt = getNodeAttribute(node, 'data-trama-broken-image-alt') ?? ''
      return source ? brokenImagePlaceholderToComment(alt, source) : ''
    },
  })

  return service
}

export function normalizeMarkdownOutput(markdown: string): string {
  return normalizeBlankLinesToSpacerDirectives(markdown.replace(/\r\n/g, '\n').trimEnd())
}
