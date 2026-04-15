/** @vitest-environment node */

import { describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { handleBookExport } from '../electron/ipc/handlers/book-export-handler'

describe('book export ipc handler', () => {
  it('returns VALIDATION_ERROR for invalid payload', async () => {
    const response = await handleBookExport(
      {} as never,
      {
        projectRoot: '',
        format: 'markdown',
        outputPath: '',
      },
    )

    expect(response.ok).toBe(false)
    if (response.ok) {
      return
    }

    expect(response.error.code).toBe('VALIDATION_ERROR')
  })

  it('exports markdown from book folder to outputPath', async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-book-export-'))
    const bookDir = path.join(projectRoot, 'book')
    const chapterPath = path.join(bookDir, 'chapter-01.md')
    const outputPath = path.join(projectRoot, 'exports', 'book.md')

    await mkdir(bookDir, { recursive: true })
    await writeFile(
      chapterPath,
      [
        '---',
        'tags: [draft]',
        '---',
        '',
        '# Chapter 1',
        '',
        '<!-- trama:pagebreak -->',
        'Text',
      ].join('\n'),
      'utf8',
    )

    const response = await handleBookExport(
      {} as never,
      {
        projectRoot,
        format: 'markdown',
        outputPath,
      },
    )

    expect(response.ok).toBe(true)
    if (!response.ok) {
      return
    }

    expect(response.data.success).toBe(true)
    expect(response.data.exportedFiles).toBe(1)
    expect(response.data.outputPath).toBe(outputPath)

    const saved = await readFile(outputPath, 'utf8')
    expect(saved).toContain('# Chapter 1')
    expect(saved).not.toContain('tags: [draft]')
    expect(saved).not.toContain('<!-- trama:pagebreak -->')
  })

  it('exports all phase C formats to disk', async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'trama-book-export-'))
    const bookDir = path.join(projectRoot, 'book')
    await mkdir(bookDir, { recursive: true })
    await writeFile(path.join(bookDir, 'chapter-01.md'), '# Chapter 1\n\nBody line', 'utf8')

    const cases: Array<{ format: 'html' | 'docx' | 'epub' | 'pdf'; extension: string }> = [
      { format: 'html', extension: 'html' },
      { format: 'docx', extension: 'docx' },
      { format: 'epub', extension: 'epub' },
      { format: 'pdf', extension: 'pdf' },
    ]

    for (const testCase of cases) {
      const outputPath = path.join(projectRoot, 'exports', `book.${testCase.extension}`)
      const response = await handleBookExport(
        {} as never,
        {
          projectRoot,
          format: testCase.format,
          outputPath,
          title: 'Test Export',
          author: 'QA',
        },
      )

      expect(response.ok).toBe(true)
      if (!response.ok) {
        continue
      }

      expect(response.data.outputPath).toBe(outputPath)
      expect(response.data.format).toBe(testCase.format)

      const fileStats = await stat(outputPath)
      expect(fileStats.size).toBeGreaterThan(0)
    }
  })

  it('returns BOOK_EXPORT_FAILED when output path is invalid', async () => {
    const response = await handleBookExport(
      {} as never,
      {
        projectRoot: 'Z:/path/that/does/not/exist',
        format: 'markdown',
        outputPath: 'Z:/path/that/does/not/exist/out/book.md',
      },
    )

    expect(response.ok).toBe(false)
    if (!response.ok) {
      expect(response.error.code).toBe('BOOK_EXPORT_FAILED')
    }
  })
})
