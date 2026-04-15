import path from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type { BookExportRequest, BookExportResponse, ProjectIndex } from '../../src/shared/ipc.js'
import { scanProject } from './project-scanner.js'
import { IndexService } from './index-service.js'
import { orderBookFilesByIndex } from './book-export-order.js'
import { sanitizeForBookExport } from './book-export-sanitize.js'
import {
  renderHtmlBook,
  renderMarkdownBook,
  type BookExportChapter,
  type BookExportMetadata,
} from './book-export-renderers.js'
import { renderDocxBook } from './book-export-docx-renderer.js'
import { renderEpubBook } from './book-export-epub-renderer.js'
import { renderPdfBook } from './book-export-pdf-renderer.js'

interface ExportContext {
  projectRoot: string
  outputPath: string
}

interface RenderedContent {
  type: 'text' | 'binary' | 'none'
  value?: string | Uint8Array
}

async function loadProjectIndex(projectRoot: string): Promise<ProjectIndex> {
  const indexService = new IndexService(projectRoot)
  return indexService.loadIndex()
}

function chapterTitleFromPath(relativePath: string): string {
  const parsed = path.posix.parse(relativePath)
  return parsed.name
    .replaceAll('-', ' ')
    .replaceAll('_', ' ')
    .trim() || parsed.base
}

async function buildBookChapters(
  projectRoot: string,
  bookPaths: string[],
  format: BookExportRequest['format'],
): Promise<BookExportChapter[]> {
  const chapters: BookExportChapter[] = []

  for (const relativePath of bookPaths) {
    const absolutePath = path.resolve(projectRoot, relativePath)
    const content = await readFile(absolutePath, 'utf8')
    chapters.push({
      path: relativePath,
      title: chapterTitleFromPath(relativePath),
      content: sanitizeForBookExport(content, format),
    })
  }

  return chapters
}

async function writeTextOutputFile(outputPath: string, content: string): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, content, 'utf8')
}

async function writeBinaryOutputFile(outputPath: string, content: Uint8Array): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, content)
}

async function renderBookArtifact(
  request: BookExportRequest,
  chapters: BookExportChapter[],
  metadata: BookExportMetadata,
): Promise<RenderedContent> {
  switch (request.format) {
    case 'markdown':
      return {
        type: 'text',
        value: renderMarkdownBook(chapters),
      }
    case 'html':
      return {
        type: 'text',
        value: await renderHtmlBook(chapters, metadata, request.projectRoot),
      }
    case 'docx':
      return {
        type: 'binary',
        value: await renderDocxBook(chapters, metadata, request.projectRoot),
      }
    case 'epub':
      await renderEpubBook(chapters, metadata, request.outputPath, request.projectRoot)
      return { type: 'none' }
    case 'pdf':
      return {
        type: 'binary',
        value: await renderPdfBook(chapters, request.projectRoot),
      }
  }
}

export async function exportBookPhaseA(request: BookExportRequest): Promise<BookExportResponse> {
  const context: ExportContext = {
    projectRoot: request.projectRoot,
    outputPath: request.outputPath,
  }

  const { tree } = await scanProject(context.projectRoot)
  const index = await loadProjectIndex(context.projectRoot)
  const orderedBookPaths = orderBookFilesByIndex(tree, index)
  const chapters = await buildBookChapters(context.projectRoot, orderedBookPaths, request.format)
  const artifact = await renderBookArtifact(request, chapters, {
    title: request.title,
    author: request.author,
  })

  if (artifact.type === 'text') {
    await writeTextOutputFile(context.outputPath, artifact.value as string)
  } else if (artifact.type === 'binary') {
    await writeBinaryOutputFile(context.outputPath, artifact.value as Uint8Array)
  }

  return {
    success: true,
    outputPath: context.outputPath,
    format: request.format,
    exportedFiles: orderedBookPaths.length,
  }
}
