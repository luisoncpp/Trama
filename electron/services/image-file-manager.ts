import path from 'node:path'
import { mkdir, readdir, rm, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

/**
 * Naming convention: res/{section}_{filename}_{index}.png
 * e.g. res/book_act1_chapter1_0.png
 */
function buildImageFileName(section: string, fileName: string, index: number): string {
  const safeSection = section.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
  const safeFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
  return `${safeSection}_${safeFileName}_${index}.png`
}

/**
 * Extract section from document path.
 * e.g. "book/act1/chapter1.md" -> "book"
 */
function extractSection(documentPath: string): string {
  const first = documentPath.split('/')[0]
  return first ?? 'misc'
}

/**
 * Get file name without extension from document path.
 * e.g. "book/act1/chapter1.md" -> "chapter1"
 */
function getBaseFileName(documentPath: string): string {
  const lastSlash = documentPath.lastIndexOf('/')
  const nameWithExt = lastSlash >= 0 ? documentPath.slice(lastSlash + 1) : documentPath
  const dotIndex = nameWithExt.lastIndexOf('.')
  return dotIndex > 0 ? nameWithExt.slice(0, dotIndex) : nameWithExt
}

function base64ToBuffer(base64Data: string): Buffer {
  const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
  return Buffer.from(base64, 'base64')
}

/**
 * Save a base64 image to the res/ folder and return the relative path.
 * Creates the res/ folder if it does not exist.
 */
export async function saveImageToResFolder(
  projectRoot: string,
  documentPath: string,
  _uuid: string,
  base64Data: string,
): Promise<string> {
  const resDir = path.join(projectRoot, 'res')

  if (!existsSync(resDir)) {
    await mkdir(resDir, { recursive: true })
  }

  const section = extractSection(documentPath)
  const baseName = getBaseFileName(documentPath)

  // Find the next available index for this section+filename
  let index = 0
  let fileName = buildImageFileName(section, baseName, index)
  let fullPath = path.join(resDir, fileName)

  while (existsSync(fullPath)) {
    index++
    fileName = buildImageFileName(section, baseName, index)
    fullPath = path.join(resDir, fileName)
  }

  const buffer = base64ToBuffer(base64Data)
  await writeFile(fullPath, buffer)

  return `res/${fileName}`
}

/**
 * Delete image files by absolute paths.
 */
export async function deleteImageFiles(absolutePaths: string[]): Promise<void> {
  for (const absPath of absolutePaths) {
    try {
      await rm(absPath, { force: true })
    } catch {
      // Ignore errors for individual deletions
    }
  }
}

/**
 * Recursively get all markdown files in a directory.
 */
async function getAllMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = []

  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const subResults = await getAllMarkdownFiles(fullPath)
      results.push(...subResults)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath)
    }
  }

  return results
}

/**
 * Extract all image references (res/...) from markdown content.
 * Matches both ![uuid](res/...) and ![alt](res/...) patterns.
 */
export function extractImageRefsFromMarkdown(markdown: string): string[] {
  const results: string[] = []
  const regex = /!\[([^\]]*)\]\((res\/[^)\s]+)\)/gi
  let match
  while ((match = regex.exec(markdown)) !== null) {
    results.push(match[2])
  }
  return results
}

/**
 * Scan all .md files in the project and return image paths in res/
 * that are not referenced by any markdown file.
 */
export async function findOrphanedImages(projectRoot: string): Promise<string[]> {
  const resDir = path.join(projectRoot, 'res')

  if (!existsSync(resDir)) {
    return []
  }

  // Get all image files in res/
  let imageFiles: string[] = []
  try {
    const entries = await readdir(resDir, { withFileTypes: true })
    imageFiles = entries
      .filter((e) => e.isFile() && e.name.endsWith('.png'))
      .map((e) => `res/${e.name}`)
  } catch {
    return []
  }

  if (imageFiles.length === 0) return []

  // Get all markdown files
  const mdFiles = await getAllMarkdownFiles(projectRoot)

  // Collect all referenced image paths
  const referencedPaths = new Set<string>()
  for (const mdFile of mdFiles) {
    try {
      const content = await readFile(mdFile, 'utf8')
      const refs = extractImageRefsFromMarkdown(content)
      for (const ref of refs) {
        referencedPaths.add(ref)
      }
    } catch {
      // Skip files we can't read
    }
  }

  // Return orphaned images (in res/ that are not referenced)
  return imageFiles.filter((p) => !referencedPaths.has(p))
}

/**
 * Delete orphaned image files.
 */
export async function deleteOrphanedImages(imagePaths: string[], projectRoot: string): Promise<void> {
  const absPaths = imagePaths.map((p) => path.join(projectRoot, p))
  await deleteImageFiles(absPaths)
}