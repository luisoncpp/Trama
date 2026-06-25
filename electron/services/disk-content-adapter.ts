// @Architecture(descriptionShort="Main-process phase vocabulary for markdown images: `fromDiskRead` (disk → portable)")
import {
  materializeMarkdownImages,
  resolveMarkdownImageSources,
} from './document-image-persistence.js'

export async function fromDiskRead(
  projectRoot: string,
  markdown: string,
): Promise<{ markdown: string; linkedImagePaths: string[] }> {
  return resolveMarkdownImageSources(projectRoot, markdown)
}

export async function toDiskWrite(
  projectRoot: string,
  relativePath: string,
  markdown: string,
  existingMarkdown: string,
): Promise<{ markdown: string; affectedImagePaths: string[] }> {
  return materializeMarkdownImages(projectRoot, relativePath, markdown, existingMarkdown)
}
