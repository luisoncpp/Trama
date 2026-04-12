/** @vitest-environment node */

import { describe, expect, it } from 'vitest'
import { handleAiExport } from '../electron/ipc/handlers/ai-handlers'

describe('ai export ipc handler', () => {
  it('returns VALIDATION_ERROR envelope for invalid payload', async () => {
    const response = await handleAiExport(
      {} as never,
      {
        filePaths: ['book/chapter.md'],
        projectRoot: '',
        includeFrontmatter: true,
      },
    )

    expect(response.ok).toBe(false)
    if (response.ok) {
      return
    }

    expect(response.error.code).toBe('VALIDATION_ERROR')
    expect(response.error.message).toContain('Invalid payload for AI export')
  })

  it('returns success envelope for valid payload', async () => {
    const response = await handleAiExport(
      {} as never,
      {
        filePaths: ['missing.md'],
        projectRoot: 'C:/project',
        includeFrontmatter: true,
      },
    )

    expect(response.ok).toBe(true)
    if (!response.ok) {
      return
    }

    expect(response.data).toHaveProperty('success')
    expect(response.data).toHaveProperty('formattedContent')
    expect(response.data).toHaveProperty('fileCount')
  })
})
