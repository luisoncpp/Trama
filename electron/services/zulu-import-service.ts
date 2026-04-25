import path from 'node:path'
import { existsSync } from 'node:fs'
import { writeFile, mkdir } from 'node:fs/promises'
import { parseZuluContent } from '../../src/shared/zulu-parser.js'
import { serializeMarkdownWithFrontmatter } from './frontmatter.js'
import type { ZuluPage } from '../../src/shared/zulu-parser.js'
import type { ZuluImportPreviewResponse, ZuluImportResponse, ZuluTagMode } from '../../src/shared/ipc.js'

function sanitizeFileName(title: string): string {
  return title
    .toLowerCase()
    .replace(/[<>:"|?*/\\]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim() || 'untitled'
}

function generateTags(title: string, tagMode: ZuluTagMode): string[] {
  if (tagMode === 'none') return []

  const words = title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.replace(/^[^a-z0-9áéíóúüñ]+|[^a-z0-9áéíóúüñ]+$/g, '').length > 0)

  if (tagMode === 'single' && words.length > 1) return []

  return [title.toLowerCase().trim()]
}

function buildUniquePath(targetFolder: string, fileName: string, existingPaths: Set<string>): string {
  const normalizedFolder = targetFolder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+$/, '')
  let candidatePath = `${normalizedFolder}/${fileName}.md`
  if (!existingPaths.has(candidatePath)) return candidatePath

  let counter = 2
  while (existingPaths.has(`${normalizedFolder}/${fileName}-${counter}.md`)) {
    counter++
  }
  return `${normalizedFolder}/${fileName}-${counter}.md`
}

function normalizeContentForMarkdown(content: string): string {
  const lines = content.split(/\r?\n/)
  return lines.map((line) => (line.length > 0 ? `${line}  ` : line)).join('\n')
}

function buildPageContent(page: ZuluPage, tagMode: ZuluTagMode): string {
  const tags = generateTags(page.title, tagMode)
  const frontmatter: Record<string, unknown> = { title: page.title }
  if (tags.length > 0) {
    frontmatter.tags = tags
  }
  const normalized = normalizeContentForMarkdown(page.content.trim())
  return serializeMarkdownWithFrontmatter(frontmatter, normalized)
}

export function previewZuluImport(content: string, targetFolder: string): ZuluImportPreviewResponse {
  const pages = parseZuluContent(content)
  const existingPaths = new Set<string>()
  const files = pages.map((page) => {
    const tags = generateTags(page.title, 'all')
    const fileName = sanitizeFileName(page.title)
    const relPath = buildUniquePath(targetFolder, fileName, existingPaths)
    existingPaths.add(relPath)
    return {
      title: page.title,
      path: relPath,
      tagCount: tags.length,
      exists: false,
    }
  })

  return { files, totalFiles: files.length }
}

export async function executeZuluImport(
  content: string,
  targetFolder: string,
  projectRoot: string,
  tagMode: ZuluTagMode,
): Promise<ZuluImportResponse> {
  const pages = parseZuluContent(content)
  const created: string[] = []
  const errors: Array<{ path: string; error: string }> = []
  const existingPaths = new Set<string>()

  for (const page of pages) {
    try {
      const fileName = sanitizeFileName(page.title)
      const relPath = buildUniquePath(targetFolder, fileName, existingPaths)
      existingPaths.add(relPath)

      const fullPath = path.resolve(projectRoot, relPath)
      const dir = path.dirname(fullPath)
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true })
      }

      const fileContent = buildPageContent(page, tagMode)
      await writeFile(fullPath, fileContent, 'utf-8')
      created.push(relPath)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push({ path: page.title, error: message })
    }
  }

  return {
    success: errors.length === 0,
    created,
    errors,
  }
}
