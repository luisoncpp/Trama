import path from 'node:path'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
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

const INVALID_NAME_CHARS = /[<>:"|?*\x00-\x1F]/
const RESERVED_WINDOWS_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
])

function validateRelativePath(relativePath: string): string {
  const normalized = normalizeRelative(relativePath).trim().replace(/^\/+/, '').replace(/\/+$/, '')
  if (!normalized) {
    throw new Error('Path cannot be empty')
  }

  const segments = normalized.split('/').filter(Boolean)
  for (const segment of segments) {
    if (segment === '.' || segment === '..') {
      throw new Error('Path traversal is not allowed')
    }

    if (INVALID_NAME_CHARS.test(segment)) {
      throw new Error(`Invalid characters in path segment: ${segment}`)
    }

    const baseName = segment.split('.')[0]?.toUpperCase() ?? ''
    if (RESERVED_WINDOWS_NAMES.has(baseName)) {
      throw new Error(`Reserved name is not allowed: ${segment}`)
    }
  }

  return normalized
}

async function ensurePathDoesNotExist(fullPath: string): Promise<void> {
  try {
    await stat(fullPath)
    throw new Error('Path already exists')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }
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

  async createDocument(
    projectRoot: string,
    relativePath: string,
    initialContent = '',
  ): Promise<{ path: string; createdAt: string }> {
    const normalizedPath = validateRelativePath(relativePath)
    if (!normalizedPath.endsWith('.md')) {
      throw new Error('Only markdown files are supported')
    }

    const fullPath = resolveProjectPath(projectRoot, normalizedPath)
    await ensurePathDoesNotExist(fullPath)
    await mkdir(path.dirname(fullPath), { recursive: true })

    const content = serializeMarkdownWithFrontmatter({}, initialContent)
    await writeFile(fullPath, content, { encoding: 'utf8', flag: 'wx' })

    return {
      path: normalizeRelative(normalizedPath),
      createdAt: new Date().toISOString(),
    }
  }

  async createFolder(projectRoot: string, relativePath: string): Promise<{ path: string; createdAt: string }> {
    const normalizedPath = validateRelativePath(relativePath)
    const fullPath = resolveProjectPath(projectRoot, normalizedPath)

    await ensurePathDoesNotExist(fullPath)
    await mkdir(fullPath, { recursive: true })

    return {
      path: normalizeRelative(normalizedPath),
      createdAt: new Date().toISOString(),
    }
  }
}
