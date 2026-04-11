import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockExistsSync, mockReadFileSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn() as ReturnType<typeof vi.fn>,
}))

vi.mock('node:fs', () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
  },
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
}))

import { formatExportContent } from '../electron/services/ai-export-service'

const ROOT = '/project'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ai-export-service', () => {
  describe('formatExportContent', () => {
    it('exports a single file without frontmatter when includeFrontmatter is false', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(
        '---\ntitle: Test\n---\n\n# Heading\n\nContent here.',
      )

      const result = formatExportContent(['book/chapter.md'], ROOT, false)

      expect(result.success).toBe(true)
      expect(result.fileCount).toBe(1)
      expect(result.formattedContent).toContain('=== FILE: book/chapter.md ===')
      expect(result.formattedContent).toContain('# Heading')
      expect(result.formattedContent).not.toContain('title: Test')
    })

    it('includes frontmatter when includeFrontmatter is true', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('---\ntitle: Test\n---\n\n# Heading')

      const result = formatExportContent(['lore/place.md'], ROOT, true)

      expect(result.success).toBe(true)
      expect(result.formattedContent).toContain('title: Test')
      expect(result.formattedContent).toContain('# Heading')
    })

    it('exports multiple files with sequential headers', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync
        .mockReturnValueOnce('# File One')
        .mockReturnValueOnce('# File Two')

      const result = formatExportContent(
        ['book/one.md', 'book/two.md'],
        ROOT,
        false,
      )

      expect(result.fileCount).toBe(2)
      expect(result.formattedContent).toContain('=== FILE: book/one.md ===')
      expect(result.formattedContent).toContain('=== FILE: book/two.md ===')
    })

    it('skips missing files and still returns success for existing ones', () => {
      mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(true)
      mockReadFileSync.mockReturnValue('# Present')

      const result = formatExportContent(
        ['missing/file.md', 'book/present.md'],
        ROOT,
        false,
      )

      expect(result.success).toBe(true)
      expect(result.fileCount).toBe(1)
      expect(result.formattedContent).toContain('book/present.md')
      expect(result.formattedContent).not.toContain('missing/file.md')
    })

    it('returns success false when all files are missing', () => {
      mockExistsSync.mockReturnValue(false)

      const result = formatExportContent(['missing.md'], ROOT, false)

      expect(result.success).toBe(false)
      expect(result.fileCount).toBe(0)
      expect(result.formattedContent).toBe('')
    })

    it('returns success false for empty filePaths', () => {
      const result = formatExportContent([], ROOT, false)

      expect(result.success).toBe(false)
      expect(result.fileCount).toBe(0)
    })

    it('rejects path traversal (../) silently', () => {
      const result = formatExportContent(['../outside/secret.md'], ROOT, false)

      expect(mockExistsSync).not.toHaveBeenCalled()
      expect(result.success).toBe(false)
      expect(result.fileCount).toBe(0)
    })

    it('rejects path that escapes project root after resolve', () => {
      // A path that resolves outside ROOT even without explicit ..
      const result = formatExportContent(['../../etc/passwd'], ROOT, false)

      expect(mockExistsSync).not.toHaveBeenCalled()
      expect(result.success).toBe(false)
    })

    it('rejects paths with invalid characters', () => {
      const result = formatExportContent(['book/<bad|name>.md'], ROOT, false)

      expect(mockExistsSync).not.toHaveBeenCalled()
      expect(result.success).toBe(false)
    })

    it('normalizes backslashes in path header', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('# Content')

      // Windows-style path passed in
      const result = formatExportContent(['book\\chapter.md'], ROOT, false)

      // Header should use forward slashes
      expect(result.formattedContent).toContain('=== FILE: book/chapter.md ===')
    })

    it('handles file with no frontmatter gracefully when includeFrontmatter is false', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('# Just Content\n\nNo frontmatter here.')

      const result = formatExportContent(['outline/arc.md'], ROOT, false)

      expect(result.success).toBe(true)
      expect(result.formattedContent).toContain('# Just Content')
    })
  })
})
