import path from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import type { AiExportResponse } from '../../src/shared/ipc.js'

const INVALID_NAME_CHARS = /[<>:"|?*\x00-\x1F]/
const RESERVED_WINDOWS_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
])

function validateExportPath(projectRoot: string, relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, '/').trim().replace(/^\/+/, '').replace(/\/+$/, '')
  if (!normalized) return null

  const segments = normalized.split('/').filter(Boolean)
  for (const segment of segments) {
    if (segment === '.' || segment === '..') return null
    if (INVALID_NAME_CHARS.test(segment)) return null
    const baseName = segment.split('.')[0]?.toUpperCase() ?? ''
    if (RESERVED_WINDOWS_NAMES.has(baseName)) return null
  }

  const absoluteProjectRoot = path.resolve(projectRoot)
  const absoluteTarget = path.resolve(projectRoot, normalized)
  const rootWithSeparator = `${absoluteProjectRoot}${path.sep}`

  if (absoluteTarget !== absoluteProjectRoot && !absoluteTarget.startsWith(rootWithSeparator)) {
    return null
  }

  return absoluteTarget
}

export function formatExportContent(
  filePaths: string[],
  projectRoot: string,
  includeFrontmatter: boolean,
): AiExportResponse {
  const formattedParts: string[] = []
  let fileCount = 0

  for (const relativePath of filePaths) {
    const fullPath = validateExportPath(projectRoot, relativePath)

    if (fullPath === null || !existsSync(fullPath)) {
      continue
    }

    try {
      const content = readFileSync(fullPath, 'utf-8')
      const normalizedRelative = relativePath.replace(/\\/g, '/').trim().replace(/^\/+/, '')
      const header = `=== FILE: ${normalizedRelative} ===`

      if (includeFrontmatter) {
        formattedParts.push(`${header}\n${content}`)
      } else {
        const lines = content.split('\n')
        const frontmatterEndIndex = lines.indexOf('---', 1)
        if (lines[0] === '---' && frontmatterEndIndex > 0) {
          const contentWithoutFrontmatter = lines.slice(frontmatterEndIndex + 1).join('\n').trim()
          formattedParts.push(`${header}\n${contentWithoutFrontmatter}`)
        } else {
          formattedParts.push(`${header}\n${content}`)
        }
      }

      fileCount++
    } catch {
      // Skip files that can't be read
    }
  }

  return {
    success: fileCount > 0,
    formattedContent: formattedParts.join('\n\n'),
    fileCount,
  }
}
