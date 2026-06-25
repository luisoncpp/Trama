// @Architecture(descriptionShort="Pure phase implementations used by `DocumentContentSession`")
import {
  hydrateMarkdownImages,
  stripBase64ImagesFromMarkdown,
} from '../../../../shared/markdown-image-placeholder'

function normalizeMarkdown(value: string): string {
  return value.replace(/\r\n/g, '\n').trimEnd()
}

export function forEditorLoad(markdown: string, documentPath: string): string {
  const { markdownWithoutImages } = stripBase64ImagesFromMarkdown(markdown, documentPath)
  return markdownWithoutImages
}

export function forCanonicalCompare(markdown: string, documentPath: string): string {
  const { markdownWithoutImages } = stripBase64ImagesFromMarkdown(markdown, documentPath)
  return normalizeMarkdown(markdownWithoutImages)
}

export function hydrateImagePlaceholdersForSave(markdown: string, documentPath: string): string {
  return hydrateMarkdownImages(markdown, documentPath)
}
