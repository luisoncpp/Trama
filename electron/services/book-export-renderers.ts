import path from 'node:path'
import { marked } from 'marked'
import { replaceDirectivesForHtml } from './book-export-directives.js'
import { resolveImagePath, loadImageBytes, bytesToDataUrl } from './book-export-image-utils.js'

export interface BookExportChapter {
  path: string
  title: string
  content: string
}

export interface BookExportMetadata {
  title?: string
  author?: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function renderMarkdownBook(chapters: BookExportChapter[]): string {
  const manuscript = chapters
    .map((chapter) => chapter.content.trim())
    .filter(Boolean)

  return manuscript.join('\n\n---\n\n')
}

export async function renderChapterHtmlFragment(chapter: BookExportChapter): Promise<string> {
  const source = replaceDirectivesForHtml(chapter.content)
  const parsed = await Promise.resolve(marked.parse(source))
  const body = typeof parsed === 'string' ? parsed : String(parsed)
  return `<section class="trama-chapter" data-path="${escapeHtml(chapter.path)}">${body}</section>`
}

export async function renderChapterHtmlFragmentWithProjectRoot(
  chapter: BookExportChapter,
  projectRoot: string,
): Promise<string> {
  let content = chapter.content
  const chapterDir = path.dirname(chapter.path)
  const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g

  const matches = Array.from(content.matchAll(IMAGE_PATTERN))

  for (const match of matches) {
    const altText = match[1]
    const imagePath = match[2]

    if (imagePath.startsWith('data:image/')) {
      continue
    }

    try {
      const resolvedPath = await resolveImagePath(imagePath, projectRoot, chapterDir)
      const { bytes, type } = await loadImageBytes(resolvedPath)
      if (bytes && type) {
        const dataUrl = bytesToDataUrl(bytes, type)
        if (dataUrl) {
          const escaped = match[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(escaped, 'g')
          const replacement = `![${altText}](${dataUrl})`
          content = content.replace(regex, () => replacement)
        }
      }
    } catch (err) {
      console.warn(
        `Failed to convert image to data URL: ${imagePath}`,
        err instanceof Error ? err.message : String(err),
      )
    }
  }

  const source = replaceDirectivesForHtml(content)
  const parsed = await Promise.resolve(marked.parse(source))
  const body = typeof parsed === 'string' ? parsed : String(parsed)
  return `<section class="trama-chapter" data-path="${escapeHtml(chapter.path)}">${body}</section>`
}

function renderHtmlTemplate(chapterSections: string[], metadata: BookExportMetadata): string {
  const title = metadata.title?.trim() || 'Trama Book Export'
  const author = metadata.author?.trim() || ''
  const authorMeta = author ? `<meta name="author" content="${escapeHtml(author)}" />` : ''
  const authorByline = author ? `<p class="trama-byline">${escapeHtml(author)}</p>` : ''

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${escapeHtml(title)}</title>`,
    `  ${authorMeta}`,
    '  <style>',
    '    body { font-family: Georgia, "Times New Roman", serif; margin: 2rem auto; max-width: 760px; line-height: 1.7; color: #1f2937; }',
    '    .trama-header { margin-bottom: 2.2rem; border-bottom: 1px solid #d1d5db; padding-bottom: 1rem; }',
    '    .trama-header h1 { margin: 0; font-size: 2rem; }',
    '    .trama-byline { margin: 0.25rem 0 0; color: #6b7280; }',
    '    .trama-chapter + .trama-chapter { margin-top: 2rem; }',
    '    .trama-pagebreak { break-after: page; page-break-after: always; height: 1px; }',
    '    .trama-center { text-align: center; }',
    '    .trama-spacer { display: block; }',
    '    @media print { body { margin: 0; max-width: none; } }',
    '  </style>',
    '</head>',
    '<body>',
    '  <header class="trama-header">',
    `    <h1>${escapeHtml(title)}</h1>`,
    `    ${authorByline}`,
    '  </header>',
    ...chapterSections,
    '</body>',
    '</html>',
  ].join('\n')
}

export async function renderHtmlBook(
  chapters: BookExportChapter[],
  metadata: BookExportMetadata,
  projectRoot = '',
): Promise<string> {
  const sections = await Promise.all(
    chapters.map((chapter) => renderChapterHtmlFragmentWithProjectRoot(chapter, projectRoot)),
  )
  return renderHtmlTemplate(sections, metadata)
}
