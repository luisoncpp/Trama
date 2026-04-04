import path from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { parseMarkdownWithFrontmatter, serializeMarkdownWithFrontmatter } from './frontmatter.js'

export interface DocumentRecord {
  path: string
  content: string
  meta: Record<string, unknown>
}

function normalizeRelative(relativePath: string): string {
  return relativePath.replace(/\\/g, '/')
}

function resolveProjectPath(projectRoot: string, relativePath: string): string {
  const absoluteProjectRoot = path.resolve(projectRoot)
  const absoluteTarget = path.resolve(projectRoot, relativePath)
  const rootWithSeparator = `${absoluteProjectRoot}${path.sep}`

  if (absoluteTarget !== absoluteProjectRoot && !absoluteTarget.startsWith(rootWithSeparator)) {
    throw new Error('Path escapes project root')
  }

  return absoluteTarget
}

export class DocumentRepository {
  async readDocument(projectRoot: string, relativePath: string): Promise<DocumentRecord> {
    if (!relativePath.endsWith('.md')) {
      throw new Error('Only markdown files are supported')
    }

    const fullPath = resolveProjectPath(projectRoot, relativePath)
    const markdown = await readFile(fullPath, 'utf8')
    const parsed = parseMarkdownWithFrontmatter(markdown)

    return {
      path: normalizeRelative(relativePath),
      content: parsed.content,
      meta: parsed.meta,
    }
  }

  async saveDocument(
    projectRoot: string,
    relativePath: string,
    content: string,
    meta: Record<string, unknown>,
  ): Promise<{ path: string; version: string }> {
    if (!relativePath.endsWith('.md')) {
      throw new Error('Only markdown files are supported')
    }

    const fullPath = resolveProjectPath(projectRoot, relativePath)
    const serialized = serializeMarkdownWithFrontmatter(meta, content)
    await writeFile(fullPath, serialized, 'utf8')

    return {
      path: normalizeRelative(relativePath),
      version: new Date().toISOString(),
    }
  }
}
