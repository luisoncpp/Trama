import { describe, expect, it } from 'vitest'
import { buildPingResponse } from '../electron/ipc'

describe('IPC contract validation', () => {
  it('accepts a valid payload', () => {
    const response = buildPingResponse({ message: 'hello' })

    expect(response.ok).toBe(true)
    if (!response.ok) {
      return
    }

    expect(response.data.echo).toBe('hello')
    expect(response.data.timestamp).toBeTypeOf('string')
  })

  it('rejects an invalid payload', () => {
    const response = buildPingResponse({ message: '' })

    expect(response.ok).toBe(false)
    if (response.ok) {
      return
    }

    expect(response.error.code).toBe('VALIDATION_ERROR')
  })
})
