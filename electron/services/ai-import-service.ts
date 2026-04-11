import path from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { writeFile, mkdir } from 'node:fs/promises'
import { parseMarkdownWithFrontmatter } from './frontmatter.js'
import { parseClipboardContent as parseClipboardContentCore } from '../../src/shared/ai-import-parser.js'
import type { AiImportFile, AiImportPreview, AiImportResponse } from '../../src/shared/ipc.js'

export interface ParsedFile {
  path: string
  content: string
}

export function parseClipboardContent(clipboardContent: string): ParsedFile[] {
  return parseClipboardContentCore(clipboardContent) as ParsedFile[]
}

export async function previewImport(
  parsedFiles: ParsedFile[],
  projectRoot: string,
): Promise<AiImportPreview> {
  const files: AiImportFile[] = []

  for (const file of parsedFiles) {
    const fullPath = path.resolve(projectRoot, file.path)
    const exists = existsSync(fullPath)

    let frontmatter: Record<string, unknown> | undefined
    if (exists) {
      try {
        const existingContent = readFileSync(fullPath, 'utf-8')
        const parsed = parseMarkdownWithFrontmatter(existingContent)
        frontmatter = parsed.meta
      } catch {
        // Ignore parse errors for existing files
      }
    }

    files.push({
      path: file.path,
      content: file.content,
      frontmatter,
      exists,
    })
  }

  const totalFiles = files.length
  const newFiles = files.filter(f => !f.exists).length
  const existingFiles = files.filter(f => f.exists).length

  return { files, totalFiles, newFiles, existingFiles }
}

export async function executeImport(
  parsedFiles: ParsedFile[],
  projectRoot: string,
): Promise<AiImportResponse> {
  const created: string[] = []
  const skipped: string[] = []
  const errors: Array<{ path: string; error: string }> = []

  for (const file of parsedFiles) {
    try {
      const fullPath = path.resolve(projectRoot, file.path)

      if (existsSync(fullPath)) {
        skipped.push(file.path)
        continue
      }

      const dir = path.dirname(fullPath)
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true })
      }

      await writeFile(fullPath, file.content, 'utf-8')
      created.push(file.path)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push({ path: file.path, error: message })
    }
  }

  return {
    success: errors.length === 0,
    created,
    skipped,
    errors,
  }
}
