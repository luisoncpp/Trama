import { randomUUID } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import type { BookExportChapter, BookExportMetadata } from './book-export-renderers.js'
import { renderChapterHtmlFragment } from './book-export-renderers.js'
import { parseDataUrl, resolveImagePath } from './book-export-image-utils.js'

const require = createRequire(import.meta.url)

type EpubChapter = {
  title: string
  data: string
}

type EpubOptions = {
  title: string
  author: string
  content: EpubChapter[]
  output: string
  appendChapterTitles: boolean
  css: string
}

type EpubInstance = {
  promise: Promise<void>
}

type EpubConstructor = new (options: EpubOptions) => EpubInstance

const IMAGE_MARKDOWN_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toEpubFileUrl(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, '/')
  if (/^[A-Za-z]:\//.test(normalized)) {
    return `file://${normalized}`
  }
  return `file://${normalized.startsWith('/') ? '' : '/'}${normalized}`
}

async function convertChapterImagesToEpubSources(
  chapter: BookExportChapter,
  projectRoot: string,
  tempImageDir: string,
): Promise<string> {
  const chapterDir = path.dirname(chapter.path)
  let content = chapter.content
  const imageMatches = Array.from(chapter.content.matchAll(IMAGE_MARKDOWN_PATTERN))

  for (const match of imageMatches) {
    const altText = match[1]
    const source = match[2]

    if (source.startsWith('http://') || source.startsWith('https://') || source.startsWith('file://')) {
      continue
    }

    try {
      let imageFilePath: string | null = null
      if (source.startsWith('data:image/')) {
        const parsed = parseDataUrl(source)
        if (!parsed.type || !parsed.bytes) {
          continue
        }
        imageFilePath = path.join(tempImageDir, `${randomUUID()}.${parsed.type === 'png' ? 'png' : 'jpg'}`)
        await writeFile(imageFilePath, parsed.bytes)
      } else {
        if (!projectRoot.trim()) {
          continue
        }
        imageFilePath = await resolveImagePath(source, projectRoot, chapterDir)
      }

      const fileUrl = toEpubFileUrl(imageFilePath)
      const replacement = `![${altText}](${fileUrl})`
      const exactPattern = new RegExp(escapeRegex(match[0]), 'g')
      content = content.replace(exactPattern, () => replacement)
    } catch (error) {
      console.warn(
        `Failed to prepare image source for EPUB: ${source}`,
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  return content
}

async function buildEpubChapters(
  chapters: BookExportChapter[],
  projectRoot: string,
  tempImageDir: string,
): Promise<EpubChapter[]> {
  const rendered = await Promise.all(chapters.map(async (chapter) => {
    const chapterWithEpubImageSources: BookExportChapter = {
      ...chapter,
      content: await convertChapterImagesToEpubSources(chapter, projectRoot, tempImageDir),
    }
    return renderChapterHtmlFragment(chapterWithEpubImageSources)
  }))
  return chapters.map((chapter, index) => ({
    title: chapter.title,
    data: rendered[index],
  }))
}

function resolveEpubConstructor(): EpubConstructor {
  const moduleValue = require('epub-gen') as EpubConstructor | { default?: EpubConstructor }

  if (typeof moduleValue === 'function') {
    return moduleValue
  }

  if (moduleValue && typeof moduleValue.default === 'function') {
    return moduleValue.default
  }

  throw new Error('Unable to initialize epub-gen renderer')
}

export async function renderEpubBook(
  chapters: BookExportChapter[],
  metadata: BookExportMetadata,
  outputPath: string,
  projectRoot = '',
): Promise<void> {
  const Epub = resolveEpubConstructor()
  const tempImageDir = await mkdtemp(path.join(os.tmpdir(), 'trama-epub-images-'))

  try {
    const content = await buildEpubChapters(chapters, projectRoot, tempImageDir)

    const generator = new Epub({
      title: metadata.title?.trim() || 'Trama Book Export',
      author: metadata.author?.trim() || 'Trama',
      content,
      output: outputPath,
      appendChapterTitles: false,
      css: '.trama-pagebreak{page-break-after:always;break-after:page}.trama-center{text-align:center}',
    })

    await generator.promise
  } finally {
    await rm(tempImageDir, { recursive: true, force: true })
  }
}
