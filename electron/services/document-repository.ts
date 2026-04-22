import path from 'node:path'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
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
const RESERVED_WINDOWS_NAMES = new Set(['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'])

function validateRelativePath(relativePath: string): string {
  const normalized = normalizeRelative(relativePath).trim().replace(/^\/+/, '').replace(/\/+$/, '')
  if (!normalized) throw new Error('Path cannot be empty')

  for (const segment of normalized.split('/').filter(Boolean)) {
    if (segment === '.' || segment === '..') throw new Error('Path traversal is not allowed')
    if (INVALID_NAME_CHARS.test(segment)) throw new Error(`Invalid characters in path segment: ${segment}`)
    const baseName = segment.split('.')[0]?.toUpperCase() ?? ''
    if (RESERVED_WINDOWS_NAMES.has(baseName)) throw new Error(`Reserved name is not allowed: ${segment}`)
  }

  return normalized
}

async function ensurePathDoesNotExist(fullPath: string): Promise<void> {
  try {
    await stat(fullPath)
    throw new Error('Path already exists')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}

function validateNameSegment(name: string): string {
  const normalized = name.trim()
  if (!normalized) throw new Error('Name cannot be empty')
  if (normalized.includes('/') || normalized.includes('\\')) throw new Error('Name cannot contain path separators')
  if (normalized === '.' || normalized === '..') throw new Error('Invalid name segment')
  if (INVALID_NAME_CHARS.test(normalized)) throw new Error(`Invalid characters in name: ${normalized}`)
  const baseName = normalized.split('.')[0]?.toUpperCase() ?? ''
  if (RESERVED_WINDOWS_NAMES.has(baseName)) throw new Error(`Reserved name is not allowed: ${normalized}`)
  return normalized
}

function extractNextRelativePath(relativePath: string, newName: string, isDocument = false): string {
  const normalizedPath = normalizeRelative(relativePath)
  const normalizedName = validateNameSegment(newName)
  const directory = path.posix.dirname(normalizedPath)
  const targetName = isDocument
    ? (normalizedName.toLowerCase().endsWith('.md') ? normalizedName : `${normalizedName}.md`)
    : normalizedName
  return directory === '.' ? targetName : `${directory}/${targetName}`
}

async function renamePath(projectRoot: string, sourceRelativePath: string, targetRelativePath: string): Promise<void> {
  const sourceFullPath = resolveProjectPath(projectRoot, sourceRelativePath)
  const targetFullPath = resolveProjectPath(projectRoot, targetRelativePath)
  await ensurePathDoesNotExist(targetFullPath)
  await rename(sourceFullPath, targetFullPath)
}

function buildRenameResult(originalPath: string, newPath: string) {
  return { path: normalizeRelative(originalPath), renamedTo: normalizeRelative(newPath), updatedAt: new Date().toISOString() }
}

export class DocumentRepository {
  async readDocument(projectRoot: string, relativePath: string): Promise<DocumentRecord> {
    if (!relativePath.endsWith('.md')) throw new Error('Only markdown files are supported')
    const fullPath = resolveProjectPath(projectRoot, relativePath)
    const markdown = await readFile(fullPath, 'utf8')
    const parsed = parseMarkdownWithFrontmatter(markdown)
    return { path: normalizeRelative(relativePath), content: parsed.content, meta: parsed.meta }
  }

  async saveDocument(projectRoot: string, relativePath: string, content: string, meta: Record<string, unknown>): Promise<{ path: string; version: string }> {
    if (!relativePath.endsWith('.md')) throw new Error('Only markdown files are supported')
    const fullPath = resolveProjectPath(projectRoot, relativePath)
    await writeFile(fullPath, serializeMarkdownWithFrontmatter(meta, content), 'utf8')
    return { path: normalizeRelative(relativePath), version: new Date().toISOString() }
  }

  async createDocument(projectRoot: string, relativePath: string, initialContent = ''): Promise<{ path: string; createdAt: string }> {
    const normalizedPath = validateRelativePath(relativePath)
    if (!normalizedPath.endsWith('.md')) throw new Error('Only markdown files are supported')
    const fullPath = resolveProjectPath(projectRoot, normalizedPath)
    await ensurePathDoesNotExist(fullPath)
    await mkdir(path.dirname(fullPath), { recursive: true })
    await writeFile(fullPath, serializeMarkdownWithFrontmatter({}, initialContent), { encoding: 'utf8', flag: 'wx' })
    return { path: normalizeRelative(normalizedPath), createdAt: new Date().toISOString() }
  }

  async createFolder(projectRoot: string, relativePath: string): Promise<{ path: string; createdAt: string }> {
    const normalizedPath = validateRelativePath(relativePath)
    const fullPath = resolveProjectPath(projectRoot, normalizedPath)
    await ensurePathDoesNotExist(fullPath)
    await mkdir(fullPath, { recursive: true })
    return { path: normalizeRelative(normalizedPath), createdAt: new Date().toISOString() }
  }

  async renameFolder(projectRoot: string, relativePath: string, newName: string): Promise<{ path: string; renamedTo: string; updatedAt: string }> {
    const normalizedPath = validateRelativePath(relativePath)
    const nextRelativePath = extractNextRelativePath(normalizedPath, newName)
    if (normalizeRelative(nextRelativePath) === normalizeRelative(normalizedPath)) throw new Error('New name must be different from current name')
    const sourceFullPath = resolveProjectPath(projectRoot, normalizedPath)
    const sourceInfo = await stat(sourceFullPath)
    if (!sourceInfo.isDirectory()) throw new Error('Only folders can be renamed')
    await renamePath(projectRoot, normalizedPath, nextRelativePath)
    return buildRenameResult(normalizedPath, nextRelativePath)
  }

  async deleteFolder(projectRoot: string, relativePath: string): Promise<{ path: string; deletedAt: string }> {
    const normalizedPath = validateRelativePath(relativePath)
    const fullPath = resolveProjectPath(projectRoot, normalizedPath)
    const sourceInfo = await stat(fullPath)
    if (!sourceInfo.isDirectory()) throw new Error('Only folders can be deleted')
    await rm(fullPath, { recursive: true })
    return { path: normalizeRelative(normalizedPath), deletedAt: new Date().toISOString() }
  }

  async renameDocument(projectRoot: string, relativePath: string, newName: string): Promise<{ path: string; renamedTo: string; updatedAt: string }> {
    const normalizedPath = validateRelativePath(relativePath)
    if (!normalizedPath.endsWith('.md')) throw new Error('Only markdown files are supported')
    const nextRelativePath = extractNextRelativePath(normalizedPath, newName, true)
    if (normalizeRelative(nextRelativePath) === normalizeRelative(normalizedPath)) throw new Error('New name must be different from current name')
    await renamePath(projectRoot, normalizedPath, nextRelativePath)
    return buildRenameResult(normalizedPath, nextRelativePath)
  }

async deleteDocument(projectRoot: string, relativePath: string): Promise<{ path: string; deletedAt: string }> {
    const normalizedPath = validateRelativePath(relativePath)
    if (!normalizedPath.endsWith('.md')) throw new Error('Only markdown files are supported')
    const fullPath = resolveProjectPath(projectRoot, relativePath)
    await rm(fullPath)
    return { path: normalizeRelative(normalizedPath), deletedAt: new Date().toISOString() }
  }

  async moveDocument(projectRoot: string, sourceRelativePath: string, targetFolder: string): Promise<{ path: string; renamedTo: string; updatedAt: string }> {
    const normalizedSource = validateRelativePath(sourceRelativePath)
    if (!normalizedSource.endsWith('.md')) throw new Error('Only markdown files are supported')

    const sourceFullPath = resolveProjectPath(projectRoot, normalizedSource)
    const sourceInfo = await stat(sourceFullPath)
    if (!sourceInfo.isFile()) throw new Error('Source is not a file')

    const fileName = path.posix.basename(normalizedSource)
    const normalizedTargetFolder = targetFolder ? validateRelativePath(targetFolder) : ''
    const targetRelativePath = normalizedTargetFolder ? `${normalizedTargetFolder}/${fileName}` : fileName

    if (normalizeRelative(targetRelativePath) === normalizeRelative(normalizedSource)) {
      throw new Error('Source and target paths are the same')
    }

    await renamePath(projectRoot, normalizedSource, targetRelativePath)

    return buildRenameResult(normalizedSource, targetRelativePath)
  }

  async moveFolder(projectRoot: string, sourceFolder: string, targetParent: string): Promise<{ sourcePath: string; renamedTo: string; updatedAt: string }> {
    const normalizedSource = validateRelativePath(sourceFolder)
    const sourceFullPath = resolveProjectPath(projectRoot, normalizedSource)
    const sourceInfo = await stat(sourceFullPath)
    if (!sourceInfo.isDirectory()) throw new Error('Source is not a folder')

    const folderName = path.posix.basename(normalizedSource)
    const normalizedTargetParent = targetParent ? validateRelativePath(targetParent) : ''
    const targetRelativePath = normalizedTargetParent ? `${normalizedTargetParent}/${folderName}` : folderName

    if (normalizeRelative(targetRelativePath) === normalizeRelative(normalizedSource)) {
      throw new Error('Source and target paths are the same')
    }

    await renamePath(projectRoot, normalizedSource, targetRelativePath)

    return { sourcePath: normalizeRelative(normalizedSource), renamedTo: normalizeRelative(targetRelativePath), updatedAt: new Date().toISOString() }
  }
}