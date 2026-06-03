/** @vitest-environment node */

import { describe, expect, it } from 'vitest'
import { handleAiExportPickStaging } from '../electron/ipc/handlers/ai-handlers'

describe('ai export pick staging ipc handler', () => {
  it('returns VALIDATION_ERROR envelope for invalid payload', async () => {
    const response = await handleAiExportPickStaging(
      {} as never,
      {
        projectRoot: '',
        mode: 'files',
      },
    )

    expect(response.ok).toBe(false)
    if (response.ok) {
      return
    }

    expect(response.error.code).toBe('VALIDATION_ERROR')
  })
})
