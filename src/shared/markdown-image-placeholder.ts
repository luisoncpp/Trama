const IMAGE_PLACEHOLDER_PROTOCOL = 'trama-image-placeholder:'
const BROKEN_IMAGE_COMMENT_PREFIX = 'TRAMA_BROKEN_IMAGE:'

interface BrokenImagePlaceholderPayload {
  alt: string
  source: string
}

/**
 * In-memory cache that maps documentId → (uuid → dataUrl).
 * This avoids embedding multi-megabyte base64 strings into the markdown while
 * the user is editing, keeping text-change serialization fast.
 */
const imageMapCache = new Map<string, Map<string, string>>()

/** Store an image map so it can be retrieved later for hydrating before save. */
export function storeImageMap(documentId: string, imageMap: Map<string, string>): void {
  imageMapCache.set(documentId, new Map(imageMap))
}

/** Retrieve a previously stored image map for the given document. */
export function getImageMap(documentId: string): Map<string, string> | undefined {
  return imageMapCache.get(documentId)
}

/** Remove a cached image map (e.g. when the document is closed). */
export function clearImageMap(documentId: string): void {
  imageMapCache.delete(documentId)
}

/**
 * Replace every `<img src="data:image/...">` in the HTML with a lightweight
 * `<img src="trama-image-placeholder:img_N">` and collect the extracted
 * base64 data URLs into an `imageMap`.
 */
export function stripBase64ImagesFromHtml(
  html: string
): { htmlWithoutImages: string; imageMap: Map<string, string> } {
  const imageMap = new Map<string, string>()
  let counter = 0

  const stripped = html.replace(/<img\s+([^>]*?)src="data:image\/[^"]+"([^>]*?)>/gi, (_match, before, after) => {
    const dataMatch = /src="(data:image\/[^"]+)"/.exec(_match)
    if (!dataMatch) return _match
    const dataUrl = dataMatch[1]
    const uuid = `img_${counter++}`
    imageMap.set(uuid, dataUrl)
    return `<img ${before}src="${IMAGE_PLACEHOLDER_PROTOCOL}${uuid}"${after}>`
  })

  return { htmlWithoutImages: stripped, imageMap }
}

/**
 * Replace every `![alt](data:image/...)` in markdown with a short
 * `<!-- IMAGE_PLACEHOLDER:uuid -->` comment and cache the extracted image data.
 *
 * This gives the editor a stable, lightweight in-memory representation while
 * still allowing save-time hydration back to standard markdown.
 */
export function stripBase64ImagesFromMarkdown(
  markdown: string,
  documentId?: string,
): { markdownWithoutImages: string; imageMap: Map<string, string> } {
  const imageMap = new Map<string, string>()
  const usedUuids = new Set<string>()
  let counter = 0

  const markdownWithoutImages = markdown.replace(/!\[([^\]]*)\]\((data:image\/[^)\s]+)\)/gi, (_match, altText, dataUrl) => {
    const candidate = typeof altText === 'string' ? altText.trim() : ''
    const uuid = candidate.length > 0 && !candidate.includes(':') && !candidate.includes(' ') && !usedUuids.has(candidate)
      ? candidate
      : `img_${counter++}`
    usedUuids.add(uuid)
    imageMap.set(uuid, dataUrl)
    return imagePlaceholderToComment(uuid)
  })

  if (documentId && imageMap.size > 0) {
    storeImageMap(documentId, imageMap)
  }

  return { markdownWithoutImages, imageMap }
}

/** Create a short HTML comment placeholder used for in-memory markdown. */
export function imagePlaceholderToComment(uuid: string): string {
  return `<!-- IMAGE_PLACEHOLDER:${uuid} -->`
}

function encodeBrokenImagePayload(payload: BrokenImagePlaceholderPayload): string {
  return encodeURIComponent(JSON.stringify(payload))
}

function decodeBrokenImagePayload(encodedPayload: string): BrokenImagePlaceholderPayload | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(encodedPayload)) as Partial<BrokenImagePlaceholderPayload>
    if (typeof parsed.alt !== 'string' || typeof parsed.source !== 'string') {
      return null
    }

    return { alt: parsed.alt, source: parsed.source }
  } catch {
    return null
  }
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function brokenImagePlaceholderToComment(alt: string, source: string): string {
  return `<!-- ${BROKEN_IMAGE_COMMENT_PREFIX}${encodeBrokenImagePayload({ alt, source })} -->`
}

export function hydrateBrokenImageComments(markdown: string): string {
  return markdown.replace(/<!--\s*TRAMA_BROKEN_IMAGE:([^\s]+)\s*-->/gi, (_match, encodedPayload) => {
    const payload = decodeBrokenImagePayload(encodedPayload)
    return payload ? `![${payload.alt}](${payload.source})` : _match
  })
}

export function renderBrokenImageCommentsAsHtml(markdown: string): string {
  return markdown.replace(/<!--\s*TRAMA_BROKEN_IMAGE:([^\s]+)\s*-->/gi, (_match, encodedPayload) => {
    const payload = decodeBrokenImagePayload(encodedPayload)
    if (!payload) {
      return _match
    }

    const safeAlt = escapeHtmlAttribute(payload.alt)
    const safeSource = escapeHtmlAttribute(payload.source)
    return `<div data-trama-directive="broken-image" data-trama-broken-image="true" data-trama-broken-image-alt="${safeAlt}" data-trama-broken-image-source="${safeSource}">🖼️</div>`
  })
}

/** Scan HTML for `trama-image-placeholder:` src values and return the uuids. */
export function extractPlaceholdersFromHtml(html: string): string[] {
  const results: string[] = []
  const regex = /src="trama-image-placeholder:([^"]+)"/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    results.push(match[1])
  }
  return results
}

/**
 * Expand short `<!-- IMAGE_PLACEHOLDER:uuid -->` comments into standard
 * markdown image syntax `![uuid](data:image/…)` using the cached imageMap.
 *
 * This is called immediately before saving to disk so the file contains
 * portable, standard markdown that any editor can render.
 */
export function hydrateMarkdownImages(markdown: string, documentId: string): string {
  const imageMap = getImageMap(documentId)
  if (!imageMap || imageMap.size === 0) return markdown

  return markdown.replace(/<!--\s*IMAGE_PLACEHOLDER:([^\s:]+)\s*-->/gi, (_match, uuid) => {
    const dataUrl = imageMap.get(uuid)
    return dataUrl ? `![${uuid}](${dataUrl})` : _match
  })
}
