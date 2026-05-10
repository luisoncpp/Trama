import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import type { BookExportChapter, BookExportMetadata } from './book-export-renderers.js'
import { renderChapterHtmlFragment } from './book-export-renderers.js'
import { convertMarkdownImageSourcesToEpubUrls } from './book-export-image-source-transform.js'

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
  return convertMarkdownImageSourcesToEpubUrls(
    chapter.content,
    projectRoot,
    chapter.path,
    tempImageDir,
    toEpubFileUrl,
  )
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
